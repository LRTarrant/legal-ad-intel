import type { CompetitiveLandscapeData } from "./types";

/**
 * Wisconsin competitive landscape — placeholder advertisers per metro.
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

export const wisconsinCompetitiveData: CompetitiveLandscapeData = {
  state: "Wisconsin",
  markets: ["Milwaukee", "Madison", "Green Bay", "Racine", "Appleton"],
  practiceAreas: ["PI / General"],
  data: {
    "Milwaukee": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Madison": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Green Bay": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Racine": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Appleton": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
  },
  dataMonth: "May 2026",
  totalAdvertisers: {
    "Milwaukee": 5,
    "Madison": 5,
    "Green Bay": 5,
    "Racine": 5,
    "Appleton": 5,
  },
};
