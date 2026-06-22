# Competitive Analysis Phase 4a — YouTube video-ad ingest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a daily pipeline that ingests PI-firm YouTube/video ad creatives from the Google Ads Transparency Center (SearchApi) into a dedicated `youtube_ad_creatives` table, so a later phase can surface a firm-level YouTube competitive tab.

**Architecture:** A new Postgres table keyed on a non-partial `UNIQUE(creative_id)` (clean upserts); a new Python pipeline that iterates the 490 known PI-firm domains from `pi_search_observations`, fetches each firm's video creatives via SearchApi `google_ads_transparency_center`, and upserts them; a daily GitHub Actions workflow. No UI (that is Phase 4b).

**Tech Stack:** Supabase Postgres (migration, RLS), Python 3.12 ETL (`pipeline/`, httpx, SearchApi), pytest, GitHub Actions.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-21-youtube-ads-ingest-design.md`.
- Dedicated table `youtube_ad_creatives` — NOT `ad_observations_raw` (its `(source,source_id)` unique index is partial → unusable for `on_conflict`).
- Natural key: `creative_id` (Transparency `id`, e.g. `CR034...`), a real `UNIQUE` constraint → upsert via `on_conflict="creative_id", resolution="merge-duplicates"`.
- SearchApi call per domain: `engine=google_ads_transparency_center`, `ad_format=video`, `region=US`, `time_period=last_30_days`, `num=100`.
- Seed domains: `SELECT DISTINCT advertiser_domain FROM pi_search_observations` (490 today).
- National only (no DMA). Firm-level signal (creatives are not case-type tagged).
- Migrations apply on merge / auto-apply — do NOT apply via Supabase MCP (desyncs history). Pipeline tests are mocked, never hit live APIs (run `pytest tests/` from inside `pipeline/`).
- Pipeline mirrors `pipeline/pipelines/google_ads_daily.py` conventions (PipelineRun, `_bulk_insert`, `DomainMapper`, `log_api_call`).
- Migration timestamp `20260622000000` (verify no collision first: `ls supabase/migrations/ | grep ^20260622`).

---

### Task 1: `youtube_ad_creatives` table (migration)

**Files:**
- Create: `supabase/migrations/20260622000000_create_youtube_ad_creatives.sql`

**Interfaces:**
- Produces: table `public.youtube_ad_creatives` with `UNIQUE (creative_id)`, columns consumed by Task 2's upsert: `creative_id, advertiser_domain, advertiser_name, advertiser_ar_id, advertiser_id, target_domain, ad_format, first_shown, last_shown, total_days_shown, details_link, region, raw_json`. Plus `id` (PK), `first_ingested_at`, `updated_at` (defaults/trigger-managed; not written by the pipeline).

- [ ] **Step 1: Confirm no migration timestamp collision**

Run: `ls supabase/migrations/ | grep ^20260622`
Expected: no output. If anything returns, bump to `20260622010000` and use that filename throughout this task.

- [ ] **Step 2: Write the migration file**

Create `supabase/migrations/20260622000000_create_youtube_ad_creatives.sql`:

```sql
-- ============================================================================
-- Competitive Analysis Phase 4a: youtube_ad_creatives
-- PI-firm YouTube/video ad creatives from the Google Ads Transparency Center,
-- ingested by pipelines/youtube_ads_daily.py. Firm-level, national (no DMA).
--
-- Dedicated table, matching the per-channel pattern (pi_search_observations,
-- serp_results_normalized). NOT ad_observations_raw: its (source,source_id)
-- unique index is partial (WHERE source_id IS NOT NULL) and cannot be used as
-- an on_conflict target for upserts. creative_id is the natural key and gets a
-- real (non-partial) UNIQUE constraint so the daily run can merge-duplicates.
-- ============================================================================

CREATE TABLE public.youtube_ad_creatives (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creative_id text NOT NULL,
    advertiser_domain text NOT NULL,
    advertiser_name text,
    advertiser_ar_id text,
    advertiser_id uuid REFERENCES public.advertiser_entities(id),
    target_domain text,
    ad_format text NOT NULL DEFAULT 'video',
    first_shown date,
    last_shown date,
    total_days_shown integer,
    details_link text,
    region text NOT NULL DEFAULT 'US',
    raw_json jsonb,
    first_ingested_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT youtube_ad_creatives_creative_id_key UNIQUE (creative_id)
);

CREATE INDEX idx_youtube_ad_creatives_domain
    ON public.youtube_ad_creatives(advertiser_domain);
CREATE INDEX idx_youtube_ad_creatives_last_shown
    ON public.youtube_ad_creatives(last_shown DESC);

ALTER TABLE public.youtube_ad_creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY youtube_ad_creatives_service_role ON public.youtube_ad_creatives
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY youtube_ad_creatives_anon_read ON public.youtube_ad_creatives
    FOR SELECT USING (true);

CREATE TRIGGER trg_youtube_ad_creatives_updated_at
    BEFORE UPDATE ON public.youtube_ad_creatives
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

- [ ] **Step 3: Verify the file has the required clauses**

Run each; each must print `1`:
```bash
F=supabase/migrations/20260622000000_create_youtube_ad_creatives.sql
grep -c "UNIQUE (creative_id)" "$F"
grep -c "ENABLE ROW LEVEL SECURITY" "$F"
grep -c "EXECUTE FUNCTION public.set_updated_at()" "$F"
```
Expected: `1` from each (real unique key present; RLS enabled; trigger reuses the existing shared `set_updated_at` function — do NOT redefine it).
Then confirm both anon-read and service-role policies exist:
```bash
grep -c "CREATE POLICY" "$F"
```
Expected: `2`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260622000000_create_youtube_ad_creatives.sql
git commit -m "feat(youtube-ads): youtube_ad_creatives table"
```

---

### Task 2: `youtube_ads_daily` pipeline + unit tests

**Files:**
- Create: `pipeline/pipelines/youtube_ads_daily.py`
- Create: `pipeline/tests/test_youtube_ads_daily.py`

**Interfaces:**
- Consumes: table `youtube_ad_creatives` (Task 1); `pi_search_observations.advertiser_domain`; `advertiser_entities`.
- Produces: module functions `_creatives_to_rows(creatives: list[dict], domain: str, domain_mapper: DomainMapper) -> list[dict]`, `_date_part(iso_str: str | None) -> str | None`, `_searchapi_transparency(domain) -> dict`, `step_fetch_raw(step) -> list[dict]`, `step_publish(step, raw_count)`, `main()`. The pipeline is invokable as `python -m pipelines.youtube_ads_daily [--dry-run]`.

- [ ] **Step 1: Write the failing tests**

Create `pipeline/tests/test_youtube_ads_daily.py`:

```python
import json

from pipelines.youtube_ads_daily import _creatives_to_rows, _date_part
from lib.domain_mapper import DomainMapper


def _empty_mapper():
    # No advertiser_entities → advertiser_id stays None (domain-keyed table).
    return DomainMapper([])


def test_date_part_handles_missing_and_iso():
    assert _date_part(None) is None
    assert _date_part("") is None
    assert _date_part("2026-06-21T23:15:45Z") == "2026-06-21"


def test_creatives_to_rows_parses_core_fields():
    creatives = [{
        "id": "CR123",
        "target_domain": "forthepeople.com",
        "advertiser": {"id": "AR999", "name": "Morgan & Morgan, P.A."},
        "first_shown_datetime": "2026-01-28T21:06:34Z",
        "last_shown_datetime": "2026-06-21T23:15:45Z",
        "total_days_shown": 145,
        "format": "video",
        "details_link": "https://adstransparency.google.com/x",
    }]
    rows = _creatives_to_rows(creatives, "forthepeople.com", _empty_mapper())
    assert len(rows) == 1
    r = rows[0]
    assert r["creative_id"] == "CR123"
    assert r["advertiser_domain"] == "forthepeople.com"
    assert r["advertiser_name"] == "Morgan & Morgan, P.A."
    assert r["advertiser_ar_id"] == "AR999"
    assert r["advertiser_id"] is None
    assert r["target_domain"] == "forthepeople.com"
    assert r["ad_format"] == "video"
    assert r["first_shown"] == "2026-01-28"
    assert r["last_shown"] == "2026-06-21"
    assert r["total_days_shown"] == 145
    assert r["region"] == "US"
    assert json.loads(r["raw_json"])["id"] == "CR123"


def test_creatives_missing_id_are_skipped():
    creatives = [{"advertiser": {"name": "No Id LLC"}, "format": "video"}]
    rows = _creatives_to_rows(creatives, "example.com", _empty_mapper())
    assert rows == []
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd pipeline && pytest tests/test_youtube_ads_daily.py -v`
Expected: collection/import error — `ModuleNotFoundError: No module named 'pipelines.youtube_ads_daily'` (the module does not exist yet).

- [ ] **Step 3: Write the pipeline module**

Create `pipeline/pipelines/youtube_ads_daily.py`:

```python
#!/usr/bin/env python3
"""
youtube_ads_daily pipeline — PI-firm YouTube/video ad creatives via SearchApi
Google Ads Transparency Center.

For each known PI-firm domain (distinct advertiser_domain in
pi_search_observations), fetches video-format ad creatives from the Google Ads
Transparency Center and upserts them into youtube_ad_creatives. Firm-level,
national (Transparency has no DMA dimension). Feeds the Phase 4b YouTube
competitive tab.

Usage:
    python -m pipelines.youtube_ads_daily
    python -m pipelines.youtube_ads_daily --dry-run
    DRY_RUN=true python -m pipelines.youtube_ads_daily

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
    _get, _bulk_insert, _dedup_rows,
    SUPABASE_URL, _headers,
)
from lib.api_usage import log_api_call
from lib.api_pricing import get_searchapi_pricing
from lib.domain_mapper import DomainMapper

logger = logging.getLogger(__name__)

SEARCHAPI_API_KEY = os.environ.get("SEARCHAPI_API_KEY", "")
SEARCHAPI_BASE = "https://www.searchapi.io/api/v1/search"
REQUEST_DELAY_SECONDS = 1.5
MAX_RETRIES = 3
SEARCH_TIME_PERIOD = "last_30_days"
NUM_PER_DOMAIN = 100
REGION = "US"


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
        called_from="pipelines.youtube_ads_daily",
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


def _searchapi_transparency(domain: str) -> dict:
    """Fetch video ad creatives for a domain from Google Ads Transparency Center."""
    if not SEARCHAPI_API_KEY:
        return {}
    for attempt in range(MAX_RETRIES):
        try:
            resp = httpx.get(SEARCHAPI_BASE, params={
                "engine": "google_ads_transparency_center",
                "domain": domain,
                "ad_format": "video",
                "region": REGION,
                "time_period": SEARCH_TIME_PERIOD,
                "num": NUM_PER_DOMAIN,
                "api_key": SEARCHAPI_API_KEY,
            }, timeout=60)
            if resp.status_code == 429:
                backoff = 2 ** attempt * REQUEST_DELAY_SECONDS
                logger.warning("Rate limited on '%s', backing off %.1fs", domain, backoff)
                time.sleep(backoff)
                continue
            resp.raise_for_status()
            _log_searchapi_call("google_ads_transparency_center", domain)
            return resp.json()
        except httpx.HTTPError as e:
            if attempt < MAX_RETRIES - 1:
                logger.warning("Searchapi error for '%s': %s, retrying", domain, e)
                time.sleep(2 ** attempt * REQUEST_DELAY_SECONDS)
            else:
                logger.error("Searchapi failed for '%s' after %d attempts: %s",
                             domain, MAX_RETRIES, e)
    return {}


def _date_part(iso_str: str | None) -> str | None:
    """Extract YYYY-MM-DD from an ISO 8601 datetime; None if missing/unparseable."""
    if not iso_str:
        return None
    try:
        return datetime.fromisoformat(iso_str.replace("Z", "+00:00")).date().isoformat()
    except (ValueError, AttributeError):
        return None


def _creatives_to_rows(creatives: list[dict], domain: str,
                       domain_mapper: DomainMapper) -> list[dict]:
    """Map Google Ads Transparency video creatives to youtube_ad_creatives rows."""
    rows = []
    for cr in creatives:
        creative_id = cr.get("id")
        if not creative_id:
            continue
        advertiser = cr.get("advertiser") or {}
        advertiser_name = advertiser.get("name")
        rows.append({
            "creative_id": creative_id,
            "advertiser_domain": domain,
            "advertiser_name": advertiser_name,
            "advertiser_ar_id": advertiser.get("id"),
            "advertiser_id": domain_mapper.match_with_name_fallback(
                domain, advertiser_name or ""),
            "target_domain": cr.get("target_domain"),
            "ad_format": cr.get("format") or "video",
            "first_shown": _date_part(cr.get("first_shown_datetime")),
            "last_shown": _date_part(cr.get("last_shown_datetime")),
            "total_days_shown": cr.get("total_days_shown"),
            "details_link": cr.get("details_link"),
            "region": REGION,
            "raw_json": json.dumps(cr, default=str),
        })
    return rows


def _seed_rows() -> list[dict]:
    """Fixture rows when SEARCHAPI_API_KEY is unset (local / dry-run)."""
    return [{
        "creative_id": "CR_SEED_0001",
        "advertiser_domain": "forthepeople.com",
        "advertiser_name": "Morgan & Morgan, P.A.",
        "advertiser_ar_id": "AR14096354794599874561",
        "advertiser_id": None,
        "target_domain": "forthepeople.com",
        "ad_format": "video",
        "first_shown": "2026-01-28",
        "last_shown": "2026-06-21",
        "total_days_shown": 144,
        "details_link": "https://adstransparency.google.com/advertiser/AR14096354794599874561/creative/CR_SEED_0001?region=US",
        "region": "US",
        "raw_json": json.dumps({"seed": True}),
    }]


def step_fetch_raw(step) -> list[dict]:
    """Fetch video creatives for every known PI-firm domain and upsert them."""
    obs = _get("pi_search_observations", {"select": "advertiser_domain"})
    domains = sorted({(o.get("advertiser_domain") or "").strip().lower()
                      for o in obs if o.get("advertiser_domain")})
    domains = [d for d in domains if d]

    advertisers = _get("advertiser_entities",
                       {"select": "id,canonical_name,website,aliases"})
    domain_mapper = DomainMapper(advertisers)

    if not SEARCHAPI_API_KEY:
        print("  WARNING: SEARCHAPI_API_KEY not set — using seed data")
        rows = _dedup_rows(_seed_rows(), ("creative_id",))
        count = _bulk_insert("youtube_ad_creatives", rows,
                             on_conflict="creative_id",
                             resolution="merge-duplicates")
        step.set_metadata({"source": "seed_data", "domains_in_seed": len(domains)})
        step.set_counts(rows_in=0, rows_out=count)
        return rows

    rows: list[dict] = []
    domains_with_ads = 0
    failed_domains: list[str] = []

    for domain in domains:
        try:
            data = _searchapi_transparency(domain)
            creatives = data.get("ad_creatives", []) if data else []
            domain_rows = _creatives_to_rows(creatives, domain, domain_mapper)
            if domain_rows:
                domains_with_ads += 1
            rows.extend(domain_rows)
            time.sleep(REQUEST_DELAY_SECONDS)
        except Exception as e:  # noqa: BLE001 — one domain must not abort the run
            logger.error("  Domain '%s' failed: %s", domain, e)
            failed_domains.append(domain)

    rows = _dedup_rows(rows, ("creative_id",))
    step.set_metadata({
        "source": "searchapi_google_ads_transparency_center",
        "domains_queried": len(domains),
        "domains_with_ads": domains_with_ads,
        "total_creatives": len(rows),
        "failed_domains": failed_domains[:50],
        "matched_advertisers": sum(1 for r in rows if r.get("advertiser_id")),
    })
    count = _bulk_insert("youtube_ad_creatives", rows,
                         on_conflict="creative_id",
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
    total = supabase_count("youtube_ad_creatives")
    step.set_counts(rows_in=raw_count, rows_out=raw_count)
    step.set_metadata({
        "total_creatives": total,
        "publish_timestamp": datetime.now(timezone.utc).isoformat(),
    })
    print(f"\n  youtube_ad_creatives total: {total}")


def main():
    parser = argparse.ArgumentParser(
        description="YouTube Ads daily pipeline (SearchApi Transparency Center)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Run without writing to database")
    args = parser.parse_args()

    if args.dry_run:
        os.environ["DRY_RUN"] = "true"
        import lib.pipeline
        lib.pipeline.DRY_RUN = True

    trigger = os.environ.get("PIPELINE_TRIGGER", "manual")

    with PipelineRun("youtube_ads_daily", trigger=trigger) as run:
        with run.step("fetch_raw") as step:
            raw_rows = step_fetch_raw(step)
        with run.step("publish") as step:
            step_publish(step, len(raw_rows))


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd pipeline && pytest tests/test_youtube_ads_daily.py -v`
Expected: 3 PASS.

- [ ] **Step 5: Run the full pipeline suite (no regressions)**

Run: `cd pipeline && pytest tests/ -q`
Expected: all pass (the 3 new tests added; no prior tests broken).

- [ ] **Step 6: Dry-run smoke test (no DB writes, no API key needed)**

Run: `cd pipeline && DRY_RUN=true SEARCHAPI_API_KEY= python -m pipelines.youtube_ads_daily --dry-run`
Expected: runs end-to-end, prints the "SEARCHAPI_API_KEY not set — using seed data" warning and a `[DRY RUN]` line, exits 0, no traceback. (It reads `pi_search_observations`/`advertiser_entities` via the service key if present; if Supabase env is also unset locally it may print a connection error on the read — that is acceptable for this smoke check as long as there is no Python exception in the parsing/seed code. If `_get` raises due to missing Supabase env, note it and rely on Step 4/5 for correctness.)

- [ ] **Step 7: Commit**

```bash
git add pipeline/pipelines/youtube_ads_daily.py pipeline/tests/test_youtube_ads_daily.py
git commit -m "feat(youtube-ads): youtube_ads_daily ingest pipeline + tests"
```

---

### Task 3: Daily workflow + inventory doc

**Files:**
- Create: `.github/workflows/youtube-ads-daily.yml`
- Modify: `CLAUDE.md` (§8 GitHub Actions inventory table)

**Interfaces:**
- Consumes: `pipelines.youtube_ads_daily` (Task 2).

- [ ] **Step 1: Write the workflow file**

Create `.github/workflows/youtube-ads-daily.yml`:

```yaml
name: YouTube Ads Daily Pipeline

on:
  schedule:
    # Daily at 13:00 UTC (free slot; after serp/pi-search at 12:00)
    - cron: '0 13 * * *'
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

      - name: Run youtube_ads_daily pipeline
        working-directory: pipeline
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          SEARCHAPI_API_KEY: ${{ secrets.SEARCHAPI_API_KEY }}
          PIPELINE_TRIGGER: ${{ github.event_name == 'schedule' && 'scheduled' || 'manual' }}
        run: |
          if [ "${{ inputs.dry_run }}" = "true" ]; then
            echo "Running in DRY-RUN mode"
            python -m pipelines.youtube_ads_daily --dry-run
          else
            python -m pipelines.youtube_ads_daily
          fi
```

- [ ] **Step 2: Verify the YAML parses**

Run: `python -c "import yaml; yaml.safe_load(open('.github/workflows/youtube-ads-daily.yml'))" && echo OK`
Expected: `OK`.

- [ ] **Step 3: Add the row to CLAUDE.md §8 inventory**

In `CLAUDE.md`, in the "## 8. GitHub Actions inventory" table, add this row immediately after the `faers-weekly.yml` row:

```
| `youtube-ads-daily.yml` | daily 13:00 | `pipelines.youtube_ads_daily` (PI-firm YouTube video ads via SearchApi Transparency) |
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/youtube-ads-daily.yml CLAUDE.md
git commit -m "feat(youtube-ads): daily workflow + CLAUDE.md inventory"
```

---

### Task 4: Docs + open PR

**Files:**
- Modify: `memory.md`
- Modify: `CURRENT_PRIORITIES.md`

- [ ] **Step 1: Log the work in memory.md**

Append to the bottom of the "Recent PRs / shipped work" section of `memory.md` a dated (2026-06-21) entry covering: Competitive Analysis Phase 4a — YouTube video-ad ingest; new `youtube_ad_creatives` table (dedicated, like pi_search/serp, NOT ad_observations_raw — its `(source,source_id)` unique index is partial); new `youtube_ads_daily.py` pulls video creatives per PI-firm domain (490 from `pi_search_observations`) via SearchApi `google_ads_transparency_center` (`ad_format=video`, US, last 30 days, `num=100`), upsert on `creative_id` merge-duplicates; national + firm-level (creatives carry no case-type tag); the YouTube tab UI is Phase 4b (built after data accrues). Note the probe finding: Morgan & Morgan returned 600 video creatives, so yield is strong.

- [ ] **Step 2: Update CURRENT_PRIORITIES.md**

Add a short "Recently shipped" (§0) entry for Phase 4a (YouTube video-ad ingest pipeline) and note Phase 4b (the tab) is next, built once data accrues.

- [ ] **Step 3: Commit docs**

```bash
git add memory.md CURRENT_PRIORITIES.md
git commit -m "docs(memory): log Competitive Analysis Phase 4a — YouTube ad ingest"
```

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin feat/youtube-ads-ingest
gh pr create --title "Competitive Analysis Phase 4a: YouTube video-ad ingest" --body "$(cat <<'EOF'
## Summary
Stands up the data layer for the YouTube competitive tab (Phase 4b). No UI in this PR.

- **Migration `20260622000000`** — new `youtube_ad_creatives` table (dedicated, like pi_search/serp; NOT `ad_observations_raw` — its `(source,source_id)` unique index is partial). Keyed on a real `UNIQUE(creative_id)` for clean upserts.
- **`pipeline/pipelines/youtube_ads_daily.py`** — iterates the 490 PI-firm domains from `pi_search_observations`, pulls each firm's video creatives via SearchApi `google_ads_transparency_center` (`ad_format=video`, US, last 30 days, `num=100`), upserts on `creative_id` (merge-duplicates → refreshes `last_shown`/`total_days_shown`). ~18 min/run.
- **`.github/workflows/youtube-ads-daily.yml`** — daily 13:00 UTC, 60-min timeout, `workflow_dispatch` with `dry_run`.

## Notes
- National + firm-level by design: Transparency video creatives carry no case-type tag, and Transparency has no DMA dimension. The Phase 4b tab ranks firms by video-ad investment.
- `num=100`/domain caps mega-advertisers (Morgan & Morgan has 600) — ordinal ranking stays valid; `total_results` is in `raw_json` for a later true-totals pass.

## Testing
- `pytest tests/test_youtube_ads_daily.py` (creative parsing, date handling, missing-id skip); full pipeline suite green.
- Dry-run smoke: `DRY_RUN=true python -m pipelines.youtube_ads_daily --dry-run` runs end-to-end (seed-data path).
- Source confirmed via live SearchApi probe (Morgan & Morgan → 600 video creatives).
- Post-merge: manual `workflow_dispatch` (real run) to confirm `youtube_ad_creatives` populates; spot-check forthepeople.com rows. No browser verification (no UI this phase).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL printed; `pr-typecheck` + Vercel checks should pass (no web changes).

---

## Post-merge (operational follow-up, not a task)

1. Confirm the migration auto-applied (re-run `supabase-migrations` if it hits the known `setup-cli` rate-limit transient).
2. Trigger one real run: `gh workflow run youtube-ads-daily.yml` (or via the Actions UI). Confirm `youtube_ad_creatives` populates and `forthepeople.com` has rows.
3. Phase 4b (separate spec): `get_youtube_competitors` RPC + wire the YouTube tab in `competitive-analysis.tsx` (firm-level ranking, national note).
</content>
