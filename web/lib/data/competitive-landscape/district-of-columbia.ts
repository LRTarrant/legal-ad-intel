import type { CompetitiveLandscapeData } from "./types";

/**
 * District of Columbia competitive landscape — placeholder advertisers per metro.
 * DC is a single DMA (the Washington, DC market, which also covers Northern
 * Virginia and suburban Maryland). Metric values are zero placeholders;
 * real advertiser data comes from the standard ad-data pipeline.
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

export const districtOfColumbiaCompetitiveData: CompetitiveLandscapeData = {
  state: "District of Columbia",
  markets: ["Washington DC"],
  practiceAreas: ["PI / General"],
  data: {
    "Washington DC": [
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
  },
};
