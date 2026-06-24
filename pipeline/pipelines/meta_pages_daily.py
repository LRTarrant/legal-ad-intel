#!/usr/bin/env python3
"""
meta_pages_daily pipeline — deepen Meta coverage per firm (#3a-1).

meta_ads_daily finds firms via 6 PI case-type keywords, so for any given page we
only capture the keyword-matched ads. This pipeline takes every distinct page_id
already in meta_ad_creatives and pulls that page's FULL active ad set via a Meta
Ad Library page-id search, inserting only NEW ad_archive_ids (existing rows are
left untouched so the keyword crawl's case_type tags aren't clobbered).

Page search isn't keyword-scoped, so each new ad's case_type is classified from
its ad copy. New ads have creative_image_url NULL, so meta_creative_capture
picks up their images on its next run.

(A later pass, #3a-2, will discover firms missing from meta_ad_creatives entirely
by resolving roster firm names via meta_ad_library_page_search.)

Usage:
    python -m pipelines.meta_pages_daily
    python -m pipelines.meta_pages_daily --dry-run

Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, SEARCHAPI_API_KEY (required for real
data), DRY_RUN, PIPELINE_TRIGGER, META_PAGES_MAX (optional, default 400).
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
from lib.pipeline import PipelineRun, DRY_RUN, _bulk_insert, _dedup_rows, _get  # noqa: E402
from lib.api_usage import log_api_call  # noqa: E402
from lib.api_pricing import get_searchapi_pricing  # noqa: E402
from pipelines.meta_ads_daily import _date_part, supabase_count  # noqa: E402

logger = logging.getLogger(__name__)

SEARCHAPI_API_KEY = os.environ.get("SEARCHAPI_API_KEY", "")
SEARCHAPI_BASE = "https://www.searchapi.io/api/v1/search"
COUNTRY = "US"
REQUEST_DELAY_SECONDS = 1.5
MAX_RETRIES = 3
MAX_PAGES_PER_PAGE_ID = 5
MAX_PAGES_PER_RUN = int(os.environ.get("META_PAGES_MAX", "400"))

# Page search carries no keyword, so classify case_type from the ad copy.
# Order matters: more specific buckets first (truck before motor_vehicle).
CASE_TYPE_TOKENS: list[tuple[str, tuple[str, ...]]] = [
    ("truck_accident", ("truck", "18 wheeler", "18-wheeler", "semi-truck", "tractor trailer", "tractor-trailer", "big rig")),
    ("motorcycle", ("motorcycle", "motorbike", "biker")),
    ("nursing_home", ("nursing home", "nursing-home", "elder abuse", "elder neglect")),
    ("workers_comp", ("workers comp", "workers' comp", "workers compensation", "workplace injur", "work injur", "on the job")),
    ("boating", ("boat accident", "boating", "jet ski", "watercraft")),
    ("motor_vehicle", ("car accident", "auto accident", "car crash", "car wreck", "rear-end", "drunk driv", "dui ", "vehicle accident")),
]


def classify_case_type(body: str | None) -> str:
    b = (body or "").lower()
    for case_type, tokens in CASE_TYPE_TOKENS:
        if any(t in b for t in tokens):
            return case_type
    return "general_pi"


def _snapshot_body(ad: dict) -> str:
    snap = ad.get("snapshot")
    if isinstance(snap, dict):
        body = snap.get("body")
        if isinstance(body, dict):
            return body.get("text") or ""
        if isinstance(body, str):
            return body
    return ""


def _log_searchapi_call(query: str) -> None:
    pricing = get_searchapi_pricing()
    log_api_call(
        provider="searchapi",
        operation="searchapi_meta_ad_library",
        model_or_actor="meta_ad_library",
        units_consumed=1,
        unit_type="searches",
        cost_usd=pricing["rate_per_unit_usd"],
        called_from="pipelines.meta_pages_daily",
        metadata={"engine": "meta_ad_library", "page_id": query},
    )


def _searchapi_page(page_id: str, page_token: str | None = None) -> dict:
    """One Meta Ad Library page of results for a page_id. {} on failure."""
    if not SEARCHAPI_API_KEY:
        return {}
    params = {
        "engine": "meta_ad_library",
        "page_id": page_id,
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
                time.sleep(2 ** attempt * REQUEST_DELAY_SECONDS)
                continue
            resp.raise_for_status()
            _log_searchapi_call(page_id)
            return resp.json()
        except httpx.HTTPError as e:
            if attempt < MAX_RETRIES - 1:
                time.sleep(2 ** attempt * REQUEST_DELAY_SECONDS)
            else:
                logger.error("page-search failed for %s: %s", page_id, e)
    return {}


def _ad_to_row(ad: dict) -> dict | None:
    ad_id = ad.get("ad_archive_id")
    if not ad_id:
        return None
    snapshot = ad.get("snapshot")
    return {
        "ad_archive_id": str(ad_id),
        "page_id": ad.get("page_id"),
        "page_name": ad.get("page_name"),
        "case_type": classify_case_type(_snapshot_body(ad)),
        "keyword": "page_scan",
        "start_date": _date_part(ad.get("start_date")),
        "end_date": _date_part(ad.get("end_date")),
        "is_active": ad.get("is_active"),
        "publisher_platforms": ad.get("publisher_platform"),
        "collation_count": ad.get("collation_count"),
        "country": COUNTRY,
        "snapshot": json.dumps(snapshot, default=str) if snapshot is not None else None,
        "raw_json": json.dumps(ad, default=str),
    }


def _distinct_page_ids() -> list[str]:
    seen: set[str] = set()
    offset = 0
    while True:
        page = _get("meta_ad_creatives", {
            "select": "page_id", "limit": "1000", "offset": str(offset),
        })
        if not page:
            break
        for r in page:
            if r.get("page_id"):
                seen.add(r["page_id"])
        if len(page) < 1000:
            break
        offset += 1000
    return sorted(seen)


def step_fetch(step) -> int:
    if not SEARCHAPI_API_KEY:
        dry = os.environ.get("DRY_RUN", "").strip().lower() == "true"
        msg = "no_api_key_dry_run" if dry else "no_api_key_skipped"
        print(f"  WARNING: SEARCHAPI_API_KEY not set — {msg}")
        step.set_metadata({"source": msg})
        step.set_counts(rows_in=0, rows_out=0)
        return 0

    page_ids = _distinct_page_ids()[:MAX_PAGES_PER_RUN]
    all_rows: list[dict] = []
    pages_done = 0
    for pid in page_ids:
        token = None
        for _ in range(MAX_PAGES_PER_PAGE_ID):
            data = _searchapi_page(pid, token)
            if not data:
                break
            for ad in data.get("ads", []):
                row = _ad_to_row(ad)
                if row:
                    all_rows.append(row)
            token = (data.get("pagination") or {}).get("next_page_token")
            time.sleep(REQUEST_DELAY_SECONDS)
            if not token:
                break
        pages_done += 1

    rows = _dedup_rows(all_rows, ("ad_archive_id",))
    # ignore-duplicates: only NEW ad_archive_ids are inserted; existing rows
    # (and their keyword-crawl case_type) are left untouched.
    inserted = _bulk_insert("meta_ad_creatives", rows,
                            on_conflict="ad_archive_id",
                            resolution="ignore-duplicates")
    step.set_counts(rows_in=len(rows), rows_out=inserted)
    step.set_metadata({
        "source": "searchapi_meta_ad_library_page_id",
        "pages_crawled": pages_done,
        "ads_seen": len(rows),
        "new_ads_inserted": inserted,
        "capped_at": MAX_PAGES_PER_RUN,
    })
    print(f"\n  pages_crawled={pages_done} ads_seen={len(rows)} new_inserted={inserted}")
    return inserted


def step_publish(step, inserted: int):
    if DRY_RUN:
        step.set_counts(rows_in=inserted, rows_out=inserted)
        step.set_metadata({"dry_run": True})
        return
    total = supabase_count("meta_ad_creatives")
    step.set_counts(rows_in=inserted, rows_out=inserted)
    step.set_metadata({
        "total_ads": total,
        "publish_timestamp": datetime.now(timezone.utc).isoformat(),
    })
    print(f"\n  meta_ad_creatives total: {total}")


def main():
    parser = argparse.ArgumentParser(
        description="Deepen Meta coverage by page-id search of known firm pages")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "true"
        import lib.pipeline
        lib.pipeline.DRY_RUN = True

    trigger = os.environ.get("PIPELINE_TRIGGER", "manual")

    with PipelineRun("meta_pages_daily", trigger=trigger) as run:
        with run.step("fetch_pages") as step:
            inserted = step_fetch(step)
        with run.step("publish") as step:
            step_publish(step, inserted)


if __name__ == "__main__":
    main()
