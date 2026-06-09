import type { CompetitiveLandscapeData } from "./types";

/**
 * West Virginia competitive landscape — placeholder advertisers per metro.
 * Metric values are zero placeholders; real advertiser data is populated by the
 * standard ad-data pipeline (see CLAUDE.md §6.2 Ad Intel Daily). Markets mirror
 * West Virginia's Nielsen DMA structure. Note: the eastern panhandle falls in the
 * Washington DC DMA and the northern panhandle in the Pittsburgh DMA, so those
 * areas are not represented as standalone in-state markets here.
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

export const westVirginiaCompetitiveData: CompetitiveLandscapeData = {
  state: "West Virginia",
  markets: [
    "Charleston-Huntington",
    "Clarksburg-Weston",
    "Bluefield-Beckley-Oak Hill",
    "Wheeling-Steubenville",
  ],
  practiceAreas: ["PI / General"],
  data: {
    "Charleston-Huntington": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Clarksburg-Weston": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Bluefield-Beckley-Oak Hill": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
    "Wheeling-Steubenville": [
      row("Top Plaintiff Firm 1"),
      row("Top Plaintiff Firm 2"),
      row("Top Plaintiff Firm 3"),
      row("Top Plaintiff Firm 4"),
      row("Top Plaintiff Firm 5"),
    ],
  },
  dataMonth: "June 2026",
  totalAdvertisers: {
    "Charleston-Huntington": 5,
    "Clarksburg-Weston": 5,
    "Bluefield-Beckley-Oak Hill": 5,
    "Wheeling-Steubenville": 5,
  },
};
