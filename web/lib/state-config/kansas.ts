import { kansasCompetitiveData } from "@/lib/data/competitive-landscape/kansas";
import type { StateConfig } from "./_types";

export const kansasConfig: StateConfig = {
  slug: "kansas",
  stateCode: "KS",
  stateName: "Kansas",

  metadata: {
    title: "Kansas State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Kansas — combining FARS crash and fatality data, demographics, judicial profiles, and market opportunity signals across Wichita, the Kansas City metro (eastern Kansas), Topeka, and southeast Kansas.",
  },

  // Fatality fields: FARS 2024 Annual Report File. totalCrashes is not a FARS
  // figure and no citable Kansas DOT 2024 total-crash count was
  // verified, so it is set to 0 rather than fabricated. urban/rural split is
  // from FARS 2024. motorcycle and speed fatalities are not in the
  // FARS release and no citable KDOT 2024 figure was found → null.
  trafficStats: {
    totalCrashes: 0,
    totalFatalities: 339,
    motorcycleFatalities: null,
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 120,
    alcoholRelatedPct: 35.4,
    unrestrainedFatalities: 0,
    distractedDrivingFatalCrashes: 0,
    urbanFatalities: 152,
    ruralFatalities: 186,
    reportYear: 2024,
    sourceLabel: "FARS 2024 Annual Report File",
  },

  // Source: BLS Census of Fatal Occupational Injuries — Kansas 2023 (released
  // 2025). Kansas recorded 53 total fatal work injuries. Transportation
  // incidents were the leading event at ~70% of the total (~37); falls, slips,
  // and trips accounted for 6 (all "falls to a lower level"). BLS did not
  // publish a separate Kansas 2023 construction-industry or truck-transport
  // fatality breakout that could be cited, so those fields are left at 0 / null
  // rather than estimated. Employment totals are not published in the state CFOI
  // release and are not fabricated → 0.
  workplaceStats: {
    totalEmployment: 0,
    qcewCoveredEmployment: 0,
    totalWorkplaceFatalities: 53,
    constructionFatalities: 0,
    constructionPctTotal: 0,
    transportWarehouseFatalities: 0,
    truckTransportFatalities: null, // not broken out in BLS CFOI 2023 KS state tables
    fallsSlipsTrips: 6,
    transportationIncidents: 37,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 2024 1-year estimates (via Census Reporter).
  // driveAlone = B08006 drove-alone (1,136,484) / total workers (1,494,667) = 76.0%.
  // avgCommuteMinutes = B08013 aggregate travel time (26,791,260) / B08303
  // commuters (1,341,128) = 20.0 min.
  commuteStats: {
    driveAlone: 76.0,
    nationalAvg: 68.7,
    avgCommuteMinutes: 20.0,
  },

  competitiveData: kansasCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Kansas — combining FARS crash and fatality data, demographics, judicial profiles, and market opportunity signals across Wichita, the Kansas City metro (eastern Kansas), Topeka, and southeast Kansas. Population ~2.97M.",

    legalLandscape:
      "Kansas follows modified comparative negligence under a 50% bar (K.S.A. 60-258a): a plaintiff recovers only if their fault is less than the combined fault of all defendants, and recovery is barred at 50% or more — a stricter cutoff than the 51% rule used in many neighboring states. The personal injury statute of limitations is two years from the date of injury (K.S.A. 60-513). Kansas is a no-fault auto state: drivers carry personal injury protection (PIP) under the Kansas Automobile Injury Reparations Act, and an injured party may sue the at-fault driver for pain-and-suffering (non-economic) damages only after meeting a statutory threshold — medical expense above the dollar amount set in K.S.A. 40-3117, or a verbal threshold of permanent disfigurement, fracture of a weight-bearing bone, permanent injury, permanent loss of a bodily function, or death. On damages caps: Kansas had a statutory cap on non-economic damages (K.S.A. 60-19a02), but the Kansas Supreme Court struck it down as a violation of the right to trial by jury in Hilburn v. Enerpipe Ltd., 309 Kan. 1127 (2019), so there is currently no cap on non-economic damages in Kansas personal injury cases.",

    autoAudience:
      "Kansas's major crash corridors run along I-70 (the primary east-west route crossing the state from the Kansas City metro through Topeka, Salina, and Hays to the Colorado line) and I-35 (the northeast-to-southwest route connecting the Kansas City metro through Emporia and Wichita toward Oklahoma). Drive-alone commuting (76.0%) runs well above the national average (68.7%), concentrating exposure on the Wichita and Kansas City metro road networks and on the interstate corridors. Wichita is the largest in-state media market; eastern Kansas (Johnson and Wyandotte counties, including Overland Park) sits inside the Kansas City DMA and is bought as part of that market. Because Kansas is a no-fault PIP state, intake messaging should set the expectation that a pain-and-suffering claim against the at-fault driver requires meeting the K.S.A. 40-3117 threshold.",

    truckAudience:
      "Kansas is a national freight crossroads. I-70 carries cross-country east-west truck traffic, and I-35 is a core segment of the NAFTA/CANAMEX freight spine linking the Kansas City logistics hub south toward Wichita, Oklahoma, and Texas. The Kansas City metro is one of the largest rail and trucking distribution hubs in the country, generating heavy commercial-vehicle volume on the eastern Kansas side of the state line. Rural stretches of I-70 across western Kansas combine high speeds, long-haul fatigue exposure, and lower seat-belt-use rates. Trucking cases on these corridors frequently involve interstate carriers with multi-state insurance structures and venue questions spanning the Kansas City metro line.",

    motorcycleAudience:
      "Kansas requires helmets only for riders under 18 (K.S.A. 8-1598); riders 18 and older may ride without a helmet, which raises injury severity in motorcycle crashes and strengthens the value of serious-injury cases. The Flint Hills, the Kansas City metro ring, and the I-35 corridor toward Wichita see recreational riding traffic, including out-of-state riders. Statewide motorcycle fatality counts are not broken out in the FARS 2024 release, so a precise figure is not shown here. The 2-year SOL (K.S.A. 60-513) makes early intake critical for these higher-severity cases.",

    constructionAudience:
      "The Wichita aviation-manufacturing cluster, the Kansas City metro construction market on the eastern side of the state, and ongoing highway work along I-70 and I-35 drive Kansas construction exposure. Third-party liability — crane, scaffold, electrical, trench, and OSHA-cited incidents involving a non-employer at fault — is the primary recovery path where workers' compensation limits direct claims against the employer. A separate Kansas 2023 construction-industry fatality count was not citably broken out by BLS, so no construction-specific figure is shown; transportation incidents were the leading workplace-fatality event in Kansas (about 70% of the state's 53 fatal work injuries in 2023). Workers on active Wichita and Kansas City job sites and their families are the primary target.",

    ruralUrbanContext:
      "Kansas's 2024 traffic fatalities skew rural: 186 of 339 fatalities (about 55%) occurred on rural roads versus 152 on urban roads (FARS 2024). Western and central Kansas counties along I-70 and the state's two-lane highway network carry high fatality rates per crash despite low population density, driven by higher speeds and longer EMS response times. These rural markets also have lower broadband penetration, so digital-only campaigns underreach them. Radio, outdoor along the interstate corridors, and community media are essential complements for plaintiff firms targeting non-metro Kansas.",

    judicialContext:
      "Case value and venue in Kansas concentrate in the metropolitan judicial districts: Sedgwick County (Wichita), Johnson and Wyandotte counties (the eastern Kansas / Kansas City metro), and Shawnee County (Topeka). The elimination of the non-economic damages cap in Hilburn v. Enerpipe (2019) removed a ceiling that previously constrained expected case value statewide, which raises the stakes on venue selection and on full development of non-economic damages. Plaintiff residency and crash-location analysis can shift expected recovery materially across Kansas's mix of urban and rural districts.",

    marketSaturationTitle: "Wichita vs. Kansas City (Eastern KS) Buying",
    marketSaturationTip:
      "Wichita-Hutchinson is the largest media market contained entirely within Kansas and is bought directly as a Kansas DMA. Eastern Kansas — Johnson and Wyandotte counties, including Overland Park — sits inside the Kansas City DMA, which is dominated by Missouri-side spend, so Kansas firms there compete for share inside a larger two-state market. Topeka and the Joplin-Pittsburg (southeast Kansas) market offer mid-market cost-per-case economics with materially lower PI advertiser saturation than Wichita or the Kansas City metro.",

    freightCorridorTitle: "I-70 / I-35 Freight Corridors",
    freightCorridorTip:
      "I-70 is a primary cross-country east-west freight artery running the full width of Kansas, and I-35 is a core segment of the central freight spine connecting the Kansas City logistics hub south through Wichita toward Oklahoma and Texas. The Kansas City metro is one of the nation's largest rail-and-truck intermodal hubs. Trucking PI cases on these corridors often involve interstate carriers with multi-state insurance towers and venue questions that straddle the Kansas–Missouri state line in the Kansas City metro.",

    solUrgencyTitle: "2-Year SOL Plus No-Fault Threshold",
    solUrgencyTip:
      "Kansas imposes a two-year personal injury statute of limitations (K.S.A. 60-513). Because Kansas is a no-fault PIP state, a pain-and-suffering claim against the at-fault driver also requires clearing the K.S.A. 40-3117 threshold (a medical-expense dollar amount or a verbal threshold such as a fracture, permanent injury, or disfigurement). Fast intake, early medical documentation, and prompt threshold analysis are critical both to preserve the case before the SOL bar and to confirm the client can pursue non-economic damages at all. Claims against governmental entities may carry additional notice requirements.",

    internetAccessTitle: "Western & Central Kansas Connectivity Gap",
    internetAccessTip:
      "Western and central Kansas counties along the I-70 corridor and the state's rural highway network have lower broadband penetration and see disproportionate fatal-crash exposure (rural roads accounted for about 55% of 2024 Kansas traffic fatalities). Digital-only campaigns underreach these markets. Local radio, interstate outdoor advertising, and community partnerships are necessary channels for plaintiff firms seeking cases outside the Wichita and Kansas City metros.",

    outOfStateTitle: "I-70 / I-35 Out-of-State Travelers",
    outOfStateTip:
      "I-70 and I-35 carry heavy out-of-state passenger and freight traffic through Kansas. Out-of-state travelers injured in Kansas may not know local PI attorneys, the state's 2-year SOL, or that Kansas is a no-fault PIP state with a threshold to sue for pain and suffering. Geo-fenced digital along the I-70 and I-35 corridors and around the Kansas City metro line can capture these cases before injured travelers engage out-of-state counsel.",

    footerSourcesLabel:
      "FARS 2024 Annual Report File — NHTSA Fatality Analysis Reporting System; BLS Census of Fatal Occupational Injuries (Kansas 2023); U.S. Census ACS 2024 1-year estimates",
  },

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
