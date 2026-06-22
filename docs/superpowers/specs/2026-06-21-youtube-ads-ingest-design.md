# Competitive Analysis Phase 4a — YouTube video-ad ingest (design)

Date: 2026-06-21
Branch: `feat/youtube-ads-ingest`
Part of: Competitive Analysis program (Phase 1 Paid Search #428, Phase 2 SEO #429).
This spec covers **4a (the ingest only)**. The YouTube tab UI + RPC is **Phase 4b**, a separate spec, built once data has accrued.

## Goal

Stand up a daily pipeline that ingests PI-firm **YouTube / video ad creatives** from the Google Ads Transparency Center (via SearchApi) into a dedicated table, so a later phase can surface a firm-level YouTube competitive tab. This phase lands the data layer and lets it accrue; it ships no UI.

## Why a new ingest (not a UI wiring like SEO)

SEO Phase 2 was pure UI wiring because `serp_results_normalized` already had 59k rows. YouTube has no usable ingested data (`ad_observations_raw` holds 9 stale national video rows). The data **is** acquirable — SearchApi's `google_ads_transparency_center` engine returns rich per-creative video data — it just is not ingested yet. A probe confirmed yield is strong: `forthepeople.com` (Morgan & Morgan) returned 600 video creatives (US, last 30 days), each with creative id, advertiser, `first_shown`/`last_shown`, `total_days_shown`, and a creative link.

## Signal definition (approved)

The YouTube tab (Phase 4b) is **firm-level**: which PI firms run the most YouTube video advertising, by active-creative count, longest-running creative (`total_days_shown`), and recency. It is **not** case-type filtered — Transparency video creatives carry no keyword/case-type tag, so a case-type filter would be fabricated. National only (Transparency has no DMA dimension), consistent with the SEO tab.

## Data source (confirmed via live probe)

SearchApi REST: `https://www.searchapi.io/api/v1/search`, `engine=google_ads_transparency_center`.
Request params per call: `domain=<pi firm domain>`, `ad_format=video`, `region=US`, `time_period=last_30_days`, `num=100`, `api_key`.

Response shape (relevant fields), under `ad_creatives[]`:
- `id` — creative id, e.g. `CR03426478299763703809` (stable; the natural key)
- `target_domain` — e.g. `forthepeople.com`
- `advertiser.id` (e.g. `AR1409...`), `advertiser.name` (e.g. `Morgan & Morgan, P.A.`)
- `first_shown_datetime`, `last_shown_datetime` (ISO 8601 UTC)
- `total_days_shown` (int)
- `format` (`video`)
- `details_link` (URL to the creative in Transparency Center)

Top level: `search_information.total_results` (true count even when `num` truncates the list), `pagination.next_page_token`.

## Architecture

### 1. New table `youtube_ad_creatives` (migration)

Dedicated table, matching the per-channel pattern (Paid Search → `pi_search_observations`, SEO → `serp_results_normalized`). Do NOT use `ad_observations_raw` — its `(source, source_id)` unique index is **partial** (`WHERE source_id IS NOT NULL`), which PostgREST cannot reference for `on_conflict` upserts (42P10), and it is a shared table consumed by other RPCs.

Columns:

| column | type | notes |
|---|---|---|
| `id` | uuid PK default gen_random_uuid() | |
| `creative_id` | text NOT NULL | Transparency creative id; **UNIQUE** |
| `advertiser_domain` | text NOT NULL | the queried domain (the firm identity for 4b) |
| `advertiser_name` | text | from `advertiser.name`, nullable |
| `advertiser_ar_id` | text | Google advertiser id `AR...`, nullable |
| `advertiser_id` | uuid | FK → `advertiser_entities(id)`, nullable (best-effort `DomainMapper` match) |
| `target_domain` | text | from creative, nullable |
| `ad_format` | text NOT NULL default 'video' | |
| `first_shown` | date | from `first_shown_datetime`, nullable |
| `last_shown` | date | from `last_shown_datetime`, nullable |
| `total_days_shown` | integer | nullable |
| `details_link` | text | nullable |
| `region` | text NOT NULL default 'US' | |
| `raw_json` | jsonb | full creative object |
| `first_ingested_at` | timestamptz NOT NULL default now() | |
| `updated_at` | timestamptz NOT NULL default now() | refreshed on upsert |

Constraints / indexes:
- `UNIQUE (creative_id)` — a real (non-partial) unique constraint, so `on_conflict=creative_id` upserts work.
- index on `advertiser_domain`
- index on `last_shown DESC`

RLS (mirror serp tables exactly):
- enable RLS; policy `*_service_role` `FOR ALL USING (auth.role() = 'service_role')`; policy `*_anon_read` `FOR SELECT USING (true)`.

`updated_at` trigger: reuse `public.set_updated_at()` via `BEFORE UPDATE` (same as `serp_visibility_scores`).

Migration filename: fresh `20260621*`-or-later timestamp; run `ls supabase/migrations/ | grep ^<ts>` first (CLAUDE.md §11). Applied on merge, not via MCP.

### 2. New pipeline `pipeline/pipelines/youtube_ads_daily.py`

Mirror `google_ads_daily.py` structure: argparse `--dry-run`, `PipelineRun("youtube_ads_daily", trigger=...)`, steps `fetch_raw` → `publish`. Imports from `lib.pipeline` (`PipelineRun`, `DRY_RUN`, `_get`, `_bulk_insert`, `_dedup_rows`, `SUPABASE_URL`, `_headers`), `lib.api_usage.log_api_call`, `lib.api_pricing.get_searchapi_pricing`, `lib.domain_mapper.DomainMapper`.

Constants: `SEARCHAPI_BASE`, `REQUEST_DELAY_SECONDS = 1.5`, `MAX_RETRIES = 3`, `SEARCH_TIME_PERIOD = "last_30_days"`, `NUM_PER_DOMAIN = 100`.

`step_fetch_raw`:
1. Load seed domains: `SELECT DISTINCT advertiser_domain FROM pi_search_observations` via `_get("pi_search_observations", {"select": "advertiser_domain"})`, dedup in Python, drop empties. (490 domains today.)
2. Load `advertiser_entities` (`id,canonical_name,website,aliases`) and build a `DomainMapper`.
3. If `SEARCHAPI_API_KEY` unset: build seed rows for a couple of fixture domains (so dry-run/local works without the key), `_bulk_insert(... skip_existing=True)`, return. (Match the seed-data fallback shape used by `google_ads_daily._generate_seed_ads`.)
4. Otherwise, for each domain: call `_searchapi_transparency(domain)` (engine `google_ads_transparency_center`, params above; 429 backoff + retry like `_searchapi_google`); log via `_log_searchapi_call("google_ads_transparency_center", domain)`; parse `ad_creatives[]` into rows via `_creatives_to_rows(creatives, domain, domain_mapper)`; `time.sleep(REQUEST_DELAY_SECONDS)`. Wrap each domain in try/except so one failure doesn't abort the run (collect `failed_domains`).
5. Dedup rows on `("creative_id",)`; upsert: `_bulk_insert("youtube_ad_creatives", rows, on_conflict="creative_id", resolution="merge-duplicates")`. Set step metadata: domains_queried, domains_with_ads, total_creatives, failed_domains (cap list at 50), unmatched advertiser count.

`_creatives_to_rows(creatives, domain, mapper)`: for each creative, map fields → table columns. `advertiser_id = mapper.match_with_name_fallback(domain, creative["advertiser"].get("name",""))`. `first_shown`/`last_shown` = date portion of the `*_datetime` (parse ISO, `.date().isoformat()`, guard missing). `raw_json = json.dumps(creative, default=str)`. Skip creatives with no `id`.

`step_publish`: count rows in `youtube_ad_creatives` (HEAD count like `google_ads_daily.supabase_count`); set counts/metadata; honor `DRY_RUN`.

### 3. Workflow `.github/workflows/youtube-ads-daily.yml`

Mirror `google-ads-daily.yml`: daily cron (pick a UTC slot not already crowded — propose `0 13 * * *`), `workflow_dispatch` with a `dry_run` boolean input, `timeout-minutes: 60`, runs `python -m pipelines.youtube_ads_daily` from `pipeline/`, env `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SEARCHAPI_API_KEY`, `PIPELINE_TRIGGER`. Add the row to CLAUDE.md §8 inventory.

### 4. Tests `pipeline/tests/test_youtube_ads_daily.py`

pytest with a mocked SearchApi response (a small fixture mirroring the probe: 2 creatives). Assert `_creatives_to_rows` produces rows with correct `creative_id`, `advertiser_domain`, `first_shown`/`last_shown` (date-only), `total_days_shown`, `ad_format='video'`, and that a creative missing `id` is skipped. Mock `httpx` so no live call. No DB writes (DRY_RUN). Follows the existing `pipeline/tests` mock pattern.

## Cost / scale

~490 domains × 1 call × (~0.76s request + 1.5s delay) ≈ ~18 min/run; comfortably inside a 60-min workflow timeout. Most small firms return 0 video creatives (fast). SearchApi usage logged per call via the existing `api_usage_log` tracker.

## Known limitations (documented, not defects)

- **National only** — Transparency has no DMA/geo dimension. The 4b tab will be national, like SEO.
- **`num=100` per domain** caps mega-advertisers (Morgan & Morgan: 600). Firm ranking stays valid ordinally for ~all firms. Note: `search_information.total_results` (the true per-firm count) is **not** stored — `raw_json` holds only the per-creative object, not the response envelope. Capturing true totals (a `total_results` column or stashing the envelope) and/or raising the cap / paginating is a 4b-or-later refinement.
- **Seed = paid-search advertisers** (`pi_search_observations`). A YouTube-only brand advertiser not in paid search would be missed; unioning more domain sources is a later expansion.
- **`last_shown` freshness** is handled by the daily merge-duplicates upsert (re-fetch updates the row).

## Out of scope (→ Phase 4b)

- The `get_youtube_competitors` RPC and the YouTube tab in `competitive-analysis.tsx`.
- Pagination beyond the first 100 creatives/domain.
- Unioning additional advertiser-domain sources.

## Definition of done

- Migration applies cleanly (no timestamp collision).
- `pytest tests/test_youtube_ads_daily.py` green; full pipeline suite still green.
- `python -m pipelines.youtube_ads_daily --dry-run` runs end-to-end locally (seed-data path when no API key; or a real key) without writing in dry-run.
- Workflow YAML valid; CLAUDE.md §8 updated.
- One PR. After merge, a manual `workflow_dispatch` (real run) confirms `youtube_ad_creatives` populates (spot-check Morgan & Morgan / forthepeople.com rows). Browser verification is N/A for this phase (no UI).
</content>
