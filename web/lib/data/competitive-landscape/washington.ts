import type { CompetitiveLandscapeData } from "./types";

/**
 * Washington competitive landscape — placeholder advertisers per metro.
 * Metric values are zero placeholders; real advertiser data is populated by
 * the standard ad-data pipeline (ad_intel_daily / google_ads_daily / etc.).
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

export const washingtonCompetitiveData: CompetitiveLandscapeData = {
  state: "Washington",
  markets: [
    "Seattle-Tacoma",
    "Spokane",
    "Portland OR",
    "Yakima-Tri-Cities",
    "Bellingham",
  ],
  practiceAreas: ["PI / General"],
  data: {
    "Seattle-Tacoma": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Spokane": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Portland OR": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Yakima-Tri-Cities": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Bellingham": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
  },
  dataMonth: "June 2026",
  totalAdvertisers: {
    "Seattle-Tacoma": 5,
    "Spokane": 5,
    "Portland OR": 5,
    "Yakima-Tri-Cities": 5,
    "Bellingham": 5,
  },
};
