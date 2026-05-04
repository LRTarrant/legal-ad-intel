/**
 * Unit tests for generate-pi-google-rsa/testable.ts (Phase 4b).
 *
 * Coverage:
 *   - validatePIGoogleRSARequest (required fields, language enum, severity)
 *   - buildPIGoogleRSAUserPrompt (brand context inclusion, final_url hint)
 *   - stripJSONWrapper (markdown fence handling)
 *   - validatePIGoogleRSAResponse (shape, headline/description count rules,
 *     dedup, truncation, path sanitization)
 *   - sanitizePathField (ASCII-only, hyphen substitution, length cap)
 *   - truncateAtWordBoundary (word-aware truncation)
 *   - buildRSALengthReports (status thresholds)
 */

import {
  buildPIGoogleRSAUserPrompt,
  buildRSALengthReports,
  GOOGLE_RSA_LIMITS,
  PIGoogleRSARequest,
  PIGoogleRSAResponse,
  sanitizePathField,
  stripJSONWrapper,
  truncateAtWordBoundary,
  validatePIGoogleRSARequest,
  validatePIGoogleRSAResponse,
} from "./testable";

// Minimal PITemplate stub matching the interface used by the prompt builder.
// We only need the fields buildPIGoogleRSAUserPrompt actually reads.
const TEMPLATE_STUB = {
  category: "car_accident",
  displayName: "Auto Accident",
  hook: "Hurt in a car wreck?",
  problem: "Insurance companies will lowball you.",
  authority: "Trial-experienced injury attorneys.",
  socialProof: "$100M+ recovered for clients.",
  cta: "Call for a free consultation.",
  baseDisclaimer: "Past results do not guarantee future outcomes.",
} as const;

const VALID_REQUEST: PIGoogleRSARequest = {
  pi_category: "car_accident",
  market_display_name: "Birmingham, AL",
  state: "AL",
  firm_name: "Tarrant Law",
};

/* ── validatePIGoogleRSARequest ────────────────────────────────────────── */

test("validatePIGoogleRSARequest accepts a minimal valid request", () => {
  expect(validatePIGoogleRSARequest(VALID_REQUEST)).toEqual([]);
});

test("validatePIGoogleRSARequest rejects missing required fields", () => {
  const errors = validatePIGoogleRSARequest({
    pi_category: "auto_accident",
    market_display_name: "",
    state: "",
    firm_name: "",
  });
  expect(errors.length).toBeGreaterThan(0);
  // All three required fields produce an error.
  expect(errors.some((e) => e.includes("market_display_name"))).toBe(true);
  expect(errors.some((e) => e.includes("state"))).toBe(true);
  expect(errors.some((e) => e.includes("firm_name"))).toBe(true);
});

test("validatePIGoogleRSARequest rejects invalid state code", () => {
  const errors = validatePIGoogleRSARequest({
    ...VALID_REQUEST,
    state: "Alabama", // wrong format
  });
  expect(errors.some((e) => e.includes("state"))).toBe(true);
});

test("validatePIGoogleRSARequest rejects unknown language", () => {
  const errors = validatePIGoogleRSARequest({
    ...VALID_REQUEST,
    language: "fr" as unknown as "en",
  });
  expect(errors.some((e) => e.includes("language"))).toBe(true);
});

test("validatePIGoogleRSARequest rejects bad pi_category", () => {
  const errors = validatePIGoogleRSARequest({
    ...VALID_REQUEST,
    pi_category: "made_up_category" as unknown as "car_accident",
  });
  expect(errors.some((e) => e.includes("pi_category"))).toBe(true);
});

test("validatePIGoogleRSARequest rejects invalid severity", () => {
  const errors = validatePIGoogleRSARequest({
    ...VALID_REQUEST,
    severity_modifiers: ["typo" as unknown as "fatal"],
  });
  expect(errors.some((e) => e.includes("severity_modifier"))).toBe(true);
});

test("validatePIGoogleRSARequest accepts null final_url", () => {
  const errors = validatePIGoogleRSARequest({
    ...VALID_REQUEST,
    final_url: null,
  });
  expect(errors).toEqual([]);
});

test("validatePIGoogleRSARequest accepts string final_url", () => {
  const errors = validatePIGoogleRSARequest({
    ...VALID_REQUEST,
    final_url: "https://tarrantlaw.com/birmingham",
  });
  expect(errors).toEqual([]);
});

/* ── buildPIGoogleRSAUserPrompt ────────────────────────────────────────── */

test("buildPIGoogleRSAUserPrompt includes core fields", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prompt = buildPIGoogleRSAUserPrompt(VALID_REQUEST, TEMPLATE_STUB as any);
  expect(prompt).toContain("Tarrant Law");
  expect(prompt).toContain("Birmingham, AL");
  expect(prompt).toContain("English (en)");
  expect(prompt).toContain("Hurt in a car wreck?");
  expect(prompt).toContain("Auto Accident");
});

test("buildPIGoogleRSAUserPrompt includes Spanish language line when es", () => {
  const prompt = buildPIGoogleRSAUserPrompt(
    { ...VALID_REQUEST, language: "es" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TEMPLATE_STUB as any,
  );
  expect(prompt).toContain("Spanish (es)");
});

test("buildPIGoogleRSAUserPrompt includes final_url hint when provided", () => {
  const prompt = buildPIGoogleRSAUserPrompt(
    { ...VALID_REQUEST, final_url: "https://tarrantlaw.com/birmingham" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TEMPLATE_STUB as any,
  );
  expect(prompt).toContain("Final URL");
  expect(prompt).toContain("birmingham");
});

test("buildPIGoogleRSAUserPrompt omits Final URL line when not provided", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prompt = buildPIGoogleRSAUserPrompt(VALID_REQUEST, TEMPLATE_STUB as any);
  expect(prompt).not.toContain("Final URL");
});

test("buildPIGoogleRSAUserPrompt includes brand voice section when supplied", () => {
  const prompt = buildPIGoogleRSAUserPrompt(
    VALID_REQUEST,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TEMPLATE_STUB as any,
    {
      tagline: "We fight for Alabama.",
      voice_descriptors: ["empathetic", "local"],
      differentiators: ["Trial experience"],
      partner_names: [],
      signature_phrases: [],
      service_areas: ["Birmingham"],
    },
  );
  expect(prompt).toContain("Firm voice context");
  expect(prompt).toContain("We fight for Alabama");
});

/* ── stripJSONWrapper ──────────────────────────────────────────────────── */

test("stripJSONWrapper removes ```json fences", () => {
  expect(stripJSONWrapper('```json\n{"a":1}\n```')).toBe('{"a":1}');
});

test("stripJSONWrapper removes plain ``` fences", () => {
  expect(stripJSONWrapper('```\n{"a":1}\n```')).toBe('{"a":1}');
});

test("stripJSONWrapper passes through clean JSON", () => {
  expect(stripJSONWrapper('{"a":1}')).toBe('{"a":1}');
});

/* ── validatePIGoogleRSAResponse ───────────────────────────────────────── */

function makeValidLLMResponse() {
  return {
    headlines: [
      "Hurt In A Wreck?",
      "Free Case Review",
      "Birmingham Injury Lawyer",
      "Alabama Auto Accident",
      "No Fee Unless We Win",
      "Call Today For Help",
      "Trial Lawyers Since 1994",
      "100M Recovered",
      "Talk To A Lawyer Free",
      "We Fight For Alabamans",
      "24/7 Free Consultation",
      "Personal Injury Help",
      "Local Birmingham Firm",
      "Hablamos Espanol",
      "Get Your Free Case Eval",
    ],
    descriptions: [
      "Hurt in an Alabama auto accident? Get a free case review today.",
      "Birmingham trial lawyers — no fee unless we win your case.",
      "Insurance companies lowball victims. We don't. Call today.",
      "Free consultation. No-pressure. Available 24/7.",
    ],
    path1: "Personal-Injury",
    path2: "Birmingham",
    rationale: "Mix of pain-point, location, and benefit headlines.",
  };
}

test("validatePIGoogleRSAResponse accepts a well-formed response", () => {
  const result = validatePIGoogleRSAResponse(makeValidLLMResponse());
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.headlines.length).toBe(15);
    expect(result.value.descriptions.length).toBe(4);
    expect(result.value.path1).toBe("Personal-Injury");
    expect(result.value.path2).toBe("Birmingham");
  }
});

test("validatePIGoogleRSAResponse rejects non-object input", () => {
  const result = validatePIGoogleRSAResponse("not an object");
  expect(result.ok).toBe(false);
});

test("validatePIGoogleRSAResponse rejects missing headlines array", () => {
  const result = validatePIGoogleRSAResponse({
    ...makeValidLLMResponse(),
    headlines: "oops",
  });
  expect(result.ok).toBe(false);
});

test("validatePIGoogleRSAResponse rejects too few headlines", () => {
  const result = validatePIGoogleRSAResponse({
    ...makeValidLLMResponse(),
    headlines: ["only", "three", "items"],
  });
  expect(result.ok).toBe(false);
});

test("validatePIGoogleRSAResponse caps at 15 headlines", () => {
  const tooMany = Array.from({ length: 25 }, (_, i) => `Headline ${i + 1}`);
  const result = validatePIGoogleRSAResponse({
    ...makeValidLLMResponse(),
    headlines: tooMany,
  });
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.headlines.length).toBe(15);
  }
});

test("validatePIGoogleRSAResponse dedupes case-insensitive headlines", () => {
  const dupes = [
    "Hurt In A Wreck?",
    "HURT IN A WRECK?", // duplicate after lowercase
    "hurt in a wreck?", // duplicate
    "Free Case Review",
    "Free Consultation",
    "Birmingham Lawyer",
    "Alabama Lawyer",
  ];
  const result = validatePIGoogleRSAResponse({
    ...makeValidLLMResponse(),
    headlines: dupes,
  });
  expect(result.ok).toBe(true);
  if (result.ok) {
    // 5 unique items expected; meets minCount of 5.
    expect(result.value.headlines.length).toBe(5);
  }
});

test("validatePIGoogleRSAResponse truncates over-length headlines at word boundary", () => {
  const tooLong = "This headline is way too long to fit in thirty characters total";
  const headlines = [tooLong, ...makeValidLLMResponse().headlines.slice(0, 14)];
  const result = validatePIGoogleRSAResponse({
    ...makeValidLLMResponse(),
    headlines,
  });
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.headlines[0].length).toBeLessThanOrEqual(
      GOOGLE_RSA_LIMITS.headline.maxChars,
    );
    // Word-boundary truncation: should NOT end with a hyphenated stub or
    // trailing whitespace.
    expect(result.value.headlines[0].endsWith(" ")).toBe(false);
    expect(result.value.headlines[0].endsWith("-")).toBe(false);
  }
});

test("validatePIGoogleRSAResponse truncates over-length descriptions", () => {
  const tooLong =
    "This description is intentionally written to be more than ninety characters long, well past the Google maximum that we enforce strictly here.";
  const result = validatePIGoogleRSAResponse({
    ...makeValidLLMResponse(),
    descriptions: [tooLong, ...makeValidLLMResponse().descriptions.slice(0, 3)],
  });
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.descriptions[0].length).toBeLessThanOrEqual(
      GOOGLE_RSA_LIMITS.description.maxChars,
    );
  }
});

test("validatePIGoogleRSAResponse handles missing rationale", () => {
  const { rationale: _, ...withoutRationale } = makeValidLLMResponse();
  const result = validatePIGoogleRSAResponse(withoutRationale);
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.rationale).toBe("Generated by AI.");
  }
});

test("validatePIGoogleRSAResponse accepts only 2 descriptions (Google's min is 2)", () => {
  const result = validatePIGoogleRSAResponse({
    ...makeValidLLMResponse(),
    descriptions: [
      "Birmingham trial lawyers — no fee unless we win your case.",
      "Free consultation. No-pressure. Available 24/7.",
    ],
  });
  expect(result.ok).toBe(true);
});

test("validatePIGoogleRSAResponse rejects too few descriptions", () => {
  const result = validatePIGoogleRSAResponse({
    ...makeValidLLMResponse(),
    descriptions: ["Only one description here."],
  });
  expect(result.ok).toBe(false);
});

/* ── sanitizePathField ─────────────────────────────────────────────────── */

test("sanitizePathField passes clean ASCII through", () => {
  const errors: string[] = [];
  expect(sanitizePathField("Personal-Injury", "path1", errors)).toBe(
    "Personal-Injury",
  );
  expect(errors).toEqual([]);
});

test("sanitizePathField replaces spaces with hyphens", () => {
  const errors: string[] = [];
  expect(sanitizePathField("Car Accident Lawyer", "path1", errors)).toBe(
    "Car-Accident-La",
  );
  expect(errors).toEqual([]);
});

test("sanitizePathField strips non-ASCII characters", () => {
  const errors: string[] = [];
  expect(sanitizePathField("Birmingham/AL!", "path1", errors)).toBe(
    "BirminghamAL",
  );
});

test("sanitizePathField truncates at 15 chars", () => {
  const errors: string[] = [];
  const out = sanitizePathField("PersonalInjuryAttorney", "path1", errors);
  expect(out!.length).toBeLessThanOrEqual(15);
});

test("sanitizePathField returns empty string for null/undefined", () => {
  const errors: string[] = [];
  expect(sanitizePathField(null, "path1", errors)).toBe("");
  expect(sanitizePathField(undefined, "path1", errors)).toBe("");
  expect(errors).toEqual([]);
});

test("sanitizePathField errors on non-string", () => {
  const errors: string[] = [];
  const out = sanitizePathField(42, "path1", errors);
  expect(out).toBe(null);
  expect(errors.length).toBe(1);
});

test("sanitizePathField collapses runs of hyphens", () => {
  const errors: string[] = [];
  expect(sanitizePathField("Foo---Bar", "path1", errors)).toBe("Foo-Bar");
});

/* ── truncateAtWordBoundary ────────────────────────────────────────────── */

test("truncateAtWordBoundary leaves short strings alone", () => {
  expect(truncateAtWordBoundary("short", 30)).toBe("short");
});

test("truncateAtWordBoundary cuts at last whitespace under maxLen", () => {
  const out = truncateAtWordBoundary(
    "This is a fairly long string we need to fit",
    20,
  );
  expect(out.length).toBeLessThanOrEqual(20);
  expect(out.endsWith(" ")).toBe(false);
  // Should be one of the prefix word-boundaries of the input.
  // Possible cuts at maxLen=20: "This is a fairly" (16) or "This is a fairly lon" (hard cut).
  // The algorithm prefers the last space if it's beyond half-budget, so:
  expect(out).toBe("This is a fairly");
});

test("truncateAtWordBoundary hard-cuts when no space in budget", () => {
  const out = truncateAtWordBoundary("supercalifragilisticexpialidocious", 10);
  expect(out.length).toBe(10);
});

/* ── buildRSALengthReports ─────────────────────────────────────────────── */

test("buildRSALengthReports flags ok/tight statuses", () => {
  const value: PIGoogleRSAResponse = {
    headlines: [
      "Short", // ok
      "Just under thirty (28 chars).", // 29 chars → tight
    ],
    descriptions: ["Short description.", "x".repeat(89)],
    path1: "p1",
    path2: "p2",
    rationale: "...",
  };
  const reports = buildRSALengthReports(value);
  expect(reports.headlines[0].status).toBe("ok");
  // 29 chars >= 30 - 3 → "tight"
  expect(reports.headlines[1].status).toBe("tight");
  expect(reports.descriptions[0].status).toBe("ok");
  // 89 chars >= 90 - 3 → "tight"
  expect(reports.descriptions[1].status).toBe("tight");
});
