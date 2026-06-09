import { nevadaCompetitiveData } from "@/lib/data/competitive-landscape/nevada";
import type { StateConfig } from "./_types";

export const nevadaConfig: StateConfig = {
  slug: "nevada",
  stateCode: "NV",
  stateName: "Nevada",

  metadata: {
    title: "Nevada State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Nevada — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across Las Vegas, Reno, and Elko.",
  },

  // Source: NHTSA FARS 2024 (preliminary). Fatality counts only — Nevada does
  // not publish a comparable annual state-DOT crash report with motorcycle /
  // speed / total-crash breakouts on the same vintage, so those fields are null/0.
  trafficStats: {
    totalCrashes: 0, // not published on the FARS 2024 preliminary vintage
    totalFatalities: 417,
    motorcycleFatalities: null, // no citable NV-DOT 2024 figure
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 113,
    alcoholRelatedPct: 27.1,
    unrestrainedFatalities: 0, // not broken out on the FARS 2024 preliminary vintage
    distractedDrivingFatalCrashes: 0, // not broken out on the FARS 2024 preliminary vintage
    urbanFatalities: 309,
    ruralFatalities: 104,
    reportYear: 2024,
    sourceLabel: "FARS 2024 (preliminary)",
  },

  // Source: BLS Census of Fatal Occupational Injuries — Nevada 2023
  // (bls.gov/iif/state-data/fatal-occupational-injuries-in-nevada-2023.htm).
  // The state major-event table reports Total=57, Transportation incidents=17
  // (30%), Falls/slips/trips=11 (19%). Industry-level breakouts (construction,
  // transportation & warehousing) and total/QCEW employment are NOT in that
  // table for Nevada, so they are left at 0/null rather than invented.
  workplaceStats: {
    totalEmployment: 0, // not verified from a citable NV CFOI/QCEW source
    qcewCoveredEmployment: 0, // not verified from a citable NV CFOI/QCEW source
    totalWorkplaceFatalities: 57,
    constructionFatalities: 0, // not broken out in BLS CFOI 2023 NV state major-event table
    constructionPctTotal: 0,
    transportWarehouseFatalities: 0, // industry breakout not in NV state major-event table
    truckTransportFatalities: null, // not broken out in BLS CFOI 2023 NV state tables
    fallsSlipsTrips: 11,
    transportationIncidents: 17,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 2024 1-year estimates (B08006, B08013, B08303).
  // driveAlone = B08006003 / B08006001 = 1,106,171 / 1,581,033 = 70.0%.
  // avgCommuteMinutes = B08013001 / B08303001 = 36,090,076 / 1,401,869 = 25.7 min.
  commuteStats: {
    driveAlone: 70.0,
    nationalAvg: 68.7,
    avgCommuteMinutes: 25.7,
  },

  competitiveData: nevadaCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Nevada — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across Las Vegas, Reno, and Elko. Las Vegas (Clark County) is overwhelmingly dominant; Reno is the secondary market. Population ~3.2M.",

    legalLandscape:
      "Nevada uses modified comparative negligence with a 51% bar — a plaintiff who is more than 50% at fault recovers nothing, while a plaintiff who is 50% or less at fault recovers with damages reduced by their share of fault (NRS 41.141). Nevada is a traditional at-fault (tort) state, so an injured party pursues the at-fault driver's liability insurer rather than recovering through a no-fault PIP system. The personal injury statute of limitations is two years from the date of injury (NRS 11.190(4)(e)). Nevada caps non-economic damages in medical-malpractice actions only — NRS 41A.035, as revised in 2023, sets a cap that escalates annually toward $750,000 — and imposes no statutory cap on non-economic damages in standard (non-med-mal) personal injury cases. Las Vegas (Clark County) is the dominant litigation center; Reno (Washoe County) is the clear secondary venue.",

    autoAudience:
      "Nevada's crash exposure is overwhelmingly concentrated in the Las Vegas metro (Clark County), with Reno (Washoe County) a distant second. The major corridors are I-15 (Las Vegas through to the California and Utah/Arizona borders, and the primary Los Angeles–to–Las Vegas tourist artery), I-80 (Reno east-west across northern Nevada through Elko), and US-95 (Las Vegas north toward Reno). Drive-alone commuting (70.0%) slightly exceeds the national average (68.7%), with a relatively short 25.7-minute average commute concentrated in the Las Vegas and Reno metros. The single largest case-volume driver is the Las Vegas Valley.",

    truckAudience:
      "Nevada straddles two heavy interstate freight arteries. I-15 is the dominant goods-movement route between Southern California's ports and the interior West, funneling continuous heavy-truck traffic through the Las Vegas Valley. I-80 carries long-haul freight east-west across northern Nevada, through Reno and Elko, on the San Francisco–to–Salt Lake City corridor. US-95 links Las Vegas and Reno through sparsely populated high-desert stretches. Truck PI cases on these corridors frequently involve interstate carriers with multi-state insurance structures and venue questions that span Nevada, California, Utah, and Arizona.",

    motorcycleAudience:
      "Nevada has a universal motorcycle helmet law — every rider and passenger must wear a helmet (NRS 486.231) — which removes the contested-helmet-use damages argument common in partial-helmet states and tends to reduce fatal head-injury rates relative to no-helmet states. The Las Vegas Valley, the Red Rock and Mount Charleston routes, and the open desert highways draw recreational and out-of-state riders, particularly from Southern California via I-15. The 2-year SOL (NRS 11.190(4)(e)) makes early intake critical for motorcycle cases.",

    constructionAudience:
      "Las Vegas runs one of the most active construction markets in the West — Strip resort, casino, and stadium projects plus rapid Clark County residential growth — and Reno's industrial and data-center buildout adds a second hub. Third-party liability (crane, scaffold, electrical, and OSHA-cited incidents involving a non-employer at fault) is the primary recovery path where workers' compensation limits direct claims. Note: Nevada's BLS CFOI 2023 release does not break out a construction-industry fatality count in the state major-event table, so this surface relies on the statewide total (57 workplace fatalities in 2023) rather than an industry split.",

    ruralUrbanContext:
      "Nevada's population and case volume are extremely concentrated: roughly three-quarters of fatalities are urban (309 urban vs. 104 rural in FARS 2024 preliminary), reflecting how dominant the Las Vegas Valley and Reno are within an otherwise vast, sparsely populated state. The rural fatality share, while smaller in count, runs along the long I-80 and US-95 desert corridors where emergency-response times are long and speeds are high. Rural northern and central Nevada (Elko, Humboldt, White Pine, Nye counties) has lower broadband penetration; digital-only campaigns underreach those markets, making radio and outdoor along the interstate corridors necessary complements.",

    judicialContext:
      "Clark County (Las Vegas) is the center of gravity for Nevada civil litigation and the venue where the large majority of PI cases are filed and tried; it is generally regarded as a plaintiff-workable venue, particularly for auto, premises, and casino/hospitality-related injury claims. Washoe County (Reno) is the secondary venue for northern Nevada. Rural Nevada counties produce far smaller dockets. Venue analysis — plaintiff residency and crash location — matters because Clark County's jury pool and case economics differ markedly from the rural districts.",

    marketSaturationTitle: "Las Vegas Dominance vs. Reno & Elko",
    marketSaturationTip:
      "Las Vegas (Clark County) attracts by far the highest PI advertiser concentration in Nevada and is one of the most saturated legal-advertising markets in the West, driven by heavy local-TV and out-of-home spend on the Strip and valley-wide. Reno (Washoe County) is the secondary market with materially lower saturation and a growing industrial and data-center workforce. Elko anchors rural northeastern Nevada along I-80 — a small but underserved mining-and-freight market with favorable cost-per-case economics for firms willing to advertise outside the two metros.",

    freightCorridorTitle: "I-15 / I-80 / US-95 Freight Corridors",
    freightCorridorTip:
      "I-15 is the primary goods-movement and tourist corridor between Southern California and Las Vegas, carrying dense passenger and heavy-truck traffic. I-80 is the major east-west long-haul freight artery across northern Nevada through Reno and Elko. US-95 connects Las Vegas and Reno through remote high-desert stretches. Trucking PI cases on these routes commonly involve interstate carriers and multi-state insurance and venue questions across Nevada, California, Utah, and Arizona.",

    solUrgencyTitle: "2-Year SOL (NRS 11.190(4)(e))",
    solUrgencyTip:
      "Nevada's personal injury statute of limitations is two years from the date of injury (NRS 11.190(4)(e)). Claims against governmental entities (state, county, or municipal) carry additional notice requirements and shorter administrative windows. Out-of-state visitors injured in Las Vegas frequently delay engaging counsel because they return home before treatment concludes — fast intake, early evidence preservation, and prompt provider engagement are essential to protect both the case and the client relationship before the SOL becomes a bar.",

    internetAccessTitle: "Rural Northern & Central Nevada Connectivity Gap",
    internetAccessTip:
      "Outside the Las Vegas and Reno metros, much of northern and central Nevada — Elko, Humboldt, Lander, Eureka, White Pine, and Nye counties — has lower broadband penetration along the I-80 and US-95 corridors. Digital-only campaigns underreach these markets, where mining, freight, and ranching populations face real crash and workplace-injury exposure. Local radio, outdoor advertising along the interstates, and community partnerships are necessary channels to reach cases outside the two metros.",

    outOfStateTitle: "Las Vegas Tourist & Visitor Injury Exposure",
    outOfStateTip:
      "Las Vegas draws tens of millions of out-of-state and international visitors annually, producing a large volume of tourist injury exposure — pedestrian and rideshare crashes on and around the Strip, casino and resort premises injuries, and I-15 collisions involving California drivers. Injured visitors typically do not know Nevada PI attorneys or the state's 2-year SOL and often leave the state before treatment concludes. Geo-fenced digital around the Strip and resort corridors, airport-adjacent placement, and partnerships with hospitality and medical providers can capture these cases before visitors engage out-of-state counsel.",

    footerSourcesLabel:
      "NHTSA FARS 2024 (preliminary); BLS Census of Fatal Occupational Injuries — Nevada 2023; U.S. Census ACS 2024 1-year estimates",
  },

  features: {
    showWorkplaceSection: true,
  },

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
