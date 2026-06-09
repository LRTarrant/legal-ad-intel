import type { CompetitiveLandscapeData } from "./types";

/**
 * Montana competitive landscape — placeholder advertisers per DMA.
 * Metric values are zero placeholders; real advertiser data is populated by the
 * standard ad-data pipeline (ad_events → advertiser_entities). Montana has no
 * single dominant market: it splits across several small in-state DMAs
 * (Billings, Missoula, Great Falls, Butte-Bozeman, Helena).
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

export const montanaCompetitiveData: CompetitiveLandscapeData = {
  state: "Montana",
  markets: ["Billings", "Missoula", "Great Falls", "Butte-Bozeman", "Helena"],
  practiceAreas: ["PI / General"],
  data: {
    "Billings": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Missoula": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Great Falls": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Butte-Bozeman": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Helena": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
  },
  dataMonth: "June 2026",
  totalAdvertisers: {
    "Billings": 5,
    "Missoula": 5,
    "Great Falls": 5,
    "Butte-Bozeman": 5,
    "Helena": 5,
  },
};
