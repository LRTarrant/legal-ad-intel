import type { CompetitiveLandscapeData } from "./types";

/**
 * Maryland competitive landscape — placeholder advertisers per metro.
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

export const marylandCompetitiveData: CompetitiveLandscapeData = {
  state: "Maryland",
  markets: ["Baltimore", "Rockville", "Frederick", "Annapolis", "Hagerstown"],
  practiceAreas: ["PI / General"],
  data: {
    "Baltimore": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Rockville": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Frederick": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Annapolis": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Hagerstown": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
  },
  dataMonth: "May 2026",
  totalAdvertisers: {
    "Baltimore": 5,
    "Rockville": 5,
    "Frederick": 5,
    "Annapolis": 5,
    "Hagerstown": 5,
  },
};
