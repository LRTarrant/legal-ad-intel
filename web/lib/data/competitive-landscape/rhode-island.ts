import type { CompetitiveLandscapeData } from "./types";

/**
 * Rhode Island competitive landscape — placeholder advertisers per metro.
 * Metric values are zero placeholders; populated by the standard ad-data pipeline.
 * Rhode Island sits entirely within the Providence-New Bedford DMA (shared with
 * southeastern Massachusetts), so the state is effectively one media market.
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

export const rhodeIslandCompetitiveData: CompetitiveLandscapeData = {
  state: "Rhode Island",
  markets: ["Providence-New Bedford"],
  practiceAreas: ["PI / General"],
  data: {
    "Providence-New Bedford": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
  },
  dataMonth: "June 2026",
  totalAdvertisers: {
    "Providence-New Bedford": 5,
  },
};
