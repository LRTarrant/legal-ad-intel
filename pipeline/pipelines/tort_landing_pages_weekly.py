#!/usr/bin/env python3
"""
tort_landing_pages_weekly — DMA-segmented Searchapi.io scan for new
law-firm landing pages.

For each active landing-page tort × top-N DMAs (default 25), query
Searchapi.io Google with a `location` param, parse organic + ads + local
results, classify domains, and upsert into tort_landing_pages with the
DMA code attached.

Budget guardrail runs first: aborts if month-end Searchapi projection
exceeds 95% of the api_pricing_config monthly quota.

Usage:
    python -m pipelines.tort_landing_pages_weekly
    python -m pipelines.tort_landing_pages_weekly --dry-run
    TORT_LANDING_PAGES_DMA_COUNT=10 python -m pipelines.tort_landing_pages_weekly
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
    PipelineRun, DRY_RUN, _bulk_insert, _get, _headers, SUPABASE_URL,
)
from lib.api_usage import searchapi_get
from lib.domain_mapper import extract_root_domain
from lib.landing_page_classifier import classify_domain
from lib.searchapi_budget import assert_budget_ok, BudgetExceeded
from lib.tort_landing_common import (
    load_active_torts, load_synonyms_by_tort,
    load_allow_list_domains, load_manufacturer_domains,
    compute_slug_match,
)
from lib.tort_landing_snapshot import upload_snapshot

logger = logging.getLogger(__name__)

SEARCHAPI_BASE = "https://www.searchapi.io/api/v1/search"
SEARCHAPI_API_KEY = os.environ.get("SEARCHAPI_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
DMA_COUNT = int(os.environ.get("TORT_LANDING_PAGES_DMA_COUNT") or "25")
REQUEST_DELAY_SECONDS = 1.5


def _load_top_dmas(limit: int) -> list[dict]:
    """Top N DMAs by Nielsen rank with a curated searchapi_location."""
    return _get("dma_markets", {
        "select": "dma_code,display_name,primary_state,rank,searchapi_location",
        "searchapi_location": "not.is.null",
        "order": "rank.asc",
        "limit": str(limit),
    })


def _build_query_for_tort(tort: dict) -> str:
    """Use the tort name + 'lawsuit' as the search query.

    Keeps the query shape simple and tort-specific. Per-tort keyword tuning
    is a future refinement once we have data.
    """
    name = (tort.get("name") or tort.get("slug") or "").lower()
    return f"{name} lawsuit"


def step_budget_check(step) -> int:
    """Compute planned calls and abort if over budget. Returns planned count."""
    torts = load_active_torts()
    dmas = _load_top_dmas(DMA_COUNT)
    planned = len(torts) * len(dmas)
    status = assert_budget_ok(additional_calls_planned=planned)
    step.set_metadata({
        "planned_calls": planned,
        "torts": len(torts),
        "dmas": len(dmas),
        "used_this_month": status.used_this_month,
        "monthly_quota": status.monthly_quota,
        "pct_projected": round(status.pct_projected, 3),
    })
    step.set_counts(rows_in=0, rows_out=planned)
    return planned


def step_fetch_serp(step, ctx: dict) -> list[dict]:
    """Run the DMA × tort matrix and parse organic + ads + local rows."""
    if not SEARCHAPI_API_KEY:
        logger.warning("SEARCHAPI_API_KEY not set — skipping fetch")
        step.set_metadata({"skipped": "no_searchapi_key"})
        step.set_counts(rows_in=0, rows_out=0)
        return []

    candidates: dict[tuple, dict] = {}
    failed = 0
    succeeded = 0

    for tort in ctx["torts"]:
        query = _build_query_for_tort(tort)
        fs_slug = tort.get("advertising_page_slug") or tort["slug"]
        syn = ctx["synonyms"].get(tort["id"], {})

        for dma in ctx["dmas"]:
            try:
                resp = searchapi_get(
                    SEARCHAPI_BASE,
                    params={
                        "engine": "google",
                        "q": query,
                        "api_key": SEARCHAPI_API_KEY,
                        "gl": "us",
                        "hl": "en",
                        "location": dma["searchapi_location"],
                        "num": 20,
                    },
                    called_from="pipelines.tort_landing_pages_weekly",
                    operation="searchapi_google_landing_pages",
                )
                if resp.status_code >= 400:
                    failed += 1
                    continue
                data = resp.json()
                succeeded += 1
            except httpx.HTTPError as e:
                logger.warning("Searchapi failed for %s × %s: %s", fs_slug, dma["dma_code"], e)
                failed += 1
                continue
            time.sleep(REQUEST_DELAY_SECONDS)

            for parsed in _parse_results(data, tort, dma, syn):
                key = (
                    parsed["tort_id"],
                    parsed["registered_domain"],
                    parsed["slugified_path_tort_match"],
                    parsed["dma_code"],
                )
                existing = candidates.get(key)
                if existing is None or parsed["rank"] < existing["rank"]:
                    candidates[key] = parsed

    step.set_metadata({
        "queries_succeeded": succeeded,
        "queries_failed": failed,
        "unique_landing_keys": len(candidates),
    })
    step.set_counts(rows_in=succeeded, rows_out=len(candidates))
    return list(candidates.values())


def _parse_results(data: dict, tort: dict, dma: dict, syn: dict) -> list[dict]:
    """Extract organic + ads + local_pack rows, attach tort/dma context."""
    rows: list[dict] = []
    for source_key, serp_feature in (("organic_results", "organic"), ("ads", "ads"), ("local_results", "local_pack")):
        for i, r in enumerate(data.get(source_key, []) or []):
            link = (r.get("link") or r.get("displayed_link") or "").strip()
            if not link:
                continue
            domain = extract_root_domain(link)
            if not domain:
                continue
            slug_match = compute_slug_match(link, syn)
            rows.append({
                "tort_id": tort["id"],
                "url": link,
                "registered_domain": domain,
                "slugified_path_tort_match": slug_match,
                "dma_code": dma["dma_code"],
                "rank": r.get("position", i + 1),
                "serp_feature": serp_feature,
                "title": r.get("title"),
                "raw_serp": {
                    "source": "searchapi_google_dma",
                    "dma": dma["dma_code"],
                    "location": dma["searchapi_location"],
                    "query": data.get("search_parameters", {}).get("q"),
                },
            })
    return rows


def step_classify(step, candidates: list[dict], ctx: dict) -> list[dict]:
    """Same classifier as the daily pipeline; cached in domain_classifications."""
    # Reuse the daily pipeline's logic to keep behavior identical.
    from pipelines.tort_landing_pages_daily import (
        _load_domain_cache, step_classify as _daily_classify,
    )

    # _daily_classify expects ctx with allow_list + manufacturer_domains.
    return _daily_classify(step, candidates, ctx)


def step_upsert_landing_pages(step, enriched: list[dict]) -> int:
    if not enriched:
        step.set_counts(rows_in=0, rows_out=0)
        return 0
    now_iso = datetime.now(timezone.utc).isoformat()
    rows = [{
        "tort_id": r["tort_id"],
        "url": r["url"],
        "registered_domain": r["registered_domain"],
        "slugified_path_tort_match": r["slugified_path_tort_match"],
        "dma_code": r["dma_code"],
        "rank": r["rank"],
        "serp_feature": r["serp_feature"],
        "title": r.get("title"),
        "first_seen_at": now_iso,
        "last_seen_at": now_iso,
        "is_law_firm": r["is_law_firm"],
        "confidence": r.get("confidence"),
        "classification_status": r["classification_status"],
        "raw_serp": r.get("raw_serp") or {},
    } for r in enriched]
    count = _bulk_insert(
        "tort_landing_pages",
        rows,
        on_conflict="tort_id,registered_domain,slugified_path_tort_match,dma_code",
        resolution="merge-duplicates",
    )
    step.set_counts(rows_in=len(rows), rows_out=count)
    return count


def step_refresh_velocity(step):
    if DRY_RUN:
        step.set_metadata({"dry_run": True})
        step.set_counts(rows_in=0, rows_out=0)
        return
    resp = httpx.post(
        f"{SUPABASE_URL}/rest/v1/rpc/refresh_tort_landing_page_velocity",
        headers=_headers(),
        json={},
        timeout=120,
    )
    step.set_metadata({"refresh_status": resp.status_code})
    step.set_counts(rows_in=0, rows_out=1 if resp.status_code < 400 else 0)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="tort_landing_pages_weekly — DMA Searchapi scan")
    parser.add_argument("--dry-run", action="store_true", help="Skip DB writes")
    args = parser.parse_args()
    if args.dry_run:
        os.environ["DRY_RUN"] = "true"
        import lib.pipeline
        lib.pipeline.DRY_RUN = True

    trigger = os.environ.get("PIPELINE_TRIGGER", "manual")

    with PipelineRun("tort_landing_pages_weekly", trigger=trigger) as run:
        with run.step("budget_check") as step:
            try:
                step_budget_check(step)
            except BudgetExceeded as e:
                logger.error(str(e))
                step.set_metadata({"aborted": True, "reason": str(e)})
                raise

        # Build context after budget check passes.
        torts = load_active_torts()
        dmas = _load_top_dmas(DMA_COUNT)
        ctx = {
            "torts": torts,
            "dmas": dmas,
            "synonyms": load_synonyms_by_tort([t["id"] for t in torts]),
            "allow_list": load_allow_list_domains(),
            "manufacturer_domains": load_manufacturer_domains(),
        }

        with run.step("fetch_serp") as step:
            candidates = step_fetch_serp(step, ctx)

        with run.step("classify_domains") as step:
            enriched = step_classify(step, candidates, ctx)

        with run.step("upsert_landing_pages") as step:
            step_upsert_landing_pages(step, enriched)

        # Snapshot step reuses the daily pipeline's implementation.
        from pipelines.tort_landing_pages_daily import step_snapshot_html
        with run.step("snapshot_html") as step:
            step_snapshot_html(step, enriched)

        with run.step("refresh_velocity_matview") as step:
            step_refresh_velocity(step)


if __name__ == "__main__":
    main()
