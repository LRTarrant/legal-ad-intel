import { idahoCompetitiveData } from "@/lib/data/competitive-landscape/idaho";
import type { StateConfig } from "./_types";

export const idahoConfig: StateConfig = {
  slug: "idaho",
  stateCode: "ID",
  stateName: "Idaho",

  metadata: {
    title: "Idaho State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Idaho — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across Boise, Idaho Falls, Pocatello, Twin Falls, and the northern panhandle.",
  },

  // Source: FARS 2024 Annual Report File (fatality counts only). totalCrashes
  // is not a FARS measure (FARS counts fatal crashes/fatalities, not all
  // crashes), so it is 0 here pending a citable Idaho Transportation Department
  // (ITD) total-crash figure. motorcycle/speed/unrestrained/distracted are not
  // in the FARS subset we were handed and are not back-derived (HARD RULE).
  trafficStats: {
    totalCrashes: 0, // not a FARS measure; no citable ITD 2024 total-crash figure on hand
    totalFatalities: 238,
    motorcycleFatalities: null, // no citable ITD 2024 figure
    speedRelatedFatalities: null, // no citable ITD 2024 figure
    speedRelatedPct: null,
    alcoholRelatedFatalities: 84,
    alcoholRelatedPct: 35.3,
    unrestrainedFatalities: 0, // not in supplied FARS subset; not back-derived
    distractedDrivingFatalCrashes: 0, // not in supplied FARS subset; not back-derived
    urbanFatalities: 59,
    ruralFatalities: 179,
    reportYear: 2024,
    sourceLabel: "FARS 2024 Annual Report File",
  },

  // Source: BLS Census of Fatal Occupational Injuries — Idaho 2023, as
  // published by the Idaho Department of Labor (Research & Analysis Bureau),
  // "2023 Idaho Census of Fatal Occupational Injuries" (Feb 2025), mirroring
  // BLS CFOI tables A-1 / A-9. Total = 48. Transportation incidents = 50% = 24.
  // Falls/slips/trips = 6 (~13%). Construction industry = 6 (~12.5%).
  // truckTransportFatalities is null: the report publishes the combined
  // "trade, transportation and utilities" sector (10), not transportation-and-
  // warehousing alone, so the isolated figure is not citable. totalEmployment /
  // qcewCoveredEmployment are 0: no confident 2023 QCEW covered-employment
  // figure on hand (HARD RULE — not fabricated).
  workplaceStats: {
    totalEmployment: 0, // no citable 2023 figure on hand; not fabricated
    qcewCoveredEmployment: 0, // no citable 2023 QCEW figure on hand; not fabricated
    totalWorkplaceFatalities: 48,
    constructionFatalities: 6,
    constructionPctTotal: 12.5,
    transportWarehouseFatalities: 0, // see truck note; sector reported combined, not isolated
    truckTransportFatalities: null, // not broken out in CFOI 2023 Idaho tables (TTU reported combined)
    fallsSlipsTrips: 6,
    transportationIncidents: 24,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 2024 1-year estimates (via Census Reporter).
  // driveAlone = B08006003 / B08006001 = 693,714 / 952,044 = 72.9%.
  // avgCommuteMinutes = B08013001 / B08303001 = 18,443,220 / 831,068 = 22.2.
  commuteStats: {
    driveAlone: 72.9,
    nationalAvg: 68.7,
    avgCommuteMinutes: 22.2,
  },

  competitiveData: idahoCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Idaho — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across Boise, Idaho Falls, Pocatello, Twin Falls, and the Coeur d'Alene panhandle. Population ~2M, with the fastest growth concentrated in the Boise (Treasure Valley) metro.",

    legalLandscape:
      "Idaho uses modified comparative negligence with a 50% bar: a plaintiff's recovery is barred if their fault is as great as the defendant's, and otherwise reduced by their share of fault (Idaho Code § 6-801). The personal injury statute of limitations is two years from the date of injury (Idaho Code § 5-219). Idaho is an at-fault (tort) state for auto claims. Critically for case value, Idaho imposes a statutory cap on non-economic damages that is adjusted annually for inflation (Idaho Code § 6-1603) — the cap does not apply to economic damages, and statutory exceptions exist (for example, willful or reckless misconduct and felonious conduct), so damages modeling and venue analysis matter more in Idaho than in uncapped states. Ada County (Boise) is the dominant litigation center.",

    autoAudience:
      "Idaho's fatal crash exposure is overwhelmingly rural: of 238 traffic fatalities in 2024 (FARS), 179 were rural versus 59 urban — a roughly 75/25 split that is among the most rural in the nation. The primary corridors are I-84 (running diagonally southeast-to-northwest through the Treasure Valley, Twin Falls, and on toward Oregon), I-86 (Pocatello to the I-84 junction near Heyburn), I-15 (the north-south spine through Pocatello and Idaho Falls toward the Montana and Utah borders), and I-90 across the northern panhandle. Drive-alone commuting (72.9%) runs above the national average (68.7%). The Boise/Treasure Valley metro (Ada and Canyon counties) drives the largest share of case volume; Idaho Falls/Pocatello and Twin Falls are secondary southern markets.",

    truckAudience:
      "Idaho is a long-haul freight pass-through state. I-84 carries interstate truck traffic between the Pacific Northwest and the Mountain West / Utah; I-15 is the primary north-south freight artery linking Salt Lake City to Montana through Pocatello and Idaho Falls; I-90 moves cross-country freight across the panhandle between Spokane and Montana. The heavy rural fatality share (179 of 238 in 2024) correlates with high-speed two-lane and interstate truck exposure where belt use and emergency-response times are worse than in the metros. Trucking cases on these corridors frequently involve out-of-state motor carriers with multi-state insurance structures.",

    motorcycleAudience:
      "Idaho's mountain and high-desert routes — the Sawtooths, the Payette and Salmon river corridors, and the panhandle lake country around Coeur d'Alene — draw recreational and out-of-state riders, including riders crossing in from Washington, Oregon, Utah, and Montana. Idaho requires helmets only for riders under 18 (Idaho Code § 49-666); adult riders are not required to wear helmets, which tends to raise injury severity in rider cases. The 2-year SOL (Idaho Code § 5-219) and the non-economic damages cap (Idaho Code § 6-1603) together make early intake and careful damages documentation important for motorcycle claims. (Idaho-specific 2024 motorcycle fatality counts are not reflected in the FARS subset shown here.)",

    constructionAudience:
      "Construction accounted for six of Idaho's 48 workplace fatalities in 2023 (about 13%), half of them from falls, slips, or trips (Idaho Department of Labor / BLS CFOI 2023). The Treasure Valley's sustained population boom has produced one of the most active residential and commercial construction markets in the Mountain West, concentrating exposure around Boise, Meridian, Nampa, and Caldwell. Third-party liability — a non-employer at fault on a job site, such as a general contractor, equipment supplier, or property owner — is the primary recovery path where Idaho workers' compensation limits direct claims against the employer.",

    ruralUrbanContext:
      "Idaho's fatal-crash burden is among the most rural in the country: 179 of 238 traffic fatalities in 2024 were rural (FARS), versus 59 urban. Rural Idaho counties — the panhandle, the central mountains, and the eastern Snake River Plain outside the metros — combine long EMS response distances, high travel speeds, and lower seatbelt compliance. These same markets have thinner broadband coverage, so digital-only campaigns underreach them. Radio, outdoor, and local/community media are necessary complements for plaintiff firms targeting non-metro Idaho.",

    judicialContext:
      "Idaho is generally regarded as a conservative, defense-leaning civil jurisdiction, and the statutory non-economic damages cap (Idaho Code § 6-1603) further constrains verdict ceilings relative to uncapped states. Ada County (Boise) is the highest-volume venue and the most urban jury pool; Canyon County (Nampa/Caldwell), Bonneville County (Idaho Falls), Bannock County (Pocatello), and Twin Falls County are the principal secondary venues. Kootenai County (Coeur d'Alene) anchors the northern panhandle. Venue and damages modeling matter more in Idaho than in uncapped jurisdictions because the cap interacts directly with expected case value.",

    marketSaturationTitle: "Boise/Treasure Valley vs. Secondary & Out-of-DMA Markets",
    marketSaturationTip:
      "Boise (the Treasure Valley — Ada and Canyon counties) is Idaho's dominant media market and attracts the highest PI advertiser concentration in the state. Idaho Falls-Pocatello and Twin Falls in the south offer mid-market opportunities with materially lower ad saturation and favorable cost-per-case economics. Note the geography of the northern panhandle: Coeur d'Alene and the surrounding Kootenai County fall inside the Spokane, WA DMA, so buying north-Idaho cases means buying Spokane media and competing against Washington firms — plan that corridor separately from the in-state Idaho markets.",

    freightCorridorTitle: "I-84 / I-15 / I-90 Freight Corridors",
    freightCorridorTip:
      "I-84 carries Pacific-Northwest-to-Mountain-West freight diagonally across southern Idaho through the Treasure Valley and Twin Falls; I-15 is the north-south freight spine from Salt Lake City through Pocatello and Idaho Falls toward Montana; I-90 moves cross-country freight across the panhandle between Spokane and Montana. Trucking PI cases on these routes commonly involve interstate carriers, and the panhandle's I-90 exposure straddles the Idaho/Washington line — raising venue and choice-of-law questions that intersect with Idaho's damages cap.",

    solUrgencyTitle: "2-Year SOL — Tight Window in a Rural State",
    solUrgencyTip:
      "Idaho's personal injury statute of limitations is two years from the date of injury (Idaho Code § 5-219). In a state where most fatal and serious crashes happen on rural corridors far from the metros, injured claimants are often slower to reach counsel — making fast intake, early evidence preservation, and prompt provider engagement especially important before the SOL becomes a bar. Claims against government entities can carry separate, shorter notice-of-claim deadlines under the Idaho Tort Claims Act.",

    internetAccessTitle: "Rural Idaho Connectivity Gap",
    internetAccessTip:
      "Idaho's rural counties — the panhandle, the central mountains, and the eastern Snake River Plain outside Boise, Idaho Falls, and Pocatello — have lower broadband penetration than the Treasure Valley. These are the same areas carrying the bulk of the state's rural crash fatalities (179 of 238 in 2024). Digital-only campaigns underreach them. Local radio, outdoor advertising, and community partnerships are necessary channels for plaintiff firms seeking cases outside the metros.",

    outOfStateTitle: "Out-of-State Riders, Tourists & Panhandle Spillover",
    outOfStateTip:
      "Idaho's recreation corridors — the Sawtooths, the lake country around Coeur d'Alene and Sandpoint, and the river canyons — draw heavy out-of-state visitor and rider traffic from Washington, Oregon, Utah, and Montana. Visitors injured in Idaho often do not know local PI attorneys, the 2-year SOL, or that Idaho caps non-economic damages. Geo-fenced digital along I-84, I-90, and the resort corridors, plus partnerships with north-Idaho accommodations, can capture these cases — but remember that panhandle media buys run through the Spokane, WA DMA.",

    footerSourcesLabel:
      "FARS 2024 Annual Report File (NHTSA); BLS Census of Fatal Occupational Injuries 2023 (Idaho Dept. of Labor); U.S. Census ACS 2024 1-Year Estimates",
  },

  features: {
    // Workplace breakdown (total + event + construction industry) is verified
    // from the Idaho Dept. of Labor 2023 CFOI report, so the section is shown.
    showWorkplaceSection: true,
  },

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
