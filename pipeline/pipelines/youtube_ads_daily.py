#!/usr/bin/env python3
"""
youtube_ads_daily pipeline — PI-firm YouTube/video ad creatives via SearchApi
Google Ads Transparency Center.

For each known PI-firm domain (distinct advertiser_domain in
pi_search_observations), fetches video-format ad creatives from the Google Ads
Transparency Center and upserts them into youtube_ad_creatives. Firm-level,
national (Transparency has no DMA dimension). Feeds the Phase 4b YouTube
competitive tab.

Usage:
    python -m pipelines.youtube_ads_daily
    python -m pipelines.youtube_ads_daily --dry-run
    DRY_RUN=true python -m pipelines.youtube_ads_daily

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
    _get, _bulk_insert, _dedup_rows,
    SUPABASE_URL, _headers,
)
from lib.api_usage import log_api_call
from lib.api_pricing import get_searchapi_pricing
from lib.domain_mapper import DomainMapper

logger = logging.getLogger(__name__)

SEARCHAPI_API_KEY = os.environ.get("SEARCHAPI_API_KEY", "")
SEARCHAPI_BASE = "https://www.searchapi.io/api/v1/search"
REQUEST_DELAY_SECONDS = 1.5
MAX_RETRIES = 3
SEARCH_TIME_PERIOD = "last_30_days"
NUM_PER_DOMAIN = 100
REGION = "US"


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
        called_from="pipelines.youtube_ads_daily",
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


def _searchapi_transparency(domain: str) -> dict:
    """Fetch video ad creatives for a domain from Google Ads Transparency Center."""
    if not SEARCHAPI_API_KEY:
        return {}
    for attempt in range(MAX_RETRIES):
        try:
            resp = httpx.get(SEARCHAPI_BASE, params={
                "engine": "google_ads_transparency_center",
                "domain": domain,
                "ad_format": "video",
                "region": REGION,
                "time_period": SEARCH_TIME_PERIOD,
                "num": NUM_PER_DOMAIN,
                "api_key": SEARCHAPI_API_KEY,
            }, timeout=60)
            if resp.status_code == 429:
                backoff = 2 ** attempt * REQUEST_DELAY_SECONDS
                logger.warning("Rate limited on '%s', backing off %.1fs", domain, backoff)
                time.sleep(backoff)
                continue
            resp.raise_for_status()
            _log_searchapi_call("google_ads_transparency_center", domain)
            return resp.json()
        except httpx.HTTPError as e:
            if attempt < MAX_RETRIES - 1:
                logger.warning("Searchapi error for '%s': %s, retrying", domain, e)
                time.sleep(2 ** attempt * REQUEST_DELAY_SECONDS)
            else:
                logger.error("Searchapi failed for '%s' after %d attempts: %s",
                             domain, MAX_RETRIES, e)
    return {}


def _date_part(iso_str: str | None) -> str | None:
    """Extract YYYY-MM-DD from an ISO 8601 datetime; None if missing/unparseable."""
    if not iso_str:
        return None
    try:
        return datetime.fromisoformat(iso_str.replace("Z", "+00:00")).date().isoformat()
    except (ValueError, AttributeError):
        return None


def _creatives_to_rows(creatives: list[dict], domain: str,
                       domain_mapper: DomainMapper) -> list[dict]:
    """Map Google Ads Transparency video creatives to youtube_ad_creatives rows."""
    rows = []
    for cr in creatives:
        creative_id = cr.get("id")
        if not creative_id:
            continue
        advertiser = cr.get("advertiser") or {}
        advertiser_name = advertiser.get("name")
        rows.append({
            "creative_id": creative_id,
            "advertiser_domain": domain,
            "advertiser_name": advertiser_name,
            "advertiser_ar_id": advertiser.get("id"),
            "advertiser_id": domain_mapper.match_with_name_fallback(
                domain, advertiser_name or ""),
            "target_domain": cr.get("target_domain"),
            "ad_format": cr.get("format") or "video",
            "first_shown": _date_part(cr.get("first_shown_datetime")),
            "last_shown": _date_part(cr.get("last_shown_datetime")),
            "total_days_shown": cr.get("total_days_shown"),
            "details_link": cr.get("details_link"),
            "region": REGION,
            "raw_json": json.dumps(cr, default=str),
        })
    return rows


def _seed_rows() -> list[dict]:
    """Fixture rows when SEARCHAPI_API_KEY is unset (local / dry-run)."""
    return [{
        "creative_id": "CR_SEED_0001",
        "advertiser_domain": "forthepeople.com",
        "advertiser_name": "Morgan & Morgan, P.A.",
        "advertiser_ar_id": "AR14096354794599874561",
        "advertiser_id": None,
        "target_domain": "forthepeople.com",
        "ad_format": "video",
        "first_shown": "2026-01-28",
        "last_shown": "2026-06-21",
        "total_days_shown": 144,
        "details_link": "https://adstransparency.google.com/advertiser/AR14096354794599874561/creative/CR_SEED_0001?region=US",
        "region": "US",
        "raw_json": json.dumps({"seed": True}),
    }]


def step_fetch_raw(step) -> list[dict]:
    """Fetch video creatives for every known PI-firm domain and upsert them."""
    obs = _get("pi_search_observations", {"select": "advertiser_domain"})
    domains = sorted({(o.get("advertiser_domain") or "").strip().lower()
                      for o in obs if o.get("advertiser_domain")})
    domains = [d for d in domains if d]

    advertisers = _get("advertiser_entities",
                       {"select": "id,canonical_name,website,aliases"})
    domain_mapper = DomainMapper(advertisers)

    if not SEARCHAPI_API_KEY:
        print("  WARNING: SEARCHAPI_API_KEY not set — using seed data")
        rows = _dedup_rows(_seed_rows(), ("creative_id",))
        count = _bulk_insert("youtube_ad_creatives", rows,
                             on_conflict="creative_id",
                             resolution="merge-duplicates")
        step.set_metadata({"source": "seed_data", "domains_in_seed": len(domains)})
        step.set_counts(rows_in=0, rows_out=count)
        return rows

    rows: list[dict] = []
    domains_with_ads = 0
    failed_domains: list[str] = []

    for domain in domains:
        try:
            data = _searchapi_transparency(domain)
            creatives = data.get("ad_creatives", []) if data else []
            domain_rows = _creatives_to_rows(creatives, domain, domain_mapper)
            if domain_rows:
                domains_with_ads += 1
            rows.extend(domain_rows)
            time.sleep(REQUEST_DELAY_SECONDS)
        except Exception as e:  # noqa: BLE001 — one domain must not abort the run
            logger.error("  Domain '%s' failed: %s", domain, e)
            failed_domains.append(domain)

    rows = _dedup_rows(rows, ("creative_id",))
    step.set_metadata({
        "source": "searchapi_google_ads_transparency_center",
        "domains_queried": len(domains),
        "domains_with_ads": domains_with_ads,
        "total_creatives": len(rows),
        "failed_domains": failed_domains[:50],
        "matched_advertisers": sum(1 for r in rows if r.get("advertiser_id")),
    })
    count = _bulk_insert("youtube_ad_creatives", rows,
                         on_conflict="creative_id",
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
    total = supabase_count("youtube_ad_creatives")
    step.set_counts(rows_in=raw_count, rows_out=raw_count)
    step.set_metadata({
        "total_creatives": total,
        "publish_timestamp": datetime.now(timezone.utc).isoformat(),
    })
    print(f"\n  youtube_ad_creatives total: {total}")


def main():
    parser = argparse.ArgumentParser(
        description="YouTube Ads daily pipeline (SearchApi Transparency Center)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Run without writing to database")
    args = parser.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "true"
        import lib.pipeline
        lib.pipeline.DRY_RUN = True

    trigger = os.environ.get("PIPELINE_TRIGGER", "manual")

    with PipelineRun("youtube_ads_daily", trigger=trigger) as run:
        with run.step("fetch_raw") as step:
            raw_rows = step_fetch_raw(step)
        with run.step("publish") as step:
            step_publish(step, len(raw_rows))


if __name__ == "__main__":
    main()
