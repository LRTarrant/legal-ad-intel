/**
 * Unit tests for the Strategy → Campaign Builder handoff contract.
 * node:test + node:assert. Run with `npx tsx --test`.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  audienceToBuyerType,
  budgetTierToRange,
  buildCampaignBuilderHandoff,
} from "./campaign-handoff";

test("budgetTierToRange covers every intake tier", () => {
  assert.deepEqual(budgetTierToRange("under_10k"), { tier: "under_10k", min: 5000, max: 10000, midpoint: 7500 });
  assert.deepEqual(budgetTierToRange("10k_25k"), { tier: "10k_25k", min: 10000, max: 25000, midpoint: 17500 });
  assert.deepEqual(budgetTierToRange("25k_75k"), { tier: "25k_75k", min: 25000, max: 75000, midpoint: 50000 });
  assert.deepEqual(budgetTierToRange("75k_plus"), { tier: "75k_plus", min: 75000, max: 150000, midpoint: 112500 });
});

test("budgetTierToRange returns null for unknown / empty tier", () => {
  assert.equal(budgetTierToRange("mystery"), null);
  assert.equal(budgetTierToRange(""), null);
  assert.equal(budgetTierToRange(undefined), null);
});

test("audienceToBuyerType maps the three audiences", () => {
  assert.equal(audienceToBuyerType("firm"), "law_firm");
  assert.equal(audienceToBuyerType("agency"), "ad_agency");
  assert.equal(audienceToBuyerType("seller"), "media_company");
  assert.equal(audienceToBuyerType("nonsense"), null);
});

test("handoff with a DMA carries the named market + full params", () => {
  const { href, unsupportedCaseType } = buildCampaignBuilderHandoff({
    market: { state: "AL", label: "Birmingham", dma_code: "630" },
    handoff: { case_type: "truck_accident" },
    budget_tier: "25k_75k",
    goal: "Lower cost per case",
    brand: { company_name: "Acme Law" },
  });
  assert.equal(unsupportedCaseType, false);
  const url = new URL(href!, "https://x.test");
  assert.equal(url.pathname, "/campaigns/builder");
  const p = url.searchParams;
  assert.equal(p.get("practice_area"), "personal_injury");
  assert.equal(p.get("state"), "AL");
  assert.equal(p.get("pi_category"), "truck_accident");
  assert.equal(p.get("market_dma_code"), "630");
  assert.equal(p.get("market_display_name"), "Birmingham");
  assert.equal(p.get("firm_name"), "Acme Law");
  assert.equal(p.get("budget_tier"), "25k_75k");
  assert.equal(p.get("budget_midpoint"), "50000");
  assert.equal(p.get("goal"), "Lower cost per case");
});

test("statewide handoff (no DMA) labels the market and omits market_dma_code", () => {
  const { href } = buildCampaignBuilderHandoff({
    market: { state: "AL", label: "Alabama statewide", dma_code: null },
    handoff: { case_type: "motor_vehicle" },
    budget_tier: "10k_25k",
  });
  const p = new URL(href!, "https://x.test").searchParams;
  assert.equal(p.get("market_display_name"), "Statewide – Alabama");
  assert.equal(p.get("pi_category"), "car_accident");
  assert.equal(p.has("market_dma_code"), false);
});

test("unsupported case types refuse the handoff", () => {
  for (const case_type of ["nursing_home", "workers_comp"]) {
    const r = buildCampaignBuilderHandoff({
      market: { state: "AL", dma_code: null },
      handoff: { case_type },
    });
    assert.equal(r.href, null);
    assert.equal(r.unsupportedCaseType, true);
  }
});
