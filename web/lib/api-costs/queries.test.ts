/**
 * Unit tests for the pure-function pieces of queries.ts.
 *
 * Like other web/lib/**.test.ts files in this repo, these use the
 * project's "test/expect as runtime globals" convention. CI does not
 * execute them today (pr-typecheck.yml excludes test files); they
 * serve as living documentation and ground truth for the formatter.
 */

import { formatCalledFrom } from "./queries";

/* ── Web route shapes ───────────────────────────────────────────────── */

test("formatCalledFrom: campaign generate route", () => {
  expect(formatCalledFrom("api/campaigns/generate-pi-meta-ad")).toBe(
    "Campaign · PI Meta Ad"
  );
});

test("formatCalledFrom: campaign generate route with multi-word slug", () => {
  expect(formatCalledFrom("api/campaigns/generate-pi-strategic-brief")).toBe(
    "Campaign · PI Strategic Brief"
  );
});

test("formatCalledFrom: campaign route without generate- prefix", () => {
  expect(formatCalledFrom("api/campaigns/ai-insights")).toBe(
    "Campaign · AI Insights"
  );
});

test("formatCalledFrom: non-campaign api route", () => {
  expect(formatCalledFrom("api/ask-ai")).toBe("API · Ask AI");
});

test("formatCalledFrom: nested non-campaign api route", () => {
  expect(formatCalledFrom("api/campaign-builder/ai-search")).toBe(
    "API · Campaign Builder AI Search"
  );
});

/* ── Pipeline module shapes ─────────────────────────────────────────── */

test("formatCalledFrom: pipeline module — SERP intel", () => {
  expect(formatCalledFrom("pipelines.serp_intel_daily")).toBe(
    "Pipeline · SERP Intel Daily"
  );
});

test("formatCalledFrom: pipeline module — ad intel", () => {
  expect(formatCalledFrom("pipelines.ad_intel_daily")).toBe(
    "Pipeline · Ad Intel Daily"
  );
});

test("formatCalledFrom: pipeline module — google trends", () => {
  expect(formatCalledFrom("pipelines.google_trends_daily")).toBe(
    "Pipeline · Google Trends Daily"
  );
});

test("formatCalledFrom: pipeline module — pi search", () => {
  expect(formatCalledFrom("pipelines.pi_search_daily")).toBe(
    "Pipeline · PI Search Daily"
  );
});

test("formatCalledFrom: pipeline module — google ads", () => {
  expect(formatCalledFrom("pipelines.google_ads_daily")).toBe(
    "Pipeline · Google Ads Daily"
  );
});

/* ── Edge cases ─────────────────────────────────────────────────────── */

test("formatCalledFrom: empty string passes through", () => {
  expect(formatCalledFrom("")).toBe("");
});

test("formatCalledFrom: unknown shape passes through unchanged", () => {
  expect(formatCalledFrom("custom/something-weird")).toBe(
    "custom/something-weird"
  );
});
