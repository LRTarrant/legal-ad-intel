import { arkansasCompetitiveData } from "@/lib/data/competitive-landscape/arkansas";
import type { StateConfig } from "./_types";

export const arkansasConfig: StateConfig = {
  slug: "arkansas",
  stateCode: "AR",
  stateName: "Arkansas",

  metadata: {
    title: "Arkansas State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Arkansas — combining FARS crash data, workplace fatality data, demographics, judicial profiles, and market opportunity signals across Little Rock, Northwest Arkansas, Fort Smith, and Jonesboro.",
  },

  // Source: NHTSA FARS 2024 Annual Report File. Rural/urban + alcohol fields from
  // FARS; motorcycle/speed not separately citable for AR 2024 → null.
  // totalCrashes / unrestrainedFatalities / distractedDrivingFatalCrashes are
  // non-nullable and not citable from FARS → set to 0.
  trafficStats: {
    totalCrashes: 0,
    totalFatalities: 603,
    motorcycleFatalities: null,
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 163,
    alcoholRelatedPct: 27,
    unrestrainedFatalities: 0,
    distractedDrivingFatalCrashes: 0,
    urbanFatalities: 191,
    ruralFatalities: 411,
    reportYear: 2024,
    sourceLabel: "FARS 2024 Annual Report File",
  },

  // Source: Census of Fatal Occupational Injuries — Arkansas 2023, published by
  // the Arkansas Department of Labor and Licensing (OSH/CFOI Section) in
  // cooperation with U.S. BLS. labor.arkansas.gov mirror used because
  // bls.gov 403s automated fetch.
  // NOTE: employment totals (totalEmployment / qcewCoveredEmployment) are not
  // citable from the CFOI release → set to 0. transportWarehouseFatalities
  // shown as 0 because the AR release reports the broader "trade, transportation,
  // and utilities" sector (30), not the narrower BLS transportation-and-warehousing
  // breakout. truckTransportFatalities not broken out → null. The 52 transportation
  // *incidents* figure is an event category (transportationIncidents), distinct
  // from the industry sector.
  workplaceStats: {
    totalEmployment: 0,
    qcewCoveredEmployment: 0,
    totalWorkplaceFatalities: 92,
    constructionFatalities: 18,
    constructionPctTotal: 19.6,
    transportWarehouseFatalities: 0,
    truckTransportFatalities: null,
    fallsSlipsTrips: 11,
    transportationIncidents: 52,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 2024 1-year (via Census Reporter).
  // driveAlone = B08006 drove alone (1,086,784) / total commuters (1,386,650) = 78.4%.
  // avgCommuteMinutes = B08013 aggregate (28,737,150) / B08303 commuters (1,267,592) = 22.7.
  commuteStats: {
    driveAlone: 78.4,
    nationalAvg: 68.7,
    avgCommuteMinutes: 22.7,
  },

  competitiveData: arkansasCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Arkansas — combining FARS crash data, workplace fatality data, demographics, judicial profiles, and market opportunity signals across Little Rock, Northwest Arkansas, Fort Smith, and Jonesboro. Population ~3.1M.",

    legalLandscape:
      "Arkansas uses modified comparative negligence with a 50% bar: a plaintiff's recovery is barred if their fault is equal to or greater than the combined fault of the defendants, and otherwise reduced in proportion to their share of fault (Ark. Code Ann. § 16-64-122). This is stricter than the 51% rule in many neighboring states — a plaintiff found exactly 50% at fault recovers nothing. The personal injury statute of limitations is three years from the date of injury (Ark. Code Ann. § 16-56-105). Arkansas is an at-fault (tort) auto state and requires insurers to offer mandatory add-on personal injury protection / medical payments coverage (Ark. Code Ann. § 23-89-202), so first-party med-pay is commonly available alongside third-party liability claims. Pulaski County (Little Rock) is the state's primary litigation center.",

    autoAudience:
      "Arkansas's major crash corridors run along I-30 (Little Rock to Texarkana), I-40 (the east-west spine connecting Fort Smith, Little Rock, and West Memphis), and I-49 (the Northwest Arkansas corridor through Fayetteville, Springdale, Rogers, and Bentonville). Drive-alone commuting (78.4%) runs well above the national average (68.7%), concentrating exposure on these interstates and in the Little Rock and Northwest Arkansas metro rings. The 3-year SOL gives a wider intake window than in states like Tennessee or Texas, but early evidence preservation still drives case value. Little Rock-Pine Bluff is the largest in-state media market; Northwest Arkansas is the fastest-growing.",

    truckAudience:
      "Arkansas is a national freight hub anchored by I-40, one of the busiest east-west truck corridors in the country, running from West Memphis through Little Rock to Fort Smith and on toward Oklahoma. I-30 carries heavy truck volume between Little Rock and the Dallas-Fort Worth metro, and I-49 serves the dense distribution and logistics footprint of Northwest Arkansas. The state is home to major carriers and the Walmart supply chain, so commercial-vehicle exposure is unusually high for the population. Transportation incidents were the leading cause of Arkansas workplace deaths in 2023 (52 of 92 fatalities), underscoring the on-road risk profile.",

    motorcycleAudience:
      "Arkansas requires helmets only for riders under age 21 (Ark. Code Ann. § 27-20-104); riders 21 and older are not required to wear one. The Ozark and Ouachita mountain routes — including the Pig Trail and the Talimena corridor — draw recreational riders, including out-of-state visitors from Missouri, Oklahoma, and Texas. State-DOT-level 2024 motorcycle fatality counts are not separately citable here, so that figure is left unreported. The combination of partial helmet coverage and scenic rural routes makes early intake on motorcycle cases important despite the longer 3-year SOL.",

    constructionAudience:
      "Construction accounted for 18 of Arkansas's 92 workplace fatalities in 2023 (roughly 20%), the second-leading industry behind trade/transportation/utilities. Northwest Arkansas is in a sustained commercial and residential building boom tied to Walmart, Tyson, and J.B. Hunt headquarters growth, and central Arkansas has steady public-infrastructure activity. Third-party liability — incidents involving a non-employer at fault such as equipment, scaffold, or roadway-work-zone hazards — is the primary recovery path where workers' compensation limits direct claims against the employer.",

    ruralUrbanContext:
      "Arkansas fatalities skew heavily rural: FARS 2024 Annual Report File puts 411 of 603 fatalities (68%) on rural roads versus 191 urban. The state's population outside Little Rock and Northwest Arkansas is dispersed across the Delta (east), the Ozarks (north), and the Ouachitas (south/west), with lower broadband penetration in many of those counties. Digital-only campaigns underreach rural Arkansas; radio, outdoor, and local-broadcast complements are essential for plaintiff firms targeting case volume along I-40 and the rural state-highway network.",

    judicialContext:
      "Pulaski County (Little Rock) is Arkansas's primary venue and generally its most plaintiff-receptive, followed by the Northwest Arkansas counties (Benton, Washington) as their population and caseload grow. Many rural Arkansas venues are more conservative on damages. Venue analysis — plaintiff residency, crash location, and defendant's principal place of business — can meaningfully shift expected case value, particularly for trucking cases involving interstate carriers with multi-state insurance structures.",

    marketSaturationTitle: "Little Rock & Northwest Arkansas vs. Secondary Markets",
    marketSaturationTip:
      "Little Rock-Pine Bluff is Arkansas's largest media market and carries the highest in-state PI advertiser concentration. Northwest Arkansas (Fayetteville-Springdale-Rogers) is the fastest-growing metro in the state with rising household income and a large logistics workforce, making it a high-value but increasingly contested market. Fort Smith and Jonesboro are smaller markets with more favorable cost-per-case economics. Note that the Memphis DMA reaches into eastern (Delta) Arkansas, so some eastern-AR exposure is bought through Memphis media rather than in-state.",

    freightCorridorTitle: "I-40 / I-30 / I-49 Freight Corridors",
    freightCorridorTip:
      "I-40 is one of the nation's highest-volume east-west truck routes, crossing the full width of Arkansas from West Memphis through Little Rock to Fort Smith. I-30 connects Little Rock to the Dallas-Fort Worth freight network, and I-49 serves Northwest Arkansas's dense distribution footprint. Trucking PI cases on these corridors routinely involve interstate carriers with complex venue and multi-state insurance questions, and command higher case values than passenger-vehicle claims.",

    solUrgencyTitle: "3-Year PI SOL — Wider Window, Still Intake-Sensitive",
    solUrgencyTip:
      "Arkansas's personal injury statute of limitations is three years from the date of injury (Ark. Code Ann. § 16-56-105), longer than in several neighboring states. The wider window should not delay intake: claims against government entities can carry shorter notice requirements, and the 50%-bar comparative-fault rule (Ark. Code Ann. § 16-64-122) makes early fault investigation and evidence preservation critical, since a plaintiff at or above 50% fault recovers nothing.",

    internetAccessTitle: "Delta & Ozark Connectivity Gap",
    internetAccessTip:
      "Arkansas's Delta counties in the east and Ozark/Ouachita counties in the north and west have lower broadband penetration and higher uninsured populations, and they carry a disproportionate share of the state's rural traffic fatalities. Digital-only campaigns underreach these markets. Local radio, outdoor advertising along I-40 and US-67/167, and community partnerships are necessary channels for plaintiff firms seeking cases outside the Little Rock and Northwest Arkansas metros.",

    outOfStateTitle: "Memphis DMA Spillover & Out-of-State Riders",
    outOfStateTip:
      "Eastern Arkansas (the Delta) sits inside the Memphis DMA, so media buys placed in Memphis reach Crittenden and surrounding Arkansas counties — a planning consideration when allocating spend. Separately, the Ozark and Ouachita scenic routes draw out-of-state motorcyclists and visitors from Missouri, Oklahoma, and Texas who may be unfamiliar with Arkansas's 3-year SOL and 50%-bar fault rule. Geo-targeted digital along the I-40, I-49, and mountain-route corridors can capture these cases before they engage out-of-state counsel.",

    footerSourcesLabel:
      "NHTSA FARS 2024 Annual Report File; Arkansas Department of Labor and Licensing — Census of Fatal Occupational Injuries 2023; U.S. Census ACS 2024 1-year.",
  },

  // BLS CFOI data verified via the Arkansas Department of Labor mirror; the
  // workplace section stays on. Employment denominators are zeroed (not citable).
  features: {
    showWorkplaceSection: true,
  },

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
