/**
 * Unit tests for pi/geo-targeting/testable.ts.
 *
 * Coverage:
 *   - validateGeoTargetingQuery: state format, supported PI categories
 *   - buildFipsFull: zero-padding, null handling, unknown county sentinel
 *   - aggregateCounties: bucket by FIPS, sum crashes, share metrics,
 *     CBSA join, priority bucketing across small/medium/large lists
 *   - aggregateMetros: roll-up only of CBSA-mapped counties, sort order
 *   - reportToCsv: structure, CSV escaping, both sections present
 */

import {
  aggregateCounties,
  aggregateMetros,
  buildFipsFull,
  CrosswalkRowMin,
  FarsRowMin,
  GeoTargetingReport,
  reportToCsv,
  validateGeoTargetingQuery,
} from "./testable";

/* ── validateGeoTargetingQuery ─────────────────────────────────────────── */

test("validateGeoTargetingQuery accepts a clean query", () => {
  expect(
    validateGeoTargetingQuery({ state: "AL", pi_category: "car_accident" }),
  ).toEqual([]);
});

test("validateGeoTargetingQuery rejects missing state", () => {
  const errors = validateGeoTargetingQuery({
    state: "",
    pi_category: "car_accident",
  });
  expect(errors.some((e) => e.includes("state"))).toBe(true);
});

test("validateGeoTargetingQuery rejects bad state format", () => {
  expect(
    validateGeoTargetingQuery({ state: "Alabama", pi_category: "car_accident" })
      .length,
  ).toBeGreaterThan(0);
  expect(
    validateGeoTargetingQuery({ state: "al", pi_category: "car_accident" })
      .length,
  ).toBeGreaterThan(0);
});

test("validateGeoTargetingQuery rejects unsupported pi_category", () => {
  const errors = validateGeoTargetingQuery({
    state: "AL",
    pi_category: "dog_bite",
  });
  expect(errors.some((e) => e.includes("pi_category"))).toBe(true);
});

test("validateGeoTargetingQuery accepts every supported motor-vehicle category", () => {
  for (const cat of [
    "car_accident",
    "truck_accident",
    "motorcycle_accident",
    "pedestrian_accident",
    "bicycle_accident",
  ] as const) {
    expect(
      validateGeoTargetingQuery({ state: "AL", pi_category: cat }),
    ).toEqual([]);
  }
});

/* ── buildFipsFull ─────────────────────────────────────────────────────── */

test("buildFipsFull zero-pads state + county", () => {
  expect(buildFipsFull(1, 73)).toBe("01073"); // Jefferson, AL
});

test("buildFipsFull returns null on missing parts", () => {
  expect(buildFipsFull(null, 73)).toBe(null);
  expect(buildFipsFull(1, null)).toBe(null);
  expect(buildFipsFull(null, null)).toBe(null);
});

test("buildFipsFull treats county_fips=0 as unknown", () => {
  expect(buildFipsFull(1, 0)).toBe(null);
});

/* ── aggregateCounties ─────────────────────────────────────────────────── */

function farsRow(overrides: Partial<FarsRowMin> = {}): FarsRowMin {
  return {
    county_name: "Jefferson",
    state_fips: 1,
    county_fips: 73,
    fatalities: 1,
    has_motorcycle: false,
    has_large_truck: false,
    drunk_drivers: 0,
    rur_urb: 2,
    ...overrides,
  };
}

function xwalkRow(overrides: Partial<CrosswalkRowMin> = {}): CrosswalkRowMin {
  return {
    fips_full: "01073",
    state_abbr: "AL",
    county_name: "Jefferson",
    cbsa_code: "13820",
    cbsa_title: "Birmingham-Hoover, AL",
    ...overrides,
  };
}

test("aggregateCounties skips rows with no county_name", () => {
  const rows = [farsRow({ county_name: null }), farsRow({ county_name: "" })];
  const out = aggregateCounties(rows, [], "AL");
  expect(out.length).toBe(0);
});

test("aggregateCounties sums one row per crash", () => {
  const rows = [farsRow(), farsRow(), farsRow()];
  const out = aggregateCounties(rows, [xwalkRow()], "AL");
  expect(out.length).toBe(1);
  expect(out[0].fatal_crashes).toBe(3);
  expect(out[0].county_name).toBe("Jefferson");
  expect(out[0].cbsa_title).toBe("Birmingham-Hoover, AL");
});

test("aggregateCounties computes share metrics", () => {
  // 4 rows: 2 motorcycle, 1 truck, 3 drunk, 1 rural
  const rows = [
    farsRow({ has_motorcycle: true, drunk_drivers: 1 }),
    farsRow({ has_motorcycle: true, drunk_drivers: 1 }),
    farsRow({ has_large_truck: true, drunk_drivers: 1 }),
    farsRow({ rur_urb: 1 }),
  ];
  const out = aggregateCounties(rows, [xwalkRow()], "AL");
  expect(out[0].motorcycle_share).toBe(0.5);
  expect(out[0].truck_share).toBe(0.25);
  expect(out[0].drunk_share).toBe(0.75);
  expect(out[0].rural_share).toBe(0.25);
});

test("aggregateCounties sorts by crashes DESC, then alpha", () => {
  const rows = [
    farsRow({ county_name: "Mobile", county_fips: 97 }),
    farsRow({ county_name: "Mobile", county_fips: 97 }),
    farsRow({ county_name: "Jefferson", county_fips: 73 }),
    farsRow({ county_name: "Jefferson", county_fips: 73 }),
    farsRow({ county_name: "Jefferson", county_fips: 73 }),
    farsRow({ county_name: "Baldwin", county_fips: 3 }),
  ];
  const out = aggregateCounties(rows, [], "AL");
  expect(out[0].county_name).toBe("Jefferson"); // 3 crashes
  expect(out[1].county_name).toBe("Mobile"); // 2 crashes
  expect(out[2].county_name).toBe("Baldwin"); // 1 crash
});

test("aggregateCounties priority: top25 = high, top50 = medium, rest = low", () => {
  // 8 counties so quartiles are clean.
  const rows: FarsRowMin[] = [];
  for (let i = 0; i < 8; i++) {
    // i=0 most crashes, i=7 fewest
    const crashes = 8 - i;
    for (let j = 0; j < crashes; j++) {
      rows.push(
        farsRow({
          county_name: `County${String.fromCharCode(65 + i)}`, // A-H
          county_fips: i + 1,
        }),
      );
    }
  }
  const out = aggregateCounties(rows, [], "AL");
  expect(out.length).toBe(8);
  // top 25% = 2 counties (high)
  expect(out[0].priority).toBe("high");
  expect(out[1].priority).toBe("high");
  // 25-50% = next 2 counties (medium)
  expect(out[2].priority).toBe("medium");
  expect(out[3].priority).toBe("medium");
  // bottom 50% = low
  expect(out[4].priority).toBe("low");
  expect(out[7].priority).toBe("low");
});

test("aggregateCounties small lists (<=3) all get 'high' priority", () => {
  const rows = [
    farsRow({ county_name: "A", county_fips: 1 }),
    farsRow({ county_name: "B", county_fips: 2 }),
  ];
  const out = aggregateCounties(rows, [], "AL");
  expect(out.every((c) => c.priority === "high")).toBe(true);
});

test("aggregateCounties keys on FIPS so name spelling variants merge", () => {
  // Same FIPS, different spelling — should merge to one bucket.
  const rows = [
    farsRow({ county_name: "DeKalb", county_fips: 49 }),
    farsRow({ county_name: "De Kalb", county_fips: 49 }),
  ];
  const out = aggregateCounties(rows, [], "AL");
  expect(out.length).toBe(1);
  expect(out[0].fatal_crashes).toBe(2);
});

/* ── aggregateMetros ───────────────────────────────────────────────────── */

test("aggregateMetros excludes counties with no CBSA", () => {
  const counties = [
    {
      rank: 1,
      county_name: "Jefferson",
      fips_full: "01073",
      state_abbr: "AL",
      fatal_crashes: 100,
      motorcycle_share: 0,
      truck_share: 0,
      drunk_share: 0,
      rural_share: 0,
      cbsa_code: "13820",
      cbsa_title: "Birmingham-Hoover, AL",
      priority: "high" as const,
    },
    {
      rank: 2,
      county_name: "RuralCounty",
      fips_full: "01999",
      state_abbr: "AL",
      fatal_crashes: 30,
      motorcycle_share: 0,
      truck_share: 0,
      drunk_share: 0,
      rural_share: 1,
      cbsa_code: null,
      cbsa_title: null,
      priority: "medium" as const,
    },
  ];
  const out = aggregateMetros(counties, "AL");
  expect(out.length).toBe(1);
  expect(out[0].cbsa_title).toBe("Birmingham-Hoover, AL");
  expect(out[0].fatal_crashes).toBe(100);
});

test("aggregateMetros sums counties within the same CBSA", () => {
  const counties = [
    {
      rank: 1,
      county_name: "Jefferson",
      fips_full: "01073",
      state_abbr: "AL",
      fatal_crashes: 100,
      motorcycle_share: 0,
      truck_share: 0,
      drunk_share: 0,
      rural_share: 0,
      cbsa_code: "13820",
      cbsa_title: "Birmingham-Hoover, AL",
      priority: "high" as const,
    },
    {
      rank: 2,
      county_name: "Shelby",
      fips_full: "01117",
      state_abbr: "AL",
      fatal_crashes: 40,
      motorcycle_share: 0,
      truck_share: 0,
      drunk_share: 0,
      rural_share: 0,
      cbsa_code: "13820",
      cbsa_title: "Birmingham-Hoover, AL",
      priority: "high" as const,
    },
  ];
  const out = aggregateMetros(counties, "AL");
  expect(out.length).toBe(1);
  expect(out[0].fatal_crashes).toBe(140);
  expect(out[0].county_count).toBe(2);
  expect(out[0].county_preview).toContain("Jefferson");
  expect(out[0].county_preview).toContain("Shelby");
});

test("aggregateMetros sorts by total crashes DESC", () => {
  const counties = [
    {
      rank: 1,
      county_name: "Mobile",
      fips_full: "01097",
      state_abbr: "AL",
      fatal_crashes: 50,
      motorcycle_share: 0,
      truck_share: 0,
      drunk_share: 0,
      rural_share: 0,
      cbsa_code: "33660",
      cbsa_title: "Mobile, AL",
      priority: "high" as const,
    },
    {
      rank: 2,
      county_name: "Jefferson",
      fips_full: "01073",
      state_abbr: "AL",
      fatal_crashes: 100,
      motorcycle_share: 0,
      truck_share: 0,
      drunk_share: 0,
      rural_share: 0,
      cbsa_code: "13820",
      cbsa_title: "Birmingham-Hoover, AL",
      priority: "high" as const,
    },
  ];
  const out = aggregateMetros(counties, "AL");
  expect(out[0].cbsa_title).toBe("Birmingham-Hoover, AL"); // 100 > 50
  expect(out[1].cbsa_title).toBe("Mobile, AL");
});

/* ── reportToCsv ───────────────────────────────────────────────────────── */

function makeReport(): GeoTargetingReport {
  return {
    state_abbr: "AL",
    state_name: "Alabama",
    pi_category: "car_accident",
    lookback_label: "2018-2022",
    lookback_years: 5,
    source: "FARS + county_msa_crosswalk",
    state_total_fatal_crashes: 4500,
    counties: [
      {
        rank: 1,
        county_name: "Jefferson",
        fips_full: "01073",
        state_abbr: "AL",
        fatal_crashes: 480,
        motorcycle_share: 0.07,
        truck_share: 0.18,
        drunk_share: 0.31,
        rural_share: 0.4,
        cbsa_code: "13820",
        cbsa_title: "Birmingham-Hoover, AL",
        priority: "high",
      },
    ],
    metros: [
      {
        rank: 1,
        cbsa_code: "13820",
        cbsa_title: "Birmingham-Hoover, AL",
        state_abbr: "AL",
        fatal_crashes: 480,
        county_count: 1,
        county_preview: "Jefferson",
        priority: "high",
      },
    ],
  };
}

test("reportToCsv has both COUNTIES and METROS sections", () => {
  const csv = reportToCsv(makeReport());
  expect(csv).toContain("COUNTIES");
  expect(csv).toContain("METROS");
  expect(csv).toContain("Jefferson");
  expect(csv).toContain("Birmingham-Hoover, AL");
});

test("reportToCsv quotes cells containing commas", () => {
  const csv = reportToCsv(makeReport());
  // "Birmingham-Hoover, AL" contains a comma → must be quoted
  expect(csv).toContain('"Birmingham-Hoover, AL"');
});

test("reportToCsv escapes embedded double-quotes per RFC 4180", () => {
  const r = makeReport();
  r.counties[0].county_name = 'Robert "Bobby" County';
  const csv = reportToCsv(r);
  // Embedded " becomes "" and the cell is quoted as a whole
  expect(csv).toContain('"Robert ""Bobby"" County"');
});

test("reportToCsv puts metadata header lines before sections", () => {
  const csv = reportToCsv(makeReport());
  const lines = csv.split("\n");
  // First few lines should be the # comment metadata
  expect(lines[0].startsWith("#")).toBe(true);
  expect(lines[1].startsWith("#")).toBe(true);
});
