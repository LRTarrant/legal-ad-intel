import type { CompetitiveLandscapeData } from "./types";

/**
 * Kansas competitive landscape — placeholder advertisers per metro.
 * Metric values are zero placeholders; real advertiser data is populated by
 * the standard ad-data pipeline (ad_intel_daily). The firm names below are
 * intentionally generic placeholders, NOT real Kansas advertisers.
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

export const kansasCompetitiveData: CompetitiveLandscapeData = {
  state: "Kansas",
  markets: [
    "Wichita-Hutchinson",
    "Kansas City (eastern KS)",
    "Topeka",
    "Joplin-Pittsburg (SE KS)",
  ],
  practiceAreas: ["PI / General"],
  data: {
    "Wichita-Hutchinson": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Kansas City (eastern KS)": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Topeka": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Joplin-Pittsburg (SE KS)": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
  },
  dataMonth: "June 2026",
  totalAdvertisers: {
    "Wichita-Hutchinson": 5,
    "Kansas City (eastern KS)": 5,
    "Topeka": 5,
    "Joplin-Pittsburg (SE KS)": 5,
  },
};
