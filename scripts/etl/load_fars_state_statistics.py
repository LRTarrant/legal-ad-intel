#!/usr/bin/env python3
"""
Compute state-level crash fatality statistics from NHTSA FARS and upsert
into the state_crash_statistics table in Supabase.

Two modes:

  DEFAULT — download FARS CSVs from NHTSA:
    Computes all fields including motorcycle, pedestrian, unrestrained, and
    speeding fatalities from ACCIDENT + PERSON + VEHICLE CSVs.

  --from-db — aggregate from existing fars_fatalities table:
    Uses crash-level rows already in Supabase to compute total/rural/urban/
    alcohol fatalities without any download. Person-level fields (motorcycle,
    pedestrian, unrestrained, speeding) are set to NULL and require a full
    NHTSA download to fill. Use this fallback when NHTSA download is blocked.

Stats computed per state per year:

  total_fatalities                - all persons fatally injured
  rural_fatalities                - fatalities in rural crashes (RUR_URB=1)
  urban_fatalities                - fatalities in urban crashes (RUR_URB=2)
  alcohol_related_fatalities      - fatalities in crashes with ≥1 drunk driver
  motorcycle_fatalities           - fatally injured motorcycle occupants       [NHTSA only]
  pedestrian_fatalities           - fatally injured pedestrians (PER_TYP=5)   [NHTSA only]
  unrestrained_occupant_fatalities- driver/passenger, REST_USE=0              [NHTSA only]
  speeding_related_fatalities     - fatalities in speed-related crashes        [NHTSA only]

Source: https://static.nhtsa.gov/nhtsa/downloads/FARS/{year}/National/

Usage:
    python scripts/etl/load_fars_state_statistics.py
    python scripts/etl/load_fars_state_statistics.py --year 2023
    python scripts/etl/load_fars_state_statistics.py --dry-run
    python scripts/etl/load_fars_state_statistics.py --year 2023 --output-csv out.csv
    python scripts/etl/load_fars_state_statistics.py --from-db              # all years in DB
    python scripts/etl/load_fars_state_statistics.py --from-db --year 2024

Environment variables:
    SUPABASE_URL               Supabase project URL
    SUPABASE_SERVICE_ROLE_KEY  Service role key (read from .env or web/.env.local)
"""

import argparse
import datetime
import io
import os
import sys
import zipfile
from pathlib import Path

import pandas as pd
import requests
from dotenv import load_dotenv

# Load .env at repo root, then web/.env.local as fallback
_REPO_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(_REPO_ROOT / ".env")
load_dotenv(_REPO_ROOT / "web" / ".env.local", override=False)

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

NHTSA_URL = (
    "https://static.nhtsa.gov/nhtsa/downloads/FARS"
    "/{year}/National/FARS{year}NationalCSV.zip"
)

# FARS state FIPS → USPS 2-letter codes (includes territories)
STATE_FIPS: dict[int, str] = {
    1: "AL", 2: "AK", 4: "AZ", 5: "AR", 6: "CA", 8: "CO", 9: "CT", 10: "DE",
    11: "DC", 12: "FL", 13: "GA", 15: "HI", 16: "ID", 17: "IL", 18: "IN",
    19: "IA", 20: "KS", 21: "KY", 22: "LA", 23: "ME", 24: "MD", 25: "MA",
    26: "MI", 27: "MN", 28: "MS", 29: "MO", 30: "MT", 31: "NE", 32: "NV",
    33: "NH", 34: "NJ", 35: "NM", 36: "NY", 37: "NC", 38: "ND", 39: "OH",
    40: "OK", 41: "OR", 42: "PA", 43: "PR", 44: "RI", 45: "SC", 46: "SD",
    47: "TN", 48: "TX", 49: "UT", 50: "VT", 51: "VA", 52: "VI", 53: "WA",
    54: "WV", 55: "WI", 56: "WY",
}

# FARS coding constants
INJ_FATAL = 4           # INJ_SEV = 4: fatal injury
PER_TYP_DRIVER = 1
PER_TYP_PASSENGER = 2
PER_TYP_PEDESTRIAN = 5
REST_USE_NONE = 0       # No restraint used
SPEEDREL_YES = 1        # Vehicle was speed-related
# Body type codes 80–89 = motorcycle / moped / scooter
MOTORCYCLE_BODY_TYPES = frozenset(range(80, 90))


# ---------------------------------------------------------------------------
# Download helpers
# ---------------------------------------------------------------------------

def _read_csv_from_zip(zf: zipfile.ZipFile, keyword: str) -> pd.DataFrame:
    """Extract and read the first CSV matching keyword (case-insensitive)."""
    matches = [n for n in zf.namelist() if keyword in n.lower() and n.lower().endswith(".csv")]
    if not matches:
        raise FileNotFoundError(
            f"No CSV matching '{keyword}' in ZIP. Files present: {zf.namelist()}"
        )
    fname = matches[0]
    print(f"      {fname}")
    with zf.open(fname) as f:
        try:
            df = pd.read_csv(f, low_memory=False, encoding="utf-8-sig")
        except UnicodeDecodeError:
            f.seek(0)
            df = pd.read_csv(f, low_memory=False, encoding="latin-1")
    # Normalize all column names to uppercase so field lookups are year-agnostic
    df.columns = [c.upper() for c in df.columns]
    return df


def download_year(year: int) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Download FARS national ZIP for year; return (accident_df, person_df, vehicle_df)."""
    url = NHTSA_URL.format(year=year)
    print(f"  Downloading {url} ...")
    resp = requests.get(url, timeout=180)
    resp.raise_for_status()
    mb = len(resp.content) / 1_048_576
    print(f"  Downloaded {mb:.1f} MB — extracting:")

    with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
        accident = _read_csv_from_zip(zf, "accident")
        person   = _read_csv_from_zip(zf, "person")
        vehicle  = _read_csv_from_zip(zf, "vehicle")

    print(
        f"  Records: {len(accident):,} accidents / "
        f"{len(person):,} persons / {len(vehicle):,} vehicles"
    )
    return accident, person, vehicle


# ---------------------------------------------------------------------------
# Aggregation
# ---------------------------------------------------------------------------

def _int_col(df: pd.DataFrame, col: str, default: int = 0) -> pd.Series:
    """Return numeric series for col, filling missing/NaN with default."""
    if col in df.columns:
        return pd.to_numeric(df[col], errors="coerce").fillna(default).astype(int)
    return pd.Series(default, index=df.index, dtype=int)


def compute_state_stats(
    accident: pd.DataFrame,
    person: pd.DataFrame,
    vehicle: pd.DataFrame,
    year: int,
) -> pd.DataFrame:
    """Return one row per state with all fatality aggregates."""

    # ── ACCIDENT-level ──────────────────────────────────────────────────────
    accident = accident.copy()
    accident["STATE"]    = _int_col(accident, "STATE")
    accident["ST_CASE"]  = _int_col(accident, "ST_CASE")
    accident["FATALS"]   = _int_col(accident, "FATALS")
    accident["RUR_URB"]  = _int_col(accident, "RUR_URB", default=9)   # 9 = unknown
    accident["DRUNK_DR"] = _int_col(accident, "DRUNK_DR", default=0)

    acc = accident[["STATE", "ST_CASE", "FATALS", "RUR_URB", "DRUNK_DR"]]

    total   = acc.groupby("STATE")["FATALS"].sum().rename("total_fatalities")
    rural   = acc[acc["RUR_URB"] == 1].groupby("STATE")["FATALS"].sum().rename("rural_fatalities")
    urban   = acc[acc["RUR_URB"] == 2].groupby("STATE")["FATALS"].sum().rename("urban_fatalities")
    alcohol = acc[acc["DRUNK_DR"] > 0].groupby("STATE")["FATALS"].sum().rename("alcohol_related_fatalities")

    # ── VEHICLE-level ────────────────────────────────────────────────────────
    vehicle = vehicle.copy()
    vehicle["ST_CASE"]  = _int_col(vehicle, "ST_CASE")
    vehicle["VEH_NO"]   = _int_col(vehicle, "VEH_NO")
    vehicle["SPEEDREL"] = _int_col(vehicle, "SPEEDREL", default=0)
    vehicle["BODY_TYP"] = _int_col(vehicle, "BODY_TYP", default=-1)

    # Set of ST_CASEs with at least one speeding-related vehicle
    speed_cases: frozenset[int] = frozenset(
        vehicle.loc[vehicle["SPEEDREL"] == SPEEDREL_YES, "ST_CASE"].unique()
    )

    # Motorcycle vehicle keys (ST_CASE, VEH_NO) for precise occupant join
    moto_veh = vehicle.loc[
        vehicle["BODY_TYP"].isin(MOTORCYCLE_BODY_TYPES), ["ST_CASE", "VEH_NO"]
    ].drop_duplicates()

    # ── PERSON-level ─────────────────────────────────────────────────────────
    person = person.copy()
    person["STATE"]    = _int_col(person, "STATE")
    person["ST_CASE"]  = _int_col(person, "ST_CASE")
    person["VEH_NO"]   = _int_col(person, "VEH_NO", default=0)
    person["PER_NO"]   = _int_col(person, "PER_NO", default=0)
    person["INJ_SEV"]  = _int_col(person, "INJ_SEV", default=0)
    person["PER_TYP"]  = _int_col(person, "PER_TYP", default=0)
    person["REST_USE"] = _int_col(person, "REST_USE", default=99)

    fatals = person[person["INJ_SEV"] == INJ_FATAL].copy()

    # Pedestrian fatalities (PER_TYP = 5)
    pedestrian = (
        fatals[fatals["PER_TYP"] == PER_TYP_PEDESTRIAN]
        .groupby("STATE").size().rename("pedestrian_fatalities")
    )

    # Unrestrained occupant fatalities (driver or passenger, REST_USE = 0)
    occupants = fatals[fatals["PER_TYP"].isin([PER_TYP_DRIVER, PER_TYP_PASSENGER])]
    unrestrained = (
        occupants[occupants["REST_USE"] == REST_USE_NONE]
        .groupby("STATE").size().rename("unrestrained_occupant_fatalities")
    )

    # Speeding-related fatalities (any fatally injured person in a speed-related crash)
    speeding = (
        fatals[fatals["ST_CASE"].isin(speed_cases)]
        .groupby("STATE").size().rename("speeding_related_fatalities")
    )

    # Motorcycle fatalities — join fatal persons to motorcycle vehicles on (ST_CASE, VEH_NO)
    # This gives only persons actually riding motorcycles, not other crash participants.
    moto_occ = (
        fatals[fatals["PER_TYP"].isin([PER_TYP_DRIVER, PER_TYP_PASSENGER])]
        .merge(moto_veh, on=["ST_CASE", "VEH_NO"], how="inner")
    )
    motorcycle = moto_occ.groupby("STATE").size().rename("motorcycle_fatalities")

    # ── Combine ──────────────────────────────────────────────────────────────
    result = pd.DataFrame({"total_fatalities": total})
    for series in [rural, urban, alcohol, pedestrian, unrestrained, speeding, motorcycle]:
        result = result.join(series, how="left")

    result = result.fillna(0).astype(int).reset_index()
    result.rename(columns={"STATE": "state_fips"}, inplace=True)
    result["state_code"]  = result["state_fips"].map(STATE_FIPS)
    result["year"]        = year
    result["data_source"] = "FARS"

    # Drop rows with unmapped FIPS (0, territories not in our map → NaN)
    result = result.dropna(subset=["state_code"])

    ordered_cols = [
        "state_code", "year",
        "total_fatalities", "rural_fatalities", "urban_fatalities",
        "alcohol_related_fatalities", "unrestrained_occupant_fatalities",
        "speeding_related_fatalities", "motorcycle_fatalities",
        "pedestrian_fatalities", "data_source",
    ]
    return result[ordered_cols].sort_values("total_fatalities", ascending=False)


# ---------------------------------------------------------------------------
# Supabase upsert
# ---------------------------------------------------------------------------

def upsert_to_supabase(supabase, records: list[dict]) -> None:
    batch_size = 100
    for i in range(0, len(records), batch_size):
        batch = records[i : i + batch_size]
        supabase.table("state_crash_statistics").upsert(
            batch, on_conflict="state_code,year"
        ).execute()
    print(f"  Upserted {len(records)} state records.")


# ---------------------------------------------------------------------------
# DB-aggregation fallback (no NHTSA download required)
# ---------------------------------------------------------------------------

def aggregate_from_db(supabase, year: int | None) -> pd.DataFrame:
    """
    Aggregate state statistics from the existing fars_fatalities table in
    Supabase.  Produces total/rural/urban/alcohol fatalities per state per year.
    Person-level fields (motorcycle, pedestrian, unrestrained, speeding) are
    NULL — they require PERSON.CSV which is not stored in the DB.
    """
    # Supabase SDK doesn't support raw GROUP BY, so fetch via RPC or raw SQL.
    # We do a simple paginated fetch and aggregate locally.
    year_filter = year  # may be None (all years)

    print("  Fetching fars_fatalities from Supabase (paginated)...")
    all_rows: list[dict] = []
    page_size = 10_000
    offset = 0
    while True:
        q = supabase.table("fars_fatalities").select(
            "state, year, fatalities, rur_urb, drunk_drivers"
        )
        if year_filter is not None:
            q = q.eq("year", year_filter)
        result = q.range(offset, offset + page_size - 1).execute()
        rows = result.data
        if not rows:
            break
        all_rows.extend(rows)
        print(f"    fetched {len(all_rows):,} rows so far...")
        if len(rows) < page_size:
            break
        offset += page_size

    if not all_rows:
        raise RuntimeError("No rows returned from fars_fatalities — table may be empty.")

    df = pd.DataFrame(all_rows)
    df = df[df["state"].notna() & (df["state"] != "XX")].copy()
    df["fatalities"]    = pd.to_numeric(df["fatalities"],    errors="coerce").fillna(0).astype(int)
    df["rur_urb"]       = pd.to_numeric(df["rur_urb"],       errors="coerce").fillna(9).astype(int)
    df["drunk_drivers"] = pd.to_numeric(df["drunk_drivers"], errors="coerce").fillna(0).astype(int)

    grp = df.groupby(["state", "year"])
    result = pd.DataFrame({
        "total_fatalities":           grp["fatalities"].sum(),
        "rural_fatalities":           df[df["rur_urb"] == 1].groupby(["state", "year"])["fatalities"].sum(),
        "urban_fatalities":           df[df["rur_urb"] == 2].groupby(["state", "year"])["fatalities"].sum(),
        "alcohol_related_fatalities": df[df["drunk_drivers"] > 0].groupby(["state", "year"])["fatalities"].sum(),
    }).fillna(0).astype(int).reset_index()
    result.rename(columns={"state": "state_code"}, inplace=True)

    # Person-level fields not computable from this table
    for col in ("motorcycle_fatalities", "pedestrian_fatalities",
                "unrestrained_occupant_fatalities", "speeding_related_fatalities"):
        result[col] = None

    result["data_source"] = "FARS"
    return result.sort_values(["year", "total_fatalities"], ascending=[True, False])


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _print_summary(stats: pd.DataFrame) -> None:
    header = f"{'State':<7} {'Total':>7} {'Rural':>7} {'Urban':>7} {'Alcohol':>8} {'Speed':>7} {'Moto':>6} {'Ped':>6}"
    print(f"\n{header}")
    print("-" * len(header))
    for _, row in stats.head(15).iterrows():
        print(
            f"{row['state_code']:<7}"
            f"{row['total_fatalities']:>7,}"
            f"{row['rural_fatalities']:>7,}"
            f"{row['urban_fatalities']:>7,}"
            f"{row['alcohol_related_fatalities']:>8,}"
            f"{row['speeding_related_fatalities']:>7,}"
            f"{row['motorcycle_fatalities']:>6,}"
            f"{row['pedestrian_fatalities']:>6,}"
        )
    print(f"\nTotal states/territories: {len(stats)}")
    zero_states = stats[stats["total_fatalities"] == 0]["state_code"].tolist()
    if zero_states:
        print(f"WARNING: zero total fatalities — {zero_states}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--year", type=int,
        help="FARS year to process (default: tries latest available, falls back one year)",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Compute stats and print without writing to Supabase",
    )
    parser.add_argument(
        "--from-db", action="store_true",
        help=(
            "Aggregate from the existing fars_fatalities table instead of downloading "
            "from NHTSA. Faster but only produces total/rural/urban/alcohol fields; "
            "person-level fields (motorcycle, pedestrian, etc.) will be NULL."
        ),
    )
    parser.add_argument(
        "--output-csv", metavar="FILE",
        help="Also write results to a CSV file",
    )
    args = parser.parse_args()

    needs_supabase = not args.dry_run or args.from_db
    if needs_supabase and (not SUPABASE_URL or not SUPABASE_KEY):
        print(
            "ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.\n"
            "       Add them to .env or web/.env.local, or export them.",
            file=sys.stderr,
        )
        sys.exit(1)

    from supabase import create_client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY) if needs_supabase else None

    # ── --from-db mode: aggregate from existing fars_fatalities table ────────
    if args.from_db:
        print(f"\n{'='*55}")
        mode_label = f"year={args.year}" if args.year else "all years in DB"
        print(f"  --from-db mode ({mode_label})")
        print(f"{'='*55}")
        stats = aggregate_from_db(supabase, args.year)
        _print_summary(stats.sort_values("total_fatalities", ascending=False).head(
            len(stats[stats["year"] == stats["year"].max()])
        ))
        if args.output_csv:
            stats.to_csv(args.output_csv, index=False)
            print(f"\nWritten to {args.output_csv}")
        if args.dry_run:
            print("\n[DRY RUN] No data written to Supabase.")
            return
        print("\nUpserting to Supabase...")
        upsert_to_supabase(supabase, stats.to_dict("records"))
        print("Done.")
        return

    # ── Default mode: download NHTSA CSVs ───────────────────────────────────
    # Determine candidate years (FARS lags ~2 years behind calendar year)
    if args.year:
        years_to_try = [args.year]
    else:
        current_year = datetime.date.today().year
        years_to_try = [current_year - 2, current_year - 3]

    year_used = None
    accident = person = vehicle = None
    for year in years_to_try:
        try:
            print(f"\n{'='*55}")
            print(f"  FARS {year}")
            print(f"{'='*55}")
            accident, person, vehicle = download_year(year)
            year_used = year
            break
        except requests.HTTPError as exc:
            print(f"  Not yet available ({exc.response.status_code}), trying previous year...")

    if year_used is None:
        print(
            f"ERROR: FARS data not available for any of: {years_to_try}\n"
            "       If NHTSA downloads are blocked, re-run with --from-db to\n"
            "       aggregate from the existing fars_fatalities table instead.",
            file=sys.stderr,
        )
        sys.exit(1)

    print(f"\nAggregating state statistics for {year_used}...")
    stats = compute_state_stats(accident, person, vehicle, year_used)

    _print_summary(stats)

    if args.output_csv:
        stats.to_csv(args.output_csv, index=False)
        print(f"\nWritten to {args.output_csv}")

    if args.dry_run:
        print("\n[DRY RUN] No data written to Supabase.")
        return

    print("\nUpserting to Supabase...")
    upsert_to_supabase(supabase, stats.to_dict("records"))
    print("Done.")


if __name__ == "__main__":
    main()
