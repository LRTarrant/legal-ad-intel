import { nebraskaCompetitiveData } from "@/lib/data/competitive-landscape/nebraska";
import type { StateConfig } from "./_types";

export const nebraskaConfig: StateConfig = {
  slug: "nebraska",
  stateCode: "NE",
  stateName: "Nebraska",

  metadata: {
    title: "Nebraska State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Nebraska — combining FARS crash data, Census commute demographics, and market opportunity signals across Omaha, Lincoln, Grand Island, and North Platte.",
  },

  // Source: FARS 2024 Annual Report File. Nebraska does not publish a state-DOT
  // crash volume / motorcycle / speed breakout we can cite at this vintage, so
  // those non-fatality fields are zeroed or nulled per the type contract. Only
  // the FARS-provided values (totals, rural/urban split, alcohol) are populated.
  trafficStats: {
    totalCrashes: 0, // no citable 2024 statewide crash total at this vintage
    totalFatalities: 251,
    motorcycleFatalities: null, // not separately broken out in the FARS ARF
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 90,
    alcoholRelatedPct: 35.9, // FARS 2024 ARF (BAC>=0.08)
    unrestrainedFatalities: 0, // not separately broken out in the FARS ARF
    distractedDrivingFatalCrashes: 0, // not separately broken out in the FARS ARF
    urbanFatalities: 87,
    ruralFatalities: 164,
    reportYear: 2024,
    sourceLabel: "FARS 2024 Annual Report File",
  },

  // Source: BLS Census of Fatal Occupational Injuries — Nebraska 2023.
  // The BLS state release and CFOI state tables could not be retrieved from a
  // citable source at authoring time (bls.gov 403s automated fetch and no
  // verifiable mirror of the 2023 Nebraska total / event-type breakout was
  // confirmable). Per the accuracy-over-completeness rule, the workplace block
  // is left zeroed rather than populated with an unverified figure, and the
  // section is hidden via features.showWorkplaceSection below. Populate the
  // total + event-type counts and flip the flag once a verified BLS 2023
  // Nebraska figure is in hand.
  workplaceStats: {
    totalEmployment: 0,
    qcewCoveredEmployment: 0,
    totalWorkplaceFatalities: 0, // BLS CFOI 2023 Nebraska total not verifiable at this vintage
    constructionFatalities: 0,
    constructionPctTotal: 0,
    transportWarehouseFatalities: 0,
    truckTransportFatalities: null, // not broken out in BLS CFOI 2023 NE tables
    fallsSlipsTrips: 0,
    transportationIncidents: 0,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 2024 1-year estimates (via Census Reporter).
  // driveAlone = B08006 drove-alone (785,728) / total workers (1,036,126) = 75.8%.
  // avgCommuteMinutes = B08013 aggregate travel time (18,578,820) / B08303 commuters (935,212) = 19.9.
  commuteStats: {
    driveAlone: 75.8,
    nationalAvg: 68.7,
    avgCommuteMinutes: 19.9,
  },

  competitiveData: nebraskaCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Nebraska — combining FARS crash data, demographics, and market opportunity signals across Omaha, Lincoln, Grand Island, and North Platte. Population ~2M.",

    legalLandscape:
      "Nebraska is an at-fault (tort) state that uses modified comparative negligence with a 50% bar: a plaintiff's recovery is barred if the plaintiff's negligence is equal to or greater than the combined negligence of the defendants, and is otherwise reduced in proportion to the plaintiff's share of fault (Neb. Rev. Stat. § 25-21,185.09). This 50% bar is stricter than the 51% rule used in neighboring Iowa, where a plaintiff who is exactly 50% at fault still recovers; in Nebraska that same plaintiff recovers nothing (neighboring Kansas applies the same 50% bar as Nebraska). The personal injury statute of limitations is four years from the date of injury (Neb. Rev. Stat. § 25-207), notably longer than the two-year windows in most surrounding states, which widens the intake window but does not reduce the value of fast evidence preservation. Douglas County (Omaha) and Lancaster County (Lincoln) are the state's primary litigation centers.",

    autoAudience:
      "Nebraska's major crash corridors run along I-80 — the primary east-west freight artery, crossing the full width of the state from Omaha through Lincoln, Grand Island, and North Platte to the Wyoming line — and I-29, which carries north-south traffic along the eastern edge of the state through the Omaha–Council Bluffs metro. Drive-alone commuting (75.8%) runs well above the national average (68.7%), concentrating vehicle exposure across the Omaha and Lincoln metros. The Omaha DMA, which also covers western Iowa across the Missouri River, drives the largest share of case volume, followed by Lincoln.",

    truckAudience:
      "Nebraska is a high-volume interstate freight state anchored by I-80, one of the nation's busiest coast-to-coast truck routes, which bisects the state east to west across nearly its entire length. I-29 carries north-south freight along the Missouri River valley through the Omaha–Council Bluffs distribution hub, and U.S. 81 and U.S. 30 add heavy agricultural and grain-hauling traffic on rural routes. Trucking cases on these corridors frequently involve interstate carriers with multi-state insurance structures and venue questions spanning the Nebraska–Iowa line at Omaha–Council Bluffs.",

    motorcycleAudience:
      "Nebraska repealed its universal motorcycle helmet mandate effective January 1, 2025 (LB1004; Neb. Rev. Stat. § 60-6,279): riders 21 and older who hold a valid Class M license and have completed an approved motorcycle safety course may now ride without a helmet, while younger or uncertified riders and passengers still must wear one. The shift away from a universal mandate raises the head-injury severity profile of Nebraska motorcycle crashes going forward, and crashes on rural two-lane highways and along the I-80 corridor already produce serious-injury cases. FARS 2024 Annual Report File does not break out a citable Nebraska motorcycle-fatality count at this vintage. The four-year SOL gives riders a longer filing window than most neighboring states, but early intake and evidence preservation remain the case-value drivers.",

    constructionAudience:
      "Omaha anchors a steady commercial- and infrastructure-construction market, with additional activity around Lincoln and the I-80 corridor. Third-party liability — a non-employer at fault in a crane, scaffold, equipment, or roadway-work-zone incident — is the primary recovery path where workers' compensation limits direct claims against the employer. A verified BLS Census of Fatal Occupational Injuries breakout for Nebraska 2023 could not be confirmed at authoring time, so the workplace-fatality section is not shown on this page; the construction case-acquisition logic above does not depend on those counts.",

    ruralUrbanContext:
      "Nebraska's traffic deaths are predominantly rural: FARS 2024 Annual Report File records 164 rural fatalities against 87 urban (out of 251 total). High-speed two-lane state and U.S. highways, long EMS response times across the western half of the state, and agricultural-equipment traffic drive rural crash severity. Rural Nebraska counties also have lower broadband penetration, so digital-only campaigns underreach them. Local radio, outdoor advertising along I-80, and community media are necessary complements for plaintiff firms targeting non-metro Nebraska.",

    judicialContext:
      "Douglas County (Omaha) and Lancaster County (Lincoln) are Nebraska's primary trial venues and produce the bulk of the state's higher PI verdicts. Sarpy County (suburban Omaha) and Hall County (Grand Island) are secondary venues. Nebraska juries are generally regarded as moderate relative to the largest plaintiff-favorable metros nationally, which — combined with the strict 50% comparative-fault bar — makes venue selection and a clean liability picture meaningful drivers of expected case value.",

    marketSaturationTitle: "Omaha vs. Secondary Nebraska Markets",
    marketSaturationTip:
      "The Omaha DMA is Nebraska's largest media market and attracts the highest PI advertiser concentration in the state. Because the Omaha DMA also covers western Iowa across the Missouri River, firms buying Omaha media reach Council Bluffs and the surrounding Iowa counties as well. Lincoln is the second market, smaller and with lower ad saturation, anchored by state government and the University of Nebraska. Grand Island-Kearney-Hastings and North Platte are rural markets with favorable cost-per-case economics and far lighter advertiser competition.",

    freightCorridorTitle: "I-80 / I-29 Freight Corridors",
    freightCorridorTip:
      "I-80 is one of the highest-volume long-haul truck routes in the country and runs the full width of Nebraska, from Omaha through Lincoln, Grand Island, and North Platte to Wyoming. I-29 carries north-south freight along the Missouri River through the Omaha–Council Bluffs distribution hub. Truck-crash cases on these corridors commonly involve out-of-state carriers and multi-state insurance and venue issues, including the Nebraska–Iowa border at Omaha.",

    solUrgencyTitle: "4-Year SOL — Longer Window, Same Intake Urgency",
    solUrgencyTip:
      "Nebraska's four-year personal injury statute of limitations (Neb. Rev. Stat. § 25-207) is among the longer windows in the country and well beyond the two-year SOL in most neighboring states. The longer window eases filing pressure, but claims against governmental entities (the state, counties, or municipalities) carry separate, shorter notice requirements under the Political Subdivisions Tort Claims Act. Fast intake and early evidence preservation still protect case value and the client relationship, and the strict 50% comparative-fault bar makes early liability development especially important.",

    internetAccessTitle: "Rural Nebraska Connectivity Gap",
    internetAccessTip:
      "Nebraska's rural counties — which absorb the majority of the state's traffic fatalities (164 rural vs. 87 urban in FARS 2024) — have lower broadband penetration than the Omaha and Lincoln metros, particularly across the central and western thirds of the state along I-80. Digital-only campaigns underreach these high-severity crash markets. Local radio, outdoor advertising along the I-80 corridor, and community partnerships are necessary channels for plaintiff firms seeking cases outside Nebraska's metros.",

    outOfStateTitle: "I-80 Through-Traffic & Omaha–Council Bluffs Opportunity",
    outOfStateTip:
      "I-80's heavy cross-country through-traffic means many seriously injured motorists on Nebraska roads are out-of-state travelers who do not know local PI attorneys or Nebraska's four-year SOL and strict 50% comparative-fault rule. The Omaha DMA's reach across the Missouri River into western Iowa also captures cases on both sides of the state line. Geo-fenced digital along the I-80 and I-29 corridors, paired with messaging on Nebraska's at-fault rules, can capture these cases before injured out-of-state parties engage counsel back home.",

    footerSourcesLabel:
      "FARS 2024 Annual Report File; U.S. Census ACS 2024 1-year estimates",
  },

  // Workplace section hidden: a verified BLS CFOI 2023 Nebraska total could not
  // be confirmed at authoring time (bls.gov 403s automated fetch). Flip to true
  // and populate workplaceStats once a citable figure is in hand.
  features: {
    showWorkplaceSection: false,
  },

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
