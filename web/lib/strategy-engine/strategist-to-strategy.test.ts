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
