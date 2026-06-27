/**
 * Unit tests for the Strategy Engine recommendation assembler.
 *
 * Coverage:
 *   - 3-link because chain (Opportunity → White space → Fit) with source tags
 *   - data-depth rule: strong / moderate / thin by modeled-link count
 *   - watch-list gate: no crash exposure → no recommendations
 *   - measured vs modeled white space (paid_search count vs untracked channel)
 *   - maxRecommendations cap + planner opportunity ordering
 *   - buy: named outlets vs channel_target fallback
 *
 * node:test + node:assert. Run with a TS-aware Node: `npx tsx --test`.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { buildRecommendations } from "./recommendations";
import type { MeasuredChannel, OpportunitySummary } from "./recommendations";
import { CHANNEL_LABELS } from "./types";
import type { ChannelKey, ChannelPlan, FunnelStage, NamedOutlet, PlannedChannel } from "./types";

/* ── Fixtures ───────────────────────────────────────────────────────────── */

function planned(over: Partial<PlannedChannel> & { channel: ChannelKey }): PlannedChannel {
  return {
    channel: over.channel,
    label: CHANNEL_LABELS[over.channel],
    stage: over.stage ?? "awareness",
    fit: over.fit ?? 0.6,
    competition: over.competition ?? null,
    opportunity: over.opportunity ?? 0.5,
    outlets: over.outlets ?? [],
    rationale: over.rationale ?? "",
    fit_scope: over.fit_scope,
    fit_sources: over.fit_sources,
  };
}

function planWith(...channels: PlannedChannel[]): ChannelPlan {
  const stages: Record<FunnelStage, PlannedChannel[]> = {
    awareness: [],
    consideration: [],
    conversion: [],
  };
  for (const c of channels) stages[c.stage].push(c);
  return {
    archetype: "audience_play",
    cadence: "always_on",
    funnel: "brand_led",
    stages,
    county_dma_translation: [],
    confidence: "high",
  };
}

const MONTGOMERY: OpportunitySummary = {
  counties: [
    {
      county_name: "Montgomery",
      cbsa_title: "Montgomery, AL",
      total_population: 226718,
      pct_with_internet: 90.3,
      total_fatalities: 257,
      truck_fatalities: 44,
      motorcycle_fatalities: 19,
      deaths_per_100k: 113.4,
    },
  ],
  market_label: "Montgomery, AL",
  lead_metric: "truck",
  fars_year_min: 2019,
  fars_year_max: 2024,
};

const NO_CRASH: OpportunitySummary = {
  ...MONTGOMERY,
  counties: [{ ...MONTGOMERY.counties[0], total_fatalities: 0, truck_fatalities: 0, motorcycle_fatalities: 0 }],
};

const WVNN: NamedOutlet = { name: "WVNN", channel: "radio", dma_name: "Huntsville", format_genre: "news_talk" };

/* ── Tests ──────────────────────────────────────────────────────────────── */

test("builds a 3-link because chain with source tags", () => {
  const plan = planWith(planned({ channel: "ctv", fit: 0.8, opportunity: 0.7, fit_sources: ["Pew"] }));
  const { recommendations } = buildRecommendations(plan, MONTGOMERY, []);
  assert.equal(recommendations.length, 1);
  const r = recommendations[0];
  assert.equal(r.opportunity.value, "44");
  assert.match(r.opportunity.source, /FARS 2019–2024/);
  assert.match(r.opportunity.text, /Montgomery County/);
  assert.equal(r.white_space.value, "none observed"); // ctv untracked → modeled
  assert.equal(r.fit.value, "80/100");
  assert.match(r.fit.source, /Pew.*national/);
  assert.equal(r.proof.length, 3);
  assert.deepEqual(
    r.proof.map((p) => p.value),
    ["44", "none observed", "80/100"],
  );
});

test("data-depth: all-primary measured channel = strong", () => {
  const plan = planWith(planned({ channel: "search", fit: 0.7, fit_scope: "general", fit_sources: ["Pew"] }));
  const measured: MeasuredChannel[] = [{ channel: "search", active_firms: 1, status: "open" }];
  const { recommendations } = buildRecommendations(plan, MONTGOMERY, measured);
  assert.equal(recommendations[0].white_space.depth, "primary");
  assert.equal(recommendations[0].fit.depth, "primary");
  assert.equal(recommendations[0].data_depth, "strong");
});

test("data-depth: untracked white space (one modeled link) = moderate", () => {
  const plan = planWith(planned({ channel: "ctv", fit_scope: "general" }));
  const { recommendations } = buildRecommendations(plan, MONTGOMERY, []);
  assert.equal(recommendations[0].white_space.depth, "modeled");
  assert.equal(recommendations[0].fit.depth, "primary");
  assert.equal(recommendations[0].data_depth, "moderate");
});

test("data-depth: untracked white space + news-proxy fit (two modeled) = thin", () => {
  const plan = planWith(planned({ channel: "radio", fit_scope: "news_proxy" }));
  const { recommendations } = buildRecommendations(plan, MONTGOMERY, []);
  assert.equal(recommendations[0].data_depth, "thin");
});

test("watch-list gate: no crash exposure yields no recommendations", () => {
  const plan = planWith(planned({ channel: "ctv" }), planned({ channel: "radio" }));
  const { recommendations, watch_list } = buildRecommendations(plan, NO_CRASH, []);
  assert.equal(recommendations.length, 0);
  assert.equal(watch_list.length, 2);
  assert.match(watch_list[0].reason, /crash-exposure/);
});

test("measured channel reports a real firm count (primary white space)", () => {
  const plan = planWith(planned({ channel: "search", fit: 0.5 }));
  const measured: MeasuredChannel[] = [{ channel: "search", active_firms: 22, status: "defended" }];
  const { recommendations } = buildRecommendations(plan, MONTGOMERY, measured);
  assert.equal(recommendations[0].white_space.value, "22 firms");
  assert.match(recommendations[0].white_space.text, /defended/);
  assert.equal(recommendations[0].white_space.depth, "primary");
});

test("caps at maxRecommendations and orders by planner opportunity", () => {
  const plan = planWith(
    planned({ channel: "ctv", opportunity: 0.9, stage: "awareness" }),
    planned({ channel: "podcast", opportunity: 0.5, stage: "consideration" }),
    planned({ channel: "search", opportunity: 0.2, stage: "conversion" }),
  );
  const { recommendations } = buildRecommendations(plan, MONTGOMERY, [], { maxRecommendations: 2 });
  assert.equal(recommendations.length, 2);
  assert.deepEqual(
    recommendations.map((r) => r.channel),
    ["ctv", "podcast"],
  );
});

test("buy: named outlets when present, channel_target otherwise", () => {
  const withOutlet = planWith(planned({ channel: "radio", outlets: [WVNN] }));
  const out = buildRecommendations(withOutlet, MONTGOMERY, []).recommendations[0].buy;
  assert.equal(out.kind, "outlets");
  assert.equal(out.kind === "outlets" && out.outlets[0].name, "WVNN");

  const digital = planWith(planned({ channel: "search", outlets: [] }));
  const buy = buildRecommendations(digital, MONTGOMERY, []).recommendations[0].buy;
  assert.equal(buy.kind, "channel_target");
  assert.equal(buy.kind === "channel_target" && buy.target, CHANNEL_LABELS.search);
});

test("headline reads 'Claim' for open white space, 'Win share' for measured", () => {
  const open = buildRecommendations(planWith(planned({ channel: "ctv" })), MONTGOMERY, []).recommendations[0];
  assert.match(open.headline, /^Claim .* in Montgomery, AL$/);

  const measured: MeasuredChannel[] = [{ channel: "search", active_firms: 22, status: "defended" }];
  const contested = buildRecommendations(planWith(planned({ channel: "search" })), MONTGOMERY, measured)
    .recommendations[0];
  assert.match(contested.headline, /^Win share on .* in Montgomery, AL$/);
});
