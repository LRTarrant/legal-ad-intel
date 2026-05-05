/**
 * Unit tests for generate-pi-strategic-brief/testable.ts.
 *
 * Coverage:
 *   - validatePIBriefRequest: required fields, state format, valid PI category
 *   - SIGNALS_BY_CATEGORY: every PICategory has an entry
 *   - buildPIBriefUserPrompt: includes state, signals, blocks-line, market+firm
 *   - stripJSONWrapper: markdown fence handling
 *   - validatePIStrategicBrief: shape, truncation, optional notes,
 *     array truncation when LLM returns too many rows
 */

import {
  buildPIBriefUserPrompt,
  PIBriefRequest,
  PIBriefSignalSet,
  PIStrategicBrief,
  SIGNALS_BY_CATEGORY,
  stripJSONWrapper,
  validatePIBriefRequest,
  validatePIStrategicBrief,
} from "./testable";

const BASE_REQUEST: PIBriefRequest = {
  pi_category: "car_accident",
  state: "AL",
};

function makeSignals(
  overrides: Partial<PIBriefSignalSet> = {},
): PIBriefSignalSet {
  return {
    state_abbr: "AL",
    state_name: "Alabama",
    pi_category: "car_accident",
    motor_vehicle: {
      lookback_years: 5,
      state_total: 4500,
      state_rate_per_100k: 18.4,
      top_counties: [
        {
          county_name: "Jefferson",
          count: 480,
          rate_per_100k: 22.1,
          detail: "I-65 corridor",
        },
        {
          county_name: "Mobile",
          count: 310,
          rate_per_100k: 19.8,
        },
      ],
      motorcycle_share: 0.07,
      truck_share: 0.18,
      rural_share: 0.42,
      drunk_share: 0.31,
      source: "FARS",
    },
    legal_climate: {
      composite_score: 62,
      negligence_rule: "Contributory negligence",
      statute_of_limitations: "2 years",
      non_economic_cap: "None",
      source: "Legal Marketing Intelligence pi_viability_scores",
    },
    ...overrides,
  };
}

/* ── validatePIBriefRequest ────────────────────────────────────────────── */

test("validatePIBriefRequest accepts a clean request", () => {
  expect(validatePIBriefRequest(BASE_REQUEST)).toEqual([]);
});

test("validatePIBriefRequest rejects missing pi_category", () => {
  const errors = validatePIBriefRequest({
    state: "AL",
  } as unknown as PIBriefRequest);
  expect(errors.some((e) => e.includes("pi_category"))).toBe(true);
});

test("validatePIBriefRequest rejects unknown pi_category", () => {
  const errors = validatePIBriefRequest({
    ...BASE_REQUEST,
    pi_category: "made_up" as unknown as PIBriefRequest["pi_category"],
  });
  expect(errors.some((e) => e.includes("pi_category"))).toBe(true);
});

test("validatePIBriefRequest rejects bad state format", () => {
  expect(
    validatePIBriefRequest({ ...BASE_REQUEST, state: "Alabama" }).length,
  ).toBeGreaterThan(0);
  expect(
    validatePIBriefRequest({ ...BASE_REQUEST, state: "al" }).length,
  ).toBeGreaterThan(0);
  expect(
    validatePIBriefRequest({ ...BASE_REQUEST, state: "ALA" }).length,
  ).toBeGreaterThan(0);
});

/* ── SIGNALS_BY_CATEGORY ───────────────────────────────────────────────── */

test("SIGNALS_BY_CATEGORY has an entry for every PI category", () => {
  // If the PICategory union grows, this test will catch it because
  // VALID_PI_CATEGORIES (used inside validatePIBriefRequest) is built
  // from this map's keys.
  const categories: PIBriefRequest["pi_category"][] = [
    "car_accident",
    "truck_accident",
    "motorcycle_accident",
    "boating_accident",
    "slip_and_fall",
    "dog_bite",
    "premises_liability",
    "pedestrian_accident",
    "bicycle_accident",
  ];
  for (const cat of categories) {
    // .toBeDefined() isn't part of the project's minimal assertion shim;
    // use Array.isArray which is also more precise for this contract.
    expect(Array.isArray(SIGNALS_BY_CATEGORY[cat])).toBe(true);
  }
});

/* ── buildPIBriefUserPrompt ────────────────────────────────────────────── */

test("buildPIBriefUserPrompt embeds state name + category", () => {
  const prompt = buildPIBriefUserPrompt(BASE_REQUEST, makeSignals());
  expect(prompt).toContain("Alabama");
  expect(prompt).toContain("car_accident");
  expect(prompt).toContain("AL");
});

test("buildPIBriefUserPrompt includes the JSON signal set verbatim", () => {
  const prompt = buildPIBriefUserPrompt(BASE_REQUEST, makeSignals());
  // A few representative values from the fixture
  expect(prompt).toContain("\"FARS\"");
  expect(prompt).toContain("Jefferson");
  expect(prompt).toContain("Contributory negligence");
});

test("buildPIBriefUserPrompt mentions relevant signal blocks for the category", () => {
  const prompt = buildPIBriefUserPrompt(BASE_REQUEST, makeSignals());
  // car_accident => motor_vehicle, weather
  expect(prompt).toMatch(/motor_vehicle/);
  expect(prompt).toMatch(/weather/);
});

test("buildPIBriefUserPrompt warns about empty signal blocks for dog_bite", () => {
  const prompt = buildPIBriefUserPrompt(
    { ...BASE_REQUEST, pi_category: "dog_bite" },
    makeSignals({ pi_category: "dog_bite", motor_vehicle: undefined }),
  );
  expect(prompt).toMatch(/No category-specific signal blocks/);
});

test("buildPIBriefUserPrompt includes optional firm + market when provided", () => {
  const prompt = buildPIBriefUserPrompt(
    {
      ...BASE_REQUEST,
      firm_name: "Tarrant Law",
      market_display_name: "Birmingham, AL",
    },
    makeSignals(),
  );
  expect(prompt).toContain("Tarrant Law");
  expect(prompt).toContain("Birmingham, AL");
});

test("buildPIBriefUserPrompt omits firm + market lines when not provided", () => {
  const prompt = buildPIBriefUserPrompt(BASE_REQUEST, makeSignals());
  expect(prompt).not.toContain("Firm:");
  expect(prompt).not.toContain("Market focus:");
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

/* ── validatePIStrategicBrief ──────────────────────────────────────────── */

function makeValidLLMResponse(): unknown {
  return {
    why_this_market:
      "Alabama's contributory-negligence rule plus a 2-year SOL means PI volume is concentrated in a few high-corridor counties.",
    top_counties_to_target: [
      {
        county_name: "Jefferson",
        headline: "I-65 corridor density",
        supporting_stat: "480 fatal crashes 2018-2022 (FARS), 22.1 per 100K",
      },
      {
        county_name: "Mobile",
        headline: "Coastal commuter market",
        supporting_stat: "310 fatal crashes (FARS)",
      },
    ],
    risk_factors: [
      {
        label: "Contributory negligence",
        implication:
          "Your screening should be tighter than in comparative-fault states because partial-fault clients won't recover.",
      },
      {
        label: "2-year statute of limitations",
        implication:
          "Outreach windows are tight; faster intake to signed retainer matters more here.",
      },
    ],
    recommended_angles: [
      {
        angle: "Lean into rural-county fatality density",
        supporting_data:
          "42% of fatal crashes in AL are rural (FARS rural_share)",
      },
    ],
    notes: "FARS data lags by ~2 years; latest year is 2022.",
  };
}

test("validatePIStrategicBrief accepts a clean response", () => {
  const result = validatePIStrategicBrief(makeValidLLMResponse());
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.top_counties_to_target.length).toBe(2);
    expect(result.value.risk_factors.length).toBe(2);
    expect(result.value.recommended_angles.length).toBe(1);
    expect(result.value.notes).toMatch(/FARS data lags/);
  }
});

test("validatePIStrategicBrief rejects non-object input", () => {
  expect(validatePIStrategicBrief("nope").ok).toBe(false);
  expect(validatePIStrategicBrief(null).ok).toBe(false);
});

test("validatePIStrategicBrief truncates over-long arrays", () => {
  const tooMany = makeValidLLMResponse() as PIStrategicBrief;
  tooMany.top_counties_to_target = Array.from({ length: 20 }, (_, i) => ({
    county_name: `County${i}`,
    headline: `H${i}`,
    supporting_stat: `S${i}`,
  }));
  tooMany.risk_factors = Array.from({ length: 12 }, (_, i) => ({
    label: `L${i}`,
    implication: `I${i}`,
  }));
  tooMany.recommended_angles = Array.from({ length: 8 }, (_, i) => ({
    angle: `A${i}`,
    supporting_data: `D${i}`,
  }));
  const result = validatePIStrategicBrief(tooMany);
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.top_counties_to_target.length).toBe(5);
    expect(result.value.risk_factors.length).toBe(4);
    expect(result.value.recommended_angles.length).toBe(3);
  }
});

test("validatePIStrategicBrief rejects when why_this_market is missing", () => {
  const broken = makeValidLLMResponse() as Record<string, unknown>;
  delete broken.why_this_market;
  expect(validatePIStrategicBrief(broken).ok).toBe(false);
});

test("validatePIStrategicBrief skips malformed rows in arrays without rejecting", () => {
  const mostlyOk = makeValidLLMResponse() as PIStrategicBrief & {
    top_counties_to_target: unknown[];
  };
  // Inject a bad row in the middle.
  mostlyOk.top_counties_to_target = [
    mostlyOk.top_counties_to_target[0],
    { county_name: "Bad", /* missing fields */ },
    mostlyOk.top_counties_to_target[1],
  ];
  const result = validatePIStrategicBrief(mostlyOk);
  expect(result.ok).toBe(true);
  if (result.ok) {
    // 2 valid rows survive
    expect(result.value.top_counties_to_target.length).toBe(2);
  }
});

test("validatePIStrategicBrief notes is optional", () => {
  const noNotes = makeValidLLMResponse() as Record<string, unknown>;
  delete noNotes.notes;
  const result = validatePIStrategicBrief(noNotes);
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.notes).toBe(undefined);
  }
});
