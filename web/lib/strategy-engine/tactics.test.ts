/**
 * Unit tests for the curated tactic library.
 * Run with: npx tsx --test lib/strategy-engine/tactics.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { TACTIC_LIBRARY } from "./tactics";
import type { ChannelKey } from "./types";

const VALID_CHANNELS: ChannelKey[] = [
  "tv_linear", "ctv", "radio", "podcast", "facebook",
  "instagram", "tiktok", "youtube", "search", "print",
];
const VALID_STAGES = ["awareness", "consideration", "conversion"];

test("library has a healthy spread of tactics", () => {
  assert.ok(TACTIC_LIBRARY.length >= 12, "expected at least 12 curated tactics");
});

test("every tactic is well-formed", () => {
  for (const t of TACTIC_LIBRARY) {
    assert.ok(t.key && /^[a-z0-9_]+$/.test(t.key), `bad key: ${t.key}`);
    assert.ok(VALID_CHANNELS.includes(t.channel), `bad channel on ${t.key}: ${t.channel}`);
    assert.ok(VALID_STAGES.includes(t.funnel_stage), `bad stage on ${t.key}`);
    assert.ok(t.min_monthly_usd > 0, `min spend must be positive on ${t.key}`);
    assert.ok(Array.isArray(t.prerequisites), `prerequisites must be an array on ${t.key}`);
    assert.ok(["geo_precise", "dma", "national"].includes(t.geo_granularity), `bad geo on ${t.key}`);
  }
});

test("tactic keys are unique", () => {
  const keys = TACTIC_LIBRARY.map((t) => t.key);
  assert.equal(new Set(keys).size, keys.length, "duplicate tactic key");
});

test("covers all three funnel stages", () => {
  const stages = new Set(TACTIC_LIBRARY.map((t) => t.funnel_stage));
  assert.ok(stages.has("awareness") && stages.has("consideration") && stages.has("conversion"));
});

test("radio carries format dimensions for the media-brief grammar", () => {
  const radio = TACTIC_LIBRARY.find((t) => t.key === "radio");
  assert.ok(radio?.format_dimensions && radio.format_dimensions.length > 0);
});

import { classifyGoal, funnelWeights } from "./tactics";

test("leads/volume goal weights conversion highest", () => {
  const w = funnelWeights("max_volume");
  assert.ok(w.conversion > w.consideration && w.consideration > w.awareness);
  assert.equal(w.conversion, 1);
});

test("brand goal weights awareness highest", () => {
  const w = funnelWeights("brand");
  assert.ok(w.awareness > w.consideration && w.consideration > w.conversion);
  assert.equal(w.awareness, 1);
});

test("all weights are within [0,1]", () => {
  for (const g of ["max_volume", "lower_cpa", "new_tort", "brand", "defend"] as const) {
    const w = funnelWeights(g);
    for (const stage of ["awareness", "consideration", "conversion"] as const) {
      assert.ok(w[stage] >= 0 && w[stage] <= 1, `${g}.${stage} out of range`);
    }
  }
});

test("classifyGoal maps free text and defaults to max_volume", () => {
  assert.equal(classifyGoal("We want maximum case volume"), "max_volume");
  assert.equal(classifyGoal("lower our cost per case"), "lower_cpa");
  assert.equal(classifyGoal("build the brand"), "brand");
  assert.equal(classifyGoal("enter a new tort"), "new_tort");
  assert.equal(classifyGoal("defend our market share"), "defend");
  assert.equal(classifyGoal("something unclassifiable"), "max_volume");
});
