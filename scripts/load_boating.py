#!/usr/bin/env python3
"""
Load USCG Boating Accident Report Database (BARD) data into Supabase.

Downloads the BARD CSV from the Data Liberation Project and upserts
accident records into the boating_accidents table.

Usage:
    python scripts/load_boating.py
    python scripts/load_boating.py --dry-run

Environment variables:
    SUPABASE_URL             Supabase project URL
    SUPABASE_SERVICE_ROLE_KEY  Service role key (for upserts)

Dependencies:
    pip install pandas requests python-dotenv supabase
"""
import argparse
import io
import os
import sys
from collections import Counter

import pandas as pd
import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv("web/.env.local", override=False)

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

# Data Liberation Project CDN — USCG Boating Accident Report Database (BARD)
# Two files cover 2019-2023: one for 2014-2022 data, one for 2023
BARD_CSV_URLS = [
    "https://dlp-cdn.muckrock.com/USCG%20Boating%20Accident%20Report%20Database%20(BARD)/Converted%20Files/CSV/bard-2014-2022-ReleasableAccidentes.csv",
    "https://dlp-cdn.muckrock.com/USCG%20Boating%20Accident%20Report%20Database%20(BARD)/Converted%20Files/CSV/bard-2023-2023-ReleasableAccidents.csv",
]
# Fallback: try GitHub raw if CDN fails
BARD_FALLBACK_URLS = [
    "https://raw.githubusercontent.com/data-liberation-project/uscg-boating-accident-report-database-data/main/data/bard-2014-2022-ReleasableAccidentes.csv",
    "https://raw.githubusercontent.com/data-liberation-project/uscg-boating-accident-report-database-data/main/data/bard-2023-2023-ReleasableAccidents.csv",
]

YEARS = set(range(2019, 2024))  # 2019-2023

# State name to abbreviation mapping
STATE_NAME_TO_ABBR = {
    "ALABAMA": "AL", "ALASKA": "AK", "ARIZONA": "AZ", "ARKANSAS": "AR",
    "CALIFORNIA": "CA", "COLORADO": "CO", "CONNECTICUT": "CT", "DELAWARE": "DE",
    "FLORIDA": "FL", "GEORGIA": "GA", "HAWAII": "HI", "IDAHO": "ID",
    "ILLINOIS": "IL", "INDIANA": "IN", "IOWA": "IA", "KANSAS": "KS",
    "KENTUCKY": "KY", "LOUISIANA": "LA", "MAINE": "ME", "MARYLAND": "MD",
    "MASSACHUSETTS": "MA", "MICHIGAN": "MI", "MINNESOTA": "MN", "MISSISSIPPI": "MS",
    "MISSOURI": "MO", "MONTANA": "MT", "NEBRASKA": "NE", "NEVADA": "NV",
    "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ", "NEW MEXICO": "NM", "NEW YORK": "NY",
    "NORTH CAROLINA": "NC", "NORTH DAKOTA": "ND", "OHIO": "OH", "OKLAHOMA": "OK",
    "OREGON": "OR", "PENNSYLVANIA": "PA", "RHODE ISLAND": "RI", "SOUTH CAROLINA": "SC",
    "SOUTH DAKOTA": "SD", "TENNESSEE": "TN", "TEXAS": "TX", "UTAH": "UT",
    "VERMONT": "VT", "VIRGINIA": "VA", "WASHINGTON": "WA", "WEST VIRGINIA": "WV",
    "WISCONSIN": "WI", "WYOMING": "WY", "DISTRICT OF COLUMBIA": "DC",
    "PUERTO RICO": "PR", "VIRGIN ISLANDS": "VI", "GUAM": "GU",
}


def download_csvs() -> pd.DataFrame:
    """Download and concatenate all BARD CSV files."""
    frames = []
    for primary_url, fallback_url in zip(BARD_CSV_URLS, BARD_FALLBACK_URLS):
        for url in (primary_url, fallback_url):
            try:
                print(f"Fetching {url} ...")
                resp = requests.get(url, timeout=120)
                resp.raise_for_status()
                df = pd.read_csv(io.StringIO(resp.text), low_memory=False)
                print(f"  Downloaded {len(df):,} rows")
                frames.append(df)
                break  # success, don't try fallback
            except Exception as e:
                print(f"  Failed ({e}), trying fallback...")
    if not frames:
        raise RuntimeError("All download URLs failed.")
    combined = pd.concat(frames, ignore_index=True)
    print(f"Total rows after concat: {len(combined):,}")
    return combined


def normalize_state(val) -> str | None:
    if pd.isna(val):
        return None
    s = str(val).strip().upper()
    if len(s) == 2:
        return s  # already abbreviation
    return STATE_NAME_TO_ABBR.get(s)


def safe_int(val, default=None):
    try:
        v = int(float(val))
        return v if v >= 0 else default
    except (ValueError, TypeError):
        return default


def safe_float(val, default=None):
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def safe_date(val) -> str | None:
    if pd.isna(val):
        return None
    try:
        return pd.to_datetime(str(val)).strftime("%Y-%m-%d")
    except Exception:
        return None


def build_records(df: pd.DataFrame) -> list[dict]:
    records = []
    # Normalize column names to upper
    df.columns = [c.strip().upper() for c in df.columns]

    # Column mapping — try multiple possible names
    def col(candidates):
        for c in candidates:
            if c in df.columns:
                return c
        return None

    year_col = col(["YEAR", "ACC_YEAR"])
    state_col = col(["STATE", "STATE_NAME", "STATE_ABBR"])
    county_col = col(["COUNTY", "COUNTY_NAME"])
    county_fips_col = col(["COUNTY_FIPS", "COUNTYFIPS"])
    date_col = col(["ACCIDENT_DATE", "ACC_DATE", "ACCIDENTDATE"])
    deaths_col = col(["NUMBER_DEATHS", "DEATHS", "NUM_DEATHS", "NUMBERDEATHS"])
    injuries_col = col(["NUMBER_INJURED", "INJURIES", "NUM_INJURED", "NUMBERINJURED"])
    damage_col = col(["PROPERTY_DAMAGE", "DAMAGE_AMOUNT", "PROPERTYDAMAGE"])
    vessel_col = col(["VESSEL_1_VESSEL_TYPE", "VESSEL_TYPE", "VESSELTYPE"])
    cause_col = col(["CAUSE_OF_ACCIDENT", "ACCIDENTCAUSE"])
    water_col = col(["BODY_OF_WATER", "BODYOFWATER"])
    lat_col = col(["LATITUDE", "LAT"])
    lon_col = col(["LONGITUDE", "LON", "LONG"])
    numbering_col = col(["BARDID", "NUMBERING_ID", "NUMBERINGID", "VESSEL_1_OFFICIAL_NUMBER"])

    for _, row in df.iterrows():
        year = safe_int(row.get(year_col)) if year_col else None
        if year not in YEARS:
            continue

        state = normalize_state(row.get(state_col)) if state_col else None
        record = {
            "year": year,
            "state": state,
            "county_name": str(row[county_col]).strip() if county_col and not pd.isna(row.get(county_col)) else None,
            "county_fips": safe_int(row.get(county_fips_col)) if county_fips_col else None,
            "accident_date": safe_date(row.get(date_col)) if date_col else None,
            "deaths": safe_int(row.get(deaths_col), 0) if deaths_col else 0,
            "injuries": safe_int(row.get(injuries_col), 0) if injuries_col else 0,
            "damage_amount": safe_float(row.get(damage_col)) if damage_col else None,
            "vessel_type": str(row[vessel_col]).strip() if vessel_col and not pd.isna(row.get(vessel_col)) else None,
            "cause_of_accident": str(row[cause_col]).strip() if cause_col and not pd.isna(row.get(cause_col)) else None,
            "body_of_water": str(row[water_col]).strip() if water_col and not pd.isna(row.get(water_col)) else None,
            "latitude": safe_float(row.get(lat_col)) if lat_col else None,
            "longitude": safe_float(row.get(lon_col)) if lon_col else None,
            "numbering_id": str(row[numbering_col]).strip() if numbering_col and not pd.isna(row.get(numbering_col)) else None,
        }
        records.append(record)
    return records


def main():
    parser = argparse.ArgumentParser(description="Load USCG boating accident data")
    parser.add_argument("--dry-run", action="store_true", help="Print summary without writing to database")
    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set", file=sys.stderr)
        sys.exit(1)

    df = download_csvs()
    records = build_records(df)

    if not records:
        print("No records matched the year filter (2019-2023).")
        return

    # Summary
    year_counts = Counter(r["year"] for r in records)
    state_counts = Counter(r["state"] for r in records if r["state"])
    print(f"\nTotal records to upsert: {len(records):,}")
    print("Records per year:")
    for yr in sorted(year_counts):
        print(f"  {yr}: {year_counts[yr]:,}")
    print("Top 5 states:")
    for state, count in state_counts.most_common(5):
        print(f"  {state}: {count:,}")

    if args.dry_run:
        print("\n[DRY RUN] No changes written to database.")
        return

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    batch_size = 500
    inserted = 0
    errors = 0
    for i in range(0, len(records), batch_size):
        batch = records[i : i + batch_size]
        try:
            supabase.table("boating_accidents").upsert(
                batch,
                on_conflict="numbering_id,year",
            ).execute()
            inserted += len(batch)
            print(f"  Upserted batch {i//batch_size + 1}: {inserted:,} records so far")
        except Exception as e:
            print(f"  ERROR in batch {i//batch_size + 1}: {e}", file=sys.stderr)
            errors += len(batch)

    print(f"\nDone. {inserted:,} records upserted, {errors:,} errors.")


if __name__ == "__main__":
    main()
