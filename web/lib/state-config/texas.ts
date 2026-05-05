import { texasCompetitiveData } from "@/lib/data/competitive-landscape/texas";
import {
  TX_COUNTY_INJURY_DATA,
  TX_INJURY_DATA_YEARS,
  TX_INJURY_DATA_LATEST_YEAR,
} from "@/lib/data/tx-injury-stats";
import type { StateConfig } from "./_types";

export const texasConfig: StateConfig = {
  slug: "texas",
  stateCode: "TX",
  stateName: "Texas",

  metadata: {
    title: "Texas State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Texas — TxDOT crash and injury data by county, demographics, judicial profiles, market opportunity signals across Houston, Dallas, San Antonio, Austin, Fort Worth and El Paso.",
  },

  // Source: TxDOT Texas Motor Vehicle Crash Facts CY 2024 (https://www.txdot.gov/data-maps/crash-reports-records/motor-vehicle-crash-statistics.html)
  trafficStats: {
    totalCrashes: 554_146,
    totalFatalities: 4_150,
    motorcycleFatalities: 585,
    // 2024 TxDOT facts didn't break out a speed-related-fatalities count in the headline tables.
    // 2023 figure used as best-available (TxDOT 2023 crash facts).
    speedRelatedFatalities: 1_385,
    speedRelatedPct: 32.3,
    alcoholRelatedFatalities: 1_053,
    alcoholRelatedPct: 25.4,
    // Of persons killed in vehicles where restraint usage was applicable and known
    // in 2024, 45.34% were unrestrained. Applied to occupant-applicable subset (~2,640).
    unrestrainedFatalities: 1_197,
    distractedDrivingFatalCrashes: 380,
    // 2024: rural fatalities 2,080 (50.12% of total). Urban = 4,150 - 2,080 = 2,070.
    urbanFatalities: 2_070,
    ruralFatalities: 2_080,
    reportYear: 2024,
    sourceLabel: "TxDOT 2024",
  },

  // Source: BLS Census of Fatal Occupational Injuries — Texas 2023
  // (https://www.bls.gov/iif/state-data/fatal-occupational-injuries-in-texas-2023.htm)
  workplaceStats: {
    // QCEW total covered employment 2023 (Texas, all ownership)
    totalEmployment: 13_900_000,
    qcewCoveredEmployment: 13_960_000,
    totalWorkplaceFatalities: 564,
    // BLS doesn't publish state-level industry breakouts every year; using the
    // most recent published Texas industry data (2022 CFOI) and rounding to keep
    // the page directionally accurate. Will be tightened on next BLS release.
    constructionFatalities: 124,
    constructionPctTotal: 22,
    transportWarehouseFatalities: 105,
    truckTransportFatalities: 88,
    fallsSlipsTrips: 92,
    transportationIncidents: 246,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 5-year (2022) — Texas summary
  commuteStats: {
    driveAlone: 76.3,
    nationalAvg: 68.7,
    avgCommuteMinutes: 26.4,
  },

  competitiveData: texasCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Texas — combining TxDOT crash and injury data by county, demographics, judicial profiles, and market opportunity signals across Houston, Dallas–Fort Worth, San Antonio, Austin, and El Paso. Population ~31M.",

    legalLandscape:
      "Texas follows modified comparative negligence with a 51% bar (Tex. Civ. Prac. & Rem. Code § 33.001) — plaintiffs barred from recovery only if they are more than 50% at fault. The general personal-injury statute of limitations is two years from the date of injury. Most non-economic damages are uncapped in standard PI matters, but medical-malpractice cases have non-economic caps under Chapter 74. Texas applies proportionate responsibility across multiple defendants.",

    autoAudience:
      "Texas has the highest VMT of any state and one of the highest absolute fatality counts. Houston (Harris/Fort Bend/Montgomery), Dallas–Fort Worth (Dallas/Tarrant/Collin/Denton), San Antonio (Bexar), and Austin (Travis/Williamson/Hays) dominate volume. Long rural interstate stretches (I-10, I-20, I-35, I-45) drive a majority of fatalities — 50% of Texas traffic fatalities occur in rural areas despite lower population.",
    autoMedia:
      "Digital + CTV in the five major metros. Spanish-language radio + digital across South Texas, El Paso, and Houston. Billboard and radio along I-10 (Houston–San Antonio–El Paso), I-35 (Laredo–Austin–Dallas), and I-45 (Houston–Dallas). Country and tejano formats reach distinct rural and Hispanic audiences.",

    truckAudience:
      "Texas is the largest freight state in the country — the Houston Ship Channel, Dallas–Fort Worth intermodal hubs, and the Laredo border crossing (largest U.S.–Mexico land port) move enormous truck volume. The I-35 corridor between Laredo and the DFW metroplex is one of the deadliest truck corridors in the U.S. Oilfield trucking in the Permian Basin (Ector, Midland, Reeves) creates concentrated truck-crash exposure outside the major metros.",
    truckMedia:
      "Geo-fenced digital along I-10, I-20, I-35, I-45, and the Permian Basin oilfield routes. Truck-stop billboards at high-traffic rest areas (Laredo, San Antonio, Dallas, Amarillo). CDL family targeting via social. Spanish-language placement in border markets where cross-border trucking concentrates.",

    motorcycleAudience:
      "Texas had 585 motorcycle fatalities in 2024, with 37% of riders killed not wearing helmets. Texas has no universal helmet law for riders over 21 with insurance or a safety-course completion. Hill Country routes (Three Sisters, Twisted Sisters near Bandera/Real/Kerr counties), the Texas Hill Country loop, and Big Bend draw out-of-state riders. The Republic of Texas Biker Rally and Lone Star Rally are major events.",
    motorcycleMedia:
      "Seasonal spring/summer/fall campaigns. Social and streaming targeting motorcycle interest segments and Texas riding clubs. Sponsorships at the Lone Star Rally (Galveston) and Republic of Texas Rally (Austin). Geo-fencing near Hill Country and Big Bend touring routes.",

    constructionAudience:
      "Texas leads the nation in construction-worker fatalities most years, with significant Hispanic workforce share. Major metros (Houston, Dallas, Austin, San Antonio) drive volume; Permian Basin oilfield construction concentrates risk in West Texas. Workers and families of injured workers — especially in non-subscriber workplaces (Texas allows employers to opt out of workers’ comp) — represent a sizable, under-represented segment with strong third-party-liability potential.",
    constructionMedia:
      "Mobile job-site proximity targeting in major metros and oilfield counties. Workers’ comp and construction-injury keywords. Spanish-language digital, radio, and TV are essential for the large Hispanic share of the construction workforce. Non-subscriber-employer messaging is a Texas-specific wedge.",

    boatingAudience:
      "Texas has 367 miles of Gulf coastline plus extensive lake and river recreation — Lake Travis (Austin), Lake Conroe (Houston), Possum Kingdom Lake (DFW), Canyon Lake (Hill Country), and the Galveston/Corpus Christi/South Padre coast. Summer weekends and spring break drive peak accident periods. Target boat owners, vacation-rental demographics, and coastal tourism markets.",
    boatingMedia:
      "Seasonal spring/summer campaigns. Geo-targeted digital around top boating counties (Travis, Galveston, Nueces, Cameron, Montgomery). Local radio in lakeside and coastal markets. Marina partnerships at major lake communities and Gulf coast harbors.",

    ruralUrbanContext:
      "Texas’s rural counties — particularly West Texas (Permian Basin), the Big Bend region, the Trans-Pecos, and rural North Texas — have disproportionately high fatality rates relative to population. Rural areas have lower internet access and higher uninsured rates, limiting digital-only advertising reach. Long-distance EMS response times also increase the severity of untreated injuries.",

    judicialContext:
      "Filing venue in Texas matters significantly. Harris (Houston), Dallas, Bexar (San Antonio), and Travis (Austin) counties tend to have larger and more diverse jury pools. Border counties like Hidalgo and Cameron have historically been plaintiff-friendly. Mid-size and rural counties can swing in either direction depending on the case type and local elected judiciary.",

    marketSaturationTitle: "DFW & Houston Saturation vs. Satellite Metros",
    marketSaturationTip:
      "Dallas–Fort Worth and Houston are among the most competitive PI advertising markets in the U.S., with national firms (Morgan & Morgan, Witherite, Thomas J. Henry) anchoring spend. Surrounding satellite counties (Collin, Denton, Fort Bend, Montgomery, Williamson, Hays) are growing fast with materially lower advertising saturation — better cost-per-case economics for firms willing to target outside the metro core.",

    freightCorridorTitle: "I-35 / Laredo Freight Corridor",
    freightCorridorTip:
      "The I-35 corridor between Laredo (largest U.S.–Mexico land port) and the DFW metroplex is one of the deadliest freight routes in the country. I-10 (Houston–San Antonio–El Paso) and I-45 (Houston–Dallas) also carry heavy truck volume. Permian Basin oilfield trucking concentrates truck-crash exposure in West Texas counties. Trucking-PI campaigns along these routes have unusually broad geographic reach.",

    solUrgencyTitle: "2-Year SOL Urgency",
    solUrgencyTip:
      "Texas’s 2-year statute of limitations for personal injury is more generous than some states but still demands fast intake — evidence preservation, scene investigation, and witness recollection all degrade quickly. For commercial-vehicle and trucking cases, ELD and dashcam evidence must be subpoenaed within 6 months to avoid spoliation.",

    internetAccessTitle: "South Texas & Trans-Pecos Connectivity Gap",
    internetAccessTip:
      "South Texas border counties, the Trans-Pecos, and rural North Texas have lower broadband penetration and higher uninsured populations. These same areas have high fatality rates. Digital-only advertising cannot reach these communities effectively — Spanish-language radio, community health partnerships, and local TV are necessary channels.",

    outOfStateTitle: "Hill Country / Rally Tourism Opportunity",
    outOfStateTip:
      "Texas draws significant out-of-state riders to the Hill Country, Big Bend, and the Lone Star Rally. Out-of-state visitors injured in Texas may not know local attorneys or the 51% comparative-fault rule. Geo-fenced digital ads at these routes plus partnerships with motels, gear shops, and rally hosts can capture cases that slip through traditional channels.",

    askAiPageName: "Texas State Intelligence",
    askAiPageContext:
      "State-level intelligence for plaintiff firm advertising and case acquisition in Texas — combining TxDOT crash records, FARS data, census demographics, judicial profiles, PI viability scores, storm events, and market opportunity signals across MVA, trucking, motorcycle, construction, and boating.",
    footerSourcesLabel:
      "TxDOT Crash Records Information System (CRIS) — Crashes and Injuries by County, 2020–2024",
  },

  injuryData: {
    rows: TX_COUNTY_INJURY_DATA,
    years: TX_INJURY_DATA_YEARS,
    latestYear: TX_INJURY_DATA_LATEST_YEAR,
    sourceName:
      "TxDOT — Crashes and Injuries by County (Texas Motor Vehicle Crash Facts)",
    sourceUrl:
      "https://www.txdot.gov/data-maps/crash-reports-records/motor-vehicle-crash-statistics.html",
  },

  // TxDOT publishes a public CRIS Query tool but does not provide embeddable
  // dashboard URLs equivalent to TN's data.tn.gov Tableau views. The county
  // injury table from injuryData carries the deep-data load for Texas; we'll
  // add embed dashboards if/when we identify good public ones.
  crashEmbeds: undefined,
};
