# Memory — Legal Marketing Intelligence (legal-ad-intel)

Long-term memory across sessions for the LMI / legal-ad-intel repo. Keeps in-flight state, decisions, and dataset/schema lessons that don't belong in `CLAUDE.md` (stable conventions) or `CURRENT_PRIORITIES.md` (this week's active work).

## How to use this file (instructions to Claude)

**Read this file at the start of any session working in this repo**, alongside `CLAUDE.md` and `CURRENT_PRIORITIES.md`.

**Write to this file when:**
1. A PR ships that changes architecture, schema, or pipeline behavior — log the lesson, not the PR description.
2. A new dataset shape lesson is learned (canonical term mappings, distribution surprises, index/query gotchas).
3. A decision is made that affects future work (e.g., "we exclude generic drug strings from per-brand attribution").
4. A blocker or open question is identified — log under **Open questions / blockers**.

**How to write entries:**
- Append new entries to the bottom of the relevant section. Date-stamp every entry (`YYYY-MM-DD`).
- If an entry updates an existing one, edit in place — don't duplicate.
- Terse — one to four lines per entry.
- This file is committed to the repo. Don't write secrets, customer data, or pricing.

---

## Repo state

- 2026-05-22 — Repo path on Lance's machine: `/Users/lancetarrant/legal-ad-intel`. Mounted as a Cowork folder so scheduled tasks/skills can read it. Active branch: `feat/depo-provera-faers-signals` — FAERS live-signal surface work (see PR-5 entry below). `CURRENT_PRIORITIES.md` last updated 2026-05-08.

---

## Recent PRs / shipped work

- 2026-05-21 — **PR #395 — Live FAERS Signal Block** on both GLP-1 tort pages (gastroparesis and vision-loss/NAION), rendered above the existing static paper-sourced FAERS sections with green LIVE-DATA badge + "Data current through March 2026" badge. Three signals per page: drug-by-drug breakdown (5 GLP-1 brands × MedDRA reaction filters with top-5 reactions, % death, % hospitalization), consumer-report concentration vs the 36.6% dataset baseline (lawyer-flood proxy), and reporting trend via recharts sparkline per brand. Architecture: 2 read-only RPC functions (`faers_glp1_drug_breakdown`, `faers_glp1_monthly_trend`) because PostgREST can't GROUP BY across joined 8M-row tables. Exact-match drug arrays against the `medicinalproduct` btree index (substring ILIKE over 8.16M rows times out at the 8s Postgres limit). 7-day `unstable_cache` revalidate matching the weekly cron. 18-test suite passing, repo-wide TS errors dropped 1939→1837 from regenerating `database.types.ts`. Architecture validated on live data: Ozempic gastroparesis spot check matched Phase 0 prediction exactly (3,284 events / 1.8% death / 63.8% hospitalized / 74.2% consumer share vs 36.6% baseline).
- 2026-05-21 — **FAERS arc closed across PRs #382–#387 + #395.** Pipeline shipped (6 bugs, 6 PRs); backfill completed (1,583,293 events spanning Jan 2024 – March 2026, 8.16M drug rows, 5.57M reaction rows); first user-visible surface live on both GLP-1 pages.
- 2026-05-22 — **PR-5 on `feat/depo-provera-faers-signals`** — original scope was Dupixent + Depo-Provera as a paired task, but the two diverged:
  - **Depo-Provera live FAERS block shipped** (commit `773fc38`) — block added to the existing tort page; `faers-depo-provera.ts` config + RPC generalization. Done.
  - **Dupixent CTCL tort page built** (2026-05-22) — new pre-MDL tort surface. `faers-dupixent.ts` config (brand map + 10-term CTCL PT array, verified against live data) + test; new `web/app/(app)/advertising/dupixent/page.tsx` with the live FAERS block (lawyer concentration mode); registered in `PRE_MDL_TORTS` on `mass-tort-overview/page.tsx`; `mass_torts` + `torts` rows in migration `20260522000000_add_dupixent_tort.sql` (NOT yet applied — apply via Supabase SQL editor or on merge). Page is pre-MDL framed: MDL 3180 petitioned not formed, no settlement section, CPA labeled an LMI estimate. Deliberately omits demographic/state-prescribing/keyword tables (no verified data — would be fabrication). Litigation facts from web research — see Dupixent findings entry below.

---

## Findings worth tracking (business + product implications)

- 2026-05-22 — **Dupixent CTCL litigation (MDL 3180) — pre-MDL facts** (web research, as of 2026-05-22). MDL No. 3180 *In re: Dupixent (Dupilumab) Products Liability Litigation* petitioned with the JPML 2026-02-13; consolidation hearing **May 28, 2026** — not yet formed. ~15 cases / 12 federal districts; N.D. Georgia requested. Defendants Regeneron + Sanofi. Injury CTCL (also PTCL). No verdicts/settlements; individual filings. Key science: Hasan et al., JAAD 2024, TriNetX cohort — OR 4.10 (CI 2.06–8.19) for CTCL in dupilumab-treated AD; OR 3.20 in DMARD-naive subgroup. Contested by the "unmasking" hypothesis (pre-existing CTCL misdiagnosed as AD). FAERS cross-check: petition cites 300+ CTCL reports; live FAERS query found ~301 — independent corroboration. **Recheck MDL status after May 28, 2026** — the page MDL copy is status-dated.
- 2026-05-21 — **Tirzepatide vision-loss signal vs semaglutide.** Unexpected finding from PR #395's vision-loss block: tirzepatide drugs show dramatically higher consumer-report share than semaglutide drugs. Mounjaro 83.4% and Zepbound 82% vs Ozempic 61.7%, Wegovy 38.4%, Rybelsus 46.7%. MDL 3163 is currently centered on Novo Nordisk because the Harvard/JAMA study primarily examined semaglutide — but the FAERS lawyer-flood signal suggests tirzepatide vision-loss claimant intake is heavier proportionally. Worth tracking for future Eli Lilly conversations and as a potential angle for firms positioning early in MDL 3163.

---

## Key decisions log

- 2026-05-21 — **Migration application is the user's job, not Claude Code's,** per `CLAUDE.md` §3. Auto-mode classifier correctly blocked Claude Code from applying PR #395's migration directly. Workflow: write migration in repo, apply via Supabase SQL editor (paste raw migration SQL) or let `supabase-migrations.yml` auto-apply on merge to main.
- 2026-05-21 — **When a PR adds Supabase schema (migration or RPCs), regenerate `web/lib/database.types.ts` in the same PR.** The FAERS schema landed in PR #382 but types weren't regenerated until PR #395 (3+ weeks later), leaving 100+ ghost TypeScript errors in the repo from FAERS tables being absent in the type system. Regen at the time of schema change keeps repo TS health honest.
- 2026-05-21 — **Generic-only drug product strings excluded from per-brand attribution.** Strings like "SEMAGLUTIDE" or "TIRZEPATIDE" (no brand) are <1% of FAERS volume and ambiguous between brands. Don't fold them into any one brand's counts.
- 2026-05-22 — **Adding a new tort page requires THREE registration touch-points.** Missed on the Dupixent page initially (sidebar nav was overlooked, caught later by the user). The prebuild registry guard (`web/scripts/check-tort-profile-registry.mjs`) only catches one of them — the others fail silently and leave the page unreachable from the nav. Always edit: (1) `web/app/(app)/sidebar.tsx` (`EMERGING_TORTS` or `ACTIVE_MDLS`); (2) `web/app/(app)/mass-tort-overview/page.tsx` (`PRE_MDL_TORTS` or `MDL_TORT_NAMES`); (3) `mass_torts` table migration with `has_advertising_page=true`. Plus a `torts` row for ad-pipeline keying. CLAUDE.md §6.5 codifies this.
- 2026-05-21 — **Consumer-report concentration vs 36.6% baseline is the lawyer-flood proxy.** Mass-tort claimant intake routed through manufacturers stays tagged as consumer-sourced (qualification=5), so a per-drug consumer share dramatically above 36.6% is a preliminary litigation-activity indicator. Validated on Ozempic+gastroparesis at 74.2%. NOT a clinical finding — must be flagged as preliminary signal in on-page methodology notes.
- 2026-05-22 — **Exact-timestamp migration collisions silently freeze the entire queue.** PR #396 added `20260521000000_document_invitations_schema.sql` while the GLP-1 FAERS PR (sha 8b4ebe8) had already registered `20260521000000` in `schema_migrations`. `supabase db push` aborts with `duplicate key value violates unique constraint "schema_migrations_pkey"` → every later push fails at the same point, so PRs #397 (depo-provera) and #398 (dupixent) couldn't apply their own innocent migrations either. Fix: rename the colliding file to a fresh timestamp (idempotent migrations re-apply as no-ops). Going forward, run `ls supabase/migrations/ | grep ^<your-timestamp>` before authoring a new migration. Codified in CLAUDE.md §11.

---

## Dataset lessons — FAERS

### Source / pipeline
- Source: openFDA `/drug/event.json` (serious events only, primary filter).
- Pipeline: `pipeline/pipelines/faers_weekly.py` — Mondays 03:00 UTC via `faers-weekly.yml`. Adaptive weekly→daily chunking with >25k overflow detection. Per-table hard-coded upsert chunk sizes: `PARENT_CHUNK_SIZE=100` for `drug_adverse_events` (JSONB payload), `CHILD_CHUNK_SIZE=500` for drugs/reactions, `DIM_CHUNK_SIZE=500` for dim tables.
- Volume: 1,583,293 serious events, 8.16M drug rows, 5.57M reaction rows. Spans Jan 2024 – March 2026 (27 months). openFDA refresh lags 6–12 weeks; April 2026+ not yet published as of May 21. Weekly cron catches new months automatically.
- Consumer baseline: 36.61% across full dataset. Reference for per-drug lawyer-flood proxy.

### Data shape lessons (vs predictions)
- 2026-05-15 — **Drug match-path distribution is 87.7% name-fallback / 12.3% NDC, NOT NDC-heavy as predicted.** FAERS reports often lack NDCs, and when NDC fails the chain falls all the way through (UNII/RxCUI/AppNo only trigger when NDC enrichment succeeds first).
- 2026-05-15 — **`primarysource_qualification=4` (lawyer) is only 0.45% of reports, NOT 5–15% as predicted.** Mass-tort intake routes through manufacturers, inflating consumer (5 = 35.6%) not lawyer. Real lawyer-flood detection needs anomaly analysis (consumer-rate spike vs baseline) or `companynumb` pattern matching, not a simple qualification filter.
- 2026-05-15 — **`drug_manufacturer_aliases` is empty by design** (PR #382 — pipeline records misses, table is human-curated). Will need seeding for named torts in PR-4.
- 2026-05-21 — **FAERS canonical preferred terms are NOT what their common names suggest.** Gastroparesis MDL injury is filed under "Impaired gastric emptying" (3,342 occurrences) — literal "Gastroparesis" appears zero times. NAION (MDL 3163 core injury) is filed under "Optic ischaemic neuropathy" (767 occurrences) — literal "NAION" appears zero times. Lesson: never assume FAERS uses the layperson injury name; always investigate canonical PTs against actual data before building term filters.

### Query / index gotchas
- 2026-05-21 — **Substring ILIKE over the 8.16M-row `drug_adverse_event_drugs.medicinalproduct` table times out at the 8s Postgres query limit.** Exact-match arrays against the existing btree index (`medicinalproduct = ANY(ARRAY[...])`) are the only viable matching strategy without adding trigram indexes.

### Per-tort canonical terms (verified against live data)
- 2026-05-22 — **Depo-Provera:** brand `["DEPO-PROVERA"]` (oral PROVERA + generic MPA excluded); injury = meningioma, literal `Meningioma` PT exists (8-term spectrum). 95.2% lawyer-sourced → lawyer concentration mode. See `faers-depo-provera.ts`.
- 2026-05-22 — **Dupixent (dupilumab) has NO single dominant injury in FAERS.** Largest reaction clusters are ocular-surface disease (~1,608 reports) and joint/arthritis (~1,604) — but both are **0.0% lawyer-filed** (on-label ADRs, no litigation footprint). The litigation-shaped cluster is **cutaneous T-cell lymphoma**: 198 qualifying reports, **5.56% lawyer (7.6× the 0.73% baseline)**, 4.5% fatal — theory is dupilumab unmasking CTCL misdiagnosed as atopic dermatitis. Chosen as the Dupixent tort. Brand map `["DUPIXENT","DUPILUMAB"]` — generic INN **included** here (departure from GLP-1/Depo rule) because dupilumab is a single-source biologic with no generic competitor, so the INN maps 1:1 to the brand. CTCL PTs: FAERS codes these as `Cutaneous T-cell lymphoma`, NOT `Mycosis fungoides`/`Sezary syndrome` (neither PT appears). Bare `Lymphoma` excluded — verified 0.0% lawyer, B-cell-ambiguous. See `faers-dupixent.ts`.

---

## Open questions / blockers

*None logged yet.*

---

## Sibling docs

- `CLAUDE.md` — orchestration rules + repo map. Read first.
- `CURRENT_PRIORITIES.md` — what's actively in play this week.
- `PROJECT_BRIEF.md` — product overview, audiences, pricing direction.
- `docs/data-sources/{faers,maude,cpsc}.md` — per-source research scoping reports.
- `docs/state-onboarding.md` — runbook for adding a new state surface.
