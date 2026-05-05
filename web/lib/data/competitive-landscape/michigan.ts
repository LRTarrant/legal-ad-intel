import type { CompetitiveLandscapeData } from "./types";

/**
 * Michigan competitive landscape — placeholder advertisers per metro.
 * Metric values are zero placeholders; populated by the standard ad-data
 * pipeline. Top advertisers list will be refined as state data ingests.
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

export const michiganCompetitiveData: CompetitiveLandscapeData = {
  state: "Michigan",
  markets: ["Detroit", "Grand Rapids", "Lansing", "Flint", "Ann Arbor"],
  practiceAreas: ["PI / General"],
  data: {
    "Detroit": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Grand Rapids": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Lansing": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Flint": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Ann Arbor": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
  },
  dataMonth: "May 2026",
  totalAdvertisers: {
    "Detroit": 5,
    "Grand Rapids": 5,
    "Lansing": 5,
    "Flint": 5,
    "Ann Arbor": 5,
  },
};
