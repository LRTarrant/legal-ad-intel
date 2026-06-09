import { wyomingCompetitiveData } from "@/lib/data/competitive-landscape/wyoming";
import type { StateConfig } from "./_types";

export const wyomingConfig: StateConfig = {
  slug: "wyoming",
  stateCode: "WY",
  stateName: "Wyoming",

  metadata: {
    title: "Wyoming State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Wyoming — combining FARS crash data, workplace fatality data, demographics, and market opportunity signals across the Casper-Riverton and Cheyenne-Scottsbluff markets.",
  },

  // Source: FARS 2024 Annual Report File. Wyoming is the least-populous state;
  // motorcycle and speed-related fatalities are not available in our FARS pull,
  // and no citable 2024 Wyoming DOT figure was found — left null.
  trafficStats: {
    totalCrashes: 0, // not separately ingested for Wyoming; FARS counts fatalities, not all crashes
    totalFatalities: 107,
    motorcycleFatalities: null,
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 30,
    alcoholRelatedPct: 28,
    unrestrainedFatalities: 0, // not citable from our FARS pull
    distractedDrivingFatalCrashes: 0, // not citable from our FARS pull
    urbanFatalities: 27,
    ruralFatalities: 80,
    reportYear: 2024,
    sourceLabel: "FARS 2024 Annual Report File",
  },

  // Source: BLS Census of Fatal Occupational Injuries — Wyoming 2023, as
  // published in Wyoming DWS / R&P CFOI Table A-1 (total 45; transportation
  // incidents are the dominant event at 30, two-thirds of all deaths).
  // Falls/slips/trips is suppressed in the Wyoming state breakout — left at 0.
  workplaceStats: {
    totalEmployment: 0, // not separately ingested for Wyoming
    qcewCoveredEmployment: 0,
    totalWorkplaceFatalities: 45,
    constructionFatalities: 3,
    constructionPctTotal: 6.7,
    transportWarehouseFatalities: 13,
    truckTransportFatalities: 13,
    fallsSlipsTrips: 0, // suppressed in Wyoming CFOI state event breakout
    transportationIncidents: 30,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 2024 1-year estimates (via Census Reporter).
  // driveAlone = B08006 drove-alone / total workers (214,082 / 294,920 = 72.6%).
  // avgCommuteMinutes = B08013 aggregate / B08303 commuters
  // (5,235,475 / 266,241 = 19.7 min). nationalAvg is the house baseline.
  commuteStats: {
    driveAlone: 72.6,
    nationalAvg: 68.7,
    avgCommuteMinutes: 19.7,
  },

  competitiveData: wyomingCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Wyoming — combining FARS crash data, workplace fatality data, demographics, and market opportunity signals across the Casper-Riverton and Cheyenne-Scottsbluff markets. Wyoming is the least-populous state (~585K), with vast rural distances, long EMS response times, and heavy energy-sector truck traffic on I-80 and I-25.",

    legalLandscape:
      "Wyoming follows modified comparative negligence with a 51% bar (Wyo. Stat. § 1-1-109): a plaintiff who is 51% or more at fault is barred from recovery, while a plaintiff at 50% or less recovers with damages reduced by their share of fault. The personal injury statute of limitations is four years from the date of injury (Wyo. Stat. § 1-3-105), one of the longer PI windows in the country. Wyoming is an at-fault (tort) state for auto claims. Critically, the Wyoming Constitution bars statutory caps on damages, so there is no cap on non-economic damages in standard PI cases — full general damages are recoverable, which raises the ceiling on case value relative to cap states.",

    autoAudience:
      "Wyoming's fatal-crash exposure is dominated by long-distance interstate travel. I-80 crosses the southern third of the state east-to-west — a high-volume cross-country freight route — and I-25 runs north-to-south through Cheyenne and Casper. Drive-alone commuting (72.6%) exceeds the national average (68.7%), and average commute time is short (19.7 minutes), reflecting small population centers separated by open highway. Of 107 traffic fatalities in 2024, 80 (75%) occurred on rural roads, underscoring that the case base sits along the interstate and US-highway corridors, not in dense metros. Alcohol-related crashes accounted for roughly 28% of fatalities (30).",

    truckAudience:
      "Wyoming is an energy-sector and freight state, and heavy-truck exposure is its defining commercial-vehicle signal. I-80 across southern Wyoming is one of the busiest long-haul freight corridors in the Mountain West, and oil, gas, and coal extraction in the Powder River Basin and the Green River area generate constant heavy-truck movement on two-lane US highways. Transportation incidents were the single largest cause of workplace death in Wyoming in 2023 (30 of 45 fatalities, two-thirds of the total), and all 13 transportation-and-warehousing deaths were in truck transportation. Trucking PI cases here frequently involve interstate carriers with multi-state insurance structures, and crash sites are often remote with delayed EMS response — facts that materially affect injury severity and damages.",

    constructionAudience:
      "Construction is a smaller share of Wyoming's workplace-fatality picture (3 of 45 fatalities in 2023, about 6.7%) than energy extraction and transportation. Third-party liability — a non-employer at fault on a job site — is the primary recovery path where workers' compensation limits a direct claim against the employer. Energy-sector and pipeline construction along the I-80 and Powder River Basin corridors is the most relevant subsegment for plaintiff firms.",

    ruralUrbanContext:
      "Wyoming is overwhelmingly rural: 80 of 107 traffic fatalities in 2024 (75%) occurred on rural roads, versus 27 in urban areas. Vast distances between population centers mean long EMS response times, which tends to increase injury severity and fatality rates per crash. Broadband penetration is uneven across the state's rural counties, so digital-only campaigns underreach the very corridors (I-80, I-25, and the US-highway network) where the fatal-crash base sits. Local radio, outdoor advertising along the interstates, and community media are necessary complements for plaintiff firms targeting non-metro Wyoming.",

    marketSaturationTitle: "In-State Markets vs. Out-of-State DMA Spillover",
    marketSaturationTip:
      "Wyoming has no large metro and is split across several DMAs. Casper-Riverton and Cheyenne-Scottsbluff are the in-state markets, but the state's edges fall into the Denver, Salt Lake City, and Billings DMAs — meaning a meaningful share of Wyoming households consume out-of-state TV and radio, and out-of-state firms advertising in those metros reach Wyoming residents incidentally. Plaintiff firms should weigh in-state buys (Casper, Cheyenne) against geo-targeted digital and corridor outdoor that can reach residents the spillover DMAs miss.",

    freightCorridorTitle: "I-80 / I-25 Energy & Freight Corridors",
    freightCorridorTip:
      "I-80 across southern Wyoming is a primary long-haul freight artery linking the Midwest to Salt Lake City and the West Coast, and I-25 carries north-south traffic through Cheyenne and Casper. Energy extraction in the Powder River Basin and the southwest gas fields adds heavy-truck volume on rural US highways. Trucking PI cases on these corridors commonly involve out-of-state interstate carriers with complex venue and multi-state insurance questions, and remote crash locations with delayed emergency response.",

    solUrgencyTitle: "4-Year SOL — A Longer Window, But Evidence Still Degrades",
    solUrgencyTip:
      "Wyoming's 4-year personal injury statute of limitations (Wyo. Stat. § 1-3-105) is longer than most states, which can lull clients and firms into delaying intake. The longer window does not slow evidence decay: remote rural crash scenes are cleared quickly, commercial-vehicle telematics and driver logs are subject to carrier retention schedules, and witness availability fades. Claims against governmental entities carry separate, much shorter notice requirements. Early intake and evidence preservation still protect case value even with the longer SOL.",

    internetAccessTitle: "Rural Connectivity Gap Along the Highway Corridors",
    internetAccessTip:
      "Wyoming's rural counties have uneven broadband penetration, and the population is dispersed along the I-80, I-25, and US-highway network rather than concentrated in a metro. Digital-only campaigns underreach these corridors, which is exactly where the rural fatal-crash base (75% of 2024 fatalities) sits. Local radio, interstate outdoor, and community partnerships are necessary channels to reach injured residents and families outside Casper and Cheyenne.",

    outOfStateTitle: "Out-of-State Travelers on I-80 & National-Park Tourism",
    outOfStateTip:
      "I-80 carries heavy out-of-state through-traffic, and Yellowstone, Grand Teton, and the state's recreation areas draw large numbers of out-of-state visitors. Travelers injured in Wyoming often do not know local PI attorneys or that Wyoming has a 4-year SOL and no cap on non-economic damages. Geo-fenced digital along the I-80 corridor and near park gateways, plus partnerships with lodging and travel services, can capture these cases before visitors engage out-of-state counsel.",

    footerSourcesLabel:
      "FARS 2024 Annual Report File; BLS Census of Fatal Occupational Injuries (Wyoming, 2023); U.S. Census ACS 2024 1-year estimates",
  },

  features: {
    showWorkplaceSection: true,
  },

  // No injuryData yet; Wyoming has no state-specific deep crash table integrated.
};
