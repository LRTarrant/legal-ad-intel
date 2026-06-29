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
