#!/usr/bin/env python3
"""
Ingest litigation developments from RSS feeds into mdl_developments table.

Usage:
    python scripts/ingest_rss_developments.py
    python scripts/ingest_rss_developments.py --dry-run

Environment variables required:
    SUPABASE_URL         — Supabase project URL
    SUPABASE_SERVICE_KEY — Supabase service role key (for INSERT/UPSERT)

Dependencies:
    pip install -r scripts/requirements-rss.txt
"""

import argparse
import os
import re
import sys
import time
from collections import defaultdict
from datetime import date

import feedparser
from dateutil import parser as dateparser
from supabase import create_client

RSS_FEEDS = [
    {"url": "https://www.aboutlawsuits.com/feed/", "name": "AboutLawsuits"},
    {"url": "https://www.jdsupra.com/resources/syndication/us-litigation.xml", "name": "JD Supra"},
    {"url": "https://www.drugwatch.com/feed/", "name": "DrugWatch"},
    {"url": "https://www.classaction.org/feed", "name": "ClassAction.org"},
]

MDL_KEYWORDS: dict[int, list[str]] = {
    3047: [
        "social media addiction", "social media harm", "social media MDL",
        "meta addiction", "tiktok addiction", "youtube addiction",
        "instagram addiction", "snapchat addiction", "social media lawsuit",
        "mdl 3047",
    ],
    2741: [
        "roundup", "glyphosate", "monsanto herbicide", "roundup weedkiller",
        "glyphosate cancer", "mdl 2741",
    ],
    3060: [
        "hair relaxer", "hair straightener cancer", "chemical hair",
        "L'Oreal hair", "Dark & Lovely", "Soft Sheen", "Just for Me",
        "hair relaxer MDL", "mdl 3060",
    ],
    2974: [
        "paragard", "paragard IUD", "copper IUD lawsuit",
        "paragard fracture", "mdl 2974",
    ],
    2738: [
        "talcum powder", "talc cancer", "johnson johnson talc", "j&j talc",
        "baby powder cancer", "ovarian cancer talc", "mdl 2738",
    ],
    3049: [
        "camp lejeune", "camp lejeune water", "lejeune contamination",
        "lejeune settlement", "lejeune lawsuit", "mdl 3049",
    ],
    2885: [
        "3M earplug", "combat arms earplug", "3M hearing loss",
        "military earplug", "earplug lawsuit", "mdl 2885",
    ],
    2846: [
        "bard hernia mesh", "davol hernia mesh", "hernia mesh lawsuit",
        "hernia mesh MDL", "mdl 2846",
    ],
    3043: [
        "CPAP recall", "philips CPAP", "dreamstation", "CPAP cancer",
        "sleep apnea machine recall", "mdl 3043",
    ],
    3014: [
        "paraquat", "paraquat parkinson", "paraquat lawsuit",
        "paraquat MDL", "mdl 3014",
    ],
    2924: [
        "zantac", "ranitidine", "NDMA zantac", "zantac cancer",
        "ranitidine lawsuit", "mdl 2924",
    ],
    3026: [
        "NEC baby formula", "necrotizing enterocolitis",
        "premature baby formula", "similac NEC", "enfamil NEC",
        "baby formula lawsuit", "mdl 3026",
    ],
    3140: [
        "depo-provera", "depo provera", "medroxyprogesterone",
        "depo-provera brain tumor", "depo provera meningioma", "mdl 3140",
    ],
    2433: [
        "PFAS water", "PFAS contamination", "PFAS lawsuit", "AFFF PFAS",
        "firefighting foam PFAS", "aqueous film-forming foam",
        "3M PFAS settlement", "DuPont PFAS", "mdl 2433",
    ],
}


def classify_event_type(title: str) -> str:
    title_lower = title.lower()
    if any(w in title_lower for w in ["verdict", "jury", "awarded", "damages", "won", "loses trial"]):
        return "verdict"
    if any(w in title_lower for w in ["settlement", "settles", "settled", "pay", "billion", "million"]):
        return "settlement"
    if any(w in title_lower for w in ["bellwether", "trial date", "trial begins", "trial starts", "goes to trial"]):
        return "bellwether trial"
    if any(w in title_lower for w in ["fda", "epa", "recall", "warning letter", "agency", "regulatory"]):
        return "regulatory"
    if any(w in title_lower for w in ["filed", "lawsuit filed", "complaint filed", "new cases", "cases filed"]):
        return "filing"
    return "ruling"


def truncate_summary(text: str, max_chars: int = 280) -> str:
    clean = re.sub(r'<[^>]+>', '', text or '')
    clean = clean.strip()
    if len(clean) <= max_chars:
        return clean
    return clean[:max_chars].rsplit(' ', 1)[0] + '\u2026'


def parse_date(entry) -> str:
    """Return ISO date string YYYY-MM-DD from an RSS entry."""
    for attr in ('published_parsed', 'updated_parsed', 'created_parsed'):
        t = getattr(entry, attr, None)
        if t:
            return time.strftime('%Y-%m-%d', t)
    for attr in ('published', 'updated'):
        s = getattr(entry, attr, None)
        if s:
            try:
                return dateparser.parse(s).strftime('%Y-%m-%d')
            except Exception:
                pass
    return date.today().isoformat()


def main():
    parser = argparse.ArgumentParser(description="Ingest RSS litigation developments")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print what would be inserted without writing to database")
    args = parser.parse_args()

    supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set", file=sys.stderr)
        sys.exit(1)

    if not args.dry_run:
        supabase = create_client(supabase_url, supabase_key)

    developments: list[dict] = []
    seen_urls: set[str] = set()

    for feed_info in RSS_FEEDS:
        print(f"Fetching {feed_info['name']}...")
        feed = feedparser.parse(feed_info["url"])
        entries_checked = 0
        entries_matched = 0

        for entry in feed.entries:
            title = getattr(entry, 'title', '') or ''
            description = getattr(entry, 'summary', '') or getattr(entry, 'description', '') or ''
            link = getattr(entry, 'link', '') or ''

            if not link or link in seen_urls:
                continue

            search_text = (title + ' ' + description).lower()

            for mdl_number, keywords in MDL_KEYWORDS.items():
                if any(kw.lower() in search_text for kw in keywords):
                    seen_urls.add(link)
                    dev = {
                        "mdl_number": mdl_number,
                        "title": title[:500],
                        "summary": truncate_summary(description),
                        "source_name": feed_info["name"],
                        "source_url": link,
                        "event_date": parse_date(entry),
                        "event_type": classify_event_type(title),
                    }
                    developments.append(dev)
                    entries_matched += 1
                    break

            entries_checked += 1

        print(f"  {feed_info['name']}: checked {entries_checked} entries, matched {entries_matched}")

    if not developments:
        print("\nNo new developments found.")
        return

    by_mdl: dict[int, list[dict]] = defaultdict(list)
    for dev in developments:
        by_mdl[dev["mdl_number"]].append(dev)

    print(f"\nFound {len(developments)} potential new developments:")
    for mdl_num in sorted(by_mdl.keys()):
        print(f"  MDL {mdl_num}: {len(by_mdl[mdl_num])} item(s)")
        for dev in by_mdl[mdl_num]:
            print(f"    [{dev['event_type']}] {dev['event_date']} \u2014 {dev['title'][:80]}")

    if args.dry_run:
        print("\n[DRY RUN] No changes written to database.")
        return

    inserted_count = 0
    skipped_count = 0
    for dev in developments:
        result = supabase.table("mdl_developments").upsert(
            dev,
            on_conflict="source_url"
        ).execute()
        if result.data:
            inserted_count += len(result.data)
        else:
            skipped_count += 1

    print(f"\nResults: {inserted_count} inserted/updated, {skipped_count} skipped (already existed)")


if __name__ == "__main__":
    main()
