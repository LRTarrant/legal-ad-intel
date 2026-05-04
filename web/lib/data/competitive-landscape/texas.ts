import type { CompetitiveLandscapeData } from "./types";

/**
 * Texas competitive landscape — major plaintiff advertisers across the state's
 * top six metro markets. Metric values are placeholders (zero) and will be
 * populated by the standard ad-data pipeline.
 *
 * Markets selected by metro population: Houston, Dallas–Fort Worth (split into
 * Dallas + Fort Worth as separate markets per the existing pattern),
 * San Antonio, Austin, El Paso.
 *
 * Top advertisers per market sourced from public ad observations as of the
 * data month below; this list will be refined as Texas ad-tracking data is
 * ingested.
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
  return {
    advertiser,
    parent: parent ?? advertiser,
    ...ZERO_METRICS,
  };
}

export const texasCompetitiveData: CompetitiveLandscapeData = {
  state: "Texas",
  markets: ["Houston", "Dallas", "Fort Worth", "San Antonio", "Austin", "El Paso"],
  practiceAreas: ["PI / General"],
  data: {
    Houston: [
      row("Morgan & Morgan", "Morgan & Morgan PA"),
      row("Arnold & Itkin"),
      row("Adley Law Firm"),
      row("The Krist Law Firm"),
      row("Pusch & Nguyen Law Firm"),
    ],
    Dallas: [
      row("Morgan & Morgan", "Morgan & Morgan PA"),
      row("Witherite Law Group"),
      row("Crain Brogdon"),
      row("Tate Law Offices"),
      row("Loncar Lyon Jenkins"),
    ],
    "Fort Worth": [
      row("Anderson & Cummings"),
      row("Stephens Law Firm"),
      row("Berenson Injury Law"),
      row("The Law Offices of David Kohm"),
      row("Hutchison & Stoy"),
    ],
    "San Antonio": [
      row("Thomas J. Henry Law"),
      row("Hill Law Firm"),
      row("Carabin Shaw"),
      row("Wayne Wright LLP"),
      row("Villarreal & Begum"),
    ],
    Austin: [
      row("FVF Law"),
      row("DJC Law"),
      row("Briggle & Polan"),
      row("The Carlson Law Firm"),
      row("Funk & Associates"),
    ],
    "El Paso": [
      row("James Kennedy P.L.L.C."),
      row("Glasheen Valles & Inderman"),
      row("The Brown Firm"),
      row("Nava Law Group"),
      row("Scherr Legate"),
    ],
  },
  dataMonth: "May 2026",
  totalAdvertisers: {
    Houston: 5,
    Dallas: 5,
    "Fort Worth": 5,
    "San Antonio": 5,
    Austin: 5,
    "El Paso": 5,
  },
};
