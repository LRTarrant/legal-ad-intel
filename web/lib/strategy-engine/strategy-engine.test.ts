/**
 * Unit tests for the Strategy Engine deterministic core.
 *
 * Coverage:
 *   - detectGorilla: by-share, by-multiple, absent, empty
 *   - scoreArchetypes: Gorilla Rule locks Head-to-Head; niche boosted;
 *     locked archetypes sink; open market favors Head-to-Head
 *   - buildChannelPlan: opportunity ranking, per-stage cap, named outlets,
 *     funnel-emphasis weighting
 *   - buildFirstMoves: names outlets, always closes with measurement
 *   - containsAbsoluteReach: flags reach figures, allows rates/%/money
 *   - validateStrategyProse: rejects reach, accepts clean, truncates
 *
 * Uses node:test + node:assert (no external test-runner dependency). Run with
 * a TypeScript-aware Node (`node --test`, type stripping or a loader).
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  detectGorilla,
  scoreArchetypes,
  topPlayable,
  GORILLA_SHARE_THRESHOLD,
} from "./archetypes";
import { buildChannelPlan, buildStrategyPlan } from "./channel-plan";
import {
  containsAbsoluteReach,
  validateStrategyProse,
  buildStrategyDigest,
} from "./prompt";
import type {
  AdvertiserShare,
  ChannelSignal,
  NamedOutlet,
  StrategyInputs,
} from "./types";

/* ── Fixtures ───────────────────────────────────────────────────────────── */

function makeInputs(overrides: Partial<StrategyInputs> = {}): StrategyInputs {
  const channels: ChannelSignal[] = [
    { channel: "radio", fit: 0.8, competition: 0.2 },
    { channel: "tv_linear", fit: 0.7, competition: 0.6 },
    { channel: "ctv", fit: 0.75, competition: 0.25 },
    { channel: "search", fit: 0.9, competition: 0.8 },
    { channel: "facebook", fit: 0.6, competition: 0.4 },
    { channel: "youtube", fit: 0.65, competition: 0.3 },
  ];
  const outlets: NamedOutlet[] = [
    { name: "WVNN", channel: "radio", format_genre: "news_talk", dma_name: "Huntsville" },
    { name: "WBRC", channel: "tv_linear", network: "FOX", dma_name: "Birmingham" },
    { name: "Birmingham CTV", channel: "ctv", dma_name: "Birmingham" },
  ];
  return {
    state_abbr: "AL",
    state_name: "Alabama",
    tort_slug: "car_accident",
    tort_label: "Auto Accident",
    saturation: 0.45,
    total_advertisers: 12,
    top_advertisers: [
      { name: "Local Firm A", share: 0.2, rank: 1 },
      { name: "Local Firm B", share: 0.15, rank: 2 },
      { name: "Local Firm C", share: 0.1, rank: 3 },
    ],
    channels,
    outlets,
    county_dma: [
      { county_name: "Jefferson", dma_name: "Birmingham", dma_rank: 44 },
      { county_name: "Madison", dma_name: "Huntsville", dma_rank: 79 },
    ],
    top_dma_name: "Birmingham",
    local_signal: {
      source: "FARS",
      top_counties: [{ county_name: "Jefferson", deaths_per_100k: 14.2, rural_pct: 0.1 }],
    },
    available: {
      saturation: true,
      competition: true,
      audience_fit: true,
      outlets: true,
      local_signal: true,
    },
    ...overrides,
  };
}

const GORILLA: AdvertiserShare[] = [
  { name: "Morgan & Morgan", share: 0.52, rank: 1 },
  { name: "Local Firm B", share: 0.12, rank: 2 },
  { name: "Local Firm C", share: 0.08, rank: 3 },
];

/* ── detectGorilla ──────────────────────────────────────────────────────── */

test("detectGorilla flags a leader above the share threshold", () => {
  const v = detectGorilla(GORILLA);
  assert.equal(v.present, true);
  assert.equal(v.name, "Morgan & Morgan");
  assert.ok((v.share ?? 0) >= GORILLA_SHARE_THRESHOLD);
  assert.match(v.reason ?? "", /52%/);
});

test("detectGorilla flags by 2.5x multiple even below the share floor", () => {
  const v = detectGorilla([
    { name: "Big", share: 0.3, rank: 1 },
    { name: "Small", share: 0.1, rank: 2 },
  ]);
  assert.equal(v.present, true);
  assert.equal(v.name, "Big");
});

test("detectGorilla returns absent for a fragmented market", () => {
  const v = detectGorilla([
    { name: "A", share: 0.2, rank: 1 },
    { name: "B", share: 0.18, rank: 2 },
    { name: "C", share: 0.15, rank: 3 },
  ]);
  assert.equal(v.present, false);
  assert.equal(v.name, null);
});

test("detectGorilla handles an empty advertiser list", () => {
  assert.equal(detectGorilla([]).present, false);
});

/* ── scoreArchetypes + Gorilla Rule ─────────────────────────────────────── */

test("Gorilla Rule locks out Head-to-Head and sinks it to the bottom", () => {
  const scored = scoreArchetypes(makeInputs({ top_advertisers: GORILLA }));
  const h2h = scored.find((a) => a.key === "head_to_head")!;
  assert.equal(h2h.locked_out, true);
  assert.match(h2h.lock_reason ?? "", /Morgan & Morgan/);
  // Locked archetype is last.
  assert.equal(scored[scored.length - 1].key, "head_to_head");
  // Top playable is niche or audience, never the locked one.
  const top = topPlayable(scored);
  assert.ok(top && top.key !== "head_to_head");
});

test("Gorilla presence boosts Niche Carve-Out above the open-market case", () => {
  const open = scoreArchetypes(makeInputs());
  const dominated = scoreArchetypes(makeInputs({ top_advertisers: GORILLA }));
  const nicheOpen = open.find((a) => a.key === "niche_carve_out")!.score;
  const nicheDom = dominated.find((a) => a.key === "niche_carve_out")!.score;
  assert.ok(nicheDom > nicheOpen, `expected ${nicheDom} > ${nicheOpen}`);
});

test("Open, low-saturation market makes Head-to-Head viable (not locked)", () => {
  const scored = scoreArchetypes(makeInputs({ saturation: 0.15 }));
  const h2h = scored.find((a) => a.key === "head_to_head")!;
  assert.equal(h2h.locked_out, false);
  assert.ok(h2h.score >= 50);
});

test("every archetype carries data-traced why-not copy", () => {
  for (const a of scoreArchetypes(makeInputs())) {
    assert.ok(a.why_this_fits.length > 0);
    assert.ok(a.why_not_alternatives.length > 0);
  }
});

/* ── buildChannelPlan ───────────────────────────────────────────────────── */

test("channel plan ranks by opportunity and caps per stage", () => {
  const inputs = makeInputs();
  const plan = buildChannelPlan("audience_play", "surge", "conversion_led", inputs, {
    present: false,
    name: null,
    share: null,
    reason: null,
  });
  // No stage exceeds the per-stage cap of 2.
  for (const stage of ["awareness", "consideration", "conversion"] as const) {
    assert.ok(plan.stages[stage].length <= 2);
  }
  // Radio (fit .8, comp .2 → opp .64) should beat tv_linear (fit .7, comp .6
  // → opp .28) in the awareness stage ordering.
  const awareness = plan.stages.awareness.map((c) => c.channel);
  assert.ok(awareness.includes("radio"));
  assert.equal(awareness[0], "radio");
});

test("planned channels attach their named outlets", () => {
  const inputs = makeInputs();
  const plan = buildChannelPlan("audience_play", "surge", "conversion_led", inputs, {
    present: false,
    name: null,
    share: null,
    reason: null,
  });
  const radio = plan.stages.awareness.find((c) => c.channel === "radio");
  assert.ok(radio);
  assert.equal(radio!.outlets[0]?.name, "WVNN");
});

test("conversion-led emphasis surfaces a conversion channel", () => {
  const inputs = makeInputs();
  const plan = buildChannelPlan("niche_carve_out", "surge", "conversion_led", inputs, {
    present: false,
    name: null,
    share: null,
    reason: null,
  });
  assert.ok(plan.stages.conversion.some((c) => c.channel === "search"));
});

/* ── buildFirstMoves + buildStrategyPlan ────────────────────────────────── */

test("first moves name an outlet and always close with measurement", () => {
  const inputs = makeInputs();
  const scored = scoreArchetypes(inputs);
  const top = topPlayable(scored)!;
  const full = buildStrategyPlan(inputs, top, {
    present: false,
    name: null,
    share: null,
    reason: null,
  });
  assert.equal(full.first_moves.length, 3);
  assert.ok(full.first_moves.some((m) => m.target !== null));
  assert.match(full.first_moves[2].action, /tracking/i);
});

test("digest sent to the LLM carries no raw audience counts", () => {
  const inputs = makeInputs();
  const scored = scoreArchetypes(inputs);
  const full = buildStrategyPlan(inputs, topPlayable(scored)!, {
    present: false,
    name: null,
    share: null,
    reason: null,
  });
  const digest = JSON.stringify(buildStrategyDigest(full));
  assert.equal(containsAbsoluteReach(digest), false);
});

/* ── containsAbsoluteReach ──────────────────────────────────────────────── */

test("containsAbsoluteReach flags absolute reach figures", () => {
  assert.equal(containsAbsoluteReach("This reaches 312,000 adults in the DMA."), true);
  assert.equal(containsAbsoluteReach("Delivers 2.4 million impressions per flight."), true);
  assert.equal(containsAbsoluteReach("Around 500k listeners tune in."), true);
  assert.equal(containsAbsoluteReach("1,200,000 viewers on average."), true);
});

test("containsAbsoluteReach allows rates, indices, percentages, and money", () => {
  assert.equal(containsAbsoluteReach("Jefferson County runs 14.2 fatalities per 100k."), false);
  assert.equal(containsAbsoluteReach("Radio over-indexes with an 80 fit index."), false);
  assert.equal(containsAbsoluteReach("Competition is light; the audience over-indexes here."), false);
  assert.equal(containsAbsoluteReach("Budget around $40,000 per month."), false);
});

/* ── validateStrategyProse ──────────────────────────────────────────────── */

test("validateStrategyProse accepts clean prose", () => {
  const res = validateStrategyProse({
    market_read: "A national firm dominates broad reach, so differentiate.",
    approach_rationale: "Niche Carve-Out wins by owning a case-type lane.",
    channel_narrative: "Lead with radio on WVNN, then retarget on CTV, capture on search.",
  });
  assert.equal(res.ok, true);
});

test("validateStrategyProse rejects prose with a banned reach figure", () => {
  const res = validateStrategyProse({
    market_read: "This plan reaches 312,000 adults across the Birmingham DMA.",
    approach_rationale: "Niche Carve-Out wins here.",
    channel_narrative: "Radio then CTV then search.",
  });
  assert.equal(res.ok, false);
  if (!res.ok) assert.ok(res.errors.some((e) => /reach/i.test(e)));
});

test("validateStrategyProse requires the core fields", () => {
  const res = validateStrategyProse({ market_read: "" });
  assert.equal(res.ok, false);
});
