import type { CompetitiveLandscapeData } from "./types";

/**
 * Hawaii competitive landscape — placeholder advertisers per market.
 * Metric values are zero placeholders; real advertiser data is populated by
 * the standard ad-data pipeline (Searchapi.io / Apify ingest into ad_events).
 * Hawaii is a single statewide Nielsen DMA (Honolulu), so these market splits
 * are island-level groupings for planning, not separate metered markets.
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

export const hawaiiCompetitiveData: CompetitiveLandscapeData = {
  state: "Hawaii",
  markets: ["Honolulu (Oahu)", "Maui", "Hawaii Island (Hilo-Kona)", "Kauai"],
  practiceAreas: ["PI / General"],
  data: {
    "Honolulu (Oahu)": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Maui": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Hawaii Island (Hilo-Kona)": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Kauai": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
  },
  dataMonth: "June 2026",
  totalAdvertisers: {
    "Honolulu (Oahu)": 5,
    "Maui": 5,
    "Hawaii Island (Hilo-Kona)": 5,
    "Kauai": 5,
  },
};
