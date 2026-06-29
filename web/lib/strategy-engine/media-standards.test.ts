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
