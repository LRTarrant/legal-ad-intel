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
