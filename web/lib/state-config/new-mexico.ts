import { newMexicoCompetitiveData } from "@/lib/data/competitive-landscape/new-mexico";
import type { StateConfig } from "./_types";

export const newMexicoConfig: StateConfig = {
  slug: "new-mexico",
  stateCode: "NM",
  stateName: "New Mexico",

  metadata: {
    title: "New Mexico State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in New Mexico — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across Albuquerque-Santa Fe, Las Cruces, Farmington, and Roswell.",
  },

  // Source: FARS 2024 Annual Report File (fatalities). New Mexico does not
  // publish a citable 2024 motorcycle or speed-related fatality breakout that
  // matches FARS vintage, so those fields stay null. totalCrashes,
  // unrestrainedFatalities, and distractedDrivingFatalCrashes are not carried
  // in the FARS figures handed to us, so they are set to 0 (not invented).
  trafficStats: {
    totalCrashes: 0,
    totalFatalities: 409,
    motorcycleFatalities: null,
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 71,
    alcoholRelatedPct: 17.4,
    unrestrainedFatalities: 0,
    distractedDrivingFatalCrashes: 0,
    urbanFatalities: 149,
    ruralFatalities: 260,
    reportYear: 2024,
    sourceLabel: "FARS 2024 Annual Report File",
  },

  // Source: BLS Census of Fatal Occupational Injuries — New Mexico 2023.
  // New Mexico is a low-volume CFOI state (38 total fatalities); BLS suppresses
  // most industry/event sub-cells. Only the total (38), transportation incidents
  // (22), and the transportation & warehousing industry total (11) are publicly
  // verifiable. Construction, falls/slips/trips, and truck-transport sub-fields
  // are not citable and are NOT invented — they are zeroed/null, and
  // features.showWorkplaceSection is false because the breakdown is incomplete.
  workplaceStats: {
    totalEmployment: 0,
    qcewCoveredEmployment: 0,
    totalWorkplaceFatalities: 38,
    constructionFatalities: 0,
    constructionPctTotal: 0,
    transportWarehouseFatalities: 11,
    truckTransportFatalities: null, // not broken out in BLS CFOI 2023 NM state tables
    fallsSlipsTrips: 0,
    transportationIncidents: 22,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 2024 1-year estimates (tables B08006, B08013, B08303).
  // driveAlone = 703,793 / 954,026 workers = 73.8%.
  // nationalAvg = U.S. drove-alone share, ACS 2024 1-yr = 114,469,544 / 165,360,450 = 69.2%.
  // avgCommuteMinutes = 20,554,380 aggregate minutes (B08013_001) / 856,080 workers
  // who did not work at home (B08303_001) = 24.0. (Aggregate travel time excludes
  // work-from-home, so the denominator is commuters, not all 954,026 workers.)
  commuteStats: {
    driveAlone: 73.8,
    nationalAvg: 69.2,
    avgCommuteMinutes: 24.0,
  },

  competitiveData: newMexicoCompetitiveData,

  features: {
    // BLS suppresses NM's industry/event breakdown (only the 38 total + two
    // cells are public). Hide the workplace section rather than show zeros.
    showWorkplaceSection: false,
  },

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in New Mexico — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across Albuquerque-Santa Fe, Las Cruces, Farmington, and Roswell. Population ~2.1M, spread across a large, predominantly rural state.",

    legalLandscape:
      "New Mexico applies pure comparative negligence: a plaintiff's recovery is reduced in proportion to their share of fault but is never barred, even if the plaintiff is more at fault than the defendant (Scott v. Rizzo, 96 N.M. 682, 1981). This is more plaintiff-favorable than the modified comparative regimes of most neighboring states. The personal injury statute of limitations is three years from the date of injury (NMSA § 37-1-8). New Mexico imposes no general statutory cap on non-economic damages in standard PI cases — the only damages cap is under the Medical Malpractice Act, which applies solely to qualifying med-mal claims, not auto, premises, or product cases. New Mexico is an at-fault (tort) state for auto insurance. Bernalillo County (Albuquerque) is the dominant litigation venue, with Santa Fe and Doña Ana (Las Cruces) counties as secondary centers.",

    autoAudience:
      "New Mexico's crash exposure concentrates along three interstate corridors: I-25 (running north–south from Las Cruces through Albuquerque to Santa Fe and the Colorado line), I-40 (the east–west transcontinental route through Albuquerque), and I-10 (crossing the southern part of the state through Las Cruces toward El Paso and Arizona). Drive-alone commuting (73.8%) exceeds the national average (69.2%), with most case volume concentrated in the Albuquerque-Santa Fe metro along the I-25/I-40 interchange. Rural fatalities (260 of 409 in 2024, roughly 64%) dominate the state's fatal-crash profile, reflecting long-distance travel across sparsely populated terrain.",

    truckAudience:
      "New Mexico sits on two major freight arteries. I-40 is a primary transcontinental truck route connecting California and the West Coast to Texas and the Southeast, passing directly through Albuquerque. I-25 carries north–south freight between El Paso/Mexico-border commerce and Denver. I-10 across the south links the El Paso and Phoenix freight networks. The long rural stretches between population centers mean truck-involved crashes often occur far from metro trauma centers, and interstate carriers with multi-state insurance structures and complex venue questions are common defendants. New Mexico's high rural fatality share (64%) correlates with the heavy long-haul exposure on these corridors.",

    motorcycleAudience:
      "New Mexico requires helmets for riders and passengers under 18; riders 18 and older are not required to wear helmets under state law. The state's open desert and mountain routes — including stretches of I-25, the Turquoise Trail, and the roads around Santa Fe and Taos — draw recreational and out-of-state riders, particularly during temperate riding seasons. FARS 2024 does not provide a citable New Mexico motorcycle-fatality sub-count at the vintage used here, so that figure is not shown. The 3-year SOL (NMSA § 37-1-8) gives a somewhat longer intake window than the 2-year states, but early evidence preservation on rural crashes remains critical.",

    constructionAudience:
      "Albuquerque and Santa Fe anchor New Mexico's construction activity, with additional energy-sector and infrastructure work in the Permian Basin (southeast) and San Juan Basin (Farmington/northwest). New Mexico is a low-volume workplace-fatality state, and BLS suppresses most of its industry-level CFOI breakdown, so a reliable construction-fatality count is not published. Third-party liability — incidents where a non-employer (a general contractor, equipment manufacturer, or subcontractor) is at fault — remains the primary recovery path where workers' compensation limits direct claims against the employer.",

    ruralUrbanContext:
      "New Mexico is one of the most rural states by fatal-crash profile: 260 of 409 traffic fatalities in 2024 (roughly 64%) occurred on rural roads, against 149 urban (FARS 2024). The long, high-speed corridors connecting widely separated towns — and the limited proximity to trauma care — drive both crash severity and the rural fatality share. Rural northern, eastern, and southern counties have lower broadband penetration, so digital-only campaigns underreach much of the state. Radio, outdoor along I-25/I-40/I-10, and community/tribal media are essential complements for plaintiff firms targeting non-metro New Mexico.",

    judicialContext:
      "Bernalillo County (Albuquerque) is New Mexico's primary civil litigation venue and produces the bulk of the state's PI verdicts. Santa Fe County (First Judicial District) and Doña Ana County (Las Cruces) are the next most active. New Mexico's pure comparative negligence rule means defense fault arguments reduce, but do not eliminate, recovery — a meaningfully more plaintiff-favorable posture than the modified-comparative states bordering it. Venue and plaintiff-residency analysis still matters because case values vary across the state's judicial districts.",

    marketSaturationTitle: "Albuquerque-Santa Fe vs. Secondary Markets",
    marketSaturationTip:
      "Albuquerque-Santa Fe is the dominant in-state DMA and concentrates the highest PI advertiser activity in New Mexico. A key media-buying nuance: southern New Mexico, including Las Cruces, falls inside the El Paso, TX DMA — so television and radio bought against Las Cruces are purchased through El Paso stations and bleed across the state line. Farmington (northwest) and Roswell (southeast) are smaller standalone markets with lower ad saturation and favorable cost-per-case economics for firms willing to run localized campaigns.",

    freightCorridorTitle: "I-40 / I-25 / I-10 Freight Corridors",
    freightCorridorTip:
      "I-40 is a primary transcontinental truck route through Albuquerque; I-25 carries north–south freight from the El Paso/Mexico border to Denver; I-10 links El Paso and Phoenix across the south. Truck PI cases on these corridors frequently involve interstate carriers with multi-state insurance programs and venue questions, and the long rural distances between metros raise crash severity. Geo-targeting along these interstates and at major truck-stop nodes reaches the highest-exposure segments.",

    solUrgencyTitle: "3-Year SOL — Longer Window, but Rural Evidence Decays Fast",
    solUrgencyTip:
      "New Mexico's personal injury statute of limitations is three years from the date of injury (NMSA § 37-1-8), longer than the 2-year window in many states. Claims against governmental entities under the New Mexico Tort Claims Act carry their own notice deadlines that are far shorter, so commercial-vehicle, transit, or municipal-defendant cases require fast action regardless of the general SOL. On rural corridor crashes, physical evidence and witness availability decay quickly, making prompt intake and scene preservation important even with the longer statutory window.",

    internetAccessTitle: "Rural & Tribal Connectivity Gap",
    internetAccessTip:
      "Large portions of rural New Mexico — including northern mountain counties, the eastern plains, and tribal lands — have lower broadband penetration than the Albuquerque-Santa Fe corridor. Digital-only campaigns underreach these areas. Local radio (including Spanish-language and tribal stations), outdoor along the interstates, and community partnerships are necessary channels for plaintiff firms seeking cases outside the metro core.",

    outOfStateTitle: "El Paso DMA & Border-Region Media Overlap",
    outOfStateTip:
      "Southern New Mexico (Las Cruces and Doña Ana County) is served by the El Paso, TX television and radio market, so media buys there cross state lines and reach a bilingual, high-mobility border population. Travelers and cross-border commuters injured in New Mexico may default to Texas attorneys advertising on El Paso stations. New Mexico firms can compete by buying El Paso DMA inventory with New-Mexico-specific creative and by geo-fencing the I-10/I-25 border corridor to capture cases that would otherwise route to out-of-state counsel.",

    footerSourcesLabel:
      "FARS 2024 Annual Report File (NHTSA) · BLS Census of Fatal Occupational Injuries 2023 · U.S. Census ACS 2024 1-Year Estimates",
  },

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
