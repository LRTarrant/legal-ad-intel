import { californiaCompetitiveData } from "@/lib/data/competitive-landscape/california";
import type { StateConfig } from "./_types";

export const californiaConfig: StateConfig = {
  slug: "california",
  stateCode: "CA",
  stateName: "California",

  metadata: {
    title: "California State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in California — accident data, demographics, judicial profiles, and market opportunity signals.",
  },

  trafficStats: {
    // Not carried on the legacy OTS const and not rendered by the v2 shell.
    totalCrashes: 0,
    // California OTS Quick Stats 2023 total traffic fatalities (drives the
    // Annual Fatalities tile + the auto-computed Ped/Bike share denominator).
    totalFatalities: 4_061,
    motorcycleFatalities: 583, // OTS 2023
    // CA OTS does not break out speed-related fatality counts on this vintage.
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 1_355, // OTS 2023 alcohol-impaired fatalities
    alcoholRelatedPct: 33.4, // 1,355 / 4,061
    unrestrainedFatalities: 780, // OTS 2023
    // Not carried on the legacy const / not broken out; not rendered by shell.
    distractedDrivingFatalCrashes: 0,
    // CA OTS reports a rural-CLASS-ROAD share (73%), not a rural FATALITY count;
    // the shell's Rural Fatal Share tile needs a count, so leave null rather than
    // back-derive a fabricated figure (audit flags `ruralFatalShare` as dead code).
    urbanFatalities: null,
    ruralFatalities: null,
    reportYear: 2023,
    sourceLabel: "California OTS Quick Stats 2023",

    /* --- Optional bespoke metrics (Phase 3 legacy-migration fidelity) --- */
    registeredMotorcycles: 848_332, // OTS / CA DMV — highest in the nation
    fatalityRatePerVmt: 1.26, // OTS 2023 — drives the rate snapshot tile
    nationalFatalityRatePerVmt: 1.26, // equal to national avg
    pedestrianFatalities: 1_106, // OTS 2023
    bicycleFatalities: 145, // OTS 2023
    hitAndRunFatalCrashes: 447, // OTS (2021)
    helmetUsePct: 94, // OTS — helmet use among fatal motorcycle crashes
    motorcycleFatalityRatePer100k: 66.57, // per 100K registered motorcycles
  },

  workplaceStats: {
    // Not carried on the legacy BLS const and not rendered by the v2 shell.
    totalEmployment: 0,
    qcewCoveredEmployment: 0,
    totalWorkplaceFatalities: 419, // BLS CFOI 2024
    constructionFatalities: 81, // BLS CFOI 2024
    constructionPctTotal: 19, // 81 / 419
    // Legacy carried transport-warehouse WORKERS (756,554), not a fatality
    // count; no CFOI fatality breakout available, and not rendered by the shell.
    transportWarehouseFatalities: 0,
    truckTransportFatalities: null,
    fallsSlipsTrips: 43, // BLS CFOI — construction fall deaths (top cause)
    transportationIncidents: 0, // not carried on the legacy const
    reportYear: 2024,

    /* --- Optional bespoke metrics (Phase 3 legacy-migration fidelity) --- */
    constructionWorkers: 911_333, // BLS — largest state construction workforce
    truckingWorkers: 150_687, // BLS
    truckingAvgPay: 64_459, // BLS — avg annual trucking pay
    workplaceFatalityRatePer100k: 2.4, // BLS — drives the rate snapshot tile
    nationalWorkplaceFatalityRatePer100k: 3.3,
    hispanicWorkerFatalitySharePct: 51, // Hispanic share of CA workplace fatalities
    constructionFallsSharePct: 53, // falls share of construction deaths (43 / 81)
  },

  commuteStats: {
    driveAlone: 67.1, // ACS 2023
    nationalAvg: 68.7,
    // Not carried on the legacy const and not rendered by the v2 shell.
    avgCommuteMinutes: 0,
  },

  competitiveData: californiaCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in California — combining accident data, demographics, judicial profiles, and market opportunity signals across MVA, trucking, motorcycle, construction, and pedestrian/bicycle cases. Major metros: Los Angeles, San Francisco, San Diego, Sacramento, San Jose, and Riverside. Population ~39M, the single largest PI advertising market in the country.",

    legalLandscape:
      "California is the most plaintiff-friendly major state in the U.S. for personal injury. Pure comparative negligence allows recovery at any fault level, there are no caps on non-economic or punitive damages for PI cases, and jury verdicts regularly exceed $1M. The only moderate factor is the 2-year statute of limitations. Combined with 39M+ population and massive vehicle miles traveled, California represents the single largest PI advertising market in the country.",

    // Verdict-card one-liner (the fuller story lives in `legalLandscape` + the
    // PI Viability cross-signal card).
    viabilityNote:
      "Highest PI-viability score we track (94.4) — pure comparative, no non-economic/punitive caps; only constraint is the 2-year SOL, so speed-to-intake matters.",

    autoAudience:
      "Los Angeles metro dominates with 4,800+ FARS deaths. Inland Empire (San Bernardino + Riverside combined: 4,200+ deaths) is the #2 market. Target ages 25–44, heavy Spanish-language in LA (45% Hispanic), Inland Empire (53% Hispanic), and Central Valley (55%+ Hispanic). WFH at 15.5% statewide reduces commute exposure but freeway corridors remain high-fatality zones.",
    autoMedia:
      "CTV/digital across LA, SF Bay Area, San Diego, Sacramento metros. Spanish-language campaigns critical across Southern CA and Central Valley. Radio in Inland Empire and Central Valley commute corridors. Digital geo-targeting on I-5, I-10, I-15, US-101 corridors.",

    truckAudience:
      "Target trucking corridors: I-5 Central Valley, I-10 east of LA, I-15 to Nevada, and the ports of LA/Long Beach which generate massive commercial vehicle traffic. Kern and San Joaquin counties have disproportionately high truck crash rates relative to population.",
    truckMedia:
      "Digital geo-fencing along freight corridors. Trucker-specific platforms and rest stops along I-5 and CA-99. Radio on Central Valley routes. Bilingual campaigns for the Hispanic trucking workforce.",

    motorcycleAudience:
      "California has more registered motorcycles than any other state (848K+). Lane-splitting legality creates unique liability dynamics. Target riders 25–54 in Southern CA and the Bay Area. LA County alone leads the FARS dataset in motorcycle fatal crashes.",
    motorcycleMedia:
      "Digital targeting on motorcycle enthusiast platforms. CTV in LA, San Diego, Bay Area. Events and rally sponsorships. Lane-splitting awareness campaigns create natural entry points.",

    constructionAudience:
      "California's 911K construction workers represent the largest state construction workforce. Hispanic workers are disproportionately affected (51% of fatalities). Target construction zones in high-growth areas: Inland Empire, Sacramento, Bay Area suburbs, and Central Valley.",
    constructionMedia:
      "Spanish-language digital and radio in construction-heavy metros. Geo-targeted mobile ads near major construction sites and developments. Unions and trade organizations as distribution channels.",

    // Pedestrian/Bicycle card replaces Boating for CA (features.showPedBikeCard).
    pedBikeAudience:
      "California's pedestrian/bicycle fatality share (31%) is one of the highest nationally. Los Angeles, San Francisco, and San Diego are the primary markets. Hit-and-run crashes are a unique California issue with 447 fatal hit-and-runs. Target urban cores with high walking/transit commute rates.",
    pedBikeMedia:
      "Digital geo-targeting in downtown LA, SF, San Diego, Oakland. Transit-adjacent OOH advertising. Community safety organization partnerships. Bicycle advocacy group channels.",

    ruralUrbanContext:
      "California's pedestrian and bicycle fatalities concentrate in its dense urban cores — LA, San Francisco, San Diego, and Oakland — driven by year-round walking/biking climate and transit use. Even so, the state legal framework (pure comparative, no caps) is the dominant factor in case value regardless of county.",

    judicialContext:
      "Only 3 of California's 58 counties (LA, Alameda, San Francisco) carry “Liberal” judicial profiles, but those 3 contain ~18M+ people (~46% of the state). Even conservative California counties produce higher verdicts than plaintiff-friendly counties in contributory-negligence states. Venue still matters, but the statewide framework drives outcomes.",

    askAiPageName: "California State Intelligence",
    askAiPageContext:
      "State-level intelligence for plaintiff firm advertising and case acquisition in California — combining FARS accident data, census demographics, judicial profiles, PI viability scores, storm events, cancer incidence, and market opportunity signals across MVA, trucking, motorcycle, construction, and pedestrian/bicycle cases.",
    footerSourcesLabel:
      "FARS (NHTSA), California OTS 2023, ACS 5-Year Estimates, BLS QCEW/CFOI, NOAA Storm Events, CDC/USCS Cancer Incidence, Judicial Profile Data, California DMV",

    // Bespoke Cross-Signal Insight cards (ported 1:1 from the legacy page —
    // 6 cards including a Cancer Incidence card with no fixed-slot topic).
    customInsights: [
      {
        icon: "🩺",
        tone: "teal",
        title: "Cancer Incidence: Mass Tort Opportunity",
        stats: [
          { label: "Annual cancer diagnoses", value: "182,000+" },
          { label: "All-sites rate", value: "404.5 / 100K" },
          { label: "Prostate cancer", value: "121.2 / 100K (28,874 annual cases)" },
        ],
        body: "California's 182,000+ annual cancer diagnoses create massive demand for legal representation in environmental exposure, product liability (talc, Roundup, AFFF), and pharmaceutical litigation. Cross-reference counties near military bases (San Diego, Sacramento, Riverside) for targeted Camp Lejeune and AFFF campaigns.",
      },
      {
        icon: "⚖️",
        tone: "emerald",
        title: "Judicial Paradox: 3 Counties, 46% of Population",
        stats: [
          { label: "Liberal counties", value: "3 of 58 (LA, Alameda, SF)" },
          { label: "Population share", value: "~46% of state" },
          { label: "Conservative / Moderate", value: "29 conservative · 26 moderate" },
        ],
        body: "Despite California's reputation, only 3 of 58 counties have “Liberal” judicial profiles. But those 3 contain ~18M+ people. Even conservative California counties produce higher verdicts than plaintiff-friendly counties in contributory-negligence states. The state legal framework (pure comparative, no caps) is the dominant factor.",
      },
      {
        icon: "📈",
        tone: "emerald",
        title: "PI Viability: Highest Score Tracked",
        stats: [
          { label: "Composite score", value: "94.4 (highest we track)" },
          { label: "Perfect 100 sub-scores", value: "5 of 6" },
          { label: "Only constraint", value: "2-year SOL (score 50)" },
        ],
        body: "California's PI viability score of 94.4 is the highest we track. The only constraint is the 2-year SOL, which means speed-to-intake matters. Firms should prioritize rapid case acquisition within the first 12 months post-incident to allow time for investigation and filing.",
      },
      {
        icon: "🚶",
        tone: "red",
        title: "Pedestrian/Bicycle Crisis: 31% of Deaths",
        stats: [
          { label: "Combined fatalities (2023)", value: "1,251" },
          { label: "Hit-and-run fatal crashes (2021)", value: "447" },
          { label: "SF commute", value: "10% walking · 21.4% transit" },
        ],
        body: "California's pedestrian/bicycle fatality share (31%) is among the highest nationally, driven by density, year-round walking/biking climate, and transit use. Hit-and-run is a uniquely California problem with 447 fatal incidents. Target urban cores in LA, SF, San Diego, and Oakland for ped/bike PI campaigns.",
      },
      {
        icon: "🎯",
        tone: "teal",
        title: "Hispanic Demographics: Spanish-Language Imperative",
        stats: [
          { label: "LA metro", value: "44.9% Hispanic (13M pop)" },
          { label: "Inland Empire", value: "53.1% Hispanic (4.7M pop)" },
          { label: "Central Valley", value: "55–56% Hispanic (Fresno, Bakersfield)" },
        ],
        body: "Spanish-language advertising is the primary channel in many California markets. The Inland Empire and Central Valley are majority-Hispanic with younger median ages (32–36). Hispanic workers also represent 51% of workplace fatalities, creating a direct connection between demographic targeting and PI case acquisition.",
      },
      {
        icon: "🏍️",
        tone: "amber",
        title: "Lane-Splitting: Only-in-California Liability",
        stats: [
          { label: "Motorcycle fatalities", value: "583 · 14.9% of fatal crashes" },
          { label: "Registered motorcycles", value: "848,332 (highest in nation)" },
          { label: "Lane-splitting", value: "Legal since 2017 (only state)" },
        ],
        body: "California is the only state where lane-splitting is legal, creating unique liability dynamics for motorcycle PI cases. With 848K+ registered motorcycles (highest nationally) and a fatality rate of 66.6 per 100K registrations, motorcycle PI is a high-volume practice area. Lane-splitting awareness campaigns create natural entry points for case acquisition.",
      },
    ],
  },

  features: {
    // CA shows the Pedestrian/Bicycle case card in place of the Boating card.
    showPedBikeCard: true,
  },
};
