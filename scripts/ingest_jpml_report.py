#!/usr/bin/env python3
"""
Ingest a JPML "Pending MDL Dockets By MDL Type" PDF report into Supabase.

Usage:
    python scripts/ingest_jpml_report.py --pdf path/to/report.pdf --date 2026-04-01

Dependencies: pip install pdfplumber supabase python-dotenv
"""

import argparse
import os
import re
import sys
from datetime import datetime

import pdfplumber
from dotenv import load_dotenv
from supabase import create_client

# Known JPML type section headers (exact text from the PDF)
JPML_TYPES = [
    "Air Disaster",
    "Antitrust",
    "Common Disaster",
    "Data Breach and Consumer Privacy",
    "Employment Practices",
    "Intellectual Property",
    "Miscellaneous",
    "Products Liability",
    "Sales Practices",
    "Securities",
]

# Regex: docket number pattern like "1:25-md-3155" or "2:04-cv-5184"
DOCKET_RE = re.compile(r"\d:\d{2}-\w+-\d+")

# Regex: date pattern MM/DD/YYYY
DATE_RE = re.compile(r"\d{2}/\d{2}/\d{4}")

# Regex: MDL row starts with 4-digit number followed by "IN RE:"
MDL_LINE_RE = re.compile(r"^(\d{4})\s+IN RE:\s+(.+)")

# Regex: type summary line
SUMMARY_RE = re.compile(r"Number of (.+) Litigations Listed:\s+(\d+)")

# Regex: total MDLs on the report
TOTAL_RE = re.compile(r"MDLs Listed on this Report:\s+(\d+)")


def parse_date(date_str: str) -> str | None:
    """Convert MM/DD/YYYY to YYYY-MM-DD, or return None."""
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str.strip(), "%m/%d/%Y").strftime("%Y-%m-%d")
    except ValueError:
        return None


def extract_text(pdf_path: str) -> str:
    """Extract all text from the PDF, page by page."""
    full_text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                full_text += text + "\n"
    return full_text


def parse_mdl_line(line: str) -> dict | None:
    """
    Parse a single MDL data line that contains the docket number and dates.
    Returns a partial record dict or None if the line doesn't match.

    A typical data line looks like:
    3155 IN RE: Air Crash at Toronto ... Blackwell, Jerry W. MN 0:25-md-3155 05/22/2025 08/08/2025
    """
    m = MDL_LINE_RE.match(line)
    if not m:
        return None

    mdl_number = int(m.group(1))
    rest = m.group(2)  # everything after "IN RE: "

    # Find the docket number pattern
    docket_match = DOCKET_RE.search(rest)
    if not docket_match:
        return None

    master_docket = docket_match.group(0)
    docket_pos = docket_match.start()

    # Find all dates after the docket number
    dates_after_docket = DATE_RE.findall(rest[docket_match.end():])
    date_filed = parse_date(dates_after_docket[0]) if len(dates_after_docket) >= 1 else None
    date_transferred = parse_date(dates_after_docket[1]) if len(dates_after_docket) >= 2 else None
    date_closed = parse_date(dates_after_docket[2]) if len(dates_after_docket) >= 3 else None

    # Everything before the docket is: case_name ... judge_name district_code
    before_docket = rest[:docket_pos].rstrip()

    # The district code is the last all-caps token (2-4 chars) before the docket
    # The judge name is just before the district code
    # The case name is everything before the judge name
    #
    # Strategy: find the district code (short all-caps token) by working backwards
    # from before_docket. The district code is typically 2-3 uppercase letters.
    tokens = before_docket.split()

    # Find district code: last token that's all uppercase and 1-4 chars
    district = None
    district_idx = None
    for i in range(len(tokens) - 1, -1, -1):
        token = tokens[i]
        if re.match(r"^[A-Z]{1,4}$", token) and len(token) >= 2:
            district = token
            district_idx = i
            break

    if district_idx is not None:
        # Judge name: tokens between case name and district
        # Work backwards from district_idx to find where judge name starts.
        # Judge names have the pattern "LastName, FirstName M." (comma-separated)
        # Find the last comma before district_idx
        before_district = " ".join(tokens[:district_idx])
        # The judge name contains a comma, so split on the last occurrence
        # of a comma-based name pattern
        # Strategy: find the judge name by looking for "Lastname, Firstname" pattern
        # going backwards from the end of before_district
        judge_match = re.search(
            r"([A-Z][a-z'-]+(?:ey|er|es|en|on|an|is|ll|tt|ws|in|rd|ck|ke|ar|ns|ng|le|ay|ch|ss|th|ee|rt|ge|am|ip|be|rn|te|lk|ow|pp|ny|rg|tz|la|ly|mo|ey|or|nd|rk|ka|ta|ma|el|ne|ey|ot|ey|ey)?(?:\-[A-Z][a-z]+)?,\s+[A-Z][a-zA-Z.']+(?:\s+[A-Z]\.?)?)\s*$",
            before_district,
        )
        if judge_match:
            judge_name = judge_match.group(1).strip()
            case_name = before_district[: judge_match.start()].strip()
        else:
            # Fallback: try a simpler comma-based split
            last_comma = before_district.rfind(",")
            if last_comma > 0:
                # Everything from the word before the comma to end is judge name
                pre_comma = before_district[:last_comma]
                post_comma = before_district[last_comma + 1 :]
                # Find the last space before the comma to get the judge's last name
                last_space = pre_comma.rfind(" ")
                if last_space > 0:
                    judge_name = pre_comma[last_space + 1 :] + "," + post_comma
                    judge_name = judge_name.strip()
                    case_name = pre_comma[:last_space].strip()
                else:
                    judge_name = None
                    case_name = before_district
            else:
                judge_name = None
                case_name = before_district
    else:
        judge_name = None
        case_name = before_docket

    return {
        "mdl_number": mdl_number,
        "case_name": case_name,
        "transferee_judge": judge_name,
        "district": district,
        "master_docket": master_docket,
        "date_filed": date_filed,
        "date_transferred": date_transferred,
        "date_closed": date_closed,
    }


def parse_report(pdf_path: str) -> tuple[list[dict], list[dict], int]:
    """
    Parse the JPML report PDF and return (snapshots, type_summaries, report_total).
    """
    text = extract_text(pdf_path)
    lines = text.split("\n")

    snapshots: list[dict] = []
    type_summaries: list[dict] = []
    report_total = 0
    current_type: str | None = None

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Skip empty lines
        if not line:
            i += 1
            continue

        # Check for report total
        total_match = TOTAL_RE.search(line)
        if total_match:
            report_total = int(total_match.group(1))
            i += 1
            continue

        # Check for type summary
        summary_match = SUMMARY_RE.search(line)
        if summary_match:
            type_name = summary_match.group(1).strip()
            count = int(summary_match.group(2))
            type_summaries.append({"mdl_type": type_name, "mdl_count": count})
            i += 1
            continue

        # Check for type header
        if line in JPML_TYPES:
            current_type = line
            i += 1
            continue

        # Check for MDL data line
        record = parse_mdl_line(line)
        if record and current_type:
            # Check if the next line(s) are continuation of the case name
            # (lines that don't start with a number + "IN RE:" and don't match
            # a type header, summary, or another MDL line)
            while i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                if not next_line:
                    break
                if next_line in JPML_TYPES:
                    break
                if SUMMARY_RE.match(next_line):
                    break
                if TOTAL_RE.match(next_line):
                    break
                if MDL_LINE_RE.match(next_line):
                    break
                # This is a continuation line — could be part of case name
                # or just wrapping text. Don't add it to case_name since
                # the actual data was already parsed from the main line.
                i += 1

            record["jpml_type"] = current_type
            snapshots.append(record)

        i += 1

    return snapshots, type_summaries, report_total


def main():
    parser = argparse.ArgumentParser(
        description="Ingest a JPML monthly report PDF into Supabase."
    )
    parser.add_argument("--pdf", required=True, help="Path to the JPML report PDF")
    parser.add_argument(
        "--date",
        required=True,
        help="Report date in YYYY-MM-DD format (e.g. 2026-04-01)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and print results without writing to database",
    )
    args = parser.parse_args()

    # Validate date
    try:
        datetime.strptime(args.date, "%Y-%m-%d")
    except ValueError:
        print(f"Error: Invalid date format '{args.date}'. Use YYYY-MM-DD.")
        sys.exit(1)

    report_date = args.date

    # Parse the PDF
    print(f"Parsing {args.pdf} ...")
    snapshots, type_summaries, report_total = parse_report(args.pdf)

    # Compute pct_of_total and total_active_mdls for type summaries
    total_mdls = len(snapshots)
    for ts in type_summaries:
        ts["report_date"] = report_date
        ts["total_active_mdls"] = total_mdls
        ts["pct_of_total"] = (
            round(ts["mdl_count"] / total_mdls * 100, 2) if total_mdls > 0 else 0
        )

    # Add report_date to all snapshots
    for s in snapshots:
        s["report_date"] = report_date

    # Print summary
    type_counts: dict[str, int] = {}
    for s in snapshots:
        t = s["jpml_type"]
        type_counts[t] = type_counts.get(t, 0) + 1

    print(f"\nParsed {len(snapshots)} MDLs across {len(type_counts)} types:")
    for t in JPML_TYPES:
        count = type_counts.get(t, 0)
        if count > 0:
            print(f"  {t}: {count}")

    print(f"\nType summaries from PDF: {len(type_summaries)}")
    for ts in type_summaries:
        print(f"  {ts['mdl_type']}: {ts['mdl_count']} ({ts['pct_of_total']}%)")

    print(f"\nReport total (from PDF footer): {report_total}")

    if report_total and len(snapshots) != report_total:
        print(
            f"\nWARNING: Parsed {len(snapshots)} MDLs but report says {report_total}!"
        )

    # Validate type summary counts match parsed counts
    for ts in type_summaries:
        parsed_count = type_counts.get(ts["mdl_type"], 0)
        if parsed_count != ts["mdl_count"]:
            print(
                f"WARNING: {ts['mdl_type']}: parsed {parsed_count}, "
                f"summary says {ts['mdl_count']}"
            )

    if args.dry_run:
        print("\n[Dry run] Skipping database write.")
        # Print first few records for inspection
        print("\nSample records:")
        for s in snapshots[:3]:
            print(f"  {s}")
        return

    # Connect to Supabase
    load_dotenv()
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", "web", ".env.local"))

    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    )

    if not supabase_url or not supabase_key:
        print(
            "Error: Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL "
            "and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)."
        )
        sys.exit(1)

    print(f"\nConnecting to Supabase at {supabase_url} ...")
    sb = create_client(supabase_url, supabase_key)

    # Upsert jpml_snapshots in batches
    print(f"Upserting {len(snapshots)} jpml_snapshots ...")
    batch_size = 50
    inserted = 0
    for start in range(0, len(snapshots), batch_size):
        batch = snapshots[start : start + batch_size]
        result = (
            sb.table("jpml_snapshots")
            .upsert(batch, on_conflict="report_date,mdl_number")
            .execute()
        )
        inserted += len(result.data) if result.data else 0

    print(f"  Upserted {inserted} jpml_snapshots rows.")

    # Upsert jpml_type_summaries
    print(f"Upserting {len(type_summaries)} jpml_type_summaries ...")
    result = (
        sb.table("jpml_type_summaries")
        .upsert(type_summaries, on_conflict="report_date,mdl_type")
        .execute()
    )
    ts_count = len(result.data) if result.data else 0
    print(f"  Upserted {ts_count} jpml_type_summaries rows.")

    print("\nDone!")


if __name__ == "__main__":
    main()
