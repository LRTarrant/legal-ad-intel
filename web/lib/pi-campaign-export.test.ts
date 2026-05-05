/**
 * Unit tests for lib/pi-campaign-export.ts.
 *
 * Coverage:
 *   - escapeCsv: standard cells, comma quoting, double-quote escaping
 *   - buildCampaignName: format + month padding + comma escape in market
 *   - humanCategory: every PICategory has a friendly label
 *   - buildMetaGeoTargets: state code wrap
 *   - buildGoogleGeoTargets: with geo report (metros + counties + dedup),
 *     without geo report (state fallback), cap at maxLocations
 *   - generateMetaCsv: header row, paused statuses, defaults to landing
 *     placeholder when no final_url, includes ad row when metaAd present,
 *     headers-only when metaAd missing
 *   - generateGoogleCsv: campaign + ad-group + locations + RSA + video
 *     placeholder rows; full 15 headlines + 4 descriptions; empty video
 *     row when videoUrl missing
 *   - buildReadme: warnings when inputs missing, video note when video
 *     URL present
 */

import {
  buildCampaignName,
  buildGoogleGeoTargets,
  buildMetaGeoTargets,
  buildReadme,
  escapeCsv,
  generateGoogleCsv,
  generateMetaCsv,
  GOOGLE_HEADERS,
  humanCategory,
  META_HEADERS,
  PIExportInputs,
} from "./pi-campaign-export";
import type { PIMetaAdResponse } from "@/app/api/campaigns/generate-pi-meta-ad/testable";
import type { PIGoogleRSAResponse } from "@/app/api/campaigns/generate-pi-google-rsa/testable";
import type {
  GeoTargetCountyRow,
  GeoTargetingReport,
  GeoTargetMetroRow,
} from "@/app/api/pi/geo-targeting/testable";

/* ── Fixtures ──────────────────────────────────────────────────────────── */

function metaAdFixture(): PIMetaAdResponse {
  return {
    primary_text:
      "Hurt in a wreck on I-65? Our Birmingham injury team is ready to fight.",
    headline: "Free Case Review",
    description: "No fee unless we win.",
    cta_label: "Learn More",
    image_prompt: "...",
    rationale: "...",
  };
}

function googleRsaFixture(): PIGoogleRSAResponse {
  return {
    headlines: Array.from({ length: 15 }, (_, i) => `Headline ${i + 1}`),
    descriptions: Array.from(
      { length: 4 },
      (_, i) => `Description ${i + 1}.`,
    ),
    path1: "Personal-Injury",
    path2: "Birmingham",
    rationale: "...",
  };
}

function metroRow(
  cbsa_title: string,
  fatal_crashes: number,
  priority: "high" | "medium" | "low" = "high",
): GeoTargetMetroRow {
  return {
    rank: 1,
    cbsa_code: cbsa_title.replace(/\s+/g, "_"),
    cbsa_title,
    state_abbr: "AL",
    fatal_crashes,
    county_count: 1,
    county_preview: "Jefferson",
    priority,
  };
}

function countyRow(
  county_name: string,
  fatal_crashes: number,
  cbsa_title: string | null,
  priority: "high" | "medium" | "low" = "high",
): GeoTargetCountyRow {
  return {
    rank: 1,
    county_name,
    fips_full: "01073",
    state_abbr: "AL",
    fatal_crashes,
    motorcycle_share: 0.07,
    truck_share: 0.18,
    drunk_share: 0.31,
    rural_share: 0.4,
    cbsa_code: cbsa_title ? cbsa_title.replace(/\s+/g, "_") : null,
    cbsa_title,
    priority,
  };
}

function geoReportFixture(): GeoTargetingReport {
  return {
    state_abbr: "AL",
    state_name: "Alabama",
    pi_category: "car_accident",
    lookback_label: "2018-2022",
    lookback_years: 5,
    source: "FARS + county_msa_crosswalk",
    state_total_fatal_crashes: 4500,
    counties: [
      countyRow("Jefferson", 480, "Birmingham-Hoover, AL", "high"),
      countyRow("Mobile", 310, "Mobile, AL", "high"),
      countyRow("Walker", 90, null, "medium"), // rural / no CBSA
    ],
    metros: [
      metroRow("Birmingham-Hoover, AL", 480, "high"),
      metroRow("Mobile, AL", 310, "high"),
    ],
  };
}

const BASE_INPUTS: PIExportInputs = {
  firm_name: "Tarrant Law",
  pi_category: "car_accident",
  state: "AL",
  market_display_name: "Birmingham, AL",
  final_url: "https://tarrantlaw.com/pi/birmingham",
  metaAd: metaAdFixture(),
  metaImageUrl: "https://example.supabase.co/img/abc.png",
  googleRsa: googleRsaFixture(),
  videoUrl: "https://example.supabase.co/video/xyz.mp4",
  geoReport: geoReportFixture(),
};

const FIXED_NOW = new Date("2026-05-15T00:00:00Z");

/* ── escapeCsv ─────────────────────────────────────────────────────────── */

test("escapeCsv: plain string passes through", () => {
  expect(escapeCsv("hello")).toBe("hello");
});

test("escapeCsv: comma triggers quoting", () => {
  expect(escapeCsv("Birmingham, AL")).toBe('"Birmingham, AL"');
});

test("escapeCsv: embedded double-quote is doubled per RFC 4180", () => {
  expect(escapeCsv('Robert "Bobby" Smith')).toBe('"Robert ""Bobby"" Smith"');
});

test("escapeCsv: null/undefined become empty", () => {
  expect(escapeCsv(null)).toBe("");
  expect(escapeCsv(undefined)).toBe("");
});

test("escapeCsv: numbers stringify", () => {
  expect(escapeCsv(42)).toBe("42");
});

test("escapeCsv: newline triggers quoting", () => {
  expect(escapeCsv("line1\nline2")).toBe('"line1\nline2"');
});

/* ── buildCampaignName ─────────────────────────────────────────────────── */

test("buildCampaignName: includes firm, market, category, channel, year-month", () => {
  const name = buildCampaignName(BASE_INPUTS, "Meta", FIXED_NOW);
  expect(name).toBe(
    "LMI - Tarrant Law - Birmingham / AL - Car Accident - Social - 2026-05",
  );
});

test("buildCampaignName: pads single-digit month with zero", () => {
  const name = buildCampaignName(
    BASE_INPUTS,
    "Google",
    new Date("2026-03-01T00:00:00Z"),
  );
  expect(name).toContain("- 2026-03");
});

test("buildCampaignName: replaces commas in market with ' /'", () => {
  // Comma in the market name would otherwise break Meta's UI display
  const name = buildCampaignName(BASE_INPUTS, "Google", FIXED_NOW);
  expect(name).toContain("Birmingham / AL");
  expect(name).not.toContain(",");
});

/* ── humanCategory ─────────────────────────────────────────────────────── */

test("humanCategory: covers every PI category", () => {
  for (const c of [
    "car_accident",
    "truck_accident",
    "motorcycle_accident",
    "boating_accident",
    "slip_and_fall",
    "dog_bite",
    "premises_liability",
    "pedestrian_accident",
    "bicycle_accident",
  ] as const) {
    expect(humanCategory(c).length).toBeGreaterThan(0);
    // Should NOT be the snake_case original
    expect(humanCategory(c)).not.toBe(c);
  }
});

/* ── buildMetaGeoTargets ───────────────────────────────────────────────── */

test("buildMetaGeoTargets: wraps state with US: prefix", () => {
  expect(buildMetaGeoTargets(BASE_INPUTS)).toBe("US:AL");
});

/* ── buildGoogleGeoTargets ─────────────────────────────────────────────── */

test("buildGoogleGeoTargets: emits metros first, then high-priority uncovered counties", () => {
  const out = buildGoogleGeoTargets(BASE_INPUTS);
  expect(out[0]).toBe("Birmingham-Hoover, AL");
  expect(out[1]).toBe("Mobile, AL");
  // Walker County is medium-priority + has no CBSA — should not be added
  // unless we ran out of high-priority entries (we didn't here).
  expect(out.some((s) => s.includes("Walker"))).toBe(false);
});

test("buildGoogleGeoTargets: dedups counties already covered by listed metros", () => {
  // Add a county whose CBSA matches one we already listed
  const inputs = {
    ...BASE_INPUTS,
    geoReport: {
      ...geoReportFixture(),
      counties: [
        // Same metro as the first listed metro — should be excluded
        countyRow("Jefferson", 480, "Birmingham-Hoover, AL", "high"),
        // Different metro — would be included if not also a metro entry
        countyRow("Madison", 200, "Huntsville, AL", "high"),
      ],
    },
  };
  const out = buildGoogleGeoTargets(inputs);
  // Birmingham-Hoover is in metros; Jefferson should be skipped
  expect(out).toContain("Birmingham-Hoover, AL");
  expect(out.some((s) => s.startsWith("Jefferson"))).toBe(false);
  // Madison is in a different metro not in the metros list — included
  expect(out.some((s) => s.startsWith("Madison"))).toBe(true);
});

test("buildGoogleGeoTargets: falls back to state when no geo report", () => {
  const inputs = { ...BASE_INPUTS, geoReport: null };
  const out = buildGoogleGeoTargets(inputs);
  expect(out).toEqual(["AL, United States"]);
});

test("buildGoogleGeoTargets: caps at maxLocations", () => {
  // Create a geo report with many high-priority metros
  const manyMetros: GeoTargetMetroRow[] = Array.from({ length: 20 }, (_, i) =>
    metroRow(`Metro${i}`, 100 - i, "high"),
  );
  const inputs = {
    ...BASE_INPUTS,
    geoReport: {
      ...geoReportFixture(),
      metros: manyMetros,
      counties: [],
    },
  };
  const out = buildGoogleGeoTargets(inputs, 5);
  expect(out.length).toBe(5);
});

/* ── generateMetaCsv ───────────────────────────────────────────────────── */

test("generateMetaCsv: starts with header row", () => {
  const csv = generateMetaCsv(BASE_INPUTS, FIXED_NOW);
  const firstLine = csv.split("\n")[0];
  // Headers should appear in order; first header is "Campaign Name"
  expect(firstLine.startsWith("Campaign Name")).toBe(true);
  // Spot-check a few headers
  expect(firstLine).toContain("Primary Text (Body)");
  expect(firstLine).toContain("Image URL");
});

test("generateMetaCsv: emits one ad row when metaAd is present", () => {
  const csv = generateMetaCsv(BASE_INPUTS, FIXED_NOW);
  const lines = csv.split("\n");
  // 1 header + 1 ad row
  expect(lines.length).toBe(2);
  // Ad row should contain the headline + paused status
  expect(lines[1]).toContain("Free Case Review");
  expect(lines[1]).toContain("PAUSED");
});

test("generateMetaCsv: header-only when metaAd is null", () => {
  const inputs = { ...BASE_INPUTS, metaAd: null };
  const csv = generateMetaCsv(inputs, FIXED_NOW);
  const lines = csv.split("\n");
  expect(lines.length).toBe(1); // just the header
});

test("generateMetaCsv: maps cta_label to Meta enum", () => {
  const csv = generateMetaCsv(BASE_INPUTS, FIXED_NOW);
  // 'Learn More' (in PIMetaAdResponse) -> 'LEARN_MORE' (Meta enum)
  expect(csv).toContain("LEARN_MORE");
  expect(csv).not.toContain(",Learn More,");
});

test("generateMetaCsv: passes final_url through", () => {
  const csv = generateMetaCsv(BASE_INPUTS, FIXED_NOW);
  expect(csv).toContain("https://tarrantlaw.com/pi/birmingham");
});

test("generateMetaCsv: uses landing-page placeholder when final_url is null", () => {
  const inputs = { ...BASE_INPUTS, final_url: null };
  const csv = generateMetaCsv(inputs, FIXED_NOW);
  expect(csv).toContain("{{LANDING_PAGE_URL}}");
});

/* ── generateGoogleCsv ─────────────────────────────────────────────────── */

test("generateGoogleCsv: starts with full header row", () => {
  const csv = generateGoogleCsv(BASE_INPUTS, FIXED_NOW);
  const firstLine = csv.split("\n")[0];
  // Spot-check: headers cover all 15 RSA headline columns
  expect(firstLine).toContain("Headline 1");
  expect(firstLine).toContain("Headline 15");
  expect(firstLine).toContain("Description 4");
  // Header count must match the exported constant
  expect(firstLine.split(",").length).toBe(GOOGLE_HEADERS.length);
});

test("generateGoogleCsv: emits campaign, ad-group, locations, RSA, video rows", () => {
  const csv = generateGoogleCsv(BASE_INPUTS, FIXED_NOW);
  const lines = csv.split("\n");
  // 1 header + 1 campaign + 1 ad-group + 2 locations (high-priority metros)
  // + 1 RSA + 1 video = 7 rows
  expect(lines.length).toBe(7);
  // Spot-check that each row carries the campaign name
  for (let i = 1; i < lines.length; i++) {
    expect(lines[i].includes("LMI - Tarrant Law")).toBe(true);
  }
});

test("generateGoogleCsv: RSA row has all 15 headlines + 4 descriptions", () => {
  const csv = generateGoogleCsv(BASE_INPUTS, FIXED_NOW);
  for (let i = 1; i <= 15; i++) {
    expect(csv).toContain(`Headline ${i}`);
  }
  for (let i = 1; i <= 4; i++) {
    expect(csv).toContain(`Description ${i}.`);
  }
});

test("generateGoogleCsv: video row appears only when videoUrl set", () => {
  const inputs = { ...BASE_INPUTS, videoUrl: null };
  const csv = generateGoogleCsv(inputs, FIXED_NOW);
  const lines = csv.split("\n");
  // No video row → 6 lines instead of 7
  expect(lines.length).toBe(6);
  expect(csv).not.toContain(".mp4");
});

test("generateGoogleCsv: skips RSA row when googleRsa is null", () => {
  const inputs = { ...BASE_INPUTS, googleRsa: null, videoUrl: null };
  const csv = generateGoogleCsv(inputs, FIXED_NOW);
  // Header + campaign + ad-group + 2 locations = 5 lines, no RSA row
  const lines = csv.split("\n");
  expect(lines.length).toBe(5);
});

test("generateGoogleCsv: location rows match buildGoogleGeoTargets output", () => {
  const csv = generateGoogleCsv(BASE_INPUTS, FIXED_NOW);
  // Both top metros should appear as location rows
  expect(csv).toContain("Birmingham-Hoover, AL");
  expect(csv).toContain("Mobile, AL");
});

/* ── buildReadme ───────────────────────────────────────────────────────── */

test("buildReadme: includes firm, market, category, state", () => {
  const md = buildReadme(BASE_INPUTS);
  expect(md).toContain("Tarrant Law");
  expect(md).toContain("Birmingham, AL");
  expect(md).toContain("Car Accident");
  expect(md).toContain("AL");
});

test("buildReadme: video note when videoUrl present", () => {
  const md = buildReadme(BASE_INPUTS);
  expect(md).toContain("VIDEO AD NOTE");
  expect(md).toContain("upload the .mp4 to YouTube");
});

test("buildReadme: warns when meta or google missing", () => {
  const md = buildReadme({ ...BASE_INPUTS, metaAd: null, googleRsa: null });
  expect(md).toContain("No Meta ad creative");
  expect(md).toContain("No Google RSA");
});

test("buildReadme: notes geo fallback when no geo report", () => {
  const md = buildReadme({ ...BASE_INPUTS, geoReport: null });
  expect(md).toContain("No geo report");
  expect(md).toContain("/pi-geo-targeting/AL/car_accident");
});
