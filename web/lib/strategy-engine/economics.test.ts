/** Run with: npx tsx --test lib/strategy-engine/economics.test.ts */
import test from "node:test";
import assert from "node:assert/strict";
import {
  computeFunnel,
  computeEconomics,
  economicsCaseType,
  resolveMarketTier,
  DEFAULT_LEVERS,
  type PiEconomicsBenchmark,
} from "./economics";

const PROV = {
  cpc_source: "kw", cpc_confidence: "medium" as const,
  conversion_source: "vendor", click_to_lead_confidence: "medium" as const, lead_to_signed_confidence: "low" as const,
  case_value_source: "report", case_value_confidence: "medium" as const, reported_vs_estimate: "blended" as const,
  source_notes: null,
};

const TRUCKING_T1: PiEconomicsBenchmark = {
  case_type: "trucking", market_tier: "tier_1",
  cpc_low: 100, cpc_typical: 200, cpc_high: 660,
  click_to_lead: { weak: 5, competent: 8, strong: 25 },
  lead_to_signed: { poor: 4, average: 10, elite: 20 },
  case_value_median: 100000, case_value_tail: 10000000, case_value_tail_note: "verdicts ≥$10M only",
  contingency_presuit_pct: 33, contingency_litigated_pct: 40,
  provenance: PROV,
};

const AUTO_T1: PiEconomicsBenchmark = {
  ...TRUCKING_T1,
  case_type: "auto", cpc_low: 75, cpc_typical: 150, cpc_high: 300,
  case_value_median: 8200, case_value_tail: null, case_value_tail_note: null,
};

test("computeFunnel: spend ÷ cpc → clicks → leads → signed → cost-per-case", () => {
  const f = computeFunnel(50000, 200, 8, 10);
  assert.equal(f.clicks, 250);          // 50000 / 200
  assert.equal(f.leads, 20);            // 250 × 8%
  assert.equal(f.signed_cases, 2);      // 20 × 10%
  assert.equal(f.cost_per_signed_case, 25000); // 50000 / 2
});

test("computeFunnel returns the FULL stage breakdown (v2 gap-analysis dependency)", () => {
  const f = computeFunnel(50000, 200, 8, 10);
  for (const k of ["monthly_spend","cpc","clicks","click_to_lead_pct","leads","lead_to_signed_pct","signed_cases","cost_per_signed_case"] as const) {
    assert.ok(k in f, `missing stage: ${k}`);
    assert.equal(typeof f[k], "number");
  }
});

test("computeEconomics: default levers, trucking tier_1, $50k/mo", () => {
  const r = computeEconomics(TRUCKING_T1, 50000, DEFAULT_LEVERS);
  // cost-per-case spread from CPC low/typical/high at competent(8) × average(10) → denom 0.008
  assert.equal(r.cost_per_case_low, 12500);     // 100 / 0.008
  assert.equal(r.cost_per_case_typical, 25000); // 200 / 0.008
  assert.equal(r.cost_per_case_high, 82500);    // 660 / 0.008
  // lever envelope at typical cpc
  assert.equal(r.lever_best_cost_per_case, 4000);    // 200 / (0.25×0.20)
  assert.equal(r.lever_worst_cost_per_case, 100000); // 200 / (0.05×0.04)
  // ROI context: trucking's high case value absorbs the $25k acquisition
  assert.equal(r.fee_per_case, 33000);          // 100000 × 33%
  assert.equal(r.fee_covers_acquisition, true);
  assert.equal(r.plausible, true);
});

test("computeEconomics: auto's low fee does NOT cover acquisition (the insight)", () => {
  const r = computeEconomics(AUTO_T1, 50000, DEFAULT_LEVERS);
  assert.equal(r.cost_per_case_typical, 18750); // 150 / 0.008
  assert.equal(r.fee_per_case, 2706);           // 8200 × 33%
  assert.equal(r.fee_covers_acquisition, false);
});

test("levers move the output: elite intake collapses cost-per-case", () => {
  const elite = computeEconomics(AUTO_T1, 50000, { clickToLead: "strong", leadToSigned: "elite" });
  assert.equal(elite.cost_per_case_typical, 3000); // 150 / (0.25×0.20=0.05)
  assert.ok(elite.cost_per_case_typical < 18750);
});

test("plausibility flags a number outside the wide sanity band (math/data bug guard)", () => {
  const broken: PiEconomicsBenchmark = { ...AUTO_T1, cpc_typical: 600 }; // 600/0.008 = 75000 > 60k
  const r = computeEconomics(broken, 50000, DEFAULT_LEVERS);
  assert.equal(r.plausible, false);
});

test("economicsCaseType maps PI torts, null for uncovered", () => {
  assert.equal(economicsCaseType("truck_accident"), "trucking");
  assert.equal(economicsCaseType("motor_vehicle"), "auto");
  assert.equal(economicsCaseType("motorcycle"), "motorcycle");
  assert.equal(economicsCaseType("nursing_home"), null);
  assert.equal(economicsCaseType("personal_injury"), null);
});

test("resolveMarketTier: rank thresholds + statewide default", () => {
  assert.equal(resolveMarketTier(10), "tier_1");
  assert.equal(resolveMarketTier(25), "tier_1");
  assert.equal(resolveMarketTier(44), "tier_2"); // Birmingham-ish
  assert.equal(resolveMarketTier(75), "tier_2");
  assert.equal(resolveMarketTier(90), "small");
  assert.equal(resolveMarketTier(null), "tier_2");
});
