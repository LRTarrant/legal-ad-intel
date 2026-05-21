/**
 * Tests for the FAERS GLP-1 query layer.
 *
 * Coverage:
 *   - shapeFaersSignals: maps mocked RPC rows (faers_glp1_drug_breakdown +
 *     faers_glp1_monthly_trend) into the FaersGlp1Signals shape -- percentage
 *     math, brand ordering, missing-brand zero-fill, top-reaction passthrough,
 *     dataCurrentThrough, trend grouping/sorting, window bounds, hasData.
 *   - classifyTrend: accelerating / declining / stable / insufficient.
 *   - formatMonthYear: date -> "Month YYYY", null/garbage handling.
 *   - pct: one-decimal rounding, zero-denominator guard.
 *
 * The RPC layer is exercised only through mocked row arrays -- no live
 * Supabase. Drug matching and aggregation themselves live in SQL
 * (migration 20260521000000) and are out of scope for these unit tests.
 *
 * Uses node:test + node:assert (no external test-runner dependency). Run with
 * a TypeScript-aware Node (`node --test`, type stripping or a loader).
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  __test,
  FAERS_CONSUMER_BASELINE_PCT,
  GLP1_BRANDS,
} from "./faers-glp1";

const { shapeFaersSignals, classifyTrend, formatMonthYear, pct } = __test;

/* -- mock RPC rows --------------------------------------------------------- */

// faers_glp1_drug_breakdown rows. Ozempic numbers mirror the live spot-check
// (3,283 events / 60 deaths / 2,094 hospitalizations / 2,436 consumer).
const BREAKDOWN_ROWS = [
  {
    brand: "Ozempic",
    total_events: 3283,
    deaths: 60,
    hospitalizations: 2094,
    consumer_reports: 2436,
    max_receivedate: "2026-03-28",
    top_reactions: [
      { pt: "Impaired gastric emptying", count: 1800 },
      { pt: "Intestinal obstruction", count: 700 },
    ],
  },
  {
    brand: "Mounjaro",
    total_events: 1000,
    deaths: 20,
    hospitalizations: 500,
    consumer_reports: 300,
    max_receivedate: "2026-03-31",
    top_reactions: [{ pt: "Ileus", count: 120 }],
  },
];

// faers_glp1_monthly_trend rows -- intentionally out of chronological order.
const TREND_ROWS = [
  { brand: "Ozempic", month: "2024-02-01", event_count: 10 },
  { brand: "Ozempic", month: "2024-01-01", event_count: 5 },
  { brand: "Mounjaro", month: "2024-01-01", event_count: 2 },
];

/* -- shapeFaersSignals ----------------------------------------------------- */

test("shapeFaersSignals: returns one drug per GLP1_BRANDS entry, in order", () => {
  const result = shapeFaersSignals("gastroparesis", BREAKDOWN_ROWS, TREND_ROWS);
  assert.equal(result.drugs.length, GLP1_BRANDS.length);
  assert.deepEqual(result.drugs.map((d) => d.brand), [...GLP1_BRANDS]);
});

test("shapeFaersSignals: computes serious-outcome and consumer percentages", () => {
  const result = shapeFaersSignals("gastroparesis", BREAKDOWN_ROWS, TREND_ROWS);
  const oz = result.drugs.find((d) => d.brand === "Ozempic")!;
  assert.equal(oz.totalEvents, 3283);
  assert.equal(oz.deathPct, 1.8); // 60 / 3283
  assert.equal(oz.hospitalizationPct, 63.8); // 2094 / 3283
  assert.equal(oz.consumerPct, 74.2); // 2436 / 3283
});

test("shapeFaersSignals: passes top reactions through unchanged", () => {
  const result = shapeFaersSignals("gastroparesis", BREAKDOWN_ROWS, TREND_ROWS);
  const oz = result.drugs.find((d) => d.brand === "Ozempic")!;
  assert.equal(oz.topReactions.length, 2);
  assert.deepEqual(oz.topReactions[0], {
    pt: "Impaired gastric emptying",
    count: 1800,
  });
});

test("shapeFaersSignals: zero-fills brands absent from the breakdown", () => {
  const result = shapeFaersSignals("gastroparesis", BREAKDOWN_ROWS, TREND_ROWS);
  const wegovy = result.drugs.find((d) => d.brand === "Wegovy")!;
  assert.equal(wegovy.totalEvents, 0);
  assert.equal(wegovy.deathPct, 0);
  assert.equal(wegovy.consumerPct, 0);
  assert.deepEqual(wegovy.topReactions, []);
  assert.equal(wegovy.trendDirection, "insufficient");
});

test("shapeFaersSignals: dataCurrentThrough is the latest receivedate, formatted", () => {
  const result = shapeFaersSignals("gastroparesis", BREAKDOWN_ROWS, TREND_ROWS);
  // max across "2026-03-28" and "2026-03-31"
  assert.equal(result.dataCurrentThrough, "March 2026");
});

test("shapeFaersSignals: groups and chronologically sorts trend points", () => {
  const result = shapeFaersSignals("gastroparesis", BREAKDOWN_ROWS, TREND_ROWS);
  const oz = result.drugs.find((d) => d.brand === "Ozempic")!;
  assert.deepEqual(oz.trend.map((p) => p.month), ["2024-01-01", "2024-02-01"]);
  assert.deepEqual(oz.trend.map((p) => p.count), [5, 10]);
});

test("shapeFaersSignals: derives the trend window bounds", () => {
  const result = shapeFaersSignals("gastroparesis", BREAKDOWN_ROWS, TREND_ROWS);
  assert.equal(result.windowStart, "2024-01-01");
  assert.equal(result.windowEnd, "2024-02-01");
});

test("shapeFaersSignals: hasData true when any brand has events", () => {
  const result = shapeFaersSignals("gastroparesis", BREAKDOWN_ROWS, TREND_ROWS);
  assert.equal(result.hasData, true);
  assert.equal(result.consumerBaselinePct, FAERS_CONSUMER_BASELINE_PCT);
});

test("shapeFaersSignals: hasData false and null dates for empty RPC results", () => {
  const result = shapeFaersSignals("vision_loss", [], []);
  assert.equal(result.hasData, false);
  assert.equal(result.dataCurrentThrough, null);
  assert.equal(result.windowStart, null);
  assert.equal(result.windowEnd, null);
  assert.equal(result.drugs.length, GLP1_BRANDS.length);
  assert.equal(result.page, "vision_loss");
});

test("shapeFaersSignals: tolerates a null top_reactions field", () => {
  const rows = [
    {
      brand: "Ozempic",
      total_events: 5,
      deaths: 0,
      hospitalizations: 0,
      consumer_reports: 0,
      max_receivedate: "2026-01-15",
      top_reactions: null,
    },
  ];
  const result = shapeFaersSignals("gastroparesis", rows, []);
  const oz = result.drugs.find((d) => d.brand === "Ozempic")!;
  assert.deepEqual(oz.topReactions, []);
});

/* -- classifyTrend --------------------------------------------------------- */

test("classifyTrend: < 4 months is insufficient", () => {
  const pts = [
    { month: "2024-01-01", count: 1 },
    { month: "2024-02-01", count: 2 },
    { month: "2024-03-01", count: 3 },
  ];
  assert.equal(classifyTrend(pts), "insufficient");
});

test("classifyTrend: back half >= 1.2x front half is accelerating", () => {
  const pts = [1, 1, 1, 1, 5, 5, 5, 5].map((count, i) => ({
    month: `2024-0${i + 1}-01`,
    count,
  }));
  assert.equal(classifyTrend(pts), "accelerating");
});

test("classifyTrend: back half <= 0.8x front half is declining", () => {
  const pts = [5, 5, 5, 5, 1, 1, 1, 1].map((count, i) => ({
    month: `2024-0${i + 1}-01`,
    count,
  }));
  assert.equal(classifyTrend(pts), "declining");
});

test("classifyTrend: flat series is stable", () => {
  const pts = [4, 4, 4, 4].map((count, i) => ({
    month: `2024-0${i + 1}-01`,
    count,
  }));
  assert.equal(classifyTrend(pts), "stable");
});

/* -- formatMonthYear ------------------------------------------------------- */

test("formatMonthYear: ISO date -> 'Month YYYY'", () => {
  assert.equal(formatMonthYear("2026-03-31"), "March 2026");
  assert.equal(formatMonthYear("2024-01-01"), "January 2024");
});

test("formatMonthYear: null and garbage return null", () => {
  assert.equal(formatMonthYear(null), null);
  assert.equal(formatMonthYear("not-a-date"), null);
});

/* -- pct ------------------------------------------------------------------- */

test("pct: rounds to one decimal place", () => {
  assert.equal(pct(60, 3283), 1.8);
  assert.equal(pct(1, 3), 33.3);
  assert.equal(pct(1, 1), 100);
});

test("pct: zero denominator returns 0 (no divide-by-zero)", () => {
  assert.equal(pct(0, 0), 0);
  assert.equal(pct(5, 0), 0);
});
