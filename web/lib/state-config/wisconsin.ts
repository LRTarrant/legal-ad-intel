import { wisconsinCompetitiveData } from "@/lib/data/competitive-landscape/wisconsin";
import type { StateConfig } from "./_types";

export const wisconsinConfig: StateConfig = {
  slug: "wisconsin",
  stateCode: "WI",
  stateName: "Wisconsin",

  metadata: {
    title: "Wisconsin State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Wisconsin — combining state DOT crash data, demographics, judicial profiles, and market opportunity signals across Milwaukee, Madison, Green Bay, Racine, and Appleton. Population ~5.9M.",
  },

  // Placeholder values; to be filled with real FARS/WisDOT figures.
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
    sourceLabel: "WisDOT 2023",
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

  competitiveData: wisconsinCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Wisconsin — combining WisDOT crash data, demographics, judicial profiles, and market opportunity signals across Milwaukee, Madison, Green Bay, Racine, and Appleton. Population ~5.9M.",

    legalLandscape:
      "Wisconsin uses modified comparative fault with a 51% bar — plaintiffs whose fault exceeds 50% cannot recover (Wis. Stat. § 895.045). The personal injury statute of limitations is three years from the date of injury (Wis. Stat. § 893.54). Wisconsin is not a no-fault auto insurance state. There is no statutory cap on non-economic damages in general personal injury cases.",

    autoAudience:
      "Wisconsin's road network is anchored by I-94 running east–west through Milwaukee and Madison, I-90 running north–south in the western part of the state, and I-43 connecting Milwaukee to Green Bay. Milwaukee is the state's dominant population center; Madison and Green Bay are major secondary markets. Wisconsin is a fully vehicle-dependent state outside of the Milwaukee metro.",

    truckAudience:
      "Wisconsin is crossed by major interstate routes — I-94, I-90, I-43, and I-39 — that carry significant commercial-vehicle traffic. Commercial-vehicle incidents on these corridors often involve out-of-state carriers, which can affect jurisdiction and carrier insurance structure.",

    motorcycleAudience:
      "Wisconsin requires helmets for riders under age 18 and those operating on an instructional permit. Adult riders with full licensure may legally ride without helmets. Wisconsin's riding season is short given the northern climate, concentrating incidents in warmer months. Adult riders without helmets may have distinct exposure in catastrophic injury cases.",

    constructionAudience:
      "Wisconsin has an active construction market, with Milwaukee driving the majority of commercial and residential development volume. Workers' comp is mandatory, but third-party tort claims against contractors, architects, and property owners are common in multi-party construction PI. Workers and families of injured workers — especially subcontractor laborers — are the primary target audience.",

    ruralUrbanContext:
      "Wisconsin has a mix of urban population centers along the I-94 corridor (Milwaukee, Madison) and extensive rural areas across the central and northern parts of the state. Rural areas have longer EMS response times and more limited trauma center access. PI firms targeting rural Wisconsin should consider broadcast and outdoor alongside digital given lower population density in non-metro counties.",

    judicialContext:
      "Wisconsin has major court complexes in its largest population centers: Milwaukee County, Dane County (Madison), Brown County (Green Bay), Racine County, and Winnebago County (Oshkosh). Venue is determined by plaintiff residency or incident location. Plaintiff firms should evaluate the specific court of venue for each case.",

    marketSaturationTitle: "Milwaukee Saturation vs. Secondary Market Opportunity",
    marketSaturationTip:
      "The Milwaukee DMA has the highest PI advertiser density in Wisconsin. Madison, Green Bay, and Appleton are materially less saturated, with lower media CPMs and fewer competing plaintiff firm brands. Firms expanding beyond Milwaukee may find favorable cost-per-case dynamics in these secondary markets.",

    freightCorridorTitle: "I-94 / I-43 Interstate Corridors",
    freightCorridorTip:
      "I-94 runs east–west through Milwaukee and Madison connecting Chicago and the Twin Cities. I-43 runs north from Milwaukee to Green Bay. Commercial-vehicle cases on these routes may involve out-of-state carriers and multi-state insurance structures.",

    solUrgencyTitle: "3-Year SOL Urgency",
    solUrgencyTip:
      "Wisconsin's three-year statute of limitations is standard for PI. Early intake and evidence preservation remain important — particularly for cases involving uninsured or underinsured motorists where carrier identification and coverage verification take time. Wisconsin's 51% comparative fault bar also means early fault assessment helps firms decide which cases to pursue.",

    internetAccessTitle: "Rural Wisconsin Media Mix",
    internetAccessTip:
      "Rural Wisconsin — particularly the north-central and northern counties — has lower population density and more limited broadband infrastructure than the Milwaukee–Madison corridor. PI firms targeting these areas should consider a broader media mix including local broadcast radio and regional outdoor alongside digital.",
  },
};
