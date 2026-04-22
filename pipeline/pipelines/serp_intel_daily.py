#!/usr/bin/env python3
"""
serp_intel_daily pipeline — SERP visibility intelligence via Searchapi.io.

Searches Google for tort-related keywords and stores ALL result types
(organic, paid, local pack, featured snippets, PAA) into the separate
SERP tables: serp_results_raw → serp_results_normalized → serp_visibility_scores.

Usage:
    python -m pipelines.serp_intel_daily
    python -m pipelines.serp_intel_daily --dry-run
    DRY_RUN=true python -m pipelines.serp_intel_daily

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
from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.pipeline import (
    PipelineRun, DRY_RUN,
    _get, _bulk_insert, _delete,
    SUPABASE_URL, _headers,
)
from lib.domain_mapper import DomainMapper, extract_root_domain

logger = logging.getLogger(__name__)

SEARCHAPI_API_KEY = os.environ.get("SEARCHAPI_API_KEY", "")
SEARCHAPI_BASE = "https://www.searchapi.io/api/v1/search"
REQUEST_DELAY_SECONDS = 1.5
MAX_RETRIES = 3

# Tort → SERP search keywords
SERP_SEARCH_TERMS: dict[str, list[str]] = {
    "camp_lejeune":      ["camp lejeune lawsuit", "camp lejeune water contamination lawyer"],
    "hair_relaxer":      ["hair relaxer lawsuit", "hair relaxer cancer attorney"],
    "roundup":           ["roundup lawsuit", "roundup weedkiller cancer"],
    "talcum_powder":     ["talcum powder lawsuit", "baby powder ovarian cancer lawsuit"],
    "paraquat":          ["paraquat lawsuit", "paraquat parkinsons"],
    "firefighter_foam":  ["afff lawsuit", "firefighting foam cancer lawsuit"],
    "nec_baby_formula":  ["nec baby formula lawsuit", "similac enfamil nec"],
    "tylenol_autism":    ["tylenol autism lawsuit", "acetaminophen pregnancy autism"],
    "zantac":            ["zantac lawsuit", "ranitidine cancer"],
    "hernia_mesh":       ["hernia mesh lawsuit", "hernia mesh complications"],
    "social_media":      ["social media lawsuit children", "social media harm teens lawsuit"],
    "motor_vehicle":     ["car accident lawyer near me", "auto accident attorney"],
    "truck_accident":    ["truck accident lawyer", "18 wheeler accident attorney"],
    "nursing_home":      ["nursing home abuse lawyer", "nursing home neglect lawsuit"],
    "workers_comp":      ["workers compensation lawyer", "workers comp attorney near me"],
    "roblox_abuse":      ["roblox child abuse lawsuit", "roblox predator lawsuit"],
    "social_media_addiction": ["social media addiction lawsuit", "tiktok addiction lawsuit teens"],
    "depo_provera":          ["depo provera lawsuit", "depo provera meningioma", "depo provera brain tumor lawyer"],
    "glp1_gastroparesis":     ["ozempic lawsuit", "ozempic stomach paralysis", "glp-1 gastroparesis lawsuit"],
    "glp1_vision_loss":       ["ozempic blindness lawsuit", "glp-1 vision loss naion", "ozempic naion lawsuit"],
    "uber-sexual-assault":    ["uber sexual assault", "uber lawsuit", "uber safety", "rideshare sexual assault", "uber driver assault", "uber rape lawsuit", "uber mdl 3084", "rideshare lawsuit"],
    "bard-powerport":         ["bard powerport lawsuit", "port catheter recall", "bard powerport complications"],
    "lyft-sexual-assault":    ["lyft sexual assault lawsuit", "lyft ride assault lawyer"],
    "cpap":                   ["philips cpap lawsuit", "philips respironics recall", "cpap cancer lawsuit", "dreamstation recall lawsuit", "cpap foam lawsuit"],
    "3m_earplugs":            ["3m earplugs lawsuit", "3m combat arms lawsuit", "3m military earplug settlement", "3m earplug hearing loss lawsuit"],
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


def _searchapi_google(query: str) -> dict:
    """Call Searchapi.io Google Search and return JSON response."""
    if not SEARCHAPI_API_KEY:
        return {}

    for attempt in range(MAX_RETRIES):
        try:
            resp = httpx.get(SEARCHAPI_BASE, params={
                "engine": "google",
                "q": query,
                "api_key": SEARCHAPI_API_KEY,
                "gl": "us",
                "hl": "en",
                "num": 20,
            }, timeout=30)

            if resp.status_code == 429:
                backoff = 2 ** attempt * REQUEST_DELAY_SECONDS
                logger.warning("Rate limited on '%s', backing off %.1fs", query, backoff)
                time.sleep(backoff)
                continue

            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as e:
            if attempt < MAX_RETRIES - 1:
                logger.warning("Searchapi error for '%s': %s, retrying", query, e)
                time.sleep(2 ** attempt * REQUEST_DELAY_SECONDS)
            else:
                logger.error("Searchapi failed for '%s' after %d attempts: %s", query, MAX_RETRIES, e)
    return {}


def _parse_serp_results(serp_data: dict, query: str, tort_slug: str) -> list[dict]:
    """Parse all result types from a Searchapi.io response into serp_results_raw rows."""
    now = datetime.now(timezone.utc)
    rows: list[dict] = []

    # Organic results
    for i, r in enumerate(serp_data.get("organic_results", [])):
        rows.append({
            "query": query,
            "tort_slug": tort_slug,
            "result_type": "organic",
            "position": r.get("position", i + 1),
            "page": 1,
            "title": r.get("title"),
            "link": r.get("link"),
            "displayed_link": r.get("displayed_link"),
            "domain": extract_root_domain(r.get("link", "")),
            "snippet": r.get("snippet"),
            "sitelinks": json.dumps(r.get("sitelinks")) if r.get("sitelinks") else None,
            "rich_attributes": None,
            "source": "searchapi_google",
            "fetched_at": now.isoformat(),
            "raw_payload": json.dumps(r, default=str),
        })

    # Paid ads
    for i, r in enumerate(serp_data.get("ads", [])):
        rows.append({
            "query": query,
            "tort_slug": tort_slug,
            "result_type": "paid",
            "position": i + 1,
            "page": 1,
            "title": r.get("title"),
            "link": r.get("link"),
            "displayed_link": r.get("displayed_link"),
            "domain": extract_root_domain(r.get("link", "") or r.get("displayed_link", "")),
            "snippet": r.get("description"),
            "sitelinks": json.dumps(r.get("sitelinks")) if r.get("sitelinks") else None,
            "rich_attributes": None,
            "source": "searchapi_google",
            "fetched_at": now.isoformat(),
            "raw_payload": json.dumps(r, default=str),
        })

    # Local pack
    for i, r in enumerate(serp_data.get("local_results", [])):
        rows.append({
            "query": query,
            "tort_slug": tort_slug,
            "result_type": "local_pack",
            "position": i + 1,
            "page": 1,
            "title": r.get("title"),
            "link": r.get("link"),
            "displayed_link": None,
            "domain": extract_root_domain(r.get("link", "")),
            "snippet": r.get("description") or r.get("address"),
            "sitelinks": None,
            "rich_attributes": json.dumps({
                "rating": r.get("rating"),
                "reviews": r.get("reviews"),
                "address": r.get("address"),
                "phone": r.get("phone"),
            }, default=str),
            "source": "searchapi_google",
            "fetched_at": now.isoformat(),
            "raw_payload": json.dumps(r, default=str),
        })

    # Featured snippet / answer box
    answer_box = serp_data.get("answer_box")
    if answer_box and isinstance(answer_box, dict):
        rows.append({
            "query": query,
            "tort_slug": tort_slug,
            "result_type": "featured_snippet",
            "position": 0,
            "page": 1,
            "title": answer_box.get("title"),
            "link": answer_box.get("link"),
            "displayed_link": answer_box.get("displayed_link"),
            "domain": extract_root_domain(answer_box.get("link", "")),
            "snippet": answer_box.get("snippet") or answer_box.get("answer"),
            "sitelinks": None,
            "rich_attributes": json.dumps(answer_box, default=str),
            "source": "searchapi_google",
            "fetched_at": now.isoformat(),
            "raw_payload": json.dumps(answer_box, default=str),
        })

    # People Also Ask
    for i, r in enumerate(serp_data.get("related_questions", [])):
        rows.append({
            "query": query,
            "tort_slug": tort_slug,
            "result_type": "people_also_ask",
            "position": i + 1,
            "page": 1,
            "title": r.get("question"),
            "link": r.get("link"),
            "displayed_link": r.get("displayed_link"),
            "domain": extract_root_domain(r.get("link", "")),
            "snippet": r.get("snippet") or r.get("answer"),
            "sitelinks": None,
            "rich_attributes": None,
            "source": "searchapi_google",
            "fetched_at": now.isoformat(),
            "raw_payload": json.dumps(r, default=str),
        })

    return rows


def _generate_seed_serp(torts: list[dict]) -> list[dict]:
    """Generate realistic seed SERP data when SEARCHAPI_API_KEY is not set."""
    import random

    now = datetime.now(timezone.utc)
    rows: list[dict] = []
    sample_domains = [
        "bencrump.com", "morganandmorgan.com", "classaction.org",
        "torhoerman.com", "lawsuit-information-center.com",
        "aboutlawsuits.com", "drugwatch.com", "sokolovelaw.com",
        "weitzlux.com", "levinlaw.com", "nolo.com", "findlaw.com",
    ]
    result_types = ["organic", "paid", "local_pack", "featured_snippet", "people_also_ask"]

    for tort in torts:
        slug = tort["slug"]
        query = f"{tort['label']} lawsuit"
        for pos in range(1, 12):
            rtype = random.choice(result_types) if pos > 3 else ("paid" if pos <= 2 else "organic")
            domain = random.choice(sample_domains)
            rows.append({
                "query": query,
                "tort_slug": slug,
                "result_type": rtype,
                "position": pos,
                "page": 1,
                "title": f"{tort['label']} Lawsuit - Free Case Review",
                "link": f"https://{domain}/{slug}",
                "displayed_link": domain,
                "domain": domain,
                "snippet": f"Were you affected by {tort['label']}? You may be entitled to compensation.",
                "sitelinks": None,
                "rich_attributes": None,
                "source": "searchapi_google",
                "fetched_at": now.isoformat(),
                "raw_payload": json.dumps({"seed": True}),
            })

    return rows


# ---------------------------------------------------------------------------
# Pipeline steps
# ---------------------------------------------------------------------------

def step_fetch_raw(step) -> list[dict]:
    """Fetch SERP results from Google via Searchapi.io."""
    torts = supabase_query("torts", {"select": "id,slug,label"})
    if not torts:
        raise ValueError("No torts found in database")

    if not SEARCHAPI_API_KEY:
        print("  WARNING: SEARCHAPI_API_KEY not set — using seed data")
        rows = _generate_seed_serp(torts)
        step.set_metadata({"source": "seed_data", "rows": len(rows)})
        count = _bulk_insert("serp_results_raw", rows)
        step.set_counts(rows_in=0, rows_out=count)
        return rows

    rows: list[dict] = []
    per_tort_counts: dict[str, int] = {}
    failed_torts: list[str] = []
    tort_by_slug = {t["slug"]: t for t in torts}

    for slug, terms in SERP_SEARCH_TERMS.items():
        if slug not in tort_by_slug:
            logger.info("  Tort '%s' not found in DB, skipping", slug)
            continue

        tort_count = 0
        try:
            for term in terms:
                logger.info("  SERP search: '%s' (tort: %s)", term, slug)
                serp_data = _searchapi_google(term)
                parsed = _parse_serp_results(serp_data, term, slug)
                rows.extend(parsed)
                tort_count += len(parsed)
                time.sleep(REQUEST_DELAY_SECONDS)
        except Exception as e:
            logger.error("  Tort '%s' SERP fetch failed: %s", slug, e)
            failed_torts.append(slug)

        per_tort_counts[slug] = tort_count

    step.set_metadata({
        "source": "searchapi_google",
        "total_results": len(rows),
        "per_tort_counts": per_tort_counts,
        "failed_torts": failed_torts,
    })

    count = _bulk_insert("serp_results_raw", rows)
    step.set_counts(rows_in=0, rows_out=count)
    return rows


def step_normalize(step, raw_rows: list[dict]) -> list[dict]:
    """Normalize SERP results: extract domains and map to advertiser entities."""
    advertisers = supabase_query("advertiser_entities", {"select": "id,canonical_name,website,aliases"})
    domain_mapper = DomainMapper(advertisers)

    norm_rows: list[dict] = []
    for r in raw_rows:
        domain = r.get("domain") or extract_root_domain(r.get("link", ""))
        if not domain:
            continue

        entity_id = domain_mapper.match(domain)
        norm_rows.append({
            "raw_id": None,  # bulk_insert doesn't return IDs; link via query/position later if needed
            "query": r["query"],
            "tort_slug": r["tort_slug"],
            "result_type": r["result_type"],
            "position": r.get("position"),
            "page": r.get("page", 1),
            "domain": domain,
            "advertiser_entity_id": entity_id,
            "title": r.get("title"),
            "snippet": r.get("snippet"),
            "link": r.get("link"),
            "fetched_at": r["fetched_at"],
        })

    step.set_metadata({
        "total_normalized": len(norm_rows),
        "with_entity_match": sum(1 for r in norm_rows if r["advertiser_entity_id"]),
        "unmatched_domains": list(domain_mapper.unmatched_domains)[:50],
    })

    count = _bulk_insert("serp_results_normalized", norm_rows)
    step.set_counts(rows_in=len(raw_rows), rows_out=count)
    return norm_rows


def step_score(step, norm_rows: list[dict]) -> int:
    """Compute visibility scores per domain/tort and upsert into serp_visibility_scores."""
    if not norm_rows:
        step.set_counts(rows_in=0, rows_out=0)
        return 0

    today = date.today()
    period_start = today
    period_end = today

    # Group by (domain, tort_slug)
    groups: dict[tuple, dict] = {}
    for r in norm_rows:
        key = (r["domain"], r["tort_slug"])
        if key not in groups:
            groups[key] = {
                "domain": r["domain"],
                "tort_slug": r["tort_slug"],
                "advertiser_entity_id": r.get("advertiser_entity_id"),
                "total": 0,
                "organic": 0,
                "paid": 0,
                "featured_snippet": 0,
                "local_pack": 0,
                "top_3": 0,
                "top_10": 0,
                "positions": [],
                "queries": set(),
            }
        g = groups[key]
        g["total"] += 1
        g["queries"].add(r["query"])

        rtype = r["result_type"]
        if rtype == "organic":
            g["organic"] += 1
        elif rtype == "paid":
            g["paid"] += 1
        elif rtype == "featured_snippet":
            g["featured_snippet"] += 1
        elif rtype == "local_pack":
            g["local_pack"] += 1

        pos = r.get("position")
        if pos is not None:
            g["positions"].append(pos)
            if pos <= 3:
                g["top_3"] += 1
            if pos <= 10:
                g["top_10"] += 1

        # Keep first non-None entity match
        if g["advertiser_entity_id"] is None and r.get("advertiser_entity_id"):
            g["advertiser_entity_id"] = r["advertiser_entity_id"]

    score_rows = []
    for g in groups.values():
        q_tracked = len(g["queries"])
        if q_tracked == 0:
            continue

        visibility = (
            g["top_3"] * 3.0 +
            g["top_10"] * 1.5 +
            g["featured_snippet"] * 5.0 +
            g["organic"] * 1.0 +
            g["paid"] * 0.5
        ) / q_tracked

        avg_pos = sum(g["positions"]) / len(g["positions"]) if g["positions"] else None

        score_rows.append({
            "advertiser_entity_id": g["advertiser_entity_id"],
            "domain": g["domain"],
            "tort_slug": g["tort_slug"],
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "total_appearances": g["total"],
            "avg_position": round(avg_pos, 2) if avg_pos is not None else None,
            "organic_appearances": g["organic"],
            "paid_appearances": g["paid"],
            "featured_snippet_count": g["featured_snippet"],
            "local_pack_count": g["local_pack"],
            "top_3_count": g["top_3"],
            "top_10_count": g["top_10"],
            "visibility_score": round(visibility, 2),
            "queries_tracked": q_tracked,
        })

    count = _bulk_insert("serp_visibility_scores", score_rows)
    step.set_counts(rows_in=len(norm_rows), rows_out=count)
    step.set_metadata({
        "domain_tort_combos": len(groups),
        "max_visibility": max((r["visibility_score"] for r in score_rows), default=0),
    })
    return count


def step_publish(step, scores_count: int):
    """Verify final table state."""
    if DRY_RUN:
        step.set_counts(rows_in=scores_count, rows_out=scores_count)
        step.set_metadata({"dry_run": True})
        print("\n  [DRY RUN] Skipping verification")
        return

    raw_count = supabase_count("serp_results_raw")
    norm_count = supabase_count("serp_results_normalized")
    score_count = supabase_count("serp_visibility_scores")

    step.set_counts(rows_in=scores_count, rows_out=score_count)
    step.set_metadata({
        "final_serp_raw_count": raw_count,
        "final_serp_normalized_count": norm_count,
        "final_serp_scores_count": score_count,
        "publish_timestamp": datetime.now(timezone.utc).isoformat(),
    })

    print(f"\n  SERP table counts:")
    print(f"    serp_results_raw:        {raw_count}")
    print(f"    serp_results_normalized: {norm_count}")
    print(f"    serp_visibility_scores:  {score_count}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="SERP Intelligence daily pipeline (Searchapi.io)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Run without writing to database")
    args = parser.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "true"
        import lib.pipeline
        lib.pipeline.DRY_RUN = True

    trigger = os.environ.get("PIPELINE_TRIGGER", "manual")

    with PipelineRun("serp_intel_daily", trigger=trigger) as run:
        with run.step("fetch_raw") as step:
            raw_rows = step_fetch_raw(step)

        with run.step("normalize") as step:
            norm_rows = step_normalize(step, raw_rows)

        with run.step("score") as step:
            scores_count = step_score(step, norm_rows)

        with run.step("publish") as step:
            step_publish(step, scores_count)


if __name__ == "__main__":
    main()
