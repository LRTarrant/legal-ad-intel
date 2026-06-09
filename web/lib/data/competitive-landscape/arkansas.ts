import type { CompetitiveLandscapeData } from "./types";

/**
 * Arkansas competitive landscape — placeholder advertisers per metro.
 * Metric values are zero placeholders; real advertiser data is populated by the
 * standard ad-data pipeline (ad_intel_daily). Firm names below are placeholders,
 * not real advertisers.
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

export const arkansasCompetitiveData: CompetitiveLandscapeData = {
  state: "Arkansas",
  markets: [
    "Little Rock-Pine Bluff",
    "Northwest Arkansas (Fayetteville-Springdale-Rogers)",
    "Fort Smith",
    "Jonesboro",
  ],
  practiceAreas: ["PI / General"],
  data: {
    "Little Rock-Pine Bluff": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Northwest Arkansas (Fayetteville-Springdale-Rogers)": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Fort Smith": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Jonesboro": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
  },
  dataMonth: "June 2026",
  totalAdvertisers: {
    "Little Rock-Pine Bluff": 5,
    "Northwest Arkansas (Fayetteville-Springdale-Rogers)": 5,
    "Fort Smith": 5,
    "Jonesboro": 5,
  },
};
