import { oklahomaCompetitiveData } from "@/lib/data/competitive-landscape/oklahoma";
import type { StateConfig } from "./_types";

export const oklahomaConfig: StateConfig = {
  slug: "oklahoma",
  stateCode: "OK",
  stateName: "Oklahoma",

  metadata: {
    title: "Oklahoma State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Oklahoma — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across Oklahoma City, Tulsa, Lawton, and the Sherman-Ada border market.",
  },

  // Source: NHTSA FARS 2024 (preliminary). Statewide fatality counts only;
  // motorcycle and speed-related fatalities are not broken out in the
  // preliminary FARS release for Oklahoma, so they remain null. totalCrashes,
  // unrestrainedFatalities, and distractedDrivingFatalCrashes are not carried
  // in the preliminary FARS counts used here and are set to 0 (no citable
  // Oklahoma-DOT 2024 figure verified).
  trafficStats: {
    totalCrashes: 0,
    totalFatalities: 645,
    motorcycleFatalities: null,
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 225,
    alcoholRelatedPct: 34.9,
    unrestrainedFatalities: 0,
    distractedDrivingFatalCrashes: 0,
    urbanFatalities: 272,
    ruralFatalities: 372,
    reportYear: 2024,
    sourceLabel: "FARS 2024 (preliminary)",
  },

  // Source: BLS Census of Fatal Occupational Injuries — Oklahoma 2023.
  // Only the statewide total (76 fatal work injuries, up from 70 in 2022) is
  // verified; the event/industry breakdown (construction, transportation
  // incidents, falls, transportation & warehousing) could not be verified from
  // a citable source (bls.gov 403s automated fetch and no mirror confirmed the
  // splits). Per the accuracy-over-completeness rule, the breakdown fields are
  // zeroed and features.showWorkplaceSection is false so unverified detail is
  // never rendered. Set these to the real BLS splits when a citable Oklahoma
  // state table is confirmed, then flip showWorkplaceSection back on.
  workplaceStats: {
    totalEmployment: 0,
    qcewCoveredEmployment: 0,
    totalWorkplaceFatalities: 76,
    constructionFatalities: 0,
    constructionPctTotal: 0,
    transportWarehouseFatalities: 0,
    truckTransportFatalities: null,
    fallsSlipsTrips: 0,
    transportationIncidents: 0,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 2024 1-year (via Census Reporter).
  // driveAlone = B08006003 (1,440,715) / B08006001 (1,876,156) = 76.8%.
  // avgCommuteMinutes = B08013001 (38,815,112) / B08303001 (1,708,670) = 22.7.
  commuteStats: {
    driveAlone: 76.8,
    nationalAvg: 68.7,
    avgCommuteMinutes: 22.7,
  },

  competitiveData: oklahomaCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Oklahoma — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across Oklahoma City, Tulsa, Lawton, and the Sherman-Ada border market. Population ~4.1M, with Oklahoma City and Tulsa as the two dominant metros.",

    legalLandscape:
      "Oklahoma is a traditional at-fault (tort) state that applies modified comparative negligence with a 51% bar: a plaintiff who is more than 50% at fault recovers nothing, while a plaintiff who is 50% or less at fault recovers with damages reduced by their share of fault (23 O.S. §§ 13–14). The personal injury statute of limitations is two years from the date of injury (12 O.S. § 95). Oklahoma currently imposes no statutory cap on non-economic damages in personal injury cases — the prior $350,000 cap (23 O.S. § 61.2) was struck down as unconstitutional special legislation in Beason v. I.E. Miller Services, Inc., 2019 OK 28. Oklahoma County (Oklahoma City) and Tulsa County are the state's primary litigation centers and produce the bulk of high-value auto and premises verdicts.",

    autoAudience:
      "Oklahoma's crash exposure concentrates along the interstate spine: I-35 runs north-to-south through Oklahoma City and the Texas-to-Kansas freight lane, I-40 crosses the state east-to-west through Oklahoma City, and I-44 connects Lawton through Oklahoma City to Tulsa and the Missouri border. Drive-alone commuting (76.8%) runs well above the national average (68.7%), concentrating vehicle exposure in the Oklahoma City and Tulsa metro rings. The Oklahoma City metro (Oklahoma, Cleveland, and Canadian counties) and the Tulsa metro drive the largest share of case volume; Lawton and the Sherman-Ada border market are secondary.",

    truckAudience:
      "Oklahoma sits at the crossroads of two major freight corridors. I-40 is a primary east-west transcontinental truck route, and I-35 is the NAFTA/USMCA north-south freight lane between Texas and the upper Midwest; the two cross in Oklahoma City. I-44 (the Turner Turnpike) carries heavy commercial traffic between Oklahoma City and Tulsa. The state's energy and agriculture sectors add oilfield-service and heavy-equipment vehicle traffic on rural routes. Trucking PI cases on these corridors frequently involve interstate carriers with multi-state insurance structures and venue questions, and the high rural fatality share (372 of 645 in FARS 2024 preliminary) reflects exposure on these high-speed two-lane and interstate segments.",

    motorcycleAudience:
      "Oklahoma requires motorcycle helmets only for riders under 18; riders 18 and older may ride without a helmet (47 O.S. § 12-609). Motorcycle fatalities are not broken out in the preliminary FARS 2024 release used here, but the partial-helmet regime, the Route 66 corridor, and the southeastern Ouachita and Arbuckle mountain routes draw recreational riders, including out-of-state visitors. The 2-year SOL makes early intake particularly important for motorcycle cases, where injuries are often severe and liability disputes hinge on early scene evidence.",

    ruralUrbanContext:
      "Oklahoma's fatalities skew rural: FARS 2024 preliminary records 372 rural fatalities against 272 urban, even though population concentrates in the Oklahoma City and Tulsa metros. Rural counties along I-40, I-35, and US-69/US-75 see disproportionate crash severity tied to higher speeds, longer EMS response times, and lower seat-belt use. Many rural Oklahoma markets have weaker broadband penetration, so digital-only campaigns underreach them. Radio, outdoor, and community media are necessary complements for plaintiff firms targeting non-metro Oklahoma.",

    judicialContext:
      "Oklahoma County (Oklahoma City) and Tulsa County are the state's primary plaintiff venues and produce the largest auto, premises, and commercial-vehicle verdicts. The 2019 Beason decision removing the non-economic damages cap meaningfully raised the ceiling on catastrophic-injury and wrongful-death case value statewide. Venue selection — driven by plaintiff residency and crash location — and the at-fault, 51%-bar comparative regime are the two levers that most shift expected case value in Oklahoma.",

    marketSaturationTitle: "Oklahoma City & Tulsa vs. Secondary Markets",
    marketSaturationTip:
      "Oklahoma City (Oklahoma, Cleveland, and Canadian counties) and Tulsa attract the highest PI advertiser concentration in the state. The Lawton–Wichita Falls market (anchored by Fort Sill) and the Sherman–Ada market on the Texas border carry materially lower ad saturation and can offer more favorable cost-per-case economics for firms willing to run radio and outdoor outside the two majors.",

    freightCorridorTitle: "I-35 / I-40 Crossroads & the Turner Turnpike",
    freightCorridorTip:
      "Oklahoma City is the crossing point of I-35 (north-south NAFTA/USMCA freight) and I-40 (east-west transcontinental freight), among the highest-volume truck interchanges in the central U.S. I-44 / the Turner Turnpike funnels commercial traffic between Oklahoma City and Tulsa. Commercial-vehicle PI cases on these corridors often involve out-of-state carriers and complex venue and insurance-layering questions — a fit for firms with trucking-litigation capacity.",

    solUrgencyTitle: "2-Year SOL — Move Fast on Intake",
    solUrgencyTip:
      "Oklahoma's personal injury statute of limitations is two years from the date of injury (12 O.S. § 95). Claims against governmental entities under the Governmental Tort Claims Act carry shorter notice deadlines (a written claim within one year and suit timing tied to denial). Fast intake, early evidence preservation, and prompt engagement with treating providers protect both the case and the client relationship before the limitations period becomes a bar.",

    internetAccessTitle: "Rural Oklahoma Connectivity Gap",
    internetAccessTip:
      "Oklahoma's rural counties — particularly across the panhandle, the southeast, and the I-40/US-69 corridors — have lower broadband penetration than the Oklahoma City and Tulsa metros. Digital-only campaigns underreach these markets even though they carry the majority of the state's traffic fatalities (372 rural of 645 in FARS 2024 preliminary). Local radio, outdoor advertising, and community partnerships are necessary channels for plaintiff firms seeking cases outside the two major metros.",

    footerSourcesLabel:
      "NHTSA FARS 2024 (preliminary); U.S. Census ACS 2024 1-year; BLS CFOI 2023; Oklahoma Statutes Title 12 & Title 23.",
  },

  features: {
    // BLS CFOI 2023 statewide total (76) is verified, but the construction /
    // transportation / falls / transport-warehouse breakdown the section renders
    // could not be verified from a citable source — hide the section rather than
    // show unverified splits. Re-enable once the BLS Oklahoma state table values
    // are confirmed and populated above.
    showWorkplaceSection: false,
  },

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
