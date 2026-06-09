import type { CompetitiveLandscapeData } from "./types";

/**
 * Nebraska competitive landscape — placeholder advertisers per metro.
 * Metric values are zero placeholders; real advertiser data is populated by the
 * standard ad-data pipeline (ad_events → advertiser_entities). These rows exist
 * only so the page renders before live data lands.
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

export const nebraskaCompetitiveData: CompetitiveLandscapeData = {
  state: "Nebraska",
  markets: ["Omaha", "Lincoln", "Grand Island-Kearney-Hastings", "North Platte"],
  practiceAreas: ["PI / General"],
  data: {
    "Omaha": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Lincoln": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Grand Island-Kearney-Hastings": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "North Platte": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
  },
  dataMonth: "June 2026",
  totalAdvertisers: {
    "Omaha": 5,
    "Lincoln": 5,
    "Grand Island-Kearney-Hastings": 5,
    "North Platte": 5,
  },
};
