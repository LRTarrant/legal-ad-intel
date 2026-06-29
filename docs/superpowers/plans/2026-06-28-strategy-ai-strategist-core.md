# Strategy Engine — AI Strategist Core + Grounding (Plan 3 of 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the grounded AI-strategist core — it takes the Plan 2 tactic menu + market facts + interview, asks an (injected) model to SELECT a funnel-sequenced tactic mix with format calls, rationale, and illustrative outlets, then VALIDATES the result for grounding and enriches it with code-owned numbers (allocation %, reach/frequency targets, readiness gaps). Pure, deterministic, fully unit-tested via an injected model call. NOT wired into the route or deck — Plan 4 does that.

**Architecture:** Four pure modules in `web/lib/strategy-engine/`. `media-standards.ts` (reach/frequency planning targets + budget allocation math). `strategist-grounding.ts` (the validator: every cited tactic/outlet must exist, no fabricated numbers, no out-of-budget core pick). `strategist-prompt.ts` (the strategist system prompt + a user-prompt builder that serializes the menu/facts/interview reach-free). `strategist.ts` (the orchestrator `buildStrategistOutput`, which takes an injected `callModel` so tests are deterministic, runs validate→retry-once→enrich, and returns a `StrategistOutput`). The model call is a dependency, never imported — the route in Plan 4 injects the real OpenAI call.

**Tech Stack:** TypeScript, `node:test` + `node:assert/strict` via `npx tsx --test`. Reuses Plan 2's `tactics.ts`/`tactic-scoring.ts` and the existing `containsAbsoluteReach` from `prompt.ts`. No new dependencies. No network/AI in the modules themselves (injected).

## Global Constraints

- **Test runner:** `npx tsx --test <file>` from `web/`. Import sibling modules WITHOUT the `.ts` extension (TS5097 otherwise).
- **No net-new TypeScript errors** vs main. Run `npx tsc --noEmit` from `web/`; only the new files count.
- **Model call is INJECTED.** No module in this plan imports `openai` or calls `fetch`. `buildStrategistOutput` receives `callModel: (messages) => Promise<string>`. This keeps every test deterministic and the provider swappable (decision: wire to a stronger OpenAI model in Plan 4, verified-available; Gemini/Vertex is the documented fallback).
- **Code owns all numbers.** The AI selects tactics + writes prose; allocation %, reach/frequency targets, and readiness are computed here, never taken from the model. Reach/frequency are PLANNING TARGETS (goals to brief against), never delivered-reach claims.
- **Grounding is non-negotiable.** Reject (and retry once) when the model: names a tactic key not in the menu, cites an outlet not in the facts, selects an out-of-budget tactic as core, or emits an absolute-reach figure (reuse `containsAbsoluteReach`). A bad format-genre is soft-stripped with a warning (low-risk), not a hard reject.
- **Reuse existing types:** `ChannelKey`, `FunnelStage`, `NamedOutlet`, `Confidence` from `./types`; `Tactic`, `Prerequisite`, `GoalKind` from `./tactics`; `TacticMenu`, `ScoredTactic` from `./tactic-scoring`; `containsAbsoluteReach` from `./prompt`.
- **Pure + deterministic** in every module function except `buildStrategistOutput` (async only because `callModel` is async; still deterministic given a deterministic `callModel`). No `Date.now()`/randomness.

---

### Task 1: Media standards — reach/frequency targets + allocation math (`media-standards.ts`)

**Files:**
- Create: `web/lib/strategy-engine/media-standards.ts`
- Test: `web/lib/strategy-engine/media-standards.test.ts`

**Interfaces:**
- Consumes: `Tactic` from `./tactics`, `TacticMenu` from `./tactic-scoring`, `FunnelStage` from `./types`.
- Produces:
  ```ts
  export interface ReachFrequencyTarget { reach_pct: number; min_frequency: number; }
  export function reachFrequencyTarget(tactic: Tactic): ReachFrequencyTarget | null;
  export function computeAllocation(selectedKeys: string[], menu: TacticMenu): Map<string, number>;
  ```

- [ ] **Step 1: Write the failing test**

Create `web/lib/strategy-engine/media-standards.test.ts`:

```ts
/** Run with: npx tsx --test lib/strategy-engine/media-standards.test.ts */
import test from "node:test";
import assert from "node:assert/strict";
import { reachFrequencyTarget, computeAllocation } from "./media-standards";
import { buildTacticMenu } from "./tactic-scoring";
import type { StrategyInputs, ChannelSignal } from "./types";
import { TACTIC_LIBRARY } from "./tactics";

function inputs(): StrategyInputs {
  const channels: ChannelSignal[] = [
    { channel: "search", fit: 0.9, competition: 0.5 },
    { channel: "radio", fit: 0.8, competition: 0.2 },
    { channel: "tv_linear", fit: 0.7, competition: 0.6 },
    { channel: "facebook", fit: 0.6, competition: 0.4 },
  ];
  return {
    state_abbr: "AL", state_name: "Alabama", tort_slug: "car_accident", tort_label: "Auto",
    saturation: 0.4, total_advertisers: 10, top_advertisers: [], channels, outlets: [],
    county_dma: [], top_dma_name: "Birmingham", local_signal: null,
    available: { saturation: true, competition: true, audience_fit: true, outlets: false, local_signal: false },
  };
}

test("awareness tactics get a reach/frequency target, conversion tactics don't", () => {
  const radio = TACTIC_LIBRARY.find((t) => t.key === "radio")!;       // awareness
  const search = TACTIC_LIBRARY.find((t) => t.key === "google_search")!; // conversion
  const r = reachFrequencyTarget(radio);
  assert.ok(r && r.reach_pct > 0 && r.min_frequency > 0);
  assert.equal(reachFrequencyTarget(search), null);
});

test("allocation sums to exactly 100 and skews to higher funnel_fit", () => {
  const menu = buildTacticMenu(inputs(), { goal: "max_volume", budgetMonthlyUsd: 50000 });
  const alloc = computeAllocation(["google_search", "radio"], menu);
  const total = [...alloc.values()].reduce((a, b) => a + b, 0);
  assert.equal(total, 100);
  // max_volume weights conversion (search) far above awareness (radio)
  assert.ok(alloc.get("google_search")! > alloc.get("radio")!);
});

test("allocation of an empty selection is empty", () => {
  const menu = buildTacticMenu(inputs(), { goal: "max_volume", budgetMonthlyUsd: 50000 });
  assert.equal(computeAllocation([], menu).size, 0);
});

test("allocation of three tactics still sums to 100", () => {
  const menu = buildTacticMenu(inputs(), { goal: "brand", budgetMonthlyUsd: 50000 });
  const alloc = computeAllocation(["google_search", "radio", "meta_awareness"], menu);
  assert.equal([...alloc.values()].reduce((a, b) => a + b, 0), 100);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx tsx --test lib/strategy-engine/media-standards.test.ts`
Expected: FAIL — `Cannot find module './media-standards'`.

- [ ] **Step 3: Implement**

Create `web/lib/strategy-engine/media-standards.ts`:

```ts
/**
 * Strategy Engine — deterministic media-planning standards.
 *
 * Reach/frequency here are PLANNING TARGETS the user briefs a media rep
 * against ("aim for ~60% reach at frequency 4+"), never delivered-reach
 * claims. Allocation is a code-owned budget split; the AI selects tactics,
 * this computes the percentages.
 */
import type { FunnelStage } from "./types";
import type { Tactic } from "./tactics";
import type { TacticMenu } from "./tactic-scoring";

export interface ReachFrequencyTarget {
  /** Target net reach as a percent of the market — a goal, not a delivery claim. */
  reach_pct: number;
  /** Minimum effective frequency to brief against. */
  min_frequency: number;
}

/**
 * Reach/frequency is the planning language for upper-funnel reach plays.
 * Lower-funnel intent tactics (search, SEO, lead-forms) are briefed on
 * conversion, not reach, so they return null.
 */
const STAGE_TARGETS: Partial<Record<FunnelStage, ReachFrequencyTarget>> = {
  awareness: { reach_pct: 60, min_frequency: 4 },
  consideration: { reach_pct: 40, min_frequency: 3 },
};

export function reachFrequencyTarget(tactic: Tactic): ReachFrequencyTarget | null {
  return STAGE_TARGETS[tactic.funnel_stage] ?? null;
}

/**
 * Whole-percent budget split across the selected tactics, summing to exactly
 * 100 (largest-remainder rounding). Weighted by each tactic's goal-aligned
 * funnel_fit, floored so nothing rounds to a 0% line item.
 */
export function computeAllocation(selectedKeys: string[], menu: TacticMenu): Map<string, number> {
  const selected = menu.tactics.filter((s) => selectedKeys.includes(s.tactic.key));
  const out = new Map<string, number>();
  if (selected.length === 0) return out;

  const weights = selected.map((s) => Math.max(0.05, s.funnel_fit));
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / sum) * 100);
  const floors = raw.map((r) => Math.floor(r));
  const remainder = 100 - floors.reduce((a, b) => a + b, 0);
  // Hand the leftover whole points to the largest fractional parts.
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);
  const pct = [...floors];
  for (let k = 0; k < remainder; k++) pct[order[k % order.length].i] += 1;

  selected.forEach((s, i) => out.set(s.tactic.key, pct[i]));
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx tsx --test lib/strategy-engine/media-standards.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add web/lib/strategy-engine/media-standards.ts web/lib/strategy-engine/media-standards.test.ts
git commit -m "feat(strategy): reach/frequency planning targets + budget allocation math"
```

---

### Task 2: Grounding validator (`strategist-grounding.ts`)

**Files:**
- Create: `web/lib/strategy-engine/strategist-grounding.ts`
- Test: `web/lib/strategy-engine/strategist-grounding.test.ts`

**Interfaces:**
- Consumes: `TacticMenu` from `./tactic-scoring`, `containsAbsoluteReach` from `./prompt`.
- Produces:
  ```ts
  export interface RawSelectedTactic {
    key: string;
    rationale: string;
    format_call?: string[];
    example_outlets?: string[];
  }
  export interface RawSelection {
    tactics: RawSelectedTactic[];
    narrative: string;
    readiness_notes?: string;
  }
  export interface GroundingFacts { outletNames: Set<string>; } // lowercased outlet names present in the market
  export interface ValidatedSelection {
    tactics: RawSelectedTactic[]; // format_call cleaned of unknown genres
    narrative: string;
    readiness_notes?: string;
    warnings: string[];
  }
  export function validateSelection(
    raw: RawSelection, menu: TacticMenu, facts: GroundingFacts,
  ): { ok: true; value: ValidatedSelection } | { ok: false; errors: string[] };
  ```

- [ ] **Step 1: Write the failing test**

Create `web/lib/strategy-engine/strategist-grounding.test.ts`:

```ts
/** Run with: npx tsx --test lib/strategy-engine/strategist-grounding.test.ts */
import test from "node:test";
import assert from "node:assert/strict";
import { validateSelection, type RawSelection, type GroundingFacts } from "./strategist-grounding";
import { buildTacticMenu } from "./tactic-scoring";
import type { StrategyInputs, ChannelSignal } from "./types";

function menu(budget = 50000) {
  const channels: ChannelSignal[] = [
    { channel: "search", fit: 0.9, competition: 0.5 },
    { channel: "radio", fit: 0.8, competition: 0.2 },
    { channel: "tv_linear", fit: 0.7, competition: 0.6 },
  ];
  const inputs: StrategyInputs = {
    state_abbr: "AL", state_name: "Alabama", tort_slug: "car_accident", tort_label: "Auto",
    saturation: 0.4, total_advertisers: 10, top_advertisers: [], channels, outlets: [],
    county_dma: [], top_dma_name: "Birmingham", local_signal: null,
    available: { saturation: true, competition: true, audience_fit: true, outlets: false, local_signal: false },
  };
  return buildTacticMenu(inputs, { goal: "max_volume", budgetMonthlyUsd: budget });
}

const facts: GroundingFacts = { outletNames: new Set(["wlor", "waff"]) };

function goodRaw(): RawSelection {
  return {
    tactics: [
      { key: "google_search", rationale: "High-intent capture for injury searches.", example_outlets: [] },
      { key: "radio", rationale: "Reaches the local audience.", format_call: ["urban"], example_outlets: ["WLOR"] },
    ],
    narrative: "Lead with search, support with radio.",
  };
}

test("a clean grounded selection passes", () => {
  const r = validateSelection(goodRaw(), menu(), facts);
  assert.equal(r.ok, true);
});

test("rejects an unknown tactic key", () => {
  const raw = goodRaw();
  raw.tactics.push({ key: "billboard_blitz", rationale: "x" });
  const r = validateSelection(raw, menu(), facts);
  assert.equal(r.ok, false);
});

test("rejects a fabricated outlet", () => {
  const raw = goodRaw();
  raw.tactics[1].example_outlets = ["WKRP"]; // not in facts
  const r = validateSelection(raw, menu(), facts);
  assert.equal(r.ok, false);
});

test("rejects an absolute-reach figure in the narrative", () => {
  const raw = goodRaw();
  raw.narrative = "This plan reaches 312,000 adults.";
  const r = validateSelection(raw, menu(), facts);
  assert.equal(r.ok, false);
});

test("rejects an out-of-budget tactic as a core pick", () => {
  const raw = goodRaw();
  raw.tactics.push({ key: "linear_tv", rationale: "TV for scale." });
  const r = validateSelection(raw, menu(2000), facts); // $2k: linear_tv is unaffordable
  assert.equal(r.ok, false);
});

test("soft-strips an unknown format genre with a warning, still passes", () => {
  const raw = goodRaw();
  raw.tactics[1].format_call = ["urban", "polka"]; // polka not a radio dimension
  const r = validateSelection(raw, menu(), facts);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.deepEqual(r.value.tactics[1].format_call, ["urban"]);
    assert.ok(r.value.warnings.some((w) => /polka/.test(w)));
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx tsx --test lib/strategy-engine/strategist-grounding.test.ts`
Expected: FAIL — `Cannot find module './strategist-grounding'`.

- [ ] **Step 3: Implement**

Create `web/lib/strategy-engine/strategist-grounding.ts`:

```ts
/**
 * Strategy Engine — grounding validator.
 *
 * The AI may reason freely but may not fabricate. This rejects (so the
 * orchestrator can retry) any selection that names a tactic outside the menu,
 * cites an outlet not present in the market facts, selects an out-of-budget
 * tactic as a core pick, or emits an absolute-reach figure. An unknown format
 * genre is low-risk, so it's stripped with a warning rather than rejected.
 */
import type { TacticMenu } from "./tactic-scoring";
import { containsAbsoluteReach } from "./prompt";

export interface RawSelectedTactic {
  key: string;
  rationale: string;
  format_call?: string[];
  example_outlets?: string[];
}
export interface RawSelection {
  tactics: RawSelectedTactic[];
  narrative: string;
  readiness_notes?: string;
}
/** Outlet names present in the selected market, lowercased. */
export interface GroundingFacts {
  outletNames: Set<string>;
}
export interface ValidatedSelection {
  tactics: RawSelectedTactic[];
  narrative: string;
  readiness_notes?: string;
  warnings: string[];
}

export function validateSelection(
  raw: RawSelection,
  menu: TacticMenu,
  facts: GroundingFacts,
): { ok: true; value: ValidatedSelection } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const byKey = new Map(menu.tactics.map((s) => [s.tactic.key, s]));

  if (!Array.isArray(raw.tactics) || raw.tactics.length === 0) {
    return { ok: false, errors: ["no tactics selected"] };
  }

  const cleaned: RawSelectedTactic[] = [];
  for (const t of raw.tactics) {
    const scored = byKey.get(t.key);
    if (!scored) {
      errors.push(`unknown tactic key: ${t.key}`);
      continue;
    }
    if (!scored.affordable) errors.push(`out-of-budget tactic selected: ${t.key}`);
    if (typeof t.rationale !== "string" || t.rationale.trim() === "") {
      errors.push(`missing rationale for ${t.key}`);
    } else if (containsAbsoluteReach(t.rationale)) {
      errors.push(`absolute reach in rationale for ${t.key}`);
    }
    for (const name of t.example_outlets ?? []) {
      if (!facts.outletNames.has(name.toLowerCase())) {
        errors.push(`fabricated outlet: ${name}`);
      }
    }
    // Soft-strip unknown format genres (low-risk).
    let format_call = t.format_call;
    if (format_call) {
      const dims = new Set(scored.tactic.format_dimensions ?? []);
      const bad = format_call.filter((f) => !dims.has(f));
      if (bad.length) warnings.push(`dropped unknown formats for ${t.key}: ${bad.join(", ")}`);
      format_call = format_call.filter((f) => dims.has(f));
    }
    cleaned.push({ ...t, format_call });
  }

  if (containsAbsoluteReach(raw.narrative ?? "")) errors.push("absolute reach in narrative");
  if (raw.readiness_notes && containsAbsoluteReach(raw.readiness_notes)) {
    errors.push("absolute reach in readiness_notes");
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: { tactics: cleaned, narrative: raw.narrative, readiness_notes: raw.readiness_notes, warnings },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx tsx --test lib/strategy-engine/strategist-grounding.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add web/lib/strategy-engine/strategist-grounding.ts web/lib/strategy-engine/strategist-grounding.test.ts
git commit -m "feat(strategy): grounding validator — no fabricated tactics, outlets, numbers, or out-of-budget picks"
```

---

### Task 3: Strategist prompt (`strategist-prompt.ts`)

**Files:**
- Create: `web/lib/strategy-engine/strategist-prompt.ts`
- Test: `web/lib/strategy-engine/strategist-prompt.test.ts`

**Interfaces:**
- Consumes: `TacticMenu` from `./tactic-scoring`; `NamedOutlet`, `AdvertiserShare` from `./types`; `Voice` from `./standalone`.
- Produces:
  ```ts
  export const STRATEGIST_SYSTEM_PROMPT: string;
  export interface StrategistPromptFacts {
    market_label: string;
    tort_label: string;
    voice: Voice;
    goal_text: string;
    recommended_tactic_count: number;
    outlets: NamedOutlet[];           // in-market, real
    advertisers: AdvertiserShare[];   // ranked, real
    demographic_note?: string;        // e.g. "Hispanic-majority; Spanish-language formats over-index"
  }
  export function buildStrategistUserPrompt(menu: TacticMenu, facts: StrategistPromptFacts): string;
  ```

- [ ] **Step 1: Write the failing test**

Create `web/lib/strategy-engine/strategist-prompt.test.ts`:

```ts
/** Run with: npx tsx --test lib/strategy-engine/strategist-prompt.test.ts */
import test from "node:test";
import assert from "node:assert/strict";
import { STRATEGIST_SYSTEM_PROMPT, buildStrategistUserPrompt } from "./strategist-prompt";
import { buildTacticMenu } from "./tactic-scoring";
import type { StrategyInputs, ChannelSignal } from "./types";

function menu() {
  const channels: ChannelSignal[] = [{ channel: "search", fit: 0.9, competition: 0.5 }, { channel: "radio", fit: 0.8, competition: 0.2 }];
  const inputs: StrategyInputs = {
    state_abbr: "AL", state_name: "Alabama", tort_slug: "car_accident", tort_label: "Auto",
    saturation: 0.4, total_advertisers: 10, top_advertisers: [], channels, outlets: [],
    county_dma: [], top_dma_name: "Huntsville", local_signal: null,
    available: { saturation: true, competition: true, audience_fit: true, outlets: false, local_signal: false },
  };
  return buildTacticMenu(inputs, { goal: "max_volume", budgetMonthlyUsd: 7000 });
}

test("system prompt forbids fabrication and absolute reach", () => {
  const p = STRATEGIST_SYSTEM_PROMPT.toLowerCase();
  assert.ok(p.includes("tactic"));
  assert.ok(/never|do not|must not/.test(p));
  assert.ok(p.includes("reach"));        // bans absolute reach
  assert.ok(p.includes("budget"));       // budget honesty
});

test("user prompt lists the menu keys, outlets, budget count, and demographic note", () => {
  const p = buildStrategistUserPrompt(menu(), {
    market_label: "Huntsville", tort_label: "Auto", voice: "agency",
    goal_text: "max case volume", recommended_tactic_count: 2,
    outlets: [{ name: "WLOR", channel: "radio", format_genre: "urban", dma_name: "Huntsville" }],
    advertisers: [{ name: "Firm A", share: 0.3, rank: 1 }],
    demographic_note: "Hispanic-majority metro; Spanish-language formats over-index",
  });
  assert.ok(p.includes("google_search"));   // a menu key
  assert.ok(p.includes("WLOR"));            // the real outlet
  assert.ok(p.includes("Firm A"));          // the real competitor
  assert.ok(p.includes("2"));               // recommended tactic count
  assert.ok(/hispanic/i.test(p));           // demographic steer
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx tsx --test lib/strategy-engine/strategist-prompt.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `web/lib/strategy-engine/strategist-prompt.ts`:

```ts
/**
 * Strategy Engine — strategist prompt builder.
 *
 * Frames the model as a grounded strategist: it SELECTS tactics from the menu
 * and writes the brief, but every fact must come from the payload. Numbers
 * (allocation, reach/frequency) are added by code afterward, so the model is
 * told NOT to state them.
 */
import type { TacticMenu } from "./tactic-scoring";
import type { NamedOutlet, AdvertiserShare } from "./types";
import type { Voice } from "./standalone";

export const STRATEGIST_SYSTEM_PROMPT = `You are a senior media strategist building a paid-media plan for a U.S. plaintiff personal-injury law firm.

You receive a MENU of vetted advertising tactics (each with a funnel stage, an affordability flag, audience-fit and competition signals, and optional format genres), plus market FACTS (real in-market outlets, real competitors, a demographic note) and the firm's GOAL and BUDGET.

Your job: SELECT the best funnel-sequenced mix of tactics and brief it. Specifically return a STRICT JSON object:
  tactics: array, each:
    key            — MUST be a tactic key from the MENU. Never invent one.
    rationale      — 1-2 sentences tying this tactic to the goal, the audience, and the market signal.
    format_call    — optional array of format genres, ONLY from the tactic's listed genres (e.g. radio: country/urban/spanish).
    example_outlets— optional array of outlet names, ONLY from the FACTS outlets. Never invent an outlet.
  narrative        — one paragraph: the holistic story across the funnel, why this mix fits this firm in this market.
  readiness_notes  — optional: what must be in place (landing pages, tracking, intake) before spending.

HARD RULES:
1. Pick ONLY tactics whose affordable flag is true. Respect the recommended tactic count — at low budgets do fewer tactics well, and SAY SO honestly rather than padding the plan.
2. Match the goal to the funnel: a leads/volume goal leans on conversion tactics; a brand goal leans on awareness. But a sound plan still usually needs some upper-funnel support — reason about the balance.
3. NEVER state absolute reach, impressions, audience size, listener/viewer counts, or "X people". Speak in relative terms. Allocation percentages and reach/frequency targets are added later by the system — do not invent them.
4. NEVER invent an outlet, competitor, tactic, or number not in the payload. Use the demographic note to steer format/genre choices (e.g. a Hispanic-majority market → Spanish-language formats).
5. Be direct and decision-oriented, in the requested VOICE. Plain text inside JSON strings, no markdown.

Return ONLY the JSON object.`;

const VOICE_GUIDANCE: Record<Voice, string> = {
  firm: "VOICE: speak to the law firm owner — plain, ROI-focused, no agency jargon.",
  agency: "VOICE: speak to a media buyer — they know the channels; give them the rationale they skip.",
  seller: "VOICE: speak to a media seller — frame where this firm's demand fits your inventory.",
};

export interface StrategistPromptFacts {
  market_label: string;
  tort_label: string;
  voice: Voice;
  goal_text: string;
  recommended_tactic_count: number;
  outlets: NamedOutlet[];
  advertisers: AdvertiserShare[];
  demographic_note?: string;
}

export function buildStrategistUserPrompt(menu: TacticMenu, facts: StrategistPromptFacts): string {
  const menuLines = menu.tactics.map((s) => {
    const fmt = s.tactic.format_dimensions ? ` genres=[${s.tactic.format_dimensions.join(",")}]` : "";
    const fit = s.audience_fit == null ? "n/a" : s.audience_fit.toFixed(2);
    const ws = s.whitespace == null ? "n/a" : s.whitespace.toFixed(2);
    return `- ${s.tactic.key} (${s.tactic.label}; stage=${s.tactic.funnel_stage}; affordable=${s.affordable}; audience_fit=${fit}; whitespace=${ws}; funnel_fit=${s.funnel_fit.toFixed(2)})${fmt}`;
  });
  const outletLines = facts.outlets.map(
    (o) => `- ${o.name} (${o.channel}${o.format_genre ? `, ${o.format_genre}` : ""}${o.dma_name ? `, ${o.dma_name}` : ""})`,
  );
  const advLines = facts.advertisers.map((a) => `- ${a.name} (rank ${a.rank})`);

  return [
    VOICE_GUIDANCE[facts.voice],
    ``,
    `MARKET: ${facts.market_label} — ${facts.tort_label}`,
    `GOAL: ${facts.goal_text}`,
    `BUDGET supports about ${facts.recommended_tactic_count} tactic(s) — respect this.`,
    facts.demographic_note ? `DEMOGRAPHIC NOTE: ${facts.demographic_note}` : ``,
    ``,
    `MENU (pick keys ONLY from this list):`,
    ...menuLines,
    ``,
    `FACTS — in-market outlets (cite ONLY these):`,
    ...(outletLines.length ? outletLines : ["- (none on file; brief on format/genre and tell them to explore with their reps)"]),
    ``,
    `FACTS — competitors present:`,
    ...(advLines.length ? advLines : ["- (none observed)"]),
    ``,
    `Return the JSON object: { tactics:[{key,rationale,format_call?,example_outlets?}], narrative, readiness_notes? }`,
  ].join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx tsx --test lib/strategy-engine/strategist-prompt.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add web/lib/strategy-engine/strategist-prompt.ts web/lib/strategy-engine/strategist-prompt.test.ts
git commit -m "feat(strategy): strategist system + user prompt (grounded selection, reach-free)"
```

---

### Task 4: The orchestrator (`strategist.ts`)

**Files:**
- Create: `web/lib/strategy-engine/strategist.ts`
- Test: `web/lib/strategy-engine/strategist.test.ts`

**Interfaces:**
- Consumes: everything above + `Tactic`/`Prerequisite` from `./tactics`, `NamedOutlet`/`Confidence` from `./types`.
- Produces:
  ```ts
  export interface ReadinessGap { prerequisite: Prerequisite; status: "missing" | "confirm"; tactics: string[]; }
  export interface MediaBrief {
    tactic: Tactic;
    rationale: string;
    format_call: string[];
    example_outlets: NamedOutlet[];
    reach_target: ReachFrequencyTarget | null;
    allocation_pct: number;
    affordable: boolean;
  }
  export interface StrategistOutput {
    briefs: MediaBrief[];          // funnel-sequenced awareness→consideration→conversion
    narrative: string;
    readiness: ReadinessGap[];
    total_allocation_pct: number;  // 100 (or 0 if empty)
    confidence: Confidence;
    warnings: string[];
  }
  export function computeReadiness(
    selected: Tactic[], foundation: Partial<Record<Prerequisite, boolean>>,
  ): ReadinessGap[];
  export type CallModel = (messages: Array<{ role: "system" | "user"; content: string }>) => Promise<string>;
  export class GroundingError extends Error { errors: string[]; }
  export function buildStrategistOutput(args: {
    menu: TacticMenu;
    promptFacts: StrategistPromptFacts;
    groundingFacts: GroundingFacts;
    outlets: NamedOutlet[];
    foundation: Partial<Record<Prerequisite, boolean>>;
    confidence: Confidence;
    callModel: CallModel;
    maxRetries?: number; // default 1
  }): Promise<StrategistOutput>;
  ```

- [ ] **Step 1: Write the failing test**

Create `web/lib/strategy-engine/strategist.test.ts`:

```ts
/** Run with: npx tsx --test lib/strategy-engine/strategist.test.ts */
import test from "node:test";
import assert from "node:assert/strict";
import { buildStrategistOutput, computeReadiness, GroundingError, type CallModel } from "./strategist";
import { buildTacticMenu } from "./tactic-scoring";
import { TACTIC_LIBRARY } from "./tactics";
import { stripJSONWrapper } from "./prompt";
import type { StrategyInputs, ChannelSignal, NamedOutlet } from "./types";
import { STRATEGIST_SYSTEM_PROMPT, type StrategistPromptFacts } from "./strategist-prompt";
import type { GroundingFacts } from "./strategist-grounding";

function menuFor(budget = 50000) {
  const channels: ChannelSignal[] = [
    { channel: "search", fit: 0.9, competition: 0.5 },
    { channel: "radio", fit: 0.8, competition: 0.2 },
  ];
  const inputs: StrategyInputs = {
    state_abbr: "AL", state_name: "Alabama", tort_slug: "car_accident", tort_label: "Auto",
    saturation: 0.4, total_advertisers: 10, top_advertisers: [], channels, outlets: [],
    county_dma: [], top_dma_name: "Huntsville", local_signal: null,
    available: { saturation: true, competition: true, audience_fit: true, outlets: false, local_signal: false },
  };
  return buildTacticMenu(inputs, { goal: "max_volume", budgetMonthlyUsd: budget });
}

const outlets: NamedOutlet[] = [{ name: "WLOR", channel: "radio", format_genre: "urban", dma_name: "Huntsville" }];
const promptFacts: StrategistPromptFacts = {
  market_label: "Huntsville", tort_label: "Auto", voice: "agency", goal_text: "max volume",
  recommended_tactic_count: 6, outlets, advertisers: [],
};
const groundingFacts: GroundingFacts = { outletNames: new Set(["wlor"]) };

const VALID = JSON.stringify({
  tactics: [
    { key: "google_search", rationale: "High-intent capture." },
    { key: "radio", rationale: "Local reach.", format_call: ["urban"], example_outlets: ["WLOR"] },
  ],
  narrative: "Lead with search, support with radio.",
  readiness_notes: "Confirm landing pages and call tracking.",
});

test("a valid model response produces briefs, allocation summing 100, and resolved outlets", async () => {
  const callModel: CallModel = async () => VALID;
  const out = await buildStrategistOutput({
    menu: menuFor(), promptFacts, groundingFacts, outlets, foundation: {}, confidence: "high", callModel,
  });
  assert.equal(out.total_allocation_pct, 100);
  assert.equal(out.briefs.length, 2);
  const radio = out.briefs.find((b) => b.tactic.key === "radio")!;
  assert.equal(radio.example_outlets[0].name, "WLOR"); // resolved from the name
  assert.ok(radio.reach_target && radio.reach_target.reach_pct > 0); // awareness gets a target
  const search = out.briefs.find((b) => b.tactic.key === "google_search")!;
  assert.equal(search.reach_target, null); // conversion gets none
  // briefs are funnel-sequenced: awareness (radio) before conversion (search)
  assert.ok(out.briefs.findIndex((b) => b.tactic.key === "radio") < out.briefs.findIndex((b) => b.tactic.key === "google_search"));
});

test("system prompt is passed to the model", async () => {
  let seenSystem = "";
  const callModel: CallModel = async (msgs) => { seenSystem = msgs[0].content; return VALID; };
  await buildStrategistOutput({ menu: menuFor(), promptFacts, groundingFacts, outlets, foundation: {}, confidence: "high", callModel });
  assert.equal(seenSystem, STRATEGIST_SYSTEM_PROMPT);
});

test("retries once on a grounding failure, then succeeds", async () => {
  let calls = 0;
  const BAD = JSON.stringify({ tactics: [{ key: "made_up", rationale: "x" }], narrative: "y" });
  const callModel: CallModel = async () => { calls += 1; return calls === 1 ? BAD : VALID; };
  const out = await buildStrategistOutput({ menu: menuFor(), promptFacts, groundingFacts, outlets, foundation: {}, confidence: "high", callModel });
  assert.equal(calls, 2);
  assert.equal(out.briefs.length, 2);
});

test("throws GroundingError when the model never grounds", async () => {
  const BAD = JSON.stringify({ tactics: [{ key: "made_up", rationale: "x" }], narrative: "y" });
  const callModel: CallModel = async () => BAD;
  await assert.rejects(
    () => buildStrategistOutput({ menu: menuFor(), promptFacts, groundingFacts, outlets, foundation: {}, confidence: "high", callModel }),
    (e) => e instanceof GroundingError,
  );
});

test("computeReadiness flags missing vs confirm per prerequisite", () => {
  const search = TACTIC_LIBRARY.find((t) => t.key === "google_search")!; // needs landing_page, conversion_tracking, call_tracking
  const gaps = computeReadiness([search], { landing_page: true, conversion_tracking: false });
  // landing_page satisfied → omitted; conversion_tracking false → missing; call_tracking unknown → confirm
  assert.ok(!gaps.some((g) => g.prerequisite === "landing_page"));
  assert.equal(gaps.find((g) => g.prerequisite === "conversion_tracking")?.status, "missing");
  assert.equal(gaps.find((g) => g.prerequisite === "call_tracking")?.status, "confirm");
});

test("stripJSONWrapper handles a fenced model response", async () => {
  const callModel: CallModel = async () => "```json\n" + VALID + "\n```";
  const out = await buildStrategistOutput({ menu: menuFor(), promptFacts, groundingFacts, outlets, foundation: {}, confidence: "high", callModel });
  assert.equal(out.briefs.length, 2);
  // sanity: the helper the orchestrator relies on
  assert.equal(stripJSONWrapper("```json\n{}\n```"), "{}");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx tsx --test lib/strategy-engine/strategist.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `web/lib/strategy-engine/strategist.ts`:

```ts
/**
 * Strategy Engine — grounded-strategist orchestrator.
 *
 * Composes the pieces: build the prompt, call the (injected) model, parse,
 * validate grounding (retry once on failure), then enrich with code-owned
 * numbers — allocation %, reach/frequency targets, resolved outlets, and the
 * readiness gate. The model selects + writes; this owns every number and the
 * funnel sequencing. The model call is injected so this stays deterministic
 * and provider-agnostic.
 */
import type { NamedOutlet, Confidence, FunnelStage } from "./types";
import type { Tactic, Prerequisite } from "./tactics";
import type { TacticMenu } from "./tactic-scoring";
import { reachFrequencyTarget, computeAllocation, type ReachFrequencyTarget } from "./media-standards";
import { stripJSONWrapper } from "./prompt";
import { buildStrategistUserPrompt, STRATEGIST_SYSTEM_PROMPT, type StrategistPromptFacts } from "./strategist-prompt";
import { validateSelection, type GroundingFacts, type RawSelection } from "./strategist-grounding";

export interface ReadinessGap {
  prerequisite: Prerequisite;
  status: "missing" | "confirm";
  tactics: string[];
}
export interface MediaBrief {
  tactic: Tactic;
  rationale: string;
  format_call: string[];
  example_outlets: NamedOutlet[];
  reach_target: ReachFrequencyTarget | null;
  allocation_pct: number;
  affordable: boolean;
}
export interface StrategistOutput {
  briefs: MediaBrief[];
  narrative: string;
  readiness: ReadinessGap[];
  total_allocation_pct: number;
  confidence: Confidence;
  warnings: string[];
}

export type CallModel = (
  messages: Array<{ role: "system" | "user"; content: string }>,
) => Promise<string>;

export class GroundingError extends Error {
  errors: string[];
  constructor(errors: string[]) {
    super(`strategist grounding failed: ${errors.join("; ")}`);
    this.name = "GroundingError";
    this.errors = errors;
  }
}

const STAGE_ORDER: Record<FunnelStage, number> = { awareness: 0, consideration: 1, conversion: 2 };

export function computeReadiness(
  selected: Tactic[],
  foundation: Partial<Record<Prerequisite, boolean>>,
): ReadinessGap[] {
  const byPrereq = new Map<Prerequisite, { status: "missing" | "confirm"; tactics: string[] }>();
  for (const t of selected) {
    for (const p of t.prerequisites) {
      if (foundation[p] === true) continue; // satisfied
      const status: "missing" | "confirm" = foundation[p] === false ? "missing" : "confirm";
      const entry = byPrereq.get(p);
      if (entry) {
        entry.tactics.push(t.key);
        if (status === "missing") entry.status = "missing"; // missing dominates confirm
      } else {
        byPrereq.set(p, { status, tactics: [t.key] });
      }
    }
  }
  return [...byPrereq.entries()].map(([prerequisite, v]) => ({ prerequisite, ...v }));
}

function parseSelection(raw: string): RawSelection {
  return JSON.parse(stripJSONWrapper(raw)) as RawSelection;
}

export async function buildStrategistOutput(args: {
  menu: TacticMenu;
  promptFacts: StrategistPromptFacts;
  groundingFacts: GroundingFacts;
  outlets: NamedOutlet[];
  foundation: Partial<Record<Prerequisite, boolean>>;
  confidence: Confidence;
  callModel: CallModel;
  maxRetries?: number;
}): Promise<StrategistOutput> {
  const { menu, promptFacts, groundingFacts, outlets, foundation, confidence, callModel } = args;
  const maxRetries = args.maxRetries ?? 1;
  const userPrompt = buildStrategistUserPrompt(menu, promptFacts);

  let lastErrors: string[] = ["no model response"];
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const content = await callModel([
      { role: "system", content: STRATEGIST_SYSTEM_PROMPT },
      {
        role: "user",
        content:
          attempt === 0
            ? userPrompt
            : `${userPrompt}\n\nYour previous answer was rejected: ${lastErrors.join("; ")}. Fix every issue and return valid JSON.`,
      },
    ]);

    let raw: RawSelection;
    try {
      raw = parseSelection(content);
    } catch {
      lastErrors = ["model returned invalid JSON"];
      continue;
    }

    const validated = validateSelection(raw, menu, groundingFacts);
    if (!validated.ok) {
      lastErrors = validated.errors;
      continue;
    }

    // ── enrich with code-owned numbers ──────────────────────────────────────
    const byKey = new Map(menu.tactics.map((s) => [s.tactic.key, s]));
    const selectedKeys = validated.value.tactics.map((t) => t.key);
    const alloc = computeAllocation(selectedKeys, menu);
    const outletByName = new Map(outlets.map((o) => [o.name.toLowerCase(), o]));

    const briefs: MediaBrief[] = validated.value.tactics
      .map((t) => {
        const scored = byKey.get(t.key)!;
        const example_outlets = (t.example_outlets ?? [])
          .map((n) => outletByName.get(n.toLowerCase()))
          .filter((o): o is NamedOutlet => o != null);
        return {
          tactic: scored.tactic,
          rationale: t.rationale,
          format_call: t.format_call ?? [],
          example_outlets,
          reach_target: reachFrequencyTarget(scored.tactic),
          allocation_pct: alloc.get(t.key) ?? 0,
          affordable: scored.affordable,
        };
      })
      .sort((a, b) => STAGE_ORDER[a.tactic.funnel_stage] - STAGE_ORDER[b.tactic.funnel_stage]);

    const total = [...alloc.values()].reduce((a, b) => a + b, 0);
    const readiness = computeReadiness(briefs.map((b) => b.tactic), foundation);

    return {
      briefs,
      narrative: validated.value.narrative,
      readiness,
      total_allocation_pct: total,
      confidence,
      warnings: validated.value.warnings,
    };
  }

  throw new GroundingError(lastErrors);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx tsx --test lib/strategy-engine/strategist.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Full suite + typecheck + lint**

Run:
```bash
cd web && npx tsx --test lib/strategy-engine/*.test.ts 2>&1 | grep -iE "tests |pass |fail "
npx tsc --noEmit 2>&1 | grep -E "media-standards|strategist" || echo "no tsc errors in new files"
npx eslint lib/strategy-engine/media-standards.ts lib/strategy-engine/strategist-grounding.ts lib/strategy-engine/strategist-prompt.ts lib/strategy-engine/strategist.ts lib/strategy-engine/*.test.ts
```
Expected: all tests pass; no tsc errors in new files; eslint clean.

- [ ] **Step 6: Commit**

```bash
git add web/lib/strategy-engine/strategist.ts web/lib/strategy-engine/strategist.test.ts
git commit -m "feat(strategy): grounded-strategist orchestrator — select, validate, enrich with code-owned numbers"
```

---

## Self-Review

**Spec coverage (Plan 3 implements spec §9 AI core + grounding contract, §7 media-brief grammar, parts of §6 readiness):**
- §9 "AI selects funnel-sequenced tactic mix" → `buildStrategistOutput` (selection via model, sequencing by `STAGE_ORDER`). ✓
- §9 "rationale per tactic connecting demographic + injury + competitive" → `rationale` per brief; prompt feeds demographic note + competitors + signals. ✓
- §9 "format calls + targets + illustrative examples" → `format_call` (validated subset), `reach_target` (code-owned), `example_outlets` (resolved from facts). ✓ (§7 grammar.)
- §9 grounding contract: "named entities must exist" → `validateSelection` rejects unknown tactic keys + fabricated outlets. "numbers come from code" → allocation + reach/frequency computed here; prompt forbids the model stating them. "no delivered-reach claims" → `containsAbsoluteReach` on rationale + narrative + readiness_notes. "no out-of-budget core tactic" → affordability reject. ✓
- §7 "reach/frequency = targets not delivered claims" → `ReachFrequencyTarget` is a planning goal; documented. ✓
- §6 "before you spend a dollar / prerequisites" → `computeReadiness` from selected tactics' prerequisites × the foundation answers. ✓
- §5 "budget honesty / concentration" → menu already carries `affordable` + `recommended_tactic_count`; prompt instructs honesty; validator enforces affordability. ✓
- Not in this plan (correctly deferred to Plan 4): wiring into `generate/route.ts`, the real OpenAI model call + verified model id, mapping `StrategistOutput` into the deck's `Strategy` contract, the interview UI + readiness questions that populate `foundation`.

**Placeholder scan:** No TBD/TODO; every step has complete code; commands exact. ✓

**Type consistency:** `RawSelection`/`GroundingFacts`/`ValidatedSelection` flow from Task 2 into Task 4 unchanged. `ReachFrequencyTarget` defined in Task 1, imported in Task 4. `StrategistPromptFacts` defined in Task 3, consumed in Task 4 and its test. `CallModel` signature matches the test's fakes. `computeAllocation`/`reachFrequencyTarget`/`validateSelection`/`buildStrategistUserPrompt`/`STRATEGIST_SYSTEM_PROMPT`/`stripJSONWrapper`/`containsAbsoluteReach` are all used with the exact signatures defined here or confirmed present in `prompt.ts`. ✓

**Risk notes for the implementer:**
- `Voice` is exported from `./standalone` (confirmed). `FunnelStage`, `Confidence`, `NamedOutlet`, `AdvertiserShare` are exported from `./types` (confirmed — `FunnelStage` lives in `types.ts`, NOT `channel-plan.ts`).
- `containsAbsoluteReach` and `stripJSONWrapper` are already exported from `prompt.ts` (confirmed) — import, do not duplicate.
- The orchestrator is the only async function; it is still deterministic given a deterministic `callModel`, so all tests use synchronous fakes.
