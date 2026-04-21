#!/usr/bin/env python3
"""
Ingest legal news from Google News via SearchAPI.io into legal_news table.

Usage:
    python scripts/ingest_google_news_legal.py
    python scripts/ingest_google_news_legal.py --bucket general --limit 1 --dry-run
    python scripts/ingest_google_news_legal.py --bucket tort_backfill
    python scripts/ingest_google_news_legal.py --bucket all

Environment variables required:
    SUPABASE_URL         — Supabase project URL
    SUPABASE_SERVICE_KEY — Supabase service role key
    SEARCHAPI_API_KEY    — SearchAPI.io API key

Dependencies:
    pip install -r scripts/requirements.txt
"""

import argparse
import os
import re
import sys
import time

import dateparser
import httpx
from supabase import create_client

# ---------------------------------------------------------------------------
# SearchAPI.io config
# ---------------------------------------------------------------------------

SEARCHAPI_API_KEY = os.environ.get("SEARCHAPI_API_KEY", "")
SEARCHAPI_BASE = "https://www.searchapi.io/api/v1/search"
MAX_RETRIES = 3
REQUEST_DELAY_SECONDS = 1.5

# ---------------------------------------------------------------------------
# Query buckets
# ---------------------------------------------------------------------------

GENERAL_QUERIES = [
    '"jury verdict" (plaintiff OR damages OR awarded)',
    '"class action" settlement',
    '"mass tort" OR "multidistrict litigation"',
    '"personal injury" verdict OR settlement',
    '"product liability" lawsuit verdict',
    '"pharmaceutical" lawsuit OR settlement OR recall',
    '"medical device" lawsuit OR recall',
    '"MDL" bellwether OR consolidated',
]

TORT_KEYWORDS: dict[str, list[str]] = {
    "firefighter_foam": ["AFFF lawsuit", "firefighting foam PFAS", "aqueous film-forming foam"],
    "bard-powerport": ["Bard PowerPort lawsuit", "PowerPort catheter"],
    "camp_lejeune": ["Camp Lejeune lawsuit", "Camp Lejeune settlement"],
    "depo_provera": ["Depo-Provera meningioma", "Depo-Provera lawsuit"],
    "glp1_gastroparesis": ["Ozempic gastroparesis lawsuit", "GLP-1 stomach paralysis"],
    "glp1_vision_loss": ["Ozempic NAION", "GLP-1 vision loss lawsuit"],
    "hair_relaxer": ["hair relaxer lawsuit", "chemical hair straightener cancer"],
    "hernia_mesh": ["hernia mesh lawsuit", "Bard hernia mesh"],
    "lyft-sexual-assault": ["Lyft sexual assault lawsuit"],
    "motor_vehicle": ["motor vehicle accident verdict", "auto accident lawsuit verdict"],
    "nec_baby_formula": ["NEC baby formula lawsuit", "necrotizing enterocolitis formula"],
    "nursing_home": ["nursing home abuse lawsuit", "elder abuse verdict"],
    "paraquat": ["paraquat Parkinson lawsuit"],
    "roblox_abuse": ["Roblox child abuse lawsuit"],
    "roundup": ["Roundup cancer verdict", "glyphosate Monsanto"],
    "social_media_addiction": ["social media addiction lawsuit", "Meta addiction MDL"],
    "social_media": [],  # intentionally empty — dedup to social_media_addiction
    "talcum_powder": ["talc ovarian cancer", "Johnson Johnson talc"],
    "truck_accident": ["truck accident verdict", "trucking lawsuit settlement"],
    "tylenol_autism": ["Tylenol autism lawsuit"],
    "uber-sexual-assault": ["Uber sexual assault lawsuit"],
    "workers_comp": ["workers compensation settlement"],
    "zantac": ["Zantac cancer lawsuit", "ranitidine NDMA"],
    "cpap_philips": ["Philips CPAP lawsuit", "DreamStation recall"],
    "paragard_iud": ["Paragard IUD lawsuit", "copper IUD fracture"],
    "earplugs_3m": ["3M earplug lawsuit", "Combat Arms earplug"],
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def truncate_summary(text: str, max_chars: int = 280) -> str:
    clean = re.sub(r'<[^>]+>', '', text or '')
    clean = clean.strip()
    if len(clean) <= max_chars:
        return clean
    return clean[:max_chars].rsplit(' ', 1)[0] + '\u2026'


def classify_category(title: str, snippet: str) -> str:
    text = f"{title} {snippet}".lower()
    if any(w in text for w in ["verdict", "jury awarded", "jury finds", "plaintiff wins", "damages"]):
        return "verdict"
    if any(w in text for w in ["settlement", "settles", "settled", "agrees to pay", "resolves"]):
        return "settlement"
    if any(w in text for w in ["recall", "recalled"]):
        return "recall"
    if any(w in text for w in ["fda", "epa", "warning letter", "agency", "regulatory"]):
        return "regulatory"
    if any(w in text for w in ["bellwether", "consolidated", "mdl", "multidistrict"]):
        return "mdl_update"
    if any(w in text for w in ["filed", "complaint", "new lawsuit", "new cases"]):
        return "filing"
    return "general"


def parse_published_date(date_str: str | None) -> str | None:
    """Parse relative or absolute date string via dateparser. Returns ISO string or None."""
    if not date_str:
        return None
    parsed = dateparser.parse(date_str)
    if parsed:
        return parsed.isoformat()
    return None


def searchapi_google_news(query: str, time_period: str = "last_day") -> dict:
    """Call SearchAPI.io Google News endpoint with retry + exponential backoff."""
    if not SEARCHAPI_API_KEY:
        print("  WARNING: SEARCHAPI_API_KEY not set — returning empty results")
        return {}

    for attempt in range(MAX_RETRIES):
        try:
            resp = httpx.get(SEARCHAPI_BASE, params={
                "engine": "google_news",
                "q": query,
                "api_key": SEARCHAPI_API_KEY,
                "time_period": time_period,
                "sort_by": "most_recent",
                "gl": "us",
                "hl": "en",
            }, timeout=30)

            if resp.status_code == 429:
                backoff = 2 ** attempt * REQUEST_DELAY_SECONDS
                print(f"  Rate limited on '{query}', backing off {backoff:.1f}s")
                time.sleep(backoff)
                continue

            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as e:
            if attempt < MAX_RETRIES - 1:
                backoff = 2 ** attempt * REQUEST_DELAY_SECONDS
                print(f"  SearchAPI error for '{query}': {e}, retrying in {backoff:.1f}s")
                time.sleep(backoff)
            else:
                print(f"  SearchAPI failed for '{query}' after {MAX_RETRIES} attempts: {e}")
    return {}


def extract_articles(response_data: dict, query_term: str, query_bucket: str,
                     tort_id: str | None = None) -> list[dict]:
    """Extract articles from SearchAPI.io Google News response into legal_news rows."""
    results = response_data.get("organic_results", [])
    rows = []

    for item in results:
        title = item.get("title", "")
        link = item.get("link", "")
        source = item.get("source", "")
        snippet = item.get("snippet", "")
        date_str = item.get("date", "")

        if not link:
            continue

        rows.append({
            "title": title[:500],
            "summary": truncate_summary(snippet),
            "source_name": source or "Google News",
            "source_url": link,
            "published_at": parse_published_date(date_str),
            "category": classify_category(title, snippet),
            "tort_id": tort_id,
            "query_bucket": query_bucket,
            "query_term": query_term[:500] if query_term else None,
            "raw": item,
        })

    return rows


# ---------------------------------------------------------------------------
# Bucket runners
# ---------------------------------------------------------------------------

def run_general_bucket(limit: int | None = None) -> dict:
    """Run Bucket A: general legal news queries (daily)."""
    queries = GENERAL_QUERIES[:limit] if limit else GENERAL_QUERIES
    all_rows: list[dict] = []

    for query in queries:
        print(f"  [general] Searching: {query[:60]}...")
        data = searchapi_google_news(query, time_period="last_day")
        rows = extract_articles(data, query_term=query, query_bucket="general")
        all_rows.extend(rows)
        time.sleep(REQUEST_DELAY_SECONDS)

    return {"bucket": "general", "queries": len(queries), "rows": all_rows}


def run_tort_backfill_bucket(supabase, limit: int | None = None) -> dict:
    """Run Bucket B: per-tort keyword queries (weekly)."""
    torts = supabase.table("torts").select("id, slug, label").execute().data
    if not torts:
        print("  WARNING: No torts found in database")
        return {"bucket": "tort_backfill", "queries": 0, "rows": []}

    tort_by_slug = {t["slug"]: t for t in torts}
    all_rows: list[dict] = []
    query_count = 0

    for slug, keywords in TORT_KEYWORDS.items():
        if not keywords:
            print(f"  [tort_backfill] Skipping {slug} (empty keyword list)")
            continue

        tort = tort_by_slug.get(slug)
        if not tort:
            print(f"  [tort_backfill] Tort '{slug}' not found in DB, skipping")
            continue

        for keyword in keywords:
            if limit and query_count >= limit:
                break

            print(f"  [tort_backfill] Searching: {keyword} (tort: {slug})")
            data = searchapi_google_news(keyword, time_period="last_week")
            rows = extract_articles(
                data, query_term=keyword, query_bucket="tort_backfill",
                tort_id=tort["id"],
            )
            all_rows.extend(rows)
            query_count += 1
            time.sleep(REQUEST_DELAY_SECONDS)

        if limit and query_count >= limit:
            break

    return {"bucket": "tort_backfill", "queries": query_count, "rows": all_rows}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Ingest Google News legal articles")
    parser.add_argument("--bucket", choices=["general", "tort_backfill", "all"],
                        default="all", help="Which query bucket to run (default: all)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print results without writing to database")
    parser.add_argument("--limit", type=int, default=None,
                        help="Cap number of queries per bucket (for testing)")
    args = parser.parse_args()

    supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set", file=sys.stderr)
        sys.exit(1)

    supabase = create_client(supabase_url, supabase_key)

    bucket_results: list[dict] = []

    if args.bucket in ("general", "all"):
        print("=== Bucket: general ===")
        result = run_general_bucket(limit=args.limit)
        bucket_results.append(result)

    if args.bucket in ("tort_backfill", "all"):
        print("=== Bucket: tort_backfill ===")
        result = run_tort_backfill_bucket(supabase, limit=args.limit)
        bucket_results.append(result)

    # Dedup across buckets by source_url
    seen_urls: set[str] = set()
    deduped_rows: list[dict] = []
    for br in bucket_results:
        for row in br["rows"]:
            if row["source_url"] not in seen_urls:
                seen_urls.add(row["source_url"])
                deduped_rows.append(row)

    total_fetched = sum(len(br["rows"]) for br in bucket_results)
    total_queries = sum(br["queries"] for br in bucket_results)

    if args.dry_run:
        for br in bucket_results:
            unique = len({r["source_url"] for r in br["rows"]})
            print(f"\nBucket: {br['bucket']} — {br['queries']} queries, "
                  f"{len(br['rows'])} items fetched, {unique} unique")
            for row in br["rows"][:10]:
                print(f"  [{row['category']}] {row['source_name']} — {row['title'][:80]}")
            if len(br["rows"]) > 10:
                print(f"  ... and {len(br['rows']) - 10} more")

        print(f"\n[DRY RUN] TOTAL: {total_queries} queries, "
              f"{total_fetched} items fetched, {len(deduped_rows)} unique. "
              f"No changes written to database.")
        return

    # Upsert to Supabase in batches
    inserted_count = 0
    skipped_count = 0

    # Batch upsert for efficiency (Supabase handles dedup via on_conflict)
    BATCH_SIZE = 50
    for i in range(0, len(deduped_rows), BATCH_SIZE):
        batch = deduped_rows[i:i + BATCH_SIZE]
        result = supabase.table("legal_news").upsert(
            batch,
            on_conflict="source_url"
        ).execute()
        if result.data:
            inserted_count += len(result.data)
        else:
            skipped_count += len(batch)

    # Print summary
    for br in bucket_results:
        bucket_unique = len({r["source_url"] for r in br["rows"]})
        print(f"Bucket: {br['bucket']} — {br['queries']} queries, "
              f"{len(br['rows'])} items fetched")

    print(f"TOTAL: {total_queries} queries, {total_fetched} items fetched, "
          f"{inserted_count} inserted/updated, {skipped_count} skipped (dedup)")


if __name__ == "__main__":
    main()
