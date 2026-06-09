import type { CompetitiveLandscapeData } from "./types";

/**
 * Virginia competitive landscape — placeholder advertisers per metro.
 * Metric values are zero placeholders; real advertiser data is populated by
 * the standard ad-data pipeline (see CLAUDE.md §6.2 ad_intel_daily). The
 * markets list below is the real Virginia media-market set; the per-market
 * firm rows are stubs until the pipeline backfills observed advertisers.
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

export const virginiaCompetitiveData: CompetitiveLandscapeData = {
  state: "Virginia",
  markets: [
    "Washington DC",
    "Richmond",
    "Norfolk-Hampton Roads",
    "Roanoke-Lynchburg",
    "Charlottesville",
  ],
  practiceAreas: ["PI / General"],
  data: {
    "Washington DC": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Richmond": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Norfolk-Hampton Roads": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Roanoke-Lynchburg": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Charlottesville": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
  },
  dataMonth: "June 2026",
  totalAdvertisers: {
    "Washington DC": 5,
    "Richmond": 5,
    "Norfolk-Hampton Roads": 5,
    "Roanoke-Lynchburg": 5,
    "Charlottesville": 5,
  },
};
