# Strategy Engine — Native Deck Rendering (Plan 4c of 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the redesign's rendering. Surface the strategist's "before you spend a dollar" readiness gate natively in the live deck and the PPTX (it's computed today but never reaches the contract), and fix the integrated-plan budget chart so each tactic is labeled distinctly instead of two "Paid search 22%" / two "Facebook 22%" bars.

**Architecture:** Add a `readiness` field to the `Strategy` contract, map it from `StrategistOutput.readiness` (with human-readable labels) in the existing `strategist-to-strategy.ts` mapper, set it in the route, and render it in both renderers. Fix the allocation duplicate-label/key bug by labeling each allocation line with the **tactic** label (already unique) instead of the channel label. Pure mapper changes are unit-tested; the two renderers are browser/PPTX-verified.

**Tech Stack:** TypeScript, Next.js 16 client deck component, pptxgenjs SlideSpec builder, `node:test` via `npx tsx --test`. Reuses Plan 3 (`StrategistOutput.readiness`, `Prerequisite`) and Plan 4a (`strategist-to-strategy.ts`).

## Global Constraints

- **Test runner:** `npx tsx --test <file>` from `web/`. Import siblings without `.ts`.
- **No net-new TypeScript errors** vs main; `npm run build` must pass.
- **Additive contract change only:** `Strategy` gains a `readiness` field; nothing existing is removed or retyped. Renderers must tolerate an absent/empty `readiness` (a payload generated before this deploy won't have it — guard with `?? []`).
- **Code still owns numbers:** the readiness items carry no new numbers; allocation percentages are unchanged (only the *label* source changes from channel → tactic).
- **The PPTX builder is PURE** (no Supabase/React) — keep it that way.
- **Browser-verify on prod after merge** (CLAUDE.md §2.7): the readiness section renders, the budget chart shows distinct tactic labels, and a PPTX download still succeeds.

---

### Task 1: Add `readiness` to the contract + mapper, fix allocation labels

**Files:**
- Modify: `web/lib/strategy-engine/standalone.ts` (add `ReadinessItem` + `Strategy.readiness`)
- Modify: `web/lib/strategy-engine/strategist-to-strategy.ts` (add `strategistToReadiness`, `PREREQUISITE_LABELS`; fix `strategistToAllocation`)
- Test: `web/lib/strategy-engine/strategist-to-strategy.test.ts` (add cases)

**Interfaces:**
- Produces:
  ```ts
  // standalone.ts
  export interface ReadinessItem { label: string; status: "missing" | "confirm"; tactics: string[]; }
  // Strategy gains: readiness: ReadinessItem[];
  // strategist-to-strategy.ts
  export function strategistToReadiness(out: StrategistOutput, menu: TacticMenu): ReadinessItem[];
  // strategistToAllocation now labels by tactic, not channel.
  ```

- [ ] **Step 1: Write the failing test**

Add to `web/lib/strategy-engine/strategist-to-strategy.test.ts` (it already imports `test`, `assert`, `buildTacticMenu`, the fixtures, and `StrategistOutput`; add `strategistToReadiness` and `strategistToAllocation` to the import from `./strategist-to-strategy` if not already there):

```ts
import { strategistToReadiness } from "./strategist-to-strategy";

test("allocation labels each tactic distinctly, even when two share a channel", () => {
  const o = out(); // has google_search (search) + radio; extend with a 2nd search tactic
  o.briefs.push({
    tactic: menu().tactics.find((s) => s.tactic.key === "seo_gbp")!.tactic,
    rationale: "Local organic.", format_call: [], example_outlets: [], reach_target: null, allocation_pct: 0, affordable: true,
  });
  const alloc = strategistToAllocation(o);
  const searchLabels = alloc.filter((a) => a.channel === "search").map((a) => a.label);
  assert.equal(new Set(searchLabels).size, searchLabels.length, "two search tactics must have distinct labels");
  assert.ok(searchLabels.includes("Google Search (injury keywords)"));
  assert.ok(searchLabels.includes("SEO + Google Business Profile"));
});

test("strategistToReadiness maps prerequisites to labels, keys to tactic labels, and sorts missing first", () => {
  const o = out();
  o.readiness = [
    { prerequisite: "landing_page", status: "confirm", tactics: ["google_search"] },
    { prerequisite: "fast_intake", status: "missing", tactics: ["google_search"] },
  ];
  const items = strategistToReadiness(o, menu());
  assert.equal(items[0].status, "missing", "missing items sort first");
  assert.ok(items[0].label.length > 5 && !/_/.test(items[0].label), "prerequisite rendered as a human label");
  assert.ok(items.some((i) => i.tactics.includes("Google Search (injury keywords)")), "tactic key resolved to its label");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx tsx --test lib/strategy-engine/strategist-to-strategy.test.ts`
Expected: FAIL — `strategistToReadiness` not exported / labels still channel-based.

- [ ] **Step 3: Add `ReadinessItem` + `Strategy.readiness`**

In `web/lib/strategy-engine/standalone.ts`, add the type (just above `interface Strategy`):

```ts
export interface ReadinessItem {
  /** Human-readable foundation item, e.g. "Dedicated landing pages for paid traffic". */
  label: string;
  /** "missing" = the firm said they don't have it; "confirm" = unverified. */
  status: "missing" | "confirm";
  /** Tactic labels that depend on this foundation. */
  tactics: string[];
}
```

Add the field to `Strategy` (after `watch_list`):

```ts
  watch_list: WatchItem[];
  /** Foundation gaps for the selected tactics — the "before you spend a dollar" gate. */
  readiness: ReadinessItem[];
```

- [ ] **Step 4: Add the mapper + fix the allocation labels**

In `web/lib/strategy-engine/strategist-to-strategy.ts`:

Update the imports — add `StrategistOutput` already imported; add `Prerequisite` from `./tactics`, `ReadinessItem` from `./standalone`, and REMOVE the now-unused `CHANNEL_LABELS` import:

```ts
import type { MediaBrief, StrategistOutput } from "./strategist";
import type { TacticMenu, ScoredTactic } from "./tactic-scoring";
import type { Recommendation, RecommendationLink, ProofPoint, DataDepth } from "./recommendations";
import type { IntegratedAllocation, ReadinessItem, StrategyProse } from "./standalone";
import type { Prerequisite } from "./tactics";
```

(Delete the line `import { CHANNEL_LABELS } from "./recommendations";`.)

Change `strategistToAllocation` to label by tactic:

```ts
export function strategistToAllocation(out: StrategistOutput): IntegratedAllocation[] {
  return out.briefs.map((b) => ({
    channel: b.tactic.channel,
    label: b.tactic.label, // per-tactic, so two same-channel tactics don't collide
    stage: b.tactic.funnel_stage,
    pct: b.allocation_pct,
  }));
}
```

Add the prerequisite labels + the readiness mapper at the end of the file:

```ts
const PREREQUISITE_LABELS: Record<Prerequisite, string> = {
  landing_page: "Dedicated landing pages for paid traffic",
  conversion_tracking: "Conversion tracking",
  call_tracking: "Call tracking",
  fast_intake: "Fast intake — leads called back within minutes",
  pixel: "Retargeting pixel installed",
  gbp_claimed: "Claimed Google Business Profile",
  site_health: "A healthy website to send traffic to",
  brand_creative: "Brand creative ready to run",
  video_creative: "Video creative ready to run",
  audio_creative: "Audio creative / scripts ready",
  credible_brand: "A credible brand presence",
};

export function strategistToReadiness(out: StrategistOutput, menu: TacticMenu): ReadinessItem[] {
  const labelByKey = new Map(menu.tactics.map((s) => [s.tactic.key, s.tactic.label]));
  return out.readiness
    .map((g) => ({
      label: PREREQUISITE_LABELS[g.prerequisite] ?? g.prerequisite,
      status: g.status,
      tactics: g.tactics.map((k) => labelByKey.get(k) ?? k),
    }))
    .sort((a, b) => (a.status === "missing" ? 0 : 1) - (b.status === "missing" ? 0 : 1));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd web && npx tsx --test lib/strategy-engine/strategist-to-strategy.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/lib/strategy-engine/standalone.ts web/lib/strategy-engine/strategist-to-strategy.ts web/lib/strategy-engine/strategist-to-strategy.test.ts
git commit -m "feat(strategy): map readiness gate to the contract + label allocation by tactic"
```

---

### Task 2: Set `readiness` in the route

**Files:**
- Modify: `web/app/api/strategy/generate/route.ts`

- [ ] **Step 1: Import the mapper**

Extend the existing `strategist-to-strategy` import:

```ts
import {
  strategistToRecommendations,
  strategistToAllocation,
  strategistToProse,
  strategistToReadiness,
} from "@/lib/strategy-engine/strategist-to-strategy";
```

- [ ] **Step 2: Set the field in the payload**

In the `payload: Strategy` object, after `watch_list`:

```ts
  recommendations,
  watch_list,
  readiness: strategistToReadiness(strategistOut, menu),
```

- [ ] **Step 3: Typecheck + build**

Run:
```bash
cd web && npx tsc --noEmit 2>&1 | grep -E "strategy/generate/route" || echo "route tsc clean"
npm run build 2>&1 | tail -3
```
Expected: no new tsc errors in the route; build passes (the new required `Strategy.readiness` is now satisfied at its single construction site).

- [ ] **Step 4: Commit**

```bash
git add web/app/api/strategy/generate/route.ts
git commit -m "feat(strategy): populate the readiness gate in the generate payload"
```

---

### Task 3: Render the readiness section in the live deck + fix the chart key

**Files:**
- Modify: `web/app/(app)/strategy/strategy-deck.tsx`

- [ ] **Step 1: Fix the allocation bar React key**

In the integrated-plan map (the `data.integrated_plan?.allocation ?? []).map((a: any) => (` block), the key is `a.channel`, which now collides when two tactics share a channel. Change the map to include the index and key on it:

```tsx
          {(data.integrated_plan?.allocation ?? []).map((a: any, i: number) => (
            <div key={i} className="flex items-center gap-4">
```

- [ ] **Step 2: Add the readiness section before the Handoff**

Immediately before the `{/* 12. HANDOFF */}` comment / its `<section>`, insert:

```tsx
      {/* 11b. BEFORE YOU SPEND A DOLLAR */}
      {(data.readiness ?? []).length > 0 ? (
        <Slide eyebrow="Before you spend a dollar" title="Foundation check" sub="A media plan is only as strong as the funnel it points at.">
          <div className="space-y-2.5">
            {(data.readiness ?? []).map((r: any, i: number) => {
              const missing = r.status === "missing";
              return (
                <div key={i} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 shrink-0 rounded px-2 py-0.5 text-xs font-bold"
                    style={missing ? { background: "#FEE2E2", color: "#B91C1C" } : { background: "#FEF3C7", color: "#92400E" }}
                  >
                    {missing ? "FIX FIRST" : "CONFIRM"}
                  </span>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: NAVY }}>{r.label}</div>
                    {(r.tactics ?? []).length > 0 ? (
                      <div className="text-xs" style={{ color: MUTED }}>Needed for: {r.tactics.join(", ")}</div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Slide>
      ) : null}
```

- [ ] **Step 3: Typecheck + lint + build**

Run:
```bash
cd web && npx tsc --noEmit 2>&1 | grep "strategy-deck" || echo "deck tsc clean"
npx eslint "app/(app)/strategy/strategy-deck.tsx"
npm run build 2>&1 | tail -3
```
Expected: no new tsc errors in the deck; lint clean; build passes.

- [ ] **Step 4: Commit**

```bash
git add "web/app/(app)/strategy/strategy-deck.tsx"
git commit -m "feat(strategy): render the 'before you spend a dollar' readiness section + fix chart keys"
```

---

### Task 4: Add the readiness slide to the PPTX export

**Files:**
- Modify: `web/lib/strategy-engine/standalone-slides.ts`

- [ ] **Step 1: Add the slide after the Integrated Plan, before Handoff**

In `standaloneStrategyToSlides`, between the `// 10. Integrated plan` `slides.push({...})` and the `// 11. Handoff` block, insert:

```ts
  // 10b. Before you spend a dollar (readiness) — only when there are items.
  const readiness = s.readiness ?? [];
  if (readiness.length > 0) {
    slides.push({
      kicker: "Before you spend a dollar",
      heading: "Foundation check",
      table: {
        columns: ["Foundation item", "Status", "Needed for"],
        rows: readiness.map((r) => [r.label, r.status === "missing" ? "Fix first" : "Confirm", r.tactics.join(", ")]),
      },
      footnote: "A media plan is only as strong as the funnel it points at — close these before scaling spend.",
    });
  }
```

(The integrated-plan chart at line ~146 already reads `a.label`, so the per-tactic labels from Task 1 flow into the PPTX automatically — no change needed there.)

- [ ] **Step 2: Typecheck + build**

Run:
```bash
cd web && npx tsc --noEmit 2>&1 | grep "standalone-slides" || echo "slides tsc clean"
npm run build 2>&1 | tail -3
```
Expected: no new tsc errors; build passes.

- [ ] **Step 3: Run the full strategy-engine suite**

Run: `cd web && npx tsx --test lib/strategy-engine/*.test.ts 2>&1 | grep -iE "tests |pass |fail "`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add web/lib/strategy-engine/standalone-slides.ts
git commit -m "feat(strategy): add the readiness foundation slide to the PPTX export"
```

- [ ] **Step 5: Browser-verify on prod after merge (definition of done — CLAUDE.md §2.7)**

After deploy: drive `/strategy`, answer the readiness questions with a mix of yes/no/unsure, Generate, and confirm: (a) a "Before you spend a dollar" section renders with the "no" answers as red FIX FIRST and the unanswered ones as amber CONFIRM, each listing the tactics that need it; (b) the budget chart now shows distinct tactic labels (e.g. "Google Search…" and "SEO + Google Business Profile" instead of two "Paid search"); (c) the PPTX "Download deck" still succeeds and includes the foundation slide; (d) no console errors; (e) screenshot.

---

## Self-Review

**Spec coverage (4c = spec §10 native deck rendering + §6 readiness gate surfacing + the 4a allocation-label fix):**
- §6 / §9 "before you spend a dollar" readiness gate → `Strategy.readiness` + `strategistToReadiness` + deck section (Task 3) + PPTX slide (Task 4). The strategist already computes it (Plan 3 `computeReadiness`); 4c surfaces it. ✓
- 4a logged cosmetic issue "allocation labels by channel → duplicate labels" → `strategistToAllocation` now labels by tactic; deck key fixed (Tasks 1, 3). ✓
- §7 format calls + reach targets are already surfaced in the recommendation headlines + links (shipped in 4a) — confirmed live in the 4b prod run ("Broadcast radio — spanish / country / news_talk", "60% reach goal", "freq 4+"); no further work needed. Documented, not a gap.
- Additive contract: `readiness` added; renderers guard with `?? []` for older payloads. ✓

**Placeholder scan:** No TBD/TODO in shipped code; every step has complete code; commands exact. ✓

**Type consistency:** `ReadinessItem` defined in `standalone.ts`, imported by `strategist-to-strategy.ts`, consumed by the route + both renderers. `strategistToReadiness(StrategistOutput, TacticMenu)` matches its call site in the route (both `strategistOut` and `menu` are in scope there — confirmed in 4a/4b). `Prerequisite` imported from `./tactics` for `PREREQUISITE_LABELS` (a total `Record<Prerequisite,string>`, so a new prerequisite added later forces a label). `CHANNEL_LABELS` import removed since `strategistToAllocation` no longer uses it (verify no other use in the file before deleting — it isn't used elsewhere). ✓

**Risk notes for the implementer:**
- `PREREQUISITE_LABELS` must cover ALL 11 members of the `Prerequisite` union or tsc will error on the `Record<Prerequisite,string>` — that's intentional (it forces a label for any future prerequisite). All 11 are listed in Task 1 Step 4.
- After removing the `CHANNEL_LABELS` import, run tsc to confirm nothing else in `strategist-to-strategy.ts` referenced it (it didn't, but verify).
- The deck reads `data` as `any`, so the new `readiness` field needs no deck-side typing; the PPTX builder is typed `Strategy`, so `s.readiness ?? []` is defensive against a hypothetical pre-deploy payload.
