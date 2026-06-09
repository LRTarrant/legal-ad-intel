import type { CompetitiveLandscapeData } from "./types";

/**
 * Oklahoma competitive landscape — placeholder advertisers per metro.
 * Metric values are zero placeholders; real advertiser data is populated by the
 * standard ad-data pipeline (ad_intel_daily → advertiser_entities). Until that
 * lands for Oklahoma DMAs, these rows are stubs so the page renders the metro
 * scaffold without inventing firm names.
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

export const oklahomaCompetitiveData: CompetitiveLandscapeData = {
  state: "Oklahoma",
  markets: [
    "Oklahoma City",
    "Tulsa",
    "Lawton-Wichita Falls",
    "Sherman-Ada",
  ],
  practiceAreas: ["PI / General"],
  data: {
    "Oklahoma City": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Tulsa": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Lawton-Wichita Falls": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Sherman-Ada": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
  },
  dataMonth: "June 2026",
  totalAdvertisers: {
    "Oklahoma City": 5,
    "Tulsa": 5,
    "Lawton-Wichita Falls": 5,
    "Sherman-Ada": 5,
  },
};
