# Strategy Engine — Wire Strategist into the Route (Plan 4a of 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the grounded AI-strategist (Plan 3) drive the **live** `/strategy` deck. Wire `buildStrategistOutput` into `POST /api/strategy/generate` behind a real `gpt-5.5` model call, and map its `StrategistOutput` into the existing `Strategy` contract so the current deck renders the AI's actual tactic selections, rationale, and allocation, with the deterministic competitive/opportunity facts unchanged. Interview-field changes (4b) and native media-brief deck rendering (4c) come later.

**Architecture:** Three pieces. `strategist-to-strategy.ts` (PURE, tested) maps `StrategistOutput` + grounded facts into the deck's `recommendations[]`, `integrated_plan.allocation[]`, and `prose`. `openai-strategist.ts` (thin adapter, smoke-tested against the real API) builds a `CallModel` that calls OpenAI with the env-configured `STRATEGIST_MODEL` (default `gpt-5.5`) using GPT-5-correct params. `generate/route.ts` swaps its archetype-plan + narrator middle for: build tactic menu (Plan 2) → `buildStrategistOutput` (Plan 3) with the OpenAI adapter → map to the `Strategy` payload. Competitive landscape, opportunity counties, brand, and handoff stay deterministic.

**Tech Stack:** TypeScript, Next.js 16 API route (`runtime = "nodejs"`), OpenAI chat completions, `node:test` via `npx tsx --test`. Reuses Plan 2 (`tactic-scoring`, `tactics`) and Plan 3 (`strategist`, `strategist-prompt`, `strategist-grounding`).

## Global Constraints

- **Test runner:** `npx tsx --test <file>` from `web/`. Import siblings without `.ts`.
- **No net-new TypeScript errors** vs main (`pr-typecheck.yml`). Run `npx tsc --noEmit`.
- **Model id is config, never hardcoded:** the adapter reads `process.env.STRATEGIST_MODEL ?? "gpt-5.5"`. The verified-available model is `gpt-5.5` (confirmed against the account's `/v1/models`). Set `STRATEGIST_MODEL=gpt-5.5` in Vercel; default covers local.
- **GPT-5 param contract:** GPT-5 models use `max_completion_tokens` (NOT `max_tokens`) and reject a non-default `temperature` — Task 2 confirms the exact working param set against the real API before wiring. Do NOT assume gpt-4o params carry over.
- **Code owns all numbers** (Plan 3 invariant preserved): allocation %, reach/frequency targets come from code; the model only selects + writes prose. The mapper must not let an AI string become a number.
- **The deck's rigid fields must stay populated** (from the deck map): `recommendations[]` (≥1), `prose.{market_read,approach_rationale,channel_narrative}` (non-empty), `integrated_plan.allocation[]` (sums ~100), `competitive.{advertisers,channels}`, `opportunity.counties[]`. `watch_list[]` and `competitive.creative[]` are tolerant (empty OK).
- **Grounding stays intact:** the route surfaces `GroundingError` (Plan 3) as a clean 502, never an uncaught throw.
- **Browser-verify on prod is the definition of done** (CLAUDE.md §2.7) — a green build is not done for this user-facing route.

---

### Task 1: Map StrategistOutput → the deck's Strategy shape (`strategist-to-strategy.ts`)

**Files:**
- Create: `web/lib/strategy-engine/strategist-to-strategy.ts`
- Test: `web/lib/strategy-engine/strategist-to-strategy.test.ts`

**Interfaces:**
- Consumes: `StrategistOutput`, `MediaBrief` from `./strategist`; `TacticMenu`, `ScoredTactic` from `./tactic-scoring`; `Recommendation`, `RecommendationLink`, `ProofPoint` from `./recommendations`; `IntegratedAllocation`, `StrategyProse` from `./standalone`/`./types`; `ChannelKey` from `./types`.
- Produces:
  ```ts
  export interface StrategistMapFacts {
    market_label: string;
    top_advertiser: string | null;     // from inputs.top_advertisers[0]
    opportunity_intensity: number | null; // menu.market_opportunity_intensity
  }
  export function briefToRecommendation(brief: MediaBrief, scored: ScoredTactic, facts: StrategistMapFacts): Recommendation;
  export function strategistToRecommendations(out: StrategistOutput, menu: TacticMenu, facts: StrategistMapFacts): Recommendation[];
  export function strategistToAllocation(out: StrategistOutput): IntegratedAllocation[];
  export function strategistToProse(out: StrategistOutput, facts: StrategistMapFacts): StrategyProse;
  ```

- [ ] **Step 1: Write the failing test**

Create `web/lib/strategy-engine/strategist-to-strategy.test.ts`:

```ts
/** Run with: npx tsx --test lib/strategy-engine/strategist-to-strategy.test.ts */
import test from "node:test";
import assert from "node:assert/strict";
import { strategistToRecommendations, strategistToAllocation, strategistToProse } from "./strategist-to-strategy";
import { buildTacticMenu } from "./tactic-scoring";
import { containsAbsoluteReach } from "./prompt";
import type { StrategyInputs, ChannelSignal, NamedOutlet } from "./types";
import type { StrategistOutput } from "./strategist";

function menu(budget = 50000) {
  const channels: ChannelSignal[] = [
    { channel: "search", fit: 0.9, competition: 0.5, fit_sources: ["Pew"] },
    { channel: "radio", fit: 0.8, competition: 0.2 },
  ];
  const inputs: StrategyInputs = {
    state_abbr: "AL", state_name: "Alabama", tort_slug: "car_accident", tort_label: "Auto",
    saturation: 0.4, total_advertisers: 10, top_advertisers: [], channels, outlets: [],
    county_dma: [], top_dma_name: "Huntsville",
    local_signal: { source: "FARS", top_counties: [{ county_name: "Madison", deaths_per_100k: 12, rural_pct: 0.1 }] },
    available: { saturation: true, competition: true, audience_fit: true, outlets: false, local_signal: true },
  };
  return buildTacticMenu(inputs, { goal: "max_volume", budgetMonthlyUsd: budget });
}

const wlor: NamedOutlet = { name: "WLOR", channel: "radio", format_genre: "urban", dma_name: "Huntsville" };
function out(): StrategistOutput {
  return {
    briefs: [
      { tactic: menu().tactics.find((s) => s.tactic.key === "google_search")!.tactic, rationale: "Capture high-intent injury searches.", format_call: [], example_outlets: [], reach_target: null, allocation_pct: 70, affordable: true },
      { tactic: menu().tactics.find((s) => s.tactic.key === "radio")!.tactic, rationale: "Build awareness with country and urban formats.", format_call: ["urban"], example_outlets: [wlor], reach_target: { reach_pct: 60, min_frequency: 4 }, allocation_pct: 30, affordable: true },
    ],
    narrative: "Lead with search and support with radio.",
    readiness: [{ prerequisite: "landing_page", status: "confirm", tactics: ["google_search"] }],
    total_allocation_pct: 100,
    confidence: "high",
    warnings: [],
  };
}

const facts = { market_label: "Huntsville", top_advertiser: "Firm A", opportunity_intensity: 0.6 };

test("each brief becomes a recommendation with a channel, headline, three links, and a buy", () => {
  const recs = strategistToRecommendations(out(), menu(), facts);
  assert.equal(recs.length, 2);
  const radio = recs.find((r) => r.channel === "radio")!;
  assert.ok(radio.headline.length > 0);
  assert.ok(radio.opportunity && radio.white_space && radio.fit);
  // radio cited a real outlet → buy is outlets
  assert.equal(radio.buy.kind, "outlets");
  // the AI rationale is surfaced somewhere visible
  assert.ok(JSON.stringify(radio).includes("country and urban"));
});

test("allocation maps from briefs and sums to 100", () => {
  const alloc = strategistToAllocation(out());
  assert.equal(alloc.reduce((a, b) => a + b.pct, 0), 100);
  assert.ok(alloc.every((a) => typeof a.pct === "number" && a.label.length > 0));
});

test("prose fills all three rigid fields, none empty, none with absolute reach", () => {
  const prose = strategistToProse(out(), facts);
  for (const v of [prose.market_read, prose.approach_rationale, prose.channel_narrative]) {
    assert.ok(v && v.trim().length > 0);
    assert.equal(containsAbsoluteReach(v), false);
  }
  assert.equal(prose.channel_narrative, "Lead with search and support with radio."); // the AI narrative
});

test("a brief with no example outlets maps to a channel_target buy", () => {
  const recs = strategistToRecommendations(out(), menu(), facts);
  const search = recs.find((r) => r.channel === "search")!;
  assert.equal(search.buy.kind, "channel_target");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx tsx --test lib/strategy-engine/strategist-to-strategy.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `web/lib/strategy-engine/strategist-to-strategy.ts`:

```ts
/**
 * Strategy Engine — map the grounded StrategistOutput into the deck's existing
 * Strategy shape (recommendations / integrated_plan.allocation / prose), so the
 * AI's real tactic selections drive the live deck without a deck rewrite (4c
 * does the native rendering). Competitive + opportunity stay deterministic in
 * the route; this only maps the strategist-owned pieces.
 *
 * Code still owns every number: the link values come from the scored tactic and
 * code-owned reach targets, never from an AI string.
 */
import type { MediaBrief, StrategistOutput } from "./strategist";
import type { TacticMenu, ScoredTactic } from "./tactic-scoring";
import type { Recommendation, RecommendationLink, ProofPoint, DataDepth } from "./recommendations";
import type { IntegratedAllocation, StrategyProse } from "./standalone";
import { CHANNEL_LABELS } from "./recommendations";

export interface StrategistMapFacts {
  market_label: string;
  top_advertiser: string | null;
  opportunity_intensity: number | null;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

function link(value: string, source: string, text: string): RecommendationLink {
  return { value, source, text, depth: "primary" };
}

export function briefToRecommendation(
  brief: MediaBrief,
  scored: ScoredTactic,
  facts: StrategistMapFacts,
): Recommendation {
  const fmt = brief.format_call.length ? ` — ${brief.format_call.join(" / ")}` : "";
  const headline = `${brief.tactic.label}${fmt} in ${facts.market_label}`;

  const oppValue = brief.reach_target
    ? `${brief.reach_target.reach_pct}% reach goal`
    : facts.opportunity_intensity != null
      ? pct(facts.opportunity_intensity)
      : "priority market";
  const opportunity = link(oppValue, "Plan target", brief.rationale);

  const wsValue =
    scored.whitespace == null ? "unmeasured" : scored.whitespace >= 0.5 ? "open" : "contested";
  const white_space = link(wsValue, "competitive scan", `Competitive whitespace: ${wsValue}.`);

  const fitValue = scored.audience_fit == null ? "directional" : pct(scored.audience_fit);
  const fitText = scored.audience_fit_scope === "news_proxy" ? "Audience fit (news-consumption proxy)." : "Audience fit for this market.";
  const fit = link(fitValue, (scored.audience_fit_sources ?? []).join(", ") || "media baseline", fitText);

  const proof: ProofPoint[] = [];
  if (brief.reach_target) proof.push({ value: `freq ${brief.reach_target.min_frequency}+`, source: "media-planning target" });
  if (brief.affordable === false) proof.push({ value: "stretch", source: "above budget floor" });

  const buy: Recommendation["buy"] =
    brief.example_outlets.length > 0
      ? { kind: "outlets", outlets: brief.example_outlets }
      : { kind: "channel_target", target: brief.tactic.label };

  const data_depth: DataDepth = scored.audience_fit == null || scored.whitespace == null ? "moderate" : "strong";

  return { channel: brief.tactic.channel, headline, opportunity, white_space, fit, proof, buy, data_depth };
}

export function strategistToRecommendations(
  out: StrategistOutput,
  menu: TacticMenu,
  facts: StrategistMapFacts,
): Recommendation[] {
  const byKey = new Map(menu.tactics.map((s) => [s.tactic.key, s]));
  return out.briefs
    .map((b) => {
      const scored = byKey.get(b.tactic.key);
      return scored ? briefToRecommendation(b, scored, facts) : null;
    })
    .filter((r): r is Recommendation => r !== null);
}

export function strategistToAllocation(out: StrategistOutput): IntegratedAllocation[] {
  return out.briefs.map((b) => ({
    channel: b.tactic.channel,
    label: CHANNEL_LABELS[b.tactic.channel],
    stage: b.tactic.funnel_stage,
    pct: b.allocation_pct,
  }));
}

export function strategistToProse(out: StrategistOutput, facts: StrategistMapFacts): StrategyProse {
  const lead = facts.top_advertiser
    ? `${facts.market_label}: ${facts.top_advertiser} leads the competitive field.`
    : `${facts.market_label}: an open competitive field.`;
  const count = out.briefs.length;
  const approach = `${count} ${count === 1 ? "tactic" : "tactics"} selected for this budget and goal, sequenced across the funnel.`;
  return {
    market_read: lead,
    approach_rationale: approach,
    channel_narrative: out.narrative && out.narrative.trim() ? out.narrative : approach,
  };
}
```

> Note: confirm `CHANNEL_LABELS` is exported from `recommendations.ts` (the test fixture `planned()` in `recommendations.test.ts` references it). If it is NOT exported, export it there in this task (one-line `export`), since `strategistToAllocation` needs it. `DataDepth` and `RecommendationLink`/`ProofPoint` are exported from `recommendations.ts` (confirmed in the Plan 3 map).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx tsx --test lib/strategy-engine/strategist-to-strategy.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add web/lib/strategy-engine/strategist-to-strategy.ts web/lib/strategy-engine/strategist-to-strategy.test.ts web/lib/strategy-engine/recommendations.ts
git commit -m "feat(strategy): map StrategistOutput into the deck's recommendation/allocation/prose shape"
```

---

### Task 2: OpenAI adapter + real-API smoke test (`openai-strategist.ts`)

**Files:**
- Create: `web/lib/strategy-engine/openai-strategist.ts`
- Smoke (throwaway, not committed): `web/scripts/strategist-smoke.mjs`

**Interfaces:**
- Consumes: `CallModel` from `./strategist`.
- Produces:
  ```ts
  export function resolveStrategistModel(): string; // process.env.STRATEGIST_MODEL ?? "gpt-5.5"
  export function createOpenAICallModel(opts: { apiKey: string; signal?: AbortSignal; maxOutputTokens?: number }): CallModel;
  ```

- [ ] **Step 1: Implement the adapter**

Create `web/lib/strategy-engine/openai-strategist.ts`:

```ts
/**
 * OpenAI adapter producing a CallModel for the grounded strategist. The model
 * id is config (STRATEGIST_MODEL, default the verified-available gpt-5.5).
 * GPT-5 models use max_completion_tokens and reject a custom temperature, so we
 * omit temperature and use max_completion_tokens. Task 2 smoke-tests this exact
 * param set against the live API before the route depends on it.
 */
import type { CallModel } from "./strategist";

export function resolveStrategistModel(): string {
  return process.env.STRATEGIST_MODEL ?? "gpt-5.5";
}

export function createOpenAICallModel(opts: {
  apiKey: string;
  signal?: AbortSignal;
  maxOutputTokens?: number;
}): CallModel {
  return async (messages) => {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.apiKey}` },
      body: JSON.stringify({
        model: resolveStrategistModel(),
        max_completion_tokens: opts.maxOutputTokens ?? 2000,
        response_format: { type: "json_object" },
        messages,
      }),
      signal: opts.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenAI ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; usage?: unknown };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("OpenAI returned empty content");
    return content;
  };
}
```

- [ ] **Step 2: Smoke-test against the real `gpt-5.5` API to lock the params**

Create `web/scripts/strategist-smoke.mjs` (throwaway):

```js
// Confirms the adapter's param set works against the live model. Run once.
import { readFileSync } from "node:fs";
const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const key = env.match(/^OPENAI_API_KEY=(.+)$/m)?.[1]?.replace(/['"]/g, "").trim();
const model = process.env.STRATEGIST_MODEL ?? "gpt-5.5";
const res = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
  body: JSON.stringify({
    model,
    max_completion_tokens: 200,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "Return strict JSON." },
      { role: "user", content: 'Return {"ok": true} only.' },
    ],
  }),
});
console.log("status", res.status);
const data = await res.json();
console.log(JSON.stringify(data.choices?.[0]?.message?.content ?? data, null, 2));
```

Run: `cd web && node scripts/strategist-smoke.mjs`
Expected: `status 200` and a JSON body like `{"ok": true}`.

**If status is 400** with a param error (e.g. "Unsupported parameter: max_completion_tokens" or "temperature unsupported" or a required `reasoning_effort`): adjust `openai-strategist.ts` to the exact contract the error states (e.g. add `reasoning_effort: "medium"`, or rename the token param), then re-run the smoke until `status 200`. This task's deliverable is an adapter PROVEN against the live model. Record the final working param set in the report.

- [ ] **Step 3: Delete the throwaway smoke script**

```bash
rm web/scripts/strategist-smoke.mjs
```

- [ ] **Step 4: Typecheck + lint the adapter**

Run: `cd web && npx tsc --noEmit 2>&1 | grep openai-strategist || echo "clean" ; npx eslint lib/strategy-engine/openai-strategist.ts`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add web/lib/strategy-engine/openai-strategist.ts
git commit -m "feat(strategy): OpenAI CallModel adapter (gpt-5.5 via STRATEGIST_MODEL, params verified live)"
```

---

### Task 3: Rewire the generate route to the strategist

**Files:**
- Modify: `web/app/api/strategy/generate/route.ts`

**Interfaces:**
- Consumes: `buildTacticMenu` (`./tactic-scoring`), `classifyGoal` + `budgetTierToMonthlyUsd` (`./tactics`), `buildStrategistOutput` + `GroundingError` (`./strategist`), `createOpenAICallModel` + `resolveStrategistModel` (`./openai-strategist`), the Task 1 mappers, plus the existing deterministic assembly.

- [ ] **Step 1: Replace the archetype-plan + narrator block with the strategist**

In `web/app/api/strategy/generate/route.ts`, keep everything through the data assembly (`assembleStrategyInputs`, `oppCounties`, `measured`, `creativesRes`, `marketLabel`, `inputs.top_advertisers`, `stateDmas`, `buildCompetitiveChannels`, `buildHandoff`). Replace the deterministic-core + LLM-narrator section (the `detectGorilla`/`scoreArchetypes`/`buildStrategyPlan`/`buildRecommendations` block AND the entire `fetch("https://api.openai.com/...")` narrator block + `validateStrategyProse`) with:

```ts
import { buildTacticMenu } from "@/lib/strategy-engine/tactic-scoring";
import { classifyGoal, budgetTierToMonthlyUsd } from "@/lib/strategy-engine/tactics";
import { buildStrategistOutput, GroundingError } from "@/lib/strategy-engine/strategist";
import { createOpenAICallModel, resolveStrategistModel } from "@/lib/strategy-engine/openai-strategist";
import {
  strategistToRecommendations,
  strategistToAllocation,
  strategistToProse,
} from "@/lib/strategy-engine/strategist-to-strategy";

// ── Build the tactic menu (deterministic) ───────────────────────────────────
const budgetMonthlyUsd = budgetTierToMonthlyUsd(body.budget_tier);
const menu = buildTacticMenu(inputs, { goal: classifyGoal(body.goal), budgetMonthlyUsd });

// ── Run the grounded strategist (AI selects + writes; code owns numbers) ─────
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
const llmStartedAt = Date.now();
let strategistOut;
try {
  strategistOut = await buildStrategistOutput({
    menu,
    promptFacts: {
      market_label: marketLabel,
      tort_label: tortLabel,
      voice: body.audience,
      goal_text: body.goal,
      recommended_tactic_count: menu.recommended_tactic_count,
      outlets: inputs.outlets,
      advertisers: inputs.top_advertisers,
      demographic_note: undefined, // 4b populates from richer interview/demographic mix
    },
    groundingFacts: { outletNames: new Set(inputs.outlets.map((o) => o.name.toLowerCase())) },
    outlets: inputs.outlets,
    foundation: {}, // 4b populates from the readiness interview answers
    confidence: menu.market_opportunity_intensity != null ? "moderate" : "directional",
    callModel: createOpenAICallModel({ apiKey, signal: controller.signal }),
  });
} catch (err) {
  clearTimeout(timeout);
  if (err instanceof DOMException && err.name === "AbortError") {
    return NextResponse.json({ error: "AI service timed out" }, { status: 504 });
  }
  if (err instanceof GroundingError) {
    return NextResponse.json({ error: "AI response failed validation", errors: err.errors }, { status: 502 });
  }
  console.error("strategist error:", err);
  return NextResponse.json({ error: "Internal error generating strategy" }, { status: 500 });
}
clearTimeout(timeout);
const latency_ms = Date.now() - llmStartedAt;

const mapFacts = {
  market_label: marketLabel,
  top_advertiser: inputs.top_advertisers[0]?.name ?? null,
  opportunity_intensity: menu.market_opportunity_intensity,
};
const recommendations = strategistToRecommendations(strategistOut, menu, mapFacts);
const watch_list: { channel: ChannelKey; reason: string }[] = [];
```

- [ ] **Step 2: Update `trackCall` to the strategist model**

Replace the `trackCall` block's `model`/`meta` with:

```ts
const tracked = await trackCall(supabase, {
  user_id: user.id,
  firm_id: null,
  purpose: "strategy_engine",
  provider: "openai",
  model: resolveStrategistModel(),
  called_from: "api/strategy/generate",
  usage: { input_tokens: 0, output_tokens: 0 }, // token usage not surfaced by the adapter in 4a
  latency_ms,
  meta: { state, tort: tortSlug, audience: body.audience, tactics: strategistOut.briefs.length, confidence: strategistOut.confidence },
});
```

- [ ] **Step 3: Update the payload assembly to the mapped strategist output**

Change the `integrated_plan`, `prose`, and `confidence` fields of the `payload: Strategy` object:

```ts
integrated_plan: {
  allocation: strategistToAllocation(strategistOut),
  cadence: "always_on",
  funnel_emphasis: classifyGoal(body.goal) === "brand" ? "brand_led" : "conversion_led",
},
handoff: buildHandoff(tortSlug, body.dma_code ?? null, recommendations, stateDmas),
prose: strategistToProse(strategistOut, mapFacts),
confidence: strategistOut.confidence,
data_warnings: [...dataErrors, ...strategistOut.warnings],
```

Leave `competitive`, `opportunity`, `brand`, `market`, `case_types`, `budget_tier`, `goal`, `audience` exactly as they are (deterministic). Remove now-unused imports (`detectGorilla`, `scoreArchetypes`, `buildStrategyPlan`, `buildRecommendations`, `STRATEGY_SYSTEM_PROMPT`, `buildStrategyUserPrompt`, `validateStrategyProse`, `stripJSONWrapper`, `leadMetricFor` if unused, `buildIntegratedPlan`) and any now-unused vars (`leadMetric` is still used by `opportunity`; keep it). Run tsc to find every unused symbol.

- [ ] **Step 4: Guard the empty-recommendations case**

After building `recommendations`, before assembling the payload, keep the deck's rigid contract satisfied:

```ts
if (recommendations.length === 0) {
  return NextResponse.json(
    { error: "The strategist returned no usable tactics for this market/budget." },
    { status: 422 },
  );
}
```

- [ ] **Step 5: Build + typecheck**

Run:
```bash
cd web && npx tsc --noEmit 2>&1 | grep -E "strategy/generate/route" || echo "route tsc clean"
npm run build 2>&1 | tail -5
```
Expected: route has no new tsc errors; build passes.

- [ ] **Step 6: Commit**

```bash
git add web/app/api/strategy/generate/route.ts
git commit -m "feat(strategy): wire generate route to the grounded strategist (gpt-5.5), retire the narrator"
```

- [ ] **Step 7: Browser-verify on prod after merge (definition of done — CLAUDE.md §2.7)**

After merge + Vercel deploy, with `STRATEGIST_MODEL=gpt-5.5` set in Vercel: sign in (QA admin), drive `/strategy`, run an interview (e.g. Alabama → Huntsville → trucking → 25k_75k → "more cases"), Generate, and confirm: (a) `POST /api/strategy/generate` returns 200 (read body if not), (b) no console errors, (c) the deck renders real recommendations with the AI's rationale + a budget split summing to 100 + Huntsville-scoped outlets, (d) screenshot. If 502 "failed validation", read `errors` — a grounding rejection means the prompt needs a nudge (note for a follow-up, don't hot-patch).

---

## Self-Review

**Spec coverage (4a = spec §9/§10 wiring + contract mapping):**
- §9 "AI selects, code owns numbers" now runs live: route builds the menu, calls `buildStrategistOutput`, maps the result. ✓
- §10 "preserve the deck-rendering Strategy contract; keep additive" → mapper fills `recommendations`/`integrated_plan`/`prose`; competitive/opportunity/brand/handoff unchanged. ✓
- Model: verified-available `gpt-5.5` via `STRATEGIST_MODEL`, params proven live (Task 2). ✓
- Grounding: `GroundingError` → 502; timeout → 504. ✓
- Deferred to 4b/4c (correctly): new interview fields + `foundation`/`demographic_note` population (4b); native media-brief rendering — format calls, reach targets, readiness slide (4c). Until then `foundation: {}` and `demographic_note: undefined` are safe (readiness shows "confirm" gaps; no demographic steer yet).

**Placeholder scan:** No TBD/TODO in shipped code. The `foundation: {}` / `demographic_note: undefined` are intentional, documented 4b seams, not placeholders. ✓

**Type consistency:** `StrategistMapFacts` is shared across the three mappers and the route's `mapFacts`. `strategistToRecommendations/Allocation/Prose` signatures match their call sites. `CallModel` from the adapter matches `buildStrategistOutput`'s param. `resolveStrategistModel()` used in both adapter and `trackCall`. ✓

**Risk notes for the implementer:**
- Verify `CHANNEL_LABELS` is exported from `recommendations.ts`; if not, add the export in Task 1 (the commit already stages `recommendations.ts`).
- The route currently imports many now-unused symbols — let `npx tsc --noEmit` (noUnusedLocals may be off; if so, eslint `no-unused-vars`) list them and remove each; don't leave dead imports.
- `LLM_TIMEOUT_MS` already exists (30_000). gpt-5.5 latency is higher than gpt-4o — if prod verification shows frequent 504s, raising the timeout or switching to a faster model id via `STRATEGIST_MODEL` is the lever (note for 4a's prod-verify, don't pre-tune).
- Do NOT commit `.env.local` or the smoke script.
