#!/usr/bin/env python3
"""
Cleanup stale mdl_attorneys rows where role = 'Unknown'.

These rows were inserted by an earlier buggy web endpoint sync that set
role = 'Unknown' for every record.  The Python pipeline never sets
role = 'Unknown' (it uses NULL when Phase 2 hasn't enriched yet, or a
normalised label like 'Plaintiff'/'Defendant' when it has).

Usage:
    # Dry run (default) -- show what would be deleted
    python pipeline/scripts/cleanup_stale_attorneys.py

    # Actually delete, scoped to MDL 2738
    python pipeline/scripts/cleanup_stale_attorneys.py --execute --mdl 2738

    # Delete all stale 'Unknown' rows across all MDLs
    python pipeline/scripts/cleanup_stale_attorneys.py --execute

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

BATCH_SIZE = 1000


def _headers(*, prefer: str | None = None) -> dict[str, str]:
    h = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        h["Prefer"] = prefer
    return h


def count_stale(mdl_number: int | None) -> int:
    """Count rows with role = 'Unknown'."""
    params: dict[str, str] = {
        "select": "id",
        "role": "eq.Unknown",
    }
    if mdl_number:
        params["mdl_number"] = f"eq.{mdl_number}"
    # Use HEAD with Prefer: count=exact to get count without fetching rows
    resp = httpx.head(
        f"{SUPABASE_URL}/rest/v1/mdl_attorneys",
        headers={**_headers(prefer="count=exact")},
        params=params,
        timeout=30,
    )
    resp.raise_for_status()
    content_range = resp.headers.get("content-range", "")
    # Format: "0-N/total" or "*/total"
    if "/" in content_range:
        return int(content_range.split("/")[1])
    return 0


def delete_batch(mdl_number: int | None) -> int:
    """Delete up to BATCH_SIZE stale rows. Returns count deleted."""
    # First, fetch IDs to delete
    params: dict[str, str] = {
        "select": "id",
        "role": "eq.Unknown",
        "limit": str(BATCH_SIZE),
    }
    if mdl_number:
        params["mdl_number"] = f"eq.{mdl_number}"

    resp = httpx.get(
        f"{SUPABASE_URL}/rest/v1/mdl_attorneys",
        headers=_headers(),
        params=params,
        timeout=30,
    )
    resp.raise_for_status()
    rows = resp.json()
    if not rows:
        return 0

    ids = [r["id"] for r in rows]

    # Delete by IDs
    resp = httpx.delete(
        f"{SUPABASE_URL}/rest/v1/mdl_attorneys",
        headers=_headers(),
        params={"id": f"in.({','.join(str(i) for i in ids)})"},
        timeout=60,
    )
    resp.raise_for_status()
    return len(ids)


def main():
    parser = argparse.ArgumentParser(
        description="Delete stale mdl_attorneys rows with role='Unknown'"
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually delete rows (default is dry-run)",
    )
    parser.add_argument(
        "--mdl",
        type=int,
        default=None,
        help="Scope deletion to a single MDL number",
    )
    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        sys.exit(1)

    mdl_label = f"MDL {args.mdl}" if args.mdl else "all MDLs"
    total = count_stale(args.mdl)
    logger.info("Found %d stale rows (role='Unknown') for %s", total, mdl_label)

    if total == 0:
        logger.info("Nothing to clean up.")
        return

    if not args.execute:
        logger.info(
            "[DRY RUN] Would delete %d rows. Re-run with --execute to proceed.",
            total,
        )
        return

    logger.info("Deleting %d stale rows in batches of %d ...", total, BATCH_SIZE)
    deleted_total = 0
    while True:
        deleted = delete_batch(args.mdl)
        if deleted == 0:
            break
        deleted_total += deleted
        logger.info("  Deleted %d rows (%d / %d)", deleted, deleted_total, total)

    logger.info("Cleanup complete: %d rows deleted for %s", deleted_total, mdl_label)


if __name__ == "__main__":
    main()
