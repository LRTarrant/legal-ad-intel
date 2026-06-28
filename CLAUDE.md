# CLAUDE.md — Legal Marketing Intelligence

You are Claude Code working in the Legal Marketing Intelligence (LMI) repo.

Your job: be a **careful, high-quality coder and primary orchestrator**. Follow the rules below every session. Future Claude sessions should be able to start work without re-walking the codebase — if something in here is wrong or out of date, fix it as part of the PR you're working on.

---

## 0. Session start

At the start of any session working in this repo, read these three files in order:

1. `CLAUDE.md` (this file) — orchestration rules, repo map, env vars, GH Actions inventory.
2. `memory.md` — recent PRs, dataset lessons, key decisions, open questions. Updated as work ships.
3. `CURRENT_PRIORITIES.md` — what's actively in play this week.

Acknowledge briefly (one line, e.g. "Loaded CLAUDE.md, memory.md, CURRENT_PRIORITIES — caught up on [X]") and then address the request.

**Maintain `memory.md`** when a PR ships that changes architecture/schema/pipelines, a dataset shape lesson is learned, a decision affects future work, or a blocker is identified. See the file's own header for entry rules.

---

## Deployment Workflow

After implementing features, always: (1) run build and lint, (2) verify changes via Playwright/browser when UI-related, (3) open a PR, and (4) update memory.md and CURRENT_PRIORITIES docs.

---

## Database Migrations

When writing migrations, always order operations safely: drop/alter CHECK constraints BEFORE running UPDATE statements, and confirm migrations against CI before merging.

---

## Memory Files

Treat memory.md and status/priority files on disk as the source of truth; do not assume they are auto-updated by external tooling—flag staleness and update them explicitly at the end of each session.

---

## Environment Notes

Avoid spaces in project folder paths (breaks Next.js dev/build) and verify the target model/API is available online before scaffolding notebooks or pipelines.

---

## 1. Project overview

- LMI is a legal advertising intelligence SaaS for U.S. plaintiff firms and their agencies.
- It turns ad activity + injury/litigation/public data into practical campaign plans, intelligence surfaces, and dashboards.
- Every feature should expose unique, layered data signals that change a marketing or case-acquisition decision. Don't ship generic "ad spy" or AI ad-generator surfaces.
- Primary audiences: media sellers (Entravision, iHeart, NBCU), legal-focused ad agencies, and plaintiff / mass-tort firms.
- See `PROJECT_BRIEF.md` for audience deep-dives and pricing direction; `CURRENT_PRIORITIES.md` for what's actively in play this week.

---

## 2. Coding principles

1. **Small, safe changes first.** Prefer minimal diffs. If a refactor seems necessary, describe it first and wait for confirmation.
2. **Be explicit about schema and migrations.** Call out any DB or RLS changes. Propose SQL migrations under `supabase/migrations/`; assume the user applies them (the `supabase-migrations.yml` workflow also auto-applies on push to main).
3. **Match existing patterns.** Follow existing file/module layout and naming. Don't introduce new frameworks or paradigms unnecessarily.
4. **Types and tests.** Maintain or improve TypeScript safety. Update or add tests when touching core logic. `pr-typecheck.yml` only fails on **net-new** TS errors vs main — there's a known baseline of pre-existing errors that needs its own cleanup PR; don't add to it.
5. **Respect RLS, privacy, and ToS.** Server-only secrets must stay server-side (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, etc.). Don't bypass RLS in client code.
6. **Heed `web/AGENTS.md`.** It warns "this is NOT the Next.js you know" — Next 16 + React 19 have breaking API changes. Read `node_modules/next/dist/docs/` before writing code that touches routing, server components, or data fetching.
7. **Browser-verify frontend / API-surface changes against a DEPLOYED environment.** A passing build + a green local run is **not** done for anything users load in a browser. Some bugs are invisible locally and only surface in the Vercel serverless runtime — e.g. PR #404, where the GA Data API's default gRPC transport worked on local Node but 502'd in production (`"undefined undefined: undefined"`); the fix was `fallback: true` for REST. So after a frontend/API change deploys, drive the **production** page with the chrome-devtools MCP and confirm: (a) the page's own API/data calls return 2xx (`list_network_requests`; read any non-2xx body), (b) no console errors (`list_console_messages`), (c) real data renders (not empty / zero / "No data"), (d) capture a snapshot or screenshot. Auth: the MCP browser uses a **persistent profile** that stays logged in across sessions — sign in once with the dedicated QA admin account (created via `web/scripts/create-test-admin.mjs`; creds live in `web/.env.local` as `LMI_TEST_ADMIN_EMAIL` / `LMI_TEST_ADMIN_PASSWORD`). The built-in `verify` and `run` skills wrap this flow.

---

## 3. Task boundaries

You **should**:
- Implement/modify features that touch ~1–10 files.
- Fix bugs, improve type-safety, and wire UI to existing data.
- Draft or modify Python pipelines under `pipeline/pipelines/` and GitHub Actions YAML when asked.
- Propose tests and basic observability when useful.

You **should not**:
- Attempt repo-wide refactors without explicit instruction.
- Change deployment/CI settings unless asked.
- Invent new external APIs or providers without user approval.
- Fabricate datasets or signals not grounded in real sources.

**Safety / review:**
- Start big changes with a 3–6 bullet plan before dumping a diff.
- Call out risky changes (schema, RLS, auth, pricing/entitlements).
- If requirements are ambiguous, ask for clarification.
- Respect any "DO NOT TOUCH" or "experimental" notes in the codebase.

---

## 4. Tech stack

- **Frontend:** Next.js 16 (App Router) + React 19, TypeScript, Tailwind 4, deployed on Vercel. See `web/AGENTS.md`.
- **Backend / API:** Next.js API routes in `web/app/api/`; server-side ffmpeg-static for video rendering; `@napi-rs/canvas` for image generation.
- **Database / Auth:** Supabase Postgres with row-level security; auth via `@supabase/ssr`.
- **Data / ETL:**
  - `pipeline/` — packaged Python 3.12 ETL system. Shared `pipeline/lib/pipeline.py` provides `PipelineRun`, `_bulk_insert` (with chunking + 5xx retry), `_get`, etc. New pipelines go here.
  - `scripts/` — older one-shot Python loaders and a few TypeScript codegen scripts (`sync-fars-data.ts`, `upload-tort-images.ts`). Treat as legacy unless explicitly extended.
- **Automation:** GitHub Actions (17 workflows) integrated with Searchapi.io, OpenAI, Apify, ElevenLabs, openFDA, CourtListener, NOAA. Supabase cron (pg_cron) is used inside some RPCs for refreshable aggregates.

### Common commands

Frontend (run from `web/`):
```bash
npm install
npm run dev            # next dev
npm run build          # runs prebuild check + next build
npm run lint           # eslint
npx tsc --noEmit       # type-check (CI compares net-new errors vs main)
```

Pipelines (run from `pipeline/`):
```bash
pip install -r requirements.txt
# Run a single pipeline (every pipeline supports --dry-run):
python -m pipelines.openfda_device_recalls --dry-run
python -m pipelines.recall_thermometer --dry-run
python -m pipelines.ad_intel_daily --dry-run
# Tests (pytest, mocks; no live API calls):
pytest tests/
```

Supabase:
```bash
# Regenerate the frontend types file after schema changes:
supabase gen types typescript --linked --schema public > web/lib/database.types.ts
# Apply pending migrations to the linked project (CI does this automatically on push to main via supabase-migrations.yml):
supabase db push
# Refresh docs/schema.md from the live DB:
supabase db pull
```

Required local env vars: see `web/.env.example` and section 7 below.

---

## 5. Repo layout

```
legal-ad-intel/
├── CLAUDE.md                # this file
├── PROJECT_BRIEF.md         # product overview + audiences + pricing
├── CURRENT_PRIORITIES.md    # active work, updated weekly
├── README.md
├── docs/                    # data-sources, roadmap, schema, state-onboarding, recalls/*
├── web/                     # Next.js 16 frontend + API routes
│   ├── app/(app)/           # authenticated app shell (sidebar + pages)
│   ├── app/api/             # API routes
│   ├── lib/                 # supabase client, queries, campaign-builder, services
│   ├── components/state-intelligence/
│   ├── scripts/             # check-tort-profile-registry (prebuild)
│   └── AGENTS.md            # Next.js 16 warning — read before touching frontend
├── pipeline/                # packaged Python ETL (new pipelines go here)
│   ├── lib/pipeline.py      # PipelineRun, _bulk_insert (chunk+retry), _get, _post
│   ├── pipelines/           # one module per pipeline (callable via `python -m`)
│   ├── tests/               # pytest, mocked
│   ├── seeds/               # manufacturer_allow_list.csv, manufacturer_tort_map.csv
│   └── scripts/             # ad-hoc validation / cleanup scripts
├── scripts/                 # legacy one-shot Python + TS loaders
├── supabase/
│   ├── config.toml
│   └── migrations/          # 189 SQL migrations (version-controlled source of truth)
├── .github/workflows/       # 17 GH Actions (see section 8)
└── .mcp.json                # MCP server configs
```

---

## 6. Feature map

Each surface lists: frontend · API · pipeline · workflow + schedule · Supabase tables · external APIs · env vars.

### 6.1 Recall Watchlist (pre-MDL early-warning board)
- **Frontend:** `web/app/(app)/advertising/recall-watchlist/page.tsx` (server) → `recall-watchlist-client.tsx`; manufacturer drilldown at `[slug]/page.tsx` + `manufacturer-detail-client.tsx`.
- **API:** none — reads `recalls` directly via Supabase server client with paginated `range()` to bypass the 1k PostgREST cap.
- **Pipelines:** `pipeline/pipelines/openfda_device_recalls.py` (fetch + class join + manufacturer normalize), `courtlistener_recall_cases.py` (case search), `courtlistener_recall_case_parties.py` (party enrichment), `recall_thermometer.py` (Five-Stage scoring).
- **Workflow:** `.github/workflows/recall-watchlist-weekly.yml` — Mondays 12:00 UTC, four sequential jobs: `openfda-recalls` (60min, continue-on-error) → `courtlistener-search` (90min) → `parties-enrichment` (240min, skip on dry-run) → `thermometer-score` (30min, skip on dry-run).
- **Supabase tables:** `recalls`, `recall_manufacturers`, `recall_cases`, `recall_stage_history`, `recall_specialty_firms`, `manufacturer_tort_map`, `recall_manufacturer_allow_list`, plus shared `pipeline_runs` / `pipeline_run_steps`.
- **External APIs:** `https://api.fda.gov/device/recall.json`, `https://api.fda.gov/device/enforcement.json` (severity join on `recall_number = product_res_number`), `https://www.courtlistener.com/api/rest/v4` (party search).
- **Env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `OPENFDA_API_KEY` (optional but raises rate limit), `COURTLISTENER_API_TOKEN`, `RECALLS_UPSERT_CHUNK_SIZE` (override).

### 6.2 Ad Intel Daily (advertiser/ad event ingest)
- **Frontend:** drives `advertising/*` surfaces (advertisers, saturation, channel-planner, cost-benchmarks, creatives, exposure, search-visibility, trends, markets), competitors, opportunity.
- **Pipeline:** `pipeline/pipelines/ad_intel_daily.py`.
- **Workflow:** `ad-intel-daily.yml` — daily 11:00 UTC (30min timeout).
- **Supabase tables:** `ad_events` (core fact), `advertiser_entities`, `ad_aggregates_*`, `firms` / `advertiser_firms`, plus market/tort dimensions.
- **External APIs:** Searchapi.io, Apify.
- **Env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SEARCHAPI_API_KEY`, `APIFY_TOKEN`.

### 6.3 Google Ads / TikTok Ads / Google Trends / SERP / PI Search (daily)
- **Frontend:** `advertising/{trends, search-visibility, cost-benchmarks, channel-planner}`, plus `pi-geo-targeting`.
- **Pipelines:** `google_ads_daily.py`, `tiktok_ads_daily.py`, `google_trends_daily.py`, `serp_intel_daily.py`, `pi_search_daily.py`, `advertiser_rematch_daily.py`.
- **Workflows:** `google-ads-daily.yml` (11:30 UTC), `tiktok-ads-daily.yml` (14:30 UTC), `google-trends-daily.yml` (08:00 UTC), `serp-intel-daily.yml` (12:00 UTC), `pi-search-daily.yml` (12:00 UTC), `advertiser-rematch-daily.yml` (16:00 UTC — runs after the ingest pipelines so new `advertiser_entities` are available).
- **Supabase tables:** `serp_*`, `google_trends_*`, `tiktok_*`, `pi_search_*`, `geo_targets`, `advertiser_entities`, `meta_ad_library_source`.
- **External APIs:** Google Ads / Search APIs (via Searchapi.io), TikTok CCL, Apify.
- **Env vars:** `SEARCHAPI_API_KEY`, `APIFY_TOKEN`, `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, plus shared Supabase vars.

### 6.4 MDL Tracker
- **Frontend:** `web/app/(app)/mdl-tracker/` — index, `[mdl_number]/`, custom Lyft / Uber sexual-assault surfaces, JPML snapshot tables/donut.
- **API:** none direct — server components query Supabase.
- **Pipelines:** `jpml_monthly.py` (monthly report scrape + snapshot), `courtlistener_attorneys.py` (daily attorney refresh), `courtlistener_mdl_attorneys.py` (manual / per-MDL deep enrichment).
- **Workflows:** `jpml-monthly.yml` (daily 2nd–5th of month, idempotent), `courtlistener-attorneys.yml` (daily 14:00 UTC), `courtlistener-mdl-attorneys.yml` (manual-only, 6h timeout).
- **Supabase tables:** `mdls`, `mdl_stats_monthly`, `mdl_jpml_snapshots`, `dockets`, `docket_events`, `mdl_developments`, plus attorney / firm tables.
- **External APIs:** JPML public reports, CourtListener `/api/rest/v4`.
- **Env vars:** `COURTLISTENER_API_TOKEN`, shared Supabase vars.

### 6.5 Mass-tort / PI surfaces (per-tort pages)
- **Frontend:** `web/app/(app)/advertising/{afff-firefighting-foam, ai-suicide, bair-hugger, bard-powerport, depo-provera, dupixent, glp1-gastroparesis, glp1-vision-loss, hair-relaxer, olympus-scopes, paraquat, pfas-contamination, roblox-abuse, roundup, social-media-addiction, talcum-powder}/`, plus `pi-viability/`, `judicial-profiles/`, `cancer-incidence/`, `construction/`.
- **Adding a new tort page requires registration in THREE places** (the prebuild guard only checks the second one — the others fail silently if missed): (1) `web/app/(app)/sidebar.tsx` — add to `EMERGING_TORTS` (pre-MDL) or `ACTIVE_MDLS` (alphabetized); (2) `web/app/(app)/mass-tort-overview/page.tsx` — `PRE_MDL_TORTS` or `MDL_TORT_NAMES`; (3) `mass_torts` table — migration with `has_advertising_page=true`. Plus a `torts` row for the ad pipeline keying.
- **API:** per-tort pages use Supabase server queries; some pull from `web/lib/data/` static fixtures during scaffolding.
- **Pipelines:** `ingest_google_news_legal.py` (general + tort_backfill buckets), `ingest_rss_developments.py`, `load_cancer_incidence.py`, plus PI viability seeds.
- **Workflows:** `ingest-google-news.yml` (11:30 UTC daily; tort_backfill Mondays 05:00 UTC), `ingest-rss.yml` (12:00 UTC daily).
- **Supabase tables:** `mass_torts`, `tort_recommended_markets`, `tort_traction`, `pi_viability_*`, `cancer_incidence_*`, `mdl_developments`, `manufacturer_tort_map`.
- **External APIs:** Google News, RSS feeds.
- **Env vars:** shared Supabase vars; OpenAI for content classification.

### 6.6 State Intelligence (per-state PI surfaces)
- **Frontend:** `web/app/(app)/state-intelligence/{alabama,arizona,california,florida,georgia,tennessee}/` (legacy) plus `state-intelligence/v2/{colorado,illinois,...,wisconsin}/` (newer shared shell).
- **Scaffolding:** `python scripts/onboard_state.py <slug> --abbr XX --display-name "..." [--dmas scripts/dma_configs/<slug>.json] [--has-injury-data]` — generates page + client + data stub + sidebar registration + DMA migration. See `docs/state-onboarding.md`.
- **Pipelines / loaders:** `scripts/load_fars.py`, `scripts/load_fars_vehicles.py`, `scripts/load_storm_events.py`, `scripts/load_boating.py`, `scripts/load_cancer_incidence.py`, `scripts/load_judicial.py`, `scripts/load_mdl.py`, `scripts/parse_state_injury_pdf.py`, `scripts/sync-fars-data.ts` (codegen: Supabase → state-config TS files).
- **Workflows:** `load-storm-events.yml` (monthly, 5th @ 06:00 UTC).
- **Supabase tables:** `state_crash_statistics` (with `is_preliminary`), `state_data_sources`, `state_rollout`, `tort_traction`, `fatalities`, `storms`, `boating_*`, `construction_*`, `cancer_incidence`, `geo_targets`, `dma_markets`.
- **Env vars:** shared Supabase vars; NOAA / FARS data is downloaded direct (no key).

### 6.7 Campaign Builder (PI flow)
- **Frontend:** `web/app/(app)/campaigns/builder/` (multi-step wizard) and `campaigns/` (saved list).
- **API:** `web/app/api/campaigns/*` — `generate-creative`, `generate-pi-{strategic-brief,google-rsa,meta-ad,radio-script,radio-spot,scene-image,video-script}`, `generate-{landing-page,radio-script,radio-spot,video-script,voiceover}`, `voices`, `voices/check`, `render-video`, `recommended-markets`, `save`, `plan`, `list`, `ai-insights`, `[id]/...`. Also `campaign-builder/`, `cpa-estimate/`, `pi/geo-targeting/`, `dma-markets/`, `channel-fit/`, `tort-images/`, `tenant-branding/`.
- **Pipelines:** none — runtime AI generation only.
- **Workflows:** none (runtime only).
- **Supabase tables:** `campaigns`, `campaign_assets` (storage bucket), `tort_images`, `tort_recommended_markets`, `dma_markets`, `geo_targets`, `firms`, `pronunciation_dictionary`, `generation_costs`.
- **External APIs:** OpenAI (`gpt-*`, images), Google Vertex AI (Gemini), ElevenLabs (TTS), Resend (email).
- **Env vars:** `OPENAI_API_KEY`, `GOOGLE_VERTEX_API_KEY`, `GOOGLE_CLOUD_PROJECT` / `GOOGLE_CLOUD_PROJECT_ID`, `ELEVENLABS_API_KEY`, `RESEND_API_KEY`, `TORT_IMAGE_LIBRARY_MIN_COUNT`.

### 6.8 Broadcast Intel
- **Frontend:** `web/app/(app)/broadcast-intel/`.
- **API:** `web/app/api/broadcast/{market-intel,media-outlets,stations,sync}/`.
- **Pipelines:** none scheduled — `sync` route handles ingest on-demand.
- **Supabase tables:** `broadcast_stations`, `broadcast_market_intel`, related media-outlet tables.
- **Env vars:** shared Supabase vars.

### 6.9 Admin + Auth + Subscriptions
- **Frontend:** `web/app/(app)/admin/{users,tort-images,rollout,torts,data-sources}/`, plus `settings/`, `invite/`, `login/`, `forgot-password/`, `reset-password/`, `pricing/`.
- **API:** `web/app/api/{admin,invites,firms,subscription,tenant-branding,activity,alerts,ask-ai,courtlistener/sync-attorneys}/`.
- **Auth flow:** Supabase SSR via `web/middleware.ts`; tenant context via `web/contexts/TenantContext`. Roles checked from `profiles.role` via the central helpers in **`web/lib/roles.ts`** (`isAdmin`, `canManageUsers`, `hasUnlimitedAccess`, `roleLabel`, `invitableRoles`, `canRemoveUser`) — prefer these over inline string checks. Tenant hierarchy is **Admin (`tenant_admin`) > Manager (`manager`) > User (`user`)**, with `super_admin` above all (LMI system-wide). `user` is the trial/standard tier (renamed from the legacy `member` in migration `20260604000000`); Managers can invite/remove Users + view the roster only (no billing/branding/other admin surfaces) and, like Admins, bypass the trial gate. The OAuth callback (`web/app/auth/callback/route.ts`) creates new Google users as `user`. **Invite-link base URL** is built by `tenantBaseUrl()` in `web/lib/tenant.ts` (custom domain → `{slug}.legalmarketingintelligence.com` subdomain → apex) so invites from a branded subdomain land on that subdomain — do **not** reintroduce the old `NEXT_PUBLIC_APP_URL`-only fallback.
- **Supabase tables:** `profiles`, `firms`, `firm_managers`, `subscriptions`, `invitations`, `tenant_branding`, `activity_log`, `alerts`, `pipeline_runs`. The invitation table is `invitations` (not `invites` — that's only the API route folder name); it is tenant-scoped via `tenant_id` → `tenants` (there is no `firm_id`), and has **no `status` column** — pending/accepted/expired is computed in the `GET /api/invites` handler from `accepted_at` + `expires_at`. A partial unique index `idx_invitations_unique_pending (tenant_id, email) WHERE accepted_at IS NULL` allows one open invite per address; resends UPDATE that row in place. Schema-of-record: migration `20260522000001_document_invitations_schema.sql` (the original `20260418165323_create_invitations_table.sql` is a placeholder — see §11; the schema-of-record file was originally timestamped `20260521000000` but was renamed to clear a duplicate-version collision with the GLP-1 FAERS migration that landed first). Migration `20260604000000_add_manager_role_and_rename_member_to_user.sql` renamed `member`→`user` (folding legacy `viewer`→`user`) and widened **both** role CHECKs: `invitations.role` from `('member','tenant_admin')` to `('user','manager','tenant_admin')`, and `profiles.role` from `('super_admin','tenant_admin','member','viewer')` to `('super_admin','tenant_admin','manager','user')`. **Both tables carry a `*_role_check` CHECK** (the `profiles` one is not visible in `database.types.ts`, which types `role` as plain `string`) — so the migration drops each CHECK *before* the rename UPDATE and re-adds the widened CHECK *after* (updating to `'user'` first violates the old constraint). It also set both role defaults to `'user'`, fixed `is_tenant_admin()` (it wrongly checked `'admin'`), and added `is_tenant_manager()`.
- **External APIs:** Resend (transactional email), GA4 (analytics — see Known Issues).
- **Env vars:** `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`, `ALERT_CHECK_SECRET` (cron secret for `/api/alerts/check`), `NEXT_PUBLIC_GA_MEASUREMENT_ID`.

### 6.10 FAERS Adverse Event Reports (drug safety signal)
Phase 2/3 of the CPSC → FAERS → MAUDE arc. Schema landed in PR-2; PR-3 (this entry) ships the pipeline + normalization tables + weekly workflow. PR-4 / PR-5 build API + UI.
- **Frontend:** TBD in PR-4 / PR-5.
- **API:** TBD in PR-5.
- **Pipeline:** `pipeline/pipelines/faers_weekly.py` — streams openFDA `/drug/event.json` (with `serious:1` filter only — see source-filter note below) via the shared `openfda_client` (PR-1 / #380) using `search_after` cursor pagination with a compound `receivedate,safetyreportid` cursor (the single-field cursor collides on FAERS' high-volume dates; PR-3 extended `openfda_client.paginate_search_after` to accept a `compound_cursor_extractor`). Normalizes drugs through an NDC → UNII → RxCUI → application_number → name match-fallback chain into the `drugs` dim; observes MedDRA PTs into `meddra_terms`; counts `drug_manufacturer_aliases` misses for analyst review. Lawyer-flood (`primarysource_qualification = 4`) is preserved on every row — filtering happens at query time in PR-4/5, not at ingest.
- **Workflow:** `.github/workflows/faers-weekly.yml` — Mondays 03:00 UTC (steady-state rolling 7-day window catches stragglers around quarterly openFDA refreshes). Manual `workflow_dispatch` accepts `dry_run` + `backfill_since` + `year` inputs (dispatch shape matches `cpsc-recalls-weekly.yml`). Recommended one-shot backfill: `backfill_since=2024-01-01` (~1.6M serious records, ~80min wall with the API key). 240min timeout covers the 2-year backfill scenario.
- **Supabase tables:** `drug_adverse_events` (parent fact — one row per `safetyreportid`, upsert on the natural key), `drug_adverse_event_drugs` (child — one row per drug per report; preserves `openfda_*` enrichment arrays plus a normalized `drug_id` FK to `drugs`), `drug_adverse_event_reactions` (child — one row per MedDRA PT per report), `drugs` (dimension — keyed by `unique_match_key` with `ndc:` / `unii:` / `rxcui:` / `appno:` / `name:` prefix recording the match path), `meddra_terms` (PT dimension), `drug_manufacturer_aliases` (curated alias → canonical lookup, mirrors `cpsc_manufacturer_aliases` shape).
- **External APIs:** openFDA `https://api.fda.gov/drug/event.json` (FAERS adverse-event reports).
- **Env vars:** `OPENFDA_API_KEY` (raises rate limit from 1k/day → 120k/day, required for backfill), `OPENFDA_BASE_URL` (AEMS-migration adapter, see §7), `FAERS_BATCH_FLUSH_SIZE` (optional, default 500), shared Supabase vars (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`).
- **Source-filter note:** Pipeline ingests `serious:1` reports only (~50% of FAERS volume per faers.md §4). A future operator who wants research-grade data (e.g. ROR/PRR disproportionality computation that needs a non-suspect denominator) must drop the filter in `pipelines/faers_weekly.py:SEARCH_SEVERITY` and re-budget storage. Documented in both the migration header and the pipeline docstring.
- **Design notes:** Schema preserves `drug_adverse_events.primarysource_qualification` (smallint, CHECK 1..5) so PR-4 / PR-5 surfaces can filter out lawyer-sourced reports (`qualification = 4`), which are mass-tort solicitation artifacts rather than organic safety signal. Filter enforcement intentionally lives in queries, not the pipeline — PR-3 preserves the value, PR-4/5 surfaces apply `WHERE primarysource_qualification != 4` for the non-lawyer view. See `docs/data-sources/faers.md` for full scoping (volumes, MedDRA PT-only constraint, drug→manufacturer normalization plan, lawyer-flood feedback loop).
- **Chunk-size note:** Upsert chunk sizes are per-table hard-coded constants in `pipelines/faers_weekly.py` (`PARENT_CHUNK_SIZE=100`, `CHILD_CHUNK_SIZE=500`, `DIM_CHUNK_SIZE=500`), NOT an env var — they're facts about row shape, not operator tuning. Only `drug_adverse_events` carries a JSONB `raw_payload` (full upstream record) so only the parent needs the small chunk to clear Postgres `statement_timeout`; forcing the narrow child tables to 100 (the original single-knob fix) 4-5x'd their request count and blew the workflow wall-clock timeout. Per-table is the correct dimension because the JSONB is a per-table fact.

### 6.11 Proposal Builder (deck assembler)
- **Frontend:** `web/app/(app)/proposal-builder/` — deck list + `[deck_id]/editor/` (block library, drag-reorder, inline date-range picker on time-series blocks, per-block data-preview line).
- **API:** `web/app/api/proposal/*` — `create`, `list`, `[id]` (GET/PUT), `[id]/blocks` (POST), `[id]/blocks/[block_id]` (PUT/DELETE), `[id]/blocks/reorder`, `[id]/export` (POST; `runtime = "nodejs"`).
- **Block renderers:** `web/lib/proposal-builder/block-renderers/` — one file per type (`tort-page.ts`, `ad-intel.ts`, `state-intel.ts`) plus `index.ts` dispatcher + `shared.ts`. Each `renderBlock(block, supabase, ctx)` returns `SlideSpec[]` (`lib/proposal-builder/slide-spec.ts`); the dispatcher catches per-block errors → one fallback slide so a bad block never fails the whole export. PPTX written by `lib/proposal-builder/pptx.ts` with **native pptxgenjs charts** (bar/line/doughnut — no image rendering, Vercel-safe). Tort Page (2–3 slides) + Ad Intel Advertisers/Saturation + State Intel are deep-rendered; other Ad Intel sub-surfaces return a "Coming soon" slide; Campaign stays label-only (per-user RLS, deferred). **Phase 2.1 (#393):** Tort Page advertiser landscape calls the same `get_top_advertisers_by_segment` / `get_segment_summary` RPCs the live `/advertising/<tort>` pages use (legacy `torts`/`ad_observations_raw` keyed by the underscore slug / `slug_alias`), **not** `ad_events.mass_tort_id` (unpopulated). State Intel is Supabase-first: it reads `state_crash_statistics` + `state_data_sources` by `state_code` and only consults the static `state-config/` registry for `showWorkplaceSection` + narrative/footer overrides, then falls back to the registry, then to a "not wired" slide. `pptx.ts` `addBullets` sets `breakLine:true` per fragment so `"Header:"` lines render as their own subheading paragraph (bold + primary color) instead of concatenating onto the preceding bullet.
- **Date range:** time-series blocks (`tort_page`, `ad_intel`) persist `{ date_from, date_to }` inside `proposal_blocks.block_data` (JSONB — no DDL; contract enforced in `lib/proposal-builder/types.ts` `validateBlock` + `resolveDateRange`, default last 90 days).
- **Auth model:** proposal/blocks fetched RLS-scoped (caller's tenant); the export route then uses a **service-role client** (`SUPABASE_SERVICE_ROLE_KEY`) for cross-table content joins so a join never silently drops rows behind per-user RLS. Falls back to the RLS client if the key is unset.
- **Supabase tables:** `proposals`, `proposal_blocks` (migration `20260516000000_create_proposals.sql`); reads `mass_torts`, `mdls`, `mdl_stats_monthly`, `mdl_developments`, `census_demographics`, `state_crash_statistics`, `state_data_sources`, plus the `get_top_advertisers_by_segment` / `get_segment_summary` RPCs (legacy `torts` + `ad_observations_raw`); qualification gist from `web/lib/data/tort-qualification-criteria.ts`. The Tort Page picker is sourced from the live `mass_torts` catalog (server-fetched in `[deck_id]/editor/page.tsx`) so it only offers slugs the renderer resolves; the static `_components/catalog.ts` `TORT_OPTIONS` is now a fallback only.
- **Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (export data joins), shared Supabase vars.

---

## 7. Environment & secrets

Names and purposes only. Don't commit values; see `web/.env.example` for the local-dev starter set.

**Frontend (browser-exposed, `NEXT_PUBLIC_` prefix):**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key (RLS-gated).
- `NEXT_PUBLIC_APP_URL` — canonical site URL for absolute links / emails.
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` — GA4 measurement ID for client-side analytics.

**Next.js server (API routes, server components):**
- `SUPABASE_SERVICE_ROLE_KEY` — service-role key. Server-only. Bypasses RLS — never expose to client.
- `OPENAI_API_KEY` — OpenAI for AI generation (creative, briefs, image, RSA, etc.).
- `GOOGLE_VERTEX_API_KEY` — Google Vertex AI (Gemini) for content generation.
- `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_PROJECT_ID` — GCP project IDs for Vertex.
- `ELEVENLABS_API_KEY` — ElevenLabs TTS for radio spots / voiceovers.
- `RESEND_API_KEY` — Resend transactional email (invites, alerts).
- `COURTLISTENER_API_TOKEN` — CourtListener API (also used by pipelines).
- `ALERT_CHECK_SECRET` — shared secret for the `/api/alerts/check` cron endpoint.
- `TORT_IMAGE_LIBRARY_MIN_COUNT` — minimum images-per-tort gate; tunable.

**Pipelines (GitHub Actions runner, also for local pipeline runs):**
- `SUPABASE_URL` — same as `NEXT_PUBLIC_SUPABASE_URL`, named without the prefix on the server side.
- `SUPABASE_SERVICE_KEY` (preferred) or `SUPABASE_SERVICE_ROLE_KEY` (fallback) — service-role key for direct REST writes.
- `OPENFDA_API_KEY` — optional but strongly recommended in production. openFDA rate is 240 req/min either way; the key raises the daily quota from 1,000/day (anonymous) to 120,000/day, which is the difference between killing a backfill at request #1001 and finishing it. Required for the FAERS pipeline's 2-year backfill (~16k requests).
- `OPENFDA_BASE_URL` — optional, default `https://api.fda.gov`. AEMS migration adapter: when openFDA endpoints cut over to AEMS hosts, flip this single env var instead of changing code. Used by `pipeline/lib/openfda_client.py`.
- `COURTLISTENER_API_TOKEN` — required for CourtListener pipelines (raises rate limit to ~5k/hr).
- `SEARCHAPI_API_KEY` — Searchapi.io for ad / SERP ingest.
- `APIFY_TOKEN` — Apify actors for Google/TikTok ad ingest.
- `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` — TikTok CCL ingest.
- `RECALLS_UPSERT_CHUNK_SIZE` — optional override for chunked recall upserts (default 200).
- `DRY_RUN` — set to `true` to skip DB writes locally (every pipeline supports this).
- `PIPELINE_TRIGGER` — set by workflows to `scheduled` or `manual` for run logging.

**Supabase CLI / migration workflow (`supabase-migrations.yml`):**
- `SUPABASE_ACCESS_TOKEN` — personal access token (Supabase dashboard → Account → Tokens).
- `SUPABASE_DB_PASSWORD` — DB password from project settings.

**Open PRs add (not yet on main):**
- `GA4_PROPERTY_ID`, `GA_CLIENT_ID`, `GA_CLIENT_SECRET`, `GA_REFRESH_TOKEN` — Google Analytics 4 Data API for the admin analytics dashboard (PR #271). **OAuth2 user-refresh-token auth, not a service-account key** (`web/lib/ga4.ts` uses `UserRefreshClient`; some GCP orgs block service-account key creation). Setup runbook: `docs/ga4-dashboard-setup.md`.

---

## 8. GitHub Actions inventory

All schedules are UTC.

| Workflow | Schedule | Runs |
|---|---|---|
| `ad-intel-daily.yml` | daily 11:00 | `pipelines.ad_intel_daily` |
| `google-ads-daily.yml` | daily 11:30 | `pipelines.google_ads_daily` |
| `tiktok-ads-daily.yml` | daily 14:30 | `pipelines.tiktok_ads_daily` |
| `google-trends-daily.yml` | daily 08:00 | `pipelines.google_trends_daily` |
| `serp-intel-daily.yml` | daily 12:00 | `pipelines.serp_intel_daily` |
| `pi-search-daily.yml` | daily 12:00 | `pipelines.pi_search_daily` |
| `advertiser-rematch-daily.yml` | daily 16:00 | `pipelines.advertiser_rematch_daily` (after ingests land) |
| `ingest-google-news.yml` | daily 11:30 + Mon 05:00 (tort_backfill) | `scripts/ingest_google_news_legal.py` |
| `ingest-rss.yml` | daily 12:00 | `scripts/ingest_rss_developments.py` |
| `courtlistener-attorneys.yml` | daily 14:00 | `pipelines.courtlistener_attorneys` |
| `courtlistener-mdl-attorneys.yml` | manual only | `pipelines.courtlistener_mdl_attorneys` |
| `jpml-monthly.yml` | daily 2nd–5th of month 15:00 | `pipelines.jpml_monthly` |
| `load-storm-events.yml` | monthly 5th 06:00 | `scripts/load_storm_events.py` |
| `recall-watchlist-weekly.yml` | Mon 12:00 | openFDA → CourtListener cases → parties → thermometer |
| `faers-weekly.yml` | Mon 03:00 | `pipelines.faers_weekly` (openFDA `/drug/event.json`, `serious:1` only) |
| `state-legal-news-daily.yml` | daily 13:00 | `pipelines.state_legal_news_daily` (per-state single-incident PI news via SearchApi Google News → `state_legal_news`) |
| `youtube-ads-daily.yml` | daily 13:00 | `pipelines.youtube_ads_daily` (PI-firm YouTube video ads via SearchApi Transparency) |
| `meta-ads-daily.yml` | daily 14:00 | `pipelines.meta_ads_daily` (PI-firm Meta/FB+IG ads via SearchApi Meta Ad Library) |
| `google-maps-local-weekly.yml` | Tue 06:00 | `pipelines.google_maps_local_daily` (per-metro Google Maps local-pack → `pi_local_businesses`; verified-address roster source for `get_state_firm_roster`) |
| `supabase-migrations.yml` | on push to main (paths: `supabase/migrations/`) | `supabase db push` |
| `repair-migration-history.yml` | manual only | one-shot `migration repair` for local-only versions |
| `pr-typecheck.yml` | every PR to main | TS net-new error gate |

---

## 9. Collaboration with other tools

Claude Code is the **primary orchestrator and coder** for this repo. That means:
- You plan, scope, and implement features end-to-end across web + API + pipelines + workflows + migrations.
- You manage the GitHub workflow (branches, PRs, draft → ready, responding to review comments) when asked.
- You can subscribe to PR activity to autofix CI failures and reply to review threads.

Other tools in the routing today:
- **Perplexity chat** — research, market analysis, occasional spec drafting. Not in the code path.
- **ChatGPT** — ad-hoc debugging and small one-off fixes the user pastes by hand.

If the user pastes a task plan from anywhere, follow it and keep scope to that plan.

### 9.1 Flag when a multi-agent Workflow is the better path

Lance doesn't always know when to reach for a multi-agent Workflow vs. doing a task inline. **Proactively flag it.** When a request lands, if it has **two or more** of these traits, say so up front and offer to run it as a Workflow before grinding through it inline:

- **Fan-out:** many similar independent units (per-state, per-tort, per-file, per-PR, per-metro) — the `state-batch` shape.
- **Broad search/audit:** answering means reading across many files/dirs where you'd otherwise dump a lot into context.
- **Independent verification adds confidence:** the work benefits from adversarial review or multiple lenses before committing (migrations, RLS/auth, risky refactors).
- **Scale beyond one context:** repo-wide sweeps, migrations across many call sites, large refactors.

When you flag it: name the **workflow shape** (existing: `state-batch`, `issue-to-pr`; or a one-off you'd author), give a **rough cost/scale** ("~N agents"), and let Lance opt in — Workflows need explicit opt-in and spend real tokens, so never auto-launch one. Don't flag for single-file edits, quick lookups, or conversational turns; those stay inline.

Existing reusable workflows live in `.claude/workflows/`: **`state-batch`** (build batches of v2 state pages) and **`issue-to-pr`** (drive one issue/task → scoped → implemented → verified → reviewed → open PR; stops at the PR, prod-verify is the post-merge `/verify` step).

---

## 10. UX & content style

- Audience: U.S. plaintiff firms, agencies, and media sellers.
- Tone: clear, direct, professional; bias toward decision-making language.
- For Campaign Builder, PI surfaces, and tort pages: emphasize what the data means for marketing decisions ("so what"), not raw stats.

---

## 11. Known issues / gotchas

- **Recall Watchlist workflow has been flaky and is recovering.** Four consecutive fixes landed over ~48h: taxonomy correction (#360), Class I floor for stage (#362), `device/enforcement.json` severity join (#363), `backfill_since` dispatch input (#364), per-chunk retry + smaller upsert chunks (#365), 60-min job timeout (6b1249e), and a manufacturer-cache perf fix (#366). The most recent observed failure mode was the `openfda-recalls` job hitting the 60-min timeout during `normalize_manufacturers` — PR #366 (just merged) cuts that step from ~38min to ~2–3min by removing 16k redundant HTTP GETs. **Root-cause hypothesis for any remaining failure:** downstream `parties-enrichment` (240min cap) or the openFDA enforcement endpoint occasionally returning empty maps for narrow date ranges (the script raises `RuntimeError` to refuse silent zero-classification runs). Confirm with the next scheduled Monday 12:00 UTC run before treating as fixed. Don't fix in this docs PR.
- **Open issue #83:** `courtlistener_attorneys.py` returns `firm_name = NULL` for all 938 attorneys in MDL 3047 because `_extract_from_contact_block()` naively returns `lines[0]`, which is usually a phone number. Fix is documented in the issue.
- **Next.js 16 + React 19 are new.** `web/AGENTS.md` warns explicitly: APIs / conventions / file structure differ from older training data. Read `node_modules/next/dist/docs/` before changing routing, server components, middleware, or data fetching.
- **TypeScript baseline errors exist.** `pr-typecheck.yml` counts net-new errors vs main; the build sets `typescript.ignoreBuildErrors=true`. Don't add new errors; a dedicated cleanup PR is required to flip the gate. Pre-existing noise is concentrated in `admin/users`, `trial-gate`, recharts tooltips.
- **Migration history quirks.** `repair-migration-history.yml` exists because PR #288 backfilled 111 placeholder migrations and left 15 local-only versions whose SQL was hand-applied to prod via the SQL editor. The repair job marks them `applied` without re-executing. Don't re-run those SQL files.
- **PROJECT_BRIEF.md** previously had a trailing U+2009 (thin space) in its filename. Renamed in this PR.
- **Two TODOs in production code:**
  - `web/lib/courtlistener.ts:122` — placeholder when `COURTLISTENER_API_TOKEN` is unset; should call the live API once a token is configured.
  - `web/app/(app)/pi-viability/page.tsx:109` — choropleth map placeholder.
- **`supabase/migrations/` contains 189+ files**, several with same-name-different-timestamp duplicates (e.g. `20260422013423` + `20260421220000` both `add_recall_watchlist`). Treat the directory as append-only and ordered lexicographically — don't rewrite history. **`schema_migrations.version` is a unique key**, so two files sharing the *exact same* timestamp prefix (not just name) crash `supabase db push` with `duplicate key value violates unique constraint "schema_migrations_pkey"` and block every subsequent migration in the queue until the colliding file is renamed. This bit us on 2026-05-21 → 2026-05-22 when PR #396's `20260521000000_document_invitations_schema.sql` collided with the earlier `20260521000000_faers_glp1_signal_rpcs.sql`; PR #397 + PR #398 were collateral damage until the invitations file was renamed to `20260522000001`. When authoring a new migration, run `ls supabase/migrations/ | grep ^<your-timestamp>` first — if anything comes back, bump your timestamp.
- **Pipeline tests don't hit live APIs.** Mocked via `unittest.mock` + `pytest`. Run `pytest tests/` from inside `pipeline/`.
- **`pipeline_configs.source_domain` CHECK has drifted ahead of the migration files.** Several pipelines (faers, landing_pages, recall_watchlist) added allowed values in migrations that re-declared the constraint, so the *latest* migration file's IN-list is NOT authoritative. When a new pipeline needs a new `source_domain`, read the live definition first (`SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='pipeline_configs_source_domain_check'`) and DROP/ADD with the FULL current list + your new value. A narrower reconstructed list fails `supabase db push` with "check constraint … is violated by some row." Bit the State Legal News migration (2026-06-26); fixed by reconstructing from the live constraint (full list as of then: ad_intelligence, ad_events_legacy, litigation_mdl, mva_fars, boating, weather_storms, reference_geo, serp_intelligence, pi_advertising, recall_watchlist, faers, landing_pages + legal_news).

---

## 12. Sibling-doc audit

These referenced docs sit next to CLAUDE.md / under `docs/`. Status as of 2026-05-12, after the sibling-doc cleanup pass landed:

| Doc | Status | Notes |
|---|---|---|
| `PROJECT_BRIEF.md` | Current. | Keep. |
| `CURRENT_PRIORITIES.md` | Current; `[cite:XX]` / `[file:XX]` markers stripped. | Keep updating weekly. |
| `README.md` | Current — thin, ~25 lines, points at CLAUDE.md / PROJECT_BRIEF / state-onboarding / schema / data-sources. | Keep thin. Don't reintroduce a repo-structure block — it rots. |
| `docs/schema.md` | Current — regenerated as a domain map from `supabase/migrations/` + `web/lib/database.types.ts`. | `web/lib/database.types.ts` is the source of truth for column-level types. Refresh this doc when major schema changes land. |
| `docs/roadmap.md` | Removed. | Roadmap lives in `CURRENT_PRIORITIES.md`. |
| `docs/data-sources.md` | Stale — superseded by `docs/data-sources/` directory (per-source scoping docs). | Delete in a follow-up PR once any unique content has been merged into the new directory. New per-source research lands under `docs/data-sources/<source>.md`. |
| `docs/data-sources/maude.md` | Current — verbatim research scoping report for FDA MAUDE (`/device/event.json`) ingest. | Refresh if AEMS migration changes endpoint/schema (see CLAUDE.md §11 and the doc's §6). |
| `docs/data-sources/faers.md` | Current — verbatim research scoping report for openFDA FAERS (`/drug/event.json`) ingest. | Refresh if openFDA shifts /drug/event from quarterly to daily cadence (per Aug 22, 2025 FDA announcement). |
| `docs/data-sources/cpsc.md` | Current — verbatim research scoping report for CPSC. Covers three distinct surfaces: Recalls API (no auth, v1 build), SaferProducts.gov Incident Reports OData (v2), and api.cpsc.gov NEISS (v3, deferred). | Refresh if CPSC's pending HHS reorganization (still before Congress as of May 2026) changes the endpoint hosts — see the doc's §6 ("CPSC organizational risk") for the AEMS-analogue risk. |
| `docs/state-onboarding.md` | Current and useful runbook. | Keep as-is. |
| `docs/recalls/recall-class-taxonomy-correction.md` | Current PR delta report; useful audit trail. | Keep. |

If you find any of these still wrong after a change, fix it in the same PR rather than leaving rot.
