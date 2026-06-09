import type { CompetitiveLandscapeData } from "./types";

/**
 * Wyoming competitive landscape — placeholder advertisers per in-state DMA.
 * Metric values are zero placeholders; real advertiser data is populated by the
 * standard ad-data pipeline (ad_intel_daily / advertiser_rematch_daily).
 * Wyoming is split across several DMAs: the two in-state markets below plus
 * edges that fall into Denver, Salt Lake City, and Billings.
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

export const wyomingCompetitiveData: CompetitiveLandscapeData = {
  state: "Wyoming",
  markets: ["Casper-Riverton", "Cheyenne-Scottsbluff"],
  practiceAreas: ["PI / General"],
  data: {
    "Casper-Riverton": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Cheyenne-Scottsbluff": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
  },
  dataMonth: "June 2026",
  totalAdvertisers: {
    "Casper-Riverton": 5,
    "Cheyenne-Scottsbluff": 5,
  },
};
