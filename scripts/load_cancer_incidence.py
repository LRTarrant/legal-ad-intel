#!/usr/bin/env python3
"""Load NCI State Cancer Profiles county incidence data into Supabase.

Usage:
    python scripts/load_cancer_incidence.py --dry-run
    python scripts/load_cancer_incidence.py

The loader intentionally supports dry-run mode and is not invoked by the app.
"""

import argparse
import os
import sys
import time
from collections import Counter
from urllib.parse import urlencode

import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv("web/.env.local", override=False)

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

BASE_URL = "https://statecancerprofiles.cancer.gov/incidencerates/index.php"

CANCER_TYPES = [
    ("001", "All Cancer Sites", "Baseline"),
    ("047", "Lung & Bronchus", "Asbestos, Camp Lejeune, smoking"),
    ("071", "Non-Hodgkin Lymphoma", "Roundup/Monsanto (MDL 2741)"),
    ("086", "Kidney & Renal Pelvis", "Camp Lejeune, AFFF/PFAS"),
    ("003", "Bladder", "Camp Lejeune, AFFF/PFAS"),
    ("035", "Liver & Bile Duct", "Camp Lejeune, AFFF/PFAS"),
    ("053", "Ovary", "Talc/Johnson & Johnson"),
    ("061", "Pancreas", "Roundup exposure"),
    ("020", "Colon & Rectum", "Environmental contamination"),
    ("055", "Prostate", "Agent Orange, AFFF"),
    ("010", "Breast (Female)", "Environmental, AFFF"),
]

STATE_FIPS = {
    "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
    "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
    "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN",
    "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
    "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
    "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
    "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
    "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
    "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
    "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
    "56": "WY",
}

STATE_NAME_TO_ABBR = {
    "ALABAMA": "AL", "ALASKA": "AK", "ARIZONA": "AZ", "ARKANSAS": "AR",
    "CALIFORNIA": "CA", "COLORADO": "CO", "CONNECTICUT": "CT", "DELAWARE": "DE",
    "DISTRICT OF COLUMBIA": "DC", "FLORIDA": "FL", "GEORGIA": "GA", "HAWAII": "HI",
    "IDAHO": "ID", "ILLINOIS": "IL", "INDIANA": "IN", "IOWA": "IA", "KANSAS": "KS",
    "KENTUCKY": "KY", "LOUISIANA": "LA", "MAINE": "ME", "MARYLAND": "MD",
    "MASSACHUSETTS": "MA", "MICHIGAN": "MI", "MINNESOTA": "MN", "MISSISSIPPI": "MS",
    "MISSOURI": "MO", "MONTANA": "MT", "NEBRASKA": "NE", "NEVADA": "NV",
    "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ", "NEW MEXICO": "NM", "NEW YORK": "NY",
    "NORTH CAROLINA": "NC", "NORTH DAKOTA": "ND", "OHIO": "OH", "OKLAHOMA": "OK",
    "OREGON": "OR", "PENNSYLVANIA": "PA", "RHODE ISLAND": "RI", "SOUTH CAROLINA": "SC",
    "SOUTH DAKOTA": "SD", "TENNESSEE": "TN", "TEXAS": "TX", "UTAH": "UT",
    "VERMONT": "VT", "VIRGINIA": "VA", "WASHINGTON": "WA", "WEST VIRGINIA": "WV",
    "WISCONSIN": "WI", "WYOMING": "WY",
}


def build_url(state_fips: str, cancer_code: str) -> str:
    params = {
        "stateFIPS": state_fips,
        "areatype": "county",
        "cancer": cancer_code,
        "race": "00",
        "sex": "0",
        "age": "001",
        "type": "incd",
        "sortVariableName": "rate",
        "sortOrder": "desc",
        "output": "1",
    }
    return f"{BASE_URL}?{urlencode(params)}"


def safe_float(value):
    if pd.isna(value):
        return None
    try:
        cleaned = str(value).replace(",", "").strip()
        if cleaned in {"", "*", "N/A"}:
            return None
        return float(cleaned)
    except (TypeError, ValueError):
        return None


def rural_urban_bucket(value) -> str | None:
    code = safe_float(value)
    if code is None:
        return None
    code_int = int(code)
    if 1 <= code_int <= 3:
        return "Urban"
    if 4 <= code_int <= 6:
        return "Suburban"
    if 7 <= code_int <= 9:
        return "Rural"
    return None


def trend_direction(value) -> str:
    trend = safe_float(value)
    if trend is None or trend == 0:
        return "Stable"
    return "Rising" if trend > 0 else "Falling"


def find_column(columns: list[str], *needles: str) -> str | None:
    for column in columns:
        normalized = column.strip().lower()
        if all(needle.lower() in normalized for needle in needles):
            return column
    return None


def read_cancer_csv(url: str) -> pd.DataFrame:
    return pd.read_csv(
        url,
        skiprows=8,
        na_values=["*", "N/A", " N/A", "N/A "],
        skipinitialspace=True,
        dtype={"FIPS": str},
    )


def fetch_with_fallback(cancer_code: str, cancer_site: str) -> list[tuple[str, pd.DataFrame]]:
    national_url = build_url("00", cancer_code)
    try:
        print(f"Fetching national {cancer_site} export...")
        national = read_cancer_csv(national_url)
        if len(national) >= 1000:
            time.sleep(1)
            return [(national_url, national)]
        print(f"  National export returned only {len(national):,} rows; falling back to states.")
    except Exception as exc:
        print(f"  National export failed ({exc}); falling back to states.")

    frames = []
    for state_fips in STATE_FIPS:
        url = build_url(state_fips, cancer_code)
        try:
            print(f"  Fetching stateFIPS={state_fips}...")
            frames.append((url, read_cancer_csv(url)))
        except Exception as exc:
            print(f"    Failed stateFIPS={state_fips}: {exc}", file=sys.stderr)
        time.sleep(1)
    return frames


def build_records(frames: list[tuple[str, pd.DataFrame]], cancer_site: str) -> list[dict]:
    records = []
    for source_url, df in frames:
        df.columns = [str(column).strip() for column in df.columns]
        columns = list(df.columns)

        county_col = find_column(columns, "county") or "County"
        fips_col = find_column(columns, "fips") or "FIPS"
        rural_col = find_column(columns, "rural-urban") or find_column(columns, "continuum")
        rate_col = find_column(columns, "age-adjusted", "incidence", "rate")
        lower_col = find_column(columns, "lower 95", "confidence interval")
        upper_col = find_column(columns, "upper 95", "confidence interval")
        count_col = find_column(columns, "average annual count")
        trend_col = find_column(columns, "recent 5-year trend")
        trend_lower_col = find_column(columns, "lower 95", "trend")
        trend_upper_col = find_column(columns, "upper 95", "trend")

        for _, row in df.iterrows():
            fips = str(row.get(fips_col, "")).strip()
            rate = safe_float(row.get(rate_col)) if rate_col else None
            if not fips or fips.lower() == "nan" or rate is None:
                continue

            county_value = str(row.get(county_col, "")).strip()
            if "," in county_value:
                county_name, state_name = [part.strip() for part in county_value.rsplit(",", 1)]
            else:
                county_name, state_name = county_value, ""
            state = STATE_NAME_TO_ABBR.get(state_name.upper(), state_name.upper())
            if len(state) != 2:
                state = STATE_FIPS.get(fips[:2], state)

            trend_value = safe_float(row.get(trend_col)) if trend_col else None
            record = {
                "fips": fips.zfill(5),
                "county_name": county_name,
                "state": state,
                "cancer_site": cancer_site,
                "rural_urban": rural_urban_bucket(row.get(rural_col)) if rural_col else None,
                "incidence_rate": rate,
                "lower_ci": safe_float(row.get(lower_col)) if lower_col else None,
                "upper_ci": safe_float(row.get(upper_col)) if upper_col else None,
                "average_annual_count": safe_float(row.get(count_col)) if count_col else None,
                "recent_trend": trend_value,
                "trend_lower_ci": safe_float(row.get(trend_lower_col)) if trend_lower_col else None,
                "trend_upper_ci": safe_float(row.get(trend_upper_col)) if trend_upper_col else None,
                "trend_direction": trend_direction(trend_value),
                "source_url": source_url,
            }
            records.append(record)
    return records


def main():
    parser = argparse.ArgumentParser(description="Load NCI county cancer incidence data")
    parser.add_argument("--dry-run", action="store_true", help="Parse and summarize without writing to Supabase")
    args = parser.parse_args()

    all_records = []
    per_site_counts = Counter()
    for cancer_code, cancer_site, _connection in CANCER_TYPES:
        frames = fetch_with_fallback(cancer_code, cancer_site)
        records = build_records(frames, cancer_site)
        per_site_counts[cancer_site] = len(records)
        all_records.extend(records)
        print(f"{cancer_site}: {len(records):,} county rows parsed")

    print("\nRows per cancer site:")
    for site, count in per_site_counts.items():
        print(f"  {site}: {count:,}")
    print(f"Total rows parsed: {len(all_records):,}")

    if args.dry_run:
        print("\n[DRY RUN] No changes written to database.")
        return

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set", file=sys.stderr)
        sys.exit(1)

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    batch_size = 500
    upserted = 0
    for i in range(0, len(all_records), batch_size):
        batch = all_records[i : i + batch_size]
        supabase.table("cancer_incidence").upsert(
            batch,
            on_conflict="fips,cancer_site",
        ).execute()
        upserted += len(batch)
        print(f"  Upserted {upserted:,}/{len(all_records):,} rows")

    print(f"\nDone. Total upserted: {upserted:,}")


if __name__ == "__main__":
    main()
