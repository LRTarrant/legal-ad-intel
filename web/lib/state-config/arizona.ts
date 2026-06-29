import { arizonaCompetitiveData } from "@/lib/data/competitive-landscape/arizona";
import type { StateConfig } from "./_types";

export const arizonaConfig: StateConfig = {
  slug: "arizona",
  stateCode: "AZ",
  stateName: "Arizona",

  metadata: {
    title: "Arizona State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Arizona — accident data, demographics, judicial profiles, and market opportunity signals.",
  },

  trafficStats: {
    totalCrashes: 122_247,
    totalFatalities: 1_307,
    motorcycleFatalities: 258,
    speedRelatedFatalities: 446,
    speedRelatedPct: 34.1,
    alcoholRelatedFatalities: 332,
    alcoholRelatedPct: 25.4,
    unrestrainedFatalities: 361,
    distractedDrivingFatalCrashes: 62,
    urbanFatalities: 853,
    ruralFatalities: 454,
    reportYear: 2023,
    sourceLabel: "ADOT Motor Vehicle Crash Facts 2023",
    // Optional bespoke metric (AZ moto story) — surfaced in the Motorcycle Boom insight.
    registeredMotorcycles: 279_569,
  },

  workplaceStats: {
    totalEmployment: 3_129_720,
    qcewCoveredEmployment: 3_143_100,
    totalWorkplaceFatalities: 103,
    constructionFatalities: 26,
    constructionPctTotal: 25,
    transportWarehouseFatalities: 30,
    truckTransportFatalities: 24,
    fallsSlipsTrips: 19,
    transportationIncidents: 42,
    reportYear: 2023,
    // Optional bespoke metrics (AZ Hispanic-workforce story).
    hispanicWorkerFatalities: 48,
    hispanicWorkerFatalitySharePct: 47,
  },

  commuteStats: {
    driveAlone: 67.5,
    nationalAvg: 68.7,
    avgCommuteMinutes: 26,
  },

  competitiveData: arizonaCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Arizona — combining accident data, demographics, judicial profiles, and market opportunity signals across MVA, trucking, motorcycle, construction, and boating. Major metros: Phoenix, Tucson, Prescott, and Flagstaff. Population ~7.4M, 31% Hispanic.",

    legalLandscape:
      "Arizona follows pure comparative negligence — plaintiffs can recover damages even if they are 99% at fault (reduced by their percentage of fault). Combined with no caps on non-economic or medical malpractice damages (a state-constitutional protection), Arizona is one of the more plaintiff-friendly states in the Southwest. The 2-year statute of limitations is standard but requires timely case acquisition.",

    // Verdict-card one-liner (the legacy "PI Viability Deep Dive" paragraph's
    // fuller story lives in `legalLandscape` + the cross-signal insights).
    viabilityNote:
      "Pure comparative negligence with no non-economic or med-mal caps — among the Southwest's most plaintiff-friendly states; standard 2-year SOL.",

    autoAudience:
      "Phoenix metro dominates volume — Maricopa County is roughly 51% of all fatal crashes. Target ages 25–44. Speed is the #1 contributing factor at 34.1% — messaging around speed-related crashes resonates. Rural corridors on I-10, I-17, and I-40 carry disproportionate fatality rates.",
    autoMedia:
      "Digital + CTV in Phoenix/Tucson metros. Billboard and radio along I-10 (Phoenix–Tucson corridor), I-17 (Phoenix–Flagstaff), and I-40 (Flagstaff–Kingman). Spanish-language media is critical — 31% Hispanic population statewide, 65% in Yuma County.",

    truckAudience:
      "Arizona is a major freight corridor connecting California ports to the rest of the Southwest. I-10 (Phoenix–Tucson–CA border), I-40 (Flagstaff–Kingman–CA border), and I-17 (Phoenix–Flagstaff) are primary trucking routes. La Paz County's extreme truck death rate (46 deaths, population 16,664) reflects I-10 through-traffic.",
    truckMedia:
      "Geo-fenced digital ads along I-10 and I-40 corridors. Truck-stop billboards at major rest areas. Target CDL-holder families and passenger-vehicle occupants struck by trucks.",

    motorcycleAudience:
      "Arizona is a premier motorcycle state — near year-round riding weather, 279,569 registrations (up 33% since 2019), and the highest motorcycle fatality count in 20 years. Target males 35–64, motorcycle-enthusiast interests, and Maricopa/Pima counties for volume.",
    motorcycleMedia:
      "Seasonal campaigns are less critical than other states — Arizona has year-round riding. Social media + streaming targeting motorcycle interests. Event sponsorship (Arizona Bike Week). Digital geo-fencing near popular riding routes (Carefree Highway, Apache Trail, Route 66).",

    constructionAudience:
      "Arizona's construction boom (driven by semiconductor fabs, housing, and infrastructure) creates a large at-risk workforce. 47% of all workplace fatalities are Hispanic workers — Spanish-language legal advertising is underserved and high-opportunity. Target construction workers, their families, and workers' comp attorneys.",
    constructionMedia:
      "Spanish-language radio and digital are essential — target Univision, Telemundo, and Spanish-language social media. Job-site proximity targeting via mobile. Workers' comp and construction-injury keywords in Phoenix, Tucson, and Chandler (the semiconductor corridor).",

    boatingAudience:
      "Mohave County dominates with 51% of all boating accidents — the Lake Havasu / Colorado River recreation corridor is one of the busiest waterway systems in the Southwest. Spring break and summer holidays drive peak accident periods. Target boating enthusiasts, lake-house vacation demographics, and Havasu/Parker visitors.",
    boatingMedia:
      "Seasonal spring/summer campaigns. Geo-targeted digital around Lake Havasu City, Parker, and Lake Pleasant. Local radio in Mohave and Maricopa counties. Marina signage and outfitter partnerships.",

    ruralUrbanContext:
      "Arizona's northeastern counties — overlapping with the Navajo Nation — have the lowest internet access and highest uninsured rates in the state, yet high fatal-crash counts (191 in Navajo County, 144 in Apache). Rural fatality rates run well above the urban Phoenix/Tucson cores despite far lower population.",

    judicialContext:
      "Maricopa County (Phoenix) and Pima County (Tucson) are the two largest population centers and dominate filing volume. Judicial leanings vary between the urban cores and the rural northern and border counties — venue selection matters.",

    askAiPageName: "Arizona State Intelligence",
    askAiPageContext:
      "State-level intelligence for plaintiff firm advertising and case acquisition in Arizona — combining FARS accident data, census demographics, judicial profiles, PI viability scores, storm events, cancer incidence, and market opportunity signals across MVA, trucking, motorcycle, construction, and boating.",
    footerSourcesLabel:
      "FARS (NHTSA), ADOT Motor Vehicle Crash Facts 2023, ACS 5-Year Estimates, BLS OES/CFOI, NOAA Storm Events, USCG Boating Accidents, Judicial Profile Data",

    // Bespoke Cross-Signal Insight cards (ported from the legacy page; first real
    // prod exercise of the customInsights[] renderer shipped in #515).
    customInsights: [
      {
        icon: "🔥",
        tone: "red",
        title: "Heat Is Arizona's Silent Killer — And a Legal Opportunity",
        stats: [
          { label: "NOAA storm/heat deaths", value: "2,519" },
          { label: "National rank", value: "#1 heat-related deaths" },
        ],
        body: "Extreme-heat deaths create wrongful-death and premises-liability opportunities — outdoor workers, nursing-home residents, and homeless individuals are at highest risk. Heat-related workplace deaths (construction, agriculture, landscaping) are a growing litigation area. Time campaigns to May–September, when Phoenix temperatures exceed 110°F.",
      },
      {
        icon: "🚛",
        tone: "teal",
        title: "La Paz County: The I-10 Death Corridor",
        stats: [
          { label: "Population", value: "16,664" },
          { label: "Fatal crashes / deaths", value: "90 / 111" },
          { label: "Large-truck deaths", value: "46" },
          { label: "Per-capita fatality rate", value: "~666 per 100K" },
        ],
        body: "La Paz County's extreme fatality rate is driven entirely by I-10 through-traffic between Phoenix and Los Angeles — a corridor issue, not a local-population one. Truck-accident firms should geo-target this stretch of I-10 with billboard and digital. The cases involve out-of-state defendants and complex multi-jurisdiction litigation.",
      },
      {
        icon: "👷",
        tone: "amber",
        title: "Hispanic Workforce: Underserved Legal Market",
        stats: [
          { label: "Hispanic population", value: "31.1% (Yuma 64.9%, Santa Cruz 82.5%)" },
          { label: "Share of workplace fatalities", value: "47% Hispanic workers" },
          { label: "Deadliest industry", value: "Construction (26 deaths, 25%)" },
        ],
        body: "Nearly half of Arizona's workplace fatalities are Hispanic workers, heavily concentrated in construction. Spanish-language legal advertising for workers' comp and construction injury is dramatically underserved relative to the need. Firms investing in Spanish-language intake, community outreach, and culturally relevant advertising will capture a disproportionate share of this market.",
      },
      {
        icon: "🏍️",
        tone: "emerald",
        title: "The Motorcycle Boom: 33% More Registrations, Record Deaths",
        stats: [
          { label: "Registrations since 2019", value: "+33% (279,569)" },
          { label: "2023 motorcycle fatalities", value: "258 (20-year high)" },
          { label: "Maricopa County share", value: "57% of moto deaths" },
        ],
        body: "Arizona's year-round riding weather and rapid population growth have fueled a motorcycle boom, but infrastructure and driver awareness haven't kept pace — motorcycle deaths hit a 20-year high. This is a sustained opportunity, not a seasonal one. Target motorcycle injury with always-on digital in the Phoenix metro, not just spring/summer bursts.",
      },
      {
        icon: "📍",
        tone: "red",
        title: "Navajo and Apache Counties: The Connectivity Gap",
        stats: [
          { label: "Navajo", value: "20% poverty · 15.9% uninsured · 74.2% internet" },
          { label: "Apache", value: "25.1% poverty · 18.2% uninsured · 60% internet" },
          { label: "Fatal crashes", value: "Navajo 191 · Apache 144" },
        ],
        body: "Arizona's northeastern counties — overlapping with the Navajo Nation — have the lowest internet access and highest uninsured rates in the state. Digital advertising alone cannot reach these communities. Radio, community health centers, and tribal outreach are necessary channels. Legal services are severely underrepresented despite high accident rates.",
      },
    ],
  },
};
