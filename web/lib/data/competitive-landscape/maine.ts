import type { CompetitiveLandscapeData } from "./types";

/**
 * Maine competitive landscape — placeholder advertisers per metro.
 * Metric values are zero placeholders; real advertiser data is populated by the
 * standard ad-data pipeline (ad_intel_daily + advertiser_rematch_daily).
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

export const maineCompetitiveData: CompetitiveLandscapeData = {
  state: "Maine",
  markets: ["Portland-Auburn", "Bangor", "Presque Isle"],
  practiceAreas: ["PI / General"],
  data: {
    "Portland-Auburn": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Bangor": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Presque Isle": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
  },
  dataMonth: "June 2026",
  totalAdvertisers: {
    "Portland-Auburn": 5,
    "Bangor": 5,
    "Presque Isle": 5,
  },
};
