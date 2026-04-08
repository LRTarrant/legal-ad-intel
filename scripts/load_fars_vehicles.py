#!/usr/bin/env python3
"""
Tag FARS crashes with vehicle type flags (motorcycle, large truck).

Downloads NHTSA FARS Vehicle CSV files for years 2019-2023 and updates
has_motorcycle / has_large_truck boolean flags on fars_fatalities rows.

Usage:
    python scripts/load_fars_vehicles.py
    python scripts/load_fars_vehicles.py --year 2023
    python scripts/load_fars_vehicles.py --dry-run

Environment variables:
    SUPABASE_URL             Supabase project URL
    SUPABASE_SERVICE_ROLE_KEY  Service role key (for updates)

Dependencies:
    pip install pandas requests python-dotenv supabase
"""
import argparse
import io
import os
import sys
import zipfile
from collections import defaultdict

import pandas as pd
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv("web/.env.local", override=False)

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

# NHTSA zip URL pattern (same as load_fars.py)
NHTSA_URL_PATTERN = "https://static.nhtsa.gov/nhtsa/downloads/FARS/{year}/National/FARS{year}NationalCSV.zip"

# FARS body type codes
# 80-89 = Motorcycle (including mopeds, dirt bikes)
MOTORCYCLE_CODES = set(range(80, 90))
# 60-79 = Large Truck (single-unit, combination, etc.)
LARGE_TRUCK_CODES = set(range(60, 80))

YEARS = list(range(2019, 2024))  # 2019-2023


def download_zip(year: int) -> bytes:
    url = NHTSA_URL_PATTERN.format(year=year)
    print(f"  Downloading {url} ...")
    resp = requests.get(url, timeout=120)
    resp.raise_for_status()
    return resp.content


def extract_vehicle_csv(zip_bytes: bytes) -> pd.DataFrame:
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        # Find the vehicle file (case-insensitive match for "vehicle")
        vehicle_files = [n for n in zf.namelist() if "vehicle" in n.lower() and n.lower().endswith(".csv")]
        if not vehicle_files:
            raise FileNotFoundError(f"No vehicle CSV found. Files: {zf.namelist()}")
        fname = vehicle_files[0]
        print(f"  Reading {fname} ...")
        with zf.open(fname) as f:
            df = pd.read_csv(f, low_memory=False)
    return df


def classify_vehicles(df: pd.DataFrame) -> tuple[set[int], set[int]]:
    """Return (motorcycle_st_cases, large_truck_st_cases)."""
    # Normalize column name
    body_col = None
    for col in df.columns:
        if col.upper() in ("BODY_TYP", "BODYTYP"):
            body_col = col
            break
    st_case_col = None
    for col in df.columns:
        if col.upper() == "ST_CASE":
            st_case_col = col
            break

    if body_col is None or st_case_col is None:
        raise ValueError(f"Expected columns not found. Got: {list(df.columns)}")

    df[body_col] = pd.to_numeric(df[body_col], errors="coerce").fillna(-1).astype(int)

    motorcycle_cases = set(df.loc[df[body_col].isin(MOTORCYCLE_CODES), st_case_col].astype(int).tolist())
    large_truck_cases = set(df.loc[df[body_col].isin(LARGE_TRUCK_CODES), st_case_col].astype(int).tolist())
    return motorcycle_cases, large_truck_cases


def update_flags(supabase, year: int, motorcycle_cases: set[int], large_truck_cases: set[int], dry_run: bool) -> None:
    print(f"  Year {year}: {len(motorcycle_cases)} motorcycle crashes, {len(large_truck_cases)} large truck crashes")
    if dry_run:
        print("  [DRY RUN] Would update flags in database.")
        return

    batch_size = 500

    # Update motorcycle flag
    mc_list = list(motorcycle_cases)
    for i in range(0, len(mc_list), batch_size):
        batch = mc_list[i : i + batch_size]
        supabase.table("fars_fatalities").update({"has_motorcycle": True}).eq("year", year).in_("st_case", batch).execute()
    print(f"  Updated has_motorcycle=true for {len(mc_list)} crashes")

    # Update large truck flag
    lt_list = list(large_truck_cases)
    for i in range(0, len(lt_list), batch_size):
        batch = lt_list[i : i + batch_size]
        supabase.table("fars_fatalities").update({"has_large_truck": True}).eq("year", year).in_("st_case", batch).execute()
    print(f"  Updated has_large_truck=true for {len(lt_list)} crashes")


def main():
    parser = argparse.ArgumentParser(description="Tag FARS crashes with vehicle type flags")
    parser.add_argument("--year", type=int, help="Process a single year (default: all 2019-2023)")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be updated without writing")
    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set", file=sys.stderr)
        sys.exit(1)

    years = [args.year] if args.year else YEARS
    supabase = None if args.dry_run else create_client(SUPABASE_URL, SUPABASE_KEY)

    total_mc = 0
    total_lt = 0

    for year in years:
        print(f"\nProcessing year {year}...")
        try:
            zip_bytes = download_zip(year)
            df = extract_vehicle_csv(zip_bytes)
            print(f"  Vehicle records: {len(df):,}")
            motorcycle_cases, large_truck_cases = classify_vehicles(df)
            update_flags(supabase, year, motorcycle_cases, large_truck_cases, args.dry_run)
            total_mc += len(motorcycle_cases)
            total_lt += len(large_truck_cases)
        except Exception as e:
            print(f"  ERROR for year {year}: {e}", file=sys.stderr)
            continue

    print(f"\nDone. Total motorcycle crashes flagged: {total_mc:,}")
    print(f"Total large truck crashes flagged: {total_lt:,}")
    if args.dry_run:
        print("[DRY RUN] No changes written to database.")


if __name__ == "__main__":
    main()
