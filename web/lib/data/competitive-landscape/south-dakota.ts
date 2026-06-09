import type { CompetitiveLandscapeData } from "./types";

/**
 * South Dakota competitive landscape — placeholder advertisers per DMA.
 * Metric values are zero placeholders; real advertiser data is populated by
 * the standard ad-data pipeline (ad_intel_daily). The two markets map to South
 * Dakota's two Nielsen DMAs: Sioux Falls(-Mitchell) (eastern SD) and Rapid City
 * (western SD / Black Hills).
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

export const southDakotaCompetitiveData: CompetitiveLandscapeData = {
  state: "South Dakota",
  markets: ["Sioux Falls(-Mitchell)", "Rapid City"],
  practiceAreas: ["PI / General"],
  data: {
    "Sioux Falls(-Mitchell)": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Rapid City": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
  },
  dataMonth: "June 2026",
  totalAdvertisers: {
    "Sioux Falls(-Mitchell)": 5,
    "Rapid City": 5,
  },
};
