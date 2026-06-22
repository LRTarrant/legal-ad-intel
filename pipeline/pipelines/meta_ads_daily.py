#!/usr/bin/env python3
"""
meta_ads_daily pipeline — PI-firm Meta (Facebook/Instagram) ads via SearchApi
Meta Ad Library.

Searches the Meta Ad Library for PI case-type keywords (national, US) and
upserts the returned ads into meta_ad_creatives. Case-type-keyed + national.
Feeds the Phase 5b Meta competitive tab.

Usage:
    python -m pipelines.meta_ads_daily
    python -m pipelines.meta_ads_daily --dry-run
    DRY_RUN=true python -m pipelines.meta_ads_daily

Environment variables:
    SUPABASE_URL            — Supabase project URL (required)
    SUPABASE_SERVICE_KEY    — Supabase service role key (required)
    SEARCHAPI_API_KEY       — Searchapi.io API key (required for real data)
    DRY_RUN                 — "true" to skip all DB writes (optional)
    PIPELINE_TRIGGER        — "scheduled" | "manual" (optional, default "manual")
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
    PipelineRun, DRY_RUN,
    _bulk_insert, _dedup_rows,
    SUPABASE_URL, _headers,
)
from lib.api_usage import log_api_call
from lib.api_pricing import get_searchapi_pricing

logger = logging.getLogger(__name__)

SEARCHAPI_API_KEY = os.environ.get("SEARCHAPI_API_KEY", "")
SEARCHAPI_BASE = "https://www.searchapi.io/api/v1/search"
REQUEST_DELAY_SECONDS = 1.5
MAX_RETRIES = 3
COUNTRY = "US"
MAX_PAGES_PER_KEYWORD = 5

# PI case type (slug) -> Meta Ad Library search keyword(s). Same case-type set
# as the SEO tab so the Phase 5b dropdown matches.
META_SEARCH_TERMS = {
    "motor_vehicle":  ["car accident lawyer"],
    "truck_accident": ["truck accident lawyer"],
    "motorcycle":     ["motorcycle accident lawyer"],
    "boating":        ["boat accident lawyer"],
    "nursing_home":   ["nursing home abuse lawyer"],
    "workers_comp":   ["workers compensation lawyer"],
}


def _log_searchapi_call(engine: str, query: str) -> None:
    """Record a Searchapi.io call to api_usage_log. Never raises."""
    pricing = get_searchapi_pricing()
    log_api_call(
        provider="searchapi",
        operation=f"searchapi_{engine}",
        model_or_actor=engine,
        units_consumed=1,
        unit_type="searches",
        cost_usd=pricing["rate_per_unit_usd"],
        called_from="pipelines.meta_ads_daily",
        metadata={"engine": engine, "q": query},
    )


def supabase_count(table: str) -> int:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {**_headers(), "Prefer": "count=exact"}
    resp = httpx.head(url, headers=headers, params={"select": "*"}, timeout=30)
    resp.raise_for_status()
    cr = resp.headers.get("content-range", "")
    if "/" in cr:
        total = cr.split("/")[-1]
        return int(total) if total != "*" else 0
    return 0


def _searchapi_meta(keyword: str, page_token: str | None = None) -> dict:
    """One Meta Ad Library page for a keyword. Returns {} on failure."""
    if not SEARCHAPI_API_KEY:
        return {}
    params = {
        "engine": "meta_ad_library",
        "q": keyword,
        "country": COUNTRY,
        "active_status": "active",
        "api_key": SEARCHAPI_API_KEY,
    }
    if page_token:
        params["next_page_token"] = page_token
    for attempt in range(MAX_RETRIES):
        try:
            resp = httpx.get(SEARCHAPI_BASE, params=params, timeout=60)
            if resp.status_code == 429:
                backoff = 2 ** attempt * REQUEST_DELAY_SECONDS
                logger.warning("Rate limited on '%s', backing off %.1fs", keyword, backoff)
                time.sleep(backoff)
                continue
            resp.raise_for_status()
            _log_searchapi_call("meta_ad_library", keyword)
            return resp.json()
        except httpx.HTTPError as e:
            if attempt < MAX_RETRIES - 1:
                logger.warning("Searchapi error for '%s': %s, retrying", keyword, e)
                time.sleep(2 ** attempt * REQUEST_DELAY_SECONDS)
            else:
                logger.error("Searchapi failed for '%s' after %d attempts: %s",
                             keyword, MAX_RETRIES, e)
    return {}


def _date_part(iso_str: str | None) -> str | None:
    """Extract YYYY-MM-DD from an ISO 8601 datetime; None if missing/unparseable."""
    if not iso_str:
        return None
    try:
        return datetime.fromisoformat(iso_str.replace("Z", "+00:00")).date().isoformat()
    except (ValueError, AttributeError):
        return None


def _ads_to_rows(ads: list[dict], case_type: str, keyword: str) -> list[dict]:
    """Map Meta Ad Library ads to meta_ad_creatives rows."""
    rows = []
    for ad in ads:
        ad_id = ad.get("ad_archive_id")
        if not ad_id:
            continue
        snapshot = ad.get("snapshot")
        rows.append({
            "ad_archive_id": str(ad_id),
            "page_id": ad.get("page_id"),
            "page_name": ad.get("page_name"),
            "case_type": case_type,
            "keyword": keyword,
            "start_date": _date_part(ad.get("start_date")),
            "end_date": _date_part(ad.get("end_date")),
            "is_active": ad.get("is_active"),
            "publisher_platforms": ad.get("publisher_platform"),
            "collation_count": ad.get("collation_count"),
            "country": COUNTRY,
            "snapshot": json.dumps(snapshot, default=str) if snapshot is not None else None,
            "raw_json": json.dumps(ad, default=str),
        })
    return rows


def _seed_rows() -> list[dict]:
    """Fixture rows when SEARCHAPI_API_KEY is unset (local / dry-run only)."""
    return [{
        "ad_archive_id": "META_SEED_0001",
        "page_id": "171489872877097",
        "page_name": "Law Offices of Gary Martin Hays & Associates, P.C.",
        "case_type": "motor_vehicle",
        "keyword": "car accident lawyer",
        "start_date": "2024-10-21",
        "end_date": "2026-06-22",
        "is_active": True,
        "publisher_platforms": ["FACEBOOK", "INSTAGRAM"],
        "collation_count": 1,
        "country": "US",
        "snapshot": json.dumps({"seed": True}),
        "raw_json": json.dumps({"seed": True}),
    }]


def step_fetch_raw(step) -> list[dict]:
    """Search the Meta Ad Library per case-type keyword and upsert ads."""
    if not SEARCHAPI_API_KEY:
        # Read the live dry-run flag from the environment — the module-level
        # DRY_RUN import is bound at import time and goes stale when main()
        # flips it for --dry-run, so it cannot gate a live-table write.
        dry = os.environ.get("DRY_RUN", "").strip().lower() == "true"
        if not dry:
            print("  WARNING: SEARCHAPI_API_KEY not set and not a dry run — "
                  "skipping (refusing to write seed data to the live table)")
            step.set_metadata({"source": "no_api_key_skipped"})
            step.set_counts(rows_in=0, rows_out=0)
            return []
        print("  WARNING: SEARCHAPI_API_KEY not set — using seed data (dry run)")
        rows = _dedup_rows(_seed_rows(), ("ad_archive_id",))
        count = _bulk_insert("meta_ad_creatives", rows,
                             on_conflict="ad_archive_id",
                             resolution="merge-duplicates")
        step.set_metadata({"source": "seed_data"})
        step.set_counts(rows_in=0, rows_out=count)
        return rows

    rows: list[dict] = []
    keywords_queried = 0
    failed_keywords: list[str] = []

    for case_type, keywords in META_SEARCH_TERMS.items():
        for keyword in keywords:
            keywords_queried += 1
            try:
                page_token = None
                for _page in range(MAX_PAGES_PER_KEYWORD):
                    data = _searchapi_meta(keyword, page_token)
                    if not data:
                        break
                    rows.extend(_ads_to_rows(data.get("ads", []), case_type, keyword))
                    page_token = (data.get("pagination") or {}).get("next_page_token")
                    time.sleep(REQUEST_DELAY_SECONDS)
                    if not page_token:
                        break
            except Exception as e:  # noqa: BLE001 — one keyword must not abort the run
                logger.error("  Keyword '%s' failed: %s", keyword, e)
                failed_keywords.append(keyword)

    rows = _dedup_rows(rows, ("ad_archive_id",))
    step.set_metadata({
        "source": "searchapi_meta_ad_library",
        "keywords_queried": keywords_queried,
        "total_ads": len(rows),
        "distinct_pages": len({r["page_id"] for r in rows if r.get("page_id")}),
        "failed_keywords": failed_keywords[:50],
    })
    count = _bulk_insert("meta_ad_creatives", rows,
                         on_conflict="ad_archive_id",
                         resolution="merge-duplicates")
    step.set_counts(rows_in=0, rows_out=count)
    return rows


def step_publish(step, raw_count: int):
    """Verify final state."""
    if DRY_RUN:
        step.set_counts(rows_in=raw_count, rows_out=raw_count)
        step.set_metadata({"dry_run": True})
        print("\n  [DRY RUN] Skipping verification")
        return
    total = supabase_count("meta_ad_creatives")
    step.set_counts(rows_in=raw_count, rows_out=raw_count)
    step.set_metadata({
        "total_ads": total,
        "publish_timestamp": datetime.now(timezone.utc).isoformat(),
    })
    print(f"\n  meta_ad_creatives total: {total}")


def main():
    parser = argparse.ArgumentParser(
        description="Meta Ads daily pipeline (SearchApi Meta Ad Library)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Run without writing to database")
    args = parser.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "true"
        import lib.pipeline
        lib.pipeline.DRY_RUN = True

    trigger = os.environ.get("PIPELINE_TRIGGER", "manual")

    with PipelineRun("meta_ads_daily", trigger=trigger) as run:
        with run.step("fetch_raw") as step:
            raw_rows = step_fetch_raw(step)
        with run.step("publish") as step:
            step_publish(step, len(raw_rows))


if __name__ == "__main__":
    main()
