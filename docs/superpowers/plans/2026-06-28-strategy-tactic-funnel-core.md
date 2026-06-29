# Strategy Engine — Tactic + Funnel Core (Plan 2 of 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the deterministic tactic-scoring layer — a curated tactic library (funnel stage + min-spend + prerequisites + geo-granularity per tactic), goal→funnel weighting, budget-honesty math, and a scorer that turns `StrategyInputs` + the interview into a scored tactic menu — as a pure, fully-tested module that the Plan 3 AI core will consume.

**Architecture:** Two new pure modules in `web/lib/strategy-engine/`. `tactics.ts` holds the static facts (the `Tactic` type, `TACTIC_LIBRARY`, the goal→funnel weight table, and budget helpers). `tactic-scoring.ts` holds the integration: `buildTacticMenu(inputs, opts)` reads per-channel `fit`/`competition` off the existing `StrategyInputs.channels`, applies funnel weights and affordability, and returns a `TacticMenu` (scored tactics + budget context + market opportunity intensity). Nothing wires into the route or UI in this plan — that is Plan 3. This plan ships a working, unit-tested library.

**Tech Stack:** TypeScript, `node:test` + `node:assert/strict` run via `npx tsx --test`. No new dependencies. Pure functions only (no Supabase, no network, no AI).

## Global Constraints

- **Test runner:** `npx tsx --test <file>` from `web/`. Bare `node --test` fails on the repo's extensionless relative imports. Import sibling modules WITHOUT the `.ts` extension (e.g. `from "./tactics"`), matching every existing test file — a `.ts` extension triggers TS5097.
- **No net-new TypeScript errors** vs main (`pr-typecheck.yml`). Run `npx tsc --noEmit` from `web/` before finishing; only errors in the files this plan touches count.
- **Reuse existing types, do not redefine them:** import `ChannelKey` and `FunnelStage` from `./types` and `./channel-plan` respectively. `FunnelStage = "awareness" | "consideration" | "conversion"` (the existing literal — "conversion" is the spec's "Intent/Conversion" stage). Do NOT invent a parallel funnel enum.
- **Pure + deterministic:** every function in this plan is a pure function of its inputs. No `Date.now()`, no randomness, no I/O. The AI owns selection/narrative in Plan 3; this layer only computes numbers (spec: "code owns all numbers").
- **All scores normalized to [0,1]** except budget USD amounts and counts. Never emit an absolute reach/impression figure (spec hard rule).
- **Honest degradation:** a missing signal yields `null` (not a fabricated 0 or 0.5). `null` audience fit / competition must propagate, not silently coerce.

---

### Task 1: Tactic library + types (`tactics.ts`)

**Files:**
- Create: `web/lib/strategy-engine/tactics.ts`
- Test: `web/lib/strategy-engine/tactics.test.ts`

**Interfaces:**
- Consumes: `ChannelKey` from `./types`, `FunnelStage` from `./channel-plan`.
- Produces:
  ```ts
  export type Prerequisite =
    | "landing_page" | "conversion_tracking" | "call_tracking" | "fast_intake"
    | "pixel" | "gbp_claimed" | "site_health" | "brand_creative"
    | "video_creative" | "audio_creative" | "credible_brand";
  export type GeoGranularity = "geo_precise" | "dma" | "national";
  export interface Tactic {
    key: string;            // unique, snake_case
    channel: ChannelKey;    // maps to StrategyInputs.channels for fit/competition
    label: string;
    funnel_stage: FunnelStage;
    min_monthly_usd: number;
    prerequisites: Prerequisite[];
    geo_granularity: GeoGranularity;
    long_horizon?: boolean;     // true for SEO (pays off over months)
    format_dimensions?: string[]; // e.g. radio genres
  }
  export const TACTIC_LIBRARY: Tactic[];
  ```

- [ ] **Step 1: Write the failing test**

Create `web/lib/strategy-engine/tactics.test.ts`:

```ts
/**
 * Unit tests for the curated tactic library.
 * Run with: npx tsx --test lib/strategy-engine/tactics.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { TACTIC_LIBRARY } from "./tactics";
import type { ChannelKey } from "./types";

const VALID_CHANNELS: ChannelKey[] = [
  "tv_linear", "ctv", "radio", "podcast", "facebook",
  "instagram", "tiktok", "youtube", "search", "print",
];
const VALID_STAGES = ["awareness", "consideration", "conversion"];

test("library has a healthy spread of tactics", () => {
  assert.ok(TACTIC_LIBRARY.length >= 12, "expected at least 12 curated tactics");
});

test("every tactic is well-formed", () => {
  for (const t of TACTIC_LIBRARY) {
    assert.ok(t.key && /^[a-z0-9_]+$/.test(t.key), `bad key: ${t.key}`);
    assert.ok(VALID_CHANNELS.includes(t.channel), `bad channel on ${t.key}: ${t.channel}`);
    assert.ok(VALID_STAGES.includes(t.funnel_stage), `bad stage on ${t.key}`);
    assert.ok(t.min_monthly_usd > 0, `min spend must be positive on ${t.key}`);
    assert.ok(Array.isArray(t.prerequisites), `prerequisites must be an array on ${t.key}`);
    assert.ok(["geo_precise", "dma", "national"].includes(t.geo_granularity), `bad geo on ${t.key}`);
  }
});

test("tactic keys are unique", () => {
  const keys = TACTIC_LIBRARY.map((t) => t.key);
  assert.equal(new Set(keys).size, keys.length, "duplicate tactic key");
});

test("covers all three funnel stages", () => {
  const stages = new Set(TACTIC_LIBRARY.map((t) => t.funnel_stage));
  assert.ok(stages.has("awareness") && stages.has("consideration") && stages.has("conversion"));
});

test("radio carries format dimensions for the media-brief grammar", () => {
  const radio = TACTIC_LIBRARY.find((t) => t.key === "radio");
  assert.ok(radio?.format_dimensions && radio.format_dimensions.length > 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx tsx --test lib/strategy-engine/tactics.test.ts`
Expected: FAIL — `Cannot find module './tactics'`.

- [ ] **Step 3: Create the tactic library**

Create `web/lib/strategy-engine/tactics.ts`:

```ts
/**
 * Strategy Engine — curated tactic library (deterministic facts).
 *
 * Each tactic decomposes a channel into a funnel-specific buy with a budget
 * floor, foundation prerequisites, and a geo-targeting granularity. This is
 * the menu the Plan 3 AI selects from; it may NOT invent tactics outside it.
 * `channel` maps each tactic onto StrategyInputs.channels so the scorer can
 * read audience fit + competition without a second data source.
 *
 * Min-spend figures are planning floors (the spend below which a tactic can't
 * register), not quotes. OOH/billboards is intentionally omitted from v1 — it
 * has no clean audience-fit signal in media_consumption_baseline (no engine
 * ChannelKey), so including it would mean a fabricated fit. Revisit when an
 * OOH fit signal exists.
 */
import type { ChannelKey } from "./types";
import type { FunnelStage } from "./channel-plan";

export type Prerequisite =
  | "landing_page"
  | "conversion_tracking"
  | "call_tracking"
  | "fast_intake"
  | "pixel"
  | "gbp_claimed"
  | "site_health"
  | "brand_creative"
  | "video_creative"
  | "audio_creative"
  | "credible_brand";

/** How precisely a tactic can target the county-level injury hotspots. */
export type GeoGranularity = "geo_precise" | "dma" | "national";

export interface Tactic {
  /** Unique snake_case key. */
  key: string;
  /** Maps to StrategyInputs.channels for fit + competition lookup. */
  channel: ChannelKey;
  label: string;
  funnel_stage: FunnelStage;
  /** Planning floor in monthly USD — below this the tactic can't register. */
  min_monthly_usd: number;
  prerequisites: Prerequisite[];
  geo_granularity: GeoGranularity;
  /** SEO and the like pay off over months, not days. */
  long_horizon?: boolean;
  /** Format/genre options for the media-brief grammar (e.g. radio genres). */
  format_dimensions?: string[];
}

export const TACTIC_LIBRARY: Tactic[] = [
  // ── Intent / Conversion (bottom funnel) ──────────────────────────────────
  {
    key: "google_search",
    channel: "search",
    label: "Google Search (injury keywords)",
    funnel_stage: "conversion",
    min_monthly_usd: 1500,
    prerequisites: ["landing_page", "conversion_tracking", "call_tracking"],
    geo_granularity: "geo_precise",
  },
  {
    key: "seo_gbp",
    channel: "search",
    label: "SEO + Google Business Profile",
    funnel_stage: "conversion",
    min_monthly_usd: 1500,
    prerequisites: ["gbp_claimed", "site_health"],
    geo_granularity: "geo_precise",
    long_horizon: true,
  },
  {
    key: "meta_lead_form",
    channel: "facebook",
    label: "Meta Lead-Form / Advantage+ conversion",
    funnel_stage: "conversion",
    min_monthly_usd: 1500,
    prerequisites: ["fast_intake"],
    geo_granularity: "geo_precise",
  },
  {
    key: "meta_retargeting",
    channel: "facebook",
    label: "Meta retargeting",
    funnel_stage: "conversion",
    min_monthly_usd: 1500,
    prerequisites: ["landing_page", "pixel"],
    geo_granularity: "geo_precise",
  },
  // ── Consideration (mid funnel) ───────────────────────────────────────────
  {
    key: "google_pmax",
    channel: "search",
    label: "Google Performance Max",
    funnel_stage: "consideration",
    min_monthly_usd: 2500,
    prerequisites: ["landing_page", "conversion_tracking"],
    geo_granularity: "geo_precise",
  },
  {
    key: "google_demand_gen",
    channel: "youtube",
    label: "Google Demand Gen",
    funnel_stage: "consideration",
    min_monthly_usd: 2500,
    prerequisites: ["landing_page"],
    geo_granularity: "geo_precise",
  },
  {
    key: "podcast",
    channel: "podcast",
    label: "Podcast sponsorships",
    funnel_stage: "consideration",
    min_monthly_usd: 3000,
    prerequisites: ["audio_creative"],
    geo_granularity: "national",
  },
  // ── Awareness (top funnel) ───────────────────────────────────────────────
  {
    key: "meta_awareness",
    channel: "facebook",
    label: "Meta broad awareness video",
    funnel_stage: "awareness",
    min_monthly_usd: 2000,
    prerequisites: ["brand_creative"],
    geo_granularity: "geo_precise",
  },
  {
    key: "tiktok_awareness",
    channel: "tiktok",
    label: "TikTok awareness (younger torts)",
    funnel_stage: "awareness",
    min_monthly_usd: 2500,
    prerequisites: ["brand_creative", "video_creative"],
    geo_granularity: "dma",
  },
  {
    key: "youtube_ads",
    channel: "youtube",
    label: "YouTube in-stream / bumper",
    funnel_stage: "awareness",
    min_monthly_usd: 3000,
    prerequisites: ["video_creative"],
    geo_granularity: "geo_precise",
  },
  {
    key: "ctv_ott",
    channel: "ctv",
    label: "CTV / OTT",
    funnel_stage: "awareness",
    min_monthly_usd: 5000,
    prerequisites: ["video_creative", "credible_brand"],
    geo_granularity: "dma",
  },
  {
    key: "radio",
    channel: "radio",
    label: "Broadcast radio",
    funnel_stage: "awareness",
    min_monthly_usd: 5000,
    prerequisites: ["audio_creative"],
    geo_granularity: "dma",
    format_dimensions: ["news_talk", "country", "urban", "spanish", "sports", "classic_hits"],
  },
  {
    key: "linear_tv",
    channel: "tv_linear",
    label: "Linear broadcast TV",
    funnel_stage: "awareness",
    min_monthly_usd: 15000,
    prerequisites: ["video_creative", "credible_brand"],
    geo_granularity: "dma",
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx tsx --test lib/strategy-engine/tactics.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add web/lib/strategy-engine/tactics.ts web/lib/strategy-engine/tactics.test.ts
git commit -m "feat(strategy): curated tactic library with funnel + budget + geo metadata"
```

---

### Task 2: Goal → funnel weighting (`tactics.ts` additions)

**Files:**
- Modify: `web/lib/strategy-engine/tactics.ts`
- Test: `web/lib/strategy-engine/tactics.test.ts` (add cases)

**Interfaces:**
- Consumes: `FunnelStage`.
- Produces:
  ```ts
  export type GoalKind = "max_volume" | "lower_cpa" | "new_tort" | "brand" | "defend";
  export function classifyGoal(goal: string): GoalKind;        // free-text → GoalKind, default "max_volume"
  export function funnelWeights(goal: GoalKind): Record<FunnelStage, number>; // each weight in [0,1]
  ```

- [ ] **Step 1: Write the failing test**

Add to `web/lib/strategy-engine/tactics.test.ts`:

```ts
import { classifyGoal, funnelWeights } from "./tactics";

test("leads/volume goal weights conversion highest", () => {
  const w = funnelWeights("max_volume");
  assert.ok(w.conversion > w.consideration && w.consideration > w.awareness);
  assert.equal(w.conversion, 1);
});

test("brand goal weights awareness highest", () => {
  const w = funnelWeights("brand");
  assert.ok(w.awareness > w.consideration && w.consideration > w.conversion);
  assert.equal(w.awareness, 1);
});

test("all weights are within [0,1]", () => {
  for (const g of ["max_volume", "lower_cpa", "new_tort", "brand", "defend"] as const) {
    const w = funnelWeights(g);
    for (const stage of ["awareness", "consideration", "conversion"] as const) {
      assert.ok(w[stage] >= 0 && w[stage] <= 1, `${g}.${stage} out of range`);
    }
  }
});

test("classifyGoal maps free text and defaults to max_volume", () => {
  assert.equal(classifyGoal("We want maximum case volume"), "max_volume");
  assert.equal(classifyGoal("lower our cost per case"), "lower_cpa");
  assert.equal(classifyGoal("build the brand"), "brand");
  assert.equal(classifyGoal("enter a new tort"), "new_tort");
  assert.equal(classifyGoal("defend our market share"), "defend");
  assert.equal(classifyGoal("something unclassifiable"), "max_volume");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx tsx --test lib/strategy-engine/tactics.test.ts`
Expected: FAIL — `classifyGoal`/`funnelWeights` not exported.

- [ ] **Step 3: Add the weighting functions**

Append to `web/lib/strategy-engine/tactics.ts`:

```ts
/**
 * The interview's primary objective. Maps the user's goal onto a funnel
 * emphasis: leads-shaped goals pull weight to conversion, brand-shaped goals
 * pull it to awareness. The AI (Plan 3) uses these weights as the "match the
 * goal with the tactic" rule.
 */
export type GoalKind = "max_volume" | "lower_cpa" | "new_tort" | "brand" | "defend";

const FUNNEL_WEIGHTS: Record<GoalKind, Record<FunnelStage, number>> = {
  max_volume: { awareness: 0.2, consideration: 0.35, conversion: 1 },
  lower_cpa: { awareness: 0.15, consideration: 0.3, conversion: 1 },
  new_tort: { awareness: 1, consideration: 0.7, conversion: 0.4 },
  brand: { awareness: 1, consideration: 0.6, conversion: 0.3 },
  defend: { awareness: 0.5, consideration: 1, conversion: 0.8 },
};

export function funnelWeights(goal: GoalKind): Record<FunnelStage, number> {
  return FUNNEL_WEIGHTS[goal];
}

/**
 * Best-effort classifier for the interview's free-text / controlled goal.
 * Plan 4 may pass a controlled GoalKind directly; until then this keyword map
 * keeps the engine working off the existing free-text `goal`. Defaults to
 * max_volume (the most common PI objective) when nothing matches.
 */
export function classifyGoal(goal: string): GoalKind {
  const g = goal.toLowerCase();
  if (/(cost per|cpa|cpl|cheaper|efficien)/.test(g)) return "lower_cpa";
  if (/(new tort|enter|expand into|launch)/.test(g)) return "new_tort";
  if (/(brand|awareness|recogni|top of mind)/.test(g)) return "brand";
  if (/(defend|protect|hold|incumbent|share)/.test(g)) return "defend";
  if (/(volume|more cases|max|scale|grow)/.test(g)) return "max_volume";
  return "max_volume";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx tsx --test lib/strategy-engine/tactics.test.ts`
Expected: PASS (all tactic + weighting tests).

- [ ] **Step 5: Commit**

```bash
git add web/lib/strategy-engine/tactics.ts web/lib/strategy-engine/tactics.test.ts
git commit -m "feat(strategy): goal-to-funnel weighting + free-text goal classifier"
```

---

### Task 3: Budget honesty (`tactics.ts` additions)

**Files:**
- Modify: `web/lib/strategy-engine/tactics.ts`
- Test: `web/lib/strategy-engine/tactics.test.ts` (add cases)

**Interfaces:**
- Produces:
  ```ts
  export function budgetTierToMonthlyUsd(tier: string): number;   // controlled tier → representative monthly USD
  export function isAffordable(tactic: Tactic, monthlyUsd: number): boolean;
  export function recommendedTacticCount(monthlyUsd: number): number; // concentration rule, 1..6
  ```

- [ ] **Step 1: Write the failing test**

Add to `web/lib/strategy-engine/tactics.test.ts`:

```ts
import { budgetTierToMonthlyUsd, isAffordable, recommendedTacticCount, TACTIC_LIBRARY as LIB } from "./tactics";

test("a $2k budget funds search/SEO but not radio or TV", () => {
  const search = LIB.find((t) => t.key === "google_search")!;
  const radio = LIB.find((t) => t.key === "radio")!;
  const tv = LIB.find((t) => t.key === "linear_tv")!;
  assert.equal(isAffordable(search, 2000), true);
  assert.equal(isAffordable(radio, 2000), false);
  assert.equal(isAffordable(tv, 2000), false);
});

test("concentration rule keeps low budgets focused", () => {
  assert.equal(recommendedTacticCount(2000), 1);
  assert.equal(recommendedTacticCount(8000), 2);
  assert.equal(recommendedTacticCount(50000), 6); // capped
  assert.ok(recommendedTacticCount(500) >= 1);    // floor
});

test("budget tiers map to representative monthly USD", () => {
  assert.ok(budgetTierToMonthlyUsd("under_10k") < budgetTierToMonthlyUsd("10k_25k"));
  assert.ok(budgetTierToMonthlyUsd("25k_75k") < budgetTierToMonthlyUsd("75k_plus"));
  // legacy tiers still resolve (used by the current interview until Plan 4)
  assert.ok(budgetTierToMonthlyUsd("under_25k") > 0);
  assert.ok(budgetTierToMonthlyUsd("unknown_tier") > 0); // safe default, never 0
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx tsx --test lib/strategy-engine/tactics.test.ts`
Expected: FAIL — budget helpers not exported.

- [ ] **Step 3: Add the budget helpers**

Append to `web/lib/strategy-engine/tactics.ts`:

```ts
/**
 * Budget honesty. The plan must be realistic about what a budget can fund:
 * an affordability filter (don't pitch a tactic below its floor) and a
 * concentration rule (at low budgets, do 1-2 tactics well rather than five
 * badly). Code owns these numbers; the AI narrates honestly within them.
 */

/** Representative planning monthly USD for a controlled budget tier. */
const BUDGET_TIER_USD: Record<string, number> = {
  // Plan 4 tiers
  under_10k: 7000,
  "10k_25k": 17000,
  "25k_75k": 50000,
  "75k_plus": 100000,
  // legacy interview tiers (kept until Plan 4 swaps the field)
  under_25k: 17000,
  "25k_plus": 50000,
};

export function budgetTierToMonthlyUsd(tier: string): number {
  return BUDGET_TIER_USD[tier] ?? 7000; // safe default, never 0
}

export function isAffordable(tactic: Tactic, monthlyUsd: number): boolean {
  return tactic.min_monthly_usd <= monthlyUsd;
}

/**
 * How many tactics a budget can realistically support. Roughly one more tactic
 * per ~$6k above the entry floor, clamped to [1,6]. A $2k budget → 1 tactic;
 * ~$8k → 2; large budgets cap at 6 (beyond that, depth beats breadth).
 */
export function recommendedTacticCount(monthlyUsd: number): number {
  const n = 1 + Math.floor((monthlyUsd - 1500) / 6000);
  return Math.max(1, Math.min(6, n));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx tsx --test lib/strategy-engine/tactics.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/strategy-engine/tactics.ts web/lib/strategy-engine/tactics.test.ts
git commit -m "feat(strategy): budget affordability filter + concentration rule"
```

---

### Task 4: The tactic scorer (`tactic-scoring.ts`)

**Files:**
- Create: `web/lib/strategy-engine/tactic-scoring.ts`
- Test: `web/lib/strategy-engine/tactic-scoring.test.ts`

**Interfaces:**
- Consumes: `StrategyInputs`, `ChannelSignal`, `LocalSignal` from `./types`; `Tactic`, `GoalKind`, `TACTIC_LIBRARY`, `funnelWeights`, `isAffordable`, `recommendedTacticCount` from `./tactics`.
- Produces:
  ```ts
  export interface ScoredTactic {
    tactic: Tactic;
    funnel_fit: number;                 // [0,1], goal × stage weight
    audience_fit: number | null;        // [0,1] from StrategyInputs.channels, null if no signal
    audience_fit_scope?: "general" | "news_proxy";
    audience_fit_sources?: string[];
    competition: number | null;         // [0,1] from StrategyInputs.channels
    whitespace: number | null;          // 1 - competition, or null
    affordable: boolean;
    composite: number;                  // [0,1] diagnostic blend for ordering only
  }
  export interface TacticMenu {
    goal: GoalKind;
    budget_monthly_usd: number;
    recommended_tactic_count: number;
    market_opportunity_intensity: number | null; // [0,1] directional, from local_signal
    tactics: ScoredTactic[];            // sorted by composite desc
  }
  export function computeOpportunityIntensity(local: LocalSignal | null): number | null;
  export function buildTacticMenu(
    inputs: StrategyInputs,
    opts: { goal: GoalKind; budgetMonthlyUsd: number },
  ): TacticMenu;
  ```

- [ ] **Step 1: Write the failing test**

Create `web/lib/strategy-engine/tactic-scoring.test.ts`:

```ts
/**
 * Unit tests for the deterministic tactic scorer.
 * Run with: npx tsx --test lib/strategy-engine/tactic-scoring.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { buildTacticMenu, computeOpportunityIntensity } from "./tactic-scoring";
import type { StrategyInputs, ChannelSignal } from "./types";

function makeInputs(over: Partial<StrategyInputs> = {}): StrategyInputs {
  const channels: ChannelSignal[] = [
    { channel: "search", fit: 0.9, competition: 0.8, fit_scope: "general", fit_sources: ["Pew"] },
    { channel: "facebook", fit: 0.6, competition: 0.4 },
    { channel: "radio", fit: 0.8, competition: 0.2 },
    { channel: "tv_linear", fit: 0.7, competition: 0.6 },
  ];
  return {
    state_abbr: "AL", state_name: "Alabama",
    tort_slug: "car_accident", tort_label: "Auto Accident",
    saturation: 0.4, total_advertisers: 12,
    top_advertisers: [], channels, outlets: [], county_dma: [],
    top_dma_name: "Birmingham",
    local_signal: { source: "FARS", top_counties: [{ county_name: "Jefferson", deaths_per_100k: 14, rural_pct: 0.1 }] },
    available: { saturation: true, competition: true, audience_fit: true, outlets: false, local_signal: true },
    ...over,
  };
}

test("a max_volume goal ranks a conversion tactic above an awareness tactic", () => {
  const menu = buildTacticMenu(makeInputs(), { goal: "max_volume", budgetMonthlyUsd: 50000 });
  const search = menu.tactics.find((s) => s.tactic.key === "google_search")!;
  const radio = menu.tactics.find((s) => s.tactic.key === "radio")!;
  assert.ok(search.funnel_fit > radio.funnel_fit, "conversion funnel_fit should beat awareness for volume");
  assert.ok(menu.tactics.indexOf(search) < menu.tactics.indexOf(radio), "search should rank above radio");
});

test("audience fit + competition are read off StrategyInputs.channels", () => {
  const menu = buildTacticMenu(makeInputs(), { goal: "max_volume", budgetMonthlyUsd: 50000 });
  const search = menu.tactics.find((s) => s.tactic.key === "google_search")!;
  assert.equal(search.audience_fit, 0.9);
  assert.equal(search.competition, 0.8);
  assert.ok(Math.abs((search.whitespace ?? 0) - 0.2) < 1e-9);
  assert.equal(search.audience_fit_scope, "general");
});

test("missing channel signal yields null fit, not a fabricated number", () => {
  const inputs = makeInputs({ channels: [{ channel: "search", fit: 0.9, competition: 0.8 }] });
  const menu = buildTacticMenu(inputs, { goal: "max_volume", budgetMonthlyUsd: 50000 });
  const tiktok = menu.tactics.find((s) => s.tactic.key === "tiktok_awareness")!;
  assert.equal(tiktok.audience_fit, null);
  assert.equal(tiktok.competition, null);
  assert.equal(tiktok.whitespace, null);
});

test("affordability flag respects the budget", () => {
  const menu = buildTacticMenu(makeInputs(), { goal: "max_volume", budgetMonthlyUsd: 2000 });
  const search = menu.tactics.find((s) => s.tactic.key === "google_search")!;
  const tv = menu.tactics.find((s) => s.tactic.key === "linear_tv")!;
  assert.equal(search.affordable, true);
  assert.equal(tv.affordable, false);
  assert.equal(menu.recommended_tactic_count, 1);
});

test("opportunity intensity is directional and null-safe", () => {
  assert.equal(computeOpportunityIntensity(null), null);
  const hi = computeOpportunityIntensity({ source: "FARS", top_counties: [{ county_name: "X", deaths_per_100k: 30, rural_pct: 0 }] });
  const lo = computeOpportunityIntensity({ source: "FARS", top_counties: [{ county_name: "Y", deaths_per_100k: 5, rural_pct: 0 }] });
  assert.ok(hi !== null && lo !== null && hi > lo);
  assert.ok(hi! <= 1 && lo! >= 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx tsx --test lib/strategy-engine/tactic-scoring.test.ts`
Expected: FAIL — `Cannot find module './tactic-scoring'`.

- [ ] **Step 3: Implement the scorer**

Create `web/lib/strategy-engine/tactic-scoring.ts`:

```ts
/**
 * Strategy Engine — deterministic tactic scorer.
 *
 * Turns the assembled market signals + the interview into a scored tactic
 * menu. Code owns every number here; the Plan 3 AI reads the menu, selects a
 * funnel-sequenced mix, and narrates — it does not recompute these scores.
 *
 * Per-tactic scores:
 *   - funnel_fit: goal-weighted value of the tactic's funnel stage.
 *   - audience_fit / competition: read straight off StrategyInputs.channels
 *     (the tactic's `channel`); null when that channel has no signal — never
 *     fabricated.
 *   - whitespace: 1 - competition (more open = more opportunity).
 *   - affordable: min_monthly_usd <= budget.
 *   - composite: a transparent blend used ONLY to order the menu; the AI sees
 *     the component scores, not just this.
 * Market opportunity intensity is a directional [0,1] from the FARS local
 * signal, surfaced once at the menu level.
 */
import type { StrategyInputs, ChannelSignal, LocalSignal } from "./types";
import {
  TACTIC_LIBRARY,
  funnelWeights,
  isAffordable,
  recommendedTacticCount,
  type Tactic,
  type GoalKind,
} from "./tactics";

export interface ScoredTactic {
  tactic: Tactic;
  funnel_fit: number;
  audience_fit: number | null;
  audience_fit_scope?: "general" | "news_proxy";
  audience_fit_sources?: string[];
  competition: number | null;
  whitespace: number | null;
  affordable: boolean;
  composite: number;
}

export interface TacticMenu {
  goal: GoalKind;
  budget_monthly_usd: number;
  recommended_tactic_count: number;
  market_opportunity_intensity: number | null;
  tactics: ScoredTactic[];
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Directional market opportunity from FARS death rates. Normalized against a
 * 20/100k reference (a high-but-not-extreme PI death rate); purely relative,
 * never an absolute claim. null when there's no local signal.
 */
export function computeOpportunityIntensity(local: LocalSignal | null): number | null {
  if (!local || local.top_counties.length === 0) return null;
  const rates = local.top_counties
    .map((c) => c.deaths_per_100k)
    .filter((r): r is number => r != null);
  if (rates.length === 0) return null;
  const peak = Math.max(...rates);
  return clamp01(peak / 20);
}

function signalFor(channels: ChannelSignal[], tactic: Tactic): ChannelSignal | undefined {
  return channels.find((c) => c.channel === tactic.channel);
}

export function buildTacticMenu(
  inputs: StrategyInputs,
  opts: { goal: GoalKind; budgetMonthlyUsd: number },
): TacticMenu {
  const weights = funnelWeights(opts.goal);

  const tactics: ScoredTactic[] = TACTIC_LIBRARY.map((tactic) => {
    const sig = signalFor(inputs.channels, tactic);
    const funnel_fit = weights[tactic.funnel_stage];
    const audience_fit = sig ? sig.fit : null;
    const competition = sig && sig.competition != null ? sig.competition : null;
    const whitespace = competition == null ? null : clamp01(1 - competition);
    const affordable = isAffordable(tactic, opts.budgetMonthlyUsd);

    // Diagnostic ordering blend. Unknown sub-scores fall back to a neutral 0.5
    // for ORDERING ONLY (the exposed audience_fit/competition stay null).
    // Unaffordable tactics sink so the menu leads with what the budget funds.
    const blend =
      0.4 * funnel_fit +
      0.3 * (audience_fit ?? 0.5) +
      0.3 * (whitespace ?? 0.5);
    const composite = affordable ? blend : blend * 0.25;

    return {
      tactic,
      funnel_fit,
      audience_fit,
      audience_fit_scope: sig?.fit_scope,
      audience_fit_sources: sig?.fit_sources,
      competition,
      whitespace,
      affordable,
      composite,
    };
  }).sort((a, b) => b.composite - a.composite);

  return {
    goal: opts.goal,
    budget_monthly_usd: opts.budgetMonthlyUsd,
    recommended_tactic_count: recommendedTacticCount(opts.budgetMonthlyUsd),
    market_opportunity_intensity: computeOpportunityIntensity(inputs.local_signal),
    tactics,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx tsx --test lib/strategy-engine/tactic-scoring.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Run the whole strategy-engine suite + typecheck**

Run:
```bash
cd web && npx tsx --test lib/strategy-engine/*.test.ts 2>&1 | grep -iE "tests |pass |fail "
npx tsc --noEmit 2>&1 | grep -E "tactics|tactic-scoring" || echo "no tsc errors in new files"
npx eslint lib/strategy-engine/tactics.ts lib/strategy-engine/tactic-scoring.ts lib/strategy-engine/tactics.test.ts lib/strategy-engine/tactic-scoring.test.ts
```
Expected: all tests pass; no tsc errors in the new files; eslint clean.

- [ ] **Step 6: Commit**

```bash
git add web/lib/strategy-engine/tactic-scoring.ts web/lib/strategy-engine/tactic-scoring.test.ts
git commit -m "feat(strategy): tactic scorer — funnel/audience/competition/budget into a scored menu"
```

---

## Self-Review

**Spec coverage (Plan 2 implements spec §4 tactic+funnel model and §5 budget honesty):**
- §4 "fixed, curated tactic library (~15-20)" → Task 1, 13 tactics. ✓ (OOH omitted with documented reason — no fit signal.)
- §4 "within-channel funnel depth" → tactics decompose channels with distinct `funnel_stage` (e.g. `google_search`=conversion vs `youtube_ads`=awareness). ✓
- §4 "goal → funnel weighting" → Task 2 `funnelWeights` + `classifyGoal`. ✓
- §4 "four deterministic per-tactic scores: funnel fit, audience fit, opportunity overlay, competitive status" → Task 4: funnel_fit, audience_fit, competition/whitespace per tactic; opportunity overlay split into market-level `market_opportunity_intensity` + per-tactic `geo_granularity` (Task 1). This refines the spec's "four scores" — documented design choice: opportunity is a market fact, surfaced once + a per-tactic geo-targetability attribute, rather than a fabricated per-tactic opportunity number. ✓
- §4 "library policy: AI may not recommend out-of-library tactics" → enforced in Plan 3 (the AI prompt/validation); Task 1 provides the closed `TACTIC_LIBRARY` it draws from. (Cross-plan note, not a gap.)
- §5 "min effective monthly spend" → `Tactic.min_monthly_usd`. ✓
- §5 "affordability filter" → `isAffordable` + per-tactic `affordable` + composite sink. ✓
- §5 "concentration rule" → `recommendedTacticCount`. ✓
- §6 "each tactic carries prerequisites" → `Tactic.prerequisites` (consumed by the Plan 4 readiness gate). ✓
- Not in this plan (correctly deferred): the AI core + grounding (Plan 3), the interview/UI + deck contract (Plan 4), wiring `buildTacticMenu` into the route (Plan 3).

**Placeholder scan:** No TBD/TODO; every step has complete code; commands are exact (`npx tsx --test`). ✓

**Type consistency:** `Tactic`, `GoalKind`, `ScoredTactic`, `TacticMenu` names and fields are used identically across tasks. `funnelWeights`/`isAffordable`/`recommendedTacticCount`/`classifyGoal` signatures match their definitions and their call sites in Task 4. `FunnelStage` and `ChannelKey` are imported from existing modules, not redefined. `computeOpportunityIntensity` takes `LocalSignal | null` and returns `number | null` consistently in the test and the implementation. ✓

**Risk note for the implementer:** `LocalSignal.top_counties[].deaths_per_100k` is `number | null` (per types.ts) — the `computeOpportunityIntensity` filter handles the null case; do not assume it's always a number.
