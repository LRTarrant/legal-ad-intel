#!/usr/bin/env python3
"""
serp_metro_daily pipeline — per-metro (DMA) organic SEO (#3b).

The SEO competitive tab was national. This runs a geo-targeted Google SERP for
each pi_metro x SEO case type and writes the ORGANIC results to
serp_results_normalized with the metro's dma_code, powering get_seo_competitors_
by_dma. Keyed by the 6 SEO case-type torts (clean taxonomy that maps to
torts.slug), NOT the pi_search clusters.

Append-only (each day's SERP is a fresh observation; the RPC windows by p_days),
mirroring the national SERP pipeline. Metro rows carry dma_code; national rows
(dma_code IS NULL) are untouched.

Usage:
    python -m pipelines.serp_metro_daily
    python -m pipelines.serp_metro_daily --dry-run

Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, SEARCHAPI_API_KEY (required for real
data), DRY_RUN, PIPELINE_TRIGGER, SERP_METRO_MAX (optional metro cap).
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
from lib.pipeline import PipelineRun, DRY_RUN, _get, _bulk_insert  # noqa: E402
from lib.api_usage import log_api_call  # noqa: E402
from lib.api_pricing import get_searchapi_pricing  # noqa: E402
from lib.domain_mapper import extract_root_domain  # noqa: E402
from pipelines.pi_search_daily import supabase_count  # noqa: E402

logger = logging.getLogger(__name__)

SEARCHAPI_API_KEY = os.environ.get("SEARCHAPI_API_KEY", "")
SEARCHAPI_BASE = "https://www.searchapi.io/api/v1/search"
REQUEST_DELAY_SECONDS = 1.5
MAX_RETRIES = 3
MAX_METROS = int(os.environ.get("SERP_METRO_MAX", "200"))

# SEO case-type tort slug -> representative organic query. Slugs match the SEO
# tab dropdown + torts.slug (FK target).
SEO_TORT_QUERIES = {
    "motor_vehicle":  "car accident lawyer",
    "truck_accident": "truck accident lawyer",
    "motorcycle":     "motorcycle accident lawyer",
    "boating":        "boat accident lawyer",
    "nursing_home":   "nursing home abuse lawyer",
    "workers_comp":   "workers compensation lawyer",
}


def _searchapi_google(query: str, location: str) -> dict:
    if not SEARCHAPI_API_KEY:
        return {}
    for attempt in range(MAX_RETRIES):
        try:
            resp = httpx.get(SEARCHAPI_BASE, params={
                "engine": "google", "q": query, "api_key": SEARCHAPI_API_KEY,
                "location": location, "gl": "us", "hl": "en", "num": 20,
            }, timeout=30)
            if resp.status_code == 429:
                time.sleep(2 ** attempt * REQUEST_DELAY_SECONDS)
                continue
            resp.raise_for_status()
            pricing = get_searchapi_pricing()
            log_api_call(
                provider="searchapi", operation="searchapi_google",
                model_or_actor="google", units_consumed=1, unit_type="searches",
                cost_usd=pricing["rate_per_unit_usd"],
                called_from="pipelines.serp_metro_daily",
                metadata={"engine": "google", "q": query, "location": location},
            )
            return resp.json()
        except httpx.HTTPError as e:
            if attempt < MAX_RETRIES - 1:
                time.sleep(2 ** attempt * REQUEST_DELAY_SECONDS)
            else:
                logger.error("SERP failed for '%s' @ %s: %s", query, location, e)
    return {}


def _extract_organic(serp_data: dict, dma_code: str, tort_slug: str,
                     query: str) -> list[dict]:
    rows = []
    now = datetime.now(timezone.utc).isoformat()
    for r in serp_data.get("organic_results", []):
        link = r.get("link", "")
        domain = extract_root_domain(link)
        if not domain:
            continue
        rows.append({
            "query": query,
            "tort_slug": tort_slug,
            "result_type": "organic",
            "position": r.get("position"),
            "page": 1,
            "domain": domain,
            "title": r.get("title"),
            "snippet": r.get("snippet"),
            "link": link or None,
            "dma_code": dma_code,
            "fetched_at": now,
        })
    return rows


def step_fetch_organic(step) -> int:
    metros = _get("pi_metros", {
        "select": "id,metro_name,metro_label,searchapi_location,dma_code,state_abbr",
    })
    metros = [m for m in metros if m.get("dma_code")][:MAX_METROS]

    if not SEARCHAPI_API_KEY:
        dry = os.environ.get("DRY_RUN", "").strip().lower() == "true"
        msg = "no_api_key_dry_run" if dry else "no_api_key_skipped"
        print(f"  WARNING: SEARCHAPI_API_KEY not set — {msg}")
        step.set_metadata({"source": msg, "metros": len(metros)})
        step.set_counts(rows_in=0, rows_out=0)
        return 0

    total_inserted = 0
    total_organic = 0
    failed: list[str] = []
    for metro in metros:
        location = metro.get("searchapi_location") or metro["metro_label"]
        dma_code = metro["dma_code"]
        metro_rows: list[dict] = []
        for tort_slug, query in SEO_TORT_QUERIES.items():
            try:
                serp = _searchapi_google(query, location)
                rows = _extract_organic(serp, dma_code, tort_slug, query)
                metro_rows.extend(rows)
                total_organic += len(rows)
            except Exception as e:  # noqa: BLE001 — one query must not abort the run
                logger.error("  '%s' @ %s failed: %s", query, location, e)
                failed.append(f"{metro['state_abbr']}:{query}")
            time.sleep(REQUEST_DELAY_SECONDS)
        # Append-only (each day's SERP is a fresh observation); flush per-metro so
        # a mid-run timeout keeps what's done.
        if metro_rows:
            total_inserted += _bulk_insert("serp_results_normalized", metro_rows)

    step.set_counts(rows_in=total_organic, rows_out=total_inserted)
    step.set_metadata({
        "source": "searchapi_google_per_metro",
        "metros": len(metros),
        "case_types": len(SEO_TORT_QUERIES),
        "organic_rows": total_organic,
        "rows_inserted": total_inserted,
        "failed_searches": failed[:50],
    })
    print(f"\n  metros={len(metros)} organic_rows={total_organic} inserted={total_inserted}")
    return total_inserted


def step_publish(step, inserted: int):
    if DRY_RUN:
        step.set_counts(rows_in=inserted, rows_out=inserted)
        step.set_metadata({"dry_run": True})
        return
    total = supabase_count("serp_results_normalized")
    step.set_counts(rows_in=inserted, rows_out=inserted)
    step.set_metadata({
        "serp_results_normalized_total": total,
        "publish_timestamp": datetime.now(timezone.utc).isoformat(),
    })
    print(f"\n  serp_results_normalized total: {total}")


def main():
    parser = argparse.ArgumentParser(
        description="Per-metro organic SERP for the SEO-by-DMA competitive cut")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "true"
        import lib.pipeline
        lib.pipeline.DRY_RUN = True

    trigger = os.environ.get("PIPELINE_TRIGGER", "manual")

    with PipelineRun("serp_metro_daily", trigger=trigger) as run:
        with run.step("fetch_organic") as step:
            inserted = step_fetch_organic(step)
        with run.step("publish") as step:
            step_publish(step, inserted)


if __name__ == "__main__":
    main()
