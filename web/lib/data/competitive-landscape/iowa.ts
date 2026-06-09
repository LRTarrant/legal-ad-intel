import type { CompetitiveLandscapeData } from "./types";

/**
 * Iowa competitive landscape — placeholder advertisers per metro.
 * Metric values are zero placeholders; real advertiser data is populated by the
 * standard ad-data pipeline (ad_intel_daily) keyed by market. The five rows per
 * market are stubs so the page renders before the pipeline backfills Iowa.
 */

const ZERO_METRICS = {
  practiceArea: "PI / General",
  instances: 0,
  outlets: 0,
  tvOutlets: 0,
  radioOutlets: 0,
  nationalMarkets: 0,
  googleAds: false,
  youtube: false,
  meta: false,
  tiktok: false,
} as const;

function row(advertiser: string, parent?: string) {
  return { advertiser, parent: parent ?? advertiser, ...ZERO_METRICS };
}

export const iowaCompetitiveData: CompetitiveLandscapeData = {
  state: "Iowa",
  markets: [
    "Des Moines-Ames",
    "Cedar Rapids-Iowa City-Waterloo-Dubuque",
    "Davenport-Quad Cities (IA-IL)",
    "Sioux City",
  ],
  practiceAreas: ["PI / General"],
  data: {
    "Des Moines-Ames": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Cedar Rapids-Iowa City-Waterloo-Dubuque": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Davenport-Quad Cities (IA-IL)": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Sioux City": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
  },
  dataMonth: "June 2026",
  totalAdvertisers: {
    "Des Moines-Ames": 5,
    "Cedar Rapids-Iowa City-Waterloo-Dubuque": 5,
    "Davenport-Quad Cities (IA-IL)": 5,
    "Sioux City": 5,
  },
};
