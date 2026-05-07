import { missouriCompetitiveData } from "@/lib/data/competitive-landscape/missouri";
import type { StateConfig } from "./_types";

export const missouriConfig: StateConfig = {
  slug: "missouri",
  stateCode: "MO",
  stateName: "Missouri",

  metadata: {
    title: "Missouri State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Missouri — combining state DOT crash data, demographics, judicial profiles, and market opportunity signals across Kansas City, St. Louis, Springfield, Columbia, and Joplin. Population ~6.2M.",
  },

  // Placeholder values; to be filled with real FARS/MoDOT figures.
  trafficStats: {
    totalCrashes: 0,
    totalFatalities: 955, // FARS 2024 (preliminary)
    motorcycleFatalities: 0,
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 252, // FARS 2024 (preliminary)
    alcoholRelatedPct: 26.4, // 252 / 955 FARS 2024 (preliminary)
    unrestrainedFatalities: 0,
    distractedDrivingFatalCrashes: 0,
    urbanFatalities: 468, // FARS 2024 (preliminary)
    ruralFatalities: 452, // FARS 2024 (preliminary)
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

  competitiveData: missouriCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Missouri — combining MoDOT crash data, demographics, judicial profiles, and market opportunity signals across Kansas City, St. Louis, Springfield, Columbia, and Joplin. Population ~6.2M.",

    legalLandscape:
      "Missouri follows pure comparative fault — plaintiffs may recover even if primarily at fault, with damages reduced proportionally by their share of fault (Mo. Rev. Stat. § 537.765). The personal injury statute of limitations is five years from the date of injury (Mo. Rev. Stat. § 516.120). Missouri is not a no-fault auto insurance state. There is no statutory cap on non-economic damages in general personal injury cases.",

    autoAudience:
      "Missouri's road network is anchored by I-70 running east–west between Kansas City and St. Louis, I-44 running southwest from St. Louis toward Springfield and Joplin, and I-55 and I-64 serving the St. Louis metro. Both Kansas City and St. Louis are large, vehicle-dependent metros. Missouri's pure comparative fault rule means cases with shared fault are still viable, which broadens the intake universe.",

    truckAudience:
      "Missouri is crossed by major interstate routes — I-70, I-44, I-55, I-64, and I-29 — that carry significant commercial-vehicle traffic. Commercial-vehicle incidents on these corridors often involve out-of-state carriers, which can affect jurisdiction and carrier insurance structure.",

    motorcycleAudience:
      "Missouri's helmet law requirements vary by rider age and experience — plaintiff firms and potential clients should verify current requirements. Missouri's riding season is concentrated in warmer months.",

    constructionAudience:
      "Missouri has active construction markets in both Kansas City and St. Louis. Workers' comp is mandatory, but third-party tort claims against contractors, architects, and property owners are common in multi-party construction PI. Workers and families of injured workers — especially subcontractor laborers — are the primary target audience.",

    ruralUrbanContext:
      "Missouri has two large urban centers (Kansas City and St. Louis) anchoring the western and eastern ends of I-70, with rural and small-town areas across the Ozarks and southern Missouri. Rural areas have longer EMS response times and more limited trauma center access. PI firms targeting rural Missouri should consider broadcast and outdoor alongside digital given lower population density in non-metro counties.",

    judicialContext:
      "Missouri has major court complexes in its largest population centers: Jackson County (Kansas City), St. Louis City, St. Louis County, Greene County (Springfield), and Boone County (Columbia). Venue is determined by plaintiff residency or incident location. Plaintiff firms should evaluate the specific court of venue for each case.",

    marketSaturationTitle: "Kansas City / St. Louis vs. Secondary Market Opportunity",
    marketSaturationTip:
      "The Kansas City and St. Louis DMAs have the highest PI advertiser density in Missouri. Springfield, Columbia, and Joplin are materially less saturated, with lower media CPMs and fewer competing plaintiff firm brands. Firms with statewide capacity may find favorable cost-per-case dynamics in secondary Missouri markets.",

    freightCorridorTitle: "I-70 / I-44 Interstate Corridors",
    freightCorridorTip:
      "I-70 runs east–west across Missouri connecting Kansas City to St. Louis. I-44 runs southwest from St. Louis toward Springfield and the Oklahoma border. Commercial-vehicle cases on these routes may involve out-of-state carriers and multi-state insurance structures.",

    solUrgencyTitle: "5-Year SOL — Longer Runway, Earlier Intake Still Better",
    solUrgencyTip:
      "Missouri's five-year statute of limitations is among the longest for general PI in the country. While the deadline pressure is lower than in states with 1–2 year windows, early intake still matters — evidence degrades, witnesses move, and carrier coverage disputes are harder to resolve years after a crash. Firms that move quickly secure better case outcomes regardless of SOL.",

    internetAccessTitle: "Rural Missouri Media Mix",
    internetAccessTip:
      "Rural Missouri — particularly the Ozarks and southern counties — has lower population density and more limited broadband infrastructure than the Kansas City and St. Louis metros. PI firms targeting these areas should consider a broader media mix including local broadcast radio and regional outdoor alongside digital.",
  },
};
