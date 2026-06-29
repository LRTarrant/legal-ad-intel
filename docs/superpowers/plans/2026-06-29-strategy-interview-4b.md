# Strategy Engine — Richer Interview (Plan 4b of 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the Strategy Engine interview so the user's answers actually shape the AI's strategy: finer budget tiers, a "lower cost per case" objective, an intake-capacity question, a free-text "what does winning look like / what's off-limits" box, current-advertising notes, and 4 foundation-readiness questions. Plumb them into the strategist so the two seams 4a left blank get filled — `foundation` (from readiness answers, powering the readiness gate) and `demographic_note` (derived from the market's demographic mix — the Hispanic-market → Spanish-formats case) — and wire token usage into cost tracking.

**Architecture:** Pure, tested backend pieces (contract + validation + two mapper functions + a demographic-note deriver) and one interview-UI change, wired through the existing route. No new tables, no migrations. The route already calls `buildStrategistOutput`; this populates its `foundation` and `promptFacts.{goal_text, demographic_note}` inputs from the richer interview, and adds usage capture to the OpenAI adapter via a callback (no `CallModel` signature change).

**Tech Stack:** TypeScript, Next.js 16 client component (interview), `node:test` via `npx tsx --test`. Reuses Plan 2 (`budgetTierToMonthlyUsd`, `classifyGoal`, `Prerequisite`), Plan 3 (`StrategistPromptFacts`, `computeReadiness`), Plan 4a (`createOpenAICallModel`, the mappers).

## Global Constraints

- **Test runner:** `npx tsx --test <file>` from `web/`. Import siblings without `.ts`.
- **No net-new TypeScript errors** vs main. `npx tsc --noEmit` from `web/`; only touched files count.
- **Backend budget tiers already exist:** `budgetTierToMonthlyUsd` (Plan 2) already maps `under_10k`, `10k_25k`, `25k_75k`, `75k_plus` (+ legacy). 4b only surfaces the finer tiers in the UI — do NOT re-add them server-side.
- **The only caller of `/api/strategy/generate` is `strategy-client.tsx`** — so new required interview fields are safe as long as that client is updated in the same plan.
- **Readiness maps to the Plan 3 `Prerequisite` union** (`landing_page | conversion_tracking | call_tracking | fast_intake | pixel | gbp_claimed | site_health | brand_creative | video_creative | audio_creative | credible_brand`). yes → prereq true, no → false, unsure → omit (so `computeReadiness` shows it as "confirm").
- **Code still owns numbers; the AI only gets richer framing text.** The free-text box and intake answer flow into `goal_text` (prompt framing), never into a numeric field.
- **Browser-verify on prod after merge** (CLAUDE.md §2.7) is the definition of done.

---

### Task 1: Contract + validation + readiness/goal mappers (`standalone.ts`)

**Files:**
- Modify: `web/lib/strategy-engine/standalone.ts`
- Test: `web/lib/strategy-engine/standalone.test.ts` (add cases)

**Interfaces:**
- Consumes: `Prerequisite` from `./tactics`.
- Produces (additions to `StrategyInterviewRequest` + new exports):
  ```ts
  export type ReadinessAnswer = "yes" | "no" | "unsure";
  // StrategyInterviewRequest gains:
  //   intake_capacity: string;                 // "steady" | "scale" | "high"
  //   goal_context: string;                    // the free-text "what winning looks like / off-limits"
  //   current_advertising_notes?: string;      // optional "what's working / not"
  //   readiness?: Record<string, ReadinessAnswer>;
  export const READINESS_QUESTIONS: ReadonlyArray<{ key: string; label: string; prerequisites: Prerequisite[] }>;
  export function readinessToFoundation(readiness: Record<string, ReadinessAnswer> | undefined): Partial<Record<Prerequisite, boolean>>;
  export function buildGoalText(body: Pick<StrategyInterviewRequest, "goal" | "goal_context" | "intake_capacity" | "current_advertising_notes">): string;
  ```

- [ ] **Step 1: Write the failing test**

Add to `web/lib/strategy-engine/standalone.test.ts` (create the file if it does not exist, using the same header style as the other tests; if it exists, append):

```ts
import {
  validateInterview,
  readinessToFoundation,
  buildGoalText,
  READINESS_QUESTIONS,
  type StrategyInterviewRequest,
} from "./standalone";

function base(): StrategyInterviewRequest {
  return {
    audience: "agency",
    case_types: ["trucking"],
    state: "AL",
    dma_code: "691",
    county_fips: null,
    budget_tier: "25k_75k",
    goal: "More qualified signups",
    existing_channels: ["paid_search"],
    intake_capacity: "scale",
    goal_context: "Win more truck cases in 90 days; no billboards.",
    readiness: { landing_pages: "yes", tracking: "no", intake: "unsure", web_presence: "yes" },
  };
}

test("validateInterview requires the new framing fields", () => {
  assert.deepEqual(validateInterview(base()), []);
  const noIntake = { ...base(), intake_capacity: "" };
  assert.ok(validateInterview(noIntake).some((e) => /intake/i.test(e)));
  const noContext = { ...base(), goal_context: "   " };
  assert.ok(validateInterview(noContext).some((e) => /winning|goal_context|what/i.test(e)));
});

test("readinessToFoundation maps yes/no/unsure to prerequisite booleans", () => {
  const f = readinessToFoundation(base().readiness);
  assert.equal(f.landing_page, true); // landing_pages: yes
  assert.equal(f.conversion_tracking, false); // tracking: no
  assert.equal(f.call_tracking, false);
  assert.equal(f.fast_intake, undefined); // intake: unsure → omitted
  assert.equal(f.site_health, true); // web_presence: yes
});

test("readinessToFoundation tolerates a missing readiness object", () => {
  assert.deepEqual(readinessToFoundation(undefined), {});
});

test("buildGoalText folds the framing into one string the prompt can use", () => {
  const t = buildGoalText(base());
  assert.ok(t.includes("More qualified signups"));
  assert.ok(/truck cases/.test(t)); // the free-text context
  assert.ok(/intake/i.test(t)); // intake capacity surfaced
});

test("every readiness question maps to at least one real prerequisite", () => {
  for (const q of READINESS_QUESTIONS) {
    assert.ok(q.prerequisites.length > 0, `${q.key} has no prerequisites`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx tsx --test lib/strategy-engine/standalone.test.ts`
Expected: FAIL — new exports/fields missing.

- [ ] **Step 3: Implement**

In `web/lib/strategy-engine/standalone.ts`, add the import and extend the interface + validation, and add the new exports. Add near the top imports:

```ts
import type { Prerequisite } from "./tactics";
```

Extend `StrategyInterviewRequest` (add these fields after `existing_channels`):

```ts
  existing_channels: string[]; // channels the firm already runs
  /** Intake capacity: "steady" | "scale" | "high". */
  intake_capacity: string;
  /** Free-text: what winning looks like in 90 days + anything off-limits. */
  goal_context: string;
  /** Optional free-text: what's currently working / not working. */
  current_advertising_notes?: string;
  /** Foundation-readiness answers, keyed by READINESS_QUESTIONS[].key. */
  readiness?: Record<string, ReadinessAnswer>;
```

Add the `ReadinessAnswer` type just above `StrategyInterviewRequest`:

```ts
export type ReadinessAnswer = "yes" | "no" | "unsure";
```

Extend `validateInterview` (add before `return errors;`):

```ts
  if (!body.intake_capacity || body.intake_capacity.trim() === "") {
    errors.push("intake capacity is required");
  }
  if (!body.goal_context || body.goal_context.trim() === "") {
    errors.push("a note on what winning looks like is required");
  }
```

Add the new exports (after `validateInterview`):

```ts
/**
 * The foundation-readiness questions. Each maps to one or more Plan 3
 * Prerequisites; a "yes" marks them satisfied, a "no" marks them missing, and
 * "unsure" leaves them to surface as a "confirm" in the readiness gate.
 */
export const READINESS_QUESTIONS: ReadonlyArray<{
  key: string;
  label: string;
  prerequisites: Prerequisite[];
}> = [
  { key: "landing_pages", label: "Dedicated landing pages for paid traffic?", prerequisites: ["landing_page"] },
  { key: "tracking", label: "Call + conversion tracking in place?", prerequisites: ["conversion_tracking", "call_tracking", "pixel"] },
  { key: "intake", label: "Does intake call leads back within minutes?", prerequisites: ["fast_intake"] },
  { key: "web_presence", label: "A site + claimed Google Business Profile to send traffic to?", prerequisites: ["site_health", "gbp_claimed", "credible_brand"] },
];

export function readinessToFoundation(
  readiness: Record<string, ReadinessAnswer> | undefined,
): Partial<Record<Prerequisite, boolean>> {
  const out: Partial<Record<Prerequisite, boolean>> = {};
  if (!readiness) return out;
  for (const q of READINESS_QUESTIONS) {
    const ans = readiness[q.key];
    if (ans === "yes") for (const p of q.prerequisites) out[p] = true;
    else if (ans === "no") for (const p of q.prerequisites) out[p] = false;
    // "unsure" or missing → leave undefined (the gate shows "confirm")
  }
  return out;
}

const INTAKE_LABEL: Record<string, string> = {
  steady: "needs a steady, manageable flow of leads",
  scale: "can scale up intake to handle a volume increase",
  high: "has high intake capacity and wants maximum volume",
};

export function buildGoalText(
  body: Pick<StrategyInterviewRequest, "goal" | "goal_context" | "intake_capacity" | "current_advertising_notes">,
): string {
  const parts = [`Primary objective: ${body.goal}.`];
  if (body.goal_context?.trim()) parts.push(`What winning looks like / constraints: ${body.goal_context.trim()}`);
  const intake = INTAKE_LABEL[body.intake_capacity];
  if (intake) parts.push(`Intake: the firm ${intake}.`);
  if (body.current_advertising_notes?.trim()) parts.push(`Currently running: ${body.current_advertising_notes.trim()}`);
  return parts.join(" ");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx tsx --test lib/strategy-engine/standalone.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/lib/strategy-engine/standalone.ts web/lib/strategy-engine/standalone.test.ts
git commit -m "feat(strategy): richer interview contract — intake, goal context, readiness→foundation mappers"
```

---

### Task 2: Derive a demographic note from the market's mix (`audience-fit.ts` + assembler)

**Files:**
- Modify: `web/lib/strategy-engine/audience-fit.ts` (add `deriveDemographicNote`)
- Modify: `web/lib/strategy-engine/types.ts` (add `demographic_note` to `StrategyInputs`)
- Modify: `web/lib/strategy-engine/assemble-inputs.ts` (compute + set it)
- Test: `web/lib/strategy-engine/audience-fit.test.ts` (create or append)

**Interfaces:**
- Consumes: `DemographicMix` from `./audience-fit`.
- Produces:
  ```ts
  export function deriveDemographicNote(mix: DemographicMix): string | null;
  // StrategyInputs gains: demographic_note: string | null;
  ```

- [ ] **Step 1: Write the failing test**

Create `web/lib/strategy-engine/audience-fit.test.ts` (or append if present):

```ts
/** Run with: npx tsx --test lib/strategy-engine/audience-fit.test.ts */
import test from "node:test";
import assert from "node:assert/strict";
import { deriveDemographicNote, type DemographicMix } from "./audience-fit";

function mix(over: Partial<DemographicMix["race"]> = {}): DemographicMix {
  return {
    race: { black: 0.2, white: 0.6, hispanic: 0.1, asian: 0.03, ...over },
    age: { "18_29": 0.2, "25_54": 0.4, "50_plus": 0.3, "65_plus": 0.15 },
  };
}

test("flags a high-Hispanic market for Spanish-language formats", () => {
  const note = deriveDemographicNote(mix({ hispanic: 0.42, white: 0.4 }));
  assert.ok(note && /hispanic/i.test(note) && /spanish/i.test(note));
});

test("flags a high-Black market for urban formats", () => {
  const note = deriveDemographicNote(mix({ black: 0.45, white: 0.4 }));
  assert.ok(note && /(black|urban)/i.test(note));
});

test("returns null for a market with no over-indexing signal", () => {
  assert.equal(deriveDemographicNote(mix()), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx tsx --test lib/strategy-engine/audience-fit.test.ts`
Expected: FAIL — `deriveDemographicNote` not exported.

- [ ] **Step 3: Implement the deriver**

Append to `web/lib/strategy-engine/audience-fit.ts`:

```ts
/**
 * A short, deterministic media-relevant note about the market's demographic
 * mix — the steer the AI uses for format/language choices (e.g. a
 * Hispanic-heavy metro → Spanish-language radio/TV). Thresholds are directional
 * (a population share well above the U.S. average). null when nothing
 * over-indexes enough to change a format call.
 */
export function deriveDemographicNote(mix: DemographicMix): string | null {
  const notes: string[] = [];
  if (mix.race.hispanic >= 0.25) {
    notes.push(
      `Hispanic population is significant (~${Math.round(mix.race.hispanic * 100)}%); Spanish-language radio/TV and regional formats over-index here.`,
    );
  }
  if (mix.race.black >= 0.3) {
    notes.push(
      `Black population is significant (~${Math.round(mix.race.black * 100)}%); Urban/Urban-AC radio and culturally targeted creative over-index here.`,
    );
  }
  return notes.length ? notes.join(" ") : null;
}
```

- [ ] **Step 4: Expose it on `StrategyInputs` and set it in the assembler**

In `web/lib/strategy-engine/types.ts`, add to the `StrategyInputs` interface (next to `local_signal`):

```ts
  /** Short demographic steer for format/language choices, or null. */
  demographic_note: string | null;
```

In `web/lib/strategy-engine/assemble-inputs.ts`: import the deriver and compute the note from the mix that's already built for audience fit. The mix is currently built inside the `if (baselineRows.length > 0)` block via `buildDemographicMix(censusRows)`. Hoist the mix so it's available for the note too. Change:

```ts
  if (baselineRows.length > 0) {
    const mix = buildDemographicMix(censusRows);
    for (const [ch, f] of computeAudienceFit(baselineRows, mix)) {
      channelFit.set(ch, { fit: f.fit, scope: f.scope, sources: f.sources });
    }
  }
```
to:
```ts
  const demographicMix = buildDemographicMix(censusRows);
  if (baselineRows.length > 0) {
    for (const [ch, f] of computeAudienceFit(baselineRows, demographicMix)) {
      channelFit.set(ch, { fit: f.fit, scope: f.scope, sources: f.sources });
    }
  }
```

Add the import at the top (extend the existing `audience-fit` import):

```ts
import {
  buildDemographicMix,
  computeAudienceFit,
  deriveDemographicNote,
  type BaselineRow,
  type CensusRow,
} from "./audience-fit";
```

Add `demographic_note` to the returned `inputs` object (next to `local_signal`):

```ts
    local_signal,
    demographic_note: deriveDemographicNote(demographicMix),
```

- [ ] **Step 5: Run tests + check the assembler tests still pass**

Run:
```bash
cd web && npx tsx --test lib/strategy-engine/audience-fit.test.ts lib/strategy-engine/assemble-inputs.test.ts
```
Expected: all PASS. (The assemble-inputs fixtures pass `census_demographics: []`, so `buildDemographicMix([])` must return a valid empty mix and `deriveDemographicNote` must return null — confirm `buildDemographicMix` handles an empty array without throwing; it does, but verify.)

- [ ] **Step 6: Commit**

```bash
git add web/lib/strategy-engine/audience-fit.ts web/lib/strategy-engine/types.ts web/lib/strategy-engine/assemble-inputs.ts web/lib/strategy-engine/audience-fit.test.ts
git commit -m "feat(strategy): derive a demographic media note (Hispanic→Spanish, etc.) on StrategyInputs"
```

---

### Task 3: Wire the richer interview through the route + capture token usage

**Files:**
- Modify: `web/app/api/strategy/generate/route.ts`
- Modify: `web/lib/strategy-engine/openai-strategist.ts` (add a usage callback)

**Interfaces:**
- `createOpenAICallModel` gains an optional `onUsage` callback so the route can record tokens in `trackCall` without changing the `CallModel` return type.

- [ ] **Step 1: Add a usage callback to the adapter**

In `web/lib/strategy-engine/openai-strategist.ts`, extend the options and call the callback when usage is present:

```ts
export function createOpenAICallModel(opts: {
  apiKey: string;
  signal?: AbortSignal;
  maxOutputTokens?: number;
  onUsage?: (u: { input_tokens: number; output_tokens: number }) => void;
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
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    if (opts.onUsage && data.usage) {
      opts.onUsage({
        input_tokens: data.usage.prompt_tokens ?? 0,
        output_tokens: data.usage.completion_tokens ?? 0,
      });
    }
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("OpenAI returned empty content");
    return content;
  };
}
```

- [ ] **Step 2: Wire the interview fields through the route**

In `web/app/api/strategy/generate/route.ts`:

Add the imports (extend the existing `standalone` import to include the new helpers):

```ts
import {
  buildCompetitiveChannels,
  buildHandoff,
  buildIntegratedPlan,
  leadMetricFor,
  primaryTort,
  validateInterview,
  readinessToFoundation,
  buildGoalText,
  type MarketCreative,
  type Strategy,
  type StrategyInterviewRequest,
} from "@/lib/strategy-engine/standalone";
```

Before the `buildStrategistOutput` call, capture usage and build the foundation/goal text:

```ts
let usage = { input_tokens: 0, output_tokens: 0 };
```

Change the `buildStrategistOutput` args so `foundation`, `promptFacts.goal_text`, `promptFacts.demographic_note`, and the adapter's `onUsage` are populated:

```ts
    promptFacts: {
      market_label: marketLabel,
      tort_label: tortLabel,
      voice: body.audience,
      goal_text: buildGoalText(body),
      recommended_tactic_count: menu.recommended_tactic_count,
      outlets: inputs.outlets,
      advertisers: inputs.top_advertisers,
      demographic_note: inputs.demographic_note ?? undefined,
    },
    groundingFacts: { outletNames: new Set(inputs.outlets.map((o) => o.name.toLowerCase())) },
    outlets: inputs.outlets,
    foundation: readinessToFoundation(body.readiness),
    confidence: menu.market_opportunity_intensity != null ? "moderate" : "directional",
    callModel: createOpenAICallModel({
      apiKey,
      signal: controller.signal,
      onUsage: (u) => { usage = u; },
    }),
```

- [ ] **Step 3: Use the captured usage in `trackCall`**

Change the `trackCall` `usage` field from the hard-coded zeros to the captured value:

```ts
    usage,
```

- [ ] **Step 4: Build + typecheck**

Run:
```bash
cd web && npx tsc --noEmit 2>&1 | grep -E "strategy/generate/route|openai-strategist" || echo "route+adapter tsc clean"
npm run build 2>&1 | tail -4
```
Expected: no new tsc errors in the touched files; build passes.

- [ ] **Step 5: Commit**

```bash
git add web/app/api/strategy/generate/route.ts web/lib/strategy-engine/openai-strategist.ts
git commit -m "feat(strategy): wire readiness→foundation, goal context, demographic note + token usage into the route"
```

---

### Task 4: Surface the new fields in the interview UI

**Files:**
- Modify: `web/app/(app)/strategy/strategy-client.tsx`

- [ ] **Step 1: Update the constants + state**

Replace `BUDGET_TIERS` and `GOALS`, and add the new option lists (near the other consts, ~lines 29-35):

```ts
const BUDGET_TIERS = [
  { key: "under_10k", label: "Under $10K/mo" },
  { key: "10k_25k", label: "$10K–$25K/mo" },
  { key: "25k_75k", label: "$25K–$75K/mo" },
  { key: "75k_plus", label: "$75K+/mo" },
];
const GOALS = ["More qualified signups", "Lower cost per case", "Brand awareness", "Enter a new market", "Defend share"];
const CHANNELS = ["paid_search", "broadcast_tv", "billboards", "radio", "social", "ctv"];
const INTAKE_OPTIONS = [
  { key: "steady", label: "Steady flow" },
  { key: "scale", label: "Can scale up" },
  { key: "high", label: "High capacity" },
];
const READINESS = [
  { key: "landing_pages", label: "Dedicated landing pages for paid traffic?" },
  { key: "tracking", label: "Call + conversion tracking in place?" },
  { key: "intake", label: "Intake calls leads back within minutes?" },
  { key: "web_presence", label: "Site + claimed Google Business Profile?" },
];
const READINESS_ANSWERS = ["yes", "no", "unsure"] as const;
```

Update the default `budgetTier` and add the new state (replace the `useState("75k_plus")` line and add new hooks after `existingChannels`):

```ts
  const [budgetTier, setBudgetTier] = useState("25k_75k");
  const [goal, setGoal] = useState(GOALS[0]);
  const [existingChannels, setExistingChannels] = useState<string[]>(["paid_search", "billboards"]);
  const [intakeCapacity, setIntakeCapacity] = useState("scale");
  const [goalContext, setGoalContext] = useState("");
  const [currentAdNotes, setCurrentAdNotes] = useState("");
  const [readiness, setReadiness] = useState<Record<string, string>>({});
```

- [ ] **Step 2: Send the new fields in the request body**

Update the `fetch` body and the `generate` dependency array:

```ts
        body: JSON.stringify({
          audience,
          case_types: caseTypes,
          state: stateCode,
          dma_code: dmaCode || null,
          county_fips: null,
          budget_tier: budgetTier,
          goal,
          existing_channels: existingChannels,
          intake_capacity: intakeCapacity,
          goal_context: goalContext,
          current_advertising_notes: currentAdNotes || undefined,
          readiness,
        }),
```

And the dependency array of the `useCallback`:

```ts
  }, [audience, caseTypes, stateCode, dmaCode, budgetTier, goal, existingChannels, intakeCapacity, goalContext, currentAdNotes, readiness]);
```

- [ ] **Step 3: Render the new fields**

After the existing `Existing channels` `Field` block (before the Generate button), add:

```tsx
        <Field label="Intake capacity">
          <div className="flex flex-wrap gap-2">
            {INTAKE_OPTIONS.map((o) => (
              <Pill key={o.key} active={intakeCapacity === o.key} onClick={() => setIntakeCapacity(o.key)}>{o.label}</Pill>
            ))}
          </div>
        </Field>
        <Field label="What does winning look like in 90 days? Anything off-limits?">
          <textarea
            value={goalContext}
            onChange={(e) => setGoalContext(e.target.value)}
            rows={3}
            placeholder="e.g. 25 signed truck cases a quarter; we don't do billboards or daytime TV."
            className="w-full rounded-lg border border-cloud px-3 py-2 text-sm"
          />
        </Field>
        <Field label="What are you running now, and what's working? (optional)">
          <textarea
            value={currentAdNotes}
            onChange={(e) => setCurrentAdNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Search converts well, TV didn't pay back."
            className="w-full rounded-lg border border-cloud px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Foundation check">
          <div className="space-y-2">
            {READINESS.map((q) => (
              <div key={q.key} className="flex flex-wrap items-center gap-2">
                <span className="min-w-[16rem] text-sm text-slate-gray">{q.label}</span>
                {READINESS_ANSWERS.map((a) => (
                  <Pill key={a} active={readiness[q.key] === a} onClick={() => setReadiness({ ...readiness, [q.key]: a })}>{pretty(a)}</Pill>
                ))}
              </div>
            ))}
          </div>
        </Field>
```

- [ ] **Step 4: Gate the Generate button on the new required fields**

Update the Generate button `disabled`:

```tsx
          disabled={loading || caseTypes.length === 0 || !intakeCapacity || goalContext.trim() === ""}
```

- [ ] **Step 5: Build + lint**

Run:
```bash
cd web && npx tsc --noEmit 2>&1 | grep "strategy-client" || echo "client tsc clean"
npx eslint "app/(app)/strategy/strategy-client.tsx"
npm run build 2>&1 | tail -3
```
Expected: no new tsc errors in the client; lint clean; build passes.

- [ ] **Step 6: Commit**

```bash
git add "web/app/(app)/strategy/strategy-client.tsx"
git commit -m "feat(strategy): richer interview UI — finer budget, intake, goal context, readiness check"
```

- [ ] **Step 7: Browser-verify on prod after merge (definition of done — CLAUDE.md §2.7)**

After deploy: drive `/strategy`, fill the new fields (intake = "Can scale up", a free-text goal, set the 4 readiness questions with a mix of yes/no/unsure), Generate, and confirm: (a) POST 200; (b) the strategy reflects the framing (e.g. a leads-tilted free-text goal yields a conversion-weighted plan; "no billboards" is respected); (c) a market with a high Hispanic share (try a TX or CA metro) surfaces Spanish-language/format guidance in the radio rationale; (d) the readiness answers change the "before you spend a dollar" gaps; (e) no console errors; (f) screenshot.

---

## Self-Review

**Spec coverage (4b = spec §3 interview + the §6 readiness gate + §8 demographic note):**
- §3 finer budget tiers → Task 4 (`under_10k`/`10k_25k` surfaced; backend already supports them). ✓
- §3 intake capacity (required) → contract + validation (Task 1) + UI + Generate gate (Task 4). ✓
- §3 free-text "what winning looks like / off-limits" (required) → `goal_context` → `buildGoalText` → prompt `goal_text` (Task 1, 3, 4). ✓
- §3 current-advertising notes (optional) → `current_advertising_notes` → `buildGoalText` (Task 1, 3, 4). ✓
- §3 + §6 readiness yes/no/unsure → `readiness` → `readinessToFoundation` → route `foundation` → Plan 3 `computeReadiness` "before you spend a dollar" gate (Task 1, 3, 4). ✓
- §3 "lower cost per case" objective → added to `GOALS`; `classifyGoal` already maps it to `lower_cpa` (Task 4). ✓
- §8 demographic note (Hispanic→Spanish) → `deriveDemographicNote` on `StrategyInputs` → route `promptFacts.demographic_note` (Task 2, 3). ✓
- 4a seams filled: `foundation: {}` → readiness; `demographic_note: undefined` → derived. Token usage 0/0 → captured via `onUsage` (Task 3). ✓
- Geographic priority: covered by the existing State + Market(DMA) selectors (county-level selection stays out of scope; `county_fips` remains null). Documented, not a gap.
- Deferred to 4c (correctly): native deck rendering of the readiness gate, format calls, reach targets, and the per-tactic allocation-label fix.

**Placeholder scan:** No TBD/TODO in shipped code; every step has complete code; commands exact. ✓

**Type consistency:** `ReadinessAnswer` defined once in `standalone.ts`, used by `readinessToFoundation` + the request type; the UI stores `Record<string,string>` and sends it (structurally compatible). `Prerequisite` imported from `./tactics` in `standalone.ts`. `deriveDemographicNote(DemographicMix)` matches its test + the assembler call. `buildGoalText` takes a `Pick<StrategyInterviewRequest, ...>` satisfied by the full `body`. `onUsage` shape matches the `usage` object the route passes to `trackCall`. ✓

**Risk notes for the implementer:**
- `buildDemographicMix([])` must not throw on the empty-census fixtures in `assemble-inputs.test.ts` — verify (it returns a zeroed mix) before relying on the hoist in Task 2 Step 4.
- The route's `body` is typed `StrategyInterviewRequest`; after Task 1 it carries the new required fields, so `buildGoalText(body)` and `readinessToFoundation(body.readiness)` type-check without casts.
- Keep `county_fips: null` in the request (unchanged) — county-level geo is out of scope for 4b.
