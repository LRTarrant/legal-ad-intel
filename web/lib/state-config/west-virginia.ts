import { westVirginiaCompetitiveData } from "@/lib/data/competitive-landscape/west-virginia";
import type { StateConfig } from "./_types";

export const westVirginiaConfig: StateConfig = {
  slug: "west-virginia",
  stateCode: "WV",
  stateName: "West Virginia",

  metadata: {
    title: "West Virginia State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in West Virginia — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across Charleston-Huntington, Clarksburg-Weston, Bluefield-Beckley-Oak Hill, and Wheeling-Steubenville.",
  },

  // Source: NHTSA FARS 2024 Annual Report File. Statewide totals only;
  // motorcycle and speed-related fatalities are not broken out in our data.
  trafficStats: {
    totalCrashes: 0, // not sourced from a citable WV-DOT 2024 figure
    totalFatalities: 256,
    motorcycleFatalities: null, // not in our FARS data; no citable WV-DOT 2024 figure
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 78,
    alcoholRelatedPct: 30.5,
    unrestrainedFatalities: 0, // not sourced from a citable WV-DOT 2024 figure
    distractedDrivingFatalCrashes: 0, // not sourced from a citable WV-DOT 2024 figure
    urbanFatalities: 110,
    ruralFatalities: 144,
    reportYear: 2024,
    sourceLabel: "FARS 2024 Annual Report File",
  },

  // Source: BLS Census of Fatal Occupational Injuries — West Virginia 2023.
  // Total (58) and transportation incidents (22) are the only figures BLS
  // publishes cleanly for WV; the small-state industry/event breakdown is
  // suppressed, so construction and the remaining event categories are zeroed
  // and showWorkplaceSection is set false rather than inventing a breakdown.
  workplaceStats: {
    totalEmployment: 0, // QCEW WV total not separately verified
    qcewCoveredEmployment: 0,
    totalWorkplaceFatalities: 58,
    constructionFatalities: 0, // industry breakout suppressed in BLS CFOI 2023 WV tables
    constructionPctTotal: 0,
    transportWarehouseFatalities: 0, // industry breakout suppressed
    truckTransportFatalities: null, // not broken out in BLS CFOI 2023 WV state tables
    fallsSlipsTrips: 0, // event breakout not cleanly verified for WV
    transportationIncidents: 22,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 2024 1-year estimates (B08006, B08013, B08303; S0802).
  // driveAlone = 589,103 drove alone / 759,466 total workers (B08006) = 77.6%.
  // avgCommuteMinutes = 18,381,010 aggregate minutes (B08013) / 692,551 commuters
  // with travel time (B08303, excludes work-from-home) = 26.5; matches the
  // published S0802 mean travel time for WV. (Dividing by all 759,466 workers
  // understates it to 24.2 — wrong denominator.)
  commuteStats: {
    driveAlone: 77.6,
    nationalAvg: 68.7,
    avgCommuteMinutes: 26.5,
  },

  competitiveData: westVirginiaCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in West Virginia — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across Charleston-Huntington, Clarksburg-Weston, Bluefield-Beckley-Oak Hill, and Wheeling-Steubenville. Population ~1.77M.",

    legalLandscape:
      "West Virginia uses modified comparative negligence with a 51% bar: a plaintiff is barred from recovery only if their share of fault is greater than 50% (W. Va. Code § 55-7-13c, the 2015 tort-reform statute that replaced the prior judicial standard). Plaintiffs 50% or less at fault recover with damages reduced by their percentage of fault. The personal injury statute of limitations is two years from the date of injury (W. Va. Code § 55-2-12). West Virginia is an at-fault (tort) state for auto liability. There is no general statutory cap on non-economic damages in standard PI cases; the noneconomic cap applies only to medical professional liability (med-mal) claims. Charleston (Kanawha County) and Huntington (Cabell County) anchor the state's primary litigation centers.",

    autoAudience:
      "West Virginia's crash exposure concentrates along its interstate corridors: I-64 (Huntington through Charleston to the Virginia line), I-77 (the West Virginia Turnpike, running Charleston to Beckley and Bluefield), I-79 (Charleston north through Clarksburg to the Pittsburgh region), and I-81 in the eastern panhandle. Drive-alone commuting (77.6%) runs well above the national average (68.7%), concentrating exposure on these routes and the secondary roads feeding them. The Charleston-Huntington DMA is the dominant in-state media market and the largest source of case volume.",

    truckAudience:
      "The West Virginia Turnpike (I-77) and I-64 carry heavy commercial truck traffic between the Mid-Atlantic, the Ohio Valley, and the Southeast. I-79 links the Charleston region to the Pittsburgh freight network, and the eastern panhandle's I-81 corridor is one of the busiest north-south freight arteries on the East Coast. The state's coal, natural gas, and chemical industries generate significant heavy-vehicle and tanker traffic on mountainous two-lane routes where run-off and crossover crashes are common. Trucking PI cases on these corridors frequently involve interstate carriers with multi-state insurance structures.",

    motorcycleAudience:
      "West Virginia has a universal motorcycle helmet law requiring all riders, regardless of age or experience, to wear a helmet (W. Va. Code § 17C-15-44). The Appalachian ridge routes, Coal Heritage and Midland Trail scenic byways, and the New River Gorge area draw recreational riders, including out-of-state visitors. Motorcycle fatality counts are not broken out in our FARS data for the state. The 2-year SOL (§ 55-2-12) makes early intake especially important for motorcycle cases, where injury severity and liability disputes are common.",

    constructionAudience:
      "West Virginia's construction and extraction economy spans highway work zones on the Turnpike and interstate system, natural-gas pipeline build-out in the north-central counties, and ongoing infrastructure work around Charleston and the New River Gorge. Third-party liability — incidents involving a non-employer at fault such as a contractor, equipment manufacturer, or motorist in a work zone — is the primary recovery path where workers' compensation limits direct claims against the employer. The BLS does not publish a clean construction-industry fatality breakout for West Virginia, so workplace figures here are limited to the verified statewide total.",

    ruralUrbanContext:
      "West Virginia's traffic fatalities skew heavily rural: of 256 fatalities in 2024 (FARS), 144 were rural and 110 urban. The mountainous terrain, two-lane state routes, and long emergency-response times in the southern coalfields and eastern highlands raise crash severity. Many of these counties have lower broadband penetration, so digital-only campaigns underreach them. Radio, outdoor, and community media are essential complements for plaintiff firms targeting non-metro West Virginia.",

    judicialContext:
      "West Virginia's circuit courts handle most PI litigation, with Kanawha County (Charleston) and Cabell County (Huntington) as the highest-volume venues. The 2015 tort-reform package — including the § 55-7-13c comparative-fault statute — reshaped the state's liability landscape and was part of a broader effort to moderate the state's prior reputation among defense interests. Venue analysis, particularly plaintiff residency and crash location, remains important to expected case value given the rural/urban split in jury pools.",

    marketSaturationTitle: "Charleston-Huntington vs. Secondary Markets",
    marketSaturationTip:
      "The Charleston-Huntington DMA is West Virginia's dominant media market and draws the highest PI advertiser concentration in the state. The Clarksburg-Weston and Bluefield-Beckley-Oak Hill DMAs are smaller markets with lower ad saturation and favorable cost-per-case economics. Note that the eastern panhandle falls in the Washington DC DMA and the northern panhandle in the Pittsburgh DMA, so firms targeting those populations must buy into out-of-state media markets rather than in-state West Virginia buys.",

    freightCorridorTitle: "I-77 Turnpike / I-64 / I-81 Freight Corridors",
    freightCorridorTip:
      "The West Virginia Turnpike (I-77) and I-64 are the state's primary commercial freight routes, connecting Charleston to the Southeast and the Ohio Valley. I-79 links Charleston to the Pittsburgh freight network, and I-81 through the eastern panhandle is a major East Coast north-south artery. Trucking PI cases on these corridors often involve interstate carriers, mountainous-grade crash dynamics, and complex multi-state venue and insurance questions.",

    solUrgencyTitle: "2-Year PI Statute of Limitations",
    solUrgencyTip:
      "West Virginia's personal injury statute of limitations is two years from the date of injury (W. Va. Code § 55-2-12). Claims against governmental entities or involving commercial carriers may carry additional notice requirements with shorter effective windows. Fast intake, early evidence preservation, and prompt engagement with treating providers are critical to protect both the case and the client relationship before the SOL becomes a bar.",

    internetAccessTitle: "Southern Coalfields & Highlands Connectivity Gap",
    internetAccessTip:
      "West Virginia's southern coalfield counties and eastern highlands have among the lowest broadband penetration rates in the country. These rural areas run along the I-77 Turnpike and mountainous state routes and carry disproportionate crash severity. Digital-only campaigns underreach these markets. Local radio, outdoor advertising, and community partnerships are necessary channels for plaintiff firms seeking cases outside the Charleston-Huntington metro.",

    outOfStateTitle: "New River Gorge & Scenic Byway Visitor Opportunity",
    outOfStateTip:
      "The New River Gorge National Park, the Midland Trail, and the Coal Heritage scenic byways draw significant out-of-state visitors and motorcyclists, particularly from Virginia, Ohio, Pennsylvania, and Maryland. Out-of-state visitors injured in West Virginia may not know local PI attorneys or the state's 2-year SOL. Geo-fenced digital along I-64, I-77, and the scenic-byway corridors, combined with partnerships with regional accommodations and rafting outfitters, can capture cases from this seasonal segment before they engage out-of-state counsel.",

    footerSourcesLabel:
      "NHTSA FARS 2024 Annual Report File; BLS Census of Fatal Occupational Injuries (West Virginia 2023); U.S. Census ACS 2024 1-year estimates",
  },

  features: {
    // BLS does not publish a clean industry/event breakdown for WV's 58 2023
    // workplace fatalities; only the total and transportation-incident count are
    // verified, so the workplace section is hidden rather than shown with zeros.
    showWorkplaceSection: false,
  },

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
