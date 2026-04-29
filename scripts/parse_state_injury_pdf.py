#!/usr/bin/env python3
"""Config-driven parser for state injury PDFs (MMUCC KABCO scale).

Replaces the bespoke parse_tn_injuries.py with a generic, config-driven
parser that can handle any state whose PDF follows the same tabular format.

Usage:
    python scripts/parse_state_injury_pdf.py \
        --pdf /path/to/state_injuries.pdf \
        --state-config scripts/state_configs/tennessee.json \
        --out web/lib/data/tn-injury-stats.ts

    # Or from a pre-extracted text file:
    python scripts/parse_state_injury_pdf.py \
        --txt /path/to/injuries.txt \
        --state-config scripts/state_configs/tennessee.json \
        --out web/lib/data/tn-injury-stats.ts

    # Or from a CSV (already parsed):
    python scripts/parse_state_injury_pdf.py \
        --csv /path/to/injuries.csv \
        --state-config scripts/state_configs/tennessee.json \
        --out web/lib/data/tn-injury-stats.ts
"""

import argparse
import csv
import json
import re
import subprocess
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Config loader
# ---------------------------------------------------------------------------

def load_config(config_path: str) -> dict:
    with open(config_path) as f:
        return json.load(f)

# ---------------------------------------------------------------------------
# PDF -> text extraction
# ---------------------------------------------------------------------------

def pdf_to_text(pdf_path: str) -> str:
    """Extract text from a PDF using pdftotext (poppler) if available."""
    try:
        result = subprocess.run(
            ["pdftotext", "-layout", pdf_path, "-"],
            capture_output=True, text=True, check=True,
        )
        return result.stdout
    except FileNotFoundError:
        print("WARNING: pdftotext not found. Install poppler-utils or use --txt/--csv.", file=sys.stderr)
        sys.exit(1)

# ---------------------------------------------------------------------------
# Text parser
# ---------------------------------------------------------------------------

YEAR_RE = re.compile(r"^\s*(\d{4})\*?\s*$")
NUM = r"[\d,]+"
# County name or "Total YYYY" followed by 7 numeric columns
ROW_RE = re.compile(
    r"^\s*([A-Za-z .]+(?:\s+\d{4})?)\s{2,}(" + NUM + r")\s+(" + NUM + r")\s+(" + NUM
    + r")\s+(" + NUM + r")\s+(" + NUM + r")\s+(" + NUM + r")\s+(" + NUM + r")\s*$"
)


def parse_int(s: str) -> int:
    return int(s.replace(",", ""))


def parse_text(text: str, config: dict) -> list[dict]:
    """Parse extracted text lines into row dicts."""
    counties_lower = {c.lower() for c in config["counties"]}
    total_label = config.get("total_row_label", "total").lower()
    statewide_sentinel = config["statewide_sentinel"]
    min_year = min(config["years_in_pdf"])
    max_year = max(config["years_in_pdf"])

    rows: list[dict] = []
    year = None

    for line in text.splitlines():
        m_year = YEAR_RE.match(line)
        if m_year:
            y = int(m_year.group(1))
            if min_year <= y <= max_year:
                year = y
                continue

        if year is None:
            continue

        m_row = ROW_RE.match(line)
        if not m_row:
            continue

        county_raw = m_row.group(1).strip()
        county_lc = county_raw.lower().strip()
        # Handle "Total YYYY" rows (e.g., "Total 2010")
        is_total = county_lc == total_label or county_lc.startswith(total_label + " ")

        if county_lc in counties_lower or is_total:
            county_name = county_raw.title() if not is_total else statewide_sentinel
            rows.append({
                "year": year,
                "county": county_name,
                "fatal": parse_int(m_row.group(2)),
                "serious_injury": parse_int(m_row.group(3)),
                "minor_injury": parse_int(m_row.group(4)),
                "possible_injury": parse_int(m_row.group(5)),
                "no_injury": parse_int(m_row.group(6)),
                "unknown": parse_int(m_row.group(7)),
                "total": parse_int(m_row.group(8)),
            })

    return rows


def parse_csv(csv_path: str, config: dict) -> list[dict]:
    """Parse a CSV file (output of a previous parse run) into row dicts."""
    rows: list[dict] = []
    with open(csv_path) as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append({
                "year": int(r["year"]),
                "county": r["county"],
                "fatal": int(r["fatal"]),
                "serious_injury": int(r["serious_injury"]),
                "minor_injury": int(r["minor_injury"]),
                "possible_injury": int(r["possible_injury"]),
                "no_injury": int(r["no_injury"]),
                "unknown": int(r["unknown"]),
                "total": int(r["total"]),
            })
    return rows

# ---------------------------------------------------------------------------
# TypeScript output generator
# ---------------------------------------------------------------------------

def generate_ts(rows: list[dict], config: dict) -> str:
    """Generate the TypeScript file content from parsed rows."""
    type_name = config["ts_type_name"]
    export_name = config["ts_export_name"]
    years_export = config.get("ts_years_export", f"{config['state_abbr']}_INJURY_DATA_YEARS")
    latest_year_export = config.get("ts_latest_year_export", f"{config['state_abbr']}_INJURY_DATA_LATEST_YEAR")
    latest_complete_year = config["latest_complete_year"]
    years = sorted(config["years_in_pdf"])
    partial_years = config.get("partial_years", [])

    lines: list[str] = []

    # Type definition
    lines.append(f"export interface {type_name} {{")
    lines.append("  year: number;")
    lines.append("  county: string;")
    lines.append("  fatal: number;")
    lines.append("  seriousInjury: number;")
    lines.append("  minorInjury: number;")
    lines.append("  possibleInjury: number;")
    lines.append("  noInjury: number;")
    lines.append("  unknown: number;")
    lines.append("  total: number;")
    lines.append("}")
    lines.append("")

    # Partial year comment
    if partial_years:
        partial_labels = config.get("partial_year_labels", {})
        partial_comments = config.get("partial_year_comments", {})
        for py in partial_years:
            comment = partial_comments.get(str(py))
            if comment:
                lines.append(f"/** {comment} */")
            else:
                label = partial_labels.get(str(py), "(partial)")
                lines.append(f"/** {py} data covers {label.strip('()')} and is preliminary. */")

    # Latest year constant
    lines.append(f"export const {latest_year_export} = {latest_complete_year};")
    lines.append("")

    # Years array
    lines.append(f"export const {years_export}: number[] = [")
    for y in years:
        lines.append(f"  {y},")
    lines.append("];")
    lines.append("")

    # Data array — statewide rows first (all years), then county rows by year+name
    statewide = config["statewide_sentinel"]
    statewide_rows = sorted([r for r in rows if r["county"] == statewide], key=lambda r: r["year"])
    county_rows = sorted([r for r in rows if r["county"] != statewide], key=lambda r: (r["year"], r["county"]))
    rows_sorted = statewide_rows + county_rows

    lines.append(f"export const {export_name}: {type_name}[] = [")
    for r in rows_sorted:
        line = (
            f"  {{ year: {r['year']}, county: \"{r['county']}\", "
            f"fatal: {r['fatal']}, seriousInjury: {r['serious_injury']}, "
            f"minorInjury: {r['minor_injury']}, possibleInjury: {r['possible_injury']}, "
            f"noInjury: {r['no_injury']}, unknown: {r['unknown']}, total: {r['total']} }},"
        )
        lines.append(line)
    lines.append("];")
    lines.append("")

    return "\n".join(lines)

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Config-driven state injury PDF parser")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--pdf", help="Path to the injury PDF")
    group.add_argument("--txt", help="Path to pre-extracted text file")
    group.add_argument("--csv", help="Path to pre-parsed CSV file")
    parser.add_argument("--state-config", required=True, help="Path to state config JSON")
    parser.add_argument("--out", required=True, help="Output TypeScript file path")

    args = parser.parse_args()
    config = load_config(args.state_config)

    # Parse input
    if args.csv:
        rows = parse_csv(args.csv, config)
    else:
        if args.pdf:
            text = pdf_to_text(args.pdf)
        else:
            text = Path(args.txt).read_text()
        rows = parse_text(text, config)

    print(f"Parsed {len(rows)} rows")
    years = sorted({r["year"] for r in rows})
    print(f"Years: {years}")
    counties = sorted({r["county"] for r in rows if r["county"] != config["statewide_sentinel"]})
    print(f"Counties: {len(counties)}")

    # Generate TypeScript
    ts_content = generate_ts(rows, config)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(ts_content)
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
