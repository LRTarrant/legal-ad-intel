/**
 * Tests for firms validation helpers.
 */

import { validateCreateFirm } from "./types";

test("accepts a minimal valid input", () => {
  const result = validateCreateFirm({ label: "Smith & Jones LLP" });
  expect(result.ok).toBe(true);
  expect(result.errors).toEqual([]);
});

test("rejects empty label", () => {
  const result = validateCreateFirm({ label: "" });
  expect(result.ok).toBe(false);
  expect(result.errors[0]).toContain("label");
});

test("rejects whitespace-only label", () => {
  const result = validateCreateFirm({ label: "   " });
  expect(result.ok).toBe(false);
});

test("rejects label over 200 chars", () => {
  const result = validateCreateFirm({ label: "a".repeat(201) });
  expect(result.ok).toBe(false);
  expect(result.errors[0]).toContain("200");
});

test("accepts valid https URL", () => {
  const result = validateCreateFirm({
    label: "x",
    website_url: "https://example.com",
  });
  expect(result.ok).toBe(true);
});

test("rejects non-http URL", () => {
  const result = validateCreateFirm({
    label: "x",
    website_url: "ftp://example.com",
  });
  expect(result.ok).toBe(false);
  expect(result.errors[0]).toContain("http");
});

test("rejects malformed URL", () => {
  const result = validateCreateFirm({
    label: "x",
    website_url: "not a url",
  });
  expect(result.ok).toBe(false);
});

test("accepts valid 2-letter state code", () => {
  const result = validateCreateFirm({ label: "x", default_state: "AL" });
  expect(result.ok).toBe(true);
});

test("rejects lowercase state code", () => {
  const result = validateCreateFirm({ label: "x", default_state: "al" });
  expect(result.ok).toBe(false);
});

test("rejects 3-letter state code", () => {
  const result = validateCreateFirm({ label: "x", default_state: "ALA" });
  expect(result.ok).toBe(false);
});

test("accepts 3- and 4-digit DMA codes", () => {
  const result = validateCreateFirm({
    label: "x",
    default_dma_codes: ["630", "501", "1234"],
  });
  expect(result.ok).toBe(true);
});

test("rejects DMA code with letters", () => {
  const result = validateCreateFirm({
    label: "x",
    default_dma_codes: ["63X"],
  });
  expect(result.ok).toBe(false);
  expect(result.errors[0]).toContain("63X");
});

test("caps voice_descriptors at 20 entries", () => {
  const result = validateCreateFirm({
    label: "x",
    voice_descriptors: Array(21).fill("hi"),
  });
  expect(result.ok).toBe(false);
});

test("accepts 20 voice_descriptors", () => {
  const result = validateCreateFirm({
    label: "x",
    voice_descriptors: Array(20).fill("hi"),
  });
  expect(result.ok).toBe(true);
});

test("aggregates multiple errors", () => {
  const result = validateCreateFirm({
    label: "",
    website_url: "garbage",
    default_state: "lower",
  });
  expect(result.ok).toBe(false);
  expect(result.errors.length).toBeGreaterThan(1);
});
