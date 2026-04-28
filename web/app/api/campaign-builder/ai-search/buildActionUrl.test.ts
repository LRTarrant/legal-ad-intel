/**
 * Tests for buildActionUrl — the registry-based URL resolver for AI search action chips.
 *
 * Run with any TS-compatible test runner (vitest, jest with ts-jest, tsx, etc.):
 *   npx vitest run app/api/campaign-builder/ai-search/buildActionUrl.test.ts
 */

import { buildActionUrl } from "./route";

/* ── tort_detail ──────────────────────────────────────────────────────── */

test("valid tort slug returns advertising path", () => {
  expect(buildActionUrl("tort_detail", { tort_slug: "paraquat" })).toBe(
    "/advertising/torts/paraquat"
  );
});

test("valid tort slug is case-insensitive", () => {
  expect(buildActionUrl("tort_detail", { tort_slug: "Paraquat" })).toBe(
    "/advertising/torts/paraquat"
  );
});

test("all 21 catalog slugs resolve", () => {
  const slugs = [
    "afff-firefighting-foam",
    "ai-suicide-self-harm",
    "bard-powerport",
    "camp-lejeune",
    "cpap",
    "depo-provera",
    "hair-relaxer",
    "hernia-mesh",
    "nec-baby-formula",
    "olympus-duodenoscope",
    "ozempic-mounjaro",
    "paraquat",
    "roblox-cse",
    "roundup",
    "social-media-addiction",
    "social-media-youth-harm",
    "talcum-powder",
    "tylenol-acetaminophen",
    "uber-sexual-assault",
    "zantac",
    "3m-earplugs",
  ];
  for (const slug of slugs) {
    expect(buildActionUrl("tort_detail", { tort_slug: slug })).toBe(
      `/advertising/torts/${slug}`
    );
  }
});

test("unknown tort slug returns null", () => {
  expect(buildActionUrl("tort_detail", { tort_slug: "mesothelioma" })).toBeNull();
});

test("missing tort_slug param returns null", () => {
  expect(buildActionUrl("tort_detail", {})).toBeNull();
  expect(buildActionUrl("tort_detail")).toBeNull();
});

/* ── state_market ─────────────────────────────────────────────────────── */

test("valid state full name resolves", () => {
  expect(buildActionUrl("state_market", { state_name: "California" })).toBe(
    "/state-intelligence/california"
  );
});

test("valid state 2-letter code resolves", () => {
  expect(buildActionUrl("state_market", { state_name: "FL" })).toBe(
    "/state-intelligence/florida"
  );
});

test("state_abbr param also works", () => {
  expect(buildActionUrl("state_market", { state_abbr: "AZ" })).toBe(
    "/state-intelligence/arizona"
  );
});

test("unbuilt state (Texas) returns null", () => {
  expect(buildActionUrl("state_market", { state_name: "Texas" })).toBeNull();
  expect(buildActionUrl("state_market", { state_name: "TX" })).toBeNull();
});

test("missing state param returns null", () => {
  expect(buildActionUrl("state_market", {})).toBeNull();
});

/* ── static routes ────────────────────────────────────────────────────── */

test("tort_index returns /advertising/torts", () => {
  expect(buildActionUrl("tort_index")).toBe("/advertising/torts");
});

test("mdl_index returns /mdl-tracker", () => {
  expect(buildActionUrl("mdl_index")).toBe("/mdl-tracker");
});

test("mdl_detail with number returns path", () => {
  expect(buildActionUrl("mdl_detail", { mdl_number: "2741" })).toBe(
    "/mdl-tracker/2741"
  );
});

test("mdl_detail without number returns null", () => {
  expect(buildActionUrl("mdl_detail", {})).toBeNull();
});

test("competitors returns /competitors", () => {
  expect(buildActionUrl("competitors")).toBe("/competitors");
});

test("opportunity returns /opportunity", () => {
  expect(buildActionUrl("opportunity")).toBe("/opportunity");
});

test("planner returns /planner", () => {
  expect(buildActionUrl("planner")).toBe("/planner");
});

test("judicial_profiles returns /judicial-profiles", () => {
  expect(buildActionUrl("judicial_profiles")).toBe("/judicial-profiles");
});

test("storm_events returns /storm-events", () => {
  expect(buildActionUrl("storm_events")).toBe("/storm-events");
});

test("markets_index returns /markets", () => {
  expect(buildActionUrl("markets_index")).toBe("/markets");
});

/* ── unknown action_type ──────────────────────────────────────────────── */

test("unknown action_type returns null", () => {
  expect(buildActionUrl("nonexistent_page")).toBeNull();
  expect(buildActionUrl("campaign_builder")).toBeNull();
});
