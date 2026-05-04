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
    "/advertising/paraquat"
  );
});

test("tort with canonical_url override returns canonical path", () => {
  expect(buildActionUrl("tort_detail", { tort_slug: "social-media-addiction" })).toBe(
    "/advertising/social-media-addiction"
  );
  expect(buildActionUrl("tort_detail", { tort_slug: "roblox-abuse" })).toBe(
    "/advertising/roblox-abuse"
  );
  expect(buildActionUrl("tort_detail", { tort_slug: "olympus-duodenoscope" })).toBe(
    "/advertising/olympus-scopes"
  );
  expect(buildActionUrl("tort_detail", { tort_slug: "ai-suicide-self-harm" })).toBe(
    "/advertising/ai-suicide"
  );
  expect(buildActionUrl("tort_detail", { tort_slug: "glp1-gastroparesis" })).toBe(
    "/advertising/glp1-gastroparesis"
  );
  expect(buildActionUrl("tort_detail", { tort_slug: "glp1-vision-loss" })).toBe(
    "/advertising/glp1-vision-loss"
  );
});

test("valid tort slug is case-insensitive", () => {
  expect(buildActionUrl("tort_detail", { tort_slug: "Paraquat" })).toBe(
    "/advertising/paraquat"
  );
});

test("all 22 visible catalog slugs resolve to a non-null URL", () => {
  const slugs = [
    "afff-firefighting-foam",
    "ai-suicide-self-harm",
    "bard-powerport",
    "camp-lejeune",
    "cpap",
    "depo-provera",
    "glp1-gastroparesis",
    "glp1-vision-loss",
    "hair-relaxer",
    "hernia-mesh",
    "lyft-sexual-assault",
    "nec-baby-formula",
    "olympus-duodenoscope",
    "paraquat",
    "roblox-abuse",
    "roundup",
    "social-media-addiction",
    "talcum-powder",
    "tylenol-acetaminophen",
    "uber-sexual-assault",
    "zantac",
    "3m-earplugs",
  ];
  for (const slug of slugs) {
    const url = buildActionUrl("tort_detail", { tort_slug: slug });
    expect(url).not.toBeNull();
    expect(url).toMatch(/^\//);
  }
});

test("hidden alias slugs return null", () => {
  expect(buildActionUrl("tort_detail", { tort_slug: "ozempic-mounjaro" })).toBeNull();
  expect(buildActionUrl("tort_detail", { tort_slug: "social-media-youth-harm" })).toBeNull();
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

/* ── pi_builder ───────────────────────────────────────────────────────── */

test("pi_builder with no params returns base PI builder URL", () => {
  expect(buildActionUrl("pi_builder")).toBe(
    "/campaigns/builder?practice_area=personal_injury",
  );
});

test("pi_builder with state_name pre-selects state", () => {
  expect(buildActionUrl("pi_builder", { state_name: "Alabama" })).toBe(
    "/campaigns/builder?practice_area=personal_injury&state=alabama",
  );
});

test("pi_builder with state_abbr pre-selects state", () => {
  expect(buildActionUrl("pi_builder", { state_abbr: "AL" })).toBe(
    "/campaigns/builder?practice_area=personal_injury&state=alabama",
  );
});

test("pi_builder with unknown state falls back to base URL", () => {
  // Wyoming isn't in the state catalog — should drop the state param
  // rather than emit an invalid URL.
  expect(buildActionUrl("pi_builder", { state_name: "Wyoming" })).toBe(
    "/campaigns/builder?practice_area=personal_injury",
  );
});
