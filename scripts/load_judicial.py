#!/usr/bin/env python3
"""Load judicial profiles from Google Sheets CSV export into Supabase."""

import os
import csv
import io
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Google Sheets CSV export URL
SHEET_ID = "1fOoyWFV0Zp9RHSrIhzJ2qxAJRg097wtiHc6IPFp7wic"
CSV_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv"


def run():
    print("Downloading judicial profiles spreadsheet...")
    resp = requests.get(CSV_URL, timeout=30)
    resp.raise_for_status()

    reader = csv.DictReader(io.StringIO(resp.text))
    records = []
    skipped = 0

    for row in reader:
        fips = row.get("Fips", "").strip()
        county = row.get("County_Name", "").strip()
        state = row.get("State", "").strip()
        profile = row.get("Judicial Profile", "").strip()

        # Skip state-level summary rows (FIPS ending in 000) and empty profiles
        if not fips or not state or not profile or not county:
            skipped += 1
            continue

        try:
            fips_int = int(fips)
        except ValueError:
            skipped += 1
            continue

        # Skip aggregate rows (e.g., 1000 = ALABAMA, 0 = UNITED STATES)
        if fips_int % 1000 == 0:
            skipped += 1
            continue

        records.append({
            "fips": fips_int,
            "county_name": county,
            "state": state.upper(),
            "judicial_profile": profile,
        })

    print(f"Parsed {len(records)} county profiles (skipped {skipped} rows)")

    # Upsert in batches
    batch_size = 500
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        print(f"  Upserting batch {i // batch_size + 1} ({len(batch)} records)...")
        supabase.table("judicial_profiles").upsert(
            batch, on_conflict="fips"
        ).execute()

    print(f"Done: {len(records)} judicial profiles loaded.")


if __name__ == "__main__":
    run()