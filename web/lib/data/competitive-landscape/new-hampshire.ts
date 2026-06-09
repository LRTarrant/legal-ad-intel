import type { CompetitiveLandscapeData } from "./types";

/**
 * New Hampshire competitive landscape — placeholder advertisers per metro.
 * Metric values are zero placeholders; populated by the standard ad-data pipeline.
 * Real advertiser data is sourced from the ad pipeline (ad_events / advertiser_entities),
 * not hand-authored here. These rows are stubs so the surface renders before the
 * pipeline keys New Hampshire markets.
 *
 * Media note: New Hampshire has NO in-state Nielsen DMA. Most of the state falls
 * in the Boston DMA (Manchester, Nashua, Concord); eastern NH (Portsmouth /
 * Seacoast) falls in the Portland–Auburn, ME DMA. Market labels reflect that.
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

export const newHampshireCompetitiveData: CompetitiveLandscapeData = {
  state: "New Hampshire",
  markets: ["Manchester (Boston DMA)", "Nashua (Boston DMA)", "Concord", "Portsmouth"],
  practiceAreas: ["PI / General"],
  data: {
    "Manchester (Boston DMA)": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Nashua (Boston DMA)": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Concord": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
    "Portsmouth": [row("Top Plaintiff Firm 1"), row("Top Plaintiff Firm 2"), row("Top Plaintiff Firm 3"), row("Top Plaintiff Firm 4"), row("Top Plaintiff Firm 5")],
  },
  dataMonth: "June 2026",
  totalAdvertisers: {
    "Manchester (Boston DMA)": 5,
    "Nashua (Boston DMA)": 5,
    "Concord": 5,
    "Portsmouth": 5,
  },
};
