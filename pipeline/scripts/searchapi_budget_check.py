#!/usr/bin/env python3
"""
SearchApi.io budget tripwire — projects monthly SearchApi search consumption
and flags when it trends over plan, or when a NEW pipeline starts calling
SearchApi.

WHY THIS EXISTS
    SearchApi.io has no usage API (the /account endpoint 404s and no
    credit/quota field is returned in search response headers or body), so
    actual consumption is only visible in their dashboard. This script
    *estimates* instead, and the estimate is the structural signal that
    actually matters: cost is driven by loop fan-out, not row yield
    (`pipeline_runs.rows_ingested` is sparse-yield OUTPUT, NOT a cost proxy).

    In June 2026 three new daily `engine=`-calling pipelines (serp_metro,
    meta_pages, youtube_ads) silently ~3x'd the bill before anyone noticed.
    This catches that: it projects monthly searches from each pipeline's cron
    cadence times its LIVE loop size, and warns if an unrecognized pipeline
    appears in pipeline_runs.

HOW THE ESTIMATE WORKS
    projected_monthly = sum over pipelines of (runs_per_month * searches_per_run)
      - runs_per_month  : a constant derived from each pipeline's cron (daily
                          = 30.4, weekly = 4.33). Update RUNS_PER_MONTH below
                          if you change a workflow's schedule.
      - searches_per_run: LIVE — loop sizes (metro count, distinct advertiser
                          domains, distinct page ids, keyword-cluster sizes) are
                          queried from the DB each run, so the projection tracks
                          uncapped growth (e.g. youtube_ads is one call per
                          distinct pi_search advertiser_domain and creeps up).
                          Per-metro/per-keyword query counts that live in
                          pipeline source code are constants below, each tagged
                          with its source file.

    pipeline_runs is also scanned over a recent window to (a) detect any
    pipeline_name not in the known registry -> UNRECOGNIZED warning, and
    (b) note known SearchApi pipelines that haven't run (possible stale cron).

USAGE
    cd pipeline
    python scripts/searchapi_budget_check.py                 # human report
    python scripts/searchapi_budget_check.py --json          # machine-readable
    python scripts/searchapi_budget_check.py --threshold 90000 --window-days 14

    Exit code is 2 if projected monthly > threshold OR an unrecognized
    SearchApi-suspect pipeline appeared, else 0 — so a scheduler can branch on it.

ENVIRONMENT
    SUPABASE_URL                 — Supabase project URL (required)
    SUPABASE_SERVICE_KEY         — service role key (or SUPABASE_SERVICE_ROLE_KEY)
    Falls back to reading ../web/.env.local (NEXT_PUBLIC_SUPABASE_URL +
    SUPABASE_SERVICE_ROLE_KEY) when those env vars are unset, so it runs in the
    Cowork-mounted scheduled context without extra wiring.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import httpx

# ---------------------------------------------------------------------------
# Credentials (env first, then ../web/.env.local fallback)
# ---------------------------------------------------------------------------

def _load_env_fallback() -> None:
    """Populate SUPABASE_URL / key from web/.env.local if not already in env."""
    if os.environ.get("SUPABASE_URL") and (
        os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    ):
        return
    env_path = Path(__file__).resolve().parents[2] / "web" / ".env.local"
    if not env_path.is_file():
        return
    values: dict[str, str] = {}
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        values[k.strip()] = v.strip().strip('"').strip("'")
    os.environ.setdefault(
        "SUPABASE_URL",
        values.get("SUPABASE_URL") or values.get("NEXT_PUBLIC_SUPABASE_URL", ""),
    )
    os.environ.setdefault(
        "SUPABASE_SERVICE_KEY",
        values.get("SUPABASE_SERVICE_KEY") or values.get("SUPABASE_SERVICE_ROLE_KEY", ""),
    )


_load_env_fallback()
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_KEY", "")
    or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
)

# ---------------------------------------------------------------------------
# Cadence (runs/month) — derived from each workflow's cron. UPDATE if you
# change a schedule. daily ~ 365/12 = 30.4 ; weekly ~ 52/12 = 4.33.
# ---------------------------------------------------------------------------
DAILY = 365 / 12
WEEKLY = 52 / 12

RUNS_PER_MONTH: dict[str, float] = {
    "pi_search_daily": WEEKLY,            # Mondays    (cron 0 12 * * 1)
    "serp_metro_daily": WEEKLY,           # Tuesdays   (cron 30 12 * * 2)
    "meta_pages_daily": WEEKLY,           # Wednesdays (cron 0 15 * * 3)
    "youtube_ads_daily": WEEKLY,          # Thursdays  (cron 0 13 * * 4)
    "google_trends_daily": DAILY,         # cron 0 8 * * *
    "serp_intel_daily": DAILY,            # cron 0 12 * * *
    "google_ads_daily": DAILY,            # cron 30 11 * * *
    "meta_ads_daily": DAILY,              # cron 0 14 * * *
    "google_maps_local_daily": WEEKLY,    # google-maps-local-weekly.yml (cron 0 6 * * 2)
    "tort_landing_pages_weekly": WEEKLY,  # cron 0 3 * * 0
}

# Per-run multipliers that live in pipeline SOURCE (not the DB). Each tagged
# with the file it comes from — update here if that constant changes.
SERP_METRO_QUERIES = 8        # serp_metro_daily.py SEO_TORT_QUERIES
SERP_METRO_MAX = 200          # serp_metro_daily.py MAX_METROS cap
META_PAGES_PER_PAGE_ID = 5    # meta_pages_daily.py MAX_PAGES_PER_PAGE_ID (upper bound)
META_PAGES_MAX = 400          # meta_pages_daily.py MAX_PAGES_PER_RUN cap
GTRENDS_KEYWORDS = 41         # google_trends_daily.py TORT_SEARCH_TERMS
GTRENDS_CALLS_PER_KW = 3      # TIMESERIES + GEO_MAP + RELATED_QUERIES
SERP_INTEL_KEYWORDS = 100     # serp_intel_daily.py SERP_SEARCH_TERMS
GOOGLE_ADS_KEYWORDS = 77      # google_ads_daily.py TORT_SEARCH_TERMS
META_ADS_KEYWORDS = 16        # meta_ads_daily.py META_SEARCH_TERMS (broadened 6->16, PR #445)
META_ADS_PAGES_PER_KW = 5     # meta_ads_daily.py MAX_PAGES_PER_KEYWORD (upper bound)
GMAPS_QUERIES_PER_METRO = 2   # google_maps_local_daily.py GMAPS_QUERIES
TORT_LANDING_DMAS = 25        # tort_landing_pages_weekly default DMA count

# Known pipelines that do NOT consume SearchApi (so they don't trip the
# unrecognized-pipeline warning). Apify / direct-HTTP / non-ad pipelines.
KNOWN_NON_SEARCHAPI = {
    "ad_intel_daily", "tiktok_ads_daily", "advertiser_rematch_daily",
    "tort_landing_pages_daily", "meta_creative_capture", "youtube_creative_capture",
    "faers_weekly", "openfda_device_recalls", "courtlistener_recall_cases",
    "courtlistener_recall_case_parties", "recall_thermometer", "jpml_monthly",
    "courtlistener_attorneys", "courtlistener_mdl_attorneys", "ingest_google_news_legal",
    "ingest_rss_developments", "load_cancer_incidence", "load_storm_events",
    "cpsc_recalls", "cpsc_recalls_weekly",
}

# ---------------------------------------------------------------------------
# REST helpers
# ---------------------------------------------------------------------------

def _headers(extra: dict | None = None) -> dict:
    h = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    if extra:
        h.update(extra)
    return h


def _count(table: str, query: str = "") -> int:
    """Exact row count via PostgREST Content-Range (cheap, no row transfer)."""
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=*"
    if query:
        url += f"&{query}"
    url += "&limit=1"
    resp = httpx.get(url, headers=_headers({"Prefer": "count=exact"}), timeout=30)
    resp.raise_for_status()
    rng = resp.headers.get("content-range", "")
    total = rng.split("/")[-1]
    return int(total) if total.isdigit() else 0


def _distinct_count(table: str, column: str, query: str = "") -> int:
    """COUNT(DISTINCT column) by paging the column and deduping in-process.

    PostgREST has no COUNT(DISTINCT); these columns can exceed the 1000-row
    cap so we page. Values normalized lower/stripped to match pipeline keying.
    """
    seen: set[str] = set()
    offset = 0
    page = 1000
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{table}?select={column}"
        if query:
            url += f"&{query}"
        url += f"&{column}=not.is.null&limit={page}&offset={offset}"
        resp = httpx.get(url, headers=_headers(), timeout=60)
        resp.raise_for_status()
        rows = resp.json()
        for r in rows:
            v = (r.get(column) or "").strip().lower()
            if v:
                seen.add(v)
        if len(rows) < page:
            break
        offset += page
    return len(seen)


def _pipeline_runs(window_days: int) -> list[dict]:
    """Recent pipeline_runs (paged) within the window: name + started_at."""
    from datetime import datetime, timedelta, timezone
    since = (datetime.now(timezone.utc) - timedelta(days=window_days)).isoformat()
    out: list[dict] = []
    offset = 0
    page = 1000
    url = f"{SUPABASE_URL}/rest/v1/pipeline_runs"
    while True:
        params = {
            "select": "pipeline_name,started_at",
            "started_at": f"gte.{since}",
            "order": "started_at.desc",
            "limit": page,
            "offset": offset,
        }
        resp = httpx.get(url, headers=_headers(), params=params, timeout=60)
        resp.raise_for_status()
        rows = resp.json()
        out.extend(rows)
        if len(rows) < page:
            break
        offset += page
    return out

# ---------------------------------------------------------------------------
# Live loop sizes -> searches per run
# ---------------------------------------------------------------------------

def _keyword_cluster_total() -> int:
    """Total keywords across all pi_keyword_clusters rows (pi_search loop)."""
    url = f"{SUPABASE_URL}/rest/v1/pi_keyword_clusters?select=keywords"
    resp = httpx.get(url, headers=_headers(), timeout=30)
    resp.raise_for_status()
    total = 0
    for row in resp.json():
        kws = row.get("keywords")
        if isinstance(kws, str):
            try:
                kws = json.loads(kws)
            except json.JSONDecodeError:
                kws = []
        total += len(kws or [])
    return total


def compute_per_run() -> dict[str, dict]:
    """Return {pipeline: {searches, basis}} from live loop sizes."""
    metros_total = _count("pi_metros")
    metros_dma = _count("pi_metros", "dma_code=not.is.null")
    metros_geo = _count(
        "pi_metros", "dma_code=not.is.null&latitude=not.is.null&longitude=not.is.null"
    )
    kw_total = _keyword_cluster_total()
    yt_domains = _distinct_count("pi_search_observations", "advertiser_domain")
    meta_pages = _distinct_count("meta_ad_creatives", "page_id")
    torts = _count("mass_torts", "has_advertising_page=eq.true")

    serp_metros = min(metros_dma, SERP_METRO_MAX)
    capped_pages = min(meta_pages, META_PAGES_MAX)

    return {
        "pi_search_daily": {
            "searches": metros_total * kw_total,
            "basis": f"{metros_total} metros x {kw_total} keywords",
        },
        "serp_metro_daily": {
            "searches": serp_metros * SERP_METRO_QUERIES,
            "basis": f"{serp_metros} metros (cap {SERP_METRO_MAX}) x {SERP_METRO_QUERIES} SEO queries",
        },
        "meta_pages_daily": {
            "searches": capped_pages * META_PAGES_PER_PAGE_ID,
            "basis": f"{capped_pages} pages (cap {META_PAGES_MAX}) x <={META_PAGES_PER_PAGE_ID} pages each (upper bound)",
        },
        "youtube_ads_daily": {
            "searches": yt_domains,
            "basis": f"{yt_domains} distinct PI advertiser domains (UNCAPPED — grows)",
        },
        "google_trends_daily": {
            "searches": GTRENDS_KEYWORDS * GTRENDS_CALLS_PER_KW,
            "basis": f"{GTRENDS_KEYWORDS} keywords x {GTRENDS_CALLS_PER_KW} calls",
        },
        "serp_intel_daily": {
            "searches": SERP_INTEL_KEYWORDS,
            "basis": f"{SERP_INTEL_KEYWORDS} keywords",
        },
        "google_ads_daily": {
            "searches": GOOGLE_ADS_KEYWORDS,
            "basis": f"{GOOGLE_ADS_KEYWORDS} keywords",
        },
        "meta_ads_daily": {
            "searches": META_ADS_KEYWORDS * META_ADS_PAGES_PER_KW,
            "basis": f"{META_ADS_KEYWORDS} keywords x <={META_ADS_PAGES_PER_KW} pages (upper bound)",
        },
        "google_maps_local_daily": {
            "searches": metros_geo * GMAPS_QUERIES_PER_METRO,
            "basis": f"{metros_geo} geo metros x {GMAPS_QUERIES_PER_METRO} queries",
        },
        "tort_landing_pages_weekly": {
            "searches": torts * TORT_LANDING_DMAS,
            "basis": f"{torts} advertising torts x {TORT_LANDING_DMAS} DMAs",
        },
    }

# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------

def build_report(window_days: int) -> dict:
    per_run = compute_per_run()
    runs = _pipeline_runs(window_days)

    run_counts: dict[str, int] = {}
    last_seen: dict[str, str] = {}
    for r in runs:
        name = r.get("pipeline_name") or "(null)"
        run_counts[name] = run_counts.get(name, 0) + 1
        if name not in last_seen:
            last_seen[name] = r.get("started_at", "")

    rows = []
    total = 0.0
    for name, cadence in RUNS_PER_MONTH.items():
        searches = per_run[name]["searches"]
        monthly = cadence * searches
        total += monthly
        rows.append({
            "pipeline": name,
            "per_run": searches,
            "runs_per_month": round(cadence, 1),
            "projected_monthly": int(round(monthly)),
            "basis": per_run[name]["basis"],
            "ran_in_window": run_counts.get(name, 0),
            "last_run": last_seen.get(name, ""),
        })
    rows.sort(key=lambda x: x["projected_monthly"], reverse=True)

    known = set(RUNS_PER_MONTH) | KNOWN_NON_SEARCHAPI
    unrecognized = sorted(
        {n: c for n, c in run_counts.items() if n not in known and n != "(null)"}.items(),
        key=lambda kv: kv[1], reverse=True,
    )
    stale = [r["pipeline"] for r in rows if r["ran_in_window"] == 0]

    return {
        "window_days": window_days,
        "rows": rows,
        "projected_monthly_total": int(round(total)),
        "unrecognized": [{"pipeline": n, "runs": c} for n, c in unrecognized],
        "stale": stale,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="SearchApi.io monthly-budget tripwire.")
    ap.add_argument("--threshold", type=int, default=80000,
                    help="WARN if projected monthly searches exceed this (default 80000; the $250/100k tier).")
    ap.add_argument("--window-days", type=int, default=14,
                    help="pipeline_runs look-back for liveness + new-pipeline detection (default 14).")
    ap.add_argument("--json", action="store_true", help="Emit JSON instead of a text report.")
    args = ap.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: SUPABASE_URL and a service key are required "
              "(env or web/.env.local).", file=sys.stderr)
        return 1

    rep = build_report(args.window_days)
    total = rep["projected_monthly_total"]
    over = total > args.threshold
    new_pipes = bool(rep["unrecognized"])

    if args.json:
        rep["threshold"] = args.threshold
        rep["over_threshold"] = over
        print(json.dumps(rep, indent=2))
        return 2 if (over or new_pipes) else 0

    print("SearchApi.io monthly budget projection")
    print("=" * 64)
    print(f"{'pipeline':<26}{'per-run':>9}{'x/mo':>7}{'/month':>10}")
    print("-" * 64)
    for r in rep["rows"]:
        print(f"{r['pipeline']:<26}{r['per_run']:>9,}{r['runs_per_month']:>7}{r['projected_monthly']:>10,}")
    print("-" * 64)
    print(f"{'PROJECTED TOTAL':<26}{'':>9}{'':>7}{total:>10,}  searches/month")
    print(f"\nThreshold: {args.threshold:,}   Plans: 10k=$40  100k=$250")
    headroom = args.threshold - total
    print(f"Headroom vs threshold: {headroom:,}" + ("  ** OVER **" if over else ""))

    biggest = rep["rows"][0]
    print(f"\nTop driver: {biggest['pipeline']} — {biggest['basis']} "
          f"({biggest['projected_monthly']:,}/mo)")

    if rep["unrecognized"]:
        print("\n** UNRECOGNIZED pipeline(s) ran — verify if they call SearchApi "
              "and add to the registry or KNOWN_NON_SEARCHAPI: **")
        for u in rep["unrecognized"]:
            print(f"   - {u['pipeline']} ({u['runs']} runs in {rep['window_days']}d)")

    if rep["stale"]:
        print(f"\nNote: no runs in last {rep['window_days']}d (cron disabled or just throttled?): "
              + ", ".join(rep["stale"]))

    print()
    if over:
        print(f"WARNING: projected {total:,}/mo exceeds threshold {args.threshold:,}.")
    elif new_pipes:
        print("WARNING: a new/unrecognized pipeline appeared — review above.")
    else:
        print(f"OK: projected {total:,}/mo is within threshold.")
    return 2 if (over or new_pipes) else 0


if __name__ == "__main__":
    sys.exit(main())
