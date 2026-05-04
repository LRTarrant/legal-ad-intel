/**
 * Tests for the Campaign Builder shared types and validation helpers.
 *
 * The HTTP routes themselves require a running Supabase instance to test
 * end-to-end, so this file focuses on the validation logic that runs
 * before any DB call. Route-level integration is covered by manual
 * smoke tests after deploy.
 *
 * Run with any TS-compatible test runner.
 */

import { validateSaveCampaign } from "./types";

/* ── practice_area ────────────────────────────────────────────────────── */

test("validate rejects missing practice_area", () => {
  // @ts-expect-error - intentionally missing
  const r = validateSaveCampaign({});
  expect(r.ok).toBe(false);
  expect(r.errors[0]).toContain("practice_area");
});

test("validate rejects unknown practice_area", () => {
  const r = validateSaveCampaign({
    // @ts-expect-error - intentionally bad
    practice_area: "workers_comp",
  });
  expect(r.ok).toBe(false);
  expect(r.errors[0]).toContain("practice_area");
});

/* ── mass_tort branch ─────────────────────────────────────────────────── */

test("validate accepts mass_tort with tort_slug", () => {
  const r = validateSaveCampaign({
    practice_area: "mass_tort",
    tort_slug: "roundup",
  });
  expect(r.ok).toBe(true);
  expect(r.errors).toEqual([]);
});

test("validate rejects mass_tort without tort_slug", () => {
  const r = validateSaveCampaign({ practice_area: "mass_tort" });
  expect(r.ok).toBe(false);
  expect(r.errors[0]).toContain("tort_slug");
});

/* ── personal_injury branch ───────────────────────────────────────────── */

test("validate accepts PI with category and DMA", () => {
  const r = validateSaveCampaign({
    practice_area: "personal_injury",
    pi_category: "car_accident",
    market_dma_code: "630",
  });
  expect(r.ok).toBe(true);
});

test("validate rejects PI without pi_category", () => {
  const r = validateSaveCampaign({
    practice_area: "personal_injury",
    market_dma_code: "630",
  });
  expect(r.ok).toBe(false);
  expect(r.errors[0]).toContain("pi_category");
});

test("validate rejects PI without market_dma_code", () => {
  const r = validateSaveCampaign({
    practice_area: "personal_injury",
    pi_category: "motorcycle_accident",
  });
  expect(r.ok).toBe(false);
  expect(r.errors.some((e) => e.includes("market_dma_code"))).toBe(true);
});

test("validate accumulates multiple errors", () => {
  const r = validateSaveCampaign({
    practice_area: "personal_injury",
  });
  expect(r.ok).toBe(false);
  expect(r.errors.length).toBeGreaterThan(1);
});

/* ── severity_modifiers ───────────────────────────────────────────────── */

test("validate accepts a single fatal modifier", () => {
  const r = validateSaveCampaign({
    practice_area: "personal_injury",
    pi_category: "car_accident",
    market_dma_code: "630",
    severity_modifiers: ["fatal"],
  });
  expect(r.ok).toBe(true);
});

test("validate accepts a single catastrophic modifier", () => {
  const r = validateSaveCampaign({
    practice_area: "personal_injury",
    pi_category: "car_accident",
    market_dma_code: "630",
    severity_modifiers: ["catastrophic"],
  });
  expect(r.ok).toBe(true);
});

test("validate rejects fatal + catastrophic combo", () => {
  const r = validateSaveCampaign({
    practice_area: "personal_injury",
    pi_category: "car_accident",
    market_dma_code: "630",
    severity_modifiers: ["fatal", "catastrophic"],
  });
  expect(r.ok).toBe(false);
  expect(r.errors.some((e) => e.includes("mutually exclusive"))).toBe(true);
});

test("validate rejects unknown severity modifiers", () => {
  const r = validateSaveCampaign({
    practice_area: "personal_injury",
    pi_category: "car_accident",
    market_dma_code: "630",
    // @ts-expect-error - intentionally bad
    severity_modifiers: ["fatal", "nuclear"],
  });
  expect(r.ok).toBe(false);
  expect(r.errors.some((e) => e.includes("nuclear"))).toBe(true);
});

test("validate accepts empty severity_modifiers", () => {
  const r = validateSaveCampaign({
    practice_area: "personal_injury",
    pi_category: "car_accident",
    market_dma_code: "630",
    severity_modifiers: [],
  });
  expect(r.ok).toBe(true);
});

/* ── status ───────────────────────────────────────────────────────────── */

test("validate accepts known statuses", () => {
  for (const status of ["draft", "active", "archived"] as const) {
    const r = validateSaveCampaign({
      practice_area: "mass_tort",
      tort_slug: "roundup",
      status,
    });
    expect(r.ok).toBe(true);
  }
});

test("validate rejects unknown status", () => {
  const r = validateSaveCampaign({
    practice_area: "mass_tort",
    tort_slug: "roundup",
    // @ts-expect-error - intentionally bad
    status: "published",
  });
  expect(r.ok).toBe(false);
  expect(r.errors.some((e) => e.includes("status"))).toBe(true);
});

/* ── update path (id provided) ────────────────────────────────────────── */

test("validate works the same when id is provided (update path)", () => {
  const r = validateSaveCampaign({
    id: "550e8400-e29b-41d4-a716-446655440000",
    practice_area: "personal_injury",
    pi_category: "car_accident",
    market_dma_code: "630",
  });
  expect(r.ok).toBe(true);
});

/* ── firm_id ─────────────────────────────────────────────────────────────────────────────────────────────────── */

test("validate accepts a UUID firm_id", () => {
  const r = validateSaveCampaign({
    practice_area: "mass_tort",
    tort_slug: "roundup",
    firm_id: "550e8400-e29b-41d4-a716-446655440000",
  });
  expect(r.ok).toBe(true);
});

test("validate rejects non-UUID firm_id", () => {
  const r = validateSaveCampaign({
    practice_area: "mass_tort",
    tort_slug: "roundup",
    firm_id: "not-a-uuid",
  });
  expect(r.ok).toBe(false);
  expect(r.errors.some((e) => e.includes("firm_id"))).toBe(true);
});

test("validate accepts request with no firm_id (server falls back)", () => {
  const r = validateSaveCampaign({
    practice_area: "mass_tort",
    tort_slug: "roundup",
  });
  expect(r.ok).toBe(true);
});
