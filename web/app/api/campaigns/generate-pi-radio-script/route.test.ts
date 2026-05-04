/**
 * Unit tests for the PI radio script route's pure helpers.
 *
 * The route handler itself is tested via integration (Vercel preview)
 * — we don't try to mock OpenAI here. These tests cover the bits we'd
 * be most likely to silently break with a copy-paste regression:
 *
 *   - validateRequest: every field's accept/reject paths
 *   - recommendPIVoice: category + severity routing
 *   - buildUserPrompt: prompt structure, word counts, language handling
 *   - the default radio behavior when format is omitted
 *
 * To make the helpers testable, this test file imports them directly.
 * They're not exported in the production route since they're internal,
 * but we can import the whole module and call them via the test surface
 * we expose by re-exporting from a sibling testable.ts file.
 *
 * Pragmatic approach: since this is a single-file route, we duplicate
 * the helpers here as imports of named exports. To enable that we'll
 * add the named exports to the route file.
 */

import {
  validatePIRadioRequest,
  recommendPIVoice,
  buildPIRadioUserPrompt,
} from "./testable";

/* ──────────────────────────────────────────────────────────────────────── */
/* validateRequest                                                          */
/* ──────────────────────────────────────────────────────────────────────── */

function baseRequest() {
  return {
    pi_category: "car_accident" as const,
    market_display_name: "Birmingham",
    state: "AL",
    firm_name: "Smith & Jones LLP",
    duration: "30s" as const,
  };
}

test("validate accepts a minimal valid request", () => {
  const errors = validatePIRadioRequest(baseRequest());
  expect(errors).toEqual([]);
});

test("validate rejects unknown PI category", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errors = validatePIRadioRequest({
    ...baseRequest(),
    pi_category: "hovercraft_accident" as any,
  });
  expect(errors.length).toBeGreaterThan(0);
  expect(errors[0]).toContain("hovercraft_accident");
});

test("validate rejects missing pi_category", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errors = validatePIRadioRequest({
    ...baseRequest(),
    pi_category: undefined as any,
  });
  expect(errors[0]).toContain("pi_category");
});

test("validate rejects empty market_display_name", () => {
  const errors = validatePIRadioRequest({ ...baseRequest(), market_display_name: "  " });
  expect(errors[0]).toContain("market_display_name");
});

test("validate rejects lowercase state", () => {
  const errors = validatePIRadioRequest({ ...baseRequest(), state: "al" });
  expect(errors[0]).toContain("state");
});

test("validate rejects missing firm_name", () => {
  const errors = validatePIRadioRequest({ ...baseRequest(), firm_name: "" });
  expect(errors[0]).toContain("firm_name");
});

test("validate rejects bad duration", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errors = validatePIRadioRequest({ ...baseRequest(), duration: "45s" as any });
  expect(errors[0]).toContain("duration");
});

test("validate rejects bad format", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errors = validatePIRadioRequest({ ...baseRequest(), format: "tiktok" as any });
  expect(errors[0]).toContain("format");
});

test("validate rejects bad language", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errors = validatePIRadioRequest({ ...baseRequest(), language: "fr" as any });
  expect(errors[0]).toContain("language");
});

test("validate accepts severity = ['fatal']", () => {
  const errors = validatePIRadioRequest({
    ...baseRequest(),
    severity_modifiers: ["fatal"],
  });
  expect(errors).toEqual([]);
});

test("validate accepts severity = ['catastrophic']", () => {
  const errors = validatePIRadioRequest({
    ...baseRequest(),
    severity_modifiers: ["catastrophic"],
  });
  expect(errors).toEqual([]);
});

test("validate rejects multiple severity modifiers (mutually exclusive in v1)", () => {
  const errors = validatePIRadioRequest({
    ...baseRequest(),
    severity_modifiers: ["fatal", "catastrophic"],
  });
  expect(errors.some((e) => e.includes("at most one"))).toBe(true);
});

test("validate rejects unknown severity value", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errors = validatePIRadioRequest({
    ...baseRequest(),
    severity_modifiers: ["minor" as any],
  });
  expect(errors[0]).toContain("minor");
});

/* ──────────────────────────────────────────────────────────────────────── */
/* recommendPIVoice                                                          */
/* ──────────────────────────────────────────────────────────────────────── */

test("voice: fatal severity always returns grave male voice", () => {
  const v = recommendPIVoice("car_accident", ["fatal"]);
  expect(v.gender).toBe("male");
  expect(v.style).toContain("grave");
});

test("voice: catastrophic severity returns measured male voice regardless of category", () => {
  const v = recommendPIVoice("dog_bite", ["catastrophic"]);
  expect(v.gender).toBe("male");
  expect(v.style).toContain("measured");
});

test("voice: pedestrian non-severe goes warm female", () => {
  const v = recommendPIVoice("pedestrian_accident", []);
  expect(v.gender).toBe("female");
  expect(v.style).toContain("warm");
});

test("voice: bicycle non-severe goes warm female", () => {
  const v = recommendPIVoice("bicycle_accident", []);
  expect(v.gender).toBe("female");
});

test("voice: dog_bite non-severe goes confident female", () => {
  const v = recommendPIVoice("dog_bite", []);
  expect(v.gender).toBe("female");
});

test("voice: truck non-severe goes authoritative male", () => {
  const v = recommendPIVoice("truck_accident", []);
  expect(v.gender).toBe("male");
  expect(v.style).toContain("authoritative");
});

test("voice: motorcycle non-severe goes direct male", () => {
  const v = recommendPIVoice("motorcycle_accident", []);
  expect(v.gender).toBe("male");
  expect(v.style).toContain("direct");
});

test("voice: car_accident default goes balanced male", () => {
  const v = recommendPIVoice("car_accident", []);
  expect(v.gender).toBe("male");
  expect(v.style).toContain("authoritative");
});

/* ──────────────────────────────────────────────────────────────────────── */
/* buildUserPrompt                                                           */
/* ──────────────────────────────────────────────────────────────────────── */

const sampleTemplate = {
  category: "car_accident" as const,
  displayName: "Car Accident",
  hook: "Hit by a distracted driver?",
  problem: "Insurance adjusters lowball victims in Birmingham every day.",
  authority: "Smith & Jones has tried dozens of jury cases in Alabama.",
  cta: "Call Smith & Jones today for a free consultation.",
  baseDisclaimer: "Attorney advertising. Prior results do not guarantee future outcomes.",
};

test("buildUserPrompt includes spot length and word count", () => {
  const prompt = buildPIRadioUserPrompt(
    {
      ...baseRequest(),
      duration: "30s",
    },
    sampleTemplate,
  );
  expect(prompt).toContain("30s");
  expect(prompt).toContain("75-80 words"); // radio default for 30s
});

test("buildUserPrompt switches word count for podcast format", () => {
  const prompt = buildPIRadioUserPrompt(
    { ...baseRequest(), duration: "30s", format: "podcast" },
    sampleTemplate,
  );
  expect(prompt).toContain("85-95 words"); // podcast 30s
});

test("buildUserPrompt declares Spanish when language=es", () => {
  const prompt = buildPIRadioUserPrompt(
    { ...baseRequest(), language: "es" },
    sampleTemplate,
  );
  expect(prompt).toContain("Spanish");
});

test("buildUserPrompt declares English when language is omitted", () => {
  const prompt = buildPIRadioUserPrompt(baseRequest(), sampleTemplate);
  expect(prompt).toContain("English");
});

test("buildUserPrompt embeds the template's hook, problem, authority, CTA, disclaimer", () => {
  const prompt = buildPIRadioUserPrompt(baseRequest(), sampleTemplate);
  expect(prompt).toContain(sampleTemplate.hook);
  expect(prompt).toContain(sampleTemplate.problem);
  expect(prompt).toContain(sampleTemplate.authority);
  expect(prompt).toContain(sampleTemplate.cta);
  expect(prompt).toContain(sampleTemplate.baseDisclaimer);
});

test("buildUserPrompt uses provided firm + market + state", () => {
  const prompt = buildPIRadioUserPrompt(baseRequest(), sampleTemplate);
  expect(prompt).toContain("Smith & Jones LLP");
  expect(prompt).toContain("Birmingham");
  expect(prompt).toContain("AL");
});
