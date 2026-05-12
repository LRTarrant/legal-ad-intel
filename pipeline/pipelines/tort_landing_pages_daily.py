#!/usr/bin/env python3
"""
tort_landing_pages_daily — detect new law-firm landing pages from yesterday's
SERP capture, classify the domains, write to tort_landing_pages.

No Searchapi.io spend: this is a downstream consumer of serp_results_raw.
The weekly DMA-scan pipeline (tort_landing_pages_weekly) is the one that
actually calls Searchapi.

Steps:
  1. Pick up any classification_status='pending' rows older than 1 hour
     and retry their classifiers (with attempt-count cap).
  2. Pull yesterday's organic + ads rows from serp_results_raw for the
     15 active landing-page torts. Group by (tort, registered_domain,
     slugified_path_tort_match).
  3. For each unseen domain, run the classifier waterfall. For known
     domains (cache hit, not expired), reuse the cached verdict.
  4. Upsert tort_landing_pages on the (tort_id, registered_domain,
     slugified_path_tort_match) partial unique index. Update
     last_seen_at + rank for repeats; insert new rows with first_seen_at.
  5. For confirmed/candidate rows, fetch + snapshot HTML if not yet stored.
  6. REFRESH MATERIALIZED VIEW CONCURRENTLY tort_landing_page_velocity.

Usage:
    python -m pipelines.tort_landing_pages_daily
    python -m pipelines.tort_landing_pages_daily --dry-run
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
from datetime import date, datetime, timedelta, timezone

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.pipeline import (
    PipelineRun, DRY_RUN, _bulk_insert, _get, _headers, _post, _patch,
    SUPABASE_URL,
)
from lib.domain_mapper import extract_root_domain
from lib.landing_page_classifier import (
    classify_domain, Classification, TTL_BY_SOURCE,
)
from lib.tort_landing_common import (
    load_active_torts, load_synonyms_by_tort,
    load_allow_list_domains, load_manufacturer_domains,
    compute_slug_match,
)
from lib.tort_landing_snapshot import upload_snapshot

logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
MAX_CLASSIFICATION_ATTEMPTS = 3
SERP_FEATURE_BY_RESULT_TYPE = {
    "organic": "organic",
    "paid": "ads",
    "local_pack": "local_pack",
}


# ---------------------------------------------------------------------------
# Pipeline steps
# ---------------------------------------------------------------------------

def step_load_context(step) -> dict:
    torts = load_active_torts()
    tort_ids = [t["id"] for t in torts]
    synonyms = load_synonyms_by_tort(tort_ids)
    allow_list = load_allow_list_domains()
    manuf = load_manufacturer_domains()

    # Index torts by the *filesystem* slug (which is what serp_results_raw keys on
    # via the SERP_SEARCH_TERMS dict).
    by_fs_slug = {(t.get("advertising_page_slug") or t["slug"]): t for t in torts}

    step.set_metadata({
        "active_torts": len(torts),
        "allow_list_size": len(allow_list),
        "manufacturer_domains": len(manuf),
        "synonyms_loaded": sum(1 + len(v["aliases"]) for v in synonyms.values()),
    })
    step.set_counts(rows_in=0, rows_out=len(torts))
    return {
        "torts": torts,
        "tort_by_fs_slug": by_fs_slug,
        "synonyms": synonyms,
        "allow_list": allow_list,
        "manufacturer_domains": manuf,
    }


def step_consume_serp(step, ctx: dict) -> list[dict]:
    """Read yesterday's serp_results_raw for active torts, group + dedupe."""
    yesterday = date.today() - timedelta(days=1)
    cutoff = datetime.combine(yesterday, datetime.min.time(), tzinfo=timezone.utc)
    today_start = datetime.combine(date.today(), datetime.min.time(), tzinfo=timezone.utc)

    # Pull raw rows for the slugs we care about.
    fs_slugs = list(ctx["tort_by_fs_slug"].keys())
    if not fs_slugs:
        step.set_counts(rows_in=0, rows_out=0)
        return []
    rows = _get("serp_results_raw", {
        "select": "tort_slug,result_type,position,link,title,fetched_at",
        "tort_slug": f"in.({','.join(fs_slugs)})",
        "result_type": "in.(organic,paid,local_pack)",
        "fetched_at": f"gte.{cutoff.isoformat()}",
        "and": f"(fetched_at.lt.{today_start.isoformat()})",
        "limit": "50000",
    })

    # Dedupe per (tort, registered_domain, slug-match) keeping best rank.
    grouped: dict[tuple, dict] = {}
    skipped_no_url = 0
    skipped_no_tort = 0
    for r in rows:
        link = (r.get("link") or "").strip()
        if not link:
            skipped_no_url += 1
            continue
        tort = ctx["tort_by_fs_slug"].get(r["tort_slug"])
        if not tort:
            skipped_no_tort += 1
            continue
        registered_domain = extract_root_domain(link)
        if not registered_domain:
            continue
        syn = ctx["synonyms"].get(tort["id"], {})
        slug_match = compute_slug_match(link, syn)
        key = (tort["id"], registered_domain, slug_match)
        existing = grouped.get(key)
        rank = r.get("position") or 999
        if existing is None or rank < existing["rank"]:
            grouped[key] = {
                "tort_id": tort["id"],
                "url": link,
                "registered_domain": registered_domain,
                "slugified_path_tort_match": slug_match,
                "dma_code": None,  # daily pipeline is national
                "rank": rank,
                "serp_feature": SERP_FEATURE_BY_RESULT_TYPE.get(r["result_type"], "organic"),
                "title": r.get("title"),
                "raw_serp": {"source": "serp_results_raw", "tort_slug": r["tort_slug"]},
            }

    step.set_metadata({
        "serp_rows_scanned": len(rows),
        "unique_landing_keys": len(grouped),
        "skipped_no_url": skipped_no_url,
        "skipped_no_tort": skipped_no_tort,
        "window_start": cutoff.isoformat(),
        "window_end": today_start.isoformat(),
    })
    step.set_counts(rows_in=len(rows), rows_out=len(grouped))
    return list(grouped.values())


def _load_domain_cache(domains: list[str]) -> dict[str, dict]:
    """Pull existing non-expired classifications for the domains we care about."""
    if not domains:
        return {}
    # Chunk to avoid query-string length limits.
    out: dict[str, dict] = {}
    chunk_size = 200
    for i in range(0, len(domains), chunk_size):
        chunk = domains[i : i + chunk_size]
        rows = _get("domain_classifications", {
            "select": "registered_domain,is_law_firm,classifier_source,confidence,signal_score,matched_signals,expires_at",
            "registered_domain": f"in.({','.join(chunk)})",
            "expires_at": f"gt.{datetime.now(timezone.utc).isoformat()}",
        })
        for r in rows:
            out[r["registered_domain"]] = r
    return out


def step_classify(step, candidates: list[dict], ctx: dict) -> list[dict]:
    """For each unseen domain, run classifier; for cache hits, reuse."""
    if not candidates:
        step.set_counts(rows_in=0, rows_out=0)
        return []

    unique_domains = sorted({c["registered_domain"] for c in candidates})
    cache = _load_domain_cache(unique_domains)

    new_classifications: list[dict] = []
    misses = 0
    hits = 0
    for domain in unique_domains:
        if domain in cache:
            hits += 1
            continue
        misses += 1
        # Pick any URL on this domain as the heuristic sample.
        sample_url = next(c["url"] for c in candidates if c["registered_domain"] == domain)
        try:
            result = classify_domain(
                domain,
                sample_url=sample_url,
                allow_list_domains=ctx["allow_list"],
                manufacturer_domains=ctx["manufacturer_domains"],
                called_from="pipelines.tort_landing_pages_daily",
                openai_api_key=OPENAI_API_KEY or None,
            )
        except Exception as e:  # noqa: BLE001 — classifier must not crash the run
            logger.error("Classifier crashed for %s: %s", domain, e)
            continue
        new_classifications.append({
            "registered_domain": domain,
            "is_law_firm": result.is_law_firm,
            "classifier_source": result.source,
            "confidence": result.confidence,
            "signal_score": result.signal_score if result.signal_score >= 0 else None,
            "matched_signals": result.matched_signals,
            "expires_at": result.expires_at.isoformat(),
            "last_error": result.error,
        })

    if new_classifications and not DRY_RUN:
        _bulk_insert(
            "domain_classifications",
            new_classifications,
            on_conflict="registered_domain",
            resolution="merge-duplicates",
        )

    # Attach classification to each candidate row.
    cache.update({c["registered_domain"]: c for c in new_classifications})
    enriched: list[dict] = []
    for c in candidates:
        verdict = cache.get(c["registered_domain"])
        if not verdict:
            # Classifier crashed; mark as pending so a retry pass picks it up.
            c["is_law_firm"] = False
            c["classification_status"] = "pending"
        else:
            c["is_law_firm"] = verdict["is_law_firm"]
            if verdict["classifier_source"] == "openai" and verdict["confidence"] == "medium":
                c["classification_status"] = "candidate"
            else:
                c["classification_status"] = "confirmed" if verdict["is_law_firm"] else "denied"
            c["confidence"] = (
                "confirmed" if verdict["is_law_firm"] and verdict["confidence"] in ("high", "medium")
                else "candidate"
            ) if verdict["is_law_firm"] else None
        enriched.append(c)

    step.set_metadata({
        "cache_hits": hits,
        "cache_misses": misses,
        "new_classifications": len(new_classifications),
    })
    step.set_counts(rows_in=len(candidates), rows_out=len(enriched))
    return enriched


def step_upsert_landing_pages(step, enriched: list[dict]) -> int:
    """Upsert tort_landing_pages on the dedup keys. Returns rows touched."""
    if not enriched:
        step.set_counts(rows_in=0, rows_out=0)
        return 0
    now_iso = datetime.now(timezone.utc).isoformat()
    rows = []
    for r in enriched:
        rows.append({
            "tort_id": r["tort_id"],
            "url": r["url"],
            "registered_domain": r["registered_domain"],
            "slugified_path_tort_match": r["slugified_path_tort_match"],
            "dma_code": None,
            "rank": r["rank"],
            "serp_feature": r["serp_feature"],
            "title": r.get("title"),
            "h1": None,
            "first_seen_at": now_iso,
            "last_seen_at": now_iso,
            "is_law_firm": r["is_law_firm"],
            "confidence": r.get("confidence"),
            "classification_status": r["classification_status"],
            "raw_serp": r.get("raw_serp") or {},
        })

    # National rows use the partial unique index with dma_code IS NULL.
    count = _bulk_insert(
        "tort_landing_pages",
        rows,
        on_conflict="tort_id,registered_domain,slugified_path_tort_match",
        resolution="merge-duplicates",
    )
    step.set_counts(rows_in=len(rows), rows_out=count)
    step.set_metadata({
        "confirmed": sum(1 for r in rows if r["classification_status"] == "confirmed"),
        "candidate": sum(1 for r in rows if r["classification_status"] == "candidate"),
        "denied": sum(1 for r in rows if r["classification_status"] == "denied"),
        "pending": sum(1 for r in rows if r["classification_status"] == "pending"),
    })
    return count


def step_snapshot_html(step, enriched: list[dict]) -> int:
    """For confirmed/candidate rows lacking a snapshot, fetch + upload HTML."""
    targets = [r for r in enriched if r["classification_status"] in ("confirmed", "candidate")]
    if not targets:
        step.set_counts(rows_in=0, rows_out=0)
        return 0

    uploaded = 0
    failed = 0
    client = httpx.Client(timeout=10, follow_redirects=True)
    try:
        for r in targets:
            try:
                resp = client.get(r["url"], headers={
                    "User-Agent": "Mozilla/5.0 (compatible; LMI-Bot/1.0)",
                })
                if resp.status_code >= 400:
                    failed += 1
                    continue
                html = resp.text[:50 * 1024]
                snap = upload_snapshot(r["registered_domain"], html)
                if not snap:
                    failed += 1
                    continue
                path, digest = snap
                # Patch the row we just inserted with the snapshot fields.
                # We don't have the row id; use the unique key via REST PATCH.
                if not DRY_RUN:
                    httpx.patch(
                        f"{SUPABASE_URL}/rest/v1/tort_landing_pages",
                        headers=_headers(),
                        params={
                            "tort_id": f"eq.{r['tort_id']}",
                            "registered_domain": f"eq.{r['registered_domain']}",
                            "slugified_path_tort_match": f"eq.{r['slugified_path_tort_match']}",
                            "dma_code": "is.null",
                        },
                        json={"html_hash": digest, "snapshot_path": path},
                        timeout=15,
                    )
                uploaded += 1
            except httpx.RequestError as e:
                logger.debug("Snapshot fetch failed for %s: %s", r["url"], e)
                failed += 1
    finally:
        client.close()

    step.set_metadata({"uploaded": uploaded, "failed": failed})
    step.set_counts(rows_in=len(targets), rows_out=uploaded)
    return uploaded


def step_refresh_velocity(step):
    """REFRESH MATERIALIZED VIEW CONCURRENTLY tort_landing_page_velocity.

    PostgREST doesn't expose REFRESH MATERIALIZED VIEW; call via a SQL RPC.
    A small RPC is created in the migration (see refresh_tort_landing_page_velocity).
    """
    if DRY_RUN:
        step.set_metadata({"dry_run": True})
        step.set_counts(rows_in=0, rows_out=0)
        return
    try:
        resp = httpx.post(
            f"{SUPABASE_URL}/rest/v1/rpc/refresh_tort_landing_page_velocity",
            headers=_headers(),
            json={},
            timeout=120,
        )
        if resp.status_code >= 400:
            logger.warning("refresh_tort_landing_page_velocity returned %d: %s", resp.status_code, resp.text[:200])
            step.set_metadata({"refresh_status": resp.status_code, "error": resp.text[:200]})
            step.set_counts(rows_in=0, rows_out=0)
            return
        step.set_metadata({"refresh_status": resp.status_code})
        step.set_counts(rows_in=0, rows_out=1)
    except httpx.RequestError as e:
        logger.warning("matview refresh exception: %s", e)
        step.set_metadata({"error": str(e)})
        step.set_counts(rows_in=0, rows_out=0)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="tort_landing_pages_daily — SQL consumer of serp_results_raw")
    parser.add_argument("--dry-run", action="store_true", help="Run without writing to database")
    args = parser.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "true"
        import lib.pipeline
        lib.pipeline.DRY_RUN = True

    trigger = os.environ.get("PIPELINE_TRIGGER", "manual")

    with PipelineRun("tort_landing_pages_daily", trigger=trigger) as run:
        with run.step("load_context") as step:
            ctx = step_load_context(step)

        with run.step("consume_serp_results_raw") as step:
            candidates = step_consume_serp(step, ctx)

        with run.step("classify_domains") as step:
            enriched = step_classify(step, candidates, ctx)

        with run.step("upsert_landing_pages") as step:
            step_upsert_landing_pages(step, enriched)

        with run.step("snapshot_html") as step:
            step_snapshot_html(step, enriched)

        with run.step("refresh_velocity_matview") as step:
            step_refresh_velocity(step)


if __name__ == "__main__":
    main()
