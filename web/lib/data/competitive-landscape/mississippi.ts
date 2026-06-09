import type { CompetitiveLandscapeData } from "./types";

/**
 * Mississippi competitive landscape — placeholder advertisers per metro.
 * Metric values are zero placeholders; real advertiser data is populated by
 * the standard ad-data pipeline (ad_intel_daily) keyed by market.
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

export const mississippiCompetitiveData: CompetitiveLandscapeData = {
  state: "Mississippi",
  markets: ["Jackson", "Hattiesburg-Laurel", "Biloxi-Gulfport", "Columbus-Tupelo-West Point"],
  practiceAreas: ["PI / General"],
  data: {
    "Jackson": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Hattiesburg-Laurel": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Biloxi-Gulfport": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Columbus-Tupelo-West Point": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
  },
  dataMonth: "June 2026",
  totalAdvertisers: {
    "Jackson": 5,
    "Hattiesburg-Laurel": 5,
    "Biloxi-Gulfport": 5,
    "Columbus-Tupelo-West Point": 5,
  },
};
