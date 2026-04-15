#!/usr/bin/env python3
"""
JPML Monthly MDL Pipeline.

Downloads two PDFs from jpml.uscourts.gov each month:
  1. Pending MDL Dockets By Actions Pending  → mdls + mdl_stats_monthly
  2. Pending MDL Dockets By MDL Type         → jpml_snapshots + jpml_type_summaries

URL pattern:
  https://www.jpml.uscourts.gov/sites/jpml/files/Pending_MDL_Dockets_By_Actions_Pending-{Month}-1-{Year}.pdf
  https://www.jpml.uscourts.gov/sites/jpml/files/Pending_MDL_Dockets_By_MDL_Type-{Month}-1-{Year}.pdf

Schedule: Run on the 2nd business day of each month (buffer for late uploads).

Usage:
    python -m pipelines.jpml_monthly
    python -m pipelines.jpml_monthly --dry-run
    python -m pipelines.jpml_monthly --date 2026-04-01
"""
from __future__ import annotations

import argparse
import io
import logging
import os
import re
import sys
from datetime import date, datetime, timezone

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.pipeline import (  # noqa: E402
    PipelineRun,
    DRY_RUN,
    _bulk_insert,
    _get,
)

logger = logging.getLogger(__name__)

JPML_BASE = "https://www.jpml.uscourts.gov/sites/jpml/files"
JPML_PAGE = "https://www.jpml.uscourts.gov/pending-mdls-0"

MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

# ── Helpers ──────────────────────────────────────────────────────────────

def _report_date_str(d: date) -> str:
    """Format a date as the URL segment JPML uses: 'April-1-2026'."""
    return f"{MONTH_NAMES[d.month - 1]}-{d.day}-{d.year}"


def _detect_latest_report_date() -> date:
    """
    Scrape the JPML pending MDLs page to find the current report date
    from the PDF link filenames (e.g., 'Actions_Pending-April-1-2026.pdf').
    Falls back to the 1st of the current month.
    """
    try:
        resp = httpx.get(JPML_PAGE, timeout=30, follow_redirects=True)
        resp.raise_for_status()
        pattern = r"Actions_Pending-(\w+)-(\d+)-(\d{4})\.pdf"
        match = re.search(pattern, resp.text)
        if match:
            month_name, day, year = match.groups()
            month_num = MONTH_NAMES.index(month_name) + 1
            return date(int(year), month_num, int(day))
    except Exception as e:
        logger.warning("Could not detect report date from JPML page: %s", e)

    today = date.today()
    return date(today.year, today.month, 1)


def _build_pdf_url(report_type: str, report_dt: date) -> str:
    """Build a JPML PDF URL for a given report type and date."""
    date_part = _report_date_str(report_dt)
    return f"{JPML_BASE}/Pending_MDL_Dockets_By_{report_type}-{date_part}.pdf"


def _download_pdf(url: str) -> bytes:
    """Download a PDF and return raw bytes."""
    logger.info("Downloading %s", url)
    resp = httpx.get(url, timeout=60, follow_redirects=True)
    resp.raise_for_status()
    if b"%PDF" not in resp.content[:20]:
        raise ValueError(f"Response from {url} does not appear to be a PDF")
    return resp.content


# ── PDF Parsing: Actions Pending ─────────────────────────────────────────

def _parse_actions_pending_pdf(pdf_bytes: bytes) -> list[dict]:
    """
    Parse 'Pending MDL Dockets By Actions Pending' PDF.

    Returns list of dicts:
        {mdl_number, title, district, judge_name, judge_title,
         pending_actions, total_actions_historical}
    """
    import pdfplumber

    rows: list[dict] = []
    full_text = ""

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            full_text += page.extract_text(x_tolerance=2) or ""
            full_text += "\n"

    # The PDF text comes out as one big block. Each MDL entry looks like:
    # DIST Judge Name (Title) MDL -NNNN IN RE: Case Name NN,NNN NN,NNN
    # We split on the MDL pattern and parse each chunk.
    mdl_pattern = r"MDL\s*-\s*(\d+)\s+IN\s+RE:\s*"
    parts = re.split(mdl_pattern, full_text)

    # parts[0] = header text before first MDL
    # parts[1] = first MDL number, parts[2] = text after first MDL
    # parts[3] = second MDL number, parts[4] = text after second MDL, etc.

    for i in range(1, len(parts) - 1, 2):
        mdl_number = int(parts[i])
        remainder = parts[i + 1].strip()

        # The remainder contains:
        #   <case name> <pending_num> <total_num>
        #   <next entry's DIST Judge (Title)> ...
        # Case names can contain numbers (e.g. "April 20, 2010") so we
        # can't just grab the first number pair.  Instead we look for the
        # number pair that sits right before a district code (2-5 uppercase
        # letters followed by a capitalized name) — that boundary marks
        # where the current entry's stats end and the next entry's
        # district/judge text begins.  For the very last entry in the
        # document there is no trailing district, so we fall back to the
        # last number pair in the text.
        lines = remainder.split("\n")
        text_block = " ".join(line.strip() for line in lines if line.strip())

        # Primary: two numbers followed by a district code, a judge
        # name (capitalized first-name + capital letter), or "Report"
        # (end-of-document footer).  This covers entries with and
        # without a leading district abbreviation.
        num_match = re.search(
            r"([\d,]+)\s+([\d,]+)"
            r"\s+(?=[A-Z]{2,5}\s+[A-Z]|[A-Z][a-z]+\s+[A-Z]|Report\b)",
            text_block,
        )
        if not num_match:
            # Fallback: first number pair in the text.
            num_match = re.search(r"([\d,]+)\s+([\d,]+)", text_block)
        if not num_match:
            logger.warning("Could not parse numbers for MDL %d, skipping", mdl_number)
            continue

        pending_actions = int(num_match.group(1).replace(",", ""))
        total_historical = int(num_match.group(2).replace(",", ""))
        title_text = text_block[: num_match.start()].strip()

        # Extract district + judge from the text BEFORE this MDL.
        # The preceding text ends with: "DIST Judge Name (Title) "
        # or sometimes just "Judge Name (Title)" when district is on
        # a previous line.
        preceding = parts[i - 1] if i > 0 else ""
        # Take only the trailing portion after the last numbers (which
        # belong to the previous MDL entry). This isolates the current
        # entry's district/judge line.  For the very first entry the
        # preceding text is the page header; we grab only the part
        # after "(Historical)" which is the table-header line end.
        if i == 1:
            # First entry: strip everything up to and including the
            # table header so we isolate "NJ Michael A. Shipp (…)"
            header_end = re.search(
                r"\(Historical\)", preceding, re.IGNORECASE
            )
            judge_block = (
                preceding[header_end.end() :].strip()
                if header_end
                else preceding.strip()
            )
        else:
            trailing = re.split(r"[\d,]+\s+[\d,]+", preceding)
            judge_block = trailing[-1].strip() if trailing else preceding.strip()
        # Collapse to a single line
        judge_line = " ".join(judge_block.split())

        district = ""
        judge_name = ""
        judge_title = ""

        # Pattern: DIST JudgeName (Title)
        dist_match = re.match(
            r"^([A-Z]{2,5})\s+(.+?)\s*\(([^)]+)\)\s*$", judge_line
        )
        if dist_match:
            district = dist_match.group(1)
            judge_name = dist_match.group(2).strip()
            judge_title = dist_match.group(3).strip()
        else:
            # Sometimes just "JudgeName (Title)" without district
            name_match = re.match(r"^(.+?)\s*\(([^)]+)\)\s*$", judge_line)
            if name_match:
                judge_name = name_match.group(1).strip()
                judge_title = name_match.group(2).strip()
            elif judge_line:
                judge_name = judge_line

        rows.append({
            "mdl_number": mdl_number,
            "title": title_text,
            "district": district,
            "judge_name": judge_name,
            "judge_title": judge_title,
            "pending_actions": pending_actions,
            "total_actions_historical": total_historical,
        })

    logger.info("Parsed %d MDLs from Actions Pending PDF", len(rows))
    return rows


# ── PDF Parsing: By Docket Type ──────────────────────────────────────────

def _parse_docket_type_pdf(pdf_bytes: bytes) -> tuple[list[dict], dict[str, int]]:
    """
    Parse 'Pending MDL Dockets By MDL Type' PDF.

    Returns:
        snapshots: list of dicts for jpml_snapshots table
            {mdl_number, case_name, jpml_type, transferee_judge, district,
             master_docket, date_filed, date_transferred, date_closed}
        type_counts: dict mapping jpml_type -> count of MDLs
    """
    import pdfplumber

    snapshots: list[dict] = []
    type_counts: dict[str, int] = {}
    full_text = ""

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            full_text += page.extract_text(x_tolerance=2) or ""
            full_text += "\n"

    # The PDF is grouped by type. Each type header appears on its own line:
    #   "Air Disaster"
    # Followed by MDL entries, then:
    #   "Number of Air Disaster Litigations Listed: 2"
    # Then the next type header.

    current_type = None
    mdl_pattern = re.compile(
        r"(\d+)\s+IN\s+RE:\s*(.+?)(?=\s+\w+,\s+\w+|\s*$)"
    )

    # Split by type sections using the "Number of X Litigations Listed: N" markers
    type_section_pattern = re.compile(
        r"Number\s+of\s+(.+?)\s+Litigations?\s+Listed:\s*(\d+)",
        re.IGNORECASE,
    )

    # Find all type headers by looking at lines that are short, title-cased,
    # and appear before MDL entries
    lines = full_text.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Check for type section count (end of a section)
        count_match = type_section_pattern.match(line)
        if count_match:
            type_name = count_match.group(1).strip()
            count = int(count_match.group(2))
            type_counts[type_name] = count
            current_type = None
            i += 1
            continue

        # Check for type header (short line, no numbers, title case)
        if (
            line
            and not re.search(r"\d{4}", line)  # No years
            and not line.startswith("MDL")
            and not line.startswith("DOCKET")
            and not line.startswith("United States")
            and not line.startswith("Transferee")
            and not line.startswith("District")
            and not line.startswith("MASTER")
            and not line.startswith("DATE")
            and not line.startswith("Number of")
            and not line.startswith("Status:")
            and not line.startswith("Limited")
            and not line.startswith("Grouped")
            and not line.startswith("Docket Type")
            and not line.startswith("Page ")
            and len(line) < 80
            and re.match(r"^[A-Z][a-zA-Z /&\-,()]+$", line)
        ):
            candidate = line.strip()
            # Verify next few lines have MDL entries
            has_mdl = False
            for j in range(i + 1, min(i + 15, len(lines))):
                if re.search(r"\bMDL\b", lines[j]) or re.search(r"IN RE:", lines[j]):
                    has_mdl = True
                    break
                if type_section_pattern.match(lines[j].strip()):
                    has_mdl = True
                    break
            if has_mdl:
                current_type = candidate

        # Check for MDL entries within a type section
        if current_type:
            mdl_match = re.search(r"(\d{4})\s+IN\s+RE:\s*(.+)", line)
            if mdl_match:
                mdl_number = int(mdl_match.group(1))
                rest = mdl_match.group(2).strip()

                # Extract judge, district, docket from surrounding context
                # The format varies; capture what we can
                judge = ""
                district_code = ""
                master_docket = ""
                date_filed = None
                date_transferred = None
                date_closed = None

                # Look at text before MDL number on the same line for district
                pre_mdl = line[: mdl_match.start()].strip()
                dist_m = re.match(r"^([A-Z]{2,5})\s+", pre_mdl)
                if dist_m:
                    district_code = dist_m.group(1)

                # The case name is the rest after "IN RE:"
                # Strip trailing dates and docket numbers
                case_name = re.sub(
                    r"\s+\d{1,2}:\d{2}-md-\d+.*$", "", rest
                ).strip()
                case_name = re.sub(
                    r"\s+\d{2}/\d{2}/\d{4}.*$", "", case_name
                ).strip()

                # Look for docket pattern: N:NN-md-NNNN
                docket_match = re.search(r"(\d{1,2}:\d{2}-md-\d+)", line)
                if docket_match:
                    master_docket = docket_match.group(1)

                # Look for dates: MM/DD/YYYY
                date_matches = re.findall(r"(\d{2}/\d{2}/\d{4})", line)
                for idx, d in enumerate(date_matches):
                    try:
                        parsed = datetime.strptime(d, "%m/%d/%Y").date()
                        if idx == 0:
                            date_filed = parsed.isoformat()
                        elif idx == 1:
                            date_transferred = parsed.isoformat()
                        elif idx == 2:
                            date_closed = parsed.isoformat()
                    except ValueError:
                        pass

                snapshots.append({
                    "mdl_number": mdl_number,
                    "case_name": case_name,
                    "jpml_type": current_type,
                    "transferee_judge": judge or None,
                    "district": district_code or None,
                    "master_docket": master_docket or None,
                    "date_filed": date_filed,
                    "date_transferred": date_transferred,
                    "date_closed": date_closed,
                })

        i += 1

    logger.info(
        "Parsed %d MDL snapshots across %d types from Docket Type PDF",
        len(snapshots),
        len(type_counts),
    )
    return snapshots, type_counts


# ── Upsert Helpers ───────────────────────────────────────────────────────

def _get_mdl_id_map() -> dict[int, str]:
    """Fetch mdl_number -> id mapping from the mdls table."""
    rows = _get("mdls", {"select": "id,mdl_number"})
    return {r["mdl_number"]: r["id"] for r in rows}


def _upsert_mdls(parsed_rows: list[dict], report_dt: date) -> dict[int, str]:
    """
    Upsert MDL master records. Creates new entries for MDLs not yet in the
    database. Updates judge/district for existing ones.

    Returns mdl_number -> id map.
    """
    existing = _get_mdl_id_map()
    new_mdls = []
    source_url = _build_pdf_url("Actions_Pending", report_dt)

    for row in parsed_rows:
        mdl_num = row["mdl_number"]
        if mdl_num not in existing:
            new_mdls.append({
                "mdl_number": mdl_num,
                "title": row["title"],
                "district": row["district"] or None,
                "judge_name": row["judge_name"] or None,
                "status": "active",
                "source_url": source_url,
            })

    if new_mdls:
        logger.info("Inserting %d new MDLs", len(new_mdls))
        _bulk_insert(
            "mdls",
            new_mdls,
            on_conflict="mdl_number",
            resolution="merge-duplicates",
        )
        # Re-fetch to get new IDs
        existing = _get_mdl_id_map()

    return existing


def _upsert_stats(
    parsed_rows: list[dict],
    mdl_id_map: dict[int, str],
    report_dt: date,
) -> int:
    """
    Upsert mdl_stats_monthly rows for the report date.
    Computes pending_actions_change by comparing to the previous month.
    """
    stats_month = report_dt.isoformat()
    source_url = _build_pdf_url("Actions_Pending", report_dt)

    # Get previous month's stats for change calculation
    prev_stats = _get("mdl_stats_monthly", {
        "select": "mdl_id,pending_actions",
        "stats_month": f"lt.{stats_month}",
        "order": "stats_month.desc",
    })
    prev_by_mdl: dict[str, int] = {}
    for s in prev_stats:
        if s["mdl_id"] not in prev_by_mdl:
            prev_by_mdl[s["mdl_id"]] = s["pending_actions"]

    rows_to_upsert = []
    for row in parsed_rows:
        mdl_id = mdl_id_map.get(row["mdl_number"])
        if not mdl_id:
            logger.warning("No mdl_id for MDL %d, skipping stats", row["mdl_number"])
            continue

        prev_pending = prev_by_mdl.get(mdl_id)
        change = (
            row["pending_actions"] - prev_pending
            if prev_pending is not None
            else None
        )

        rows_to_upsert.append({
            "mdl_id": mdl_id,
            "stats_month": stats_month,
            "pending_actions": row["pending_actions"],
            "pending_actions_change": change,
            "source_url": source_url,
            "source_published_at": datetime(
                report_dt.year, report_dt.month, report_dt.day,
                tzinfo=timezone.utc,
            ).isoformat(),
        })

    if rows_to_upsert:
        count = _bulk_insert(
            "mdl_stats_monthly",
            rows_to_upsert,
            on_conflict="mdl_id,stats_month",
            resolution="merge-duplicates",
        )
        logger.info("Upserted %d mdl_stats_monthly rows", count)
        return count
    return 0


def _upsert_jpml_snapshots(
    snapshots: list[dict],
    report_dt: date,
) -> int:
    """Upsert jpml_snapshots rows."""
    report_date_str = report_dt.isoformat()
    rows = [
        {
            "report_date": report_date_str,
            "mdl_number": s["mdl_number"],
            "case_name": s["case_name"],
            "jpml_type": s["jpml_type"],
            "transferee_judge": s["transferee_judge"],
            "district": s["district"],
            "master_docket": s["master_docket"],
            "date_filed": s["date_filed"],
            "date_transferred": s["date_transferred"],
            "date_closed": s["date_closed"],
        }
        for s in snapshots
    ]

    if rows:
        count = _bulk_insert(
            "jpml_snapshots",
            rows,
            on_conflict="report_date,mdl_number",
            resolution="merge-duplicates",
        )
        logger.info("Upserted %d jpml_snapshots rows", count)
        return count
    return 0


def _upsert_type_summaries(
    type_counts: dict[str, int],
    report_dt: date,
) -> int:
    """Upsert jpml_type_summaries rows."""
    total = sum(type_counts.values())
    report_date_str = report_dt.isoformat()

    rows = [
        {
            "report_date": report_date_str,
            "mdl_type": mdl_type,
            "mdl_count": count,
            "pct_of_total": round(count / total * 100, 2) if total > 0 else 0,
            "total_active_mdls": total,
        }
        for mdl_type, count in type_counts.items()
    ]

    if rows:
        count = _bulk_insert(
            "jpml_type_summaries",
            rows,
            on_conflict="report_date,mdl_type",
            resolution="merge-duplicates",
        )
        logger.info("Upserted %d jpml_type_summaries rows", count)
        return count
    return 0


# ── Main Pipeline ────────────────────────────────────────────────────────

def run(report_dt: date | None = None):
    """Run the JPML monthly pipeline."""
    if report_dt is None:
        report_dt = _detect_latest_report_date()

    logger.info("JPML Monthly Pipeline — Report date: %s", report_dt.isoformat())

    with PipelineRun("jpml_monthly", trigger="manual") as run:

        # ── Step 1: Fetch & parse PDFs ──────────────────────────
        with run.step("fetch_pdf") as step:
            # Download Actions Pending PDF
            actions_url = _build_pdf_url("Actions_Pending", report_dt)
            actions_bytes = _download_pdf(actions_url)
            actions_rows = _parse_actions_pending_pdf(actions_bytes)

            # Download Docket Type PDF
            type_url = _build_pdf_url("MDL_Type", report_dt)
            type_bytes = _download_pdf(type_url)
            snapshots, type_counts = _parse_docket_type_pdf(type_bytes)

            step.set_counts(rows_in=0, rows_out=len(actions_rows) + len(snapshots))
            step.set_metadata({
                "report_date": report_dt.isoformat(),
                "actions_pending_url": actions_url,
                "docket_type_url": type_url,
                "actions_parsed": len(actions_rows),
                "snapshots_parsed": len(snapshots),
                "type_groups": len(type_counts),
            })

        # ── Step 2: Upsert to DB ────────────────────────────────
        with run.step("update_mdl_stats") as step:
            mdl_id_map = _upsert_mdls(actions_rows, report_dt)
            stats_count = _upsert_stats(actions_rows, mdl_id_map, report_dt)
            snapshot_count = _upsert_jpml_snapshots(snapshots, report_dt)
            type_summary_count = _upsert_type_summaries(type_counts, report_dt)

            step.set_counts(
                rows_in=len(actions_rows) + len(snapshots),
                rows_out=stats_count + snapshot_count + type_summary_count,
            )
            step.set_metadata({
                "stats_upserted": stats_count,
                "snapshots_upserted": snapshot_count,
                "type_summaries_upserted": type_summary_count,
                "new_mdls": len(
                    [r for r in actions_rows if r["mdl_number"] not in mdl_id_map]
                ),
            })

        # ── Step 3: Publish ─────────────────────────────────────
        with run.step("publish") as step:
            step.set_counts(rows_in=0, rows_out=0)
            step.set_metadata({
                "report_date": report_dt.isoformat(),
                "total_mdls": len(actions_rows),
                "total_snapshots": len(snapshots),
                "total_type_groups": len(type_counts),
            })
            logger.info("Pipeline complete for report date %s", report_dt.isoformat())


# ── CLI ──────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="JPML Monthly MDL Pipeline")
    parser.add_argument(
        "--date",
        type=str,
        default=None,
        help="Report date in YYYY-MM-DD format (default: auto-detect from JPML site)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Skip all DB writes",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
    )

    if args.dry_run:
        os.environ["DRY_RUN"] = "true"

    report_dt = None
    if args.date:
        report_dt = date.fromisoformat(args.date)

    run(report_dt)


if __name__ == "__main__":
    main()
