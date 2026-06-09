import type { CompetitiveLandscapeData } from "./types";

/**
 * Utah competitive landscape — placeholder advertisers per metro.
 * Metric values are zero placeholders; real advertiser data is populated by the
 * standard ad-data pipeline (ad_intel_daily). The five row() entries per market
 * are stubs so the surface renders before the pipeline backfills live firms.
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

export const utahCompetitiveData: CompetitiveLandscapeData = {
  state: "Utah",
  markets: ["Salt Lake City", "Provo-Orem", "Ogden", "St. George"],
  practiceAreas: ["PI / General"],
  data: {
    "Salt Lake City": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Provo-Orem": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Ogden": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "St. George": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
  },
  dataMonth: "June 2026",
  totalAdvertisers: {
    "Salt Lake City": 5,
    "Provo-Orem": 5,
    "Ogden": 5,
    "St. George": 5,
  },
};
