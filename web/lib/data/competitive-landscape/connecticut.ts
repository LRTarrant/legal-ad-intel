import type { CompetitiveLandscapeData } from "./types";

/**
 * Connecticut competitive landscape — placeholder advertisers per metro.
 * Metric values are zero placeholders; real advertiser data is populated by the
 * standard ad-data pipeline (ad_intel_daily). dataMonth reflects the scaffold date.
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

export const connecticutCompetitiveData: CompetitiveLandscapeData = {
  state: "Connecticut",
  markets: [
    "Hartford-New Haven",
    "Stamford-Bridgeport (NY DMA)",
    "Waterbury",
    "New London (Providence DMA)",
  ],
  practiceAreas: ["PI / General"],
  data: {
    "Hartford-New Haven": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Stamford-Bridgeport (NY DMA)": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Waterbury": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "New London (Providence DMA)": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
  },
  dataMonth: "June 2026",
  totalAdvertisers: {
    "Hartford-New Haven": 5,
    "Stamford-Bridgeport (NY DMA)": 5,
    "Waterbury": 5,
    "New London (Providence DMA)": 5,
  },
};
