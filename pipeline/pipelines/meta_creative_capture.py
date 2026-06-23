#!/usr/bin/env python3
"""
meta_creative_capture pipeline — durable Meta ad creative.

The Meta Ad Library snapshot on meta_ad_creatives.snapshot carries direct fbcdn
URLs to each ad's image / video poster, but those URLs expire and CORS-block, so
the in-app creative modal can't rely on them. This pipeline downloads each
uncaptured ad's image bytes once and stores them in the public `ad-creatives`
Storage bucket, writing the durable public URL back to
meta_ad_creatives.creative_image_url. No headless browser is involved (YouTube
creative, which has no stored image, is a separate follow-up).

Idempotent: only processes rows where creative_image_url IS NULL.

Usage:
    python -m pipelines.meta_creative_capture
    python -m pipelines.meta_creative_capture --dry-run
    DRY_RUN=true python -m pipelines.meta_creative_capture

Environment variables:
    SUPABASE_URL            — Supabase project URL (required)
    SUPABASE_SERVICE_KEY    — Supabase service role key (required)
    DRY_RUN                 — "true" to skip all DB writes / uploads (optional)
    PIPELINE_TRIGGER        — "scheduled" | "manual" (optional, default "manual")
    META_CAPTURE_MAX        — cap rows processed per run (optional, default 2000)
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.pipeline import PipelineRun, _get, _patch  # noqa: E402
from lib.ad_creative_upload import (  # noqa: E402
    upload_creative_image,
    download_image,
    ext_for_content_type,
)

logger = logging.getLogger(__name__)

PAGE_SIZE = 500
MAX_PER_RUN = int(os.environ.get("META_CAPTURE_MAX", "2000"))


def _parse_snapshot(raw) -> dict | None:
    """meta_ads_daily stores snapshot via json.dumps(), so it reads back as a
    JSON string; handle both string and already-parsed object defensively."""
    if not raw:
        return None
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else None
        except (json.JSONDecodeError, ValueError):
            return None
    return None


def best_image_url(snap: dict) -> str | None:
    """Pick the most representative still image from a Meta snapshot:
    video poster first (video ads), then a static image, then a carousel card."""
    videos = snap.get("videos") or []
    if isinstance(videos, list):
        for v in videos:
            if isinstance(v, dict) and v.get("video_preview_image_url"):
                return v["video_preview_image_url"]

    images = snap.get("images") or []
    if isinstance(images, list):
        for img in images:
            if isinstance(img, dict):
                url = img.get("original_image_url") or img.get("resized_image_url")
                if url:
                    return url

    cards = snap.get("cards") or []
    if isinstance(cards, list):
        for c in cards:
            if isinstance(c, dict):
                url = (
                    c.get("original_image_url")
                    or c.get("resized_image_url")
                    or c.get("video_preview_image_url")
                )
                if url:
                    return url
    return None


def _fetch_uncaptured() -> list[dict]:
    """Page through meta_ad_creatives rows still missing a stored image."""
    rows: list[dict] = []
    offset = 0
    while len(rows) < MAX_PER_RUN:
        page = _get("meta_ad_creatives", {
            "select": "id,ad_archive_id,snapshot",
            "creative_image_url": "is.null",
            "order": "first_ingested_at.asc",
            "limit": str(PAGE_SIZE),
            "offset": str(offset),
        })
        if not page:
            break
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return rows[:MAX_PER_RUN]


def step_capture(step) -> dict:
    """Download + store the creative image for each uncaptured ad."""
    candidates = _fetch_uncaptured()

    captured = 0
    no_image = 0    # snapshot had no usable image URL
    failed = 0      # download or upload failed (left NULL, retried next run)

    for row in candidates:
        snap = _parse_snapshot(row.get("snapshot"))
        src = best_image_url(snap) if snap else None
        if not src:
            no_image += 1
            continue

        dl = download_image(src)
        if not dl:
            failed += 1
            continue
        image_bytes, content_type = dl

        ext = ext_for_content_type(content_type)
        path = f"meta/{row['ad_archive_id']}.{ext}"
        url = upload_creative_image(path, image_bytes, content_type=content_type)
        if not url:
            failed += 1
            continue

        _patch("meta_ad_creatives", row["id"], {
            "creative_image_url": url,
            "creative_image_path": path,
            "creative_captured_at": datetime.now(timezone.utc).isoformat(),
        })
        captured += 1

    step.set_counts(rows_in=len(candidates), rows_out=captured, rows_rejected=failed)
    step.set_metadata({
        "candidates": len(candidates),
        "captured": captured,
        "no_image_in_snapshot": no_image,
        "failed": failed,
        "capped_at": MAX_PER_RUN,
    })
    print(f"\n  captured={captured} no_image={no_image} failed={failed} "
          f"(of {len(candidates)} candidates)")
    return {"captured": captured, "candidates": len(candidates)}


def step_publish(step, result: dict):
    """Report remaining capture coverage."""
    remaining = _get("meta_ad_creatives", {
        "select": "id",
        "creative_image_url": "is.null",
        "limit": "1",
    })
    still_missing = "1+" if remaining else "0"
    step.set_counts(rows_in=result["candidates"], rows_out=result["captured"])
    step.set_metadata({
        "captured_this_run": result["captured"],
        "uncaptured_remaining": still_missing,
        "publish_timestamp": datetime.now(timezone.utc).isoformat(),
    })
    print(f"\n  uncaptured rows remaining: {still_missing}")


def main():
    parser = argparse.ArgumentParser(
        description="Download + store Meta ad creative images for durable display")
    parser.add_argument("--dry-run", action="store_true",
                        help="Skip Storage uploads and DB writes")
    args = parser.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "true"
        import lib.pipeline
        lib.pipeline.DRY_RUN = True

    trigger = os.environ.get("PIPELINE_TRIGGER", "manual")

    with PipelineRun("meta_creative_capture", trigger=trigger) as run:
        with run.step("capture") as step:
            result = step_capture(step)
        with run.step("publish") as step:
            step_publish(step, result)


if __name__ == "__main__":
    main()
