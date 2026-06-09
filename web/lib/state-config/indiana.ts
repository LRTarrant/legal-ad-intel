import { indianaCompetitiveData } from "@/lib/data/competitive-landscape/indiana";
import type { StateConfig } from "./_types";

export const indianaConfig: StateConfig = {
  slug: "indiana",
  stateCode: "IN",
  stateName: "Indiana",

  metadata: {
    title: "Indiana State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Indiana — combining state DOT crash data, demographics, judicial profiles, and market opportunity signals across Indianapolis, Fort Wayne, Evansville, South Bend, and Bloomington. Population ~6.8M.",
  },

  // Placeholder values; to be filled with real FARS/INDOT figures.
  trafficStats: {
    totalCrashes: 0,
    totalFatalities: 832, // FARS 2024 Annual Report File
    motorcycleFatalities: null,
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 185, // FARS 2024 Annual Report File
    alcoholRelatedPct: 22.2, // 185 / 832 FARS 2024 Annual Report File
    unrestrainedFatalities: 0,
    distractedDrivingFatalCrashes: 0,
    urbanFatalities: 337, // FARS 2024 Annual Report File
    ruralFatalities: 491, // FARS 2024 Annual Report File
    reportYear: 2024,
    sourceLabel: "FARS 2024 Annual Report File",
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

  competitiveData: indianaCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Indiana — combining INDOT crash data, demographics, judicial profiles, and market opportunity signals across Indianapolis, Fort Wayne, Evansville, South Bend, and Bloomington. Population ~6.8M.",

    legalLandscape:
      "Indiana uses modified comparative fault with a 51% bar — plaintiffs whose fault exceeds 50% cannot recover (Indiana Code § 34-51-2-6). The personal injury statute of limitations is two years from the date of injury (Indiana Code § 34-11-2-4). Indiana is not a no-fault auto insurance state. There is no statutory cap on non-economic damages in general personal injury cases.",

    autoAudience:
      "Indiana's road network is anchored by I-65 running north–south through Indianapolis, I-70 running east–west, I-74, and I-69. Indianapolis is the state's dominant population and crash-volume center, with Fort Wayne, Evansville, and South Bend as major secondary markets. Indiana is a fully vehicle-dependent state with high drive-alone commuting rates across all metros.",

    truckAudience:
      "Indiana is crossed by major interstate routes — I-65, I-70, I-74, and I-69 — that carry significant commercial-vehicle traffic. Commercial-vehicle incidents on these corridors often involve out-of-state carriers, which can affect jurisdiction and carrier insurance structure.",

    motorcycleAudience:
      "Indiana requires helmets only for riders under age 18 — adult riders may legally ride without helmets. Indiana's riding season is concentrated in warmer months. Adult riders without helmets may have distinct exposure in catastrophic injury cases.",

    constructionAudience:
      "Indiana has an active construction market, with Indianapolis driving the majority of commercial and residential development volume. Workers' comp is mandatory, but third-party tort claims against contractors, architects, and property owners are common in multi-party construction PI. Workers and families of injured workers — especially subcontractor laborers — are the primary target audience.",

    ruralUrbanContext:
      "Indiana has a mix of urban population centers (Indianapolis, Fort Wayne, Evansville) and extensive rural areas across the central and southern parts of the state. Rural areas have longer EMS response times and more limited trauma center access. PI firms targeting rural Indiana should consider broadcast and outdoor alongside digital given lower population density in non-metro counties.",

    judicialContext:
      "Indiana has major court complexes in its largest population centers: Marion County (Indianapolis), Allen County (Fort Wayne), Vanderburgh County (Evansville), St. Joseph County (South Bend), and Monroe County (Bloomington). Venue is determined by plaintiff residency or incident location. Plaintiff firms should evaluate the specific court of venue for each case.",

    marketSaturationTitle: "Indianapolis Saturation vs. Secondary Market Opportunity",
    marketSaturationTip:
      "The Indianapolis DMA has the highest PI advertiser density in Indiana. Fort Wayne, Evansville, and South Bend are materially less saturated, with lower media CPMs and fewer competing plaintiff firm brands. Firms expanding beyond Indianapolis may find favorable cost-per-case dynamics in these secondary markets.",

    freightCorridorTitle: "I-65 / I-70 Interstate Corridors",
    freightCorridorTip:
      "I-65 runs north–south through Indianapolis connecting Chicago and Louisville. I-70 runs east–west through Indianapolis connecting St. Louis and Columbus. Commercial-vehicle cases on these routes may involve out-of-state carriers and multi-state insurance structures.",

    solUrgencyTitle: "2-Year SOL Urgency",
    solUrgencyTip:
      "Indiana's two-year statute of limitations is among the shorter general PI deadlines. Fast intake and early case evaluation are essential — particularly for cases involving uninsured or underinsured motorists where carrier identification and coverage verification take time.",

    internetAccessTitle: "Rural Indiana Media Mix",
    internetAccessTip:
      "Rural Indiana — particularly the south-central and southwestern counties — has lower population density and more limited broadband infrastructure than the Indianapolis metro. PI firms targeting these areas should consider a broader media mix including local broadcast radio and regional outdoor alongside digital.",
  },

  features: {
    showWorkplaceSection: false,
  },
};
