# Competitive Analysis Phase 5a — Meta ad ingest (design)

Date: 2026-06-22
Branch: `feat/meta-ads-ingest`
Part of: Competitive Analysis program (Paid Search #428, SEO #429, YouTube 4a #430 / 4b #432).
This spec covers **5a (the ingest + TikTok→Meta tab swap)**. The real Meta panel + RPC is **Phase 5b**, a separate spec, built once data has accrued.

## Goal

Replace the TikTok channel (no US ad library — permanently out) with **Meta** on the v2 State Intelligence "Competitive Analysis" surface, and stand up the data layer for it: a daily pipeline that ingests PI-firm Meta/Facebook+Instagram ads from the Meta Ad Library (via SearchApi) into a dedicated table. This phase lands the data + a placeholder tab; it ships no live Meta panel.

## Why a fresh ingest (existing Meta data is unusable for this)

`ad_observations_raw` already holds ~28k `meta_ad_library` rows, but they are unfit for the tab: **99.9% tagged to the New York DMA**, only **40 advertisers** (a mass-tort / lead-gen set: Lanier, Select Justice, Drugwatch, Sokolove…), pulled by the legacy `ad_intel_daily`. A real Meta tab needs a fresh, broad, PI-case-type ingest — same situation as YouTube 4a.

## Signal & geo model (settled in brainstorming)

- **Case-type-keyed, national** (the SEO model). Meta Ad Library search is keyword-based (`q`) and country-level (no DMA), so the 5b tab will have a **case-type dropdown** (like SEO), not a DMA filter.
- **Page-led identity.** Meta ads are attributed to a Facebook/Instagram `page_name` / `page_id` (the firm). That is the identity for the 5b ranking.

## Data source (confirmed via live probe)

SearchApi REST: `https://www.searchapi.io/api/v1/search`, `engine=meta_ad_library`.
Per call: `q=<keyword>`, `country=US`, `api_key`, plus `active_status=active` (request currently-running ads; `is_active` is also stored per-ad as a fallback filter for 5b). Default sort is impressions-high-to-low (biggest advertisers first — good for a capped top-set).

Response: `ads[]` (30/page), `pagination.next_page_token`, `search_information.total_results` (e.g. ~21,870 for "car accident lawyer" — yield is large). Relevant per-ad fields:
- `ad_archive_id` — unique ad id (the natural key)
- `page_id`, `page_name` — the advertiser (firm) identity
- `start_date`, `end_date` — ISO 8601 datetimes
- `is_active` — boolean
- `publisher_platform` — array, e.g. `["FACEBOOK","INSTAGRAM","AUDIENCE_NETWORK","MESSENGER"]`
- `collation_count` — count of similar ads grouped under this entry
- `snapshot` — creative detail (body, title, cta, images, videos, link_url, page_like_count, …)

## Architecture

### 1. New table `meta_ad_creatives` (migration `20260622030000`)

Dedicated table, matching the per-channel pattern (`pi_search_observations`, `serp_results_normalized`, `youtube_ad_creatives`). NOT `ad_observations_raw` (skewed legacy data + partial unique index).

| column | type | notes |
|---|---|---|
| `id` | uuid PK default gen_random_uuid() | |
| `ad_archive_id` | text NOT NULL | Meta ad id; **UNIQUE** (non-partial → clean upsert) |
| `page_id` | text | nullable |
| `page_name` | text | firm identity for 5b, nullable |
| `case_type` | text NOT NULL | slug: motor_vehicle / truck_accident / motorcycle / boating / nursing_home / workers_comp |
| `keyword` | text | the `q` that found it, nullable |
| `start_date` | date | from `start_date`, nullable |
| `end_date` | date | from `end_date`, nullable |
| `is_active` | boolean | nullable |
| `publisher_platforms` | text[] | from `publisher_platform`, nullable |
| `collation_count` | integer | nullable |
| `country` | text NOT NULL default 'US' | |
| `snapshot` | jsonb | creative detail, nullable |
| `raw_json` | jsonb | full ad object |
| `first_ingested_at` | timestamptz NOT NULL default now() | |
| `updated_at` | timestamptz NOT NULL default now() | trigger-refreshed |

Constraints / indexes:
- `CONSTRAINT meta_ad_creatives_ad_archive_id_key UNIQUE (ad_archive_id)` — real (non-partial) unique → `on_conflict` upsert target.
- index on `case_type`
- index on `page_id`

RLS (mirror serp/youtube tables): enable RLS; `*_service_role` `FOR ALL USING (auth.role() = 'service_role')`; `*_anon_read` `FOR SELECT USING (true)`.
`updated_at` trigger: reuse `public.set_updated_at()` (`BEFORE UPDATE`).

Migration filename: verify `ls supabase/migrations/ | grep ^20260622030000` is empty first (CLAUDE.md §11). Applies on merge, not via MCP.

If an ad surfaces under two case-type keywords, the `ad_archive_id` upsert keeps one row with the last-writer case_type — acceptable (PI keywords are case-type-distinct; cross-matches are negligible).

### 2. `pipeline_configs` seed (migration `20260622040000`)

`PipelineRun` hard-requires a `pipeline_configs` row per pipeline_name (the 4a lesson — without it every run raises "No pipeline_config found"). Seed `meta_ads_daily`, `source_domain='ad_intelligence'`, cron `0 14 * * *`, steps `fetch_raw` + `publish`, `ON CONFLICT (pipeline_name) DO NOTHING`. Mirror `20260622010000`.

### 3. New pipeline `pipeline/pipelines/meta_ads_daily.py`

Mirror `youtube_ads_daily.py` structure (PipelineRun, `_bulk_insert`, `_dedup_rows`, `log_api_call`, `get_searchapi_pricing`). No `DomainMapper` / no large-table reads (keywords are a constant), so no pagination-trap.

Constants: `SEARCHAPI_BASE`, `REQUEST_DELAY_SECONDS=1.5`, `MAX_RETRIES=3`, `COUNTRY="US"`, `MAX_PAGES_PER_KEYWORD=5` (≈150 top ads/keyword), and:

```python
META_SEARCH_TERMS = {
    "motor_vehicle":  ["car accident lawyer"],
    "truck_accident": ["truck accident lawyer"],
    "motorcycle":     ["motorcycle accident lawyer"],
    "boating":        ["boat accident lawyer"],
    "nursing_home":   ["nursing home abuse lawyer"],
    "workers_comp":   ["workers compensation lawyer"],
}
```

`step_fetch_raw`:
1. For each `case_type` → keyword: call `_searchapi_meta(keyword, page_token)` (`engine=meta_ad_library`, `q`, `country=US`, `active_status=active`, `api_key`; 429 backoff + retry like the youtube pipeline), paginating up to `MAX_PAGES_PER_KEYWORD` via `next_page_token`; `time.sleep(REQUEST_DELAY_SECONDS)` between calls. Log each call via `_log_searchapi_call("meta_ad_library", keyword)`.
2. Parse each ad via `_ads_to_rows(ads, case_type, keyword)` → table rows. Wrap each keyword in try/except so one failure doesn't abort (collect `failed_keywords`).
3. Dedup rows on `("ad_archive_id",)`; upsert `_bulk_insert("meta_ad_creatives", rows, on_conflict="ad_archive_id", resolution="merge-duplicates")`. Step metadata: keywords_queried, total_ads, distinct pages, failed_keywords.
4. No-API-key path: write a small seed fixture **only under DRY_RUN** (the 4a fix — never write seed rows to the live table outside dry-run); otherwise warn + no-op.

`_ads_to_rows(ads, case_type, keyword)`: skip ads with no `ad_archive_id`; map fields → columns; `start_date`/`end_date` via a `_date_part` helper (ISO → `YYYY-MM-DD`, null-safe); `publisher_platforms = ad.get("publisher_platform")` (array); `snapshot`/`raw_json = json.dumps(..., default=str)`.

`step_publish`: HEAD count of `meta_ad_creatives`; honor DRY_RUN.

### 4. Workflow `.github/workflows/meta-ads-daily.yml`

Mirror `youtube-ads-daily.yml`: daily cron `0 14 * * *` (free slot), `workflow_dispatch` with `dry_run`, `timeout-minutes: 60`, runs `python -m pipelines.meta_ads_daily`, env `SUPABASE_URL`/`SUPABASE_SERVICE_KEY`/`SEARCHAPI_API_KEY`/`PIPELINE_TRIGGER`. Add the row to CLAUDE.md §8.

### 5. Component swap in `competitive-analysis.tsx`

- `ChannelKey`: remove `"tiktok"`, add `"meta"`.
- `CHANNEL_TABS`: remove the TikTok entry; add `{ key: "meta", label: "Meta", disabled: true, badge: "Soon" }` in its slot (between `youtube` and `traditional`).
- Panel rendering: remove the `activeChannel === "tiktok"` branch (TikTok can no longer be active). Meta is `disabled`, so it never renders a panel — no Meta panel branch this phase (that's 5b). The header comment's TikTok line updates to note Meta replaced it.

## Out of scope (→ Phase 5b)

- `get_meta_competitors` RPC + the live Meta panel (case-type dropdown, firm ranking, "view ads" link to the Meta Ad Library page) + browser-verify.
- Raising the per-keyword page cap; advertiser-entity mapping.

## Testing / definition of done

- Both migrations apply cleanly (no timestamp collision).
- `pytest tests/test_meta_ads_daily.py` green (`_ads_to_rows`: field mapping, date handling, missing-id skip, `.ads` envelope key); full pipeline suite green.
- `python -m pipelines.meta_ads_daily --dry-run` loads + runs the no-key seed path without writing (DRY_RUN); the `pipeline_configs` row makes a real run possible post-merge.
- `competitive-analysis.tsx`: `npm run build` + `tsc` green (only the changed file clean vs baseline); TikTok tab gone, Meta "Soon" tab present.
- Workflow YAML valid; CLAUDE.md §8 updated.
- One PR. Post-merge: manual `workflow_dispatch` (real run) confirms `meta_ad_creatives` populates (spot-check a known PI firm page). No live Meta panel to browser-verify this phase (the tab is a disabled placeholder).

## Known limitations (documented, not defects)

- **National only** — Meta Ad Library has no DMA dimension for organic ad search; the 5b tab is national, like SEO/YouTube.
- **`MAX_PAGES_PER_KEYWORD=5`** caps each case type at ~150 top ads (by impressions). Ranking stays valid ordinally; raise the cap later if needed.
- **One keyword per case type** to start; add more later if coverage looks thin.
