/**
 * Unit tests for PI video script route's pure helpers.
 *
 * Validation, prompt assembly with brand profile, JSON wrapper stripping,
 * and response shape validation. The route handler itself is exercised
 * via Vercel preview \u2014 we don't mock OpenAI here.
 */

import {
  validatePIVideoRequest,
  buildPIVideoUserPrompt,
  stripJSONWrapper,
  validateVideoScriptResponse,
  SCENE_BUDGETS,
  PI_VIDEO_SYSTEM_PROMPT,
} from "./testable";

/* ── Fixtures ───────────────────────────────────────────────────────────── */

function baseRequest() {
  return {
    pi_category: "car_accident" as const,
    market_display_name: "Birmingham",
    state: "AL",
    firm_name: "Smith & Jones LLP",
    duration: "30s" as const,
    platform: "youtube_ad" as const,
  };
}

const sampleTemplate = {
  category: "car_accident" as const,
  displayName: "Car Accident",
  hook: "Hit by a distracted driver?",
  problem: "Insurance lowballs Birmingham victims daily.",
  authority: "Smith & Jones has tried Alabama jury cases for 20 years.",
  cta: "Call Smith & Jones for a free case review.",
  baseDisclaimer: "Attorney advertising. Prior results do not guarantee future outcomes.",
};

/* ── Validation ─────────────────────────────────────────────────────────── */

test("validate accepts a minimal valid request", () => {
  expect(validatePIVideoRequest(baseRequest())).toEqual([]);
});

test("validate rejects unknown PI category", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errors = validatePIVideoRequest({
    ...baseRequest(),
    pi_category: "hovercraft_accident" as any,
  });
  expect(errors[0]).toContain("hovercraft_accident");
});

test("validate rejects missing platform", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errors = validatePIVideoRequest({ ...baseRequest(), platform: undefined as any });
  expect(errors[0]).toContain("platform");
});

test("validate rejects unknown platform", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errors = validatePIVideoRequest({ ...baseRequest(), platform: "tiktoks" as any });
  expect(errors[0]).toContain("platform");
});

test("validate accepts each valid platform", () => {
  for (const p of ["youtube_ad", "youtube_short", "tiktok", "meta_reel", "meta_feed"] as const) {
    expect(validatePIVideoRequest({ ...baseRequest(), platform: p })).toEqual([]);
  }
});

test("validate rejects bad duration", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errors = validatePIVideoRequest({ ...baseRequest(), duration: "45s" as any });
  expect(errors[0]).toContain("duration");
});

test("validate rejects multiple severity modifiers (mutually exclusive in v1)", () => {
  const errors = validatePIVideoRequest({
    ...baseRequest(),
    severity_modifiers: ["fatal", "catastrophic"],
  });
  expect(errors.some((e) => e.includes("at most one"))).toBe(true);
});

test("validate rejects lowercase state", () => {
  const errors = validatePIVideoRequest({ ...baseRequest(), state: "al" });
  expect(errors[0]).toContain("state");
});

/* ── SCENE_BUDGETS ──────────────────────────────────────────────────────── */

test("scene budgets cover all 3 valid durations", () => {
  expect(Object.keys(SCENE_BUDGETS).sort()).toEqual(["15s", "30s", "60s"]);
});

test("scene budgets are 3 scenes evenly distributed", () => {
  for (const [duration, b] of Object.entries(SCENE_BUDGETS)) {
    expect(b.perSceneSec * 3).toBe(b.totalSec);
    // 2.5 words/sec target rate; the table rounds for human-readable
    // word budgets so allow ±1 word from the exact computation.
    const expectedWords = b.perSceneSec * 2.5;
    const delta = Math.abs(b.perSceneWords - expectedWords);
    expect(delta <= 1).toBe(true);
    expect(duration.endsWith("s")).toBe(true);
  }
});

/* ── buildUserPrompt ────────────────────────────────────────────────────── */

test("buildUserPrompt includes total runtime, scene count, word budget", () => {
  const p = buildPIVideoUserPrompt(baseRequest(), sampleTemplate);
  expect(p).toContain("30s");
  expect(p).toContain("3 scenes");
  expect(p).toContain("25 voiceover words/scene");
});

test("buildUserPrompt platform appears in human-readable form", () => {
  const p = buildPIVideoUserPrompt({ ...baseRequest(), platform: "meta_reel" }, sampleTemplate);
  expect(p).toContain("meta reel");
});

test("buildUserPrompt declares Spanish when language=es and adds translation guidance", () => {
  const p = buildPIVideoUserPrompt({ ...baseRequest(), language: "es" }, sampleTemplate);
  expect(p).toContain("Spanish");
  // Image prompts must remain in English even on Spanish output.
  expect(p).toContain("Image prompts stay in English");
});

test("buildUserPrompt embeds template hook/problem/authority/CTA/disclaimer", () => {
  const p = buildPIVideoUserPrompt(baseRequest(), sampleTemplate);
  expect(p).toContain(sampleTemplate.hook);
  expect(p).toContain(sampleTemplate.problem);
  expect(p).toContain(sampleTemplate.authority);
  expect(p).toContain(sampleTemplate.cta);
  expect(p).toContain(sampleTemplate.baseDisclaimer);
});

test("buildUserPrompt with brand profile adds firm voice context block", () => {
  const p = buildPIVideoUserPrompt(baseRequest(), sampleTemplate, {
    tagline: "We fight for what's right.",
    voice_descriptors: ["empathetic", "local"],
    differentiators: ["20 years in Birmingham"],
    partner_names: ["Maria Smith"],
    signature_phrases: [],
    service_areas: [],
  });
  expect(p).toContain("Firm voice context");
  expect(p).toContain("We fight for what's right.");
  expect(p).toContain("empathetic, local");
  expect(p).toContain("Maria Smith");
});

test("buildUserPrompt without brand profile skips the firm voice context block", () => {
  const p = buildPIVideoUserPrompt(baseRequest(), sampleTemplate, null);
  expect(p).not.toContain("Firm voice context");
});

test("buildUserPrompt asks for JSON-only output", () => {
  const p = buildPIVideoUserPrompt(baseRequest(), sampleTemplate);
  expect(p).toContain("output ONLY the JSON");
});

/* ── stripJSONWrapper ───────────────────────────────────────────────────── */

test("stripJSONWrapper removes ```json fences", () => {
  expect(stripJSONWrapper('```json\n{"a":1}\n```')).toBe('{"a":1}');
});

test("stripJSONWrapper removes plain ``` fences", () => {
  expect(stripJSONWrapper('```\n{"a":1}\n```')).toBe('{"a":1}');
});

test("stripJSONWrapper passes through unwrapped JSON", () => {
  expect(stripJSONWrapper('{"a":1}')).toBe('{"a":1}');
});

test("stripJSONWrapper trims whitespace", () => {
  expect(stripJSONWrapper('   {"a":1}   ')).toBe('{"a":1}');
});

/* ── validateVideoScriptResponse ────────────────────────────────────────── */

function validResponse() {
  const scenes = [1, 2, 3].map((n) => ({
    sceneNumber: n,
    headline: `H${n}`,
    subheadline: `Sub${n}`,
    imagePrompt: `Image prompt ${n}`,
    voiceover: `Voiceover ${n}`,
    durationSeconds: 10,
  }));
  return {
    scenes,
    ctaHeadline: "CALL NOW",
    ctaPhone: "1-800-YOUR-FIRM",
    ctaSubline: "24/7",
    disclaimer: "Attorney advertising.",
  };
}

test("validate accepts a well-formed response", () => {
  const result = validateVideoScriptResponse(validResponse());
  expect(result.ok).toBe(true);
});

test("validate rejects non-object", () => {
  const result = validateVideoScriptResponse("nope" as unknown);
  expect(result.ok).toBe(false);
});

test("validate rejects when scenes is not array", () => {
  const result = validateVideoScriptResponse({ ...validResponse(), scenes: "x" });
  expect(result.ok).toBe(false);
});

test("validate rejects when scenes count != 3", () => {
  const r = validResponse();
  r.scenes.pop();
  const result = validateVideoScriptResponse(r);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.errors[0]).toContain("3 scenes");
});

test("validate rejects when a scene has empty headline", () => {
  const r = validResponse();
  r.scenes[0].headline = "";
  const result = validateVideoScriptResponse(r);
  expect(result.ok).toBe(false);
});

test("validate rejects when a scene has empty voiceover", () => {
  const r = validResponse();
  r.scenes[1].voiceover = "   ";
  const result = validateVideoScriptResponse(r);
  expect(result.ok).toBe(false);
});

test("validate rejects when CTA fields are missing", () => {
  const r = validResponse();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (r as any).ctaHeadline = "";
  const result = validateVideoScriptResponse(r);
  expect(result.ok).toBe(false);
});

test("validate rejects when disclaimer is missing", () => {
  const r = validResponse();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (r as any).disclaimer = "";
  const result = validateVideoScriptResponse(r);
  expect(result.ok).toBe(false);
});

test("validate rejects scene with non-positive duration", () => {
  const r = validResponse();
  r.scenes[2].durationSeconds = 0;
  const result = validateVideoScriptResponse(r);
  expect(result.ok).toBe(false);
});

/* ── System prompt sanity ───────────────────────────────────────────────── */

test("system prompt insists on EXACTLY 3 scenes", () => {
  expect(PI_VIDEO_SYSTEM_PROMPT).toContain("EXACTLY 3 scenes");
});

test("system prompt forbids the word lawsuit", () => {
  expect(PI_VIDEO_SYSTEM_PROMPT).toContain("Do NOT use the word \"lawsuit\"");
});

test("system prompt requires verbatim disclaimer preservation", () => {
  expect(PI_VIDEO_SYSTEM_PROMPT).toContain("verbatim");
});
