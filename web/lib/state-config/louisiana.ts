import { louisianaCompetitiveData } from "@/lib/data/competitive-landscape/louisiana";
import type { StateConfig } from "./_types";

export const louisianaConfig: StateConfig = {
  slug: "louisiana",
  stateCode: "LA",
  stateName: "Louisiana",

  metadata: {
    title: "Louisiana State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Louisiana — combining state DOT crash data, demographics, judicial profiles, and market opportunity signals across New Orleans, Baton Rouge, Shreveport, Lafayette, and Lake Charles. Population ~4.6M.",
  },

  // Placeholder values; to be filled with real FARS/LaDOTD figures.
  trafficStats: {
    totalCrashes: 0,
    totalFatalities: 752, // FARS 2024 (preliminary)
    motorcycleFatalities: 0,
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 220, // FARS 2024 (preliminary)
    alcoholRelatedPct: 29.3, // 220 / 752 FARS 2024 (preliminary)
    unrestrainedFatalities: 0,
    distractedDrivingFatalCrashes: 0,
    urbanFatalities: 414, // FARS 2024 (preliminary)
    ruralFatalities: 336, // FARS 2024 (preliminary)
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

  competitiveData: louisianaCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Louisiana — combining LaDOTD crash data, demographics, judicial profiles, and market opportunity signals across New Orleans, Baton Rouge, Shreveport, Lafayette, and Lake Charles. Population ~4.6M.",

    legalLandscape:
      "Louisiana follows pure comparative fault — plaintiffs may recover even if primarily at fault, with damages reduced proportionally by their share (La. Civil Code art. 2323). Louisiana is a Civil Code state, not a common law state. The prescriptive period for delictual (tort) actions is one year from the date of injury (La. Civil Code art. 3492) — one of the shortest deadlines for general personal injury in the country. Louisiana is not a no-fault auto insurance state. There is no statutory cap on non-economic damages in general personal injury cases.",

    autoAudience:
      "Louisiana's road network is anchored by I-10 running east–west across the state through New Orleans and Baton Rouge, I-20 running east–west through Shreveport, and I-49 running north–south between Shreveport and Lafayette. New Orleans and Baton Rouge are the dominant population centers; Shreveport and Lafayette are major secondary markets. Louisiana is a fully vehicle-dependent state outside of the New Orleans core.",

    truckAudience:
      "Louisiana is crossed by major interstate routes — I-10, I-20, I-49, and I-12 — that carry significant commercial-vehicle traffic. Commercial-vehicle incidents on these corridors often involve out-of-state carriers, which can affect jurisdiction and carrier insurance structure.",

    motorcycleAudience:
      "Louisiana requires helmets for all motorcycle operators and passengers. Louisiana's year-round warm climate extends the riding season compared to northern states.",

    constructionAudience:
      "Louisiana has an active construction market, particularly in the New Orleans and Baton Rouge metros. Workers' comp is mandatory, but third-party tort claims against contractors, architects, and property owners are common in multi-party construction PI. Workers and families of injured workers — especially subcontractor laborers — are the primary target audience.",

    ruralUrbanContext:
      "Louisiana has urban population centers along the I-10 corridor (New Orleans, Baton Rouge, Lafayette) and in the northwest (Shreveport) with extensive rural areas in the northern parishes, central Louisiana, and coastal areas. Rural areas have longer EMS response times and more limited trauma center access. PI firms targeting rural Louisiana should consider broadcast and outdoor alongside digital given lower population density in non-metro parishes.",

    judicialContext:
      "Louisiana uses parishes rather than counties. Major court complexes include Orleans Parish (New Orleans), East Baton Rouge Parish, Caddo Parish (Shreveport), Lafayette Parish, and Calcasieu Parish (Lake Charles). Venue is determined by plaintiff domicile or incident location. Louisiana's Civil Code structure creates some procedural distinctions from common law states; plaintiff firms should ensure intake processes account for Louisiana-specific requirements.",

    marketSaturationTitle: "New Orleans / Baton Rouge vs. Secondary Market Opportunity",
    marketSaturationTip:
      "The New Orleans and Baton Rouge DMAs have the highest PI advertiser density in Louisiana. Shreveport, Lafayette, and Lake Charles are materially less saturated, with lower media CPMs and fewer competing plaintiff firm brands. Firms with statewide capacity may find favorable cost-per-case dynamics in secondary Louisiana markets.",

    freightCorridorTitle: "I-10 / I-20 Interstate Corridors",
    freightCorridorTip:
      "I-10 runs east–west across Louisiana connecting New Orleans, Baton Rouge, and Lafayette toward Texas. I-20 runs east–west through Shreveport connecting Dallas to Jackson. Commercial-vehicle cases on these routes may involve out-of-state carriers and multi-state insurance structures.",

    solUrgencyTitle: "1-Year Prescriptive Period — Critical Urgency",
    solUrgencyTip:
      "Louisiana's one-year prescriptive period for tort claims is among the shortest in the country and requires immediate action at intake. Cases missed by even a day are permanently barred. Plaintiff firms advertising in Louisiana must have fast intake processes, immediate attorney review for any injury inquiry, and clear client communication about the one-year deadline from the date of injury.",

    internetAccessTitle: "Rural Louisiana Media Mix",
    internetAccessTip:
      "Rural Louisiana — particularly the northern parishes, Cajun country, and coastal areas — has lower population density and more limited broadband infrastructure than the major metro areas. PI firms targeting these areas should consider a broader media mix including local broadcast radio and regional outdoor alongside digital.",
  },
};
