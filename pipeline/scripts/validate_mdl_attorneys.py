#!/usr/bin/env python3
"""
Validate mdl_attorneys data quality after a pipeline run.

Checks:
  1. Expected attorney count for the target MDL
  2. role and party_type are populated (not NULL, not 'Unknown')
  3. No stale 'Unknown' rows remain
  4. Data is usable (attorney_name and firm_name present)

Usage:
    python pipeline/scripts/validate_mdl_attorneys.py --mdl 2738
    python pipeline/scripts/validate_mdl_attorneys.py --mdl 2738 --expected-count 82

Environment variables:
    SUPABASE_URL         -- Supabase project URL (required)
    SUPABASE_SERVICE_KEY -- Supabase service role key (required)
"""
from __future__ import annotations

import argparse
import logging
import os
import sys

import httpx

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_KEY", "")
    or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
)


def _headers(*, prefer: str | None = None) -> dict[str, str]:
    h = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        h["Prefer"] = prefer
    return h


def _count(params: dict[str, str]) -> int:
    resp = httpx.head(
        f"{SUPABASE_URL}/rest/v1/mdl_attorneys",
        headers={**_headers(prefer="count=exact")},
        params=params,
        timeout=30,
    )
    resp.raise_for_status()
    content_range = resp.headers.get("content-range", "")
    if "/" in content_range:
        return int(content_range.split("/")[1])
    return 0


def main():
    parser = argparse.ArgumentParser(description="Validate mdl_attorneys data")
    parser.add_argument("--mdl", type=int, required=True, help="MDL number to validate")
    parser.add_argument(
        "--expected-count",
        type=int,
        default=None,
        help="Expected number of attorney records",
    )
    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        sys.exit(1)

    mdl = args.mdl
    passed = 0
    failed = 0

    # 1. Total record count
    total = _count({"mdl_number": f"eq.{mdl}", "select": "id"})
    logger.info("[CHECK 1] Total records for MDL %d: %d", mdl, total)
    if args.expected_count:
        if total == args.expected_count:
            logger.info("  PASS: matches expected count of %d", args.expected_count)
            passed += 1
        else:
            logger.warning(
                "  FAIL: expected %d, got %d", args.expected_count, total
            )
            failed += 1
    elif total > 0:
        logger.info("  OK: records exist")
        passed += 1
    else:
        logger.warning("  FAIL: no records found")
        failed += 1

    # 2. Records with role populated (not NULL)
    null_role = _count({
        "mdl_number": f"eq.{mdl}",
        "role": "is.null",
        "select": "id",
    })
    logger.info("[CHECK 2] Records with NULL role: %d / %d", null_role, total)
    if null_role == 0:
        logger.info("  PASS: all records have role populated")
        passed += 1
    else:
        pct = (null_role / total * 100) if total else 0
        logger.warning("  FAIL: %.1f%% of records have NULL role", pct)
        failed += 1

    # 3. Records with party_type populated (not NULL)
    null_pt = _count({
        "mdl_number": f"eq.{mdl}",
        "party_type": "is.null",
        "select": "id",
    })
    logger.info("[CHECK 3] Records with NULL party_type: %d / %d", null_pt, total)
    if null_pt == 0:
        logger.info("  PASS: all records have party_type populated")
        passed += 1
    else:
        pct = (null_pt / total * 100) if total else 0
        logger.warning("  FAIL: %.1f%% of records have NULL party_type", pct)
        failed += 1

    # 4. No stale 'Unknown' rows
    unknown = _count({
        "mdl_number": f"eq.{mdl}",
        "role": "eq.Unknown",
        "select": "id",
    })
    logger.info("[CHECK 4] Stale 'Unknown' role rows: %d", unknown)
    if unknown == 0:
        logger.info("  PASS: no stale 'Unknown' rows")
        passed += 1
    else:
        logger.warning("  FAIL: %d stale rows with role='Unknown' remain", unknown)
        failed += 1

    # 5. Data usability: attorney_name present
    no_name = _count({
        "mdl_number": f"eq.{mdl}",
        "attorney_name": "is.null",
        "select": "id",
    })
    logger.info("[CHECK 5] Records missing attorney_name: %d", no_name)
    if no_name == 0:
        logger.info("  PASS: all records have attorney_name")
        passed += 1
    else:
        logger.warning("  FAIL: %d records missing attorney_name", no_name)
        failed += 1

    # Summary
    print()
    print(f"{'='*50}")
    print(f"Validation for MDL {mdl}: {passed} passed, {failed} failed")
    print(f"{'='*50}")

    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
