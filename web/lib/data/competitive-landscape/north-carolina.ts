import type { CompetitiveLandscapeData } from "./types";

/**
 * North Carolina competitive landscape — placeholder advertisers per metro.
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

export const northCarolinaCompetitiveData: CompetitiveLandscapeData = {
  state: "North Carolina",
  markets: ["Charlotte", "Raleigh-Durham", "Greensboro", "Winston-Salem", "Asheville"],
  practiceAreas: ["PI / General"],
  data: {
    "Charlotte": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Raleigh-Durham": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Greensboro": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Winston-Salem": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Asheville": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
  },
  dataMonth: "May 2026",
  totalAdvertisers: {
    "Charlotte": 5,
    "Raleigh-Durham": 5,
    "Greensboro": 5,
    "Winston-Salem": 5,
    "Asheville": 5,
  },
};
