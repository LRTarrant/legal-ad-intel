import { newJerseyCompetitiveData } from "@/lib/data/competitive-landscape/new-jersey";
import type { StateConfig } from "./_types";

export const newJerseyConfig: StateConfig = {
  slug: "new-jersey",
  stateCode: "NJ",
  stateName: "New Jersey",

  metadata: {
    title: "New Jersey State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in New Jersey — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across the New York and Philadelphia DMAs (Newark, Jersey City, Edison, Camden, Atlantic City).",
  },

  // Source: FARS 2024 preliminary (already in our DB). Rural + urban (100 + 561
  // = 661) is 9 short of the 670 total because 9 fatalities have an unknown
  // rural/urban classification in the preliminary FARS file — mirrored as-is.
  trafficStats: {
    totalCrashes: 0, // no citable NJ statewide crash-volume figure verified; left 0
    totalFatalities: 670,
    motorcycleFatalities: null, // no authoritative NJ FARS 2024 motorcycle figure verified
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 144,
    alcoholRelatedPct: 21.5, // 144 / 670
    unrestrainedFatalities: 0, // no citable NJ figure verified; left 0
    distractedDrivingFatalCrashes: 0, // no citable NJ figure verified; left 0
    urbanFatalities: 561,
    ruralFatalities: 100,
    reportYear: 2024,
    sourceLabel: "FARS 2024 (preliminary)",
  },

  // Source: BLS Census of Fatal Occupational Injuries — New Jersey 2023.
  // 81 total fatal work injuries. Construction 16 (20%). Transportation
  // incidents (event type) 17. Falls, slips, and trips 19. Transportation &
  // warehousing industry count and truck-transport sub-group are not broken
  // out in the BLS Mid-Atlantic NJ 2023 release — left 0 / null rather than
  // invented.
  workplaceStats: {
    totalEmployment: 0, // not stated in the NJ CFOI 2023 release; left 0
    qcewCoveredEmployment: 0, // not stated in the NJ CFOI 2023 release; left 0
    totalWorkplaceFatalities: 81,
    constructionFatalities: 16,
    constructionPctTotal: 19.8, // 16 / 81 (release rounds to "20%")
    transportWarehouseFatalities: 0, // industry count not broken out in NJ 2023 release
    truckTransportFatalities: null, // not broken out in BLS CFOI 2023 NJ tables
    fallsSlipsTrips: 19,
    transportationIncidents: 17,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 2024 1-year estimates (New Jersey).
  // Drove alone 63.3% (3,018,867 / 4,772,330 workers). Mean travel time 31.9
  // min (131,588,270 aggregate minutes / 4,127,781 workers not at home).
  commuteStats: {
    driveAlone: 63.3,
    nationalAvg: 68.7,
    avgCommuteMinutes: 31.9,
  },

  competitiveData: newJerseyCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in New Jersey — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across Newark, Jersey City, Edison, Camden, and Atlantic City. The nation's most densely populated state (~9.3M people) split across two of the most expensive media markets in the country.",

    legalLandscape:
      "New Jersey uses modified comparative negligence with a 51% bar: a plaintiff who is more than 50% at fault recovers nothing, while a plaintiff at 50% or less recovers with damages reduced by their share of fault (N.J.S.A. 2A:15-5.1). The personal injury statute of limitations is two years from the date of injury (N.J.S.A. 2A:14-2). New Jersey imposes no general statutory cap on non-economic damages in standard PI cases. Critically, New Jersey is a no-fault auto state: every standard auto policy includes Personal Injury Protection (PIP), and drivers elect between the 'limitation on lawsuit' option (the verbal threshold, which bars suit for non-economic damages unless the injury is permanent or fits a statutory category) and the 'no limitation' option (full right to sue). The threshold the injured driver chose at policy purchase materially shapes whether an auto case can recover pain-and-suffering damages, which makes intake screening of the plaintiff's own coverage election a first-call necessity.",

    autoAudience:
      "New Jersey's crash exposure concentrates on the nation's densest highway network: the New Jersey Turnpike (I-95) and Garden State Parkway spine, I-78 and I-80 across the north, I-280 and Route 1/9 through the Newark–Jersey City core, and the Atlantic City Expressway and I-295 in the south. Drive-alone commuting (63.3%) runs below the national average (68.7%) because New Jersey has one of the highest transit-commute shares in the country, but mean travel time (31.9 minutes) is among the longest of any state — long, congested commutes raise rear-end and multi-vehicle exposure. The auto case map, however, is dominated by the no-fault PIP framework: every intake must establish which lawsuit threshold the claimant elected before case value can be assessed.",

    truckAudience:
      "New Jersey is one of the most freight-intensive states in the country. The Port of New York and New Jersey (Newark/Elizabeth) is the busiest container port on the East Coast, feeding a dense web of distribution and warehousing along the Turnpike, I-78, and Route 1/9. I-95, I-80, and I-287 carry continuous interstate truck traffic between the New York metro and the rest of the Northeast corridor. Commercial-vehicle crashes here routinely involve interstate carriers, port drayage operators, and multi-layer insurance structures. Transportation incidents were the single largest category of New Jersey work fatalities in 2023 (17 of 81), reflecting the state's heavy port-and-corridor freight economy.",

    motorcycleAudience:
      "New Jersey enforces a universal motorcycle helmet law — every rider and passenger, regardless of age or experience, must wear a helmet — which affects both injury severity and the comparative-fault narrative in motorcycle cases. Recreational riding concentrates on the rural routes of northwestern New Jersey (Sussex, Warren, Hunterdon), the Pinelands, and the Jersey Shore corridors, drawing riders from the dense New York and Philadelphia metros on both sides of the state. The 2-year SOL and the no-fault PIP framework (motorcycles are not covered by standard auto PIP in the same way) make early intake and coverage analysis especially important for motorcycle claims.",

    constructionAudience:
      "New Jersey runs a continuous high-density construction pipeline: port and warehouse expansion around Newark/Elizabeth, transit and infrastructure work (Gateway, NJ Transit), and residential and commercial development across the northern counties and the Jersey Shore. Construction fatalities were 16 of 81 New Jersey workplace deaths in 2023 (about 20%). Third-party liability — crane, scaffold, electrical, and OSHA-cited incidents involving a non-employer at fault — is the primary recovery path where workers' compensation limits direct claims against the employer. Workers on active North Jersey and Shore-area job sites and their families are the primary target.",

    ruralUrbanContext:
      "New Jersey is overwhelmingly urban: 561 of the 670 FARS 2024 preliminary fatalities were urban versus 100 rural (9 unclassified). The rural share concentrates in the northwest highlands (Sussex, Warren, Hunterdon) and the Pinelands and farm belt of the south (Salem, Cumberland, Atlantic, Burlington). Those rural pockets have higher per-capita fatality rates and thinner broadband than the metro core, so radio, outdoor, and community media still matter there. But the dominant planning fact is the opposite of most states: New Jersey's case volume lives in dense urban and suburban corridors, and the media buy is governed by two out-of-state DMAs rather than any in-state market.",

    judicialContext:
      "New Jersey has a unified Superior Court system organized into 15 vicinages. Essex County (Newark) and Middlesex County are high-volume civil venues; Camden and Atlantic counties anchor the south. Plaintiff-favorability varies by vicinage, and venue analysis — plaintiff residency, defendant's place of business, and where the crash or injury occurred — can shift expected case value. New Jersey's mass-tort program (centralized in specific vicinages such as Middlesex/Atlantic) is one of the most active in the nation, a relevant signal for firms running both single-event PI and mass-tort intake.",

    marketSaturationTitle: "New Jersey Has No In-State DMA — You Buy New York and Philadelphia",
    marketSaturationTip:
      "New Jersey is the largest U.S. state with no Nielsen DMA of its own. North and Central New Jersey — Newark, Jersey City, Edison/Middlesex, and the bulk of the population — fall inside the New York DMA, the most expensive media market in the country. South Jersey — Camden, Atlantic City, and the Philadelphia suburbs — falls inside the Philadelphia DMA, itself a top-five market. The practical effect: a statewide New Jersey firm competes for impressions against New York City and Philadelphia advertisers and pays metro-tier rates, with no cheap in-state broadcast option. Geo-targeted digital, addressable TV, and DMA-edge radio (North Jersey suburban stations, South Jersey/Shore stations) are how firms buy New Jersey efficiently without funding wasted reach into the two core cities.",

    freightCorridorTitle: "Port of NY/NJ & Turnpike Freight Corridors",
    freightCorridorTip:
      "The Port of New York and New Jersey is the East Coast's busiest container gateway, and the New Jersey Turnpike (I-95), I-78, and Route 1/9 form one of the densest truck-freight networks in the country. Drayage operators, regional carriers, and national interstate fleets all converge here, so trucking PI cases frequently involve out-of-state defendants, layered commercial insurance, and complex venue questions. The port-and-corridor freight economy also drove the state's leading workplace-fatality category in 2023 (transportation incidents, 17 of 81).",

    solUrgencyTitle: "2-Year SOL Plus a No-Fault Coverage Screen on Every Auto Case",
    solUrgencyTip:
      "New Jersey's personal injury statute of limitations is two years (N.J.S.A. 2A:14-2). On auto cases the clock is only half the urgency: because New Jersey is a no-fault PIP state, the claimant's own lawsuit-threshold election ('limitation on lawsuit' verbal threshold vs. 'no limitation') decides whether pain-and-suffering damages are even recoverable, so intake must pull the plaintiff's policy election early. Claims against public entities (NJ Transit, the Turnpike Authority, municipalities) trigger Tort Claims Act notice requirements with a 90-day window — far shorter than the 2-year SOL. Fast intake and coverage analysis protect both the case and the client relationship before any of these bars close.",

    internetAccessTitle: "Northwest Highlands & Pinelands Connectivity Gap",
    internetAccessTip:
      "Despite being the densest state, New Jersey has rural broadband gaps in the northwest highlands (Sussex, Warren, Hunterdon) and the Pinelands and farm belt of the south (Salem, Cumberland, Atlantic). These areas carry higher per-capita crash exposure along routes like I-80, Route 206, and the Atlantic City Expressway feeders. Digital-only campaigns underreach them. Local radio, outdoor, and community partnerships remain necessary channels to capture cases outside the New York and Philadelphia metro cores.",

    outOfStateTitle: "Jersey Shore & Atlantic City Visitor Opportunity",
    outOfStateTip:
      "The Jersey Shore and Atlantic City draw heavy seasonal traffic from the New York and Philadelphia metros and beyond. Out-of-state visitors injured in New Jersey often don't know local PI counsel, the state's 2-year SOL, or its no-fault PIP rules — and their own out-of-state auto coverage interacts in non-obvious ways with a New Jersey crash. Geo-fenced digital along the Garden State Parkway and Atlantic City Expressway, paired with Shore-area and casino-corridor placements during peak season, can capture these cases before visitors engage out-of-state counsel.",

    footerSourcesLabel:
      "FARS 2024 (preliminary) for fatalities; BLS CFOI 2023 for workplace fatalities; U.S. Census ACS 2024 1-year for commuting.",
  },

  // BLS CFOI 2023 gives total, construction, transportation incidents, and
  // falls for New Jersey, so the workplace section has enough verified data to
  // render. Employment denominators and truck sub-group were not in the
  // release and are left 0 / null.
  features: {
    showWorkplaceSection: true,
  },

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
