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
