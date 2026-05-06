import { minnesotaCompetitiveData } from "@/lib/data/competitive-landscape/minnesota";
import type { StateConfig } from "./_types";

export const minnesotaConfig: StateConfig = {
  slug: "minnesota",
  stateCode: "MN",
  stateName: "Minnesota",

  metadata: {
    title: "Minnesota State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Minnesota — combining state DOT crash data, demographics, judicial profiles, and market opportunity signals across Minneapolis, Saint Paul, Rochester, Duluth, and Saint Cloud. Population ~5.7M.",
  },

  // Placeholder values; to be filled with real FARS/MnDOT figures.
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
    sourceLabel: "MnDOT 2023",
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

  competitiveData: minnesotaCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Minnesota — combining MnDOT crash data, demographics, judicial profiles, and market opportunity signals across Minneapolis, Saint Paul, Rochester, Duluth, and Saint Cloud. Population ~5.7M.",

    legalLandscape:
      "Minnesota uses modified comparative fault with a 51% bar — plaintiffs whose fault exceeds 50% cannot recover (Minn. Stat. § 604.01). The personal injury statute of limitations is six years from the date of injury (Minn. Stat. § 541.05, subd. 1(5)) — one of the longest general PI deadlines in the country. Minnesota is a no-fault auto insurance state: personal injury protection (PIP) coverage must be exhausted before a tort claim can proceed for most injuries. A tort threshold must be met to bring suit; plaintiff firms should verify current threshold requirements.",

    autoAudience:
      "Minnesota's road network is anchored by I-94 running east–west through the Twin Cities, I-35 splitting into I-35W (Minneapolis) and I-35E (Saint Paul), and I-90 along the southern border. The Minneapolis–Saint Paul metro is the dominant population center; Rochester, Duluth, and Saint Cloud are major secondary markets. Minnesota's no-fault PIP requirement means intake messaging must be calibrated for threshold-crossing cases.",

    truckAudience:
      "Minnesota is crossed by major interstate routes — I-94, I-35, and I-90 — that carry significant commercial-vehicle traffic. Commercial-vehicle incidents on these corridors often involve out-of-state carriers, which can affect jurisdiction and carrier insurance structure.",

    motorcycleAudience:
      "Minnesota requires helmets only for riders under age 18 — adult riders may legally ride without helmets. Minnesota's riding season is short given the northern climate, concentrating incidents in warmer months. Adult riders without helmets may have distinct exposure in catastrophic injury cases.",

    constructionAudience:
      "Minnesota has an active construction market, with the Twin Cities metro driving the majority of commercial and residential development volume. Workers' comp is mandatory, but third-party tort claims against contractors, architects, and property owners are common in multi-party construction PI. Workers and families of injured workers — especially subcontractor laborers — are the primary target audience.",

    ruralUrbanContext:
      "Minnesota has a densely populated Twin Cities metro and extensive rural areas across the northern and western parts of the state. Rural areas have longer EMS response times and more limited trauma center access. PI firms targeting rural Minnesota should consider broadcast and outdoor alongside digital given lower population density in non-metro counties.",

    judicialContext:
      "Minnesota has major court complexes in its largest population centers: Hennepin County (Minneapolis), Ramsey County (Saint Paul), Olmsted County (Rochester), St. Louis County (Duluth), and Stearns County (Saint Cloud). Venue is determined by plaintiff residency or incident location. Plaintiff firms should evaluate the specific court of venue for each case.",

    marketSaturationTitle: "Twin Cities Saturation vs. Secondary Market Opportunity",
    marketSaturationTip:
      "The Minneapolis–Saint Paul DMA has the highest PI advertiser density in Minnesota. Rochester, Duluth, and Saint Cloud are materially less saturated, with lower media CPMs and fewer competing plaintiff firm brands. Firms expanding beyond the Twin Cities may find favorable cost-per-case dynamics in these secondary markets.",

    freightCorridorTitle: "I-94 / I-35 Interstate Corridors",
    freightCorridorTip:
      "I-94 runs east–west through Minneapolis and Saint Paul connecting the Dakotas to Wisconsin. I-35 runs north–south connecting the Twin Cities to Iowa, splitting into I-35W and I-35E through the metro. Commercial-vehicle cases on these routes may involve out-of-state carriers and multi-state insurance structures.",

    solUrgencyTitle: "6-Year SOL + No-Fault Threshold Considerations",
    solUrgencyTip:
      "Minnesota's six-year statute of limitations (Minn. Stat. § 541.05, subd. 1(5)) is one of the longest general PI deadlines in the country, giving plaintiff firms substantial runway for case development. The more significant intake filter is Minnesota's no-fault PIP requirement: cases that don't meet the tort threshold cannot proceed to suit regardless of the SOL. Early intake should confirm threshold-crossing injuries rather than focusing on deadline pressure.",

    internetAccessTitle: "Rural Minnesota Media Mix",
    internetAccessTip:
      "Rural Minnesota — particularly the northern counties and the western prairie — has lower population density and more limited broadband infrastructure than the Twin Cities metro. PI firms targeting these areas should consider a broader media mix including local broadcast radio and regional outdoor alongside digital.",
  },
};
