#!/usr/bin/env python3
"""
Load pipeline/seeds/manufacturer_tort_map.csv into public.manufacturer_tort_map.

Idempotent: upserts on (manufacturer_id, tort_id). Safe to re-run after editing
the CSV.

Usage:
    python -m pipelines.load_manufacturer_tort_map
    python -m pipelines.load_manufacturer_tort_map --dry-run
    python -m pipelines.load_manufacturer_tort_map --csv path/to/other.csv

Env:
    SUPABASE_URL           required
    SUPABASE_SERVICE_KEY   required
"""
from __future__ import annotations

import argparse
import csv
import logging
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.pipeline import (  # noqa: E402
    PipelineRun,
    SUPABASE_URL,
    SUPABASE_KEY,
    _bulk_insert,
    _get,
)

logger = logging.getLogger(__name__)

DEFAULT_CSV = (
    Path(__file__).resolve().parent.parent / "seeds" / "manufacturer_tort_map.csv"
)

REQUIRED_COLS = {
    "manufacturer_id",
    "tort_id",
    "tort_slug",
    "confidence",
}


def _load_csv(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        missing = REQUIRED_COLS - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"CSV missing required columns: {missing}")
        return list(reader)


def _validate_foreign_keys(rows: list[dict]) -> list[dict]:
    """Return only rows whose manufacturer_id and tort_id exist in DB."""
    mfr_ids = {r["manufacturer_id"] for r in rows if r.get("manufacturer_id")}
    tort_ids = {r["tort_id"] for r in rows if r.get("tort_id")}

    existing_mfrs = {
        r["id"]
        for r in (
            _get(
                "recall_manufacturers",
                {"select": "id", "id": f"in.({','.join(mfr_ids)})"},
            )
            or []
        )
    }
    existing_torts = {
        r["id"]
        for r in (
            _get(
                "mass_torts",
                {"select": "id", "id": f"in.({','.join(tort_ids)})"},
            )
            or []
        )
    }

    valid: list[dict] = []
    for r in rows:
        if r["manufacturer_id"] not in existing_mfrs:
            logger.warning(
                "  ⚠ skipping row — manufacturer_id not found: %s (%s)",
                r["manufacturer_id"],
                r.get("manufacturer_name"),
            )
            continue
        if r["tort_id"] not in existing_torts:
            logger.warning(
                "  ⚠ skipping row — tort_id not found: %s (%s)",
                r["tort_id"],
                r.get("tort_slug"),
            )
            continue
        if r["confidence"] not in ("high", "medium", "low"):
            logger.warning(
                "  ⚠ skipping row — invalid confidence %r for %s↔%s",
                r["confidence"],
                r.get("manufacturer_name"),
                r.get("tort_slug"),
            )
            continue
        valid.append(
            {
                "manufacturer_id": r["manufacturer_id"],
                "tort_id": r["tort_id"],
                "tort_slug": r["tort_slug"],
                "confidence": r["confidence"],
                "source": "manual_seed",
                "notes": (r.get("notes") or "").strip() or None,
            }
        )
    return valid


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--csv", type=str, default=str(DEFAULT_CSV))
    args = ap.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "1"

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-7s  %(message)s",
    )

    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.error("SUPABASE_URL / SUPABASE_SERVICE_KEY not set")
        return 1

    csv_path = Path(args.csv)
    if not csv_path.exists():
        logger.error("CSV not found: %s", csv_path)
        return 1

    with PipelineRun("load_manufacturer_tort_map", trigger="manual") as run:
        with run.step("fetch_raw") as step:
            raw = _load_csv(csv_path)
            logger.info("Loaded %d rows from %s", len(raw), csv_path)
            step.set_counts(rows_in=len(raw), rows_out=len(raw))

        with run.step("normalize") as step:
            valid = _validate_foreign_keys(raw)
            logger.info("Validated %d/%d rows", len(valid), len(raw))
            step.set_counts(rows_in=len(raw), rows_out=len(valid))
            step.set_metadata(
                {
                    "high_confidence": sum(1 for r in valid if r["confidence"] == "high"),
                    "medium_confidence": sum(1 for r in valid if r["confidence"] == "medium"),
                    "low_confidence": sum(1 for r in valid if r["confidence"] == "low"),
                }
            )

        with run.step("publish") as step:
            inserted = _bulk_insert(
                "manufacturer_tort_map",
                valid,
                on_conflict="manufacturer_id,tort_id",
                resolution="merge-duplicates",
            )
            step.set_counts(rows_in=len(valid), rows_out=inserted)

    return 0


if __name__ == "__main__":
    sys.exit(main())
