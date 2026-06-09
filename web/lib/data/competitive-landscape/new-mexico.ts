import type { CompetitiveLandscapeData } from "./types";

/**
 * New Mexico competitive landscape — placeholder advertisers per metro.
 * Metric values are zero placeholders; real advertiser data is populated by
 * the standard ad-data pipeline (Google/Meta/TikTok/TV/radio ingest).
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

export const newMexicoCompetitiveData: CompetitiveLandscapeData = {
  state: "New Mexico",
  markets: [
    "Albuquerque-Santa Fe",
    "Las Cruces (El Paso DMA)",
    "Farmington",
    "Roswell",
  ],
  practiceAreas: ["PI / General"],
  data: {
    "Albuquerque-Santa Fe": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Las Cruces (El Paso DMA)": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Farmington": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Roswell": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
  },
  dataMonth: "June 2026",
  totalAdvertisers: {
    "Albuquerque-Santa Fe": 5,
    "Las Cruces (El Paso DMA)": 5,
    "Farmington": 5,
    "Roswell": 5,
  },
};
