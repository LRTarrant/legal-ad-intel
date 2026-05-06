import type { CompetitiveLandscapeData } from "./types";

/**
 * Colorado competitive landscape — placeholder advertisers per metro.
 * Metric values are zero placeholders; populated by the standard ad-data pipeline.
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

export const coloradoCompetitiveData: CompetitiveLandscapeData = {
  state: "Colorado",
  markets: ["Denver", "Colorado Springs", "Aurora", "Fort Collins", "Boulder"],
  practiceAreas: ["PI / General"],
  data: {
    "Denver": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Colorado Springs": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Aurora": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Fort Collins": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Boulder": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
  },
  dataMonth: "May 2026",
  totalAdvertisers: {
    "Denver": 5,
    "Colorado Springs": 5,
    "Aurora": 5,
    "Fort Collins": 5,
    "Boulder": 5,
  },
};
