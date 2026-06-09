import { utahCompetitiveData } from "@/lib/data/competitive-landscape/utah";
import type { StateConfig } from "./_types";

export const utahConfig: StateConfig = {
  slug: "utah",
  stateCode: "UT",
  stateName: "Utah",

  metadata: {
    title: "Utah State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Utah — combining FARS crash fatalities, workplace-injury data, demographics, judicial profiles, and market opportunity signals across Salt Lake City, Provo-Orem, Ogden, and St. George.",
  },

  // Source: FARS 2024 Annual Report File (fatality fields). Crash-volume and
  // belt/distraction fields are not pulled from a citable Utah DOT 2024 release,
  // so they are left at 0 rather than estimated.
  trafficStats: {
    totalCrashes: 0, // not sourced from a citable UDOT 2024 figure
    totalFatalities: 277,
    motorcycleFatalities: null, // not in our FARS extract; no citable UDOT 2024 figure
    speedRelatedFatalities: null, // not in our FARS extract; no citable UDOT 2024 figure
    speedRelatedPct: null,
    alcoholRelatedFatalities: 97,
    alcoholRelatedPct: 35,
    unrestrainedFatalities: 0, // not sourced from a citable 2024 figure
    distractedDrivingFatalCrashes: 0, // not sourced from a citable 2024 figure
    urbanFatalities: 140,
    ruralFatalities: 135,
    reportYear: 2024,
    sourceLabel: "FARS 2024 Annual Report File",
  },

  // Source: BLS Census of Fatal Occupational Injuries — Utah 2023 (released via
  // the Utah Labor Commission / UOSH BLS). Total 69; full industry and event
  // breakdown verified, so the workplace section is shown.
  // totalEmployment / qcewCoveredEmployment left at 0 — no clean citable
  // annual-average figure was confirmed; do not infer.
  workplaceStats: {
    totalEmployment: 0, // not confirmed from a citable QCEW 2023 annual-average figure
    qcewCoveredEmployment: 0, // not confirmed from a citable QCEW 2023 annual-average figure
    totalWorkplaceFatalities: 69,
    constructionFatalities: 15,
    constructionPctTotal: 21.7, // 15 of 69
    transportWarehouseFatalities: 12,
    truckTransportFatalities: null, // not broken out in the Utah CFOI 2023 release
    fallsSlipsTrips: 8,
    transportationIncidents: 31,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 2024 1-year estimates (via Census Reporter).
  // driveAlone = B08006003 (1,198,927) / B08006001 (1,771,258) = 67.7%.
  // avgCommuteMinutes = B08013001 (34,585,096) / B08303001 (1,493,295) = 23.2.
  commuteStats: {
    driveAlone: 67.7,
    nationalAvg: 68.7,
    avgCommuteMinutes: 23.2,
  },

  competitiveData: utahCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Utah — combining FARS crash fatalities, workplace-injury data, demographics, judicial profiles, and market opportunity signals across the Wasatch Front (Salt Lake City, Provo-Orem, Ogden) and St. George. Population ~3.5M, among the fastest-growing in the nation.",

    legalLandscape:
      "Utah follows modified comparative negligence under a 50% bar: a plaintiff recovers only if their fault is less than the combined fault of the defendants, and is barred entirely once their share equals or exceeds that combined fault (Utah Code § 78B-5-818). Damages are reduced in proportion to the plaintiff's fault below that threshold. The personal injury statute of limitations is a notably long four years (Utah Code § 78B-2-307), giving firms a wider intake window than most states. Critically, Utah is a no-fault auto state: drivers carry Personal Injury Protection (PIP) coverage, and an injured party may pursue general (non-economic) damages from an at-fault driver only after meeting a $3,000 medical-expense threshold or sustaining specified serious injuries (Utah Code § 31A-22-309). Utah imposes no general statutory cap on non-economic damages in standard PI cases; a cap applies only to medical-malpractice claims.",

    autoAudience:
      "Utah's crash exposure concentrates along three corridors: I-15, the spine that runs the length of the Wasatch Front from St. George through Provo, Salt Lake City, and Ogden; I-80, crossing east-to-west through Salt Lake City toward the Wyoming and Nevada borders; and I-70 across the rural south-central part of the state. Drive-alone commuting (67.7%) sits just below the national average (68.7%), with exposure densest in the Salt Lake City and Utah County (Provo-Orem) suburban rings. The Salt Lake City metro drives the largest share of case volume; Provo-Orem (Utah County) and Ogden (Weber/Davis counties) are the secondary Wasatch Front markets. Utah's no-fault system means auto intake must screen early for the $3,000 PIP threshold (Utah Code § 31A-22-309) before a general-damages claim is viable.",

    truckAudience:
      "Utah is a western freight crossroads. I-15 carries the primary north-south freight flow between the Las Vegas/Southern California gateway and the Idaho/Montana interior, while I-80 is a transcontinental artery linking the San Francisco Bay Area and the Midwest through Salt Lake City. The Salt Lake City inland-port and distribution complex generates heavy commercial-vehicle volume across the northern Wasatch Front. I-70 through the rural southeast funnels long-haul traffic where belt-use and emergency-response times are weaker. Transportation incidents were the single largest cause of Utah workplace fatalities in 2023 (31 of 69), underscoring the on-road risk to commercial drivers.",

    motorcycleAudience:
      "Utah requires helmets only for riders under age 21; riders 21 and older may ride without one (Utah Code § 41-6a-1505). The state's canyon and mountain routes — Big and Little Cottonwood, the Alpine Loop, and the highways around Zion and the southern parks — draw heavy recreational riding, including out-of-state riders. Our FARS 2024 extract does not break out a Utah motorcycle-fatality count, so that figure is shown as not available rather than estimated. The 4-year personal injury SOL (Utah Code § 78B-2-307) gives motorcycle cases a longer intake runway than most states.",

    constructionAudience:
      "Utah has one of the most active construction markets in the country, fueled by sustained population growth along the Wasatch Front. Construction accounted for 15 of Utah's 69 workplace fatalities in 2023 — roughly 22%, the largest single industry share. Third-party liability — crane, scaffold, electrical, trench, and OSHA-cited incidents involving a non-employer at fault — is the primary recovery path where workers' compensation limits direct claims against the employer. Workers on active Salt Lake City, Utah County, and St. George job sites, and their families, are the primary target.",

    ruralUrbanContext:
      "Utah's FARS 2024 fatalities split almost evenly between urban (140) and rural (135) areas despite the state's population being heavily concentrated on the urban Wasatch Front. That balance signals disproportionate per-capita risk on rural corridors — I-70 across the south-central desert, I-15 south of Provo, and the highways serving the national parks — where speeds are high and emergency response is slow. Rural southern and eastern Utah counties have lower broadband penetration; digital-only campaigns underperform there, making radio, outdoor, and community media essential complements for plaintiff firms targeting non-metro Utah.",

    judicialContext:
      "Utah's bench is generally regarded as moderate to defense-leaning relative to the most plaintiff-favorable national venues, consistent with the state's politically conservative profile. Salt Lake County (Third District) is the highest-volume civil venue and the most receptive of Utah's districts; Utah County (Provo) and Weber County (Ogden) are more conservative. Venue analysis — particularly plaintiff residency and crash location — can meaningfully shift expected case value, and the 50% comparative-fault bar (Utah Code § 78B-5-818) makes early, rigorous fault apportionment central to case selection.",

    marketSaturationTitle: "Salt Lake City vs. Secondary Wasatch Front Markets",
    marketSaturationTip:
      "The Salt Lake City DMA dominates Utah and concentrates the heaviest PI advertiser competition, effectively covering the entire Wasatch Front including Ogden. Provo-Orem (Utah County) is a large, fast-growing secondary market with materially lower ad saturation and a young, expanding population. St. George (Washington County) in the southwest is the state's fastest-growing metro and a distinct, under-advertised market with favorable cost-per-case economics for firms willing to establish a presence early.",

    freightCorridorTitle: "I-15 / I-80 / I-70 Freight Corridors",
    freightCorridorTip:
      "I-15 is Utah's primary freight spine, linking Southern California and Las Vegas to the Idaho and Montana interior. I-80 is a transcontinental route through Salt Lake City connecting the Bay Area to the Midwest. I-70 carries long-haul traffic across rural south-central Utah. Trucking PI cases on these corridors frequently involve interstate carriers with multi-state insurance structures and complex venue questions, raising both case value and the early-investigation burden.",

    solUrgencyTitle: "4-Year SOL — Longer Window, Earlier Edge",
    solUrgencyTip:
      "Utah's 4-year personal injury statute of limitations (Utah Code § 78B-2-307) is notably long, giving firms a wider intake runway than the 2-year norm in many states. The longer window is an advantage in advertising reach, not a license to delay: claims against governmental entities carry much shorter notice deadlines under the Utah Governmental Immunity Act, and no-fault PIP coordination should begin immediately so the $3,000 general-damages threshold (Utah Code § 31A-22-309) is documented early. Use the longer SOL as a differentiator in messaging while still driving fast intake.",

    internetAccessTitle: "Rural Southern & Eastern Utah Connectivity Gap",
    internetAccessTip:
      "Utah's rural southern and eastern counties — including those along I-70 and the highways serving the national parks — have lower broadband penetration than the Wasatch Front. These corridors carry disproportionate crash and truck exposure (rural fatalities were 135 of 277 in FARS 2024). Digital-only campaigns underreach these markets. Local radio, outdoor advertising, and community partnerships are necessary channels for plaintiff firms seeking cases outside the Salt Lake City, Provo, and Ogden metros.",

    outOfStateTitle: "National-Park & Ski Tourism Opportunity",
    outOfStateTip:
      "Utah's national parks (Zion, Bryce, Arches, Canyonlands, Capitol Reef) and its ski resorts draw millions of out-of-state visitors annually, many driving unfamiliar canyon and mountain routes or riding without helmets where Utah law allows it (riders 21+, Utah Code § 41-6a-1505). Visitors injured in Utah often do not know local PI attorneys, the state's no-fault PIP rules, or the 4-year SOL. Geo-fenced digital along I-15 and I-70 park corridors and around resort areas, paired with partnerships with lodging and tour operators, can capture these high-value cases before visitors engage out-of-state counsel.",

    footerSourcesLabel:
      "FARS 2024 Annual Report File; BLS Census of Fatal Occupational Injuries — Utah 2023; U.S. Census ACS 2024 1-year estimates",
  },

  features: {
    showWorkplaceSection: true,
  },

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
