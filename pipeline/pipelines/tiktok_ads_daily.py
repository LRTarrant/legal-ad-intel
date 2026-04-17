#!/usr/bin/env python3
"""
tiktok_ads_daily pipeline — TikTok paid ad observations via Searchapi.io.

Searches the TikTok Ads Library for tort-related keywords, extracts ad results,
and inserts them into ad_observations_raw with source='tiktok_ads'.

Usage:
    python -m pipelines.tiktok_ads_daily
    python -m pipelines.tiktok_ads_daily --dry-run
    DRY_RUN=true python -m pipelines.tiktok_ads_daily

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
from uuid import uuid4

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.pipeline import (
    PipelineRun, DRY_RUN,
    _get, _bulk_insert, _delete,
    SUPABASE_URL, _headers,
)
from lib.domain_mapper import DomainMapper, extract_root_domain

logger = logging.getLogger(__name__)

SEARCHAPI_API_KEY = os.environ.get("SEARCHAPI_API_KEY", "")
SEARCHAPI_BASE = "https://www.searchapi.io/api/v1/search"
REQUEST_DELAY_SECONDS = 1.5
MAX_RETRIES = 3

# Tort → TikTok search keywords (same slugs as torts table)
TORT_SEARCH_TERMS: dict[str, list[str]] = {
    "camp_lejeune":      ["camp lejeune lawyer", "camp lejeune lawsuit"],
    "hair_relaxer":      ["hair relaxer lawsuit", "hair relaxer attorney"],
    "roundup":           ["roundup lawsuit", "roundup cancer lawyer"],
    "talcum_powder":     ["talcum powder lawsuit", "baby powder cancer lawyer"],
    "paraquat":          ["paraquat lawsuit", "paraquat parkinsons lawyer"],
    "firefighter_foam":  ["afff firefighting foam lawsuit", "pfas contamination lawyer"],
    "nec_baby_formula":  ["nec baby formula lawsuit", "similac enfamil nec lawyer"],
    "tylenol_autism":    ["tylenol autism lawsuit", "acetaminophen pregnancy lawyer"],
    "zantac":            ["zantac lawsuit", "zantac cancer lawyer"],
    "hernia_mesh":       ["hernia mesh lawsuit", "hernia mesh complications lawyer"],
    "social_media":      ["social media addiction lawsuit", "social media harm children lawyer"],
    "motor_vehicle":     ["car accident lawyer", "auto accident attorney"],
    "truck_accident":    ["truck accident lawyer", "18 wheeler accident attorney"],
    "nursing_home":      ["nursing home abuse lawyer", "nursing home neglect attorney"],
    "workers_comp":      ["workers compensation lawyer", "workers comp attorney"],
    "roblox_abuse":      ["roblox child abuse lawsuit", "roblox predator lawsuit"],
    "social_media_addiction": ["social media addiction lawsuit teens", "tiktok addiction lawsuit"],
    "depo_provera":          ["depo provera lawsuit", "depo provera brain tumor lawsuit"],
    "glp1_gastroparesis":     ["ozempic lawsuit", "ozempic stomach paralysis lawyer", "glp-1 gastroparesis lawsuit"],
    "glp1_vision_loss":       ["ozempic blindness lawsuit", "glp-1 vision loss lawyer", "ozempic naion lawsuit"],
}


def supabase_query(table: str, params: dict) -> list[dict]:
    return _get(table, params)


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


def _searchapi_tiktok(query: str) -> dict:
    """Call Searchapi.io TikTok Ads Library and return the JSON response."""
    if not SEARCHAPI_API_KEY:
        return {}

    for attempt in range(MAX_RETRIES):
        try:
            resp = httpx.get(SEARCHAPI_BASE, params={
                "engine": "tiktok_ads_library",
                "q": query,
                "api_key": SEARCHAPI_API_KEY,
                "country": "all",
            }, timeout=30)

            if resp.status_code == 429:
                backoff = 2 ** attempt * REQUEST_DELAY_SECONDS
                logger.warning("Rate limited on query '%s', backing off %.1fs", query, backoff)
                time.sleep(backoff)
                continue

            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as e:
            if attempt < MAX_RETRIES - 1:
                logger.warning("Searchapi error for '%s': %s, retrying", query, e)
                time.sleep(2 ** attempt * REQUEST_DELAY_SECONDS)
            else:
                logger.error("Searchapi failed for '%s' after %d attempts: %s", query, MAX_RETRIES, e)
    return {}


def _extract_ads_from_tiktok(response_data: dict, query: str, tort_slug: str,
                              tort_id: str, geo_target_id: str | None,
                              domain_mapper: DomainMapper) -> list[dict]:
    """Extract ad observations from Searchapi.io TikTok Ads Library response."""
    # TikTok API may return ads under 'results' or 'ads' key
    ads = response_data.get("results", response_data.get("ads", []))
    rows = []
    now = datetime.now(timezone.utc)

    for i, ad in enumerate(ads):
        advertiser_name = ad.get("advertiser", "")
        ad_id = ad.get("id", "")
        video_link = ad.get("video_link", "")

        # TikTok ads may not have domains, use advertiser name as raw
        advertiser_raw = advertiser_name or "Unknown"
        advertiser_id = domain_mapper.match(advertiser_name) if advertiser_name else None

        # Parse audience metrics
        raw_count = ad.get("estimated_audience_max") or ad.get("estimated_audience")
        try:
            impression_count = int(raw_count) if raw_count is not None else None
        except (ValueError, TypeError):
            impression_count = None

        # Parse date fields
        first_shown = ad.get("first_shown_datetime", "")
        last_shown = ad.get("last_shown_datetime", "")
        first_seen = first_shown[:10] if first_shown else now.date().isoformat()
        last_seen = last_shown[:10] if last_shown else now.date().isoformat()

        source_id = f"tiktok_ads:{tort_slug}:{query}:{ad_id or i}:{now.strftime('%Y%m%d')}"

        rows.append({
            "source": "tiktok_ads",
            "source_id": source_id,
            "advertiser_raw": advertiser_raw,
            "advertiser_id": advertiser_id,
            "tort_id": tort_id,
            "tort_raw": tort_slug,
            "geo_target_id": geo_target_id,
            "geo_raw": "US",
            "ad_format": "video",
            "creative_url": video_link or None,
            "creative_text": advertiser_name,
            "first_seen": first_seen,
            "last_seen": last_seen,
            "estimated_spend_low": None,
            "estimated_spend_high": None,
            "impression_count": impression_count,
            "raw_json": json.dumps(ad, default=str),
            "ingested_at": now.isoformat(),
        })

    return rows


def _generate_seed_ads(torts: list[dict], advertisers: list[dict],
                       geos: list[dict]) -> list[dict]:
    """Generate realistic seed data when SEARCHAPI_API_KEY is not set."""
    import random
    from datetime import date, timedelta

    rows = []
    today = date.today()
    us_geo = next((g for g in geos if g.get("geo_code") == "US"), None)
    geo_id = us_geo["id"] if us_geo else (geos[0]["id"] if geos else None)

    sample_advertisers = [
        "LegalShield", "Morgan & Morgan",
        "Sokolove Law", "Jim Adler & Associates",
        "Ben Crump Law", "TorHoerman Law",
    ]

    for _ in range(40):
        adv = random.choice(advertisers)
        tort = random.choice(torts)
        days_ago = random.randint(0, 14)
        obs_date = today - timedelta(days=days_ago)

        rows.append({
            "source": "tiktok_ads",
            "source_id": f"tiktok_ads_seed_{uuid4().hex[:12]}",
            "advertiser_raw": adv["canonical_name"],
            "advertiser_id": adv["id"],
            "tort_id": tort["id"],
            "tort_raw": tort["slug"],
            "geo_target_id": geo_id,
            "geo_raw": "US",
            "ad_format": "video",
            "creative_url": f"https://www.tiktok.com/@{random.choice(sample_advertisers).lower().replace(' ', '')}/video/{random.randint(7000000000000000000, 7999999999999999999)}",
            "creative_text": random.choice(sample_advertisers),
            "first_seen": obs_date.isoformat(),
            "last_seen": (obs_date + timedelta(days=random.randint(0, 3))).isoformat(),
            "estimated_spend_low": None,
            "estimated_spend_high": None,
            "impression_count": random.randint(1000, 500000),
            "raw_json": json.dumps({"seed": True}),
            "ingested_at": datetime.now(timezone.utc).isoformat(),
        })

    return rows


# ---------------------------------------------------------------------------
# Pipeline steps
# ---------------------------------------------------------------------------

def step_fetch_raw(step) -> list[dict]:
    """Fetch ad observations from TikTok Ads Library via Searchapi.io."""
    torts = supabase_query("torts", {"select": "id,slug,label"})
    advertisers = supabase_query("advertiser_entities", {"select": "id,canonical_name,website,aliases"})
    geos = supabase_query("geo_targets", {"select": "id,geo_name,geo_code"})

    if not torts or not advertisers or not geos:
        raise ValueError(f"Missing dimension data: torts={len(torts)}, advertisers={len(advertisers)}, geos={len(geos)}")

    domain_mapper = DomainMapper(advertisers)
    us_geo = next((g for g in geos if g.get("geo_code") == "US"), None)
    geo_target_id = us_geo["id"] if us_geo else (geos[0]["id"] if geos else None)

    if not SEARCHAPI_API_KEY:
        print("  WARNING: SEARCHAPI_API_KEY not set — using seed data")
        rows = _generate_seed_ads(torts, advertisers, geos)
        step.set_metadata({"source": "seed_data"})
        count = _bulk_insert("ad_observations_raw", rows)
        step.set_counts(rows_in=0, rows_out=count)
        return rows

    rows: list[dict] = []
    total_api_ads = 0
    per_tort_counts: dict[str, int] = {}
    failed_torts: list[str] = []

    tort_by_slug = {t["slug"]: t for t in torts}

    for slug, terms in TORT_SEARCH_TERMS.items():
        tort = tort_by_slug.get(slug)
        if not tort:
            logger.info("  Tort '%s' not found in DB, skipping", slug)
            continue

        tort_count = 0
        try:
            for term in terms:
                logger.info("  Searching TikTok Ads: '%s' (tort: %s)", term, slug)
                response_data = _searchapi_tiktok(term)
                ad_rows = _extract_ads_from_tiktok(
                    response_data, term, slug, tort["id"], geo_target_id, domain_mapper
                )
                total_api_ads += len(ad_rows)
                rows.extend(ad_rows)
                tort_count += len(ad_rows)
                time.sleep(REQUEST_DELAY_SECONDS)
        except Exception as e:
            logger.error("  Tort '%s' failed: %s", slug, e)
            failed_torts.append(slug)

        per_tort_counts[slug] = tort_count

    step.set_metadata({
        "source": "searchapi_tiktok_ads",
        "total_api_ads": total_api_ads,
        "unique_rows": len(rows),
        "per_tort_counts": per_tort_counts,
        "failed_torts": failed_torts,
        "unmatched_domains": list(domain_mapper.unmatched_domains)[:50],
    })

    count = _bulk_insert("ad_observations_raw", rows)
    step.set_counts(rows_in=0, rows_out=count)
    return rows


def step_normalize(step) -> int:
    """Trigger normalization — pass-through.

    Since TikTok Ads rows go into the same ad_observations_raw table,
    normalization is handled by the existing ad_intel_daily pipeline.
    """
    step.set_counts(rows_in=0, rows_out=0)
    step.set_metadata({"note": "Normalization handled by ad_intel_daily pipeline"})
    return 0


def step_score(step) -> int:
    """Scoring pass-through — handled by ad_intel_daily."""
    step.set_counts(rows_in=0, rows_out=0)
    step.set_metadata({"note": "Scoring handled by ad_intel_daily pipeline"})
    return 0


def step_publish(step, raw_count: int):
    """Verify final state."""
    if DRY_RUN:
        step.set_counts(rows_in=raw_count, rows_out=raw_count)
        step.set_metadata({"dry_run": True})
        print("\n  [DRY RUN] Skipping verification")
        return

    total_raw = supabase_count("ad_observations_raw")
    step.set_counts(rows_in=raw_count, rows_out=raw_count)
    step.set_metadata({
        "total_raw_count": total_raw,
        "publish_timestamp": datetime.now(timezone.utc).isoformat(),
    })
    print(f"\n  ad_observations_raw total: {total_raw}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="TikTok Ads daily pipeline (Searchapi.io)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Run without writing to database")
    args = parser.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "true"
        import lib.pipeline
        lib.pipeline.DRY_RUN = True

    trigger = os.environ.get("PIPELINE_TRIGGER", "manual")

    with PipelineRun("tiktok_ads_daily", trigger=trigger) as run:
        with run.step("fetch_raw") as step:
            raw_rows = step_fetch_raw(step)

        with run.step("normalize") as step:
            step_normalize(step)

        with run.step("score") as step:
            step_score(step)

        with run.step("publish") as step:
            step_publish(step, len(raw_rows))


if __name__ == "__main__":
    main()
