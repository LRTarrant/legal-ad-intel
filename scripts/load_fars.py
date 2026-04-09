#!/usr/bin/env python3
"""FARS ETL - Downloads bulk CSV files from NHTSA and loads into Supabase."""

import os
import io
import zipfile
import requests
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

BASE_URL = "https://static.nhtsa.gov/nhtsa/downloads/FARS/{year}/National/FARS{year}NationalCSV.zip"

# FARS state FIPS codes to state abbreviations
STATE_FIPS = {
    1: "AL", 2: "AK", 4: "AZ", 5: "AR", 6: "CA", 8: "CO", 9: "CT", 10: "DE",
    11: "DC", 12: "FL", 13: "GA", 15: "HI", 16: "ID", 17: "IL", 18: "IN",
    19: "IA", 20: "KS", 21: "KY", 22: "LA", 23: "ME", 24: "MD", 25: "MA",
    26: "MI", 27: "MN", 28: "MS", 29: "MO", 30: "MT", 31: "NE", 32: "NV",
    33: "NH", 34: "NJ", 35: "NM", 36: "NY", 37: "NC", 38: "ND", 39: "OH",
    40: "OK", 41: "OR", 42: "PA", 43: "PR", 44: "RI", 45: "SC", 46: "SD",
    47: "TN", 48: "TX", 49: "UT", 50: "VT", 51: "VA", 52: "VI", 53: "WA",
    54: "WV", 55: "WI", 56: "WY"
}


def download_and_extract_accident(year: int) -> pd.DataFrame:
    """Download FARS zip for a year and extract the Accident CSV."""
    url = BASE_URL.format(year=year)
    print(f"Downloading {url}...")
    resp = requests.get(url, timeout=120)
    resp.raise_for_status()

    with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
        # Find the accident file (case-insensitive)
        accident_file = None
        for name in zf.namelist():
            if "accident" in name.lower() and name.lower().endswith(".csv"):
                accident_file = name
                break

        if not accident_file:
            raise FileNotFoundError(f"No Accident CSV found in {url}")

        print(f"  Extracting {accident_file}...")
        with zf.open(accident_file) as f:
            try:
                df = pd.read_csv(f, encoding="utf-8-sig", low_memory=False)
            except UnicodeDecodeError:
                # Older NHTSA files (2019-2020) use latin-1 encoding
                f.seek(0)
                df = pd.read_csv(f, low_memory=False, encoding="latin-1")

    return df


def transform_accident_data(df: pd.DataFrame, year: int) -> list[dict]:
    """Transform raw Accident CSV into records for Supabase."""
    records = []
    for _, row in df.iterrows():
        state_fips = int(row.get("STATE", row.get("State", 0)))
        state_abbr = STATE_FIPS.get(state_fips, "XX")

        # Build crash date
        month = int(row.get("MONTH", row.get("Month", 1)))
        day = int(row.get("DAY", row.get("Day", 1)))
        # Clamp invalid days
        if day < 1 or day > 31:
            day = 1
        if month < 1 or month > 12:
            month = 1

        try:
            crash_date = f"{year}-{month:02d}-{day:02d}"
        except Exception:
            crash_date = f"{year}-01-01"

        # Get fatality count
        fatals = int(row.get("FATALS", row.get("Fatals", 0)))

        # Get county
        county_fips = int(row.get("COUNTY", row.get("County", 0)))
        county_name = row.get("COUNTYNAME", row.get("CountyName", None))
        if pd.isna(county_name):
            county_name = None
        elif county_name is not None:
            county_name = str(county_name).strip() or None

        # Get lat/lon if available
        latitude = row.get("LATITUDE", row.get("Latitude", None))
        longitude = row.get("LONGITUD", row.get("Longitude", None))

        # Clean lat/lon (FARS uses 77.7777/88.8888/99.9999 for unknown)
        try:
            latitude = float(latitude)
            if latitude > 89 or latitude < -89 or latitude in (77.7777, 88.8888, 99.9999):
                latitude = None
        except (ValueError, TypeError):
            latitude = None

        try:
            longitude = float(longitude)
            if longitude in (777.7777, 888.8888, 999.9999):
                longitude = None
        except (ValueError, TypeError):
            longitude = None

        # Rural/Urban classification (1=Rural, 2=Urban, 9=Unknown)
        try:
            rur_urb = int(row.get("RUR_URB", row.get("Rur_Urb", 9)))
        except (ValueError, TypeError):
            rur_urb = 9

        # Drunk driving flag
        drunk_dr = int(row.get("DRUNK_DR", row.get("Drunk_Dr", 0)))

        # Case number
        st_case = int(row.get("ST_CASE", row.get("St_Case", 0)))

        records.append({
            "st_case": st_case,
            "state": state_abbr,
            "state_fips": state_fips,
            "county_fips": county_fips,
            "county_name": county_name,
            "crash_date": crash_date,
            "fatalities": fatals,
            "drunk_drivers": drunk_dr,
            "latitude": latitude,
            "longitude": longitude,
            "year": year,
            "persons": int(row.get("PERSONS", row.get("Persons", 0))),
            "vehicles": int(row.get("VE_TOTAL", row.get("Ve_Total", 0))),
            "rur_urb": rur_urb,
        })

    return records


def upsert_to_supabase(records: list[dict], batch_size: int = 500):
    """Upsert records into the fars_fatalities table."""
    total = len(records)
    for i in range(0, total, batch_size):
        batch = records[i : i + batch_size]
        print(f"  Upserting batch {i // batch_size + 1} ({len(batch)} records)...")
        supabase.table("fars_fatalities").upsert(
            batch, on_conflict="st_case,year"
        ).execute()
    print(f"  Done: {total} records upserted.")


def run_etl(years: list[int] = None):
    """Run the full ETL pipeline."""
    if years is None:
        years = list(range(2019, 2024))  # Default: last 5 years

    for year in years:
        try:
            print(f"\n{'='*50}")
            print(f"Processing FARS {year}")
            print(f"{'='*50}")
            df = download_and_extract_accident(year)
            print(f"  Raw records: {len(df)}")
            records = transform_accident_data(df, year)
            print(f"  Transformed records: {len(records)}")
            upsert_to_supabase(records)
        except Exception as e:
            print(f"  ERROR for {year}: {e}")
            continue


if __name__ == "__main__":
    run_etl()
