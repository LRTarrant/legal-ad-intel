#!/usr/bin/env python3
"""
advertiser_rematch_daily — backfill advertiser_id on historical
ad_observations_raw rows.

When advertiser_entities is updated (new firm seeded, new alias added),
historical rows with advertiser_id IS NULL are NOT retroactively
matched by the live ingestion pipelines. This pipeline runs after the
ad ingestion pipelines finish and back-fills those misses.

Two passes:

    1. domain_match — server-side via the
       advertiser_rematch_by_domain(p_limit, p_dry_run) RPC.
    2. name_match — for any remaining unmatched rows whose creative_url
       is null/empty, fetch (id, advertiser_raw) and run each through
       DomainMapper.match_name. Update where matched.

Idempotent: a second run immediately after the first should match 0
new rows.

Usage:
    python -m pipelines.advertiser_rematch_daily
    python -m pipelines.advertiser_rematch_daily --dry-run

Environment variables:
    SUPABASE_URL            — Supabase project URL (required)
    SUPABASE_SERVICE_KEY    — Supabase service role key (required)
    DRY_RUN                 — "true" to skip all DB writes (optional)
    PIPELINE_TRIGGER        — "scheduled" | "manual" (optional)
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from datetime import datetime, timezone

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.pipeline import (
    PipelineRun, DRY_RUN,
    _get, _patch, _headers,
    SUPABASE_URL,
)
from lib.domain_mapper import DomainMapper

logger = logging.getLogger(__name__)

DOMAIN_MATCH_LIMIT = 50_000
NAME_MATCH_LIMIT = 50_000
NAME_MATCH_PAGE = 1000


def supabase_query(table: str, params: dict) -> list[dict]:
    return _get(table, params)


def _supabase_count(table: str, filters: dict) -> int:
    """HEAD with Prefer: count=exact to read total row count for a query."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {**_headers(), "Prefer": "count=exact"}
    params = {**filters, "select": "id"}
    resp = httpx.head(url, headers=headers, params=params, timeout=30)
    resp.raise_for_status()
    cr = resp.headers.get("content-range", "")
    if "/" in cr:
        total = cr.split("/")[-1]
        return int(total) if total != "*" else 0
    return 0


def _unmatched_count_by_source() -> dict[str, int]:
    out: dict[str, int] = {}
    for src in ("google_ads", "tiktok_ads", "meta_ad_library"):
        out[src] = _supabase_count(
            "ad_observations_raw",
            {"advertiser_id": "is.null", "source": f"eq.{src}"},
        )
    return out


def _call_rematch_rpc(*, limit: int, dry_run: bool) -> dict:
    url = f"{SUPABASE_URL}/rest/v1/rpc/advertiser_rematch_by_domain"
    resp = httpx.post(
        url,
        headers=_headers(),
        json={"p_limit": limit, "p_dry_run": dry_run},
        timeout=300,
    )
    resp.raise_for_status()
    body = resp.json()
    if isinstance(body, list) and body:
        return body[0]
    if isinstance(body, dict):
        return body
    return {"matched_count": 0, "scanned_count": 0, "eligible_count": 0, "by_source": {}}


def step_domain_match(step) -> int:
    pre_counts = _unmatched_count_by_source()
    pre_total = sum(pre_counts.values())

    if DRY_RUN:
        result = _call_rematch_rpc(limit=DOMAIN_MATCH_LIMIT, dry_run=True)
        step.set_metadata({
            "dry_run": True,
            "would_match_count": result.get("matched_count", 0),
            "scanned_count":     result.get("scanned_count", 0),
            "eligible_count":    result.get("eligible_count", 0),
            "by_source":         result.get("by_source", {}),
            "pre_run_unmatched_by_source": pre_counts,
        })
        step.set_counts(rows_in=pre_total, rows_out=0)
        return 0

    result = _call_rematch_rpc(limit=DOMAIN_MATCH_LIMIT, dry_run=False)
    matched = int(result.get("matched_count", 0))
    scanned = int(result.get("scanned_count", 0))
    eligible = int(result.get("eligible_count", 0))
    by_source = result.get("by_source", {}) or {}

    step.set_metadata({
        "matched_count":   matched,
        "scanned_count":   scanned,
        "eligible_count":  eligible,
        "by_source":       by_source,
        "limit_per_run":   DOMAIN_MATCH_LIMIT,
        "limit_saturated": eligible > DOMAIN_MATCH_LIMIT,
        "pre_run_unmatched_by_source":  pre_counts,
        "post_run_unmatched_by_source": _unmatched_count_by_source(),
    })
    step.set_counts(rows_in=pre_total, rows_out=matched)
    if eligible > DOMAIN_MATCH_LIMIT:
        logger.warning(
            "Backlog (%d eligible) exceeds limit (%d). Oldest %d processed; "
            "remainder will be picked up by tomorrow's run.",
            eligible, DOMAIN_MATCH_LIMIT, DOMAIN_MATCH_LIMIT,
        )
    print(f"  domain_match: matched={matched} / scanned={scanned} (eligible={eligible})")
    return matched


def step_name_match(step) -> int:
    advertisers = supabase_query(
        "advertiser_entities",
        {"select": "id,canonical_name,website,aliases"},
    )
    if not advertisers:
        step.set_metadata({"skipped": True, "reason": "no advertisers loaded"})
        step.set_counts(rows_in=0, rows_out=0)
        return 0

    mapper = DomainMapper(advertisers)

    candidates: list[dict] = []
    page_offset = 0
    while len(candidates) < NAME_MATCH_LIMIT:
        page = _get("ad_observations_raw", {
            "select": "id,advertiser_raw,source",
            "advertiser_id": "is.null",
            "advertiser_raw": "not.is.null",
            "source": "in.(google_ads,tiktok_ads,meta_ad_library)",
            "order": "ingested_at.asc.nullslast",
            "limit": str(min(NAME_MATCH_PAGE, NAME_MATCH_LIMIT - len(candidates))),
            "offset": str(page_offset),
        })
        if not page:
            break
        candidates.extend(page)
        page_offset += len(page)
        if len(page) < NAME_MATCH_PAGE:
            break

    matched = 0
    by_source: dict[str, int] = {}
    unmatched_names: set[str] = set()
    for row in candidates:
        adv_raw = (row.get("advertiser_raw") or "").strip()
        if not adv_raw or adv_raw.lower() == "unknown":
            continue
        eid = mapper.match_name(adv_raw)
        if not eid:
            unmatched_names.add(adv_raw[:80])
            continue
        if DRY_RUN:
            matched += 1
            by_source[row.get("source", "?")] = by_source.get(row.get("source", "?"), 0) + 1
            continue
        try:
            _patch("ad_observations_raw", row["id"], {"advertiser_id": eid})
            matched += 1
            by_source[row.get("source", "?")] = by_source.get(row.get("source", "?"), 0) + 1
        except Exception as e:
            logger.warning("PATCH failed for raw row %s: %s", row.get("id"), e)
            continue

    step.set_metadata({
        "candidates_considered": len(candidates),
        "matched_count":         matched,
        "by_source":             by_source,
        "limit_per_run":         NAME_MATCH_LIMIT,
        "sample_unmatched_names": list(unmatched_names)[:50],
        "dry_run":               DRY_RUN,
    })
    step.set_counts(rows_in=len(candidates), rows_out=matched)
    print(f"  name_match: matched={matched} / candidates={len(candidates)}")
    return matched


def step_report(step, domain_matched: int, name_matched: int) -> None:
    post_counts = _unmatched_count_by_source()
    step.set_metadata({
        "domain_matches":     domain_matched,
        "name_matches":       name_matched,
        "remaining_unmatched_by_source": post_counts,
        "remaining_unmatched_total":     sum(post_counts.values()),
        "report_timestamp":   datetime.now(timezone.utc).isoformat(),
    })
    step.set_counts(rows_in=0, rows_out=0)
    print(
        f"\n  report: domain={domain_matched} name={name_matched} "
        f"remaining={sum(post_counts.values())}"
    )


def main():
    parser = argparse.ArgumentParser(
        description="Daily advertiser re-matcher (backfill historical advertiser_id)"
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Compute counts without writing to the DB")
    args = parser.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "true"
        import lib.pipeline
        lib.pipeline.DRY_RUN = True

    trigger = os.environ.get("PIPELINE_TRIGGER", "manual")

    with PipelineRun("advertiser_rematch_daily", trigger=trigger) as run:
        with run.step("domain_match") as step:
            domain_matched = step_domain_match(step)

        with run.step("name_match") as step:
            name_matched = step_name_match(step)

        with run.step("report") as step:
            step_report(step, domain_matched, name_matched)


if __name__ == "__main__":
    main()
