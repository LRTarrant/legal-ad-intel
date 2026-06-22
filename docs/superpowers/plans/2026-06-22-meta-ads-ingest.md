# Competitive Analysis Phase 5a — Meta ad ingest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace TikTok with Meta on the Competitive Analysis surface and stand up the Meta data layer: a daily pipeline ingesting PI-firm Meta Ad Library ads into a dedicated table, plus a placeholder "Meta — Soon" tab.

**Architecture:** New `meta_ad_creatives` table (UNIQUE ad_archive_id) + a `pipeline_configs` seed; a `meta_ads_daily` pipeline that searches the Meta Ad Library (SearchApi `engine=meta_ad_library`) by PI case-type keywords (national, US) and upserts; a daily workflow; and a small `competitive-analysis.tsx` swap (TikTok tab → disabled Meta tab). No live Meta panel (that's Phase 5b).

**Tech Stack:** Supabase Postgres (migrations, RLS), Python 3.12 ETL (httpx, SearchApi), pytest, GitHub Actions, Next.js/React/TS.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-22-meta-ads-ingest-design.md`.
- Dedicated table `meta_ad_creatives` (NOT `ad_observations_raw`). Natural key `ad_archive_id` → real `UNIQUE`, upsert `on_conflict="ad_archive_id", resolution="merge-duplicates"`.
- SearchApi: `engine=meta_ad_library`, `q=<keyword>`, `country=US`, `active_status=active`; paginate via `pagination.next_page_token`, cap `MAX_PAGES_PER_KEYWORD=5`.
- Case types (slug → keyword), exact: motor_vehicle→"car accident lawyer", truck_accident→"truck accident lawyer", motorcycle→"motorcycle accident lawyer", boating→"boat accident lawyer", nursing_home→"nursing home abuse lawyer", workers_comp→"workers compensation lawyer".
- National + case-type-keyed (SEO model). Page-led identity (`page_name`/`page_id`).
- No-API-key seed write happens ONLY under DRY_RUN (the 4a fix; read the live flag via `os.environ["DRY_RUN"]`, not the stale module import).
- Migrations apply on merge — NOT via Supabase MCP. Migration timestamps `20260622030000` (table) + `20260622040000` (config); verify `ls supabase/migrations/ | grep ^20260622030000` (and `040000`) are empty first.
- New pipeline REQUIRES a `pipeline_configs` row or every run raises "No pipeline_config found".
- Component: remove TikTok, add disabled `{ key: "meta", label: "Meta", disabled: true, badge: "Soon" }`. No Meta panel this phase.
- TS: `npx tsc --noEmit` only after `npm install` in `web/`; only the changed file must be clean vs baseline.

---

### Task 1: `meta_ad_creatives` table + pipeline_configs seed (migrations)

**Files:**
- Create: `supabase/migrations/20260622030000_create_meta_ad_creatives.sql`
- Create: `supabase/migrations/20260622040000_seed_meta_ads_pipeline_config.sql`

**Interfaces:**
- Produces: table `public.meta_ad_creatives` with `UNIQUE (ad_archive_id)` and columns consumed by Task 2's upsert: `ad_archive_id, page_id, page_name, case_type, keyword, start_date, end_date, is_active, publisher_platforms, collation_count, country, snapshot, raw_json` (+ `id`, `first_ingested_at`, `updated_at` defaults/trigger). Plus a `pipeline_configs` row for `meta_ads_daily`.

- [ ] **Step 1: Confirm no timestamp collisions**

Run: `ls supabase/migrations/ | grep -E '^20260622030000|^20260622040000'`
Expected: no output. If anything returns, bump to `...050000`/`...060000` and use those names throughout.

- [ ] **Step 2: Write the table migration**

Create `supabase/migrations/20260622030000_create_meta_ad_creatives.sql`:

```sql
-- ============================================================================
-- Competitive Analysis Phase 5a: meta_ad_creatives
-- PI-firm Meta (Facebook/Instagram) ads from the Meta Ad Library, ingested by
-- pipelines/meta_ads_daily.py. Case-type-keyed, national (no DMA). Dedicated
-- table (per-channel pattern, like serp/youtube); NOT ad_observations_raw
-- (its legacy meta data is NY-skewed + the unique index is partial).
-- ============================================================================

CREATE TABLE public.meta_ad_creatives (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_archive_id text NOT NULL,
    page_id text,
    page_name text,
    case_type text NOT NULL,
    keyword text,
    start_date date,
    end_date date,
    is_active boolean,
    publisher_platforms text[],
    collation_count integer,
    country text NOT NULL DEFAULT 'US',
    snapshot jsonb,
    raw_json jsonb,
    first_ingested_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT meta_ad_creatives_ad_archive_id_key UNIQUE (ad_archive_id)
);

CREATE INDEX idx_meta_ad_creatives_case_type ON public.meta_ad_creatives(case_type);
CREATE INDEX idx_meta_ad_creatives_page_id ON public.meta_ad_creatives(page_id);

ALTER TABLE public.meta_ad_creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY meta_ad_creatives_service_role ON public.meta_ad_creatives
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY meta_ad_creatives_anon_read ON public.meta_ad_creatives
    FOR SELECT USING (true);

CREATE TRIGGER trg_meta_ad_creatives_updated_at
    BEFORE UPDATE ON public.meta_ad_creatives
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

- [ ] **Step 3: Write the pipeline_configs seed migration**

Create `supabase/migrations/20260622040000_seed_meta_ads_pipeline_config.sql`:

```sql
-- ============================================================================
-- Competitive Analysis Phase 5a: pipeline_configs seed for meta_ads_daily.
-- PipelineRun hard-requires a pipeline_configs row per pipeline_name (raises
-- "No pipeline_config found" otherwise). source_domain 'ad_intelligence' is an
-- allowed value in pipeline_configs_source_domain_check.
-- ============================================================================

INSERT INTO public.pipeline_configs (
    pipeline_name, source_domain, description, expected_cron,
    max_runtime_minutes, retry_limit, owner, enabled, step_definitions
)
VALUES
  ('meta_ads_daily', 'ad_intelligence',
   'Daily PI-firm Meta (Facebook/Instagram) ads via SearchApi Meta Ad Library',
   '0 14 * * *', 60, 3, 'lancetarrant@gmail.com', true,
   '[{"step_name":"fetch_raw","step_order":1,"description":"Search the Meta Ad Library per PI case-type keyword and upsert ads into meta_ad_creatives"},{"step_name":"publish","step_order":2,"description":"Verify final table state and mark run complete"}]'::jsonb)
ON CONFLICT (pipeline_name) DO NOTHING;
```

- [ ] **Step 4: Verify required clauses**

Run each; each must print `1`:
```bash
T=supabase/migrations/20260622030000_create_meta_ad_creatives.sql
grep -c "UNIQUE (ad_archive_id)" "$T"
grep -c "ENABLE ROW LEVEL SECURITY" "$T"
grep -c "EXECUTE FUNCTION public.set_updated_at()" "$T"
grep -c "meta_ads_daily" supabase/migrations/20260622040000_seed_meta_ads_pipeline_config.sql
```
Expected: `1` from each.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260622030000_create_meta_ad_creatives.sql supabase/migrations/20260622040000_seed_meta_ads_pipeline_config.sql
git commit -m "feat(meta-ads): meta_ad_creatives table + pipeline_configs seed"
```

---

### Task 2: `meta_ads_daily` pipeline + tests

**Files:**
- Create: `pipeline/pipelines/meta_ads_daily.py`
- Create: `pipeline/tests/test_meta_ads_daily.py`

**Interfaces:**
- Consumes: `meta_ad_creatives` table + the `pipeline_configs` row (Task 1).
- Produces: `_ads_to_rows(ads: list[dict], case_type: str, keyword: str) -> list[dict]`, `_date_part(iso_str) -> str | None`, `step_fetch_raw`, `step_publish`, `main`; invokable as `python -m pipelines.meta_ads_daily [--dry-run]`.

- [ ] **Step 1: Write the failing tests**

Create `pipeline/tests/test_meta_ads_daily.py`:

```python
import json

from pipelines.meta_ads_daily import _ads_to_rows, _date_part


def test_date_part_handles_missing_and_iso():
    assert _date_part(None) is None
    assert _date_part("") is None
    assert _date_part("2024-10-21T07:00:00Z") == "2024-10-21"


def test_ads_to_rows_parses_core_fields():
    ads = [{
        "ad_archive_id": "2241585879557827",
        "page_id": "171489872877097",
        "page_name": "Law Offices of Gary Martin Hays & Associates, P.C.",
        "start_date": "2024-10-21T07:00:00Z",
        "end_date": "2026-06-22T07:00:00Z",
        "is_active": True,
        "publisher_platform": ["FACEBOOK", "INSTAGRAM"],
        "collation_count": 1,
        "snapshot": {"title": "Injured?"},
    }]
    rows = _ads_to_rows(ads, "motor_vehicle", "car accident lawyer")
    assert len(rows) == 1
    r = rows[0]
    assert r["ad_archive_id"] == "2241585879557827"
    assert r["page_id"] == "171489872877097"
    assert r["page_name"].startswith("Law Offices")
    assert r["case_type"] == "motor_vehicle"
    assert r["keyword"] == "car accident lawyer"
    assert r["start_date"] == "2024-10-21"
    assert r["end_date"] == "2026-06-22"
    assert r["is_active"] is True
    assert r["publisher_platforms"] == ["FACEBOOK", "INSTAGRAM"]
    assert r["collation_count"] == 1
    assert r["country"] == "US"
    assert json.loads(r["raw_json"])["ad_archive_id"] == "2241585879557827"


def test_ads_missing_id_are_skipped():
    rows = _ads_to_rows([{"page_name": "No Id LLC"}], "motor_vehicle", "kw")
    assert rows == []


def test_envelope_ads_key_parses_through():
    # Locks in the SearchApi meta_ad_library envelope: ads under top-level "ads".
    envelope = {
        "ads": [{
            "ad_archive_id": "X1",
            "page_name": "Firm",
            "start_date": "2025-01-01T00:00:00Z",
        }],
        "pagination": {},
        "search_information": {"total_results": 100},
    }
    rows = _ads_to_rows(envelope.get("ads", []), "truck_accident", "truck accident lawyer")
    assert len(rows) == 1
    assert rows[0]["ad_archive_id"] == "X1"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd pipeline && pytest tests/test_meta_ads_daily.py -v`
Expected: collection error — `ModuleNotFoundError: No module named 'pipelines.meta_ads_daily'`.

- [ ] **Step 3: Write the pipeline module**

Create `pipeline/pipelines/meta_ads_daily.py`:

```python
#!/usr/bin/env python3
"""
meta_ads_daily pipeline — PI-firm Meta (Facebook/Instagram) ads via SearchApi
Meta Ad Library.

Searches the Meta Ad Library for PI case-type keywords (national, US) and
upserts the returned ads into meta_ad_creatives. Case-type-keyed + national.
Feeds the Phase 5b Meta competitive tab.

Usage:
    python -m pipelines.meta_ads_daily
    python -m pipelines.meta_ads_daily --dry-run
    DRY_RUN=true python -m pipelines.meta_ads_daily

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
from datetime import datetime, timezone

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lib.pipeline import (
    PipelineRun, DRY_RUN,
    _bulk_insert, _dedup_rows,
    SUPABASE_URL, _headers,
)
from lib.api_usage import log_api_call
from lib.api_pricing import get_searchapi_pricing

logger = logging.getLogger(__name__)

SEARCHAPI_API_KEY = os.environ.get("SEARCHAPI_API_KEY", "")
SEARCHAPI_BASE = "https://www.searchapi.io/api/v1/search"
REQUEST_DELAY_SECONDS = 1.5
MAX_RETRIES = 3
COUNTRY = "US"
MAX_PAGES_PER_KEYWORD = 5

# PI case type (slug) -> Meta Ad Library search keyword(s). Same case-type set
# as the SEO tab so the Phase 5b dropdown matches.
META_SEARCH_TERMS = {
    "motor_vehicle":  ["car accident lawyer"],
    "truck_accident": ["truck accident lawyer"],
    "motorcycle":     ["motorcycle accident lawyer"],
    "boating":        ["boat accident lawyer"],
    "nursing_home":   ["nursing home abuse lawyer"],
    "workers_comp":   ["workers compensation lawyer"],
}


def _log_searchapi_call(engine: str, query: str) -> None:
    """Record a Searchapi.io call to api_usage_log. Never raises."""
    pricing = get_searchapi_pricing()
    log_api_call(
        provider="searchapi",
        operation=f"searchapi_{engine}",
        model_or_actor=engine,
        units_consumed=1,
        unit_type="searches",
        cost_usd=pricing["rate_per_unit_usd"],
        called_from="pipelines.meta_ads_daily",
        metadata={"engine": engine, "q": query},
    )


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


def _searchapi_meta(keyword: str, page_token: str | None = None) -> dict:
    """One Meta Ad Library page for a keyword. Returns {} on failure."""
    if not SEARCHAPI_API_KEY:
        return {}
    params = {
        "engine": "meta_ad_library",
        "q": keyword,
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
                backoff = 2 ** attempt * REQUEST_DELAY_SECONDS
                logger.warning("Rate limited on '%s', backing off %.1fs", keyword, backoff)
                time.sleep(backoff)
                continue
            resp.raise_for_status()
            _log_searchapi_call("meta_ad_library", keyword)
            return resp.json()
        except httpx.HTTPError as e:
            if attempt < MAX_RETRIES - 1:
                logger.warning("Searchapi error for '%s': %s, retrying", keyword, e)
                time.sleep(2 ** attempt * REQUEST_DELAY_SECONDS)
            else:
                logger.error("Searchapi failed for '%s' after %d attempts: %s",
                             keyword, MAX_RETRIES, e)
    return {}


def _date_part(iso_str: str | None) -> str | None:
    """Extract YYYY-MM-DD from an ISO 8601 datetime; None if missing/unparseable."""
    if not iso_str:
        return None
    try:
        return datetime.fromisoformat(iso_str.replace("Z", "+00:00")).date().isoformat()
    except (ValueError, AttributeError):
        return None


def _ads_to_rows(ads: list[dict], case_type: str, keyword: str) -> list[dict]:
    """Map Meta Ad Library ads to meta_ad_creatives rows."""
    rows = []
    for ad in ads:
        ad_id = ad.get("ad_archive_id")
        if not ad_id:
            continue
        snapshot = ad.get("snapshot")
        rows.append({
            "ad_archive_id": str(ad_id),
            "page_id": ad.get("page_id"),
            "page_name": ad.get("page_name"),
            "case_type": case_type,
            "keyword": keyword,
            "start_date": _date_part(ad.get("start_date")),
            "end_date": _date_part(ad.get("end_date")),
            "is_active": ad.get("is_active"),
            "publisher_platforms": ad.get("publisher_platform"),
            "collation_count": ad.get("collation_count"),
            "country": COUNTRY,
            "snapshot": json.dumps(snapshot, default=str) if snapshot is not None else None,
            "raw_json": json.dumps(ad, default=str),
        })
    return rows


def _seed_rows() -> list[dict]:
    """Fixture rows when SEARCHAPI_API_KEY is unset (local / dry-run only)."""
    return [{
        "ad_archive_id": "META_SEED_0001",
        "page_id": "171489872877097",
        "page_name": "Law Offices of Gary Martin Hays & Associates, P.C.",
        "case_type": "motor_vehicle",
        "keyword": "car accident lawyer",
        "start_date": "2024-10-21",
        "end_date": "2026-06-22",
        "is_active": True,
        "publisher_platforms": ["FACEBOOK", "INSTAGRAM"],
        "collation_count": 1,
        "country": "US",
        "snapshot": json.dumps({"seed": True}),
        "raw_json": json.dumps({"seed": True}),
    }]


def step_fetch_raw(step) -> list[dict]:
    """Search the Meta Ad Library per case-type keyword and upsert ads."""
    if not SEARCHAPI_API_KEY:
        # Read the live dry-run flag from the environment — the module-level
        # DRY_RUN import is bound at import time and goes stale when main()
        # flips it for --dry-run, so it cannot gate a live-table write.
        dry = os.environ.get("DRY_RUN", "").strip().lower() == "true"
        if not dry:
            print("  WARNING: SEARCHAPI_API_KEY not set and not a dry run — "
                  "skipping (refusing to write seed data to the live table)")
            step.set_metadata({"source": "no_api_key_skipped"})
            step.set_counts(rows_in=0, rows_out=0)
            return []
        print("  WARNING: SEARCHAPI_API_KEY not set — using seed data (dry run)")
        rows = _dedup_rows(_seed_rows(), ("ad_archive_id",))
        count = _bulk_insert("meta_ad_creatives", rows,
                             on_conflict="ad_archive_id",
                             resolution="merge-duplicates")
        step.set_metadata({"source": "seed_data"})
        step.set_counts(rows_in=0, rows_out=count)
        return rows

    rows: list[dict] = []
    keywords_queried = 0
    failed_keywords: list[str] = []

    for case_type, keywords in META_SEARCH_TERMS.items():
        for keyword in keywords:
            keywords_queried += 1
            try:
                page_token = None
                for _page in range(MAX_PAGES_PER_KEYWORD):
                    data = _searchapi_meta(keyword, page_token)
                    if not data:
                        break
                    rows.extend(_ads_to_rows(data.get("ads", []), case_type, keyword))
                    page_token = (data.get("pagination") or {}).get("next_page_token")
                    time.sleep(REQUEST_DELAY_SECONDS)
                    if not page_token:
                        break
            except Exception as e:  # noqa: BLE001 — one keyword must not abort the run
                logger.error("  Keyword '%s' failed: %s", keyword, e)
                failed_keywords.append(keyword)

    rows = _dedup_rows(rows, ("ad_archive_id",))
    step.set_metadata({
        "source": "searchapi_meta_ad_library",
        "keywords_queried": keywords_queried,
        "total_ads": len(rows),
        "distinct_pages": len({r["page_id"] for r in rows if r.get("page_id")}),
        "failed_keywords": failed_keywords[:50],
    })
    count = _bulk_insert("meta_ad_creatives", rows,
                         on_conflict="ad_archive_id",
                         resolution="merge-duplicates")
    step.set_counts(rows_in=0, rows_out=count)
    return rows


def step_publish(step, raw_count: int):
    """Verify final state."""
    if DRY_RUN:
        step.set_counts(rows_in=raw_count, rows_out=raw_count)
        step.set_metadata({"dry_run": True})
        print("\n  [DRY RUN] Skipping verification")
        return
    total = supabase_count("meta_ad_creatives")
    step.set_counts(rows_in=raw_count, rows_out=raw_count)
    step.set_metadata({
        "total_ads": total,
        "publish_timestamp": datetime.now(timezone.utc).isoformat(),
    })
    print(f"\n  meta_ad_creatives total: {total}")


def main():
    parser = argparse.ArgumentParser(
        description="Meta Ads daily pipeline (SearchApi Meta Ad Library)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Run without writing to database")
    args = parser.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "true"
        import lib.pipeline
        lib.pipeline.DRY_RUN = True

    trigger = os.environ.get("PIPELINE_TRIGGER", "manual")

    with PipelineRun("meta_ads_daily", trigger=trigger) as run:
        with run.step("fetch_raw") as step:
            raw_rows = step_fetch_raw(step)
        with run.step("publish") as step:
            step_publish(step, len(raw_rows))


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd pipeline && pytest tests/test_meta_ads_daily.py -v`
Expected: 4 PASS.

- [ ] **Step 5: Run the full pipeline suite (no regressions)**

Run: `cd pipeline && pytest tests/ -q`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add pipeline/pipelines/meta_ads_daily.py pipeline/tests/test_meta_ads_daily.py
git commit -m "feat(meta-ads): meta_ads_daily ingest pipeline + tests"
```

---

### Task 3: Daily workflow + inventory doc

**Files:**
- Create: `.github/workflows/meta-ads-daily.yml`
- Modify: `CLAUDE.md` (§8 GitHub Actions inventory table)

**Interfaces:**
- Consumes: `pipelines.meta_ads_daily` (Task 2).

- [ ] **Step 1: Write the workflow file**

Create `.github/workflows/meta-ads-daily.yml`:

```yaml
name: Meta Ads Daily Pipeline

on:
  schedule:
    # Daily at 14:00 UTC (free slot)
    - cron: '0 14 * * *'
  workflow_dispatch:
    inputs:
      dry_run:
        description: 'Run in dry-run mode (no DB writes)'
        required: false
        default: 'false'
        type: boolean

jobs:
  run-pipeline:
    runs-on: ubuntu-latest
    timeout-minutes: 60

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Python 3.12
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'
          cache-dependency-path: pipeline/requirements.txt

      - name: Install dependencies
        run: pip install -r pipeline/requirements.txt

      - name: Run meta_ads_daily pipeline
        working-directory: pipeline
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          SEARCHAPI_API_KEY: ${{ secrets.SEARCHAPI_API_KEY }}
          PIPELINE_TRIGGER: ${{ github.event_name == 'schedule' && 'scheduled' || 'manual' }}
        run: |
          if [ "${{ inputs.dry_run }}" = "true" ]; then
            echo "Running in DRY-RUN mode"
            python -m pipelines.meta_ads_daily --dry-run
          else
            python -m pipelines.meta_ads_daily
          fi
```

- [ ] **Step 2: Verify the YAML parses**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/meta-ads-daily.yml')); print('OK')"`
Expected: `OK`.

- [ ] **Step 3: Add the §8 inventory row**

In `CLAUDE.md` §8, add this row immediately after the `youtube-ads-daily.yml` row:

```
| `meta-ads-daily.yml` | daily 14:00 | `pipelines.meta_ads_daily` (PI-firm Meta/FB+IG ads via SearchApi Meta Ad Library) |
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/meta-ads-daily.yml CLAUDE.md
git commit -m "feat(meta-ads): daily workflow + CLAUDE.md inventory"
```

---

### Task 4: Swap TikTok → Meta tab in competitive-analysis.tsx

**Files:**
- Modify: `web/app/(app)/state-intelligence/v2/[slug]/competitive-analysis.tsx`

**Interfaces:** none downstream (placeholder tab only; the live Meta panel is Phase 5b).

Make these four targeted edits (exact strings — match verbatim).

- [ ] **Step 1: Update the `ChannelKey` type**

Replace:
```tsx
type ChannelKey = "paid_search" | "seo" | "youtube" | "tiktok" | "traditional";
```
With:
```tsx
type ChannelKey = "paid_search" | "seo" | "youtube" | "meta" | "traditional";
```

- [ ] **Step 2: Swap the tab in `CHANNEL_TABS`**

Replace:
```tsx
  { key: "tiktok", label: "TikTok", disabled: true, badge: "No US data" },
```
With:
```tsx
  { key: "meta", label: "Meta", disabled: true, badge: "Soon" },
```

- [ ] **Step 3: Remove the TikTok panel branch**

Replace:
```tsx
      ) : activeChannel === "tiktok" ? (
        <ComingSoon
          title="TikTok competitive data is not available in the U.S."
          body="TikTok only publishes an ad library for the EU/UK (DSA mandate); there is no U.S. ad-library source to attribute ads to firms. We'll wire this up if that changes."
        />
      ) : (
```
With:
```tsx
      ) : (
```

- [ ] **Step 4: Update the header comment**

Replace:
```tsx
/*  TikTok is disabled — TikTok publishes no US ad library (EU/UK     */
/*  DSA only).                                                         */
```
With:
```tsx
/*  Meta (Phase 5b) replaces TikTok — TikTok had no US ad library;    */
/*  Meta's Ad Library is national/US. Shown as a "Soon" placeholder   */
/*  until 5b wires the panel.                                          */
```

- [ ] **Step 5: Install deps + type-check the file**

Run: `cd web && npm install`
Then: `cd web && npx tsc --noEmit 2>&1 | grep "competitive-analysis"`
Expected: no output (the file is clean; `tiktok` is fully removed so no dangling references).

- [ ] **Step 6: Build**

Run: `cd web && npm run build`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add "web/app/(app)/state-intelligence/v2/[slug]/competitive-analysis.tsx"
git commit -m "feat(competitive-analysis): replace TikTok tab with Meta (Soon placeholder)"
```

---

### Task 5: Docs + open PR

**Files:**
- Modify: `memory.md`
- Modify: `CURRENT_PRIORITIES.md`

- [ ] **Step 1: Log in memory.md**

Append to the bottom of the "Recent PRs / shipped work" section a dated (2026-06-22) entry: Competitive Analysis Phase 5a — Meta ingest + TikTok removed. New `meta_ad_creatives` table + `meta_ads_daily` pipeline (SearchApi `meta_ad_library`, 6 PI case-type keywords, US, active, paginated cap 5/keyword, upsert on `ad_archive_id`); national + case-type-keyed (SEO model); page-led identity. Note the existing `ad_observations_raw` meta data was unusable (99.9% NY, 40 mass-tort/lead-gen advertisers) so a fresh ingest was needed. TikTok tab removed (no US ad library); Meta shown as "Soon" placeholder until Phase 5b wires the panel + `get_meta_competitors` RPC. Carries the 4a lessons (pipeline_configs seed required; seed-write gated to dry-run).

- [ ] **Step 2: Update CURRENT_PRIORITIES.md**

In §0 add a "Recently shipped" entry for Phase 5a (Meta ingest + TikTok removed). In the §2 **D. Competitive Analysis** track, add Meta ingest (5a) to Shipped and note Meta tab (5b) + Traditional Media as what's next; drop TikTok from the channel list.

- [ ] **Step 3: Commit docs**

```bash
git add memory.md CURRENT_PRIORITIES.md
git commit -m "docs(memory): log Competitive Analysis Phase 5a — Meta ingest"
```

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin feat/meta-ads-ingest
gh pr create --title "Competitive Analysis Phase 5a: Meta ingest (replaces TikTok)" --body "$(cat <<'EOF'
## Summary
Replaces TikTok with Meta on the Competitive Analysis surface and stands up the Meta data layer. **No live Meta panel** — that's Phase 5b (this ships the ingest + a "Soon" placeholder tab).

- **Migration `20260622030000`** — `meta_ad_creatives` table (dedicated, `UNIQUE(ad_archive_id)`).
- **Migration `20260622040000`** — `pipeline_configs` seed for `meta_ads_daily` (required or every run fails at startup).
- **`pipeline/pipelines/meta_ads_daily.py`** — searches the Meta Ad Library (SearchApi `engine=meta_ad_library`) by 6 PI case-type keywords (US, active), paginated cap 5/keyword, upserts on `ad_archive_id`. National + case-type-keyed.
- **`.github/workflows/meta-ads-daily.yml`** — daily 14:00 UTC.
- **`competitive-analysis.tsx`** — TikTok tab removed (no US ad library); Meta added as a disabled "Soon" tab.

## Why a fresh ingest
The existing `ad_observations_raw` meta data is unusable for the tab: 99.9% New York DMA, 40 mass-tort/lead-gen advertisers (legacy `ad_intel_daily`). Fresh ingest mirrors the YouTube 4a approach.

## Testing
- `pytest tests/test_meta_ads_daily.py` — 4 tests (field mapping, dates, missing-id skip, `.ads` envelope key); full suite green.
- Source confirmed via live SearchApi probe (one keyword → ~21,870 results; real PI firm pages).
- `npm run build` + `tsc` green (changed component clean; TikTok fully removed).
- Post-merge: manual `workflow_dispatch` real run to confirm `meta_ad_creatives` populates. No live Meta panel to browser-verify (disabled placeholder).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL; `pr-typecheck` + Vercel green.

---

## Post-merge (operational follow-up, not a task)

1. Confirm both migrations auto-applied (re-run `supabase-migrations` if it hits the known `setup-cli` rate-limit transient).
2. Trigger one real run: `gh workflow run meta-ads-daily.yml`. Confirm `meta_ad_creatives` populates; spot-check a known PI firm page_name.
3. Phase 5b (separate spec): `get_meta_competitors` RPC + wire the live Meta panel (case-type dropdown, firm ranking, "view ads" link to the Meta Ad Library page) + flip the tab enabled + browser-verify.
</content>
