#!/usr/bin/env python3
"""
Backfill rur_urb (rural/urban classification) on existing fars_fatalities rows.
FARS RUR_URB values: 1=Rural, 2=Urban, 9=Unknown/not reported
Usage:
    python scripts/backfill_rural_urban.py
    python scripts/backfill_rural_urban.py --year 2023
    python scripts/backfill_rural_urban.py --dry-run
"""
import argparse
import io
import os
import sys
import zipfile
from collections import Counter

import pandas as pd
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv("web/.env.local", override=False)

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

NHTSA_URL_PATTERN = "https://static.nhtsa.gov/nhtsa/downloads/FARS/{year}/National/FARS{year}NationalCSV.zip"

YEARS = list(range(2019, 2024))


def download_zip(year: int) -> bytes:
    url = NHTSA_URL_PATTERN.format(year=year)
    print(f"  Downloading {url} ...")
    resp = requests.get(url, timeout=120)
    resp.raise_for_status()
    return resp.content


def extract_accident_csv(zip_bytes: bytes) -> pd.DataFrame:
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        accident_files = [n for n in zf.namelist() if "accident" in n.lower() and n.lower().endswith(".csv")]
        if not accident_files:
            raise FileNotFoundError(f"No Accident CSV found. Files: {zf.namelist()}")
        fname = accident_files[0]
        print(f"  Reading {fname} ...")
        with zf.open(fname) as f:
            try:
                df = pd.read_csv(f, encoding="utf-8-sig", low_memory=False)
            except UnicodeDecodeError:
                # Older NHTSA files (2019-2020) use latin-1 encoding
                f.seek(0)
                df = pd.read_csv(f, low_memory=False, encoding="latin-1")
    return df


def extract_rur_urb(df: pd.DataFrame) -> dict[int, int]:
    """Return {st_case: rur_urb_value} from the Accident CSV."""
    st_case_col = None
    rur_urb_col = None
    for col in df.columns:
        if col.upper() == "ST_CASE":
            st_case_col = col
        if col.upper() == "RUR_URB":
            rur_urb_col = col

    if st_case_col is None:
        raise ValueError(f"ST_CASE column not found. Got: {list(df.columns)}")
    if rur_urb_col is None:
        raise ValueError(f"RUR_URB column not found. Got: {list(df.columns)}")

    df[rur_urb_col] = pd.to_numeric(df[rur_urb_col], errors="coerce").fillna(9).astype(int)
    df[st_case_col] = df[st_case_col].astype(int)

    return dict(zip(df[st_case_col], df[rur_urb_col]))


def update_rur_urb(supabase, year: int, mapping: dict[int, int], dry_run: bool) -> None:
    dist = Counter(mapping.values())
    rural = dist.get(1, 0)
    urban = dist.get(2, 0)
    unknown = sum(v for k, v in dist.items() if k not in (1, 2))
    print(f"  Year {year}: {len(mapping)} records — Rural={rural}, Urban={urban}, Unknown={unknown}")

    if dry_run:
        print("  [DRY RUN] Would update database.")
        return

    batch_size = 500
    # Group by rur_urb value to minimize updates
    by_value: dict[int, list[int]] = {}
    for st_case, val in mapping.items():
        by_value.setdefault(val, []).append(st_case)

    for rur_urb_val, st_cases in by_value.items():
        for i in range(0, len(st_cases), batch_size):
            batch = st_cases[i : i + batch_size]
            supabase.table("fars_fatalities").update(
                {"rur_urb": rur_urb_val}
            ).eq("year", year).in_("st_case", batch).execute()
        print(f"    Updated rur_urb={rur_urb_val} for {len(st_cases)} crashes")


def main():
    parser = argparse.ArgumentParser(description="Backfill rur_urb on fars_fatalities")
    parser.add_argument("--year", type=int, help="Process a single year (default: all 2019-2023)")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be updated without writing")
    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set", file=sys.stderr)
        sys.exit(1)

    years = [args.year] if args.year else YEARS
    supabase = None if args.dry_run else create_client(SUPABASE_URL, SUPABASE_KEY)

    total_records = 0

    for year in years:
        print(f"\nProcessing year {year}...")
        try:
            zip_bytes = download_zip(year)
            df = extract_accident_csv(zip_bytes)
            print(f"  Accident records: {len(df):,}")
            mapping = extract_rur_urb(df)
            update_rur_urb(supabase, year, mapping, args.dry_run)
            total_records += len(mapping)
        except Exception as e:
            print(f"  ERROR for year {year}: {e}", file=sys.stderr)
            continue

    print(f"\nDone. Total records processed: {total_records:,}")
    if args.dry_run:
        print("[DRY RUN] No changes written to database.")


if __name__ == "__main__":
    main()
