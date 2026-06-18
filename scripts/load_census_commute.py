#!/usr/bin/env python3
"""Backfill county-level mean commute time into census_demographics.

Pulls ACS 5-year Data Profile variable DP03_0025E ("Mean travel time to work
(minutes)") for every U.S. county and writes it to
census_demographics.mean_commute_minutes, matched on (fips_full, acs_vintage).

The table already holds one row per county per ACS vintage; this loader only
updates the single commute column and never touches the other (NOT NULL)
columns. Re-run when a new ACS 5-year vintage is released (roughly annual).

Usage:
    python scripts/load_census_commute.py --dry-run            # fetch + report, no writes
    python scripts/load_census_commute.py --dry-run --limit 5  # show a small sample
    python scripts/load_census_commute.py                      # live update (vintage 2024)
    python scripts/load_census_commute.py --year 2023          # match a different vintage

Env:
    SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
    SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY)
    CENSUS_API_KEY   REQUIRED. The Census data API rejects keyless requests to
                     this endpoint (302 -> "Missing Key"). Get a free key,
                     emailed instantly, at:
                     https://api.census.gov/data/key_signup.html
"""

import argparse
import os
import sys
from urllib.parse import urlencode

import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv("web/.env.local", override=False)

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_KEY")
    or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
)
CENSUS_API_KEY = os.environ.get("CENSUS_API_KEY")

# "Mean travel time to work (minutes)" from the ACS 5-year Data Profile.
COMMUTE_VARIABLE = "DP03_0025E"

DEFAULT_YEAR = 2024


def build_url(year: int) -> str:
    params = {"get": f"{COMMUTE_VARIABLE},NAME", "for": "county:*"}
    if CENSUS_API_KEY:
        params["key"] = CENSUS_API_KEY
    return f"https://api.census.gov/data/{year}/acs/acs5/profile?{urlencode(params)}"


def safe_float(value) -> float | None:
    # Census uses negative sentinels (e.g. -666666666) for suppressed values.
    try:
        num = float(value)
    except (TypeError, ValueError):
        return None
    if num < 0:
        return None
    return num


def fetch_commute(year: int) -> list[dict]:
    """Return [{fips_full, commute_minutes}] for every county in the vintage."""
    if not CENSUS_API_KEY:
        print(
            "ERROR: CENSUS_API_KEY is required. The Census data API rejects "
            "keyless requests to this endpoint.\nGet a free key (emailed "
            "instantly): https://api.census.gov/data/key_signup.html\n"
            "Then set it in web/.env.local or your shell as CENSUS_API_KEY=...",
            file=sys.stderr,
        )
        sys.exit(1)
    url = build_url(year)
    print(f"Fetching ACS {year} {COMMUTE_VARIABLE} for all counties...")
    resp = requests.get(url, timeout=120)
    resp.raise_for_status()
    # A keyless or otherwise rejected request 302s to an HTML error page, so the
    # body parses as HTML, not JSON. Surface that clearly instead of a raw trace.
    ctype = resp.headers.get("content-type", "")
    if "json" not in ctype.lower():
        snippet = resp.text.strip().splitlines()[:2]
        raise SystemExit(
            f"Census API returned non-JSON ({ctype or 'unknown'}). "
            f"First lines: {' '.join(snippet)[:200]}"
        )
    rows = resp.json()
    header, data = rows[0], rows[1:]
    val_idx = header.index(COMMUTE_VARIABLE)
    state_idx = header.index("state")
    county_idx = header.index("county")

    records = []
    for row in data:
        fips_full = f"{row[state_idx].zfill(2)}{row[county_idx].zfill(3)}"
        minutes = safe_float(row[val_idx])
        records.append({"fips_full": fips_full, "commute_minutes": minutes})
    return records


def main():
    parser = argparse.ArgumentParser(description="Backfill county mean commute time into census_demographics")
    parser.add_argument("--year", type=int, default=DEFAULT_YEAR, help=f"ACS 5-year vintage to match acs_vintage (default {DEFAULT_YEAR})")
    parser.add_argument("--dry-run", action="store_true", help="Fetch and summarize without writing")
    parser.add_argument("--limit", type=int, default=0, help="Only process the first N counties (debugging)")
    args = parser.parse_args()

    records = fetch_commute(args.year)
    if args.limit:
        records = records[: args.limit]

    with_value = [r for r in records if r["commute_minutes"] is not None]
    values = [r["commute_minutes"] for r in with_value]
    print(f"\nCounties fetched: {len(records):,}")
    print(f"  with a commute value: {len(with_value):,}")
    print(f"  suppressed/missing:   {len(records) - len(with_value):,}")
    if values:
        print(f"  min / mean / max minutes: {min(values):.1f} / {sum(values)/len(values):.1f} / {max(values):.1f}")
    print("\nSample:")
    for r in records[:5]:
        print(f"  {r['fips_full']}: {r['commute_minutes']}")

    if args.dry_run:
        print("\n[DRY RUN] No changes written to database.")
        return

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY (or SERVICE_ROLE_KEY) must be set", file=sys.stderr)
        sys.exit(1)

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    updated = matched = 0
    for r in records:
        # Update only mean_commute_minutes; leave the NOT NULL columns untouched.
        result = (
            supabase.table("census_demographics")
            .update({"mean_commute_minutes": r["commute_minutes"]})
            .eq("fips_full", r["fips_full"])
            .eq("acs_vintage", args.year)
            .execute()
        )
        rows = result.data or []
        matched += len(rows)
        updated += 1
        if updated % 500 == 0:
            print(f"  Processed {updated:,}/{len(records):,} counties ({matched:,} rows matched)")

    print(f"\nDone. Counties processed: {updated:,}; rows matched in vintage {args.year}: {matched:,}")
    if matched < len(records) - 10:
        print(
            f"WARNING: only {matched:,} rows matched. Check that census_demographics "
            f"has acs_vintage={args.year} rows and that fips_full is 5-digit.",
            file=sys.stderr,
        )


if __name__ == "__main__":
    main()
