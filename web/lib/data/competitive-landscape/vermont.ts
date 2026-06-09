import type { CompetitiveLandscapeData } from "./types";

/**
 * Vermont competitive landscape — placeholder advertisers per metro.
 * Metric values are zero placeholders; populated by the standard ad-data pipeline.
 * Vermont is effectively a single-DMA state (most of it sits in the
 * Burlington-Plattsburgh DMA, shared with northern New York).
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

export const vermontCompetitiveData: CompetitiveLandscapeData = {
  state: "Vermont",
  markets: ["Burlington-Plattsburgh"],
  practiceAreas: ["PI / General"],
  data: {
    "Burlington-Plattsburgh": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
  },
  dataMonth: "June 2026",
  totalAdvertisers: {
    "Burlington-Plattsburgh": 5,
  },
};
