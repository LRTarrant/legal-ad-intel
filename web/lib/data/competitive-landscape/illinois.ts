import type { CompetitiveLandscapeData } from "./types";

/**
 * Illinois competitive landscape — placeholder advertisers per metro.
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

export const illinoisCompetitiveData: CompetitiveLandscapeData = {
  state: "Illinois",
  markets: ["Chicago", "Rockford", "Peoria", "Champaign-Urbana", "Springfield"],
  practiceAreas: ["PI / General"],
  data: {
    "Chicago": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Rockford": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Peoria": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Champaign-Urbana": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Springfield": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
  },
  dataMonth: "May 2026",
  totalAdvertisers: {
    "Chicago": 5,
    "Rockford": 5,
    "Peoria": 5,
    "Champaign-Urbana": 5,
    "Springfield": 5,
  },
};
