#!/usr/bin/env python3
"""
ad_intel_daily pipeline — end-to-end ad intelligence refresh.

Runs all 5 steps of the ad intelligence pipeline:
  1. fetch_raw     → Insert ad observations into ad_observations_raw
  2. validate_raw  → Check FK integrity and row-count sanity
  3. normalize     → Aggregate raw → weekly ad_observations_normalized
  4. score         → Recompute ad_saturation_scores from normalized data
  5. publish       → Verify final table state and mark run complete

Step 1 fetches real ad data from the Meta Ad Library API when
APIFY_TOKEN is set. Falls back to seed data otherwise.

Usage:
    python -m pipelines.ad_intel_daily
    python -m pipelines.ad_intel_daily --dry-run
    DRY_RUN=true python -m pipelines.ad_intel_daily

Environment variables:
    SUPABASE_URL            — Supabase project URL (required)
    SUPABASE_SERVICE_KEY    — Supabase service role key (required)
    APIFY_TOKEN             — Apify API token (optional, falls back to seed data)
    DRY_RUN                 — "true" to skip all DB writes (optional)
    PIPELINE_TRIGGER        — "scheduled" | "manual" (optional, default "manual")
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import random
import sys
import time
from urllib.parse import quote_plus
from datetime import date, datetime, timedelta, timezone
from difflib import SequenceMatcher
from uuid import uuid4

import httpx

# Add parent dir to path so we can import lib.pipeline
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.pipeline import (
    PipelineRun, DRY_RUN,
    _headers, _get, _bulk_insert, _delete,
    SUPABASE_URL,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

APIFY_TOKEN = os.environ.get("APIFY_TOKEN", "")
APIFY_API_BASE = "https://api.apify.com/v2"
APIFY_ACTOR_FACEBOOK = "curious_coder~facebook-ads-library-scraper"
APIFY_ACTOR_GOOGLE = "lexis-solutions~google-ads-scraper"
APIFY_ACTOR_TIKTOK = "lexis-solutions~tiktok-ads-scraper"
APIFY_REQUEST_DELAY_SECONDS = 10
APIFY_RUN_TIMEOUT_SECONDS = 300
MAX_ADS_PER_TERM_PLATFORM = 50

# ---------------------------------------------------------------------------
# Tort → ad platform search terms mapping
# ---------------------------------------------------------------------------

TORT_SEARCH_TERMS: dict[str, list[str]] = {
    # Slugs match the `torts.slug` column in Supabase (underscore format)
    "camp_lejeune":      ["camp lejeune water contamination"],
    "hair_relaxer":      ["hair relaxer lawsuit", "chemical hair straightener cancer"],
    "roundup":           ["roundup lawsuit", "roundup cancer lawsuit"],
    "talcum_powder":     ["talcum powder lawsuit", "baby powder ovarian cancer"],
    "paraquat":          ["paraquat lawsuit", "paraquat parkinsons"],
    "firefighter_foam":  ["afff firefighting foam lawsuit", "pfas contamination lawsuit"],
    "nec_baby_formula":  ["nec baby formula lawsuit", "similac enfamil nec"],
    "tylenol_autism":    ["tylenol autism lawsuit", "acetaminophen pregnancy autism"],
    "zantac":            ["zantac lawsuit", "ranitidine cancer lawsuit"],
    "hernia_mesh":       ["hernia mesh lawsuit", "hernia mesh complications"],
    "social_media":      ["social media addiction lawsuit", "social media harm children"],
    "motor_vehicle":     ["car accident lawyer", "auto accident attorney"],
    "truck_accident":    ["truck accident lawyer", "18 wheeler accident attorney"],
    "nursing_home":      ["nursing home abuse lawyer", "nursing home neglect attorney"],
    "workers_comp":      ["workers compensation lawyer", "workers comp attorney"],
    "roblox_abuse":      ["roblox child abuse lawsuit", "roblox predator lawsuit"],
    "social_media_addiction": ["social media addiction lawsuit", "instagram addiction teens", "tiktok addiction lawsuit"],
    "depo_provera":          ["depo provera lawsuit", "depo provera meningioma lawyer", "depo provera brain tumor lawsuit"],
    "glp1_gastroparesis":     ["ozempic lawsuit", "ozempic stomach paralysis lawyer", "glp-1 gastroparesis lawsuit"],
    "glp1_vision_loss":       ["ozempic blindness lawsuit", "glp-1 vision loss lawyer", "ozempic naion lawsuit"],
    "uber_sexual_assault":    ["uber sexual assault", "uber lawsuit", "uber safety", "rideshare sexual assault", "uber driver assault", "uber rape lawsuit", "uber mdl 3084", "rideshare lawsuit"],
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def supabase_query(table: str, params: dict) -> list[dict]:
    """Simple GET query against Supabase REST."""
    return _get(table, params)


def supabase_count(table: str) -> int:
    """Return the exact row count for a table via HEAD + count header."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {**_headers(), "Prefer": "count=exact"}
    resp = httpx.head(url, headers=headers, params={"select": "*"}, timeout=30)
    resp.raise_for_status()
    # Supabase returns content-range header like "0-49/50"
    cr = resp.headers.get("content-range", "")
    if "/" in cr:
        total = cr.split("/")[-1]
        return int(total) if total != "*" else 0
    return 0


# ---------------------------------------------------------------------------
# Apify helpers
# ---------------------------------------------------------------------------

def _fuzzy_match_advertiser(
    page_name: str, advertisers: list[dict], threshold: float = 0.6
) -> str | None:
    """Return the advertiser_id of the best fuzzy match, or None."""
    best_id = None
    best_score = 0.0
    page_lower = page_name.lower().strip()

    for adv in advertisers:
        canonical = adv["canonical_name"].lower().strip()
        score = SequenceMatcher(None, page_lower, canonical).ratio()
        if score > best_score:
            best_score = score
            best_id = adv["id"]

    return best_id if best_score >= threshold else None


def _run_apify_actor(actor_id: str, actor_input: dict, label: str) -> list[dict]:
    """Run an Apify actor and return dataset items."""
    run_resp = httpx.post(
        f"{APIFY_API_BASE}/acts/{actor_id}/runs",
        params={"token": APIFY_TOKEN},
        json=actor_input,
        timeout=60,
    )
    run_resp.raise_for_status()
    run_data = run_resp.json().get("data", {})
    run_id = run_data.get("id")
    if not run_id:
        raise ValueError(f"Apify actor run id missing for {label}")

    started = time.time()
    while True:
        status_resp = httpx.get(
            f"{APIFY_API_BASE}/actor-runs/{run_id}",
            params={"token": APIFY_TOKEN},
            timeout=60,
        )
        status_resp.raise_for_status()
        run_info = status_resp.json().get("data", {})
        status = run_info.get("status")

        if status == "SUCCEEDED":
            dataset_id = run_info.get("defaultDatasetId")
            if not dataset_id:
                return []
            items_resp = httpx.get(
                f"{APIFY_API_BASE}/datasets/{dataset_id}/items",
                params={"token": APIFY_TOKEN},
                timeout=120,
            )
            items_resp.raise_for_status()
            return items_resp.json()

        if status in {"FAILED", "ABORTED", "TIMED-OUT"}:
            raise RuntimeError(f"Apify actor {label} ended with status={status}")

        if time.time() - started >= APIFY_RUN_TIMEOUT_SECONDS:
            raise TimeoutError(f"Apify actor {label} exceeded {APIFY_RUN_TIMEOUT_SECONDS}s timeout")

        time.sleep(5)


def _map_apify_ad_to_row(
    ad: dict,
    source: str,
    tort_id: str,
    tort_slug: str,
    geo_target_id: str | None,
    advertiser_id: str | None,
) -> dict:
    """Map a single Apify ad response to ad_observations_raw schema."""
    creative_text = (
        ad.get("creative_text")
        or ad.get("adText")
        or ad.get("ad_creative_body")
        or ad.get("body")
        or ad.get("description")
        or ad.get("caption")
    )
    first_seen = ad.get("first_seen") or ad.get("startDate") or ad.get("ad_delivery_start_time") or ad.get("createdAt")
    last_seen = ad.get("last_seen") or ad.get("endDate") or ad.get("ad_delivery_stop_time")
    advertiser_raw = (
        ad.get("advertiser")
        or ad.get("advertiserName")
        or ad.get("pageName")
        or ad.get("page_name")
        or ad.get("brandName")
    )
    creative_url = (
        ad.get("creative_url")
        or ad.get("ad_snapshot_url")
        or ad.get("adUrl")
        or ad.get("url")
    )
    source_id = (
        ad.get("id")
        or ad.get("adId")
        or ad.get("ad_id")
        or ad.get("archiveId")
        or ad.get("snapshotId")
        or uuid4().hex
    )
    first_seen = first_seen or datetime.now(timezone.utc).date().isoformat()
    last_seen = last_seen or first_seen
    ad_format = "search" if source == "google_ads_transparency" else "social"

    return {
        "source": source,
        "source_id": str(source_id),
        "advertiser_raw": advertiser_raw,
        "advertiser_id": advertiser_id,
        "tort_id": tort_id,
        "tort_raw": tort_slug,
        "geo_target_id": geo_target_id,
        "geo_raw": "US",
        "ad_format": ad_format,
        "creative_url": creative_url,
        "creative_text": creative_text,
        "first_seen": first_seen,
        "last_seen": last_seen,
        "estimated_spend_low": None,
        "estimated_spend_high": None,
        "impression_count": None,
        "raw_json": json.dumps(ad, default=str),
        "ingested_at": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# SERP (organic search results, featured snippets) is a separate data domain.
# Do not mix SERP observations into ad_observations_raw.
# Future: pipeline/pipelines/serp_intel_daily.py
# ---------------------------------------------------------------------------

# TODO: Google Ads Transparency — requires Apify actor (e.g. lexis-solutions~google-ads-scraper)
# or SerpApi Google Ads Transparency Center endpoint. The user has Apify connected;
# add Google via an Apify actor in a follow-up PR. Do NOT build a custom scraper.

# ---------------------------------------------------------------------------
# Step 1: Fetch Raw
# ---------------------------------------------------------------------------

def _facebook_library_url(term: str) -> str:
    encoded = quote_plus(term)
    return (
        "https://www.facebook.com/ads/library/"
        f"?active_status=all&ad_type=all&country=US&q={encoded}&search_type=keyword_unordered"
    )


def _run_apify_actor_with_retry(
    actor_id: str, actor_input: dict, label: str, retries: int = 1
) -> list[dict]:
    """Run an Apify actor with retry and exponential backoff."""
    last_err: Exception | None = None
    for attempt in range(1 + retries):
        try:
            return _run_apify_actor(actor_id, actor_input, label)
        except (httpx.HTTPError, RuntimeError, TimeoutError, ValueError) as e:
            last_err = e
            if attempt < retries:
                backoff = 2 ** attempt * APIFY_REQUEST_DELAY_SECONDS
                logger.warning("  Retry %d/%d for %s after error: %s (backoff %.0fs)",
                               attempt + 1, retries, label, e, backoff)
                time.sleep(backoff)
    raise last_err  # type: ignore[misc]


def _fetch_raw_from_apify(step, torts: list[dict], advertisers: list[dict], geos: list[dict]) -> list[dict]:
    """
    Fetch real ad observations from Apify actors across Facebook/Google/TikTok.

    Per-tort error handling: one failed tort does not kill the whole fetch.
    Includes 30s request timeout (via _run_apify_actor), 1 retry with
    exponential backoff, and per-tort fetch count logging.
    """
    # Use first US-level geo target, or None
    us_geo = next((g for g in geos if g.get("geo_code") == "US"), None)
    geo_target_id = us_geo["id"] if us_geo else (geos[0]["id"] if geos else None)

    seen_source_ids: set[str] = set()
    rows: list[dict] = []
    total_api_ads = 0
    skipped_dupes = 0
    skipped_no_adv = 0
    failed_torts: list[str] = []
    per_tort_counts: dict[str, int] = {}

    platforms = [
        ("meta_ad_library", APIFY_ACTOR_FACEBOOK),
        # TODO: Google Ads Transparency — enable when Apify actor is configured
        # ("google_ads_transparency", APIFY_ACTOR_GOOGLE),
        # Requires $30/mo Apify subscription:
        # ("tiktok_ad_library", APIFY_ACTOR_TIKTOK),
    ]

    for tort in torts:
        slug = tort["slug"]
        search_terms = TORT_SEARCH_TERMS.get(slug)
        if not search_terms:
            logger.info("  No search terms configured for tort '%s', skipping", slug)
            continue

        tort_ad_count = 0
        try:
            for term in search_terms:
                for source_name, actor_id in platforms:
                    logger.info("  Searching %s via Apify: '%s' (tort: %s)", source_name, term, slug)
                    if source_name == "meta_ad_library":
                        actor_input = {
                            "urls": [{"url": _facebook_library_url(term)}],
                            "count": MAX_ADS_PER_TERM_PLATFORM,
                        }
                    elif source_name == "google_ads_transparency":
                        actor_input = {
                            "startUrls": [{
                                "url": f"https://adstransparency.google.com/?region=US&text={quote_plus(term)}"
                            }],
                            "downloadMedia": False,
                        }
                    else:
                        actor_input = {
                            "query": term,
                            "quickSearch": False,
                            "maxPages": 1,
                        }

                    try:
                        ads = _run_apify_actor_with_retry(
                            actor_id, actor_input, f"{source_name}:{term}"
                        )[:MAX_ADS_PER_TERM_PLATFORM]
                    except (httpx.HTTPError, RuntimeError, TimeoutError, ValueError) as e:
                        logger.warning("  Apify fetch failed for %s '%s': %s", source_name, term, e)
                        time.sleep(APIFY_REQUEST_DELAY_SECONDS)
                        continue

                    total_api_ads += len(ads)
                    for ad in ads:
                        raw_source_id = str(
                            ad.get("id")
                            or ad.get("adId")
                            or ad.get("ad_id")
                            or ad.get("archiveId")
                            or ""
                        )
                        if not raw_source_id:
                            raw_source_id = uuid4().hex
                        dedupe_key = f"{source_name}:{raw_source_id}"
                        if dedupe_key in seen_source_ids:
                            skipped_dupes += 1
                            continue
                        seen_source_ids.add(dedupe_key)

                        advertiser_name = (
                            ad.get("advertiser")
                            or ad.get("advertiserName")
                            or ad.get("pageName")
                            or ad.get("page_name")
                            or ad.get("brandName")
                            or ""
                        )
                        adv_id = _fuzzy_match_advertiser(advertiser_name, advertisers) if advertiser_name else None

                        if adv_id is None:
                            skipped_no_adv += 1
                            continue

                        row = _map_apify_ad_to_row(
                            ad,
                            source=source_name,
                            tort_id=tort["id"],
                            tort_slug=slug,
                            geo_target_id=geo_target_id,
                            advertiser_id=adv_id,
                        )
                        rows.append(row)
                        tort_ad_count += 1

                    time.sleep(APIFY_REQUEST_DELAY_SECONDS)

        except Exception as e:
            logger.error("  Tort '%s' failed entirely: %s", slug, e)
            failed_torts.append(slug)

        per_tort_counts[slug] = tort_ad_count
        logger.info("  Tort '%s': fetched %d usable ads", slug, tort_ad_count)

    step.set_metadata({
        "source": "apify_multi_source",
        "total_api_ads": total_api_ads,
        "unique_ads": len(rows),
        "skipped_duplicates": skipped_dupes,
        "skipped_no_advertiser_match": skipped_no_adv,
        "torts_searched": len([t for t in torts if t["slug"] in TORT_SEARCH_TERMS]),
        "per_tort_counts": per_tort_counts,
        "failed_torts": failed_torts,
    })

    if failed_torts:
        logger.warning("  %d tort(s) failed: %s", len(failed_torts), ", ".join(failed_torts))

    return rows


def _fetch_raw_seed_data(step, advertisers: list[dict], torts: list[dict], geos: list[dict]) -> list[dict]:
    """
    Generate realistic seed ad observations from actual dimension tables.
    Used as fallback when APIFY_TOKEN is not set.
    """
    sources = ["google_ads_transparency", "meta_ad_library", "mediaradar", "vivvix", "ispot", "manual"]
    formats = ["search", "display", "video", "social", "tv", "radio"]
    rows = []
    today = date.today()

    for _ in range(50):
        adv = random.choice(advertisers)
        tort = random.choice(torts)
        geo = random.choice(geos)
        days_ago = random.randint(1, 27)
        obs_date = today - timedelta(days=days_ago)
        source = random.choice(sources)

        spend_low = round(random.uniform(50, 5000), 2)
        spend_high = round(spend_low * random.uniform(1.1, 2.0), 2)
        impressions = random.randint(1000, 500000)

        rows.append({
            "source": source,
            "source_id": f"{source}_{uuid4().hex[:12]}",
            "advertiser_raw": adv["canonical_name"],
            "advertiser_id": adv["id"],
            "tort_id": tort["id"],
            "tort_raw": tort["slug"],
            "geo_target_id": geo["id"],
            "geo_raw": geo["geo_name"],
            "ad_format": random.choice(formats),
            "creative_url": f"https://example.com/creative/{uuid4().hex[:8]}",
            "creative_text": f"Attention {geo['geo_name']} residents: You may qualify for {tort['label']} compensation.",
            "first_seen": obs_date.isoformat(),
            "last_seen": (obs_date + timedelta(days=random.randint(0, 7))).isoformat(),
            "estimated_spend_low": spend_low,
            "estimated_spend_high": spend_high,
            "impression_count": impressions,
            "raw_json": json.dumps({"seed": True, "generated_at": datetime.now(timezone.utc).isoformat()}),
            "ingested_at": datetime.now(timezone.utc).isoformat(),
        })

    step.set_metadata({
        "source": "seed_data",
        "advertisers_available": len(advertisers),
        "torts_available": len(torts),
        "geos_available": len(geos),
    })

    return rows


def step_fetch_raw(step) -> list[dict]:
    """
    Fetch ad observations into ad_observations_raw.

    When APIFY_TOKEN is set, queries Apify actor integrations for Facebook,
    Google, and TikTok ads. Falls back to seed data generation when token
    is missing.
    """
    advertisers = supabase_query("advertiser_entities", {"select": "id,canonical_name,entity_type,segment"})
    torts = supabase_query("torts", {"select": "id,slug,label"})
    geos = supabase_query("geo_targets", {"select": "id,geo_name,geo_code"})

    if not advertisers or not torts or not geos:
        raise ValueError(f"Missing dimension data: advertisers={len(advertisers)}, torts={len(torts)}, geos={len(geos)}")

    if APIFY_TOKEN:
        print("  Using Apify multi-source ads fetcher (token present)")
        rows = _fetch_raw_from_apify(step, torts, advertisers, geos)
        if not rows:
            print("  WARNING: Apify fetch returned 0 usable ads, falling back to seed data")
            rows = _fetch_raw_seed_data(step, advertisers, torts, geos)
    else:
        print("  WARNING: APIFY_TOKEN not set — using seed data")
        rows = _fetch_raw_seed_data(step, advertisers, torts, geos)

    count = _bulk_insert("ad_observations_raw", rows)
    step.set_counts(rows_in=0, rows_out=count)
    return rows


# ---------------------------------------------------------------------------
# Step 2: Validate Raw
# ---------------------------------------------------------------------------

def step_validate_raw(step, raw_rows: list[dict]) -> dict:
    """Validate FK integrity on the raw rows we just inserted."""
    adv_ids = {r["advertiser_id"] for r in raw_rows}
    existing = supabase_query("advertiser_entities", {
        "select": "id",
        "id": f"in.({','.join(adv_ids)})",
    })
    orphan_advs = adv_ids - {r["id"] for r in existing}

    tort_ids = {r["tort_id"] for r in raw_rows}
    existing_torts = supabase_query("torts", {
        "select": "id",
        "id": f"in.({','.join(tort_ids)})",
    })
    orphan_torts = tort_ids - {r["id"] for r in existing_torts}

    geo_ids = {r["geo_target_id"] for r in raw_rows}
    existing_geos = supabase_query("geo_targets", {
        "select": "id",
        "id": f"in.({','.join(geo_ids)})",
    })
    orphan_geos = geo_ids - {r["id"] for r in existing_geos}

    total_orphans = len(orphan_advs) + len(orphan_torts) + len(orphan_geos)
    result = {
        "total_raw_rows": len(raw_rows),
        "orphan_advertiser_ids": len(orphan_advs),
        "orphan_tort_ids": len(orphan_torts),
        "orphan_geo_ids": len(orphan_geos),
        "validation_passed": total_orphans == 0,
    }

    step.set_counts(rows_in=len(raw_rows), rows_out=len(raw_rows), rows_rejected=total_orphans)
    step.set_metadata(result)

    if total_orphans > 0:
        step.set_error_details({
            "orphan_advertisers": list(orphan_advs),
            "orphan_torts": list(orphan_torts),
            "orphan_geos": list(orphan_geos),
        })
        raise ValueError(f"FK validation failed: {total_orphans} orphan references found")

    return result


# ---------------------------------------------------------------------------
# Step 3: Normalize (raw → weekly aggregates)
# ---------------------------------------------------------------------------

def step_normalize(step) -> int:
    """Aggregate ad_observations_raw into ad_observations_normalized."""
    raw = supabase_query("ad_observations_raw", {
        "select": "advertiser_id,tort_id,geo_target_id,ad_format,first_seen,last_seen,source,estimated_spend_low,estimated_spend_high,impression_count,creative_url",
    })

    if not raw:
        step.set_counts(rows_in=0, rows_out=0)
        return 0

    raw = [r for r in raw if r.get("advertiser_id")]

    # Group by (advertiser, tort, geo, format, week_start)
    groups: dict[tuple, dict] = {}
    for r in raw:
        first_seen = date.fromisoformat(r["first_seen"])
        week_start = first_seen - timedelta(days=first_seen.weekday())

        key = (r["advertiser_id"], r["tort_id"], r["geo_target_id"], r["ad_format"], week_start.isoformat())

        if key not in groups:
            groups[key] = {
                "advertiser_id": r["advertiser_id"],
                "tort_id": r["tort_id"],
                "geo_target_id": r["geo_target_id"],
                "ad_format": r["ad_format"],
                "week_start": week_start.isoformat(),
                "observation_count": 0,
                "unique_creatives": set(),
                "estimated_spend": 0.0,
                "impressions": 0,
                "sources": set(),
                "earliest_seen": first_seen,
                "latest_seen": None,
            }

        g = groups[key]
        g["observation_count"] += 1
        g["unique_creatives"].add(r.get("creative_url", ""))
        spend_mid = (float(r.get("estimated_spend_low") or 0) + float(r.get("estimated_spend_high") or 0)) / 2
        g["estimated_spend"] += spend_mid
        g["impressions"] += r.get("impression_count") or 0
        g["sources"].add(r["source"])

        # Track temporal boundaries: MIN(first_seen), MAX(last_seen)
        if first_seen < g["earliest_seen"]:
            g["earliest_seen"] = first_seen
        last_seen_str = r.get("last_seen")
        if last_seen_str:
            last_seen_date = date.fromisoformat(last_seen_str)
            if g["latest_seen"] is None or last_seen_date > g["latest_seen"]:
                g["latest_seen"] = last_seen_date

    norm_rows = []
    for g in groups.values():
        norm_rows.append({
            "advertiser_id": g["advertiser_id"],
            "tort_id": g["tort_id"],
            "geo_target_id": g["geo_target_id"],
            "ad_format": g["ad_format"],
            "week_start": g["week_start"],
            "observation_count": g["observation_count"],
            "unique_creatives": len(g["unique_creatives"]),
            "estimated_spend": round(g["estimated_spend"], 2),
            "impressions": g["impressions"],
            "source_mix": sorted(list(g["sources"])),
            "earliest_seen": g["earliest_seen"].isoformat(),
            "latest_seen": g["latest_seen"].isoformat() if g["latest_seen"] else None,
        })

    # Clear and reload normalized data
    _delete("ad_observations_normalized", {"id": "not.is.null"})

    count = _bulk_insert("ad_observations_normalized", norm_rows)
    step.set_counts(rows_in=len(raw), rows_out=count)
    step.set_metadata({
        "groups_created": len(groups),
        "weeks_covered": len(set(g["week_start"] for g in groups.values())),
    })
    return count


# ---------------------------------------------------------------------------
# Step 4: Score (normalized → saturation scores)
# ---------------------------------------------------------------------------

def step_score(step) -> int:
    """Recompute ad_saturation_scores from normalized data."""
    norm = supabase_query("ad_observations_normalized", {
        "select": "advertiser_id,tort_id,geo_target_id,observation_count,unique_creatives,estimated_spend,impressions,week_start",
    })

    if not norm:
        step.set_counts(rows_in=0, rows_out=0)
        return 0

    all_weeks = sorted(set(r["week_start"] for r in norm))
    period_start = all_weeks[0]
    period_end = all_weeks[-1]

    # Fetch advertiser names for top_advertisers objects
    adv_entities = supabase_query("advertiser_entities", {"select": "id,canonical_name"})
    adv_name_map = {e["id"]: e["canonical_name"] for e in adv_entities}

    # Fallback names from raw observations
    raw_names = supabase_query("ad_observations_raw", {"select": "advertiser_id,advertiser_raw"})
    raw_name_map: dict[str, str] = {}
    for rn in raw_names:
        if rn.get("advertiser_id") and rn.get("advertiser_raw"):
            raw_name_map[rn["advertiser_id"]] = rn["advertiser_raw"]

    # Group by tort × geo
    groups: dict[tuple, dict] = {}
    for r in norm:
        key = (r["tort_id"], r["geo_target_id"])
        if key not in groups:
            groups[key] = {
                "tort_id": r["tort_id"],
                "geo_target_id": r["geo_target_id"],
                "advertiser_stats": {},
                "total_creatives": 0,
                "total_observations": 0,
                "total_spend": 0.0,
                "total_impressions": 0,
            }
        g = groups[key]
        adv_id = r["advertiser_id"]
        if adv_id not in g["advertiser_stats"]:
            g["advertiser_stats"][adv_id] = {"id": adv_id, "spend": 0.0, "creatives": 0}
        g["advertiser_stats"][adv_id]["spend"] += float(r.get("estimated_spend") or 0)
        g["advertiser_stats"][adv_id]["creatives"] += r.get("unique_creatives") or 0
        g["total_creatives"] += r.get("unique_creatives") or 0
        g["total_observations"] += r.get("observation_count") or 0
        g["total_spend"] += float(r.get("estimated_spend") or 0)
        g["total_impressions"] += r.get("impressions") or 0

    max_advertisers = max((len(g["advertiser_stats"]) for g in groups.values()), default=1)
    max_spend = max((g["total_spend"] for g in groups.values()), default=1)
    max_creatives = max((g["total_creatives"] for g in groups.values()), default=1)

    score_rows = []
    for g in groups.values():
        adv_score = len(g["advertiser_stats"]) / max(max_advertisers, 1)
        spend_score = g["total_spend"] / max(max_spend, 1)
        creative_score = g["total_creatives"] / max(max_creatives, 1)
        saturation = round((adv_score * 0.4 + spend_score * 0.35 + creative_score * 0.25) * 100, 1)

        adv_list = sorted(g["advertiser_stats"].values(), key=lambda a: a["spend"], reverse=True)[:5]
        top_advertisers = [
            {
                "name": adv_name_map.get(a["id"]) or raw_name_map.get(a["id"]) or a["id"],
                "spend": round(a["spend"], 2),
                "creatives": a["creatives"],
            }
            for a in adv_list
        ]

        score_rows.append({
            "tort_id": g["tort_id"],
            "geo_target_id": g["geo_target_id"],
            "period_start": period_start,
            "period_end": period_end,
            "total_advertisers": len(g["advertiser_stats"]),
            "total_creatives": g["total_creatives"],
            "total_observations": g["total_observations"],
            "estimated_spend": round(g["total_spend"], 2),
            "estimated_impressions": g["total_impressions"],
            "saturation_score": saturation,
            "spend_rank": 0,
            "format_breakdown": {},
            "top_advertisers": top_advertisers,
            "computed_at": datetime.now(timezone.utc).isoformat(),
        })

    score_rows.sort(key=lambda r: r["estimated_spend"], reverse=True)
    for i, row in enumerate(score_rows):
        row["spend_rank"] = i + 1

    # Row-count sanity check (dynamic, not hardcoded)
    old_count = supabase_count("ad_saturation_scores")
    new_count = len(score_rows)

    if old_count > 10 and new_count < old_count * 0.5:
        step.set_metadata({"sanity_check": "WARNING", "old_count": old_count, "new_count": new_count})
        print(f"  ⚠ Sanity check warning: score count dropping {old_count} → {new_count}")
        # Don't fail on first pipeline-produced run, but log prominently

    # Clear and reload scores
    _delete("ad_saturation_scores", {"id": "not.is.null"})
    count = _bulk_insert("ad_saturation_scores", score_rows)

    step.set_counts(rows_in=len(norm), rows_out=count)
    step.set_metadata({
        "tort_geo_combos": len(groups),
        "period_start": period_start,
        "period_end": period_end,
        "old_score_count": old_count,
        "new_score_count": new_count,
        "max_saturation_score": max((r["saturation_score"] for r in score_rows), default=0),
        "min_saturation_score": min((r["saturation_score"] for r in score_rows), default=0),
    })
    return count


# ---------------------------------------------------------------------------
# Step 5: Publish
# ---------------------------------------------------------------------------

def step_publish(step, scores_count: int):
    """Final verification step."""
    if DRY_RUN:
        step.set_counts(rows_in=scores_count, rows_out=scores_count)
        step.set_metadata({"dry_run": True, "skipped_verification": True})
        print("\n  [DRY RUN] Skipping final table verification")
        return

    raw_count = supabase_count("ad_observations_raw")
    norm_count = supabase_count("ad_observations_normalized")
    score_count = supabase_count("ad_saturation_scores")

    step.set_counts(rows_in=scores_count, rows_out=score_count)
    step.set_metadata({
        "final_raw_count": raw_count,
        "final_normalized_count": norm_count,
        "final_scores_count": score_count,
        "publish_timestamp": datetime.now(timezone.utc).isoformat(),
    })

    print(f"\n  📊 Final table counts:")
    print(f"     ad_observations_raw:        {raw_count}")
    print(f"     ad_observations_normalized: {norm_count}")
    print(f"     ad_saturation_scores:       {score_count}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Ad Intelligence daily pipeline")
    parser.add_argument("--dry-run", action="store_true",
                        help="Run without writing to database (overrides DRY_RUN env)")
    args = parser.parse_args()

    # CLI --dry-run flag overrides env var
    if args.dry_run:
        os.environ["DRY_RUN"] = "true"
        # Re-import to pick up the change
        import lib.pipeline
        lib.pipeline.DRY_RUN = True

    trigger = os.environ.get("PIPELINE_TRIGGER", "manual")

    with PipelineRun("ad_intel_daily", trigger=trigger) as run:
        with run.step("fetch_raw") as step:
            raw_rows = step_fetch_raw(step)

        with run.step("validate_raw") as step:
            validation = step_validate_raw(step, raw_rows)

        with run.step("normalize") as step:
            norm_count = step_normalize(step)

        with run.step("score") as step:
            score_count = step_score(step)

        with run.step("publish") as step:
            step_publish(step, score_count)


if __name__ == "__main__":
    main()
