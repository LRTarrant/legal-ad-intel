import { coloradoCompetitiveData } from "@/lib/data/competitive-landscape/colorado";
import type { StateConfig } from "./_types";

export const coloradoConfig: StateConfig = {
  slug: "colorado",
  stateCode: "CO",
  stateName: "Colorado",

  metadata: {
    title: "Colorado State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Colorado — combining state DOT crash data, demographics, judicial profiles, and market opportunity signals across Denver, Colorado Springs, Aurora, Fort Collins, and Boulder. Population ~5.8M.",
  },

  // Placeholder values; to be filled with real FARS/CDOT figures.
  trafficStats: {
    totalCrashes: 0,
    totalFatalities: 689, // FARS 2024 (preliminary)
    motorcycleFatalities: null,
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 220, // FARS 2024 (preliminary)
    alcoholRelatedPct: 31.9, // 220 / 689 FARS 2024 (preliminary)
    unrestrainedFatalities: 0,
    distractedDrivingFatalCrashes: 0,
    urbanFatalities: 454, // FARS 2024 (preliminary)
    ruralFatalities: 235, // FARS 2024 (preliminary)
    reportYear: 2024,
    sourceLabel: "FARS 2024 (preliminary)",
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

  competitiveData: coloradoCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Colorado — combining CDOT crash data, demographics, judicial profiles, and market opportunity signals across Denver, Colorado Springs, Aurora, Fort Collins, and Boulder. Population ~5.8M.",

    legalLandscape:
      "Colorado uses modified comparative fault with a 50% bar — plaintiffs whose fault equals or exceeds 50% cannot recover (C.R.S. § 13-21-111). The personal injury statute of limitations is three years from the date of injury (C.R.S. § 13-80-101). Colorado is not a no-fault auto insurance state. Colorado imposes a statutory cap on non-economic damages in personal injury cases (C.R.S. § 13-21-102.5); plaintiff firms should verify the current cap amount, which is subject to adjustment.",

    autoAudience:
      "Colorado's road network is anchored by I-25 running north–south through Denver and Colorado Springs, and I-70 running east–west through Denver and across the mountain corridors. The Denver–Front Range metro is the dominant population center; Colorado Springs and Fort Collins are major secondary markets. Colorado is a fully vehicle-dependent state outside of the Denver metro core.",

    truckAudience:
      "Colorado is crossed by major interstate routes — I-25, I-70, and I-76 — that carry significant commercial-vehicle traffic. Commercial-vehicle incidents on these corridors often involve out-of-state carriers, which can affect jurisdiction and carrier insurance structure.",

    motorcycleAudience:
      "Colorado requires helmets only for riders under age 18 — adult riders may legally ride without helmets. Colorado's riding season is concentrated in warmer months. Adult riders without helmets may have distinct exposure in catastrophic injury cases.",

    constructionAudience:
      "Colorado has an active construction market, with Denver and the Front Range driving substantial commercial and residential development volume. Workers' comp is mandatory, but third-party tort claims against contractors, architects, and property owners are common in multi-party construction PI. Workers and families of injured workers — especially subcontractor laborers — are the primary target audience.",

    ruralUrbanContext:
      "Colorado has a densely populated Front Range urban corridor (Denver, Colorado Springs, Fort Collins, Boulder) and extensive rural and mountainous areas to the west and east. Rural areas have longer EMS response times and more limited trauma center access. PI firms targeting rural Colorado should consider broadcast and outdoor alongside digital given lower population density in non-metro counties.",

    judicialContext:
      "Colorado has major court complexes in its largest population centers: Denver County, El Paso County (Colorado Springs), Arapahoe County (Aurora), Larimer County (Fort Collins), and Boulder County. Venue is determined by plaintiff residency or incident location. Plaintiff firms should evaluate the specific court of venue for each case.",

    marketSaturationTitle: "Denver Saturation vs. Secondary Market Opportunity",
    marketSaturationTip:
      "The Denver DMA has the highest PI advertiser density in Colorado. Colorado Springs, Fort Collins, and Boulder are materially less saturated, with lower media CPMs and fewer competing plaintiff firm brands. Firms expanding beyond Denver may find favorable cost-per-case dynamics in these secondary markets.",

    freightCorridorTitle: "I-25 / I-70 Interstate Corridors",
    freightCorridorTip:
      "I-25 runs north–south through Denver and Colorado Springs connecting Wyoming to New Mexico. I-70 runs east–west through Denver and into the mountains toward Utah. Commercial-vehicle cases on these routes may involve out-of-state carriers and multi-state insurance structures.",

    solUrgencyTitle: "3-Year SOL + Damages Cap Awareness",
    solUrgencyTip:
      "Colorado's three-year statute of limitations is standard for PI. The damages cap on non-economic recovery is an additional case-evaluation factor specific to Colorado — plaintiff firms should account for the cap in case valuation and settlement strategy. Early intake and evidence preservation remain important regardless of the longer deadline.",

    internetAccessTitle: "Rural Colorado Media Mix",
    internetAccessTip:
      "Rural Colorado — particularly the Western Slope, the San Luis Valley, and the eastern plains — has lower population density and more limited broadband infrastructure than the Denver–Front Range corridor. PI firms targeting these areas should consider a broader media mix including local broadcast radio and regional outdoor alongside digital.",
  },

  features: {
    showWorkplaceSection: false,
  },
};
