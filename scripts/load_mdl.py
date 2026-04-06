#!/usr/bin/env python3
"""Load MDL data from Google Sheets into existing Supabase tables."""

import os
import csv
import io
import re
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

SHEET_ID = "15IQnuHJUfyk3BovU2Eiw6aPYxYGwd3GcWmYTdVdHazs"
CSV_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv"


def parse_judge_field(judge_raw: str):
    judge_raw = judge_raw.strip()
    title_match = re.search(r'\(([^)]+)\)', judge_raw)
    judge_title = title_match.group(1) if title_match else None
    rest = re.sub(r'\s*\([^)]+\)\s*', '', judge_raw).strip()
    dist_match = re.match(r'^([A-Z]{2,4})\s+(.+)$', rest)
    if dist_match:
        district = dist_match.group(1)
        judge_name = dist_match.group(2).strip()
    else:
        district = None
        judge_name = rest
    return district, judge_name, judge_title


def run():
    print("Downloading MDL spreadsheet...")
    resp = requests.get(CSV_URL, timeout=30)
    resp.raise_for_status()
    reader = csv.DictReader(io.StringIO(resp.text))

    # Collect unique MDLs and all snapshots
    cases = {}
    snapshots = []
    skipped = 0

    for row in reader:
        try:
            mdl_number = int(row.get("MDL Number", "0"))
        except ValueError:
            skipped += 1
            continue
        if mdl_number == 0:
            skipped += 1
            continue

        case_name = row.get("Case Name", "").strip()
        judge_raw = row.get("Judge", "").strip()
        report_date = row.get("Report Date", "").strip()

        try:
            actions_pending = int(str(row.get("Pending Actions", "0")).replace(",", ""))
        except ValueError:
            actions_pending = 0

        if not case_name or not report_date or not re.match(r'^\d{4}-\d{2}-\d{2}$', report_date):
            skipped += 1
            continue

        district, judge_name, judge_title = parse_judge_field(judge_raw)

        cases[mdl_number] = {
            "mdl_number": mdl_number,
            "title": case_name,
            "district": district,
            "judge_name": judge_name,
            "court": judge_title,
            "status": "active",
        }
        snapshots.append({
            "mdl_number": mdl_number,
            "report_date": report_date,
            "pending_actions": actions_pending,
        })

    print(f"Parsed {len(cases)} unique MDLs, {len(snapshots)} snapshots (skipped {skipped})")

    # Upsert MDL cases
    case_list = list(cases.values())
    for i in range(0, len(case_list), 200):
        batch = case_list[i:i+200]
        print(f"  Upserting mdls batch {i//200+1}...")
        supabase.table("mdls").upsert(batch, on_conflict="mdl_number").execute()

    # Build mdl_number -> id lookup
    print("  Fetching MDL IDs...")
    result = supabase.table("mdls").select("id, mdl_number").execute()
    mdl_id_map = {r["mdl_number"]: r["id"] for r in result.data}

    # Upsert snapshots
    stats_records = []
    for s in snapshots:
        mdl_id = mdl_id_map.get(s["mdl_number"])
        if not mdl_id:
            continue
        stats_records.append({
            "mdl_id": mdl_id,
            "stats_month": s["report_date"],
            "pending_actions": s["pending_actions"],
            "source_url": "",
        })

    for i in range(0, len(stats_records), 200):
        batch = stats_records[i:i+200]
        print(f"  Upserting stats batch {i//200+1}...")
        supabase.table("mdl_stats_monthly").upsert(
            batch, on_conflict="mdl_id,stats_month"
        ).execute()

    print(f"Done: {len(cases)} MDLs, {len(stats_records)} snapshots loaded.")


if __name__ == "__main__":
    run()