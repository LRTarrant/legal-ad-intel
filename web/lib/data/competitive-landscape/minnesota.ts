import type { CompetitiveLandscapeData } from "./types";

/**
 * Minnesota competitive landscape — placeholder advertisers per metro.
 * Metric values are zero placeholders; populated by the standard ad-data pipeline.
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

export const minnesotaCompetitiveData: CompetitiveLandscapeData = {
  state: "Minnesota",
  markets: ["Minneapolis", "Saint Paul", "Rochester", "Duluth", "Saint Cloud"],
  practiceAreas: ["PI / General"],
  data: {
    "Minneapolis": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Saint Paul": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Rochester": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Duluth": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Saint Cloud": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
  },
  dataMonth: "May 2026",
  totalAdvertisers: {
    "Minneapolis": 5,
    "Saint Paul": 5,
    "Rochester": 5,
    "Duluth": 5,
    "Saint Cloud": 5,
  },
};
