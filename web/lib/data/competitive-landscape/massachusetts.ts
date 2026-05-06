import type { CompetitiveLandscapeData } from "./types";

/**
 * Massachusetts competitive landscape — placeholder advertisers per metro.
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

export const massachusettsCompetitiveData: CompetitiveLandscapeData = {
  state: "Massachusetts",
  markets: ["Boston", "Worcester", "Springfield", "Lowell", "New Bedford"],
  practiceAreas: ["PI / General"],
  data: {
    "Boston": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Worcester": [
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
    "Lowell": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "New Bedford": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
  },
  dataMonth: "May 2026",
  totalAdvertisers: {
    "Boston": 5,
    "Worcester": 5,
    "Springfield": 5,
    "Lowell": 5,
    "New Bedford": 5,
  },
};
