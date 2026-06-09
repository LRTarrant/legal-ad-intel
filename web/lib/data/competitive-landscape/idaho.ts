import type { CompetitiveLandscapeData } from "./types";

/**
 * Idaho competitive landscape — placeholder advertisers per metro.
 * Metric values are zero placeholders; real advertiser data is populated by
 * the standard ad-data pipeline (ad_events → advertiser_entities). The firm
 * names below are intentional placeholders, NOT real Idaho firms.
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

export const idahoCompetitiveData: CompetitiveLandscapeData = {
  state: "Idaho",
  markets: ["Boise", "Idaho Falls-Pocatello", "Twin Falls", "Spokane (N. Idaho)"],
  practiceAreas: ["PI / General"],
  data: {
    "Boise": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Idaho Falls-Pocatello": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Twin Falls": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Spokane (N. Idaho)": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
  },
  dataMonth: "June 2026",
  totalAdvertisers: {
    "Boise": 5,
    "Idaho Falls-Pocatello": 5,
    "Twin Falls": 5,
    "Spokane (N. Idaho)": 5,
  },
};
