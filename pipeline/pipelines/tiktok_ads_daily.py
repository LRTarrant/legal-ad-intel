#!/usr/bin/env python3
"""
tiktok_ads_daily pipeline — TikTok Commercial Content Library (CCL).

Pulls only paid commercial content (real ads, not organic videos) from
TikTok's official Research API → Commercial Content Library and inserts
matching observations into ad_observations_raw with source='tiktok_ads'.

Replaces the prior SearchAPI TikTok scraper, which returned organic
content with ~0% match rate. See lib/tiktok_ccl.py for API details.

Usage:
    python -m pipelines.tiktok_ads_daily
    python -m pipelines.tiktok_ads_daily --dry-run
    DRY_RUN=true python -m pipelines.tiktok_ads_daily

Required environment variables:
    SUPABASE_URL            — Supabase project URL
    SUPABASE_SERVICE_KEY    — Supabase service role key
    TIKTOK_CLIENT_KEY       — TikTok Research API client key
    TIKTOK_CLIENT_SECRET    — TikTok Research API client secret

When TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET are missing, the
fetch_raw step is marked `skipped` (not failed) with a clear reason in
metadata. The pipeline does NOT fall back to any other data source.
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
from lib.domain_mapper import DomainMapper
from lib import tiktok_ccl

logger = logging.getLogger(__name__)

REQUEST_DELAY_SECONDS = 1.5

# Tort → TikTok search keywords. Conservative tort-name keyword list —
# the noisy alias terms tuned for the old organic source were dropped
# because the CCL endpoint already filters to paid commercial content.
TORT_SEARCH_TERMS: dict[str, list[str]] = {
    "camp_lejeune":              ["camp lejeune lawsuit"],
    "hair_relaxer":              ["hair relaxer lawsuit"],
    "roundup":                   ["roundup lawsuit"],
    "talcum_powder":             ["talcum powder lawsuit"],
    "paraquat":                  ["paraquat lawsuit"],
    "firefighter_foam":          ["afff firefighting foam lawsuit"],
    "nec_baby_formula":          ["nec baby formula lawsuit"],
    "tylenol_autism":            ["tylenol autism lawsuit"],
    "zantac":                    ["zantac lawsuit"],
    "hernia_mesh":               ["hernia mesh lawsuit"],
    "social_media_addiction":    ["social media addiction lawsuit"],
    "roblox_abuse":              ["roblox child abuse lawsuit"],
    "depo_provera":              ["depo provera lawsuit"],
    "bair_hugger":               ["bair hugger lawsuit"],
    "glp1_gastroparesis":        ["ozempic lawsuit"],
    "glp1_vision_loss":          ["ozempic vision loss lawsuit"],
    "uber-sexual-assault":       ["uber sexual assault lawsuit"],
    "bard-powerport":            ["bard powerport lawsuit"],
    "lyft-sexual-assault":       ["lyft sexual assault lawsuit"],
    "olympus_scopes":            ["olympus duodenoscope lawsuit"],
    "ai_suicide":                ["AI chatbot lawsuit"],
    "pfas_contamination":        ["PFAS lawsuit"],
    "cpap":                      ["philips cpap lawsuit"],
    "3m_earplugs":               ["3m earplugs lawsuit"],
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


# ---------------------------------------------------------------------------
# CCL → ad_observations_raw row mapping
# ---------------------------------------------------------------------------

def _ccl_ad_to_row(
    ad: dict,
    *,
    keyword: str,
    tort_slug: str,
    tort_id: str,
    geo_target_id: str | None,
    domain_mapper: DomainMapper,
    now: datetime,
) -> dict:
    """Map one CCL response item into the ad_observations_raw schema."""
    advertiser_name = ad.get("advertiser_business_name") or ""
    advertiser_id = (
        domain_mapper.match_name(advertiser_name) if advertiser_name else None
    )
    first_seen = ad.get("first_shown_date") or now.date().isoformat()
    last_seen = ad.get("last_shown_date") or first_seen
    return {
        "source": "tiktok_ads",
        "source_id": (
            f"tiktok_ads:{tort_slug}:{keyword}:{ad['ad_id']}:"
            f"{now.strftime('%Y%m%d')}"
        ),
        "advertiser_raw": advertiser_name or "Unknown",
        "advertiser_id": advertiser_id,
        "tort_id": tort_id,
        "tort_raw": tort_slug,
        "geo_target_id": geo_target_id,
        "geo_raw": ad.get("country_code") or "US",
        "ad_format": "video",
        "creative_url": ad.get("creative_url"),
        "creative_text": ad.get("description"),
        "first_seen": first_seen,
        "last_seen": last_seen,
        "estimated_spend_low": None,
        "estimated_spend_high": None,
        "impression_count": None,
        "raw_json": json.dumps(ad.get("raw", {}), default=str),
        "ingested_at": now.isoformat(),
    }


# ---------------------------------------------------------------------------
# Pipeline steps
# ---------------------------------------------------------------------------

def step_fetch_raw(step) -> list[dict]:
    """Fetch ad observations from the TikTok Commercial Content Library."""
    torts = supabase_query("torts", {"select": "id,slug,label"})
    advertisers = supabase_query(
        "advertiser_entities", {"select": "id,canonical_name,website,aliases"}
    )
    geos = supabase_query("geo_targets", {"select": "id,geo_name,geo_code"})

    if not torts or not advertisers or not geos:
        raise ValueError(
            f"Missing dimension data: torts={len(torts)}, "
            f"advertisers={len(advertisers)}, geos={len(geos)}"
        )

    domain_mapper = DomainMapper(advertisers)
    us_geo = next((g for g in geos if g.get("geo_code") == "US"), None)
    geo_target_id = us_geo["id"] if us_geo else (geos[0]["id"] if geos else None)

    rows: list[dict] = []
    total_api_ads = 0
    per_tort_counts: dict[str, int] = {}
    failed_torts: list[str] = []
    now = datetime.now(timezone.utc)
    tort_by_slug = {t["slug"]: t for t in torts}

    for slug, terms in TORT_SEARCH_TERMS.items():
        tort = tort_by_slug.get(slug)
        if not tort:
            logger.info("  Tort '%s' not found in DB, skipping", slug)
            continue

        tort_count = 0
        try:
            for term in terms:
                logger.info("  CCL search: '%s' (tort: %s)", term, slug)
                ads = tiktok_ccl.fetch_commercial_ads(term, country="US")
                for ad in ads:
                    rows.append(_ccl_ad_to_row(
                        ad,
                        keyword=term, tort_slug=slug, tort_id=tort["id"],
                        geo_target_id=geo_target_id, domain_mapper=domain_mapper,
                        now=now,
                    ))
                total_api_ads += len(ads)
                tort_count += len(ads)
                time.sleep(REQUEST_DELAY_SECONDS)
        except Exception as e:
            logger.error("  Tort '%s' failed: %s", slug, e)
            failed_torts.append(slug)

        per_tort_counts[slug] = tort_count

    pre_dedup_count = len(rows)
    rows = _dedup_rows(rows, ("source", "source_id"))
    step.set_metadata({
        "source": "tiktok_commercial_content_library",
        "total_api_ads": total_api_ads,
        "rows_pre_dedup": pre_dedup_count,
        "unique_rows": len(rows),
        "per_tort_counts": per_tort_counts,
        "failed_torts": failed_torts,
        "unmatched_names": list(domain_mapper.unmatched_names)[:50],
        "matched_count": sum(1 for r in rows if r.get("advertiser_id")),
        "unmatched_count": sum(1 for r in rows if not r.get("advertiser_id")),
    })

    count = _bulk_insert("ad_observations_raw", rows, skip_existing=True)
    step.set_counts(rows_in=0, rows_out=count)
    return rows


def step_normalize(step) -> int:
    """Pass-through — handled by ad_intel_daily."""
    step.set_counts(rows_in=0, rows_out=0)
    step.set_metadata({"note": "Normalization handled by ad_intel_daily pipeline"})
    return 0


def step_score(step) -> int:
    """Pass-through — handled by ad_intel_daily."""
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
    parser = argparse.ArgumentParser(
        description="TikTok Ads daily pipeline (Commercial Content Library)"
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Run without writing to database")
    args = parser.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "true"
        import lib.pipeline
        lib.pipeline.DRY_RUN = True

    trigger = os.environ.get("PIPELINE_TRIGGER", "manual")

    with PipelineRun("tiktok_ads_daily", trigger=trigger) as run:
        if not tiktok_ccl.credentials_present():
            # Fail-fast at runtime with a clear, actionable message in
            # the run record. We mark every step skipped instead of
            # failing the whole run, so dashboards stay green and the
            # missing-secrets state is obvious without grepping logs.
            reason = (
                "TIKTOK_CLIENT_KEY and/or TIKTOK_CLIENT_SECRET not configured. "
                "Pipeline cannot reach the TikTok Commercial Content Library. "
                "Add both secrets to GitHub Actions; do NOT fall back to any "
                "other data source — the prior SearchAPI source returned "
                "noise (~0% advertiser match) and was retired."
            )
            print(f"\n  SKIPPING: {reason}")
            for step_name in ("fetch_raw", "normalize", "score", "publish"):
                run.skip_step(step_name, reason=reason)
            return

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
