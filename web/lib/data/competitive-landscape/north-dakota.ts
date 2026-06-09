import type { CompetitiveLandscapeData } from "./types";

/**
 * North Dakota competitive landscape — placeholder advertisers per DMA.
 * Metric values are zero placeholders; real advertiser data is populated by the
 * standard ad-data pipeline (ad_events / advertiser_entities). Five placeholder
 * row() firms per market mirror the Colorado stub pattern until the pipeline
 * keys ND markets.
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

export const northDakotaCompetitiveData: CompetitiveLandscapeData = {
  state: "North Dakota",
  markets: ["Fargo", "Minot-Bismarck-Dickinson", "Grand Forks"],
  practiceAreas: ["PI / General"],
  data: {
    "Fargo": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Minot-Bismarck-Dickinson": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Grand Forks": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
  },
  dataMonth: "June 2026",
  totalAdvertisers: {
    "Fargo": 5,
    "Minot-Bismarck-Dickinson": 5,
    "Grand Forks": 5,
  },
};
