/**
 * Unit tests for the PI Meta ad route's pure helpers.
 *
 * Validation, prompt assembly with brand profile, JSON wrapper stripping,
 * response shape validation, char-limit truncation, and length reporting.
 * The route handler itself is exercised against the live OpenAI stack
 * via Vercel preview \u2014 we don't mock OpenAI here.
 */

import {
  META_LIMITS,
  PI_META_AD_SYSTEM_PROMPT,
  VALID_CTA_LABELS,
  buildLengthReport,
  buildPIMetaAdUserPrompt,
  stripJSONWrapper,
  truncateAtWordBoundary,
  validatePIMetaAdRequest,
  validatePIMetaAdResponse,
  type PIMetaAdRequest,
  type PIMetaAdResponse,
} from "./testable";
import type { PITemplate } from "@/lib/campaign-builder/pi-templates/types";

/* ── Fixtures ───────────────────────────────────────────────────────────── */

function baseRequest(overrides: Partial<PIMetaAdRequest> = {}): PIMetaAdRequest {
  return {
    pi_category: "car_accident",
    market_display_name: "Birmingham",
    state: "AL",
    firm_name: "Smith & Jones LLP",
    ...overrides,
  };
}

function fakeTemplate(): PITemplate {
  return {
    category: "car_accident",
    displayName: "Car Accident",
    hook: "Hurt in a Birmingham car wreck?",
    problem: "Medical bills pile up while insurers stall.",
    authority: "Local attorneys with 30+ years of experience.",
    socialProof: "Thousands of Alabamians helped.",
    cta: "Call Smith & Jones for a free consultation today.",
    baseDisclaimer: "Attorney advertising. Past results do not guarantee future outcomes.",
  } as PITemplate;
}

function validResponse(): PIMetaAdResponse {
  return {
    primary_text:
      "Hurt in a Birmingham car wreck? Don't let insurers stall \u2014 our team has helped thousands of Alabama families get back on their feet.",
    headline: "Injured in a Birmingham crash?",
    description: "Free consultation. 30+ years.",
    cta_label: "Call Now",
    image_prompt:
      "A wide-angle photograph of an empty residential intersection in Birmingham, Alabama, late afternoon golden light, asphalt slick from rain, no people, no cars, square framing.",
    rationale: "Phone CTA fits urgent injury intent; primary text leads with empathy.",
  };
}

/* ── validatePIMetaAdRequest ────────────────────────────────────────────── */

test("validate request: minimal valid", () => {
  const errors = validatePIMetaAdRequest(baseRequest());
  expect(errors).toEqual([]);
});

test("validate request: missing pi_category", () => {
  const errors = validatePIMetaAdRequest({
    ...baseRequest(),
    pi_category: undefined as never,
  });
  expect(errors.length).toBeGreaterThan(0);
});

test("validate request: invalid pi_category", () => {
  const errors = validatePIMetaAdRequest({
    ...baseRequest(),
    pi_category: "made_up" as never,
  });
  expect(errors.length).toBeGreaterThan(0);
});

test("validate request: missing market_display_name", () => {
  const errors = validatePIMetaAdRequest({ ...baseRequest(), market_display_name: "" });
  expect(errors.length).toBeGreaterThan(0);
});

test("validate request: lowercase state rejected", () => {
  const errors = validatePIMetaAdRequest({ ...baseRequest(), state: "al" });
  expect(errors.length).toBeGreaterThan(0);
});

test("validate request: empty firm_name", () => {
  const errors = validatePIMetaAdRequest({ ...baseRequest(), firm_name: "  " });
  expect(errors.length).toBeGreaterThan(0);
});

test("validate request: bad language", () => {
  const errors = validatePIMetaAdRequest({
    ...baseRequest(),
    language: "fr" as never,
  });
  expect(errors.length).toBeGreaterThan(0);
});

test("validate request: spanish accepted", () => {
  const errors = validatePIMetaAdRequest({ ...baseRequest(), language: "es" });
  expect(errors).toEqual([]);
});

test("validate request: bad aspect_ratio", () => {
  const errors = validatePIMetaAdRequest({
    ...baseRequest(),
    aspect_ratio: "ultrawide" as never,
  });
  expect(errors.length).toBeGreaterThan(0);
});

test("validate request: vertical aspect accepted", () => {
  const errors = validatePIMetaAdRequest({
    ...baseRequest(),
    aspect_ratio: "vertical",
  });
  expect(errors).toEqual([]);
});

test("validate request: bad cta_intent", () => {
  const errors = validatePIMetaAdRequest({
    ...baseRequest(),
    cta_intent: "buy_now" as never,
  });
  expect(errors.length).toBeGreaterThan(0);
});

test("validate request: null cta_intent accepted", () => {
  const errors = validatePIMetaAdRequest({
    ...baseRequest(),
    cta_intent: null,
  });
  expect(errors).toEqual([]);
});

test("validate request: severity_modifiers must be array", () => {
  const errors = validatePIMetaAdRequest({
    ...baseRequest(),
    severity_modifiers: "fatal" as never,
  });
  expect(errors.length).toBeGreaterThan(0);
});

test("validate request: invalid severity rejected", () => {
  const errors = validatePIMetaAdRequest({
    ...baseRequest(),
    severity_modifiers: ["bogus"] as never,
  });
  expect(errors.length).toBeGreaterThan(0);
});

test("validate request: valid severity accepted", () => {
  const errors = validatePIMetaAdRequest({
    ...baseRequest(),
    severity_modifiers: ["fatal"],
  });
  expect(errors).toEqual([]);
});

/* ── buildPIMetaAdUserPrompt ────────────────────────────────────────────── */

test("user prompt: includes all required sections", () => {
  const out = buildPIMetaAdUserPrompt(baseRequest(), fakeTemplate());
  expect(out).toContain("Category: Car Accident");
  expect(out).toContain("Firm: Smith & Jones LLP");
  expect(out).toContain("Market: Birmingham");
  expect(out).toContain("State: AL");
  expect(out).toContain("HOOK:");
  expect(out).toContain("CALL TO ACTION:");
});

test("user prompt: lists allowed CTAs", () => {
  const out = buildPIMetaAdUserPrompt(baseRequest(), fakeTemplate());
  for (const cta of VALID_CTA_LABELS) {
    expect(out).toContain(cta);
  }
});

test("user prompt: spanish flag passes through", () => {
  const out = buildPIMetaAdUserPrompt(
    baseRequest({ language: "es" }),
    fakeTemplate(),
  );
  expect(out).toContain("Spanish");
});

test("user prompt: aspect ratio default is square", () => {
  const out = buildPIMetaAdUserPrompt(baseRequest(), fakeTemplate());
  expect(out).toContain("Image aspect ratio: square");
});

test("user prompt: aspect ratio override", () => {
  const out = buildPIMetaAdUserPrompt(
    baseRequest({ aspect_ratio: "vertical" }),
    fakeTemplate(),
  );
  expect(out).toContain("Image aspect ratio: vertical");
});

test("user prompt: cta_intent appears when supplied", () => {
  const out = buildPIMetaAdUserPrompt(
    baseRequest({ cta_intent: "phone_call" }),
    fakeTemplate(),
  );
  expect(out).toContain("CTA intent: phone_call");
});

test("user prompt: no CTA intent line when null", () => {
  const out = buildPIMetaAdUserPrompt(baseRequest(), fakeTemplate());
  expect(out).not.toContain("CTA intent:");
});

test("user prompt: brand context included when present", () => {
  const out = buildPIMetaAdUserPrompt(baseRequest(), fakeTemplate(), {
    tagline: "We fight for what's right.",
    voice_descriptors: ["compassionate", "local"],
  });
  expect(out).toContain("Firm voice context");
  expect(out).toContain("We fight for what's right.");
  expect(out).toContain("compassionate");
});

test("user prompt: no brand section when no signals", () => {
  const out = buildPIMetaAdUserPrompt(baseRequest(), fakeTemplate(), {
    tagline: null,
    voice_descriptors: [],
  });
  expect(out).not.toContain("Firm voice context");
});

test("user prompt: ends with JSON instruction", () => {
  const out = buildPIMetaAdUserPrompt(baseRequest(), fakeTemplate());
  expect(out).toContain("Return JSON:");
  expect(out).toContain("primary_text");
  expect(out).toContain("headline");
  expect(out).toContain("description");
  expect(out).toContain("cta_label");
  expect(out).toContain("image_prompt");
});

/* ── stripJSONWrapper ───────────────────────────────────────────────────── */

test("stripJSONWrapper: removes ```json fence", () => {
  expect(stripJSONWrapper('```json\n{"a":1}\n```')).toBe('{"a":1}');
});

test("stripJSONWrapper: removes plain ``` fence", () => {
  expect(stripJSONWrapper('```\n{"a":1}\n```')).toBe('{"a":1}');
});

test("stripJSONWrapper: passes unfenced through", () => {
  expect(stripJSONWrapper('  {"a":1}  ')).toBe('{"a":1}');
});

/* ── validatePIMetaAdResponse: shape ───────────────────────────────────── */

test("validate response: rejects non-object", () => {
  const r = validatePIMetaAdResponse("nope");
  expect(r.ok).toBe(false);
});

test("validate response: full happy path", () => {
  const r = validatePIMetaAdResponse(validResponse());
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.value.headline).toContain("Birmingham");
    expect(r.value.cta_label).toBe("Call Now");
  }
});

test("validate response: missing primary_text fails", () => {
  const r = validatePIMetaAdResponse({ ...validResponse(), primary_text: "" });
  expect(r.ok).toBe(false);
});

test("validate response: missing headline fails", () => {
  const r = validatePIMetaAdResponse({ ...validResponse(), headline: "  " });
  expect(r.ok).toBe(false);
});

test("validate response: non-string description fails", () => {
  const r = validatePIMetaAdResponse({ ...validResponse(), description: 42 });
  expect(r.ok).toBe(false);
});

test("validate response: missing image_prompt fails", () => {
  const r = validatePIMetaAdResponse({ ...validResponse(), image_prompt: "" });
  expect(r.ok).toBe(false);
});

test("validate response: bad CTA rejected", () => {
  const r = validatePIMetaAdResponse({
    ...validResponse(),
    cta_label: "Buy Now",
  });
  expect(r.ok).toBe(false);
});

test("validate response: every allowed CTA accepted", () => {
  for (const cta of VALID_CTA_LABELS) {
    const r = validatePIMetaAdResponse({ ...validResponse(), cta_label: cta });
    expect(r.ok).toBe(true);
  }
});

test("validate response: missing rationale gets default", () => {
  const r = validatePIMetaAdResponse({
    ...validResponse(),
    rationale: undefined,
  });
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.value.rationale.length).toBeGreaterThan(0);
  }
});

test("validate response: long rationale capped", () => {
  const r = validatePIMetaAdResponse({
    ...validResponse(),
    rationale: "x".repeat(2000),
  });
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.value.rationale.length).toBeLessThanOrEqual(600);
  }
});

/* ── validatePIMetaAdResponse: char-limit truncation ────────────────────── */

test("validate response: long primary_text truncated at word boundary", () => {
  const longText = "Lorem ipsum dolor sit amet ".repeat(40); // ~1000 chars
  const r = validatePIMetaAdResponse({ ...validResponse(), primary_text: longText });
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.value.primary_text.length).toBeLessThanOrEqual(
      META_LIMITS.primary_text.max,
    );
    // No trailing partial word
    expect(r.value.primary_text.endsWith(" ")).toBe(false);
  }
});

test("validate response: long headline truncated", () => {
  const longText = "x".repeat(100);
  const r = validatePIMetaAdResponse({ ...validResponse(), headline: longText });
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.value.headline.length).toBeLessThanOrEqual(META_LIMITS.headline.max);
  }
});

/* ── truncateAtWordBoundary ────────────────────────────────────────────── */

test("truncate: short string passes through", () => {
  expect(truncateAtWordBoundary("Hello world", 50)).toBe("Hello world");
});

test("truncate: cuts at last word boundary", () => {
  const r = truncateAtWordBoundary("This is a longer sentence indeed", 20);
  expect(r.length).toBeLessThanOrEqual(20);
  expect(r.endsWith("indeed.")).toBe(false);
  // Should not split a word
  expect(/\s\w{1,2}\.$/.test(r) || /[.!?]$/.test(r)).toBe(true);
});

test("truncate: preserves existing terminal punctuation", () => {
  const r = truncateAtWordBoundary("Already short. Right!", 12);
  // 12 chars hits "Already shor" -> last space at "Already " -> "Already" + period
  expect(r.endsWith(".") || r.endsWith("!") || r.endsWith("?")).toBe(true);
});

test("truncate: hard-cuts a single giant token", () => {
  const giant = "a".repeat(80);
  const r = truncateAtWordBoundary(giant, 30);
  expect(r.length).toBeLessThanOrEqual(30);
});

/* ── buildLengthReport ─────────────────────────────────────────────────── */

test("length report: ok statuses for short fields", () => {
  const reports = buildLengthReport(validResponse());
  for (const r of reports) {
    expect(r.status === "ok" || r.status === "tight").toBe(true);
  }
});

test("length report: tight when over recommended but under max", () => {
  const tight: PIMetaAdResponse = {
    ...validResponse(),
    headline: "x".repeat(META_LIMITS.headline.recommended + 5),
  };
  const reports = buildLengthReport(tight);
  const headlineReport = reports.find((r) => r.field === "headline");
  expect(headlineReport?.status).toBe("tight");
});

test("length report: over status when above max (post-validation should never see this)", () => {
  const over: PIMetaAdResponse = {
    ...validResponse(),
    headline: "x".repeat(META_LIMITS.headline.max + 10),
  };
  const reports = buildLengthReport(over);
  const headlineReport = reports.find((r) => r.field === "headline");
  expect(headlineReport?.status).toBe("over");
});

test("length report: returns three rows", () => {
  const reports = buildLengthReport(validResponse());
  expect(reports.length).toBe(3);
  expect(reports.map((r) => r.field).sort()).toEqual([
    "description",
    "headline",
    "primary_text",
  ]);
});

/* ── System prompt sanity ──────────────────────────────────────────────── */

test("system prompt: forbids 'guaranteed'", () => {
  expect(PI_META_AD_SYSTEM_PROMPT).toContain("guaranteed");
});

test("system prompt: requires JSON output", () => {
  expect(PI_META_AD_SYSTEM_PROMPT).toContain("STRICT JSON");
});

test("system prompt: warns about in-image text", () => {
  expect(PI_META_AD_SYSTEM_PROMPT.toLowerCase()).toContain("in-image text");
});

test("system prompt: spanish translation rule", () => {
  expect(PI_META_AD_SYSTEM_PROMPT.toLowerCase()).toContain("spanish");
});

/* ── VALID_CTA_LABELS sanity ───────────────────────────────────────────── */

test("CTA list: includes Call Now", () => {
  expect(VALID_CTA_LABELS).toContain("Call Now");
});

test("CTA list: contains 6 entries", () => {
  expect(VALID_CTA_LABELS.length).toBe(6);
});
