import type { CompetitiveLandscapeData } from "./types";

/**
 * Delaware competitive landscape — placeholder advertisers per metro.
 * Metric values are zero placeholders; real advertiser data is populated by the
 * standard ad-data pipeline (ad_events → advertiser_entities), not hand-authored.
 *
 * Media note: Delaware has no in-state Nielsen DMA. Northern Delaware
 * (Wilmington) is in the PHILADELPHIA DMA; southern Delaware (Sussex County) is
 * in the SALISBURY, MD DMA. Dover sits between the two. Markets below reflect
 * that split rather than a clean in-state metro list.
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

export const delawareCompetitiveData: CompetitiveLandscapeData = {
  state: "Delaware",
  markets: [
    "Wilmington (Philadelphia DMA)",
    "Dover",
    "Sussex County (Salisbury DMA)",
  ],
  practiceAreas: ["PI / General"],
  data: {
    "Wilmington (Philadelphia DMA)": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Dover": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Sussex County (Salisbury DMA)": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
  },
  dataMonth: "June 2026",
  totalAdvertisers: {
    "Wilmington (Philadelphia DMA)": 5,
    "Dover": 5,
    "Sussex County (Salisbury DMA)": 5,
  },
};
