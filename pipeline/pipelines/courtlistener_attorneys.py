#!/usr/bin/env python3
"""
courtlistener_attorneys pipeline -- Fetches attorney/firm data for active MDLs
from the CourtListener REST API v4.
Two-phase approach:
  Phase 1: Search API for bulk attorney+firm discovery (fast)
  Phase 2: Parties REST API for party_type + role enrichment

Usage:
    python -m pipelines.courtlistener_attorneys
    python -m pipelines.courtlistener_attorneys --dry-run
    python -m pipelines.courtlistener_attorneys --mdl 3060

Environment variables:
    SUPABASE_URL            -- Supabase project URL (required)
    SUPABASE_SERVICE_KEY    -- Supabase service role key (required)
    COURTLISTENER_API_TOKEN -- CourtListener API token (required for real data)
    DRY_RUN                 -- "true" to skip all DB writes (optional)
    PIPELINE_TRIGGER        -- "scheduled" | "manual" (optional)
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
import re
import time
from datetime import datetime, timezone

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.pipeline import (
    PipelineRun,
    DRY_RUN,
    _bulk_insert,
    _get,
)

logger = logging.getLogger(__name__)

CL_API_TOKEN = os.environ.get("COURTLISTENER_API_TOKEN", "")
CL_BASE = "https://www.courtlistener.com/api/rest/v4"
REQUEST_DELAY = 2.0
MAX_RETRIES = 3
MAX_RETRIES_RATE_LIMIT = 5
GLOBAL_429_THRESHOLD = 6
MAX_SEARCH_PAGES = 5  # Cap pages per MDL to avoid excessive API calls
_global_429_count = 0


def normalise_role(party_type: str) -> str:
    """Normalise CourtListener party_type into a standard role label.

    Mirrors the TypeScript normaliseRole() in web/lib/courtlistener.ts.
    """
    lower = (party_type or "").lower()
    if any(term in lower for term in ("plaintiff", "petitioner", "claimant")):
        return "Plaintiff"
    if any(term in lower for term in ("defendant", "respondent")):
        return "Defendant"
    if "third party" in lower:
        return "Third Party"
    if "amicus" in lower:
        return "Amicus"
    return party_type or None


def _normalise_name(name: str) -> str:
    """Lowercase and collapse whitespace for attorney name matching."""
    return re.sub(r"\s+", " ", name.strip().lower())


def _cl_headers() -> dict:
    h = {"Accept": "application/json"}
    if CL_API_TOKEN:
        h["Authorization"] = f"Token {CL_API_TOKEN}"
    return h


def _cl_get(url: str, params: dict | None = None) -> dict | list:
    """GET from CourtListener API with retry logic."""
    global _global_429_count
    for attempt in range(MAX_RETRIES):
        try:
            resp = httpx.get(url, headers=_cl_headers(), params=params or {}, timeout=30)
            if resp.status_code == 429:
                _global_429_count += 1
                if _global_429_count >= GLOBAL_429_THRESHOLD:
                    logger.warning("Global rate limit threshold reached, skipping remaining API calls")
                    return {}
                wait = 2 ** attempt * 5
                logger.warning("Rate limited, backing off %ds", wait)
                time.sleep(wait)
                continue
            resp.raise_for_status()
            _global_429_count = 0
            return resp.json()
        except httpx.HTTPError as e:
            if attempt < MAX_RETRIES - 1:
                logger.warning("CL API attempt %d failed: %s", attempt + 1, e)
                time.sleep(2 ** attempt)
            else:
                logger.error("CL API failed for %s: %s", url, e)
                return {}
    return {}


def search_mdl_attorneys(mdl_number: int) -> list[dict]:
    """Search CourtListener RECAP for an MDL and extract unique attorney rows."""
    seen: set[tuple] = set()  # (attorney_name, cl_attorney_id) dedup key
    rows: list[dict] = []
    now = datetime.now(timezone.utc).isoformat()

    url = f"{CL_BASE}/search/"
    params = {
        "q": f'"MDL {mdl_number}"',
        "type": "r",
        "page_size": 100,
    }

    page = 0
    while url and page < MAX_SEARCH_PAGES:
        page += 1
        logger.info("  MDL %d: fetching search page %d", mdl_number, page)

        if page == 1:
            data = _cl_get(url, params)
        else:
            # next URL has all params embedded
            data = _cl_get(url)

        if not isinstance(data, dict):
            break

        results = data.get("results", [])
        if not results:
            break

        for hit in results:
            attorneys = hit.get("attorney", []) or []
            attorney_ids = hit.get("attorney_id", []) or []
            firm_ids = hit.get("firm_id", []) or []
            parties = hit.get("party", []) or []
            party_ids = hit.get("party_id", []) or []
            docket_id = hit.get("docket_id")

            for i, atty_name in enumerate(attorneys):
                atty_name = (atty_name or "").strip()
                if not atty_name:
                    continue

                cl_attorney_id = attorney_ids[i] if i < len(attorney_ids) else None
                # Search API attorney[]/firm[] arrays are not reliably aligned.
                # Keep firm_id as a fallback only; authoritative firm mapping is
                # set in Phase 2 from the Parties API nested structure.
                cl_firm_id = firm_ids[i] if i < len(firm_ids) else None

                # Dedup by attorney name + attorney id
                dedup_key = (atty_name.lower(), cl_attorney_id)
                if dedup_key in seen:
                    continue
                seen.add(dedup_key)

                # Try to get party info (first party as context)
                party_name = parties[0] if parties else None
                party_type = None  # Search API doesn't provide party type

                rows.append({
                    "mdl_number": mdl_number,
                    "cl_docket_id": docket_id,
                    "attorney_name": atty_name,
                    "cl_attorney_id": cl_attorney_id,
                    "firm_name": None,
                    "cl_org_id": cl_firm_id,
                    "party_name": party_name,
                    "party_type": party_type,
                    "role": None,
                    "fetched_at": now,
                })

        url = data.get("next")
        if url:
            time.sleep(REQUEST_DELAY)

    return rows


# CourtListener attorney role integer mapping
_CL_ROLE_MAP = {
    1: "Lead attorney",
    2: "Attorney to be noticed",
    3: "Attorney in charge",
}


def fetch_parties_api(docket_id: int) -> list[dict]:
    """Fetch party/attorney data via the CourtListener REST API v4 parties endpoint.

    Returns a list of dicts with keys matching the downstream enrichment format:
    party_name, party_type, attorney_name, firm_name, role.
    """
    rows: list[dict] = []
    url = f"{CL_BASE}/parties/"
    params = {"docket": docket_id}
    page = 0

    while url:
        page += 1
        data = _cl_get(url, params) if page == 1 else _cl_get(url)

        if not isinstance(data, dict):
            break

        for party in data.get("results", []):
            party_name = (party.get("name") or "").strip() or None
            party_type_obj = party.get("party_type") or {}
            party_type = (party_type_obj.get("name") or "").strip() or None

            for atty_entry in party.get("attorneys", []):
                # Resolve attorney name from nested attorney object or URL
                attorney_obj = atty_entry.get("attorney")
                if isinstance(attorney_obj, dict):
                    attorney_name = (attorney_obj.get("name") or "").strip() or None
                elif isinstance(attorney_obj, str) and attorney_obj:
                    # attorney field is a URL -- fetch the attorney detail
                    time.sleep(REQUEST_DELAY)
                    atty_detail = _cl_get(attorney_obj)
                    attorney_name = (atty_detail.get("name") or "").strip() if isinstance(atty_detail, dict) else None
                else:
                    attorney_name = None

                if not attorney_name:
                    continue

                # Extract firm name from organizations
                orgs = atty_entry.get("organizations") or []
                firm_name = None
                cl_org_id = None
                if orgs:
                    first_org = orgs[0]
                    if isinstance(first_org, dict):
                        firm_name = (first_org.get("name") or "").strip() or None
                        cl_org_id = first_org.get("id")
                    elif isinstance(first_org, str):
                        firm_name = first_org.strip() or None
                        m = re.search(r"/organizations/(\d+)/?$", first_org)
                        if m:
                            cl_org_id = int(m.group(1))

                # Map role integers to human-readable labels
                roles_list = atty_entry.get("roles") or []
                role_labels = []
                for r in roles_list:
                    if isinstance(r, dict):
                        role_int = r.get("role")
                        label = _CL_ROLE_MAP.get(role_int, f"Role {role_int}")
                        role_labels.append(label)
                role = ", ".join(role_labels) if role_labels else None

                rows.append({
                    "party_name": party_name,
                    "party_type": party_type,
                    "attorney_name": attorney_name,
                    "firm_name": firm_name,
                    "cl_org_id": cl_org_id,
                    "role": role,
                })

        url = data.get("next")
        if url:
            params = None  # next URL has all params embedded
            time.sleep(REQUEST_DELAY)

    logger.info("  Parties API returned %d parties, %d attorney entries",
                len(set(r["party_name"] for r in rows if r["party_name"])), len(rows))
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
        logger.warning("COURTLISTENER_API_TOKEN not set -- skipping real fetch, inserting 0 rows")
        step.set_counts(rows_in=len(mdls), rows_out=0)
        step.set_metadata({"note": "No API token -- set COURTLISTENER_API_TOKEN to fetch real data"})
        return []

    all_rows: list[dict] = []
    failed_mdls: list[int] = []

    for mdl in mdls:
        mdl_number = mdl["mdl_number"]
        try:
            rows = search_mdl_attorneys(mdl_number)
            logger.info("  MDL %d: %d unique attorney rows", mdl_number, len(rows))
            all_rows.extend(rows)
            time.sleep(REQUEST_DELAY)
        except Exception as e:
            logger.error("MDL %d failed: %s", mdl_number, e)
            failed_mdls.append(mdl_number)

    # Phase 2: fetch parties via REST API to enrich party_type and role
    # Build a lookup: normalised attorney name -> list of indices in all_rows
    atty_index: dict[str, list[int]] = {}
    for idx, row in enumerate(all_rows):
        key = _normalise_name(row.get("attorney_name") or "")
        if key:
            atty_index.setdefault(key, []).append(idx)

    # Get ALL unique docket IDs per MDL, capped at 5 per MDL
    MAX_DOCKETS_PER_MDL = 3
    mdl_dockets: dict[int, list[int]] = {}  # mdl_number -> [cl_docket_ids]
    for row in all_rows:
        mdl_num = row["mdl_number"]
        did = row.get("cl_docket_id")
        if did:
            mdl_dockets.setdefault(mdl_num, [])
            if did not in mdl_dockets[mdl_num]:
                mdl_dockets[mdl_num].append(did)

    # Cap each MDL to MAX_DOCKETS_PER_MDL docket IDs
    for mdl_num in mdl_dockets:
        mdl_dockets[mdl_num] = mdl_dockets[mdl_num][:MAX_DOCKETS_PER_MDL]

    scraped_enrichment: int = 0
    if _global_429_count >= GLOBAL_429_THRESHOLD:
        logger.warning("Skipping Phase 2 enrichment due to rate limiting")

    stop_phase_2 = False
    for mdl_num, docket_ids in mdl_dockets.items():
        if _global_429_count >= GLOBAL_429_THRESHOLD:
            stop_phase_2 = True
            break
        for docket_id in docket_ids:
            logger.info("MDL %d: Phase 2 -- fetching parties via API for docket %d", mdl_num, docket_id)
            api_rows = fetch_parties_api(docket_id)
            if _global_429_count >= GLOBAL_429_THRESHOLD:
                stop_phase_2 = True
                break
            matches_found = 0
            for hr in api_rows:
                key = _normalise_name(hr.get("attorney_name") or "")
                if key in atty_index:
                    for idx in atty_index[key]:
                        if all_rows[idx]["mdl_number"] == mdl_num:
                            # Use normalised role from party_type heading
                            party_type_raw = hr.get("party_type")
                            all_rows[idx]["party_type"] = party_type_raw
                            all_rows[idx]["role"] = hr.get("role") or normalise_role(party_type_raw or "")
                            if not all_rows[idx].get("party_name"):
                                all_rows[idx]["party_name"] = hr.get("party_name")
                            if hr.get("firm_name"):
                                all_rows[idx]["firm_name"] = hr.get("firm_name")
                            if hr.get("cl_org_id") is not None:
                                all_rows[idx]["cl_org_id"] = hr.get("cl_org_id")
                            scraped_enrichment += 1
                            matches_found += 1
            logger.info("MDL %d: docket %d — %d attorney matches found", mdl_num, docket_id, matches_found)
            time.sleep(REQUEST_DELAY)
        if stop_phase_2:
            break

    # Post-Phase-2: for rows still missing role, fall back to normalise_role(party_type)
    for row in all_rows:
        if row.get("role") is None and row.get("party_type"):
            row["role"] = normalise_role(row["party_type"])

    logger.info("Phase 2 enriched %d attorney rows with party_type/role", scraped_enrichment)
    step.set_metadata({
        "total_mdls": len(mdls),
        "failed_mdls": failed_mdls,
        "total_attorney_rows": len(all_rows),
        "enriched_rows": scraped_enrichment,
    })

    count = _bulk_insert("mdl_attorneys", all_rows, on_conflict="mdl_number,cl_attorney_id", resolution="merge-duplicates")
    step.set_counts(rows_in=len(mdls), rows_out=count)
    return all_rows


def step_normalize(step) -> int:
    """Pass-through -- data is inserted directly in fetch_raw."""
    step.set_counts(rows_in=0, rows_out=0)
    step.set_metadata({"note": "No normalization needed -- data written directly in fetch_raw"})
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
