import { tennesseeCompetitiveData } from "@/lib/data/competitive-landscape/tennessee";
import {
  TN_COUNTY_INJURY_DATA,
  TN_INJURY_DATA_YEARS,
  TN_INJURY_DATA_LATEST_YEAR,
} from "@/lib/data/tn-injury-stats";
import type { StateConfig } from "./_types";

export const tennesseeConfig: StateConfig = {
  slug: "tennessee",
  stateCode: "TN",
  stateName: "Tennessee",

  metadata: {
    title: "Tennessee State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Tennessee — accident data, demographics, judicial profiles, TN Safety crash dashboards, and market opportunity signals.",
  },

  trafficStats: {
    totalCrashes: 212_780,
    totalFatalities: 1_299,
    motorcycleFatalities: 186,
    speedRelatedFatalities: 344,
    speedRelatedPct: 26.5,
    alcoholRelatedFatalities: 345,
    alcoholRelatedPct: 26.6,
    unrestrainedFatalities: 397,
    distractedDrivingFatalCrashes: 54,
    urbanFatalities: 706,
    ruralFatalities: 593,
    reportYear: 2024,
    sourceLabel: "TDOSHS 2024",
  },

  workplaceStats: {
    totalEmployment: 3_064_770,
    qcewCoveredEmployment: 3_082_000,
    totalWorkplaceFatalities: 128,
    constructionFatalities: 24,
    constructionPctTotal: 19,
    transportWarehouseFatalities: 35,
    truckTransportFatalities: 28,
    fallsSlipsTrips: 17,
    transportationIncidents: 55,
    reportYear: 2023,
  },

  commuteStats: {
    driveAlone: 79.8,
    nationalAvg: 68.7,
    avgCommuteMinutes: 26,
  },

  competitiveData: tennesseeCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Tennessee — combining accident data, demographics, judicial profiles, TN Safety crash dashboards, and market opportunity signals across MVA, trucking, motorcycle, construction, and boating. Major metros: Nashville, Memphis, Knoxville, and Chattanooga. Population ~7.1M.",

    legalLandscape:
      "Tennessee follows modified comparative negligence with a 49% bar — plaintiffs who are 50% or more at fault are barred from recovery. Tennessee caps non-economic damages in most PI cases and has specific caps on punitive damages. The 1-year statute of limitations is among the shortest in the nation and requires aggressive, timely case acquisition.",

    autoAudience:
      "Nashville metro (Davidson, Williamson, Rutherford) dominates volume. Memphis (Shelby County) is the second largest market. I-40 corridor across the state and I-24 (Nashville-Chattanooga) are high-fatality routes. Tennessee’s 79.8% drive-alone commute rate exceeds the national average, generating high exposure.",
    autoMedia:
      "Digital + CTV in Nashville and Memphis metros. Billboard and radio along I-40 (Memphis-Nashville-Knoxville), I-24 (Nashville-Chattanooga), and I-65 (Nashville-Alabama border). Country music radio is an efficient reach vehicle in Middle Tennessee.",

    truckAudience:
      "Tennessee is a major freight hub — Nashville, Memphis (FedEx), and Chattanooga sit at the intersection of I-40, I-65, I-24, and I-75. Memphis is one of the largest logistics centers in the country. Rural stretches of I-40 between Nashville and Knoxville see heavy truck traffic and disproportionate fatalities.",
    truckMedia:
      "Geo-fenced digital ads along I-40 and I-65 corridors. Truck stop billboards at major rest areas. Target CDL holder families and passenger vehicle occupants struck by trucks. Memphis market reaches into Mississippi and Arkansas.",

    motorcycleAudience:
      "Tennessee is a top motorcycle tourism state — the Tail of the Dragon (US-129) and Natchez Trace Parkway draw riders nationally. Davidson and Shelby counties lead in volume, while East Tennessee mountain roads see higher severity crashes. Tennessee has no helmet law for riders over 21.",
    motorcycleMedia:
      "Seasonal spring/summer campaigns during peak riding season. Social media + streaming targeting motorcycle interests. Events sponsorship (motorcycle rallies). Digital geo-fencing near popular riding routes in the Smoky Mountains and along the Natchez Trace.",

    constructionAudience:
      "Nashville’s construction boom (driven by healthcare, hospitality, and residential growth) creates a large at-risk workforce. Chattanooga and Knoxville are also experiencing significant development. Target construction workers, their families, and workers’ comp attorneys.",
    constructionMedia:
      "Job site proximity targeting via mobile in Nashville, Knoxville, and Chattanooga. Workers’ comp and construction injury keywords. Spanish-language digital and radio for growing Hispanic workforce in Middle Tennessee construction.",

    boatingAudience:
      "Tennessee has extensive lake and river recreation — including Kentucky Lake, Norris Lake, Center Hill Lake, and the Tennessee River system. Summer weekends drive peak accident periods. Target boating enthusiasts and lake house vacation demographics.",
    boatingMedia:
      "Seasonal spring/summer campaigns. Geo-targeted digital around major lake communities. Local radio in lakeside counties. Marina signage and outfitter partnerships.",

    ruralUrbanContext:
      "Tennessee’s rural counties have disproportionately high fatality rates despite lower total crash counts. Rural areas — especially in Appalachian East Tennessee — have lower internet access and higher uninsured rates, limiting digital-only advertising reach and increasing the severity of untreated injuries.",

    judicialContext:
      "Davidson County (Nashville) and Shelby County (Memphis) are the two largest population centers. Filing venue selection in Tennessee matters — judicial leanings can vary significantly between urban and rural counties.",

    marketSaturationTitle: "Nashville PI Market Saturation",
    marketSaturationTip:
      "Nashville’s rapid population growth (+21% since 2010) has attracted national PI firms (Morgan & Morgan, Cellino), creating one of the most competitive advertising markets in the Southeast. However, surrounding counties (Williamson, Rutherford, Wilson) are growing even faster with less advertising saturation. Satellite-metro targeting offers better cost-per-case economics.",

    freightCorridorTitle: "Memphis Freight Corridor",
    freightCorridorTip:
      "Memphis is home to FedEx’s global hub, making it one of the busiest freight corridors in the U.S. I-40 and I-55 through Shelby County see extreme truck traffic volumes. Combined with cross-state reach into Mississippi and Arkansas, Memphis-market truck accident campaigns have unusually broad geographic impact.",

    solUrgencyTitle: "1-Year SOL Urgency",
    solUrgencyTip:
      "Tennessee’s 1-year statute of limitations for personal injury is among the shortest in the nation. This creates both a challenge and an opportunity: firms with fast intake pipelines and immediate digital response capabilities can capture cases that slower competitors miss. Time-sensitive messaging (\u201CAct now — Tennessee’s filing deadline is only 1 year\u201D) resonates strongly.",

    internetAccessTitle: "Appalachian Connectivity Gap",
    internetAccessTip:
      "East Tennessee’s Appalachian counties have lower internet access rates and higher uninsured populations. These areas also have high fatality rates on mountain roads. Digital-only advertising cannot reach these communities effectively. Radio, community health centers, and local TV are necessary channels for plaintiff firm outreach in the Smokies corridor.",

    outOfStateTitle: "Motorcycle Tourism Opportunity",
    outOfStateTip:
      "The Tail of the Dragon (US-129, 318 curves in 11 miles) and the Cherohala Skyway draw motorcycle tourists from across the country. Out-of-state riders injured in Tennessee may not know local attorneys. Geo-fenced digital ads at these routes plus partnerships with motorcycle-adjacent businesses (hotels, gear shops) can capture cases from this unique tourism segment.",

    askAiPageName: "Tennessee State Intelligence",
    askAiPageContext:
      "State-level intelligence for plaintiff firm advertising and case acquisition in Tennessee — combining FARS accident data, census demographics, judicial profiles, PI viability scores, storm events, TN Safety crash dashboards, and market opportunity signals across MVA, trucking, motorcycle, construction, and boating.",
    footerSourcesLabel: "TN Dept. of Safety & Homeland Security Crash Dashboards",
  },

  injuryData: {
    rows: TN_COUNTY_INJURY_DATA,
    years: TN_INJURY_DATA_YEARS,
    latestYear: TN_INJURY_DATA_LATEST_YEAR,
    sourceName: "Tennessee Department of Safety & Homeland Security — TITAN",
    sourceUrl: "https://data.tn.gov/",
  },

  crashEmbeds: [
    {
      name: "Fatal & Serious Injury Crashes",
      iframeSrc:
        "https://data.tn.gov/t/Public/views/FatalandSeriousInjuryPublic/FSIC_dashboard?iframeSizedToWindow=true&:embed=y&:showAppBanner=false&:display_count=no&:showVizHome=no&:toolbar=no",
      height: 2000,
      description:
        "Statewide fatal and serious injury crashes by county, route, and time period. Updated continuously by the Tennessee Department of Safety & Homeland Security.",
    },
    {
      name: "Recent Crashes",
      iframeSrc:
        "https://data.tn.gov/t/Public/views/RecentCrashes/RecentCrashes?:showAppBanner=false&:display_count=n&:showVizHome=n&:origin=viz_share_link&:toolbar=no&:embed=yes",
      height: 4500,
      description: "Most recent reported crashes statewide.",
    },
    {
      name: "Traffic Fatality Trends",
      iframeSrc:
        "https://data.tn.gov/t/Public/views/TN_Traffic_Fatality/TTF_dashboard?iframeSizedToWindow=true&:embed=y&:showAppBanner=false&:display_count=no&:showVizHome=no&:toolbar=no",
      height: 3100,
      description: "Historic and trending traffic fatality data.",
    },
  ],
};
