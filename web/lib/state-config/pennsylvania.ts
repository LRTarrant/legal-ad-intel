import { pennsylvaniaCompetitiveData } from "@/lib/data/competitive-landscape/pennsylvania";
import type { StateConfig } from "./_types";

export const pennsylvaniaConfig: StateConfig = {
  slug: "pennsylvania",
  stateCode: "PA",
  stateName: "Pennsylvania",

  metadata: {
    title: "Pennsylvania State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Pennsylvania — combining state DOT crash and injury data, demographics, judicial profiles, and market opportunity signals across Philadelphia, Pittsburgh, Allentown, Harrisburg, Scranton.",
  },

  // Source: state DOT annual crash report (2024).
  trafficStats: {
    totalCrashes: 110765,
    totalFatalities: 1127,
    motorcycleFatalities: 219,
    speedRelatedFatalities: 263,
    speedRelatedPct: 23.3,
    alcoholRelatedFatalities: 275, // FARS 2024
    alcoholRelatedPct: 24.4, // 275 / 1127 FARS 2024
    unrestrainedFatalities: 522,
    distractedDrivingFatalCrashes: 49,
    urbanFatalities: 684, // FARS 2024
    ruralFatalities: 438, // FARS 2024
    reportYear: 2024,
    sourceLabel: "PennDOT 2024",
  },

  // Source: BLS Census of Fatal Occupational Injuries — Pennsylvania 2023.
  workplaceStats: {
    totalEmployment: 5963000,
    qcewCoveredEmployment: 5963025,
    totalWorkplaceFatalities: 169,
    constructionFatalities: 30,
    constructionPctTotal: 18.0,
    transportWarehouseFatalities: 28,
    truckTransportFatalities: null, // not broken out in BLS CFOI 2023 PA state tables
    fallsSlipsTrips: 43,
    transportationIncidents: 50,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 5-year estimates.
  commuteStats: {
    driveAlone: 74.0,
    nationalAvg: 68.7,
    avgCommuteMinutes: 26.6,
  },

  competitiveData: pennsylvaniaCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Pennsylvania — combining PennDOT crash data, demographics, judicial profiles, and market opportunity signals across Philadelphia, Pittsburgh, Allentown, Harrisburg, and Scranton. Population ~13M.",

    legalLandscape:
      "Pennsylvania uses modified comparative negligence with a 51% bar — plaintiffs who are 51% or more at fault are barred from recovery; those at 50% or less recover with damages reduced by their share of fault. The personal injury statute of limitations is two years from the date of injury (42 Pa.C.S. § 5524), shorter than both New York and Maryland. Pennsylvania imposes no statutory cap on non-economic damages in standard PI cases. Philadelphia (Philadelphia County) and Pittsburgh (Allegheny County) are the state's primary litigation centers, with Philadelphia producing some of the largest auto and premises verdicts in the mid-Atlantic region.",

    autoAudience:
      "Pennsylvania's major crash corridors run along I-76 (the Pennsylvania Turnpike, crossing the state east-to-west), I-78 (Allentown to the New Jersey border), I-80 (northern PA east-to-west), and I-81 (Scranton through Harrisburg). Drive-alone commuting (74.0%) exceeds the national average (68.7%), concentrating exposure in the suburban rings around Philadelphia and Pittsburgh. The Philadelphia metro — Philadelphia, Montgomery, Delaware, Bucks, and Chester counties — drives the largest share of case volume. Pittsburgh (Allegheny County) and the Lehigh Valley (Northampton/Lehigh) are secondary volume markets.",

    truckAudience:
      "Pennsylvania is a critical East Coast freight corridor state. The Pennsylvania Turnpike (I-76) and I-78 funnel heavy truck traffic between the New York–New Jersey metro and the interior. I-80 through northern PA is a major cross-country freight artery. Philadelphia's distribution infrastructure and Pittsburgh's industrial supply chain generate significant commercial vehicle volume across the state. Unrestrained fatalities (522 in 2024) correlate partly with rural truck corridor exposure where belt-use rates tend to be lower.",

    motorcycleAudience:
      "Pennsylvania recorded 219 motorcycle fatalities in 2024 — roughly 19% of total traffic fatalities. Pennsylvania has a partial helmet law: riders under age 21 are required to wear helmets; riders 21 and older with at least two years of experience or who have completed a safety course are exempt. The Pocono Mountains, Appalachian ridges, and central PA rural routes attract recreational riders, including out-of-state visitors from the New York and New Jersey metros. The 2-year SOL makes early intake particularly critical for motorcycle cases.",

    constructionAudience:
      "Philadelphia's construction market is one of the most active on the East Coast, and Pittsburgh continues a multi-decade urban reinvestment cycle. Construction fatalities represent 18% of all Pennsylvania workplace fatalities (30 of 169 in 2023). Third-party liability — crane, scaffold, electrical, and OSHA-cited incidents involving a non-employer at fault — is the primary recovery path where workers' compensation limits direct claims. Workers on active Philadelphia and Pittsburgh job sites and their families are the primary target.",

    ruralUrbanContext:
      "Pennsylvania's rural counties — particularly the central corridor between Philadelphia and Pittsburgh (the 'Pennsylvania T') and the northern tier — have high fatality rates per capita despite lower population density. Urban/rural fatality split is not broken out in PennDOT 2024 summary data. The central PA and northern tier rural markets have lower broadband penetration; digital-only campaigns underperform there. Radio, outdoor, and community media are essential complements for plaintiff firms targeting non-metro Pennsylvania.",

    judicialContext:
      "Philadelphia County is among the most plaintiff-favorable venues in the eastern United States, consistently producing high verdicts in auto, premises, and mass tort cases. Allegheny County (Pittsburgh) is also a strong plaintiff venue for western PA. Montgomery, Bucks, Delaware, and Chester counties (Philadelphia suburbs) are more moderate. Venue selection — particularly plaintiff residency and crash location analysis — can significantly shift expected case value in Pennsylvania.",

    marketSaturationTitle: "Philadelphia & Pittsburgh vs. Secondary Markets",
    marketSaturationTip:
      "Philadelphia (Philadelphia County and surrounding suburbs) and Pittsburgh (Allegheny County) attract the highest PI advertiser concentration in Pennsylvania. The Lehigh Valley (Northampton/Lehigh counties) is Pennsylvania's third-largest metro with materially lower ad saturation and a growing industrial and distribution workforce. Harrisburg (Dauphin County) and Scranton/Wilkes-Barre (Lackawanna/Luzerne) offer mid-market opportunities with favorable cost-per-case economics.",

    freightCorridorTitle: "PA Turnpike / I-80 Freight Corridors",
    freightCorridorTip:
      "The Pennsylvania Turnpike (I-76) is one of the nation's highest-volume toll freight routes, connecting Philadelphia to Pittsburgh and the Midwest. I-80 through northern PA is a major east-west cross-country freight artery. I-78 connects the Lehigh Valley to the New York–New Jersey freight network. Trucking PI cases on these corridors often involve interstate carriers with multi-state insurance structures and complex venue questions.",

    solUrgencyTitle: "2-Year SOL — Shorter Window Than Most Mid-Atlantic States",
    solUrgencyTip:
      "Pennsylvania's 2-year personal injury statute of limitations is shorter than New York (3 years) and Maryland (3 years). Cases involving commercial vehicles, SEPTA or other transit authorities, or municipal defendants may trigger additional notice requirements with even shorter windows. Fast intake, early evidence preservation, and prompt engagement with treating providers are critical to protect both the case and the client relationship before the SOL becomes a bar.",

    internetAccessTitle: "Central PA & Northern Tier Connectivity Gap",
    internetAccessTip:
      "Pennsylvania's rural central corridor and northern tier counties — including Lycoming, Clinton, Centre, Tioga, Cameron, and Potter — have lower broadband penetration and higher uninsured populations. These areas run along I-80 and see disproportionate truck-crash exposure. Digital-only campaigns underreach these markets. Local radio, outdoor advertising, and community health partnerships are necessary channels for plaintiff firms seeking cases outside the Philadelphia and Pittsburgh metros.",

    outOfStateTitle: "Poconos & Delaware Water Gap Tourism Opportunity",
    outOfStateTip:
      "The Pocono Mountains and Delaware Water Gap draw significant out-of-state visitors and riders from the New York and New Jersey metros. Out-of-state visitors injured in Pennsylvania may not know local PI attorneys or the state's 2-year SOL. Geo-fenced digital along I-80 and I-78 resort corridors, combined with partnerships with Pocono-area accommodations, can capture cases from this high-volume seasonal segment before they engage out-of-state counsel.",

    footerSourcesLabel:
      "PennDOT — Pennsylvania Department of Transportation Annual Crash Statistics Report 2024",
  },

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
