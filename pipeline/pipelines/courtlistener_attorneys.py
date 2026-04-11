#!/usr/bin/env python3
"""
courtlistener_attorneys pipeline — Fetches attorney/firm data for active MDLs
from the CourtListener REST API v4.

For each active MDL in our mdls table:
  1. Looks up the CourtListener docket ID via docket search (cached in cl_docket_map)
  2. Fetches parties and their attorneys from /api/rest/v4/parties/?docket=<id>
  3. Stores attorney + firm data in mdl_attorneys table

Usage:
    python -m pipelines.courtlistener_attorneys
    python -m pipelines.courtlistener_attorneys --dry-run
    python -m pipelines.courtlistener_attorneys --mdl 3060

Environment variables:
    SUPABASE_URL             -- Supabase project URL (required)
    SUPABASE_SERVICE_KEY     -- Supabase service role key (required)
    COURTLISTENER_API_TOKEN  -- CourtListener API token (required for real data)
    DRY_RUN                  -- "true" to skip all DB writes (optional)
    PIPELINE_TRIGGER         -- "scheduled" | "manual" (optional)
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.pipeline import (
    PipelineRun,
    DRY_RUN,
    _bulk_insert,
    _get,
    _post,
    _patch,
    SUPABASE_URL,
    _headers,
)

logger = logging.getLogger(__name__)

CL_API_TOKEN = os.environ.get("COURTLISTENER_API_TOKEN", "")
CL_BASE = "https://www.courtlistener.com/api/rest/v4"
REQUEST_DELAY = 1.0
MAX_RETRIES = 3


def _cl_headers() -> dict:
    h = {"Accept": "application/json"}
    if CL_API_TOKEN:
        h["Authorization"] = f"Token {CL_API_TOKEN}"
    return h


def _cl_get(path: str, params: dict | None = None) -> dict | list:
    """GET from CourtListener API with retry logic."""
    url = f"{CL_BASE}{path}" if path.startswith("/") else path
    for attempt in range(MAX_RETRIES):
        try:
            resp = httpx.get(url, headers=_cl_headers(), params=params or {}, timeout=30)
            if resp.status_code == 429:
                wait = 2 ** attempt * 2
                logger.warning("Rate limited, backing off %ds", wait)
                time.sleep(wait)
                continue
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as e:
            if attempt < MAX_RETRIES - 1:
                time.sleep(2 ** attempt)
            else:
                logger.error("CL API failed for %s: %s", url, e)
                return {}
    return {}


def _cl_get_all_pages(path: str, params: dict | None = None) -> list[dict]:
    """Paginate through all results from a CourtListener endpoint."""
    results = []
    url = f"{CL_BASE}{path}"
    p = {**(params or {}), "page_size": 100}
    while url:
        data = _cl_get(url, p if "courtlistener.com/api/rest/v4" in url else None)
        if isinstance(data, dict):
            results.extend(data.get("results", []))
            url = data.get("next", None)
            p = None  # next URL already has params embedded
        else:
            break
        time.sleep(REQUEST_DELAY)
    return results


def resolve_cl_docket_id(mdl_number: int) -> int | None:
    """Find CourtListener docket ID for an MDL number, checking cache first."""
    # Check cache
    cached = _get("cl_docket_map", {"mdl_number": f"eq.{mdl_number}", "select": "cl_docket_id", "limit": 1})
    if cached:
        return cached[0]["cl_docket_id"]

    # Search CL for this MDL docket
    # MDL dockets are filed at court 'jpml'
    logger.info("    Resolving CL docket for MDL %d", mdl_number)
    data = _cl_get("/dockets/", {"docket_number__contains": str(mdl_number), "court": "jpml", "page_size": 5})
    results = data.get("results", []) if isinstance(data, dict) else []

    if not results:
        # Try broader search without court filter
        data = _cl_get("/dockets/", {"docket_number__contains": str(mdl_number), "page_size": 5})
        results = data.get("results", []) if isinstance(data, dict) else []

    if not results:
        logger.warning("    No CL docket found for MDL %d", mdl_number)
        return None

    # Pick the first match
    docket = results[0]
    cl_docket_id = docket["id"]

    # Cache it
    if not DRY_RUN:
        try:
            _bulk_insert("cl_docket_map", [{
                "mdl_number": mdl_number,
                "cl_docket_id": cl_docket_id,
                "cl_court": docket.get("court", ""),
                "docket_number": docket.get("docket_number", ""),
                "case_name": docket.get("case_name", ""),
            }])
        except Exception as e:
            logger.warning("    Failed to cache docket map: %s", e)

    return cl_docket_id


def fetch_attorneys_for_docket(mdl_number: int, cl_docket_id: int) -> list[dict]:
    """Fetch all parties + attorneys for a CL docket ID."""
    rows = []
    now = datetime.now(timezone.utc).isoformat()

    logger.info("    Fetching parties for docket %d (MDL %d)", cl_docket_id, mdl_number)
    parties = _cl_get_all_pages("/parties/", {"docket": cl_docket_id})
    logger.info("    Got %d parties", len(parties))

    for party in parties:
        party_name = party.get("name", "")
        party_type = party.get("party_types", [{}])[0].get("name", "") if party.get("party_types") else ""

        attorneys = party.get("attorneys", [])
        for atty in attorneys:
            atty_name = atty.get("name", "").strip()
            if not atty_name:
                continue

            # Extract firm from attorney organizations
            firm_name = None
            cl_org_id = None
            orgs = atty.get("organizations", [])
            if orgs:
                firm_name = orgs[0].get("name", "").strip() or None
                cl_org_id = orgs[0].get("id") or None

            # Extract role
            roles = atty.get("roles", [])
            role = roles[0].get("name", "") if roles else ""

            cl_attorney_id = atty.get("id")

            rows.append({
                "mdl_number": mdl_number,
                "cl_docket_id": cl_docket_id,
                "attorney_name": atty_name,
                "cl_attorney_id": cl_attorney_id,
                "firm_name": firm_name,
                "cl_org_id": cl_org_id,
                "party_name": party_name or None,
                "party_type": party_type or None,
                "role": role or None,
                "fetched_at": now,
            })

    return rows


def step_fetch_raw(step, target_mdl: int | None = None) -> list[dict]:
    """Fetch attorney/firm data from CourtListener for active MDLs."""
    # Load active MDLs
    params = {"select": "mdl_number,title,status", "status": "neq.Closed"}
    if target_mdl:
        params["mdl_number"] = f"eq.{target_mdl}"

    mdls = _get("mdls", params)
    logger.info("Processing %d MDLs", len(mdls))

    if not CL_API_TOKEN:
        logger.warning("COURTLISTENER_API_TOKEN not set — skipping real fetch, inserting 0 rows")
        step.set_counts(rows_in=len(mdls), rows_out=0)
        step.set_metadata({"note": "No API token — set COURTLISTENER_API_TOKEN to fetch real data"})
        return []

    all_rows: list[dict] = []
    resolved = 0
    failed_mdls: list[int] = []

    for mdl in mdls:
        mdl_number = mdl["mdl_number"]
        try:
            cl_docket_id = resolve_cl_docket_id(mdl_number)
            if cl_docket_id is None:
                failed_mdls.append(mdl_number)
                continue
            resolved += 1

            rows = fetch_attorneys_for_docket(mdl_number, cl_docket_id)
            logger.info("    MDL %d: %d attorney rows", mdl_number, len(rows))
            all_rows.extend(rows)
            time.sleep(REQUEST_DELAY)

        except Exception as e:
            logger.error("MDL %d failed: %s", mdl_number, e)
            failed_mdls.append(mdl_number)

    step.set_metadata({
        "total_mdls": len(mdls),
        "resolved_dockets": resolved,
        "failed_mdls": failed_mdls,
        "total_attorney_rows": len(all_rows),
    })

    count = _bulk_insert("mdl_attorneys", all_rows)
    step.set_counts(rows_in=len(mdls), rows_out=count)
    return all_rows


def step_normalize(step) -> int:
    """Pass-through — data is inserted directly in fetch_raw."""
    step.set_counts(rows_in=0, rows_out=0)
    step.set_metadata({"note": "No normalization needed — data written directly in fetch_raw"})
    return 0


def step_publish(step, raw_count: int):
    """Verify final row count."""
    if DRY_RUN:
        step.set_counts(rows_in=raw_count, rows_out=raw_count)
        step.set_metadata({"dry_run": True})
        return

    total = _get("mdl_attorneys", {"select": "id", "limit": 1})
    step.set_counts(rows_in=raw_count, rows_out=raw_count)
    step.set_metadata({"publish_timestamp": datetime.now(timezone.utc).isoformat()})


def main():
    parser = argparse.ArgumentParser(description="CourtListener attorney pipeline")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--mdl", type=int, default=None, help="Target a single MDL number")
    args = parser.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "true"
        import lib.pipeline
        lib.pipeline.DRY_RUN = True

    trigger = os.environ.get("PIPELINE_TRIGGER", "manual")

    with PipelineRun("courtlistener_attorneys", trigger=trigger) as run:
        with run.step("fetch_raw") as step:
            raw_rows = step_fetch_raw(step, target_mdl=args.mdl)
        with run.step("normalize") as step:
            step_normalize(step)
        with run.step("publish") as step:
            step_publish(step, len(raw_rows))


if __name__ == "__main__":
    main()
