#!/usr/bin/env python3
"""
Seed PI viability scores into Supabase.
Loads all 51 entries (50 states + DC) and computes composite scores.

Usage:
    python scripts/seed_pi_viability.py
    python scripts/seed_pi_viability.py --dry-run
"""
import argparse
import os
import sys

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
load_dotenv("web/.env.local", override=False)

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

# fmt: off
STATE_DATA = [
    # (state, negligence_rule, neg_score, non_econ_cap, ne_score, punit_cap, punit_score, med_mal_cap, mm_score, sol, sol_score, avg_verdict, verdict_score)
    ("AL", "contributory", 0, "None (PI)", 100, "None", 100, "None", 100, "2 years", 50, "High (~$800K+)", 100),
    ("AK", "pure_comparative", 100, "None", 100, "None", 100, "$400K", 50, "2 years", 50, "Moderate", 50),
    ("AZ", "pure_comparative", 100, "None", 100, "Punitive capped", 50, "None", 100, "2 years", 50, "High", 75),
    ("AR", "modified_50", 50, "None", 100, "None", 100, "None", 100, "3 years", 75, "Moderate", 50),
    ("CA", "pure_comparative", 100, "None", 100, "None", 100, "None (PI)", 100, "2 years", 50, "Very High ($1M+)", 100),
    ("CO", "modified_50", 50, "$250K-$500K (general)", 50, "Capped 1x compensatory", 50, "$300K", 50, "3 years", 75, "Moderate", 50),
    ("CT", "modified_51", 75, "None", 100, "Punitive allowed", 75, "None", 100, "2 years", 50, "High", 75),
    ("DE", "modified_51", 75, "None", 100, "Punitive allowed", 75, "None", 100, "2 years", 50, "High", 75),
    ("DC", "pure_comparative", 100, "None", 100, "None", 100, "None", 100, "3 years", 75, "Very High", 100),
    ("FL", "modified_51", 75, "None", 100, "3x compensatory cap", 75, "$500K", 75, "2 years", 50, "High", 75),
    ("GA", "modified_50", 50, "None", 100, "75% of compensatory", 50, "None", 100, "2 years", 50, "High", 75),
    ("HI", "pure_comparative", 100, "None", 100, "None", 100, "None", 100, "2 years", 50, "Moderate", 50),
    ("ID", "modified_50", 50, "None", 100, "None", 100, "None (no med-mal)", 100, "2 years", 50, "Moderate", 50),
    ("IL", "modified_51", 75, "None (caps struck down)", 100, "None", 100, "None (struck down)", 100, "2 years", 50, "Very High", 100),
    ("IN", "modified_51", 75, "None (PI)", 100, "None", 100, "$1.8M total", 75, "2 years", 50, "Moderate", 50),
    ("IA", "modified_51", 75, "None", 100, "None", 100, "None", 100, "2 years", 50, "Moderate", 50),
    ("KS", "modified_50", 50, "None", 100, "Capped at lesser of damages or $5M", 75, "$250K", 50, "2 years", 50, "Moderate", 50),
    ("KY", "pure_comparative", 100, "None", 100, "None", 100, "None", 100, "1 year", 25, "High", 75),
    ("LA", "pure_comparative", 100, "None", 100, "None", 100, "$500K", 75, "1 year", 25, "High", 75),
    ("ME", "modified_50", 50, "None", 100, "None", 100, "None", 100, "6 years", 100, "Moderate", 50),
    ("MD", "contributory", 0, "None (PI)", 100, "None", 100, "$890K (med-mal)", 75, "3 years", 75, "High", 75),
    ("MA", "modified_51", 75, "None", 100, "None", 100, "None", 100, "3 years", 75, "High", 75),
    ("MI", "modified_51", 75, "None", 100, "3x compensatory", 75, "None (PI)", 100, "3 years", 75, "High", 75),
    ("MN", "modified_51", 75, "None", 100, "None", 100, "None", 100, "4 years", 100, "High", 75),
    ("MS", "pure_comparative", 100, "None", 100, "$20M cap", 50, "$500K", 75, "3 years", 75, "High", 75),
    ("MO", "pure_comparative", 100, "None", 100, "None", 100, "$700K", 75, "5 years", 100, "High", 75),
    ("MT", "pure_comparative", 100, "None", 100, "None", 100, "None", 100, "3 years", 75, "Moderate", 50),
    ("NE", "modified_50", 50, "None", 100, "None", 100, "$2.25M total", 75, "4 years", 100, "Moderate", 50),
    ("NV", "modified_51", 75, "None", 100, "3x compensatory", 75, "$350K", 50, "2 years", 50, "High", 75),
    ("NH", "modified_51", 75, "None", 100, "None", 100, "None", 100, "3 years", 75, "High", 75),
    ("NJ", "modified_51", 75, "None", 100, "None", 100, "None", 100, "2 years", 50, "Very High", 100),
    ("NM", "pure_comparative", 100, "None", 100, "None", 100, "None", 100, "3 years", 75, "High", 75),
    ("NY", "pure_comparative", 100, "None", 100, "None", 100, "None", 100, "3 years", 75, "Very High ($1M+)", 100),
    ("NC", "contributory", 0, "None (PI)", 100, "None", 100, "$500K", 75, "3 years", 75, "High", 75),
    ("ND", "modified_50", 50, "None", 100, "2x compensatory", 75, "None", 100, "6 years", 100, "Moderate", 50),
    ("OH", "modified_51", 75, "$250K (non-econ)", 25, "2x or $350K", 50, "$250K", 25, "2 years", 50, "Moderate", 50),
    ("OK", "modified_50", 50, "None", 100, "None", 100, "None", 100, "2 years", 50, "Moderate", 50),
    ("OR", "modified_51", 75, "None", 100, "None", 100, "None", 100, "2 years", 50, "High", 75),
    ("PA", "modified_51", 75, "None", 100, "None", 100, "None", 100, "2 years", 50, "High", 75),
    ("RI", "pure_comparative", 100, "None", 100, "None", 100, "None", 100, "3 years", 75, "High", 75),
    ("SC", "modified_51", 75, "None", 100, "3x compensatory", 75, "None", 100, "3 years", 75, "High", 75),
    ("SD", "modified_slight", 50, "None", 100, "$500K", 75, "None", 100, "3 years", 75, "Moderate", 50),
    ("TN", "modified_50", 50, "$750K general/$1M catastrophic", 75, "2x or $500K", 75, "$750K", 75, "1 year", 25, "Moderate", 50),
    ("TX", "modified_51", 75, "None", 100, "2x economic + $750K", 75, "$250K", 25, "2 years", 50, "High", 75),
    ("UT", "modified_slight", 50, "None", 100, "3x special damages or $50K", 25, "$450K", 50, "4 years", 100, "Moderate", 50),
    ("VT", "pure_comparative", 100, "None", 100, "None", 100, "None", 100, "3 years", 75, "High", 75),
    ("VA", "contributory", 0, "None (PI)", 100, "None", 100, "None", 100, "2 years", 50, "High", 75),
    ("WA", "pure_comparative", 100, "None", 100, "None", 100, "None", 100, "3 years", 75, "Very High", 100),
    ("WV", "pure_comparative", 100, "None", 100, "$500K punitive cap", 75, "None", 100, "2 years", 50, "High", 75),
    ("WI", "modified_51", 75, "None", 100, "2x compensatory", 75, "$750K", 75, "3 years", 75, "High", 75),
    ("WY", "pure_comparative", 100, "None", 100, "None", 100, "None", 100, "4 years", 100, "Moderate", 50),
]
# fmt: on


def compute_composite(neg: int, ne: int, punit: int, mm: int, sol: int, verdict: int) -> float:
    """Composite = (neg*0.25 + ne*0.20 + punit*0.10 + mm*0.10 + sol*0.10 + verdict*0.15) * (100/90)"""
    raw = neg * 0.25 + ne * 0.20 + punit * 0.10 + mm * 0.10 + sol * 0.10 + verdict * 0.15
    return round(raw * (100 / 90), 1)


def build_records() -> list[dict]:
    records = []
    for row in STATE_DATA:
        state, neg_rule, neg_score, ne_cap, ne_score, punit_cap, punit_score, mm_cap, mm_score, sol, sol_score, avg_verdict, verdict_score = row
        composite = compute_composite(neg_score, ne_score, punit_score, mm_score, sol_score, verdict_score)
        records.append({
            "state": state,
            "negligence_rule": neg_rule,
            "negligence_score": neg_score,
            "non_economic_cap": ne_cap,
            "non_economic_score": ne_score,
            "punitive_cap": punit_cap,
            "punitive_score": punit_score,
            "med_mal_cap": mm_cap,
            "med_mal_score": mm_score,
            "statute_of_limitations": sol,
            "sol_score": sol_score,
            "avg_jury_verdict": avg_verdict,
            "verdict_score": verdict_score,
            "composite_score": composite,
        })
    return records


def main():
    parser = argparse.ArgumentParser(description="Seed PI viability scores")
    parser.add_argument("--dry-run", action="store_true", help="Print records without writing to database")
    args = parser.parse_args()

    records = build_records()
    print(f"Built {len(records)} records")

    if args.dry_run:
        for r in records:
            print(f"  {r['state']}: composite={r['composite_score']}")
        print("[DRY RUN] No changes written to database.")
        return

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set", file=sys.stderr)
        sys.exit(1)

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Upsert all records (on conflict: state)
    batch_size = 50
    for i in range(0, len(records), batch_size):
        batch = records[i : i + batch_size]
        supabase.table("pi_viability_scores").upsert(
            batch, on_conflict="state"
        ).execute()
        print(f"  Upserted batch {i // batch_size + 1} ({len(batch)} records)")

    print(f"Done. {len(records)} PI viability scores upserted.")


if __name__ == "__main__":
    main()
