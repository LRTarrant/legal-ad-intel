# CURRENT_PRIORITIES.md — Legal Marketing Intelligence

Last updated: 2026-06-29 (Phase 3 legacy→v2 migration ✅ FULLY DONE — all 6 legacy state pages incl. Alabama migrated + prod-verified, NO bespoke state pages remain; larger numbered section headings rolled out to all states. PRs #516/#518/#519/#522/#523 — see §0/§5)

This file captures what we are actively working on **right now** so AI tools and humans stay aligned.  
Keep it short and current — update weekly.

---

## 0. Recently shipped

- **2026-06-29 — Strategy Engine output-quality coverage check (diagnostic — `docs/strategy-engine-coverage-report.md`).** Audited the shipped grounded gpt-5.5 engine across all 51 jurisdictions by driving the real data layer (no LLM/browser). **Top finding: the biggest output-quality problem is an engine BUG, not a data gap** — the named-outlet layer (named local stations to buy) reaches only ~11 markets because `assemble-inputs.ts` fetches `media_outlets` with no `.range()` (hits the 1,000-row cap on a 7,873-row / 108-market table) + matches DMA names by exact string (`"Dallas"` ≠ `"Dallas-Ft.Worth"`). **A ~5-line fix flips ~25 states thin→demo-ready.** 11 states demo-ready today (AL/CO/GA/IA/IL/MA/MI/NH/NM/OH/UT); 5 genuinely data-thin (AR/RI/HI/AK/DC, self-heal via the daily pipelines). Also flagged: AL-only `COUNTY_DMA_BY_STATE`/`STATE_NAMES` hardcodes, and CT/DC returning 0 FARS county signal. Fixes are a separate scoped follow-up (see §3 item 7); audience-fit = national-baseline-weighted-to-local is by-design (don't "fix"). Repro: `npx tsx web/scripts/strategy-coverage-check.mts`.
- **2026-06-29 — Phase 3 legacy→v2 migration — ✅ DONE (all 5 states merged + prod-verified: audit #514, backbone #515, TN #516, AZ #518, FL/GA/CA #519; docs #520).** All 5 custom legacy state pages (AZ/CA/FL/GA/TN) now run on the shared v2 `[slug]` shell; the ~9k-line bespoke clients are deleted and the legacy `/state-intelligence/<slug>` URLs redirect to `/v2/<slug>`. FL/GA/CA shipped via the `phase3-flgaca-migration` multi-agent Workflow (shell features → 3 parallel config authors → adversarial verify → integrate), human-reviewed before merge. **Three reusable shell features landed (all optional, ~40 existing states untouched): rate-snapshot tiles (FL/CA), `features.showCrashIntelligence` (GA's ported native FARS charts, gated so only GA queries), `features.showPedBikeCard` (CA swaps boating → ped/bike).** Prod-verified each on www.legalmarketingintelligence.com (charts, 2022 injury tab, ped/bike card, rate tiles, redirects, 0 console errors). **#522 then migrated Alabama too (sourced fresh ALDOT/FARS/BLS/ACS 2023 stats; 2 wrong legacy numbers corrected) + added `numberedSectionHeadings` (larger numbered section labels) and a DataHealthBanner port; #523 made the numbered headings the DEFAULT for all 50+DC.** NO bespoke state pages remain — the entire set runs on the v2 shell (kept Alabama on the shell's standard snapshot tiles for cross-state consistency). Full history + the migration recipe are in `memory.md`.
- **2026-06-29 — State Intelligence "Design D" top-of-page arc shipped + rolled out to ~40 v2 states (PRs #507 → #508 → #509 → #510 → #512, all merged + prod-verified; #511 = docs).** Reorganized the state-page top into the approved **Design D** layout (sticky bar → compact hero with strategy-primary CTAs → dark **LIVE news carousel** → process-map pipeline strip → 4 "the verdict" cards → existing sections → strategy closer), then propagated it to the shared **v2 `[slug]`** shell — giving ~40 states a strategy/campaign CTA path the shell never had. **#507** Alabama reorg (lifted carousel onto a dark `hero` block, removed the moat band). **#508 (Phase 1.5)** de-duplicated the CTAs: pipeline strip is process-map only, `Build Media Strategy` is the filled primary + `Build PI Campaign` a ghost secondary, §strategy reworded as a "Ready to act on this?" closer. **#509** Impeccable a11y/harden (chip contrast to AA, dark-carousel contrast, LIVE pulse only when the feed has items, ARIA/focus). **#510 (Phase 2)** new shared `state-top-of-page.tsx` + `state-verdict.ts` wired into the v2 client; the **4 verdict cards auto-derive per state** (comparative states say comparative things, never Alabama's contributory copy), with optional `StateContent` overrides. Competition card uses a count-derived note (the page doesn't load competitor names server-side; firm identity is the domain) + a small `get_pi_competitors_by_dma` count fetch. `/strategy` + campaign builder confirmed state-agnostic. **#512** reshaped the v2 **Legal & PI Viability** section (the one piece #510 left in the old two-card form) to Alabama's single combined card via a new shared `state-legal-viability.tsx` (composite panel + 6-fact grid + CSS component bars replacing recharts + judicial mix + full-border callout) — which also cleared the two pre-existing `border-l-4` side-tab tells. Prod-verified Texas (rich) / Colorado (mid) / Rhode Island (sparse: "2 PI advertisers tracked — still room to enter"; Legal section judicial mix 0/1/4); CTA → `/strategy?state=XX` pre-fills; zero console errors. Alabama left bespoke for Phase 3 (full history → `memory.md`).
- **2026-06-29 — Strategy Engine "Inside their ads" YouTube ads DMA-scoped (PR #505, merged + data-layer prod-verified).** Closed an asymmetry in `strategy_market_creatives`: paid-search ad samples were DMA-scoped but YouTube ad samples used the statewide firm roster, so a Huntsville interview showed Huntsville paid-search ads next to statewide YouTube ads. YouTube creatives carry no DMA dimension, so the fix scopes the firm roster instead — intersecting `get_state_firm_roster` with firms present in the selected DMA (paid ∪ organic ∪ Maps). Statewide path unchanged. Companion check confirmed the Huntsville **Competitive Analysis** is already correct (AL-scoped; Texas-named firms are national advertisers buying into AL, not a wrong-state leak). One migration, no frontend change.
- **2026-06-29 — Strategy Engine redesign SHIPPED + prod-verified (PRs #496–#503, all merged).** Reworked the standalone Strategy Engine (`/strategy`) from a deterministic 3-archetype core + gpt-4o **narrator** into an **AI grounded strategist** — this **inverts the original "AI as writer, not strategist" call** (see the now-closed §4 parking-lot item). The AI now selects a funnel-sequenced tactic mix, makes format/genre calls, and writes the rationale, behind a **grounding validator** (can't invent tactics/outlets/numbers; no delivered-reach claims); **code owns every number** (allocation %, reach/frequency targets). Model = **gpt-5.5** (verified available on the account; flagship not `-pro` because the route is a synchronous 30s call) via a `STRATEGIST_MODEL` env var. Shipped in slices, each adversarially reviewed + browser-verified on prod: **#496** market-scoped data layer + Huntsville→Birmingham outlet fix; **#497** tactic+funnel scoring core (within-channel funnel depth, budget-honesty floors + concentration rule); **#498** grounded strategist + validator; **#500** competitive field scoped to the selected DMA (was statewide); **#501** richer interview (intake, real budget tiers, free-text "what does winning look like / off-limits" box, readiness yes/no/unsure, demographic note → e.g. a high-Hispanic metro steers Spanish-language radio); **#502** native "Before you spend a dollar" readiness gate + per-tactic budget labels; **#503** `/impeccable` polish of the readiness section. Built via the brainstorm → spec → plan → subagent-driven-TDD flow; specs + plans under `docs/superpowers/`.
- **2026-06-28 — Claude Code dev-tooling pass (from `/insights` + automation-recommender; committed to `main`, not feature work).** (1) **CLAUDE.md** gained four top-level guidance sections near the top — Deployment Workflow, Database Migrations, Memory Files, Environment Notes (PR #494). (2) **Migration-safety tooling**, hardening the repo's most failure-prone area at three points: a `new-migration` skill (safe-authoring flow: collision-free timestamp, CHECK-before-UPDATE ordering, live `source_domain` read, RPC DROP+CREATE, no-MCP-apply), a read-only `migration-reviewer` agent (pre-merge audit vs the §11 db-push hazards), and a `PreToolUse` guard hook (`.claude/hooks/guard-migrations.sh`) that blocks edits to shipped migrations + timestamp collisions. (3) A `.env` guard hook blocking agent edits to secret `.env*` files (allows `.env.example`). **Decided against:** context7 MCP (Next 16/React 19 already covered by local version-exact docs + Vercel skills), a lint/tsc-on-edit hook (redundant with the global format-on-edit + Stop DoD-typecheck; would fail on the TS baseline). **Deferred:** a `new-tort-page` scaffold skill (the §6.5 register-in-3-places footgun) — build when the next tort page is added.
- **2026-06-26 — State Legal News (Alabama template) built — "Recent Legal Activity" carousel.** New section #2 on the Alabama State Intelligence page (after Overview): an auto-advancing, on-brand carousel of recent single-incident PI news (verdicts/settlements lead with a big-number card; crashes/OSHA/filings as incident cards), newest-first, with All/Verdicts/Incidents filter, pause-on-hover, and a reduced-motion scroll-snap fallback. Shipped end-to-end: new `state_legal_news` table (+ RLS, `pipeline_configs` seed), `pipelines.state_legal_news_daily` (SearchApi Google News per state × practice area, keyword relevance + geo filter + optional gpt-4o-mini refiner), `state-legal-news-daily.yml` (daily 13:00 UTC). Built as a shared component (`components/legal-news/`, `embedded`/`numbered` props) so it drops into the v2 `[slug]` + 5 legacy states next — Alabama is the template. Verified on local dev against 15 real AL rows (incl. a $17M settlement card), 0 console errors, desktop + mobile. **Relevance filter is the real work** (Cowork's flag): geo gate (full state name / `, AL` dateline) + spam/lead-gen/criminal/politics rejects; keyword-only leaves rare foreign stragglers that the AI refiner catches in prod. Research → `memory.md`.
- **2026-06-26 — Media Consumption baseline + standalone page shipped (PRs #467–#475, all merged + prod-verified).** New `media_consumption_baseline` table (112 national Pew/BLS/OAAA/Edison rows) lights up the Strategy Engine audience-fit signal (was averaging the empty `media_profiles`), and a new `/media-consumption` page renders it: Race/Age/Income toggle → channel-grouped reach bars with all-adults baseline ticks + signed over-index deltas, family filter, news-proxy tags, cited-as-fact source links, Pew disclaimer. Built data-first, then designed via Impeccable; an Impeccable critique (34/40) drove a colorize/harden/layout/clarify/polish pass to **38/40 (Excellent)**, no P0/P1/P2 left. Remaining P3 cosmetics parked in §4. Engine lessons in `memory.md`.
- **2026-06-24 — #446 / #447 merged + verified in prod; #4 housekeeping shipped (#449).** **#446 (per-DMA SEO)** is live: `serp_metro_daily`'s first run wrote **7,758 metro rows across 110 DMAs** (6 SEO torts, 2,389 firm domains, 0 rejected) into `serp_results_normalized` (new `dma_code` column); `get_seo_competitors_by_dma` returns real ranked firms and the modified national `get_seo_competitors_by_tort` still returns national-only (`dma_code IS NULL`). **#447 (`meta_pages_daily` per-page flush)** verified: a live re-run crawled 288 pages, inserted 547 new ads, finished clean in 30m, and rows landed **incrementally mid-run** (the #414 lesson — confirmed fixed). **#449 (housekeeping)** deleted the 3 now-unused legacy ad components (`pi-advertising-section`, `competitive-landscape-table`, `state-advertising-section` — grep-confirmed zero refs) and regenerated `database.types.ts` for the new column + RPC; net-new TS errors = 0. **Traditional Media is now the only remaining Competitive Analysis channel** (TikTok permanently out). Minor heads-up: the GH Actions runners flag Node 20 deprecation (forced to Node 24) on these workflows — cosmetic, but `actions/checkout@v4` + `actions/setup-python@v5` will need a fleet-wide bump eventually.
- **2026-06-23 — Alabama State Intelligence redesign + Competitive Analysis everywhere + real in-app creative (PRs #437–#449 merged).** Rebuilt the bespoke Alabama page into the approved 3-section design (Overview · Legal Landscape & PI Viability · Competitive Analysis), then generalized the new firm-roster-scoped Competitive Analysis (shared `components/competitive/`) onto the v2 `[slug]` client (#441, ~45 states + DC) and the 5 legacy pages AZ/CA/FL/GA/TN (#442). **All four channels now render REAL ad creative in an in-app "View ads" modal** — Paid Search/SEO from stored ad text, **Meta** images via `meta_creative_capture` → Supabase Storage (#439), **YouTube** thumbnails via `youtube_creative_capture` → `video_id` from the transparency `details_script_link` (#443); neither needed Playwright. **#3 deeper coverage:** Meta page-id deepen (#444) + expanded keyword crawl & General PI filter (#445); **per-DMA SEO** (`serp_metro_daily` + `dma_code` + `get_seo_competitors_by_dma` + SEO-tab DMA filter, #446); a `meta_pages_daily` per-page flush fix (#447). Gotcha worth keeping: the new `sb_secret_*` Supabase keys need the `apikey` header on Storage REST writes (bare Bearer → "Invalid Compact JWS"). TikTok permanently out; **Traditional Media is the only remaining channel.**
- **2026-06-22 — Competitive Analysis Phase 5b: live Meta tab.** `get_meta_competitors` RPC (migration `20260622050000`) — page-level, national, case-type-filterable ranking of `meta_ad_creatives`; Meta panel in `competitive-analysis.tsx` with a case-type dropdown (defaults to "All"), active-ads ranking, case-type chips, and a per-row "view ads" link to each page's Meta Ad Library. RPC filters short-drama-app + news-outlet keyword noise (validated 268→261 pages, keeps "Postman Law"). `database.types.ts` regenerated. **Completes the channel program except Traditional Media** (TikTok permanently out). Browser-verify on prod once the migration applies on merge.
- **2026-06-22 — Competitive Analysis Phase 5a: Meta ingest + TikTok removed.** New `meta_ad_creatives` table + `meta_ads_daily` pipeline (SearchApi Meta Ad Library, 6 PI case-type keywords, US, daily 14:00 UTC). National + case-type-keyed (SEO model); page-led identity. Existing legacy meta data was unusable (99.9% NY, 40 mass-tort/lead-gen advertisers) so a fresh ingest. TikTok tab removed (no US ad library); Meta shown as "Soon" placeholder.
- **2026-06-22 — Competitive Analysis Phase 4b: YouTube tab live.** `get_youtube_competitors` RPC (firm-level, national, excludes google.com/youtube.com junk) + YouTube panel in `competitive-analysis.tsx`: ranked firms by active video creatives + longevity, no filter control, per-row "view ads" link to each firm's Google Ads Transparency page. Completes the channel program except Traditional Media (TikTok permanently out).
- **2026-06-21 — Competitive Analysis Phase 4a: YouTube video-ad ingest (data layer).** New `youtube_ad_creatives` table + `youtube_ads_daily.py` pipeline (daily 13:00 UTC) pulling PI-firm video creatives from Google Ads Transparency via SearchApi (`ad_format=video`, US, 490 PI-firm domains from `pi_search_observations`). No UI this phase. **Phase 4b (next): the YouTube tab** — `get_youtube_competitors` RPC + wire `competitive-analysis.tsx`, firm-level ranking, built once data accrues. (TikTok stays permanently disabled; Traditional Media still pending.)
- **2026-06-21 — Competitive Analysis Phase 2: SEO tab live.** `get_seo_competitors_by_tort` RPC (organic-only national, `serp_results_normalized`), motorcycle + boating added to the SERP pipeline, SEO tab in `competitive-analysis.tsx` with case-type dropdown (no DMA — SEO is national) + ranked domains + directory tagging. Follows Phase 1 (PR #428, Paid Search by DMA). Next channels: YouTube (Phase 4, scope TBD); Traditional Media (pending); TikTok permanently out (no US ad library).
- **2026-06-09 — State Intelligence v2 buildout complete — all 51 jurisdictions live.** Built the remaining 28 states + DC via a reusable multi-agent `state-batch` workflow (per-state research → adversarial verify → integrate → PR) across 4 batches (PRs #405 / #406 / #408 / #409), taking State Intelligence from 23 to all 50 states + DC. Also relabeled the FARS 2024 data as the Annual Report File (PR #407) after confirming it matches NHTSA's ARF exactly. Each page browser-verified on production. Follow-ups logged in §5. The 6 legacy v1 states (AL/AZ/CA/FL/GA/TN) remain on their hand-written pages.
- **2026-06-08 — Admin Site Analytics dashboard (GA4) — live.** `/admin/analytics` (admin-gated) renders 30-day GA4 KPIs + top pages / traffic sources / geography / U.S. states & cities via the GA Data API. Closed out the long-open PR #271 (rebased + modernized to `isAdmin()`), then hotfixed the serverless gRPC transport in PR #404 (`fallback: true` → REST). Auth is OAuth2 refresh-token (not a service-account key); env vars + runbook in `docs/ga4-dashboard-setup.md`. Verified live against the real property.

---

## 1. Top objectives (next 2–4 weeks)

1. **Make PI Campaign Builder + state views demo-ready for plaintiff injury firms**
2. **Standardize mass-tort tort pages on a shared criteria/signal model**
3. **Stabilize core data pipelines and automation for key signals (FARS, storm, MDL, etc.)**

---

## 2. Active tracks

### A. Plaintiff injury (single-event PI)

**Goal:** Give PI firms a credible, data-grounded way to plan and launch PI campaigns by state/market, starting with motor-vehicle PI, then expanding to other PI categories.

Current focus:
- State-level PI surfaces for priority states (e.g., AL, TX, FL, CA, NY) showing:
  - Injury/fatality risk (FARS first)
  - Basic demographics / population
  - Simple “so what” guidance for PI marketing decisions
- Tight integration between PI state views and the PI Campaign Builder flow (torts + geos + budgets + creative + CSVs).

Definition of “good enough for demos”:
- For at least a handful of states:
  - PI state pages load quickly and don’t show obviously broken or empty sections.
  - Campaign Builder can select those states and produce:
    - Strategic brief
    - Geo recommendations
    - Creative (radio, video, Meta/Google)
    - Working CSV exports (Meta + Google) that import without errors.

### B. Mass torts

**Goal:** Make every mass-tort page feel like a serious, layered decision tool for mass-tort and PI firms, not just a brochure.

Current focus:
- Standardize all tort pages on:
  - Shared criteria / qualification model (centralized questions + disqualifiers).
  - 4–5 layered signals per tort (e.g., incidence, regulatory/AG activity, docket/MDL posture, judicial profiles, viability).
- Ensure Campaign Builder can leverage these criteria for future mass-tort flows, even if PI flows are prioritized first.

Definition of “good enough for demos”:
- Each priority tort page:
  - Uses the central criteria store.
  - Shows at least 3–4 meaningful signal blocks.
  - Has sample creative / campaign ideas grounded in those signals.

### C. Data & automation

**Goal:** Move toward “Computer builds, GitHub Actions/Supabase cron run,” so recurring data stays fresh without manual runs.

Current focus:
- Treat FARS + storm + a small set of other key sources as the first fully automated pipelines.
- Ensure GitHub Actions wired to Searchapi.io, OpenAI, Apify, ElevenLabs, etc., are clearly documented and easy to extend.

Short-term definition of done:
- At least one end-to-end pipeline (e.g., FARS → normalized table → PI state surface) with:
  - Documented GitHub Action
  - Clear table naming (raw/normalized/published)
  - Basic run-logging and failure-handling rules

### D. Competitive Analysis (PI-firm ad competition by channel)

**Goal:** On each v2 State Intelligence page, show which firms a PI firm competes against, per advertising channel.

Status:
- **Shipped:** Phase 1 Paid Search by DMA (#428), Phase 2 SEO by case type (#429, national) + per-DMA SEO (#446: `serp_metro_daily` + `get_seo_competitors_by_dma`, verified writing 7,758 metro rows / 110 DMAs), Phase 4a/4b YouTube (ingest #430 + firm-level tab #432), Phase 5a Meta ingest (#434) + deeper coverage (#444 page-id deepen, #445 keyword crawl, #447 per-page flush fix), Phase 5b live Meta tab (`get_meta_competitors` RPC + case-type panel + "view ads" links). Real in-app ad-creative modal across all 4 channels (#439/#440/#443). Now one shared `components/competitive/` surface on every state (#441/#442); legacy ad components deleted (#449).
- **Next:** Traditional Media — the last remaining channel; would lean on `broadcast_*`, not yet scoped.
- **Out:** TikTok permanently (no US ad library).

---

## 3. Concrete work items (short list)

These should be 5–10 items max and updated weekly.

1. **PI States:** Implement the first wave of PI state pages (e.g., AL + 2–3 other states) wired to existing FARS data and basic demographics.
2. **PI States ⇄ Campaign Builder:** Ensure the PI Campaign Builder can consume state-level data for geo recommendations and copy.
3. **Tort criteria centralization:** Finish central criteria store and migrate the remaining tort pages to it.
4. **Automation v1:** Document and stabilize FARS pipeline using existing GitHub Actions + Supabase, including a simple run log.
5. **Trial subscription seeder (queued):** Implement invite-based trial subscription creation so invitees get a proper `subscriptions` row, but this can wait a few days.
6. **States UX polish:** Clean up any obvious rough edges on state pages that affect demos (labels, missing data messaging, loading states, etc.).
7. **Strategy Engine outlet fix (P0, ~5 lines, scoped from the coverage check):** in `web/lib/strategy-engine/assemble-inputs.ts`, fetch `media_outlets` server-side by resolved market name (or paginate past the 1,000-row cap) + normalize the DMA-name match (`dma_markets.display_name` vs `media_outlets.market`/`broadcast_stations.nielsen_dma`). Flips ~25 states from thin→demo-ready for named outlets. Then P1: generalize `STATE_NAMES`/`COUNTY_DMA_BY_STATE` beyond AL; P2: CT/DC FARS county signal. Full detail + priority list in `docs/strategy-engine-coverage-report.md`.

---

## 4. Parking lot (not active this week)

These are important but explicitly **not** in scope for the current week:

- Full population-rate normalization on geo metrics (per PR D.5 follow-up).
- Super-admin pronunciation editor UI for TTS.
- Still-image watermarking for Meta ad previews.
- Trial subscription seeder, if not yet pulled into the active list above.
- Agency-style proposal PDF generator (post-CSV exports).
- **State Legal News banner (single-incident PI) — Alabama template SHIPPED 2026-06-26 (see §0); roll-out to other 50 states pending.** The carousel + `state_legal_news` table + `state_legal_news_daily` pipeline + workflow are live; the shared component (`components/legal-news/`) is drop-in for the v2 `[slug]` client + 5 legacy state pages (`embedded`). **Remaining work:** (1) wire the component into the other states, (2) run the pipeline for all 50 states (only AL is populated), (3) optional: turn on the gpt-4o-mini refiner (set `OPENAI_API_KEY` in the workflow secret) to kill rare foreign geo-stragglers, and add Phase-2 government feeders (OSHA state filter, FARS, CourtListener). Republish-wall scope unchanged (no mass torts; displayable sources only). Full source stack + research in `memory.md`.
- **App-wide 44px touch-target pass (promoted from per-surface notes).** Filter chips (~26px) and axis/segment tabs (~36px) sit below the 44px touch minimum on multiple surfaces now — Media Consumption (§4 below) and the Alabama State Page (the State Intelligence template, so the gap inherits to all 50 states). Left per-surface so far to match app-wide control density; do it as one global control-density pass (chips/tabs/segmented controls), not per-page. Surfaced by the 2026-06-27 Impeccable critique of the Alabama page (36/40).
- **State-page density reduction — lift the aesthetics ceiling (optional, parked).** The Alabama State Page caps ~36–37/40 on Impeccable because it is an intentionally dense 7-section intelligence surface (heuristic #8 Aesthetic/Minimalist stays at 3 by design). Pushing toward Excellent would mean collapsible sections or top-level tabs across the state-page template (inherited by all states). This is a product trade-off (depth vs. minimalism), not a defect — only pursue if a demo or user signal calls for a lighter-weight read.
- **Strategy Engine (PI media-strategy recommendations) — SHIPPED 2026-06-29 (see §0).** Built and prod-verified across PRs #496–#503 as the standalone `/strategy` engine (the Alabama-embedded version was retired into the standalone in #495). The architecture **inverted the original plan**: the AI is now the **grounded strategist** (selects tactics + sequences the funnel + writes), with a validator enforcing grounding and **code owning all numbers**; model is **gpt-5.5**. The original rules-and-archetype scaffold (Head-to-Head / Niche / Audience Play / Always-On / Surge with "AI as writer, not strategist") was retired in favor of a curated **tactic library + funnel scoring**. The demographic-baseline research (Pew + BLS ATUS) landed earlier as `media_consumption_baseline` and now feeds the audience-fit + the demographic-note steer. Specs + plans under `docs/superpowers/`; full history in `memory.md`.
- **Media Consumption page — P3 cosmetic polish (mostly closed; shipped at 38/40, no P0/P1/P2).** The `/media-consumption` surface (PRs #467–#475) is ship-grade. Two of the four parked cosmetics were cleared via Impeccable polish (2026-06-26):
  - ✅ **11px attribution text** bumped to 12px (`text-xs`) on the per-metric source links.
  - ✅ **"cited as fact"** no longer repeats per metric row — consolidated to one marker under the channel name (vendor names still show per metric). The remaining `news-consumption proxy` pill stays 11px (category tag, not attribution).
  - **Touch-target heights** on the axis tabs (~36px) and filter chips (~26px) are below the 44px touch minimum. Left as-is to match the app-wide control density — fix as an app-wide pass, not on this one surface.
  - **YouTube-by-race "Use the platform"** shows only Asian + Hispanic (the only `platform_use`-by-race rows Pew publishes); reads lopsided beside the 4-race news row. Data-coverage artifact, not a UI bug — revisit if a fuller by-race cut becomes republishable.

---

## 5. State Intelligence Pages — Cleanup Arc

Closed in this arc:
- NC, MI, NY narrative / cross-signal cards audited and cleaned (pass 1)
- Placeholder-zero pattern eliminated for visible fields across MI, NC, IL, PA, OH
  (speedRelatedFatalities, alcoholRelatedFatalities, truckTransportFatalities, speedRelatedPct)
  → established convention: 0-as-no-data → null → existing "unavailable" render path
- ruralFatalities / urbanFatalities widened to `number | null`; client guard converted
  from `> 0` short-circuit to standard `!= null` convention; NC, MI, PA, IL set to null
- OH alcohol-fatality denominator mismatch corrected: replaced OSHP OVI-related figures
  (589 / 50.95%) with NHTSA FARS 2023 alcohol-impaired figures (455 / 36.6%) for
  cross-state methodological consistency
- OH constructionPctTotal precision normalized (19.512 → 19.5)
- Cross-state alcohol sourcing audited: no other states had OVI-style denominator
  mismatches; NC/NY/IL/MI/PA all in the 22–37% FARS-comparable range
- NC data fill: speedRelatedFatalities 389 → 426 (NCDOT 2022), speedRelatedPct 23.1 →
  25.3%, unrestrainedFatalities 504 → 562 (NCDOT 2022); dual-citation footer added
- PA, OH, IL state-specific narrative content blocks added (v1 demo depth)
- 2026-05-08: State-pages attribution + Tier 2 zero-cleanup arc closed.
  Per-tile FARS source attribution landed for IL, MI, NC, NY, OH, TN, TX via two new
  optional `TrafficStatsBlock` fields (`fatalitiesSourceLabel`, `fatalitiesReportYear`).
  Motorcycle null-widening + `showWorkplaceSection` feature flag landed for 10 Tier 2
  states (CO, IN, KY, LA, MA, MD, MN, MO, SC, WI). PA correctly held back pending
  FARS 2024 final. `is_preliminary` column added to `state_crash_statistics`; codegen
  script gains `--skip` arg and idempotency fix. All 18 demo-set state pages now render
  with honestly-labeled data and no placeholder zeros.
- 2026-06-09: **State Intelligence v2 buildout COMPLETE** — all 51 jurisdictions (50 states + DC)
  live. 28 new states + DC built via a multi-agent `state-batch` workflow across 4 batches
  (PRs #405 / #406 / #408 / #409). The per-state verify stage caught real errors pre-merge
  (NE repealed helmet law, OK/IA alcohol figures, NM/WV commute math, AK damages cap, DE DMA
  rank). DC is a special config (100% urban → rural=0, boating + workplace hidden, pure
  contributory negligence with a vulnerable-user exception).
- 2026-06-09: **FARS relabel (PR #407)** — confirmed `state_crash_statistics` year=2024 IS the
  FARS 2024 Annual Report File (matched NHTSA exactly), not a preliminary estimate. Flipped
  `is_preliminary=false` for 2024 (51 rows) + relabeled all configs "FARS 2024 (preliminary)"
  → "FARS 2024 Annual Report File"; reconciled OK/IA alcohol to the authoritative DB. This
  RESOLVES the relabeling queue item below (done now as ARF, not deferred to "final").

Queue (next data-fill pass):
- BLS CFOI ingestion for 10 Tier 2 states (CO, IN, KY, LA, MA, MD, MN, MO, SC, WI).
  Workplace section is currently hidden via `showWorkplaceSection: false` feature flag.
  Restoration is a manual per-state data load from BLS CFOI state tables + flag flip.
  No ingest pipeline exists yet.
- Person-level FARS for Tier 2 (motorcycle, pedestrian, unrestrained, speeding).
  Currently NULL in `state_crash_statistics`. Codegen would need extending to write
  these fields once Supabase has the rows. Bundles naturally with the FARS 2024 final
  release relabeling work below.
- PA FARS verification — pending NHTSA final state-level 2024 release. Resolve
  PennDOT 244 vs proposed FARS 275 alcohol direction at that time; then add PA row
  to `state_crash_statistics` and re-run codegen.
- FARS 2024 FINAL FILE relabel (future) — the 2024 data is currently the Annual Report File
  (labeled "FARS 2024 Annual Report File" as of PR #407). When NHTSA ships the 2024 FINAL
  file (~1–2 yrs out), reload `state_crash_statistics` + adjust the `sync-fars-data.ts`
  qualifier if needed. NOTE: the `sync-fars-data.ts` slug map is STALE — it skips every state
  added in batches 1–4, so a future codegen run needs the map updated first (and review its
  Tier-1 state-DOT overwrite behavior before running).

Post-buildout follow-ups (optional, not scheduled — logged 2026-06-09):
- **Phase 3 — ✅ FULLY DONE 2026-06-29 (TN #516, AZ #518, FL/GA/CA #519, AL #522, numbered-headings rollout #523; docs #520).**
  ALL 6 legacy bespoke pages (AL, AZ, CA, FL, GA, TN) migrated onto the v2 `[slug]` shell; the hand-written
  clients (~10k lines total) deleted and the legacy routes redirect to `/v2/<slug>`. Per Lance's lossless
  decision, GA's native FARS crash charts and CA's ped/bike case card were ported into the shell as optional
  flag-gated features (plus FL/CA rate tiles), so no display was dropped. **Alabama (#522) was migrated last —
  its stats were sourced fresh from ALDOT/FARS/BLS/ACS 2023 (2 wrong legacy numbers corrected), and it added
  the `numberedSectionHeadings` larger-section-label feature + a DataHealthBanner port; #523 made the numbered
  headings the default for all states.** Kept Alabama on the shell's standard snapshot tiles for cross-state
  consistency. Each prod-verified. No bespoke state pages remain.
- Fleet-wide `nationalAvg` bump 68.7 → 69.2 (ACS 2024 1-yr national drive-alone share). One-line
  change across all state configs + the `_types.ts` "commonly 68.7" comment. Cosmetic consistency.
- Rewrite `docs/state-onboarding.md` around the v2 config + `state-batch` workflow — it currently
  documents only the legacy v1 `onboard_state.py` path (CLAUDE.md §12 flags this).
- BLS CFOI workplace data for the states still showing `showWorkplaceSection:false` — several
  small batch 1–4 states (small-state BLS tables suppress the industry breakdown) plus the 10
  Tier-2 states below. Manual per-state load from BLS CFOI tables + flag flip; no pipeline yet.

Parked (no action unless conditions change):
- WorkplaceStatsBlock sourceLabel symmetry — "BLS CFOI" is hardcoded in the v2 client.
  Add a `sourceLabel?` field to `WorkplaceStatsBlock` only if a non-BLS workplace
  source is ever introduced.
- NY totalCrashes rounded vs exact
- MAJOR_METROS dead variable in state-intelligence-client.tsx
- Cross-state QCEW employment rounding consistency
- TX stale block comment referencing old TxDOT rural figures (2,080 rural)

---

## 6. Data Source Arc: CPSC → FAERS → MAUDE

**Goal:** Stand up three complementary tort-signal data sources on a shared openFDA-style ingest architecture. The recall watchlist arc is closed; this is the next arc.

**Sequencing rationale (build order is deliberate, not alphabetical):**

1. **CPSC first.** Sits entirely outside FDA AEMS migration risk (see below). Lets us iterate on the shared ingest architecture — HTTP client, retry, manufacturer normalization, tort-signal scoring — without a moving-target endpoint. Also fills the non-FDA gap: consumer products, recalls, NEISS injury data that FAERS/MAUDE cannot see.
2. **FAERS second.** Pharma foundation. Forces us to lift the existing recall HTTP client into a shared `openfda_client` module and build the AEMS adapter layer the right way — FAERS is the lower-volume openFDA endpoint (~20M records, quarterly refresh) so we can prove the adapter pattern before MAUDE's ~24M records and weekly cadence stress it. Pairs with adding 2–3 pharma tort pages (GLP-1 NAION is the canonical live signal — see `docs/data-sources/faers.md` §5 and §7).
3. **MAUDE third.** Inherits the shared `openfda_client` + AEMS adapter from FAERS. Larger volume (~24M records, weekly refresh, nested arrays, free-text narratives) — by the time we get here the architecture is proven.

**Central scope risk — AEMS migration:** FDA launched the unified Adverse Event Monitoring System (AEMS) on 2026-03-11 with stated plan to migrate MAUDE into it by end of May 2026 and FAERS to follow. openFDA's `/device/event.json` and `/drug/event.json` are not formally deprecated, but their upstreams are being replaced. Both FAERS and MAUDE pipelines must wrap the endpoint URL and field map behind a thin adapter layer so the AEMS cutover is a one-file change. Building CPSC first buys us the architectural runway to get this right. Details in `docs/data-sources/maude.md` §6 (AEMS migration timeline) and `docs/data-sources/faers.md` §7.

**Dependency:** FAERS rollout pairs with adding 2–3 pharma tort pages (e.g., GLP-1 NAION) — the pipeline is only as valuable as the surfaces that consume it. CPSC and MAUDE are device/product-shaped and reuse the existing tort-page model.

**Research status (all three sources scoped):**
- `docs/data-sources/maude.md` — complete (verbatim research scoping report).
- `docs/data-sources/faers.md` — complete (verbatim research scoping report).
- `docs/data-sources/cpsc.md` — complete. Identifies three distinct surfaces (Recalls API, SaferProducts.gov Incident Reports OData, api.cpsc.gov NEISS), Section 6(b) disclosure mechanics that structurally delay public data by ≥15 days, and the CPSC → HHS reorg pending Congress as the AEMS-analogue political risk.

**Next deliverable: CPSC Phase 1 — Recalls API ingest.** Per the cpsc.md §8 phased plan: build `pipelines/cpsc_recalls.py` against `https://www.saferproducts.gov/RestWebServices/Recall?format=json` (no auth, ~10K records, weekly refresh, ~1–2 engineer-days). Lands a new `cpsc_recalls` + six child tables under a `cpsc_*` namespace (do NOT extend the existing `recalls` table — different recall-number namespace and severity semantics). Wrap the endpoint URL in an env-var adapter from day one so any HHS reorg URL change is a config flip. Surface CPSC recalls in the existing Recall Watchlist behind a source filter. Phase 2 (Incident Reports OData, leading-indicator signal) and Phase 3 (NEISS aggregate context) land after Phase 1 is operating cleanly.

**Out of scope for this scaffolding PR:** no pipeline code, no schema migrations, no web/ changes — those land in follow-up PRs starting with CPSC Phase 1.

---

## 7. How AI tools should use this file

- **Claude:** Treat this as the source of truth for what features are “in play” this week; don’t start work outside these items unless explicitly asked.
- **Perplexity Computer:** Use this to decide what’s high-value when orchestrating multi-step tasks; everything else belongs in backlog.
- **ChatGPT:** Use it to prioritize debugging and small fixes that unblock these items first.
