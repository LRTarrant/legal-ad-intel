import { districtOfColumbiaCompetitiveData } from "@/lib/data/competitive-landscape/district-of-columbia";
import type { StateConfig } from "./_types";

export const districtOfColumbiaConfig: StateConfig = {
  slug: "district-of-columbia",
  stateCode: "DC",
  stateName: "District of Columbia",

  metadata: {
    title: "District of Columbia State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in the District of Columbia — combining FARS crash data, demographics, judicial profiles, and market opportunity signals for the Washington, DC market.",
  },

  // Source: FARS 2024 Annual Report File. DC is 100% urban — rural fatalities ~0.
  trafficStats: {
    totalCrashes: 0, // not a citable FARS field; left 0 per data rule
    totalFatalities: 47,
    motorcycleFatalities: null, // not in our FARS data; no citable DC-DOT 2024 figure
    speedRelatedFatalities: null, // not in our FARS data
    speedRelatedPct: null,
    alcoholRelatedFatalities: 7,
    alcoholRelatedPct: 14.9,
    unrestrainedFatalities: 0, // not citable for DC; left 0 per data rule
    distractedDrivingFatalCrashes: 0, // not citable for DC; left 0 per data rule
    urbanFatalities: 47,
    ruralFatalities: 0,
    reportYear: 2024,
    sourceLabel: "FARS 2024 Annual Report File",
  },

  // Source: BLS Census of Fatal Occupational Injuries — District of Columbia 2023.
  // Only the statewide total (12) is publicly verifiable; the small case count
  // means BLS suppresses the industry/event breakdown for DC. Sub-fields are
  // zeroed and the workplace section is hidden via features.showWorkplaceSection.
  workplaceStats: {
    totalEmployment: 0, // not separately verified for DC 2023
    qcewCoveredEmployment: 0,
    totalWorkplaceFatalities: 12,
    constructionFatalities: 0, // suppressed in BLS CFOI 2023 DC breakout
    constructionPctTotal: 0,
    transportWarehouseFatalities: 0, // suppressed
    truckTransportFatalities: null, // not broken out in BLS CFOI 2023 DC tables
    fallsSlipsTrips: 0, // suppressed
    transportationIncidents: 0, // suppressed
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 2024 1-year (via Census Reporter, geo 04000US11).
  // driveAlone = B08006003 / B08006001 = 113,852 / 388,136 = 29.3%.
  // avgCommuteMinutes = B08013001 / B08303001 = 9,285,580 / 299,410 = 31.0.
  commuteStats: {
    driveAlone: 29.3,
    nationalAvg: 68.7,
    avgCommuteMinutes: 31.0,
  },

  competitiveData: districtOfColumbiaCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in the District of Columbia — combining FARS crash data, demographics, judicial profiles, and market opportunity signals for the Washington, DC market. The District is a single, fully urban jurisdiction of roughly 700,000 residents whose daytime population swells well past 1 million with commuters from Northern Virginia and suburban Maryland.",

    legalLandscape:
      "The District of Columbia is one of only a handful of U.S. jurisdictions that still applies pure contributory negligence: a plaintiff found even 1% at fault is completely barred from recovery (DC common law, alongside Virginia, Maryland, Alabama, and North Carolina). This is the single most important fact for case selection in the District — liability must be clean. The one major exception is the Motor Vehicle Collision Recovery Act of 2016 (D.C. Code § 50-2204.52), which replaces contributory negligence with a comparative-fault standard for vulnerable users — pedestrians, cyclists, and other non-motorized users — so a pedestrian or cyclist is not automatically barred by minor fault. The personal injury statute of limitations is three years from the date of injury (D.C. Code § 12-301). The District operates an optional no-fault/PIP auto insurance system: after a collision an insured has 60 days to elect personal injury protection benefits, and electing PIP generally limits the right to sue unless the injury crosses a statutory tort threshold (substantial permanent scarring/disfigurement, substantial and medically demonstrable permanent impairment, or medical expenses exceeding the PIP benefit). The District requires all motorcycle operators and passengers to wear helmets (a universal helmet law).",

    autoAudience:
      "The District's crash exposure is overwhelmingly urban and arterial rather than highway. I-295 and the Anacostia Freeway, I-395 and the 14th Street Bridge corridor, New York Avenue NE (US 50), and the high-volume downtown grid carry the bulk of serious-injury collisions. Only 29.3% of DC commuters drive alone — far below the national 68.7% — because transit, walking, and cycling dominate, which means pedestrian and cyclist cases are a disproportionate share of the District's injury volume relative to typical drive-alone states. The contributory-negligence bar makes the vulnerable-user exception under the Motor Vehicle Collision Recovery Act central to viable pedestrian and bike intake.",

    truckAudience:
      "Commercial-vehicle exposure in the District concentrates on the I-295/Anacostia Freeway and I-395 connections that link the Capital Beltway freight network into the city, plus delivery and construction-vehicle traffic on the downtown grid. Volume is modest relative to true interstate freight states because through-trucking largely routes around the District on the Beltway (I-495). Trucking cases here frequently involve interstate carriers with multi-state insurance structures and venue questions spanning DC, Virginia, and Maryland — and the contributory-negligence rule makes early scene reconstruction and clean-liability assessment essential before intake.",

    constructionAudience:
      "The District sustains a continuous high-rise, federal, and mixed-use construction cycle across downtown, NoMa, the Southwest Waterfront, and the Capitol Riverfront. BLS suppresses the District's 2023 construction fatality count given the small total (12 work fatalities overall), so a reliable construction-specific figure is not published. Third-party liability — crane, scaffold, electrical, and OSHA-cited incidents involving a non-employer at fault — remains the primary recovery path where workers' compensation limits direct claims against the employer.",

    motorcycleAudience:
      "FARS 2024 does not provide a separately citable District motorcycle-fatality count in our data, and no DC-DOT 2024 figure is verified here, so a number is intentionally not shown. The District requires all riders and passengers to wear helmets (universal helmet law). Given the dense urban grid and the volume of out-of-jurisdiction riders entering from Virginia and Maryland, motorcycle cases that do occur often involve riders unfamiliar with the District's contributory-negligence rule and 3-year SOL.",

    ruralUrbanContext:
      "The District is effectively 100% urban — FARS 2024 records 0 rural fatalities and 47 urban fatalities. There is no rural/urban media split to plan around; the entire jurisdiction is a single dense metro core. The practical planning question is not rural reach but daytime-versus-resident population: a large share of people injured in the District live in Northern Virginia or suburban Maryland and commute in, which shapes both where advertising lands and which state's counsel a prospect may default to.",

    judicialContext:
      "Personal injury cases in the District are heard in the Superior Court of the District of Columbia (Civil Division), with appeals to the District of Columbia Court of Appeals. The District has historically been viewed as a moderate-to-plaintiff-receptive venue, but the pure contributory-negligence rule is the dominant variable: even a strong-damages case can be defeated by a finding of minimal plaintiff fault. Venue and choice-of-law analysis matters acutely here because a collision involving DC, Virginia, and Maryland parties can implicate three different negligence regimes, and counsel will often weigh whether DC's contributory bar or a neighboring comparative-fault forum better serves the client.",

    marketSaturationTitle: "A Single, Saturated Metro Market",
    marketSaturationTip:
      "The District is one media market — the Washington, DC DMA, which also covers Northern Virginia and suburban Maryland and ranks among the top ten U.S. markets by population. There is no secondary-market arbitrage to exploit within the District itself; advertiser concentration and cost-per-case are uniformly high. The competitive edge here is targeting and message precision (vulnerable-user pedestrian/cyclist cases, transit-related injuries, clean-liability auto) rather than finding an under-saturated geography.",

    solUrgencyTitle: "3-Year SOL, but Contributory Negligence Is the Real Clock",
    solUrgencyTip:
      "The District's personal injury statute of limitations is three years (D.C. Code § 12-301) — longer than neighboring states' shorter windows in some categories — but the binding constraint in the District is the pure contributory-negligence bar, not the filing deadline. Because any plaintiff fault defeats the entire claim, early scene evidence, witness statements, and traffic-camera footage are decisive. Claims against the District government or transit agencies (WMATA) can carry separate, much shorter notice-of-claim requirements, so flag municipal and transit defendants at intake.",

    internetAccessTitle: "Digital-First, High-Cost Market",
    internetAccessTip:
      "The District has among the highest broadband and smartphone penetration in the country, so there is no connectivity gap to plan around — campaigns can run digital-first. The trade-off is cost: search and social CPCs in the Washington, DC market are elevated by both the dense legal advertiser field and the federal/government-adjacent advertiser base bidding on overlapping audiences. Tight geo and audience targeting (transit corridors, hospital catchments, vulnerable-user segments) protects cost-per-case.",

    outOfStateTitle: "Cross-Border Commuters & Visitors",
    outOfStateTip:
      "A large share of people injured in the District live in Northern Virginia or suburban Maryland, and the city draws heavy tourist and event traffic year-round. Many of these prospects do not know the District's pure contributory-negligence rule, its 3-year SOL, or its optional PIP/no-fault election, and may default to counsel in their home state. Geo-fenced digital along the I-395/I-295 commuter corridors, transit hubs, and major event/tourism zones can capture these cases before they engage Virginia or Maryland firms.",

    footerSourcesLabel:
      "FARS 2024 Annual Report File (NHTSA); BLS Census of Fatal Occupational Injuries — District of Columbia 2023; U.S. Census ACS 2024 1-year.",
  },

  features: {
    // Boating data for the District is negligible / not maintained — hide.
    showBoatingSummary: false,
    // BLS suppresses the DC industry/event breakdown; only the total (12) is
    // verifiable, so the workplace section is hidden rather than shown with zeros.
    showWorkplaceSection: false,
  },

  // No injuryData yet; add when District-specific deep crash data is integrated.
};
