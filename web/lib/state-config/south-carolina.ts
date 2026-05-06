import { southCarolinaCompetitiveData } from "@/lib/data/competitive-landscape/south-carolina";
import type { StateConfig } from "./_types";

export const southCarolinaConfig: StateConfig = {
  slug: "south-carolina",
  stateCode: "SC",
  stateName: "South Carolina",

  metadata: {
    title: "South Carolina State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in South Carolina — combining state DOT crash data, demographics, judicial profiles, and market opportunity signals across Columbia, Charleston, Greenville, Spartanburg, and Rock Hill. Population ~5.3M.",
  },

  // Placeholder values; to be filled with real FARS/SCDOT figures.
  trafficStats: {
    totalCrashes: 0,
    totalFatalities: 0,
    motorcycleFatalities: 0,
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: null,
    alcoholRelatedPct: null,
    unrestrainedFatalities: 0,
    distractedDrivingFatalCrashes: 0,
    urbanFatalities: null,
    ruralFatalities: null,
    reportYear: 2023,
    sourceLabel: "SCDOT 2023",
  },

  // Placeholder values; to be filled with BLS CFOI figures.
  workplaceStats: {
    totalEmployment: 0,
    qcewCoveredEmployment: 0,
    totalWorkplaceFatalities: 0,
    constructionFatalities: 0,
    constructionPctTotal: 0,
    transportWarehouseFatalities: 0,
    truckTransportFatalities: null,
    fallsSlipsTrips: 0,
    transportationIncidents: 0,
    reportYear: 2023,
  },

  // Placeholder values; to be filled with ACS estimates.
  commuteStats: {
    driveAlone: 0,
    nationalAvg: 68.7,
    avgCommuteMinutes: 0,
  },

  competitiveData: southCarolinaCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in South Carolina — combining SCDOT crash data, demographics, judicial profiles, and market opportunity signals across Columbia, Charleston, Greenville, Spartanburg, and Rock Hill. Population ~5.3M.",

    legalLandscape:
      "South Carolina uses modified comparative fault with a 51% bar — plaintiffs whose fault exceeds 50% cannot recover (S.C. Code § 15-38-15). The personal injury statute of limitations is three years from the date of injury (S.C. Code § 15-3-530). South Carolina is not a no-fault auto insurance state. There is no statutory cap on non-economic damages in general personal injury cases.",

    autoAudience:
      "South Carolina's road network is anchored by I-26 running northwest–southeast through Columbia and Charleston, I-20 running east–west through Columbia, I-77 running north from Columbia toward Charlotte, I-85 running through the Upstate, and I-95 running north–south along the eastern edge of the state. Columbia is the state capital and dominant market; Charleston and the Greenville–Spartanburg metro are major secondary markets. South Carolina is a fully vehicle-dependent state.",

    truckAudience:
      "South Carolina is crossed by major interstate routes — I-26, I-20, I-77, I-85, and I-95 — that carry significant commercial-vehicle traffic. Commercial-vehicle incidents on these corridors often involve out-of-state carriers, which can affect jurisdiction and carrier insurance structure.",

    motorcycleAudience:
      "South Carolina requires helmets for all motorcycle operators and passengers. South Carolina's riding season is longer than most northern states given the warmer climate, but the universal helmet law applies year-round.",

    constructionAudience:
      "South Carolina has an active construction market across the Charleston metro and the Greenville–Spartanburg Upstate. Workers' comp is mandatory, but third-party tort claims against contractors, architects, and property owners are common in multi-party construction PI. Workers and families of injured workers — especially subcontractor laborers — are the primary target audience.",

    ruralUrbanContext:
      "South Carolina has three distinct population centers (Columbia, Charleston, Greenville–Spartanburg) and extensive rural areas across the Pee Dee region, the Lowcountry, and the western counties. Rural areas have longer EMS response times and more limited trauma center access. PI firms targeting rural South Carolina should consider broadcast and outdoor alongside digital given lower population density in non-metro counties.",

    judicialContext:
      "South Carolina has major court complexes in its largest population centers: Richland County (Columbia), Charleston County, Greenville County, Spartanburg County, and York County (Rock Hill). Venue is determined by plaintiff residency or incident location. Plaintiff firms should evaluate the specific court of venue for each case.",

    marketSaturationTitle: "Columbia / Charleston vs. Upstate Market Opportunity",
    marketSaturationTip:
      "The Columbia and Charleston DMAs have the highest PI advertiser density in South Carolina. Greenville, Spartanburg, and Rock Hill are materially less saturated, with lower media CPMs and fewer competing plaintiff firm brands. Firms with statewide capacity may find favorable cost-per-case dynamics in the Upstate markets.",

    freightCorridorTitle: "I-26 / I-85 / I-95 Interstate Corridors",
    freightCorridorTip:
      "I-26 connects Columbia to Charleston. I-85 runs through the Greenville–Spartanburg Upstate. I-95 runs north–south along the eastern side of the state. Commercial-vehicle cases on these routes may involve out-of-state carriers and multi-state insurance structures.",

    solUrgencyTitle: "3-Year SOL Urgency",
    solUrgencyTip:
      "South Carolina's three-year statute of limitations is standard for PI. Early intake and evidence preservation remain important — particularly for cases involving uninsured or underinsured motorists where carrier identification and coverage verification take time.",

    internetAccessTitle: "Rural South Carolina Media Mix",
    internetAccessTip:
      "Rural South Carolina — particularly the Pee Dee region, the Lowcountry outside of Charleston, and western counties — has lower population density and more limited broadband infrastructure than the major metro areas. PI firms targeting these areas should consider a broader media mix including local broadcast radio and regional outdoor alongside digital.",
  },
};
