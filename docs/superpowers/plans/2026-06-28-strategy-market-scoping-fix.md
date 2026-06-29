# Strategy Engine — Market-Scoped Data Layer (Plan 1 of 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Strategy Engine scope named media outlets to the user's *selected* DMA instead of the whole state, fixing the bug where picking Huntsville still surfaces Birmingham radio stations.

**Architecture:** Thread the selected `dmaCode` into `assembleStrategyInputs`. The assembler already fetches `dma_markets`; it resolves the selected DMA's display name from that fetch, then (a) filters `media_outlets` to that one market, (b) filters the `broadcast_stations` backfill to that DMA, and (c) stops defaulting outlet labels to the state's #1-ranked DMA. When no DMA is selected, behavior is unchanged (statewide). Pure-ish change to one library file plus its one caller; covered by a new unit test with a mocked Supabase surface.

**Tech Stack:** TypeScript, Next.js 16 API route (`runtime = "nodejs"`), Supabase JS client, `node:test` + `node:assert/strict` run via `npx tsx --test`.

## Global Constraints

- **Test runner:** `npx tsx --test <file>` — bare `node --test` fails on the repo's extensionless relative imports (memory.md, 2026-06-26). Every test command in this plan uses `npx tsx`.
- **No net-new TypeScript errors** vs main — `pr-typecheck.yml` gates on this (CLAUDE.md §2.4). Run `npx tsc --noEmit` from `web/` before finishing.
- **Server-only secrets stay server-side** — no change here, but the assembler runs server-side only.
- **Match existing patterns** — the assembler already casts the Supabase surface to a loose `SupabaseLike` type and degrades gracefully per-block; follow that exact style.
- **Strict in-market** — when a selected market has thin/no local inventory, return fewer outlets. NEVER fall back to out-of-market (e.g. Birmingham) stations. (Spec §7, §8.)

---

### Task 1: Add `dmaCode` to the assembler and scope `media_outlets` to the selected DMA

**Files:**
- Modify: `web/lib/strategy-engine/assemble-inputs.ts` (signature ~line 151; DMA block ~lines 254–274; outlet filter ~lines 432–455)
- Test: `web/lib/strategy-engine/assemble-inputs.test.ts` (create)

**Interfaces:**
- Consumes: nothing new.
- Produces: updated signature
  ```ts
  assembleStrategyInputs(
    supabase: SupabaseLike,
    stateAbbr: string,
    opts?: { tortSlug?: string; tortLabel?: string; dmaCode?: string | null },
  ): Promise<AssembleResult>
  ```
  Behavior: when `opts.dmaCode` matches a fetched `dma_markets.dma_code`, `inputs.top_dma_name` becomes that DMA's `display_name`, and `inputs.outlets` contains only outlets whose `market` equals that display name (case-insensitive).

- [ ] **Step 1: Write the failing test**

Create `web/lib/strategy-engine/assemble-inputs.test.ts`:

```ts
/**
 * Unit tests for assembleStrategyInputs market scoping.
 * Run with: npx tsx --test lib/strategy-engine/assemble-inputs.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { assembleStrategyInputs } from "./assemble-inputs.ts";

/** Minimal chainable Supabase mock. Each table/rpc returns canned rows. */
function mockSupabase(tables: Record<string, unknown[]>, rpcs: Record<string, unknown[]> = {}) {
  const builder = (rows: unknown[]) => {
    const b: Record<string, unknown> = {};
    for (const m of ["select", "contains", "order", "eq", "limit"]) {
      b[m] = () => b;
    }
    // Awaiting the builder resolves to { data, error }.
    (b as { then: unknown }).then = (resolve: (v: unknown) => void) =>
      resolve({ data: rows, error: null });
    return b;
  };
  return {
    from: (table: string) => builder(tables[table] ?? []),
    rpc: async (fn: string) => ({ data: rpcs[fn] ?? [], error: null }),
  };
}

test("scopes media_outlets to the selected DMA, not the whole state", async () => {
  const sb = mockSupabase(
    {
      dma_markets: [
        { dma_code: "630", display_name: "Birmingham", full_name: "Birmingham AL", rank: 44, states_covered: ["AL"], primary_state: "AL" },
        { dma_code: "691", display_name: "Huntsville", full_name: "Huntsville AL", rank: 81, states_covered: ["AL"], primary_state: "AL" },
      ],
      media_outlets: [
        { call_sign: "WBHM", media_company: "x", media_format: "Audio", media_type: "", format_genre: "News", market: "Birmingham" },
        { call_sign: "WLOR", media_company: "y", media_format: "Audio", media_type: "", format_genre: "Urban", market: "Huntsville" },
      ],
      media_consumption_baseline: [],
      media_profiles: [],
      census_demographics: [],
    },
    { get_pi_competitors_by_dma: [], get_state_accident_summary: [] },
  );

  const { inputs } = await assembleStrategyInputs(sb, "AL", { dmaCode: "691" });

  const markets = inputs.outlets.map((o) => o.name);
  assert.ok(markets.includes("WLOR"), "Huntsville outlet present");
  assert.ok(!markets.includes("WBHM"), "Birmingham outlet must NOT appear for a Huntsville selection");
  assert.equal(inputs.top_dma_name, "Huntsville");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx tsx --test lib/strategy-engine/assemble-inputs.test.ts`
Expected: FAIL — Birmingham outlet appears and/or `top_dma_name` is "Birmingham", because `dmaCode` is not yet a parameter.

- [ ] **Step 3: Add `dmaCode` to the options type and resolve the selected DMA**

In `web/lib/strategy-engine/assemble-inputs.ts`, change the signature (~line 151):

```ts
export async function assembleStrategyInputs(
  supabase: SupabaseLike,
  stateAbbr: string,
  opts: { tortSlug?: string; tortLabel?: string; dmaCode?: string | null } = {},
): Promise<AssembleResult> {
```

In the DMA block (the `if (dmaRes.status === "fulfilled" ...)` section, ~lines 258–271), after `ordered` is built, resolve the selected DMA and prefer it for the label:

```ts
    const selected = opts.dmaCode
      ? ordered.find((r) => String(r.dma_code ?? "").trim() === opts.dmaCode)
      : undefined;
    for (const r of ordered) {
      const display = String(r.display_name ?? r.full_name ?? "").trim();
      if (display) dmaNames.push(display);
    }
    const labelRow = selected ?? ordered[0];
    if (labelRow) {
      topDmaName = String(labelRow.display_name ?? labelRow.full_name ?? "").trim() || null;
      topDmaCode = String(labelRow.dma_code ?? "").trim() || null;
    }
```

- [ ] **Step 4: Narrow the outlet filter set to the selected DMA**

In the named-outlets block (~lines 432–435), replace the all-state `dmaNameSet` with a single-market set when a DMA is selected:

```ts
  const outlets: NamedOutlet[] = [];
  const outletSeen = new Set<string>();
  // When a market is selected, scope strictly to it; else allow all state DMAs.
  const scopedDmaNames = topDmaName && opts.dmaCode ? [topDmaName] : dmaNames;
  const dmaNameSet = new Set(scopedDmaNames.map((d) => d.toLowerCase()));
```

(The rest of the media_outlets loop is unchanged: it already `continue`s when `market` is not in `dmaNameSet`.)

- [ ] **Step 5: Run test to verify it passes**

Run: `cd web && npx tsx --test lib/strategy-engine/assemble-inputs.test.ts`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add web/lib/strategy-engine/assemble-inputs.ts web/lib/strategy-engine/assemble-inputs.test.ts
git commit -m "fix(strategy): scope media_outlets to the selected DMA"
```

---

### Task 2: Scope the `broadcast_stations` backfill to the selected DMA

**Files:**
- Modify: `web/lib/strategy-engine/assemble-inputs.ts` (broadcast backfill ~lines 456–483)
- Test: `web/lib/strategy-engine/assemble-inputs.test.ts` (add a case)

**Interfaces:**
- Consumes: `opts.dmaCode` + resolved `topDmaName` from Task 1.
- Produces: when fewer than 6 in-market `media_outlets` exist and a DMA is selected, the backfill adds only `broadcast_stations` whose `nielsen_dma` matches the selected DMA name (case-insensitive); never out-of-market stations.

- [ ] **Step 1: Write the failing test**

Add to `web/lib/strategy-engine/assemble-inputs.test.ts`:

```ts
test("broadcast_stations backfill stays in the selected DMA", async () => {
  const sb = mockSupabase(
    {
      dma_markets: [
        { dma_code: "630", display_name: "Birmingham", full_name: "Birmingham AL", rank: 44, states_covered: ["AL"], primary_state: "AL" },
        { dma_code: "691", display_name: "Huntsville", full_name: "Huntsville AL", rank: 81, states_covered: ["AL"], primary_state: "AL" },
      ],
      media_outlets: [], // force the broadcast backfill (outlets.length < 6)
      broadcast_stations: [
        { call_sign: "WVTM", service_type: "TV", community_city: "Birmingham", network_affil: "NBC", nielsen_dma: "Birmingham", active: true },
        { call_sign: "WAFF", service_type: "TV", community_city: "Huntsville", network_affil: "NBC", nielsen_dma: "Huntsville", active: true },
      ],
      media_consumption_baseline: [],
      media_profiles: [],
      census_demographics: [],
    },
    { get_pi_competitors_by_dma: [], get_state_accident_summary: [] },
  );

  const { inputs } = await assembleStrategyInputs(sb, "AL", { dmaCode: "691" });
  const names = inputs.outlets.map((o) => o.name);
  assert.ok(names.includes("WAFF"), "Huntsville station present");
  assert.ok(!names.includes("WVTM"), "Birmingham station must NOT backfill for a Huntsville selection");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx tsx --test lib/strategy-engine/assemble-inputs.test.ts`
Expected: FAIL on the new case — `WVTM` appears because the backfill filters by state only.

- [ ] **Step 3: Filter the backfill by selected DMA**

In the `broadcast_stations` backfill loop (~lines 464–478), skip stations outside the selected DMA. Add the guard right after the `if (r.active === false) continue;` line:

```ts
        if (r.active === false) continue;
        if (opts.dmaCode && topDmaName) {
          const stationDma = String(r.nielsen_dma ?? "").trim().toLowerCase();
          if (stationDma !== topDmaName.toLowerCase()) continue; // strict in-market
        }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx tsx --test lib/strategy-engine/assemble-inputs.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add web/lib/strategy-engine/assemble-inputs.ts web/lib/strategy-engine/assemble-inputs.test.ts
git commit -m "fix(strategy): scope broadcast_stations backfill to the selected DMA"
```

---

### Task 3: Pass the selected market from the generate route, and verify nothing regressed

**Files:**
- Modify: `web/app/api/strategy/generate/route.ts:138`
- Verify: `web/lib/strategy-engine/strategy-engine.test.ts`, `recommendations.test.ts`, `standalone.test.ts` (must still pass)

**Interfaces:**
- Consumes: `assembleStrategyInputs` new signature (Task 1).
- Produces: the route now scopes outlets to `body.dma_code`.

- [ ] **Step 1: Wire the route to pass `dmaCode`**

In `web/app/api/strategy/generate/route.ts`, change the assembler call (line 138) inside the `Promise.all`:

```ts
    assembleStrategyInputs(sb, state, { tortSlug, tortLabel, dmaCode: body.dma_code ?? null }),
```

- [ ] **Step 2: Run the full strategy-engine test suite to verify no regressions**

Run:
```bash
cd web && npx tsx --test lib/strategy-engine/assemble-inputs.test.ts lib/strategy-engine/strategy-engine.test.ts lib/strategy-engine/recommendations.test.ts lib/strategy-engine/standalone.test.ts
```
Expected: all PASS. (The existing three suites don't exercise the assembler, so they should be unaffected.)

- [ ] **Step 3: Typecheck — no net-new errors**

Run: `cd web && npx tsc --noEmit`
Expected: no new errors referencing `assemble-inputs.ts`, `generate/route.ts`, or the new test. (A pre-existing baseline of unrelated errors may print; confirm none are in the files this plan touched.)

- [ ] **Step 4: Lint the touched files**

Run: `cd web && npx eslint lib/strategy-engine/assemble-inputs.ts lib/strategy-engine/assemble-inputs.test.ts app/api/strategy/generate/route.ts`
Expected: clean (or only pre-existing warnings).

- [ ] **Step 5: Commit**

```bash
git add web/app/api/strategy/generate/route.ts
git commit -m "fix(strategy): generate route scopes outlets to the selected DMA"
```

- [ ] **Step 6: Browser-verify on prod after merge (per CLAUDE.md §2.7)**

After this ships and Vercel deploys, drive `/strategy` with a non-#1 market (e.g. Alabama → Huntsville), generate a strategy, and confirm the named radio/TV outlets are Huntsville-market (not Birmingham), the page's data calls return 2xx, and there are no console errors. This is the real definition of done for a user-facing change.

---

## Self-Review

**Spec coverage (this plan covers only the §8 market-scoping slice + §13 bug fix):**
- §8 "thread the selected market into the assembler; scope `media_outlets` and `broadcast_stations` to that DMA; remove the state-#1 default labeling" → Tasks 1–3. ✓
- §13 "Huntsville → Birmingham fix can ship standalone" → this entire plan is that standalone PR. ✓
- Out of scope here (later plans): tactic library, funnel model, scores, budget honesty, AI core, interview, deck. Correctly deferred.

**Placeholder scan:** No TBD/TODO; every code step shows the actual code; the test command is exact (`npx tsx --test`). ✓

**Type consistency:** `dmaCode?: string | null` used identically in the signature (Task 1), the route call (Task 3), and both guards (Tasks 1–2). `topDmaName` is the existing variable reused for labeling and the in-market guard. ✓

**Risk note for the implementer:** the broadcast guard assumes `broadcast_stations.nielsen_dma` uses the same display string as `dma_markets.display_name`. If a real-data spot check shows they differ (e.g. "Huntsville-Decatur (Florence)" vs "Huntsville"), switch the guard to a `startsWith`/contains match on the DMA name and note it. Confirm against live data during browser-verify.
