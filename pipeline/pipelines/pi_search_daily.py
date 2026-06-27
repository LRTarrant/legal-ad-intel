#!/usr/bin/env python3
"""
pi_search_daily pipeline — PI search advertising intelligence.

Performs geo-targeted Google searches for personal injury keywords,
extracts paid ad results, and builds competitor profiles by state.

Usage:
    python -m pipelines.pi_search_daily
    python -m pipelines.pi_search_daily --dry-run
    DRY_RUN=true python -m pipelines.pi_search_daily

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
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.pipeline import (
    PipelineRun, DRY_RUN,
    _get, _bulk_insert,
    SUPABASE_URL, _headers,
)
from lib.api_usage import log_api_call
from lib.api_pricing import get_searchapi_pricing
from lib.domain_mapper import extract_root_domain


def _log_searchapi_call(engine: str, query: str, location: str) -> None:
    """Record a Searchapi.io call. Never raises."""
    pricing = get_searchapi_pricing()
    log_api_call(
        provider="searchapi",
        operation=f"searchapi_{engine}",
        model_or_actor=engine,
        units_consumed=1,
        unit_type="searches",
        cost_usd=pricing["rate_per_unit_usd"],
        called_from="pipelines.pi_search_daily",
        metadata={"engine": engine, "q": query, "location": location},
    )

logger = logging.getLogger(__name__)

SEARCHAPI_API_KEY = os.environ.get("SEARCHAPI_API_KEY", "")
SEARCHAPI_BASE = "https://www.searchapi.io/api/v1/search"
REQUEST_DELAY_SECONDS = 1.5
MAX_RETRIES = 3


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

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


def _searchapi_google(query: str, location: str) -> dict:
    """Call Searchapi.io Google Search with geo-targeting."""
    if not SEARCHAPI_API_KEY:
        return {}

    for attempt in range(MAX_RETRIES):
        try:
            resp = httpx.get(SEARCHAPI_BASE, params={
                "engine": "google",
                "q": query,
                "api_key": SEARCHAPI_API_KEY,
                "location": location,
                "gl": "us",
                "hl": "en",
                "num": 20,
            }, timeout=30)

            if resp.status_code == 429:
                backoff = 2 ** attempt * REQUEST_DELAY_SECONDS
                logger.warning("Rate limited on query '%s', backing off %.1fs", query, backoff)
                time.sleep(backoff)
                continue

            resp.raise_for_status()
            _log_searchapi_call("google", query, location)
            return resp.json()
        except httpx.HTTPError as e:
            if attempt < MAX_RETRIES - 1:
                logger.warning("Searchapi error for '%s': %s, retrying", query, e)
                time.sleep(2 ** attempt * REQUEST_DELAY_SECONDS)
            else:
                logger.error("Searchapi failed for '%s' after %d attempts: %s", query, MAX_RETRIES, e)
    return {}


def _extract_advertiser_name(ad: dict) -> str:
    """Extract advertiser name from ad title (text before first | or —)."""
    title = ad.get("title", "")
    for sep in ["|", "—", "–", "-"]:
        if sep in title:
            return title.split(sep)[0].strip()
    return title.strip()


def _extract_ads(serp_data: dict, metro: dict, case_type: str,
                 keyword: str) -> list[dict]:
    """Extract ad observations from a Searchapi.io response."""
    ads = serp_data.get("ads", [])
    rows = []
    now = datetime.now(timezone.utc)

    for i, ad in enumerate(ads):
        link = ad.get("link", "")
        displayed_link = ad.get("displayed_link", "")
        domain = extract_root_domain(link or displayed_link)
        if not domain:
            continue

        rows.append({
            "metro_id": metro["id"],
            "case_type": case_type,
            "keyword_used": keyword,
            "advertiser_domain": domain,
            "advertiser_name": _extract_advertiser_name(ad),
            "ad_position": i + 1,
            "ad_title": ad.get("title", ""),
            "ad_description": ad.get("description", ""),
            "ad_link": link or None,
            "observed_at": now.isoformat(),
            "observed_date": now.date().isoformat(),
            "source": "searchapi_google",
            "raw_json": json.dumps(ad, default=str),
        })

    return rows


def _generate_seed_observations(metros: list[dict],
                                clusters: list[dict]) -> list[dict]:
    """Generate realistic seed data when SEARCHAPI_API_KEY is not set."""
    import random
    from datetime import timedelta

    rows = []
    now = datetime.now(timezone.utc)

    # Well-known PI firms with realistic domains
    firms = [
        ("Morgan & Morgan", "forthepeople.com"),
        ("Alexander Shunnarah", "alexandershunnarah.com"),
        ("Morris Bart", "morrisbart.com"),
        ("Beasley Allen", "beasleyallen.com"),
        ("Ben Crump Law", "bencrump.com"),
        ("Hupy and Abraham", "hupy.com"),
        ("Cellino Law", "cellinolaw.com"),
        ("Sokolove Law", "sokolovelaw.com"),
        ("Rosenfeld Injury Lawyers", "rosenfeldinjurylawyers.com"),
        ("Jacoby & Meyers", "jacobyandmeyers.com"),
        ("Arnold & Itkin", "arnolditkin.com"),
        ("The Barnes Firm", "thebarnesfirm.com"),
    ]

    for metro in metros:
        # Each metro gets 8-15 observations across case types
        obs_count = random.randint(8, 15)
        for _ in range(obs_count):
            firm_name, firm_domain = random.choice(firms)
            cluster = random.choice(clusters)
            keywords = cluster.get("keywords", [])
            if isinstance(keywords, str):
                keywords = json.loads(keywords)
            keyword_template = random.choice(keywords)
            keyword = keyword_template.replace("{metro}", metro["metro_name"])

            hours_ago = random.randint(0, 48)
            observed = now - timedelta(hours=hours_ago)

            rows.append({
                "metro_id": metro["id"],
                "case_type": cluster["case_type"],
                "keyword_used": keyword,
                "advertiser_domain": firm_domain,
                "advertiser_name": firm_name,
                "ad_position": random.randint(1, 6),
                "ad_title": f"{firm_name} | Free Consultation",
                "ad_description": f"Injured in {metro['metro_name']}? Call {firm_name} for a free case review.",
                "ad_link": f"https://{firm_domain}/{cluster['case_type']}",
                "observed_at": observed.isoformat(),
                "observed_date": observed.date().isoformat(),
                "source": "seed_data",
                "raw_json": json.dumps({"seed": True}),
            })

    return rows


# ---------------------------------------------------------------------------
# Pipeline steps
# ---------------------------------------------------------------------------

def step_fetch_raw(step) -> list[dict]:
    """Fetch paid ad observations via geo-targeted Google searches."""
    metros = supabase_query("pi_metros", {"select": "*"})
    clusters = supabase_query("pi_keyword_clusters", {"select": "*"})

    if not metros or not clusters:
        raise ValueError(f"Missing dimension data: metros={len(metros)}, clusters={len(clusters)}")

    if not SEARCHAPI_API_KEY:
        print("  WARNING: SEARCHAPI_API_KEY not set — using seed data")
        rows = _generate_seed_observations(metros, clusters)
        step.set_metadata({"source": "seed_data", "seed_rows": len(rows)})
        count = _bulk_insert("pi_search_observations", rows,
                             on_conflict="metro_id,case_type,keyword_used,advertiser_domain,observed_date",
                             resolution="ignore-duplicates")
        step.set_counts(rows_in=0, rows_out=count)
        return count

    total_api_ads = 0
    total_inserted = 0
    per_metro_counts: dict[str, int] = {}
    failed_searches: list[str] = []

    for metro in metros:
        metro_rows: list[dict] = []
        metro_count = 0
        metro_key = f"{metro['state_abbr']}:{metro['metro_name']}"
        location = metro.get("searchapi_location", metro["metro_label"])

        for cluster in clusters:
            keywords = cluster.get("keywords", [])
            if isinstance(keywords, str):
                keywords = json.loads(keywords)

            for keyword_template in keywords:
                keyword = keyword_template.replace("{metro}", metro["metro_name"])

                try:
                    logger.info("  Searching: '%s' in %s (case: %s)",
                                keyword, metro["metro_name"], cluster["case_type"])
                    serp_data = _searchapi_google(keyword, location)
                    ad_rows = _extract_ads(serp_data, metro, cluster["case_type"], keyword)
                    total_api_ads += len(ad_rows)
                    metro_count += len(ad_rows)
                    metro_rows.extend(ad_rows)
                except Exception as e:
                    logger.error("  Search failed: '%s' — %s", keyword, e)
                    failed_searches.append(keyword)

                time.sleep(REQUEST_DELAY_SECONDS)

        per_metro_counts[metro_key] = metro_count

        # Flush after each metro so a timeout or transient failure mid-run keeps
        # the metros already processed (idempotent via on-conflict ignore). With
        # ~150 metros, a single end-of-loop insert loses everything on a timeout.
        if metro_rows:
            total_inserted += _bulk_insert(
                "pi_search_observations", metro_rows,
                on_conflict="metro_id,case_type,keyword_used,advertiser_domain,observed_date",
                resolution="ignore-duplicates")

    step.set_metadata({
        "source": "searchapi_google",
        "total_api_ads": total_api_ads,
        "rows_inserted": total_inserted,
        "per_metro_counts": per_metro_counts,
        "failed_searches": failed_searches[:50],
    })

    step.set_counts(rows_in=0, rows_out=total_inserted)
    return total_inserted


# Consumer / aggregator domains that are not PI firms. An ad whose final URL
# resolves to one of these surfaces as a bogus "firm" (e.g. google.com). Mirrors
# the denylist the YouTube/Meta competitor RPCs already apply.
CONSUMER_DOMAINS = frozenset({
    "google.com", "youtube.com", "facebook.com", "instagram.com",
    "maps.google.com", "g.co", "bing.com",
})


def step_build_profiles(step) -> int:
    """Aggregate observations into competitor profiles by state."""
    metros = supabase_query("pi_metros", {"select": "id,state_abbr,metro_name"})
    if not metros:
        step.set_counts(rows_in=0, rows_out=0)
        return 0

    states = sorted(set(m["state_abbr"] for m in metros))
    metro_by_id = {m["id"]: m for m in metros}
    total_metros_by_state = {}
    for m in metros:
        total_metros_by_state[m["state_abbr"]] = total_metros_by_state.get(m["state_abbr"], 0) + 1

    total_profiles = 0

    for state in states:
        state_metro_ids = [m["id"] for m in metros if m["state_abbr"] == state]

        # Fetch all observations for this state's metros
        all_obs = []
        for metro_id in state_metro_ids:
            obs = supabase_query("pi_search_observations", {
                "select": "metro_id,case_type,advertiser_domain,advertiser_name,ad_position,observed_at",
                "metro_id": f"eq.{metro_id}",
            })
            all_obs.extend(obs)

        if not all_obs:
            logger.info("  No observations for state %s, skipping profiles", state)
            continue

        # Group by advertiser_domain, skipping consumer/aggregator domains
        # (mirrors the denylist the YouTube/Meta competitor RPCs apply — these
        # are not PI firms, e.g. an ad whose final URL resolved to google.com).
        by_domain: dict[str, list[dict]] = {}
        for obs in all_obs:
            domain = obs["advertiser_domain"]
            if domain in CONSUMER_DOMAINS:
                continue
            by_domain.setdefault(domain, []).append(obs)

        total_state_metros = total_metros_by_state.get(state, 1)
        total_case_types = 6  # fixed number of case type clusters

        # presence_score rewards SUSTAINED, STATEWIDE presence — not raw volume.
        # A recent dense burst in a couple of metros must not outrank long-run
        # statewide saturation (see docs/issues/presence-score-overranking.md).
        # We score on a per-active-day rate over a rolling 90-day window, weight
        # metro breadth, and sink low-confidence (new / thin-sample) entrants.
        now = datetime.now(timezone.utc)
        window_cutoff = (now - timedelta(days=90)).date().isoformat()
        recency_cutoff = (now - timedelta(days=21)).date().isoformat()

        # Pass 1: per-domain metrics (incl. the rolling-90d rate).
        metrics: list[dict] = []
        for domain, obs_list in by_domain.items():
            name_counts: dict[str, int] = {}
            for obs in obs_list:
                name = obs.get("advertiser_name") or domain
                name_counts[name] = name_counts.get(name, 0) + 1
            advertiser_name = max(name_counts, key=name_counts.get)

            metro_ids_active = set(obs["metro_id"] for obs in obs_list)
            metros_active = sorted(set(
                metro_by_id[mid]["metro_name"]
                for mid in metro_ids_active
                if mid in metro_by_id
            ))
            case_types_active = sorted(set(obs["case_type"] for obs in obs_list))

            total_observations = len(obs_list)
            positions = [obs["ad_position"] for obs in obs_list if obs.get("ad_position")]
            avg_position = round(sum(positions) / len(positions), 1) if positions else None

            dates = []
            for obs in obs_list:
                if obs.get("observed_at"):
                    try:
                        dates.append(obs["observed_at"][:10])
                    except (TypeError, IndexError):
                        pass
            first_seen = min(dates) if dates else None
            last_seen = max(dates) if dates else None

            # Rolling-90d window: rate = observations per active (distinct) day.
            window_dates = [d for d in dates if d >= window_cutoff]
            active_days = len(set(window_dates))
            obs_per_active_day = len(window_dates) / active_days if active_days else 0.0
            low_confidence = active_days < 14 or (first_seen is not None and first_seen > recency_cutoff)

            metrics.append({
                "domain": domain,
                "advertiser_name": advertiser_name,
                "metros_active": metros_active,
                "case_types_active": case_types_active,
                "total_observations": total_observations,
                "avg_position": avg_position,
                "first_seen": first_seen,
                "last_seen": last_seen,
                "obs_per_active_day": obs_per_active_day,
                "low_confidence": low_confidence,
            })

        # Normalize the rate against the strongest sustained advertiser.
        max_rate = max((m["obs_per_active_day"] for m in metrics), default=0.0)

        # Pass 2: compose presence_score and build profile rows.
        profiles = []
        for m in metrics:
            rate_score = (m["obs_per_active_day"] / max_rate) * 40 if max_rate else 0
            metro_score = (len(m["metros_active"]) / total_state_metros) * 30 if total_state_metros else 0
            case_score = (len(m["case_types_active"]) / total_case_types) * 30
            presence_score = rate_score + metro_score + case_score
            # New / thin-sample firms are demoted below confident ones so the
            # presence_score-ordered state RPCs never call them "dominant".
            if m["low_confidence"]:
                presence_score *= 0.4
            presence_score = round(presence_score, 1)

            profiles.append({
                "state_abbr": state,
                "advertiser_domain": m["domain"],
                "advertiser_name": m["advertiser_name"],
                "website": f"https://{m['domain']}",
                "metros_active": m["metros_active"],
                "case_types_active": m["case_types_active"],
                "total_observations": m["total_observations"],
                "avg_ad_position": m["avg_position"],
                "first_seen": m["first_seen"],
                "last_seen": m["last_seen"],
                "presence_score": presence_score,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })

        if profiles:
            count = _bulk_insert("pi_competitor_profiles", profiles,
                                 on_conflict="state_abbr,advertiser_domain",
                                 resolution="merge-duplicates")
            total_profiles += count
            logger.info("  State %s: %d competitor profiles upserted", state, count)

    step.set_counts(rows_in=0, rows_out=total_profiles)
    step.set_metadata({"states_processed": states, "total_profiles": total_profiles})
    return total_profiles


def step_publish(step, raw_count: int):
    """Verify final state."""
    if DRY_RUN:
        step.set_counts(rows_in=raw_count, rows_out=raw_count)
        step.set_metadata({"dry_run": True})
        print("\n  [DRY RUN] Skipping verification")
        return

    total_obs = supabase_count("pi_search_observations")
    total_profiles = supabase_count("pi_competitor_profiles")

    step.set_counts(rows_in=raw_count, rows_out=raw_count)
    step.set_metadata({
        "total_observations": total_obs,
        "total_profiles": total_profiles,
        "publish_timestamp": datetime.now(timezone.utc).isoformat(),
    })
    print(f"\n  pi_search_observations total: {total_obs}")
    print(f"  pi_competitor_profiles total: {total_profiles}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="PI search advertising daily pipeline")
    parser.add_argument("--dry-run", action="store_true",
                        help="Run without writing to database")
    args = parser.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "true"
        import lib.pipeline
        lib.pipeline.DRY_RUN = True

    trigger = os.environ.get("PIPELINE_TRIGGER", "manual")

    with PipelineRun("pi_search_daily", trigger=trigger) as run:
        with run.step("fetch_raw") as step:
            raw_count = step_fetch_raw(step)

        with run.step("build_profiles") as step:
            step_build_profiles(step)

        with run.step("publish") as step:
            step_publish(step, raw_count)


if __name__ == "__main__":
    main()
