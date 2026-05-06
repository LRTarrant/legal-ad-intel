# CURRENT_PRIORITIES.md — Legal Marketing Intelligence

Last updated: 2026-05-06

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

**Goal:** Give PI firms a credible, data-grounded way to plan and launch PI campaigns by state/market, starting with motor-vehicle PI, then expanding to other PI categories. [cite:62][cite:67]

Current focus:
- State-level PI surfaces for priority states (e.g., AL, TX, FL, CA, NY) showing:
  - Injury/fatality risk (FARS first)
  - Basic demographics / population
  - Simple “so what” guidance for PI marketing decisions
- Tight integration between PI state views and the PI Campaign Builder flow (torts + geos + budgets + creative + CSVs). [cite:67][cite:85]

Definition of “good enough for demos”:
- For at least a handful of states:
  - PI state pages load quickly and don’t show obviously broken or empty sections.
  - Campaign Builder can select those states and produce:
    - Strategic brief
    - Geo recommendations
    - Creative (radio, video, Meta/Google)
    - Working CSV exports (Meta + Google) that import without errors. [cite:82][cite:85]

### B. Mass torts

**Goal:** Make every mass-tort page feel like a serious, layered decision tool for mass-tort and PI firms, not just a brochure. [cite:61][cite:65]

Current focus:
- Standardize all tort pages on:
  - Shared criteria / qualification model (centralized questions + disqualifiers). [cite:66]
  - 4–5 layered signals per tort (e.g., incidence, regulatory/AG activity, docket/MDL posture, judicial profiles, viability).
- Ensure Campaign Builder can leverage these criteria for future mass-tort flows, even if PI flows are prioritized first. [cite:66][cite:67]

Definition of “good enough for demos”:
- Each priority tort page:
  - Uses the central criteria store.
  - Shows at least 3–4 meaningful signal blocks.
  - Has sample creative / campaign ideas grounded in those signals.

### C. Data & automation

**Goal:** Move toward “Computer builds, GitHub Actions/Supabase cron run,” so recurring data stays fresh without manual runs. [file:32][cite:75][cite:76]

Current focus:
- Treat FARS + storm + a small set of other key sources as the first fully automated pipelines.
- Ensure GitHub Actions wired to Searchapi.io, OpenAI, Apify, ElevenLabs, etc., are clearly documented and easy to extend. [cite:75][cite:76]

Short-term definition of done:
- At least one end-to-end pipeline (e.g., FARS → normalized table → PI state surface) with:
  - Documented GitHub Action
  - Clear table naming (raw/normalized/published)
  - Basic run-logging and failure-handling rules

---

## 3. Concrete work items (short list)

These should be 5–10 items max and updated weekly.

1. **PI States:** Implement the first wave of PI state pages (e.g., AL + 2–3 other states) wired to existing FARS data and basic demographics. [cite:62][cite:85]
2. **PI States ⇄ Campaign Builder:** Ensure the PI Campaign Builder can consume state-level data for geo recommendations and copy. [cite:67][cite:85]
3. **Tort criteria centralization:** Finish central criteria store and migrate the remaining tort pages to it. [cite:66][cite:61]
4. **Automation v1:** Document and stabilize FARS pipeline using existing GitHub Actions + Supabase, including a simple run log. [cite:75][cite:76]
5. **Trial subscription seeder (queued):** Implement invite-based trial subscription creation so invitees get a proper `subscriptions` row, but this can wait a few days. [cite:71]
6. **States UX polish:** Clean up any obvious rough edges on state pages that affect demos (labels, missing data messaging, loading states, etc.). [cite:62]

---

## 4. Parking lot (not active this week)

These are important but explicitly **not** in scope for the current week:

- Full population-rate normalization on geo metrics (per PR D.5 follow-up). [cite:85]
- Super-admin pronunciation editor UI for TTS. [cite:70]
- Still-image watermarking for Meta ad previews.
- Trial subscription seeder, if not yet pulled into the active list above. [cite:71]
- Agency-style proposal PDF generator (post-CSV exports). [cite:83]

---

## 5. State Intelligence Pages — Cleanup Arc (closed)

Closed in this arc:
- NC, MI, NY narrative / cross-signal cards audited and cleaned (pass 1)
- Placeholder-zero pattern eliminated for visible fields across MI, NC, IL, PA, OH
  (speedRelatedFatalities, alcoholRelatedFatalities, truckTransportFatalities, speedRelatedPct)
  → established convention: 0-as-no-data → null → existing "unavailable" render path
- OH alcohol-fatality denominator mismatch corrected: replaced OSHP 2024 OVI-related
  figures (589 / 50.95%) with FARS 2023 alcohol-impaired figures (455 / 36.6%) for
  cross-state methodological consistency
- OH constructionPctTotal precision normalized (19.512 → 19.5)
- Cross-state alcohol sourcing audited: no other states had OVI-style denominator
  mismatches; NC/NY/IL/MI/PA all in the 22–37% FARS-comparable range

Queue (next data-fill pass):
- NC, MI rural/urban fatalities (currently render as "—")
- MI, NC, OH unrestrainedFatalities (placeholder zeros, not currently rendered)
- IL, PA, OH distractedDrivingFatalCrashes (placeholder zeros, not currently rendered)
- PA rural/urban fatalities (placeholder zeros)
- PA, OH, IL state-specific narrative content depth

Parked (cosmetic / non-blocking):
- NY totalCrashes rounded vs exact
- MAJOR_METROS dead variable in state-intelligence-client.tsx
- Per-field year labels (currently single reportYear, mixed-vintage documented inline)
- Cross-state QCEW employment rounding consistency

---

## 6. How AI tools should use this file

- **Claude:** Treat this as the source of truth for what features are “in play” this week; don’t start work outside these items unless explicitly asked. [file:32][cite:60]
- **Perplexity Computer:** Use this to decide what’s high-value when orchestrating multi-step tasks; everything else belongs in backlog. [file:32]
- **ChatGPT:** Use it to prioritize debugging and small fixes that unblock these items first.
