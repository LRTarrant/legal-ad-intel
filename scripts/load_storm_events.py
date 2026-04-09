#!/usr/bin/env python3
"""
Load NOAA Storm Events detail data into Supabase.

Downloads StormEvents CSV.gz files from NOAA for years 2019-2024,
parses key fields, and upserts into the storm_events table.

Usage:
    python scripts/load_storm_events.py
    python scripts/load_storm_events.py --year 2023
    python scripts/load_storm_events.py --dry-run

Environment variables:
    SUPABASE_URL             Supabase project URL
    SUPABASE_SERVICE_ROLE_KEY  Service role key (for upserts)

Dependencies:
    pip install pandas requests python-dotenv supabase
"""
import argparse
import gzip
import io
import os
import re
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

NOAA_BASE_URL = "https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/"
YEARS = list(range(2019, 2025))  # 2019-2024


def get_file_url(year: int) -> str:
    """Fetch the NOAA directory listing and find the details CSV for the given year."""
    resp = requests.get(NOAA_BASE_URL, timeout=30)
    resp.raise_for_status()
    pattern = rf'StormEvents_details-ftp_v1\.0_d{year}_c\d{{8}}\.csv\.gz'
    matches = re.findall(pattern, resp.text)
    if not matches:
        raise FileNotFoundError(f"No storm events detail file found for year {year}")
    # Take the most recent version (highest date suffix)
    fname = sorted(matches)[-1]
    return NOAA_BASE_URL + fname


def download_and_parse(year: int) -> pd.DataFrame:
    """Download and parse a single year's storm events CSV."""
    url = get_file_url(year)
    print(f"  Downloading {url} ...")
    resp = requests.get(url, timeout=120)
    resp.raise_for_status()
    with gzip.open(io.BytesIO(resp.content)) as gz:
        try:
            df = pd.read_csv(gz, low_memory=False, encoding="utf-8")
        except UnicodeDecodeError:
            gz.seek(0)
            df = pd.read_csv(gz, low_memory=False, encoding="latin-1")
    print(f"  Parsed {len(df):,} rows")
    return df


def parse_damage(val) -> float:
    """Convert NOAA damage format '25.00K', '1.50M', '2.50B' to numeric."""
    if pd.isna(val) or str(val).strip() == "":
        return 0.0
    s = str(val).strip().upper()
    multipliers = {"K": 1_000, "M": 1_000_000, "B": 1_000_000_000}
    if s and s[-1] in multipliers:
        try:
            return float(s[:-1]) * multipliers[s[-1]]
        except ValueError:
            return 0.0
    try:
        return float(s)
    except ValueError:
        return 0.0


def normalize_state(val) -> str | None:
    """Normalize state name to title case. 'ALABAMA' -> 'Alabama', 'NEW YORK' -> 'New York'."""
    if pd.isna(val):
        return None
    return str(val).strip().title()


def parse_dt(val) -> str | None:
    """Parse a date/time value to ISO format string."""
    if pd.isna(val) or str(val).strip() == "":
        return None
    try:
        return pd.to_datetime(str(val)).isoformat()
    except Exception:
        return None


def safe_int(val, default=None):
    """Safely convert to int, returning default on failure."""
    try:
        v = int(float(val))
        return v
    except (ValueError, TypeError):
        return default


def safe_float(val, default=None):
    """Safely convert to float, returning default on failure."""
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def build_records(df: pd.DataFrame) -> list[dict]:
    """Build storm event records from a DataFrame."""
    records = []
    df.columns = [c.strip().upper() for c in df.columns]

    for _, row in df.iterrows():
        event_id = safe_int(row.get("EVENT_ID"))
        if event_id is None:
            continue

        record = {
            "event_id": event_id,
            "state": normalize_state(row.get("STATE")),
            "state_fips": safe_int(row.get("STATE_FIPS")),
            "county_name": str(row["CZ_NAME"]).strip() if "CZ_NAME" in df.columns and not pd.isna(row.get("CZ_NAME")) else None,
            "county_fips": safe_int(row.get("CZ_FIPS")),
            "event_type": str(row["EVENT_TYPE"]).strip() if "EVENT_TYPE" in df.columns and not pd.isna(row.get("EVENT_TYPE")) else None,
            "begin_date_time": parse_dt(row.get("BEGIN_DATE_TIME")),
            "end_date_time": parse_dt(row.get("END_DATE_TIME")),
            "year": safe_int(row.get("YEAR")),
            "month_name": str(row["MONTH_NAME"]).strip() if "MONTH_NAME" in df.columns and not pd.isna(row.get("MONTH_NAME")) else None,
            "injuries_direct": safe_int(row.get("INJURIES_DIRECT"), 0),
            "injuries_indirect": safe_int(row.get("INJURIES_INDIRECT"), 0),
            "deaths_direct": safe_int(row.get("DEATHS_DIRECT"), 0),
            "deaths_indirect": safe_int(row.get("DEATHS_INDIRECT"), 0),
            "damage_property": parse_damage(row.get("DAMAGE_PROPERTY")),
            "damage_crops": parse_damage(row.get("DAMAGE_CROPS")),
            "source": str(row["SOURCE"]).strip() if "SOURCE" in df.columns and not pd.isna(row.get("SOURCE")) else None,
            "flood_cause": str(row["FLOOD_CAUSE"]).strip() if "FLOOD_CAUSE" in df.columns and not pd.isna(row.get("FLOOD_CAUSE")) else None,
            "tor_f_scale": str(row["TOR_F_SCALE"]).strip() if "TOR_F_SCALE" in df.columns and not pd.isna(row.get("TOR_F_SCALE")) else None,
            "begin_lat": safe_float(row.get("BEGIN_LAT")),
            "begin_lon": safe_float(row.get("BEGIN_LON")),
        }
        # Convert float NaN to None for JSON serialization
        record = {k: (None if isinstance(v, float) and v != v else v) for k, v in record.items()}
        records.append(record)

    return records


def main():
    parser = argparse.ArgumentParser(description="Load NOAA Storm Events data into Supabase")
    parser.add_argument("--year", type=int, help="Load only a specific year")
    parser.add_argument("--dry-run", action="store_true", help="Print summary without writing to database")
    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set", file=sys.stderr)
        sys.exit(1)

    years_to_load = [args.year] if args.year else YEARS

    all_records: list[dict] = []
    for year in years_to_load:
        print(f"\nProcessing year {year}...")
        try:
            df = download_and_parse(year)
            records = build_records(df)
            print(f"  Built {len(records):,} records for {year}")
            all_records.extend(records)
        except Exception as e:
            print(f"  ERROR processing year {year}: {e}", file=sys.stderr)

    if not all_records:
        print("No records to upsert.")
        return

    # Summary
    year_counts = Counter(r["year"] for r in all_records)
    state_counts = Counter(r["state"] for r in all_records if r["state"])
    print(f"\nTotal records to upsert: {len(all_records):,}")
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
    for i in range(0, len(all_records), batch_size):
        batch = all_records[i : i + batch_size]
        try:
            supabase.table("storm_events").upsert(
                batch,
                on_conflict="event_id",
            ).execute()
            inserted += len(batch)
            print(f"  Upserted batch {i // batch_size + 1}: {inserted:,} records so far")
        except Exception as e:
            print(f"  ERROR in batch {i // batch_size + 1}: {e}", file=sys.stderr)
            errors += len(batch)

    print(f"\nDone. {inserted:,} records upserted, {errors:,} errors.")


if __name__ == "__main__":
    main()
