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
