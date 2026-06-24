#!/usr/bin/env python3
"""
google_maps_local_daily pipeline — Google Maps local-pack firm roster (#456).

Phase 2 of the firm-roster hardening (after PR #455 built the organic ∪ paid
roster). Pulls the Google Maps local pack for PI queries in each metro and writes
the businesses (with their VERIFIED physical address / state) to
pi_local_businesses. get_state_firm_roster then unions the in-state results in as
a third source and uses the verified state to drop firms Maps placed only
out-of-state.

Two gotchas this pipeline encodes:
  - google_maps is geo-targeted by the `ll=@lat,lng,zoom` param, NOT the text
    `location` param. Passing `location="Birmingham, Alabama, United States"`
    returns out-of-state (Indianapolis) firms; `ll` returns the right metro.
    Verified 2026-06-24.
  - pi_metros has no coordinates, so step_geocode self-heals: any metro missing
    lat/lng is geocoded once via Nominatim (free, no key) and persisted.

Append/upsert: one row per place_id; re-runs refresh rating/reviews/last_seen.
Per-metro flush so a mid-run timeout keeps completed metros.

Usage:
    python -m pipelines.google_maps_local_daily
    python -m pipelines.google_maps_local_daily --dry-run

Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, SEARCHAPI_API_KEY (required for real
data), DRY_RUN, PIPELINE_TRIGGER, GMAPS_METRO_MAX (optional metro cap),
GMAPS_STATE_FILTER (optional 2-letter state to limit the run, e.g. AL).
"""
from __future__ import annotations

import argparse
import logging
import os
import re
import sys
import time
from datetime import datetime, timezone

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.pipeline import PipelineRun, DRY_RUN, _get, _patch, _bulk_insert  # noqa: E402
from lib.api_usage import log_api_call  # noqa: E402
from lib.api_pricing import get_searchapi_pricing  # noqa: E402
from lib.domain_mapper import extract_root_domain  # noqa: E402
from pipelines.pi_search_daily import supabase_count  # noqa: E402

logger = logging.getLogger(__name__)

SEARCHAPI_API_KEY = os.environ.get("SEARCHAPI_API_KEY", "")
SEARCHAPI_BASE = "https://www.searchapi.io/api/v1/search"
NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search"
NOMINATIM_UA = "legal-ad-intel-geocode/1.0 (lancetarrant@gmail.com)"
REQUEST_DELAY_SECONDS = 1.5
NOMINATIM_DELAY_SECONDS = 1.1  # Nominatim usage policy: <= 1 req/sec
MAX_RETRIES = 3
MAX_METROS = int(os.environ.get("GMAPS_METRO_MAX", "200"))
STATE_FILTER = os.environ.get("GMAPS_STATE_FILTER", "").strip().upper()

# Local-pack queries that surface PI firms. Each is one API call per metro.
GMAPS_QUERIES = ["personal injury lawyer", "car accident lawyer"]

# "..., Birmingham, AL 35203" -> AL. Also tolerates a trailing country.
_STATE_RE = re.compile(r",\s*([A-Z]{2})\s+\d{5}(?:-\d{4})?\b")


def _parse_state(address: str | None) -> str | None:
    if not address:
        return None
    m = _STATE_RE.search(address)
    return m.group(1) if m else None


def _geocode(city: str, state: str) -> tuple[float, float] | None:
    """Geocode 'City, ST' to (lat, lng) via Nominatim. None on miss/failure."""
    try:
        resp = httpx.get(NOMINATIM_BASE, params={
            "city": city, "state": state, "country": "USA",
            "format": "json", "limit": 1,
        }, headers={"User-Agent": NOMINATIM_UA}, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        if data:
            return float(data[0]["lat"]), float(data[0]["lon"])
    except (httpx.HTTPError, KeyError, ValueError, IndexError) as e:
        logger.error("geocode failed for %s, %s: %s", city, state, e)
    return None


def step_geocode(step) -> int:
    """Backfill lat/lng for any metro missing it. Self-healing + idempotent."""
    metros = _get("pi_metros", {
        "select": "id,metro_name,state_abbr,latitude,longitude",
        "or": "(latitude.is.null,longitude.is.null)",
    })
    if STATE_FILTER:
        metros = [m for m in metros if m.get("state_abbr") == STATE_FILTER]

    geocoded = 0
    for m in metros:
        coords = _geocode(m["metro_name"], m["state_abbr"])
        if coords:
            _patch("pi_metros", m["id"],
                   {"latitude": coords[0], "longitude": coords[1]})
            geocoded += 1
        time.sleep(NOMINATIM_DELAY_SECONDS)

    step.set_counts(rows_in=len(metros), rows_out=geocoded)
    step.set_metadata({"metros_missing_coords": len(metros), "geocoded": geocoded})
    print(f"\n  geocoded {geocoded}/{len(metros)} metros missing coordinates")
    return geocoded


def _searchapi_maps(query: str, lat: float, lng: float) -> dict:
    if not SEARCHAPI_API_KEY:
        return {}
    for attempt in range(MAX_RETRIES):
        try:
            resp = httpx.get(SEARCHAPI_BASE, params={
                "engine": "google_maps", "q": query,
                "ll": f"@{lat},{lng},12z",  # ll geo-targets; text location does NOT
                "api_key": SEARCHAPI_API_KEY, "gl": "us", "hl": "en",
            }, timeout=30)
            if resp.status_code == 429:
                time.sleep(2 ** attempt * REQUEST_DELAY_SECONDS)
                continue
            resp.raise_for_status()
            pricing = get_searchapi_pricing()
            log_api_call(
                provider="searchapi", operation="searchapi_google_maps",
                model_or_actor="google_maps", units_consumed=1,
                unit_type="searches", cost_usd=pricing["rate_per_unit_usd"],
                called_from="pipelines.google_maps_local_daily",
                metadata={"engine": "google_maps", "q": query, "ll": f"{lat},{lng}"},
            )
            return resp.json()
        except httpx.HTTPError as e:
            if attempt < MAX_RETRIES - 1:
                time.sleep(2 ** attempt * REQUEST_DELAY_SECONDS)
            else:
                logger.error("maps failed for '%s' @ %s,%s: %s", query, lat, lng, e)
    return {}


def _extract_local(data: dict, metro: dict, query: str) -> list[dict]:
    rows = []
    now = datetime.now(timezone.utc).isoformat()
    for r in data.get("local_results", []):
        place_id = r.get("place_id")
        if not place_id:
            continue
        gps = r.get("gps_coordinates") or {}
        website = r.get("website")
        rows.append({
            "place_id": place_id,
            "title": r.get("title"),
            "website": website,
            "domain": extract_root_domain(website) or None,
            "address": r.get("address"),
            "state": _parse_state(r.get("address")),
            "metro_id": metro["id"],
            "dma_code": metro.get("dma_code"),
            "rating": r.get("rating"),
            "reviews": r.get("reviews"),
            "latitude": gps.get("latitude"),
            "longitude": gps.get("longitude"),
            "query": query,
            "last_seen": now,
        })
    return rows


def step_fetch_local(step) -> int:
    metros = _get("pi_metros", {
        "select": "id,metro_name,state_abbr,dma_code,latitude,longitude",
    })
    metros = [m for m in metros
              if m.get("dma_code") and m.get("latitude") is not None
              and m.get("longitude") is not None]
    if STATE_FILTER:
        metros = [m for m in metros if m.get("state_abbr") == STATE_FILTER]
    metros = metros[:MAX_METROS]

    if not SEARCHAPI_API_KEY:
        dry = os.environ.get("DRY_RUN", "").strip().lower() == "true"
        msg = "no_api_key_dry_run" if dry else "no_api_key_skipped"
        print(f"  WARNING: SEARCHAPI_API_KEY not set — {msg}")
        step.set_metadata({"source": msg, "metros": len(metros)})
        step.set_counts(rows_in=0, rows_out=0)
        return 0

    total_rows = 0
    total_upserted = 0
    no_state = 0
    failed: list[str] = []
    for metro in metros:
        lat, lng = metro["latitude"], metro["longitude"]
        metro_rows: dict[str, dict] = {}  # dedupe by place_id within the metro
        for query in GMAPS_QUERIES:
            try:
                data = _searchapi_maps(query, lat, lng)
                for row in _extract_local(data, metro, query):
                    metro_rows[row["place_id"]] = row
            except Exception as e:  # noqa: BLE001 — one query must not abort the run
                logger.error("  '%s' @ %s failed: %s", query, metro["metro_name"], e)
                failed.append(f"{metro['state_abbr']}:{query}")
            time.sleep(REQUEST_DELAY_SECONDS)
        rows = list(metro_rows.values())
        no_state += sum(1 for r in rows if not r["state"])
        total_rows += len(rows)
        if rows:
            total_upserted += _bulk_insert(
                "pi_local_businesses", rows,
                on_conflict="place_id", resolution="merge-duplicates",
            )

    step.set_counts(rows_in=total_rows, rows_out=total_upserted)
    step.set_metadata({
        "source": "searchapi_google_maps_per_metro",
        "metros": len(metros),
        "queries": GMAPS_QUERIES,
        "businesses": total_rows,
        "upserted": total_upserted,
        "missing_state_parse": no_state,
        "failed_searches": failed[:50],
        "state_filter": STATE_FILTER or None,
    })
    print(f"\n  metros={len(metros)} businesses={total_rows} "
          f"upserted={total_upserted} no_state={no_state}")
    return total_upserted


def step_publish(step, upserted: int):
    if DRY_RUN:
        step.set_counts(rows_in=upserted, rows_out=upserted)
        step.set_metadata({"dry_run": True})
        return
    total = supabase_count("pi_local_businesses")
    step.set_counts(rows_in=upserted, rows_out=upserted)
    step.set_metadata({
        "pi_local_businesses_total": total,
        "publish_timestamp": datetime.now(timezone.utc).isoformat(),
    })
    print(f"\n  pi_local_businesses total: {total}")


def main():
    parser = argparse.ArgumentParser(
        description="Google Maps local-pack PI-firm roster source")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "true"
        import lib.pipeline
        lib.pipeline.DRY_RUN = True

    trigger = os.environ.get("PIPELINE_TRIGGER", "manual")

    with PipelineRun("google_maps_local_daily", trigger=trigger) as run:
        with run.step("geocode") as step:
            step_geocode(step)
        with run.step("fetch_local") as step:
            upserted = step_fetch_local(step)
        with run.step("publish") as step:
            step_publish(step, upserted)


if __name__ == "__main__":
    main()
