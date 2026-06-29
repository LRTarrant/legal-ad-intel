# Phase 3 Prep — Legacy-State Migration-Readiness Audit

**Date:** 2026-06-29 · **Author:** Claude Code (5 parallel read-only sub-agent audits, synthesized + spot-verified) · **Status:** read-only audit, no code changed.

**Scope:** the 5 remaining custom legacy State Intelligence pages — **Arizona, California, Florida, Georgia, Tennessee** — vs the shared `v2/[slug]` shell (post-#512) + `lib/state-config/_types.ts`. Goal: decide whether migrating them onto the shell and deleting the bespoke clients (~6k lines) is lossless, and produce the exact `_types.ts` additions needed.

---

## TL;DR

**The first-pass diff underestimated the gap.** It is still a GO for every state, but it is **not** a pure "transcribe 3 const blocks into a config" job. Two first-pass claims are **refuted**:

1. **"Zero bespoke SignalCards / generic Cross-Signal Insights is sufficient."** Every legacy page renders a **Cross-Signal Insights** section, and 3 of 5 (AZ, CA, FL) build cards that are *richer* than the v2 shell's 5 fixed title+tip slots — they carry **stat-lines + custom topics** (CA even has a *Cancer Incidence* card and a **Pedestrian/Bicycle case-type card that replaces Boating**). The v2 shell has no home for these today.
2. **"~none content loss."** True for the **data/fetch layer** (all 5 fetch the same RPCs/tables the shell already fetches — zero signal loss) and for the **county map** (all 5 geometries are registered). **Not** true for the **display layer**: rate-based snapshot tiles (CA/FL), bespoke numeric facts (motorcycle registrations, ped/bike/hispanic-worker stats), insight stat-lines, and **Georgia's native FARS "Crash Intelligence" charts** have no config home.

**Recommended path: two phases, not one.**
- **Phase 3a — shell enhancement (one PR):** add the consolidated *optional* `_types.ts` fields below + teach the v2 shell to render them (custom insights, config-driven partial-year labels, rate tiles). Nothing here breaks the ~40 existing v2 states (all additions are optional).
- **Phase 3b — per-state config authoring (state-batch fan-out, 5 states):** once the shell can hold everything, authoring the 5 `state-config` entries is a clean, near-identical fan-out — a strong **`state-batch` workflow** candidate.
- **Alternative — "good-enough" lossy migration (skip 3a):** accept dropping the rate tiles, insight stat-lines, the CA ped/bike card, and GA's crash charts, folding prose into existing fields. That collapses to a near-pure config-only state-batch. **This is a fidelity call only Lance can make.**

**Geometry:** all 5 slugs (`arizona`, `california`, `florida`, `georgia`, `tennessee`) are registered in `GEOMETRY_LOADERS` — the shell's county map works for them immediately. Non-issue.

---

## Per-state verdicts

| State | Verdict | Data/fetch | New `_types` fields | Structural gaps (display) | Notes |
|---|---|---|---|---|---|
| **Tennessee** | **GO** (config exists, ~95%) | lossless | none (shares GA's `partialYearLabels`) | none | `tennessee.ts` already carries every section. Confirm the intentional FARS-2024 fatality refresh; optionally set `viabilityNote`. |
| **Georgia** | **GO** w/ decision | lossless **except** 2 extra FARS fetches | `StateInjuryData.partialYearLabels?` (required) | native **"Georgia Crash Intelligence"** 3-chart section (LineChart + bars) | Injury table is config-ready (exact `InjuryDataRow` match). Decide crash-charts: add to shell / convert to iframe `crashEmbeds` / drop. |
| **Arizona** | **GO** w/ additions | lossless | `motorcycleRegistrations`, `hispanicWorkerFatalities`, `hispanicWorkerFatalitySharePct` | 5 Cross-Signal cards w/ stat-bullets | Cleanest of the four new configs once `customInsights[]` exists. |
| **Florida** | **GO** w/ additions | lossless | ~11 stat fields (rates, ped/bike, employment, hispanic, falls-share) | rate snapshot tiles; 6 insight cards (4 themed); no boating const | ~half the legacy const fields are dead code → smaller real surface. |
| **California** | **GO only after shell enhancement** (heaviest) | lossless | ~13 stat fields (rates, ped/bike, registrations, helmet, employment, hispanic) | rate tiles; **Ped/Bike case card replaces Boating**; 6 insight cards incl. **Cancer** (no topical slot) | Should *drive* the generalization (custom insights + ped/bike + rate tiles), not be a routine transcription. |

---

## The consolidated `_types.ts` additions (authoritative)

All **optional** — zero impact on the ~40 existing v2 configs. Field names unified across states (agents proposed per-state names; these are the merged set).

### `StateInjuryData` (1 field — required for GA, benefits TN)
```ts
/** Per-year display label for partial/incomplete years, e.g. { 2022: "(through Nov 2022)" }.
 *  The v2 shell currently HARDCODES { 2025: "(Jan–Sept)" } — wire it to read this instead. */
partialYearLabels?: Record<number, string>;
```
> **Why required, not optional in practice:** GA's injury data ends "through Nov 2022"; the shell's hardcoded `{2025:"(Jan–Sept)"}` would mislabel it. TN's value happens to match the hardcode (2025), so TN works by coincidence today — making it config-driven fixes GA and makes TN explicit.

### `TrafficStatsBlock` (optional, `number | null`)
```ts
registeredMotorcycles?: number;          // AZ (motorcycleRegistrations), CA (registeredMotorcycles)
fatalityRatePerVmt?: number;             // CA, FL  (per 100M VMT)
nationalFatalityRatePerVmt?: number;     // CA, FL
pedestrianFatalities?: number;           // CA, FL
bicycleFatalities?: number;              // CA, FL
hitAndRunFatalCrashes?: number;          // CA
helmetUsePct?: number;                   // CA
motorcycleFatalityRatePer100k?: number;  // CA (else keep as prose)
```

### `WorkplaceStatsBlock` (optional, `number | null`)
```ts
constructionWorkers?: number;                  // CA, FL (employment)
constructionEmploymentYoYPct?: number;         // FL
truckingWorkers?: number;                       // CA, FL
truckingAvgPay?: number;                        // CA
workplaceFatalityRatePer100k?: number;          // CA, FL
nationalWorkplaceFatalityRatePer100k?: number;  // CA, FL
hispanicWorkerFatalities?: number;              // AZ (count)
hispanicWorkerFatalitySharePct?: number;        // AZ, FL, CA (%)
constructionFallsSharePct?: number;             // FL
```

### `StateContent` — the key structural addition (absorbs ALL insight cards losslessly)
```ts
/** Flexible cross-signal insight cards. When present, the v2 shell renders these
 *  instead of its 5 fixed title+tip cards. Holds the legacy stat-lines + custom
 *  topics (AZ heat/Navajo, CA Cancer/lane-splitting, FL hurricane/pedestrian, …). */
customInsights?: {
  icon?: string;                                  // lucide name or emoji
  title: string;
  tone?: "teal" | "emerald" | "red" | "amber" | "steel";
  stats?: { label: string; value: string }[];     // the per-card stat-lines
  body: string;                                    // the "tip"/so-what paragraph
}[];
```
> This single field replaces the lossy "map each card into one of the 5 fixed `marketSaturation/freightCorridor/solUrgency/internetAccess/outOfState` title/tip slots" approach. TN + GA *do* fit the 5 fixed slots (title overridable); AZ/CA/FL do not. `customInsights[]` covers all five states uniformly.

### `CommuteStatsBlock` — no additions
The existing 3 fields (`driveAlone`, `nationalAvg`, `avgCommuteMinutes`) suffice. Every legacy `COMMUTE*` block is largely dead code (CA/FL/AZ never render it; carpool/wfh/transit/county arrays drop with no loss).

---

## Shell wiring needed in Phase 3a (beyond `_types`)

These are renderer changes in `state-intelligence-client.tsx` (+ maybe `page.tsx`), all guarded so existing states are unaffected:

1. **Partial-year labels:** read `config.injuryData.partialYearLabels` instead of the hardcoded `{2025:"(Jan–Sept)"}` (line ~504).
2. **Custom insights:** if `config.content.customInsights` is set, render those cards (icon + title + stat-lines + body); else the current 5 fixed cards.
3. **Rate snapshot tiles (CA/FL):** when `fatalityRatePerVmt` / `workplaceFatalityRatePer100k` are present, show the rate-framed tiles (vs national) instead of / alongside the count tiles. Small snapshot tweak.
4. **CA Pedestrian/Bicycle case-type card:** CA replaces the Boating card with a Ped/Bike card. Options: a `features.showBoating:false` + a config-driven extra case card, OR a `caseTypeCards` override, OR accept the boating-slot squat (lossy). **CA decision.**
5. **Georgia native FARS "Crash Intelligence":** the 3-chart section (yearly trend + top counties + by-crash-type) needs `get_fars_yearly_trend` + `fars_fatalities` fetches and a chart component the shell lacks. Options: (a) port the section + 2 fetches into the shell behind a feature flag, (b) convert GA to iframe `crashEmbeds` (like TN), (c) drop it (relies on the County Intelligence map for crash data). **GA decision.**

---

## Items needing sourcing (values exist in prose/comments, not in interface-required consts)

Per-state, the migration must source a few **required** `TrafficStatsBlock`/`WorkplaceStatsBlock` fields the legacy const didn't carry (the bespoke pages just never rendered them):
- **AZ:** `trafficStats.reportYear=2023` + `sourceLabel="ADOT Motor Vehicle Crash Facts 2023"`; `workplaceStats.reportYear=2023`.
- **GA:** `ruralFatalities=559` (in source comment) + `urbanFatalities=1056`; `reportYear=2023`, `sourceLabel="GOHS 2023"`; `qcewCoveredEmployment=4,802,800` (+ `totalEmployment`).
- **FL:** `unrestrainedFatalities`, `distractedDrivingFatalCrashes`, `totalEmployment`, `qcewCoveredEmployment`, `constructionPctTotal`, `transportWarehouseFatalities`, `fallsSlipsTrips`, `transportationIncidents`, `reportYear`. (FL's consts carry employment/% figures in the *wrong unit* for these count fields.)
- **CA:** `totalCrashes`, `speedRelatedFatalities/Pct`, `distractedDrivingFatalCrashes`, `urbanFatalities`, `reportYear`, `sourceLabel`; workplace `totalEmployment`, `qcewCoveredEmployment`, `transportWarehouseFatalities`, `truckTransportFatalities`, `transportationIncidents`, `reportYear`; commute `nationalAvg=68.7`, `avgCommuteMinutes`.
- **TN:** none — `tennessee.ts` already supplies everything; just confirm the FARS-2024 fatality figures (1197 / 309 / 713 / 483 vs legacy TDOSHS-2023 1299 / 345 / 706 / 593) and the `injuryData` source string/URL swap (TITAN / data.tn.gov vs the legacy `Injuries.pdf`) are intended (matches the Texas FARS-refresh pattern; produces a *visibly different* fatality number + rural share).

---

## Dead code (defined but never rendered → safe to drop, not migrated)

Confirms the surface is smaller than the file sizes suggest:
- **AZ:** entire `COMMUTE` block; `ADOT.localRoadFatalities/stateHighwayFatalities`; `BLS.constructionManagers/qcewYoY/avgWeeklyWage/workers25to54Pct`.
- **FL:** entire `COMMUTE_FL` block; `FLHSMV.dailyAvgCrashes/totalInjuries2023`; `BLS_FL.constructionPctPrivate/truckingYoY/transportWarehouseTotal/constructionAvgPay/truckingAvgPay`.
- **CA:** entire `COMMUTE` block; `OTS.teenDriverFatalCrashes/seatBeltUse/nationalRate/ruralFatalShare(const)`; `BLS.constructionAvgPay/YoY/establishments/transportWarehouseTotal/specialtyTradeContractors`.

---

## Recommendation to Lance

1. **Pick a fidelity bar.** Lossless (Phase 3a shell-enhance, then config) vs good-enough (skip 3a, accept the listed display losses, near-pure config-only).
2. **If lossless:** approve the consolidated `_types.ts` additions above + the 5 shell-wiring items. Two open product decisions: **GA crash charts** (port / iframe / drop) and **CA ped/bike card** (override / drop). I'd port GA's charts behind a flag (it's a genuinely useful surface) and add the CA ped/bike card via a small case-type override — both one-time, then they're available to any state.
3. **Then fan out.** With the shell ready, authoring the 5 configs (TN just needs completion) is a textbook **`state-batch`-style workflow** (~5 near-identical config-authoring agents + a verify pass). Estimated: 1 shell-enhancement PR + 1 fan-out PR (or 5 small PRs).
4. **Sequencing:** TN first (config exists, lowest risk → proves the migration path end-to-end), then AZ (cleanest new config), then FL/GA, then CA (heaviest, drives any remaining generalization).

The migration handoff (author configs, repoint the 5 sidebar links `/state-intelligence/{state}` → `/v2/{slug}`, delete the 5 client + `page.tsx` files, prod-verify each) should be written after Lance picks the fidelity bar and signs off on the GA/CA decisions.
