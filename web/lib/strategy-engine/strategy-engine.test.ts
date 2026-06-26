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
import {
  buildDemographicMix,
  computeAudienceFit,
  type BaselineRow,
  type CensusRow,
  type DemographicMix,
} from "./audience-fit";

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

/* ── computeAudienceFit (media_consumption_baseline) ────────────────────── */

const PEW = "Pew Research Center";
const NIELSEN = "Nielsen (cited as fact)";

/** A realistic slice of the expanded 112-row seed (verbatim values + units). */
function baselineFixture(): BaselineRow[] {
  return [
    // radio: GENERAL Nielsen reach rows (the ones radio fit MUST use)…
    { demographic_type: "race", demographic_group: "black", channel: "radio", metric: "reach_monthly", scope: "general", value: 92, unit: "pct_reach", source: NIELSEN },
    { demographic_type: "race", demographic_group: "hispanic", channel: "radio", metric: "reach_weekly", scope: "general", value: 98, unit: "pct_reach", source: NIELSEN },
    // …Pew radio-NEWS rows that must NOT tank radio (news base, but general wins).
    { demographic_type: "all", demographic_group: "all_adults", channel: "radio", metric: "news_consume", scope: "news", value: 44, unit: "pct_at_least_sometimes", source: PEW },
    { demographic_type: "all", demographic_group: "all_adults", channel: "radio", metric: "local_news", scope: "news", value: 52, unit: "pct_at_least_sometimes", source: PEW },
    // radio ad_audio_share / radio_urban format_share — excluded by the unit guard.
    { demographic_type: "race", demographic_group: "black", channel: "radio", metric: "ad_audio_share", scope: "general", value: 73, unit: "pct_of_ad_supported_audio", source: NIELSEN },
    { demographic_type: "race", demographic_group: "black", channel: "radio_urban", metric: "format_share", scope: "general", value: 50.2, unit: "pct_of_black_radio_listening", source: NIELSEN },
    // tv_linear: GENERAL via cable_subscribe (linear access); news rows dropped because general exists.
    { demographic_type: "all", demographic_group: "all_adults", channel: "tv_linear", metric: "cable_subscribe", scope: "general", value: 36, unit: "pct_subscribe", source: PEW },
    { demographic_type: "age", demographic_group: "65_plus", channel: "tv_linear", metric: "cable_subscribe", scope: "general", value: 64, unit: "pct_subscribe", source: PEW },
    { demographic_type: "age", demographic_group: "18_29", channel: "tv_linear", metric: "cable_subscribe", scope: "general", value: 16, unit: "pct_subscribe", source: PEW },
    { demographic_type: "race", demographic_group: "black", channel: "tv_linear", metric: "news_consume", scope: "news", value: 76, unit: "pct_at_least_sometimes", source: PEW },
    // tv_linear NON-percentage rows that must be excluded from the math (hours / index / share-of-time):
    { demographic_type: "race", demographic_group: "black", channel: "tv_linear", metric: "time_spent_daily", scope: "general", value: 2.9, unit: "hours_per_day", source: "BLS American Time Use Survey 2024" },
    { demographic_type: "age", demographic_group: "65_plus", channel: "tv_linear", metric: "linear_share_of_tv_time", scope: "general", value: 74.7, unit: "pct_of_tv_time", source: "Nielsen (cited as fact)" },
    { demographic_type: "income", demographic_group: "lower", channel: "tv_linear", metric: "heavy_viewer_index", scope: "general", value: 133, unit: "index_vs_avg", source: "Adwave (cited as fact)" },
    // print + search: NEWS only → news-consumption proxy.
    { demographic_type: "all", demographic_group: "all_adults", channel: "print", metric: "news_consume", scope: "news", value: 25, unit: "pct_at_least_sometimes", source: PEW },
    { demographic_type: "all", demographic_group: "all_adults", channel: "search", metric: "news_consume", scope: "news", value: 63, unit: "pct_at_least_sometimes", source: PEW },
    // ctv: GENERAL via streaming_use (Pew). netflix_use excluded (sub-platform); income skipped.
    { demographic_type: "all", demographic_group: "all_adults", channel: "ctv", metric: "streaming_use", scope: "general", value: 83, unit: "pct_ever_use", source: PEW },
    { demographic_type: "age", demographic_group: "18_29", channel: "ctv", metric: "streaming_use", scope: "general", value: 90, unit: "pct_ever_use", source: PEW },
    { demographic_type: "age", demographic_group: "65_plus", channel: "ctv", metric: "streaming_use", scope: "general", value: 65, unit: "pct_ever_use", source: PEW },
    { demographic_type: "income", demographic_group: "upper", channel: "ctv", metric: "streaming_use", scope: "general", value: 91, unit: "pct_ever_use", source: PEW },
    { demographic_type: "all", demographic_group: "all_adults", channel: "ctv", metric: "netflix_use", scope: "general", value: 72, unit: "pct_ever_use", source: PEW },
    // facebook: GENERAL adoption + a NEWS row (general must win).
    { demographic_type: "all", demographic_group: "all_adults", channel: "facebook", metric: "platform_use", scope: "general", value: 71, unit: "pct_ever_use", source: PEW },
    { demographic_type: "race", demographic_group: "black", channel: "facebook", metric: "news_regular", scope: "news", value: 36, unit: "pct_regularly", source: PEW },
    // youtube: GENERAL adoption + a watch-time-skew context row that must be excluded.
    { demographic_type: "all", demographic_group: "all_adults", channel: "youtube", metric: "platform_use", scope: "general", value: 84, unit: "pct_ever_use", source: PEW },
    { demographic_type: "race", demographic_group: "asian", channel: "youtube", metric: "platform_use", scope: "general", value: 92, unit: "pct_ever_use", source: PEW },
    { demographic_type: "race", demographic_group: "hispanic", channel: "youtube", metric: "platform_use", scope: "general", value: 88, unit: "pct_ever_use", source: PEW },
    { demographic_type: "age", demographic_group: "55_plus", channel: "youtube", metric: "watch_time_skew", scope: "general", value: 20, unit: "pct_of_us_youtube_watch_time", source: "eMarketer (cited as fact)" },
    // non-engine channels + context stats that must never produce fit.
    { demographic_type: "all", demographic_group: "all_adults", channel: "digital", metric: "news_consume", scope: "news", value: 86, unit: "pct_at_least_sometimes", source: PEW },
    { demographic_type: "race", demographic_group: "black", channel: "all_media", metric: "time_spent_weekly", scope: "general", value: 81, unit: "hours_per_week", source: NIELSEN },
    { demographic_type: "all", demographic_group: "all_adults", channel: "ooh", metric: "ad_notice", scope: "general", value: 68, unit: "pct_notice_enroute_retail", source: "OAAA/Harris Poll 2024" },
  ];
}

const HIGH_BLACK_MIX: DemographicMix = {
  race: { black: 0.8, white: 0.15, hispanic: 0.04, asian: 0.01 },
  age: { "18_29": 0.18, "25_54": 0.4, "50_plus": 0.32, "65_plus": 0.16 },
};

test("radio fit for a high-Black-share market uses the GENERAL reach row, not the Pew news row", () => {
  const fit = computeAudienceFit(baselineFixture(), HIGH_BLACK_MIX);
  const radio = fit.get("radio");
  assert.ok(radio, "radio should have a fit");
  // The credibility line: radio rests on general reach, never the news proxy.
  assert.equal(radio!.scope, "general");
  assert.ok(radio!.sources.includes(NIELSEN));
  // Radio (Black 92 / Hispanic 98 reach) is the strongest channel here and far
  // above where the 44%-news row would put it (44/92 ≈ 0.48).
  assert.ok(radio!.fit > 0.9, `radio fit ${radio!.fit} should rest on the ~92 reach`);
  for (const [ch, f] of fit) {
    if (ch !== "radio") assert.ok(radio!.fit >= f.fit, `radio should outrank ${ch}`);
  }
  // And it must beat tv_linear (now GENERAL via cable_subscribe) and the print news-proxy.
  const tv = fit.get("tv_linear");
  assert.ok(tv && tv.scope === "general" && radio!.fit > tv.fit);
  assert.ok(radio!.fit > fit.get("print")!.fit && fit.get("print")!.scope === "news_proxy");
});

test("dropping the general radio rows flips radio to a news proxy and tanks its fit", () => {
  const withGeneral = computeAudienceFit(baselineFixture(), HIGH_BLACK_MIX).get("radio")!;
  const newsOnly = baselineFixture().filter(
    (r) => !(r.channel === "radio" && r.scope === "general"),
  );
  const withoutGeneral = computeAudienceFit(newsOnly, HIGH_BLACK_MIX).get("radio")!;
  assert.equal(withoutGeneral.scope, "news_proxy");
  assert.ok(
    withoutGeneral.fit < withGeneral.fit,
    "removing the general reach rows should lower radio fit (proves general drove it)",
  );
});

test("channels backed only by news rows are flagged news_proxy; general channels are not", () => {
  const fit = computeAudienceFit(baselineFixture(), HIGH_BLACK_MIX);
  assert.equal(fit.get("print")!.scope, "news_proxy");
  assert.equal(fit.get("search")!.scope, "news_proxy");
  // facebook has both a general and a news row — the general row wins.
  assert.equal(fit.get("facebook")!.scope, "general");
});

test("ctv now gets a fit (it was planned blind before the baseline existed)", () => {
  const fit = computeAudienceFit(baselineFixture(), HIGH_BLACK_MIX);
  const ctv = fit.get("ctv");
  assert.ok(ctv && ctv.fit > 0 && ctv.scope === "general");
});

test("non-engine channels and context metrics never produce a fit", () => {
  const fit = computeAudienceFit(baselineFixture(), HIGH_BLACK_MIX);
  // digital (device bucket), all_media (context), social/reddit/etc. → no key.
  assert.equal(fit.has("ctv" as never) && !fit.has("digital" as never), true);
  for (const ch of fit.keys()) {
    assert.ok(
      ["tv_linear", "ctv", "radio", "podcast", "facebook", "instagram", "tiktok", "youtube", "search", "print"].includes(ch),
      `${ch} is not a buyable engine channel`,
    );
  }
});

test("empty baseline yields an empty map (caller degrades to media_profiles)", () => {
  assert.equal(computeAudienceFit([], HIGH_BLACK_MIX).size, 0);
});

test("non-percentage metrics (hours, index, share-of-time) never enter the fit math", () => {
  const base = computeAudienceFit(baselineFixture(), HIGH_BLACK_MIX).get("tv_linear")!;
  // tv_linear rests on cable_subscribe (Pew, general) — NOT the BLS hours, Adwave
  // index, or Nielsen linear-share-of-time rows (all excluded by the unit guard).
  assert.equal(base.scope, "general");
  assert.deepEqual(base.sources, [PEW]);
  // Spiking an excluded non-% row to an absurd value must not move the fit.
  const spiked = baselineFixture().map((r) =>
    r.channel === "tv_linear" && r.unit === "hours_per_day" ? { ...r, value: 999 } : r,
  );
  assert.equal(computeAudienceFit(spiked, HIGH_BLACK_MIX).get("tv_linear")!.fit, base.fit);
});

test("income rows are ignored (engine has no income axis yet) and don't distort fit", () => {
  const withIncome = computeAudienceFit(baselineFixture(), HIGH_BLACK_MIX).get("ctv")!;
  const noIncome = computeAudienceFit(
    baselineFixture().filter((r) => r.demographic_type !== "income"),
    HIGH_BLACK_MIX,
  ).get("ctv")!;
  // The ctv income row (upper, streaming_use 91) changes nothing.
  assert.equal(withIncome.fit, noIncome.fit);
});

test("the ooh channel (no engine ChannelKey) is skipped without crashing", () => {
  const fit = computeAudienceFit(baselineFixture(), HIGH_BLACK_MIX);
  assert.equal(fit.has("ooh" as never), false);
});

test("new general metrics feed fit: ctv via streaming_use, tv_linear via cable_subscribe", () => {
  const fit = computeAudienceFit(baselineFixture(), HIGH_BLACK_MIX);
  assert.equal(fit.get("ctv")!.scope, "general");
  assert.ok(fit.get("ctv")!.fit > 0);
  assert.equal(fit.get("tv_linear")!.scope, "general");
});

/* ── buildDemographicMix (census_demographics → population-weighted mix) ──── */

test("buildDemographicMix population-weights county pct_* into 0..1 shares", () => {
  const rows: CensusRow[] = [
    // A big majority-Black county and a small majority-White one.
    { total_population: 900, pct_black: 80, pct_white: 15, pct_hispanic: 4, pct_asian: 1, pop_18_to_24: 90, pop_25_to_34: 120, pop_35_to_44: 120, pop_45_to_54: 110, pop_55_to_64: 100, pop_65_to_74: 80, pop_75_plus: 40 },
    { total_population: 100, pct_black: 10, pct_white: 80, pct_hispanic: 8, pct_asian: 2, pop_18_to_24: 10, pop_25_to_34: 12, pop_35_to_44: 12, pop_45_to_54: 11, pop_55_to_64: 10, pop_65_to_74: 8, pop_75_plus: 4 },
  ];
  const mix = buildDemographicMix(rows);
  // Weighted Black share = (900*80 + 100*10)/1000 = 73% → 0.73.
  assert.ok(Math.abs(mix.race.black - 0.73) < 1e-6);
  assert.ok(mix.race.black > mix.race.white);
  // Shares are fractions in [0,1].
  for (const v of Object.values(mix.race)) assert.ok(v >= 0 && v <= 1);
  assert.ok(mix.age["25_54"] > 0 && mix.age["65_plus"] > 0);
});

test("buildDemographicMix returns zero shares for no rows", () => {
  const mix = buildDemographicMix([]);
  assert.equal(mix.race.black, 0);
  assert.equal(mix.age["18_29"], 0);
});
