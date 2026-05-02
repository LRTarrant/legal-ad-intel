#!/usr/bin/env python3
"""
google_trends_daily pipeline — Google Trends observations via Searchapi.io.

For each tort keyword, fetches interest-over-time data, U.S. state-level
regional breakdown, and related queries (top + rising). Inserts observations
into google_trends_observations and related queries into
google_trends_related_queries.

Usage:
    python -m pipelines.google_trends_daily
    python -m pipelines.google_trends_daily --dry-run

Environment variables:
    SUPABASE_URL          — Supabase project URL (required)
    SUPABASE_SERVICE_KEY  — Supabase service role key (required)
    SEARCHAPI_API_KEY     — Searchapi.io API key (required for real data)
    DRY_RUN               — "true" to skip all DB writes (optional)
    PIPELINE_TRIGGER      — "scheduled" | "manual" (optional, default "manual")
"""
from __future__ import annotations

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
    _get,
    _bulk_insert,
    SUPABASE_URL,
)

logger = logging.getLogger(__name__)

SEARCHAPI_API_KEY = os.environ.get("SEARCHAPI_API_KEY", "")
SEARCHAPI_BASE = "https://www.searchapi.io/api/v1/search"
REQUEST_DELAY_SECONDS = 2.0
MAX_RETRIES = 3

# Reuse tort keywords from google_ads_daily
TORT_SEARCH_TERMS: dict[str, list[str]] = {
    "camp_lejeune": ["camp lejeune lawsuit"],
    "hair_relaxer": ["hair relaxer lawsuit"],
    "roundup": ["roundup lawsuit"],
    "talcum_powder": ["talcum powder lawsuit"],
    "paraquat": ["paraquat lawsuit"],
    "firefighter_foam": ["afff firefighting foam lawsuit"],
    "nec_baby_formula": ["nec baby formula lawsuit"],
    "tylenol_autism": ["tylenol autism lawsuit"],
    "zantac": ["zantac lawsuit"],
    "hernia_mesh": ["hernia mesh lawsuit"],
    "social_media": ["social media addiction lawsuit"],
    "motor_vehicle": ["car accident lawyer"],
    "truck_accident": ["truck accident lawyer"],
    "nursing_home": ["nursing home abuse lawyer"],
    "workers_comp": ["workers compensation lawyer"],
    "roblox_abuse": ["roblox child abuse lawsuit"],
    "social_media_addiction": ["social media addiction lawsuit teens"],
    "depo_provera":          ["depo provera lawsuit"],
    "bair_hugger":           ["bair hugger lawsuit"],
    "glp1_gastroparesis":     ["ozempic lawsuit gastroparesis"],
    "glp1_vision_loss":       ["ozempic blindness lawsuit"],
    "uber-sexual-assault":    ["uber sexual assault", "uber lawsuit", "uber safety", "rideshare sexual assault", "uber driver assault", "uber rape lawsuit", "uber mdl 3084", "rideshare lawsuit"],
    "bard-powerport":         ["bard powerport lawsuit"],
    "lyft-sexual-assault":    ["lyft sexual assault lawsuit"],
}


def _searchapi_trends(keyword: str) -> dict:
    """Call Searchapi.io Google Trends and return the JSON response."""
    if not SEARCHAPI_API_KEY:
        return {}
    for attempt in range(MAX_RETRIES):
        try:
            resp = httpx.get(
                SEARCHAPI_BASE,
                params={
                    "engine": "google_trends",
                    "q": keyword,
                    "api_key": SEARCHAPI_API_KEY,
                    "data_type": "TIMESERIES",
                    "date": "today 12-m",
                    "geo": "",
                    "hl": "en",
                },
                timeout=30,
            )
            if resp.status_code == 429:
                backoff = 2 ** attempt * REQUEST_DELAY_SECONDS
                logger.warning("Rate limited for '%s', backing off %.1fs", keyword, backoff)
                time.sleep(backoff)
                continue
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as e:
            if attempt < MAX_RETRIES - 1:
                logger.warning("Searchapi error for '%s': %s, retrying", keyword, e)
                time.sleep(2 ** attempt * REQUEST_DELAY_SECONDS)
            else:
                logger.error("Searchapi failed for '%s' after %d attempts: %s", keyword, MAX_RETRIES, e)
                return {}
    return {}


def _searchapi_trends_geo_us(keyword: str) -> dict:
    """Fetch US state-level regional breakdown for a keyword."""
    if not SEARCHAPI_API_KEY:
        return {}
    for attempt in range(MAX_RETRIES):
        try:
            resp = httpx.get(
                SEARCHAPI_BASE,
                params={
                    "engine": "google_trends",
                    "q": keyword,
                    "api_key": SEARCHAPI_API_KEY,
                    "data_type": "GEO_MAP",
                    "date": "today 12-m",
                    "geo": "US",
                    "region": "REGION",
                    "hl": "en",
                },
                timeout=30,
            )
            if resp.status_code == 429:
                backoff = 2 ** attempt * REQUEST_DELAY_SECONDS
                time.sleep(backoff)
                continue
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as e:
            if attempt < MAX_RETRIES - 1:
                time.sleep(2 ** attempt * REQUEST_DELAY_SECONDS)
            else:
                logger.error("US geo trends failed for '%s': %s", keyword, e)
                return {}
    return {}


def _searchapi_trends_related_queries(keyword: str) -> dict:
    """Fetch related queries (top + rising) for a keyword.

    Uses a 60s timeout (longer than other endpoints) and a single retry
    with a 3s delay on timeout or HTTP error.
    """
    if not SEARCHAPI_API_KEY:
        return {}
    for attempt in range(2):  # at most 1 retry
        try:
            resp = httpx.get(
                SEARCHAPI_BASE,
                params={
                    "engine": "google_trends",
                    "q": keyword,
                    "api_key": SEARCHAPI_API_KEY,
                    "data_type": "RELATED_QUERIES",
                    "date": "today 12-m",
                    "geo": "US",
                    "hl": "en",
                },
                timeout=60,
            )
            resp.raise_for_status()
            return resp.json()
        except (httpx.TimeoutException, httpx.HTTPStatusError) as e:
            if attempt == 0:
                logger.warning("Related queries for '%s' failed (%s), retrying in 3s", keyword, e)
                time.sleep(3)
            else:
                logger.error("Related queries failed for '%s' after retry: %s", keyword, e)
                return {}
    return {}


def _extract_related_query_rows(data: dict, keyword: str, tort_slug: str, tort_id: str) -> list[dict]:
    """Extract top and rising related query rows."""
    rows = []
    now = datetime.now(timezone.utc)
    related = data.get("related_queries", {})
    for query_type in ("top", "rising"):
        for item in related.get(query_type, []):
            rows.append({
                "tort_slug": tort_slug,
                "tort_id": tort_id,
                "keyword": keyword,
                "query_type": query_type,
                "position": item.get("position"),
                "query_text": item.get("query", ""),
                "display_value": str(item.get("values", "")),
                "extracted_value": item.get("extracted_value"),
                "link": item.get("link"),
                "observed_at": now.isoformat(),
            })
    return rows


def _extract_timeseries_rows(
    data: dict,
    keyword: str,
    tort_slug: str,
    tort_id: str,
) -> list[dict]:
    """Extract interest-over-time rows from Searchapi.io Google Trends response."""
    rows = []
    now = datetime.now(timezone.utc)
    timeline = data.get("interest_over_time", {}).get("timeline_data", [])
    for point in timeline:
        date_str = point.get("date", "")
        values = point.get("values", [])
        interest_value = values[0].get("value") if values else None
        if interest_value is None:
            continue
        try:
            interest_int = int(interest_value)
        except (ValueError, TypeError):
            interest_int = None
        rows.append({
            "tort_slug": tort_slug,
            "tort_id": tort_id,
            "keyword": keyword,
            "data_type": "timeseries",
            "region_code": "",
            "region_name": "",
            "period_label": date_str,
            "interest_value": interest_int,
            "raw_json": json.dumps(point, default=str),
            "observed_at": now.isoformat(),
        })
    return rows


def _extract_geo_us_rows(
    data: dict,
    keyword: str,
    tort_slug: str,
    tort_id: str,
) -> list[dict]:
    """Extract US state-level regional breakdown rows (stored as geo_map_us)."""
    rows = []
    now = datetime.now(timezone.utc)
    geo_map = data.get("interest_by_region", [])
    for region in geo_map:
        region_code = region.get("geo", "")
        region_name = region.get("name", region.get("location", ""))
        values_list = region.get("values", [])
        # Single-keyword queries: extracted_value is an int, value may have "%"
        raw_extracted = values_list[0].get("extracted_value") if values_list else None
        raw_value = values_list[0].get("value") if values_list else None
        try:
            interest_int = (
                int(raw_extracted)
                if raw_extracted is not None
                else int(str(raw_value).rstrip("%")) if raw_value is not None else None
            )
        except (ValueError, TypeError):
            interest_int = None
        rows.append({
            "tort_slug": tort_slug,
            "tort_id": tort_id,
            "keyword": keyword,
            "data_type": "geo_map_us",
            "region_code": region_code or "",
            "region_name": region_name or "",
            "period_label": "today 12-m",
            "interest_value": interest_int,
            "raw_json": json.dumps(region, default=str),
            "observed_at": now.isoformat(),
        })
    return rows


def step_fetch_raw(step) -> list[dict]:
    """Fetch Google Trends data (timeseries + geo) for all tort keywords."""
    torts = _get("torts", {"select": "id,slug,label"})
    if not torts:
        raise ValueError("No torts found in DB")
    tort_by_slug = {t["slug"]: t for t in torts}

    all_rows: list[dict] = []
    all_rq_rows: list[dict] = []
    per_tort_counts: dict[str, int] = {}
    failed_torts: list[str] = []

    if not SEARCHAPI_API_KEY:
        logger.warning("SEARCHAPI_API_KEY not set — inserting zero rows")
        step.set_metadata({"source": "no_api_key"})
        step.set_counts(rows_in=0, rows_out=0)
        return []

    for slug, terms in TORT_SEARCH_TERMS.items():
        tort = tort_by_slug.get(slug)
        if not tort:
            logger.info("Tort '%s' not in DB, skipping", slug)
            continue
        tort_count = 0
        for keyword in terms:
            try:
                logger.info("Fetching trends timeseries: '%s' (tort: %s)", keyword, slug)
                ts_data = _searchapi_trends(keyword)
                ts_rows = _extract_timeseries_rows(ts_data, keyword, slug, tort["id"])
                all_rows.extend(ts_rows)
                tort_count += len(ts_rows)
                time.sleep(REQUEST_DELAY_SECONDS)

                logger.info("Fetching trends geo US: '%s' (tort: %s)", keyword, slug)
                geo_us_data = _searchapi_trends_geo_us(keyword)
                geo_us_rows = _extract_geo_us_rows(geo_us_data, keyword, slug, tort["id"])
                all_rows.extend(geo_us_rows)
                tort_count += len(geo_us_rows)
                time.sleep(REQUEST_DELAY_SECONDS)

                logger.info("Fetching related queries: '%s' (tort: %s)", keyword, slug)
                rq_data = _searchapi_trends_related_queries(keyword)
                rq_rows = _extract_related_query_rows(rq_data, keyword, slug, tort["id"])
                all_rq_rows.extend(rq_rows)
                time.sleep(REQUEST_DELAY_SECONDS)
            except Exception as e:
                logger.error("Tort '%s' keyword '%s' failed: %s", slug, keyword, e)
                failed_torts.append(f"{slug}:{keyword}")
        per_tort_counts[slug] = tort_count

    step.set_metadata({
        "source": "searchapi_google_trends",
        "total_rows": len(all_rows),
        "related_query_rows": len(all_rq_rows),
        "per_tort_counts": per_tort_counts,
        "failed_torts": failed_torts,
    })
    count = _bulk_insert(
        "google_trends_observations",
        all_rows,
        on_conflict="tort_slug,keyword,data_type,region_code,period_label",
    )
    rq_count = _bulk_insert(
        "google_trends_related_queries",
        all_rq_rows,
        on_conflict="tort_slug,keyword,query_type,position",
    )
    step.set_counts(rows_in=0, rows_out=count + rq_count)
    return all_rows


def step_publish(step, raw_count: int):
    """Verify final state."""
    if DRY_RUN:
        step.set_counts(rows_in=raw_count, rows_out=raw_count)
        step.set_metadata({"dry_run": True})
        return
    step.set_counts(rows_in=raw_count, rows_out=raw_count)
    step.set_metadata({"publish_timestamp": datetime.now(timezone.utc).isoformat()})


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Google Trends daily pipeline")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if args.dry_run:
        os.environ["DRY_RUN"] = "true"
        import lib.pipeline
        lib.pipeline.DRY_RUN = True

    trigger = os.environ.get("PIPELINE_TRIGGER", "manual")
    with PipelineRun("google_trends_daily", trigger=trigger) as run:
        with run.step("fetch_raw") as step:
            raw_rows = step_fetch_raw(step)
        with run.step("publish") as step:
            step_publish(step, len(raw_rows))


if __name__ == "__main__":
    main()
