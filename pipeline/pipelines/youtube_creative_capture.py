#!/usr/bin/env python3
"""
youtube_creative_capture pipeline — resolve YouTube ad creatives to a video id.

youtube_ad_creatives stores only a transparency `details_link` + `raw_json`.
The raw_json carries a `details_script_link` (a googleusercontent preview
content.js) whose body embeds the creative's YouTube thumbnail URL
(i.ytimg.com/vi/<VIDEO_ID>/...). We fetch that script and extract the video id,
which lets the in-app creative modal render a permanent thumbnail
(i.ytimg.com never expires) + the real watch/embed URL — no headless browser
and no Storage needed (unlike Meta, whose fbcdn URLs expire).

Idempotent: only processes rows where video_id IS NULL AND creative_captured_at
IS NULL. Rows whose creative has no resolvable video (image/text ads) are
stamped with creative_captured_at so they aren't retried forever.

Usage:
    python -m pipelines.youtube_creative_capture
    python -m pipelines.youtube_creative_capture --dry-run

Environment variables:
    SUPABASE_URL, SUPABASE_SERVICE_KEY (required)
    DRY_RUN ("true" to skip DB writes)
    PIPELINE_TRIGGER ("scheduled" | "manual")
    YOUTUBE_CAPTURE_MAX (optional, default 3000)
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
from datetime import datetime, timezone

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.pipeline import PipelineRun, _get, _patch  # noqa: E402

logger = logging.getLogger(__name__)

PAGE_SIZE = 500
MAX_PER_RUN = int(os.environ.get("YOUTUBE_CAPTURE_MAX", "3000"))
FETCH_UA = "Mozilla/5.0 (compatible; LMI-creative-capture/1.0)"

# YouTube ids are 11 chars; capture from the thumbnail path or a watch/embed URL.
_VIDEO_ID_PATTERNS = [
    re.compile(r"ytimg\.com/vi/([A-Za-z0-9_-]{11})/"),
    re.compile(r"youtube\.com/(?:watch\?v=|embed/|vi/)([A-Za-z0-9_-]{11})"),
    re.compile(r"youtu\.be/([A-Za-z0-9_-]{11})"),
]


def extract_video_id(script_body: str) -> str | None:
    """Pull the first YouTube video id out of a details-script body."""
    if not script_body:
        return None
    for pat in _VIDEO_ID_PATTERNS:
        m = pat.search(script_body)
        if m:
            return m.group(1)
    return None


def _details_script_link(raw_json) -> str | None:
    """raw_json is stored via json.dumps() so it reads back as a string."""
    if isinstance(raw_json, str):
        try:
            raw_json = json.loads(raw_json)
        except (json.JSONDecodeError, ValueError):
            return None
    if isinstance(raw_json, dict):
        link = raw_json.get("details_script_link")
        return link if isinstance(link, str) and link else None
    return None


def _fetch_uncaptured() -> list[dict]:
    rows: list[dict] = []
    offset = 0
    while len(rows) < MAX_PER_RUN:
        page = _get("youtube_ad_creatives", {
            "select": "id,creative_id,raw_json",
            "video_id": "is.null",
            "creative_captured_at": "is.null",
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
    candidates = _fetch_uncaptured()
    captured = 0    # resolved a video id
    no_video = 0    # fetched but no video id (image/text ad) — stamped, not retried
    failed = 0      # fetch error (left for retry next run)
    now = datetime.now(timezone.utc).isoformat()

    with httpx.Client(timeout=30, follow_redirects=True,
                      headers={"User-Agent": FETCH_UA}) as client:
        for row in candidates:
            link = _details_script_link(row.get("raw_json"))
            if not link:
                # No script link at all — stamp so we don't re-scan it forever.
                _patch("youtube_ad_creatives", row["id"], {"creative_captured_at": now})
                no_video += 1
                continue
            try:
                resp = client.get(link)
            except httpx.RequestError as e:
                logger.warning("script fetch error for %s: %s", row["creative_id"], e)
                failed += 1
                continue
            if resp.status_code >= 400:
                logger.warning("script fetch %d for %s", resp.status_code, row["creative_id"])
                failed += 1
                continue
            vid = extract_video_id(resp.text)
            if vid:
                _patch("youtube_ad_creatives", row["id"],
                       {"video_id": vid, "creative_captured_at": now})
                captured += 1
            else:
                _patch("youtube_ad_creatives", row["id"], {"creative_captured_at": now})
                no_video += 1

    step.set_counts(rows_in=len(candidates), rows_out=captured, rows_rejected=failed)
    step.set_metadata({
        "candidates": len(candidates),
        "captured": captured,
        "no_video": no_video,
        "failed": failed,
        "capped_at": MAX_PER_RUN,
    })
    print(f"\n  captured={captured} no_video={no_video} failed={failed} "
          f"(of {len(candidates)} candidates)")
    return {"captured": captured, "candidates": len(candidates)}


def step_publish(step, result: dict):
    remaining = _get("youtube_ad_creatives", {
        "select": "id", "video_id": "is.null", "creative_captured_at": "is.null",
        "limit": "1",
    })
    step.set_counts(rows_in=result["candidates"], rows_out=result["captured"])
    step.set_metadata({
        "captured_this_run": result["captured"],
        "uncaptured_remaining": "1+" if remaining else "0",
        "publish_timestamp": datetime.now(timezone.utc).isoformat(),
    })
    print(f"\n  uncaptured rows remaining: {'1+' if remaining else '0'}")


def main():
    parser = argparse.ArgumentParser(
        description="Resolve YouTube ad creatives to a video id for in-app display")
    parser.add_argument("--dry-run", action="store_true",
                        help="Skip DB writes")
    args = parser.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "true"
        import lib.pipeline
        lib.pipeline.DRY_RUN = True

    trigger = os.environ.get("PIPELINE_TRIGGER", "manual")

    with PipelineRun("youtube_creative_capture", trigger=trigger) as run:
        with run.step("capture") as step:
            result = step_capture(step)
        with run.step("publish") as step:
            step_publish(step, result)


if __name__ == "__main__":
    main()
