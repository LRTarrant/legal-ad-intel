import { ohioCompetitiveData } from "@/lib/data/competitive-landscape/ohio";
import type { StateConfig } from "./_types";

export const ohioConfig: StateConfig = {
  slug: "ohio",
  stateCode: "OH",
  stateName: "Ohio",

  metadata: {
    title: "Ohio State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Ohio — combining state DOT crash and injury data, demographics, judicial profiles, and market opportunity signals across Cleveland, Columbus, Cincinnati, Toledo, Akron.",
  },

  // Traffic totals, motorcycle, urban/rural, speed: OSHP 2024.
  // Alcohol-impaired fatalities: NHTSA FARS 2023 (driver BAC >= 0.08, 455/1242).
  //   OSHP "OVI-related" (589) uses a different denominator and is not comparable
  //   to the BAC >= 0.08 figures used by other states in this system.
  trafficStats: {
    totalCrashes: 252623,
    totalFatalities: 1157, // FARS 2024 Annual Report File
    motorcycleFatalities: 220,
    speedRelatedFatalities: null, // not broken out in OSHP 2024 summary tables
    speedRelatedPct: null,
    alcoholRelatedFatalities: 342, // FARS 2024 Annual Report File
    alcoholRelatedPct: 29.6, // 342 / 1157 FARS 2024 Annual Report File
    unrestrainedFatalities: 0,
    distractedDrivingFatalCrashes: 0,
    urbanFatalities: 661, // FARS 2024 Annual Report File
    ruralFatalities: 493, // FARS 2024 Annual Report File
    reportYear: 2024,
    sourceLabel: "OSHP 2024",
    fatalitiesSourceLabel: "FARS 2024 Annual Report File",
  },

  // Source: BLS Census of Fatal Occupational Injuries — Ohio 2023.
  workplaceStats: {
    totalEmployment: 5397000,
    qcewCoveredEmployment: 5397409,
    totalWorkplaceFatalities: 164,
    constructionFatalities: 32,
    constructionPctTotal: 19.5,
    transportWarehouseFatalities: 19,
    truckTransportFatalities: null, // not broken out in BLS CFOI 2023 OH state tables
    fallsSlipsTrips: 28,
    transportationIncidents: 51,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 5-year estimates.
  commuteStats: {
    driveAlone: 75.0,
    nationalAvg: 68.7,
    avgCommuteMinutes: 25.0,
  },

  competitiveData: ohioCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Ohio — combining OSHP crash data, demographics, judicial profiles, and market opportunity signals across Cleveland, Columbus, Cincinnati, Toledo, and Akron. Population ~12M.",

    legalLandscape:
      "Ohio uses modified comparative negligence with a 51% bar — plaintiffs who are 51% or more at fault are barred from recovery; those at 50% or less recover with damages reduced by their comparative share. The personal injury statute of limitations is two years from the date of injury (Ohio Rev. Code § 2305.10). Ohio generally does not cap non-economic damages in standard auto and premises PI cases. Ohio's four major metro markets — Cleveland, Columbus, Cincinnati, and Toledo — each support active plaintiff PI practices, and the state's nearly even urban/rural fatality split (588 urban, 568 rural in 2024) means significant case volume is distributed across non-metro corridors as well.",

    autoAudience:
      "Ohio sits at the crossroads of two of the nation's busiest interstate corridors: I-75 (north-south through Toledo–Dayton–Cincinnati) and I-70 (east-west through Columbus). Drive-alone commuting (75.0%) exceeds the national average (68.7%). The Cleveland–Columbus–Cincinnati triangle concentrates metro crash volume, while the state's nearly even urban/rural fatality split — 588 urban, 568 rural in 2024 — means rural crash exposure is substantial and not confined to metro areas. I-71 (Columbus–Cincinnati) and I-77 (Akron–Canton–Marietta) are secondary high-volume corridors.",

    truckAudience:
      "Ohio's I-75 corridor — running through Toledo, Dayton, and Cincinnati — is among the highest-volume truck corridors in the United States, driven by automotive manufacturing supply chains connecting Michigan to the Southeast. I-70 through Columbus is a major east-west freight artery. Ohio's manufacturing economy generates significant intrastate freight on I-71 and I-77. The state's transport and warehouse sector recorded 19 workplace fatalities in 2023, concentrated in the Columbus and Cleveland logistics corridors.",

    motorcycleAudience:
      "Ohio recorded 220 motorcycle fatalities in 2024 — roughly 19% of total traffic fatalities. Ohio has no universal helmet law; riders 18 and older are not required to wear helmets. Summer riding season concentrates exposure along I-77, the Wayne National Forest, and rural southeast Ohio. Alcohol-impaired driving is a notable factor in Ohio crash patterns, making early blood alcohol documentation a priority in motorcycle cases with suspected impairment.",

    constructionAudience:
      "Columbus is one of the fastest-growing major metros in the Midwest, driving significant commercial and residential construction activity. Cleveland's ongoing urban reinvestment and Cincinnati's development pipeline add additional volume. Construction fatalities represent 19.5% of all Ohio workplace fatalities (32 of 164 in 2023). Third-party liability — crane, scaffold, electrical, and fall protection cases involving a non-employer — is the primary recovery vehicle where workers' compensation covers direct claims.",

    ruralUrbanContext:
      "Ohio's urban/rural fatality split is nearly even — 588 urban fatalities and 568 rural fatalities in 2024, a roughly 51/49 split. For a state with major metros like Cleveland, Columbus, and Cincinnati, the high rural share reflects meaningful exposure along southeastern Appalachian Ohio and the agricultural northwest. Rural southeastern Ohio has lower broadband penetration, making radio and outdoor advertising necessary complements to digital campaigns in those markets.",

    judicialContext:
      "Cuyahoga County (Cleveland) is Ohio's most plaintiff-favorable jurisdiction, with a large, diverse jury pool and a history of substantial PI and mass tort verdicts. Franklin County (Columbus) is also plaintiff-oriented for auto and premises cases. Hamilton County (Cincinnati) and Summit County (Akron) are more moderate. Lucas County (Toledo) is mid-range. For cases with strong facts, Cuyahoga is the preferred filing venue where plaintiff residency or crash location permits.",

    marketSaturationTitle: "Cleveland vs. Columbus vs. Cincinnati — Three-Market PI Landscape",
    marketSaturationTip:
      "Ohio is unusual in having three competitive PI markets of roughly similar size. Cleveland (Cuyahoga County) has the highest legal advertising density. Columbus (Franklin County) is faster-growing with increasing advertiser competition. Cincinnati (Hamilton County) is competitive but slightly less saturated. Surrounding suburban and rural counties — Lorain, Medina, Delaware, Warren, Clermont — offer comparable case volume with lower CPMs and less competitive digital auctions.",

    freightCorridorTitle: "I-75 / I-70 Crossroads — One of the Busiest Truck Corridors in the US",
    freightCorridorTip:
      "The intersection of I-75 and I-70 near Dayton is one of the highest-volume truck-traffic crossings in the United States. I-75 carries automotive and manufacturing freight between Michigan, Ohio, Kentucky, and the Southeast. I-70 connects Columbus to Pennsylvania in the east and Indiana in the west. Trucking PI cases on these corridors frequently involve interstate carriers with multi-state insurance structures and complex venue considerations.",

    solUrgencyTitle: "2-Year SOL — Evidence Decay as the Real Urgency Driver",
    solUrgencyTip:
      "Ohio's 2-year personal injury statute of limitations requires early client engagement, especially for commercial vehicle cases or municipal defendants where additional notice requirements may apply. Alcohol-impaired driving is a significant factor in Ohio crash patterns — early evidence holds on surveillance footage, toxicology records, and cellular data are critical to preserve the strongest cases. Fast intake and immediate evidence preservation distinguish cases that succeed at trial from those that don't.",

    internetAccessTitle: "Southeast Ohio Connectivity Gap",
    internetAccessTip:
      "Southeastern Ohio — the Appalachian counties including Athens, Morgan, Meigs, and Vinton — has lower broadband penetration and higher poverty rates than Ohio's metro regions. This area also sees elevated per-capita fatality rates. Digital-only advertising underperforms there. Local radio, outdoor, and community health partnerships are necessary channels for plaintiff firms seeking cases in non-metro Ohio.",

    outOfStateTitle: "Lake Erie & Hocking Hills Tourism Opportunity",
    outOfStateTip:
      "Ohio's Lake Erie shoreline, Cedar Point, and Hocking Hills State Park draw significant out-of-state visitors from Michigan, Pennsylvania, and Indiana. Out-of-state visitors injured in Ohio may not know local PI attorneys or the state's 2-year SOL. Seasonal geo-fenced digital along Lake Erie shore communities and Hocking Hills can capture injury cases from this segment before they return home and engage out-of-state counsel.",

    footerSourcesLabel:
      "Ohio State Highway Patrol — Traffic Crash Facts 2024 (OSHP 2024)",
  },

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
