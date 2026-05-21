# CURRENT_PRIORITIES.md — Legal Marketing Intelligence

Last updated: 2026-05-12 (CPSC research complete; data-source arc fully scoped)

This file captures what we are actively working on **right now** so AI tools and humans stay aligned.  
Keep it short and current — update weekly.

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

---

## 3. Concrete work items (short list)

These should be 5–10 items max and updated weekly.

1. **PI States:** Implement the first wave of PI state pages (e.g., AL + 2–3 other states) wired to existing FARS data and basic demographics.
2. **PI States ⇄ Campaign Builder:** Ensure the PI Campaign Builder can consume state-level data for geo recommendations and copy.
3. **Tort criteria centralization:** Finish central criteria store and migrate the remaining tort pages to it.
4. **Automation v1:** Document and stabilize FARS pipeline using existing GitHub Actions + Supabase, including a simple run log.
5. **Trial subscription seeder (queued):** Implement invite-based trial subscription creation so invitees get a proper `subscriptions` row, but this can wait a few days.
6. **States UX polish:** Clean up any obvious rough edges on state pages that affect demos (labels, missing data messaging, loading states, etc.).

---

## 4. Parking lot (not active this week)

These are important but explicitly **not** in scope for the current week:

- Full population-rate normalization on geo metrics (per PR D.5 follow-up).
- Super-admin pronunciation editor UI for TTS.
- Still-image watermarking for Meta ad previews.
- Trial subscription seeder, if not yet pulled into the active list above.
- Agency-style proposal PDF generator (post-CSV exports).

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
- FARS 2024 (preliminary) → final relabeling — when NHTSA ships final state tables
  (expected late 2026 / early 2027): `UPDATE state_crash_statistics SET is_preliminary
  = false WHERE year = 2024` and re-run `sync-fars-data.ts`. Labels drop the
  "(preliminary)" qualifier automatically. Single-row update + script re-run.

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
