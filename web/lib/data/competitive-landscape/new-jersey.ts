import type { CompetitiveLandscapeData } from "./types";

/**
 * New Jersey competitive landscape — placeholder advertisers per metro.
 * Metric values are zero placeholders; real advertiser data is populated by
 * the standard ad-data pipeline. Top advertisers list will be refined as
 * state data ingests.
 *
 * Markets are grouped by their Nielsen DMA because New Jersey has no in-state
 * DMA: Newark / North Jersey, Jersey City, and Edison / Middlesex sit in the
 * New York DMA; Camden / South Jersey and Atlantic City sit in the
 * Philadelphia DMA. (See new-jersey.ts config marketSaturation prose.)
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
  return {
    advertiser,
    parent: parent ?? advertiser,
    ...ZERO_METRICS,
  };
}

export const newJerseyCompetitiveData: CompetitiveLandscapeData = {
  state: "New Jersey",
  markets: [
    "Newark / North Jersey",
    "Jersey City",
    "Edison / Middlesex",
    "Camden / South Jersey",
    "Atlantic City",
  ],
  practiceAreas: ["PI / General"],
  data: {
    "Newark / North Jersey": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Jersey City": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Edison / Middlesex": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Camden / South Jersey": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Atlantic City": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
  },
  dataMonth: "June 2026",
  totalAdvertisers: {
    "Newark / North Jersey": 5,
    "Jersey City": 5,
    "Edison / Middlesex": 5,
    "Camden / South Jersey": 5,
    "Atlantic City": 5,
  },
};
