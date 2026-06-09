import { michiganCompetitiveData } from "@/lib/data/competitive-landscape/michigan";
import type { StateConfig } from "./_types";

export const michiganConfig: StateConfig = {
  slug: "michigan",
  stateCode: "MI",
  stateName: "Michigan",

  metadata: {
    title: "Michigan State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Michigan — combining state DOT crash and injury data, demographics, judicial profiles, and market opportunity signals across Detroit, Grand Rapids, Lansing, Flint, Ann Arbor.",
  },

  // Source: state DOT annual crash report (2023).
  trafficStats: {
    totalCrashes: 287953,
    totalFatalities: 1098, // FARS 2024 Annual Report File
    motorcycleFatalities: 165,
    speedRelatedFatalities: null, // not broken out in MSP CJIC 2023 summary tables
    speedRelatedPct: null,
    alcoholRelatedFatalities: 299, // FARS 2024 Annual Report File
    alcoholRelatedPct: 27.2, // 299 / 1098 FARS 2024 Annual Report File
    unrestrainedFatalities: 0,
    distractedDrivingFatalCrashes: 56,
    urbanFatalities: 636, // FARS 2024 Annual Report File
    ruralFatalities: 449, // FARS 2024 Annual Report File
    reportYear: 2023,
    sourceLabel: "MSP CJIC 2023",
    fatalitiesSourceLabel: "FARS 2024 Annual Report File",
    fatalitiesReportYear: 2024,
  },

  // Source: BLS Census of Fatal Occupational Injuries — Michigan 2023.
  workplaceStats: {
    totalEmployment: 4850000,
    qcewCoveredEmployment: 4408000,
    totalWorkplaceFatalities: 166,
    constructionFatalities: 39,
    constructionPctTotal: 23.5,
    transportWarehouseFatalities: 13,
    truckTransportFatalities: null, // not broken out in BLS CFOI 2023 MI state tables
    fallsSlipsTrips: 22,
    transportationIncidents: 55,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 5-year estimates.
  commuteStats: {
    driveAlone: 75.6,
    nationalAvg: 68.7,
    avgCommuteMinutes: 24.0,
  },

  competitiveData: michiganCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Michigan — combining MSP crash data, demographics, judicial profiles, and market opportunity signals across Detroit, Grand Rapids, Lansing, Flint, and Ann Arbor. Population ~10M.",

    legalLandscape:
      "Michigan operates a mandatory no-fault auto insurance system under the Michigan No-Fault Act. Injured motorists first claim personal protection insurance (PIP) benefits — unlimited medical for catastrophic injuries under the highest coverage tier — from their own insurer regardless of fault. Third-party tort claims against at-fault drivers require meeting a 'serious impairment of body function' threshold. For non-auto PI and premises cases, Michigan uses modified comparative fault with a 51% bar. The personal injury statute of limitations is three years. Punitive damages are generally unavailable in Michigan outside limited circumstances. The no-fault threshold requirement is the key intake screening criterion for auto PI cases.",

    autoAudience:
      "Michigan's major crash corridors run along I-75 (Detroit–Flint–Saginaw–Gaylord), I-94 (Detroit–Battle Creek–Benton Harbor), I-96 (Detroit–Lansing–Grand Rapids), and I-69 (Port Huron–Flint–Lansing). Drive-alone commuting (75.6%) exceeds the national average (68.7%). The Detroit metro — Wayne, Oakland, Macomb counties — drives the largest share of MVA case volume. Michigan's no-fault system means intake screening must assess whether injuries meet the 'serious impairment' threshold for third-party claims.",

    truckAudience:
      "Michigan is a major automotive and industrial freight state. The I-75 / I-94 interchange in the Detroit metro is one of the highest-volume truck corridors in the Midwest. Agricultural and manufacturing freight corridors in western Michigan and the Thumb region add exposure outside major metros.",

    motorcycleAudience:
      "Michigan's Upper Peninsula and northern Lower Peninsula offer popular summer touring routes. The state recorded 165 motorcycle fatalities in 2023. Michigan has no universal helmet law — riders 21+ with at least $20,000 in medical insurance are not required to wear helmets. No-fault PIP coverage applies to motorcycle riders who purchase optional coverage, but many do not, which affects the intake and case structure.",

    constructionAudience:
      "Detroit's ongoing urban redevelopment and Grand Rapids' rapid growth concentrate construction worksite exposure. Michigan uses modified comparative fault for construction PI, and third-party liability claims — crane, scaffold, electrical, OSHA-citation cases — are the primary vehicle where workers' comp doesn't limit recovery.",

    ruralUrbanContext:
      "Michigan's rural northern Lower Peninsula and Upper Peninsula have lower population density but elevated fatality rates per capita. Lower internet access in rural areas limits digital advertising reach. Radio and local community outlets are more effective channels for plaintiff firm outreach in those markets.",

    judicialContext:
      "Wayne County (Detroit) has historically been one of the more plaintiff-favorable jurisdictions in Michigan. Oakland and Macomb counties are more conservative. Venue selection in Michigan auto cases is also influenced by which county the crash occurred in and where defendants are domiciled — significant for multi-county metro Detroit cases.",

    marketSaturationTitle: "Detroit Metro Saturation vs. Grand Rapids",
    marketSaturationTip:
      "Wayne, Oakland, and Macomb counties (metro Detroit) attract the heaviest PI advertiser density in Michigan. Grand Rapids (Kent County) is Michigan's second-largest market with materially lower saturation — faster-growing population and lower cost-per-case than Detroit. Lansing and Flint offer mid-market opportunities with lower competitive density.",

    freightCorridorTitle: "I-75 / I-94 Automotive Freight Corridor",
    freightCorridorTip:
      "The I-75 / I-94 interchange in the Detroit metro is one of the busiest truck corridors in the Midwest, driven by automotive manufacturing supply chains. Upstate I-75 (Flint–Saginaw–Bay City) and the I-69 corridor (Port Huron–Flint) also carry significant freight. Trucking PI cases on these corridors benefit from clear carrier identification and high-value cargo documentation.",

    solUrgencyTitle: "No-Fault Threshold — The Real Intake Screen",
    solUrgencyTip:
      "Michigan's 3-year SOL gives firms time, but the no-fault threshold is the gatekeeping issue for auto PI cases. Third-party tort claims require 'serious impairment of body function' — early medical documentation and expert assessment are critical. Cases that don't clear the threshold belong in the PIP system, not tort litigation. Fast intake to sort threshold vs. non-threshold cases protects firm economics.",

    internetAccessTitle: "Northern Michigan / UP Connectivity Gap",
    internetAccessTip:
      "Michigan's Upper Peninsula and northern Lower Peninsula have significantly lower broadband penetration than the Detroit or Grand Rapids metros. These areas also have higher per-capita fatality rates. Digital-only campaigns reach a fraction of these communities. Local radio, outdoor, and community partnerships are necessary channels for cases originating in northern Michigan.",

    outOfStateTitle: "Great Lakes / UP Tourism Opportunity",
    outOfStateTip:
      "Michigan's Upper Peninsula, Mackinac Island, Sleeping Bear Dunes, and Great Lakes shoreline attract significant out-of-state visitors and riders. Out-of-state visitors may not know Michigan's no-fault system or local attorneys. Geo-fenced digital at popular tourist corridors and bridge approaches can capture injury cases from this segment before they return home.",

    footerSourcesLabel:
      "Michigan State Police Criminal Justice Information Center (MSP CJIC) — Traffic Crash Statistics 2023",
  },

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
