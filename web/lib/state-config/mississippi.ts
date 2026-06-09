import { mississippiCompetitiveData } from "@/lib/data/competitive-landscape/mississippi";
import type { StateConfig } from "./_types";

export const mississippiConfig: StateConfig = {
  slug: "mississippi",
  stateCode: "MS",
  stateName: "Mississippi",

  metadata: {
    title: "Mississippi State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Mississippi — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across Jackson, Hattiesburg-Laurel, Biloxi-Gulfport, and the Columbus-Tupelo-West Point market.",
  },

  // Source: FARS 2024 (preliminary). Fatality counts are the verbatim
  // preliminary 2024 figures. Mississippi has no published statewide
  // crash-volume / motorcycle / speed breakout that is citable at this
  // vintage, so those fields are 0 / null pending a state-DOT figure.
  trafficStats: {
    totalCrashes: 0, // no citable statewide 2024 crash-volume figure
    totalFatalities: 753,
    motorcycleFatalities: null, // not in FARS preliminary; no citable MS DOT 2024 figure
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 140,
    alcoholRelatedPct: 18.6,
    unrestrainedFatalities: 0, // not citable at this vintage
    distractedDrivingFatalCrashes: 0, // not citable at this vintage
    urbanFatalities: 219,
    ruralFatalities: 505,
    reportYear: 2024,
    sourceLabel: "FARS 2024 (preliminary)",
  },

  // BLS CFOI: a verified statewide total exists for Mississippi 2023 (72 fatal
  // work injuries) but the industry/event breakdown (construction,
  // transport/warehousing, falls, transportation incidents) could not be
  // verified from a primary source at this vintage — the only available
  // breakdowns blended 2023 and 2024 figures. Per the accuracy-over-
  // completeness rule, the block is zeroed and the section is hidden via
  // features.showWorkplaceSection = false rather than publishing invented
  // sub-figures.
  workplaceStats: {
    totalEmployment: 0,
    qcewCoveredEmployment: 0,
    totalWorkplaceFatalities: 0,
    constructionFatalities: 0,
    constructionPctTotal: 0,
    transportWarehouseFatalities: 0,
    truckTransportFatalities: null,
    fallsSlipsTrips: 0,
    transportationIncidents: 0,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 2024 1-year estimates (via Census Reporter).
  // driveAlone = B08006 drove-alone / total workers = 1,057,407 / 1,302,251.
  // avgCommuteMinutes = B08013 aggregate travel time / B08006 total workers
  // = 32,189,310 / 1,302,251.
  commuteStats: {
    driveAlone: 81.2,
    nationalAvg: 68.7,
    avgCommuteMinutes: 24.7,
  },

  competitiveData: mississippiCompetitiveData,

  features: {
    // Workplace block could not be sourced beyond the statewide total; hide it.
    showWorkplaceSection: false,
  },

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Mississippi — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across Jackson, Hattiesburg-Laurel, the Gulf Coast (Biloxi-Gulfport), and the Columbus-Tupelo-West Point market. Population ~2.9M.",

    legalLandscape:
      "Mississippi follows pure comparative negligence (Miss. Code Ann. § 11-7-15): a plaintiff's recovery is reduced in proportion to their share of fault but is never barred outright, even when the plaintiff is more at fault than the defendant. This is materially more plaintiff-favorable than the 50%/51% bar states. The personal injury statute of limitations is three years from the date of injury (Miss. Code Ann. § 15-1-49). Mississippi is an at-fault (tort) state for auto claims. Critically for case valuation, Mississippi imposes a statutory cap on non-economic damages: $1,000,000 in non-medical-malpractice civil cases and $500,000 in medical-malpractice cases (Miss. Code Ann. § 11-1-60). Economic damages (medical bills, lost wages) are not capped. The non-economic cap should be factored into expected case value, particularly for high-pain/low-economic-loss matters.",

    autoAudience:
      "Mississippi's primary crash corridors run along I-55 (Memphis through Jackson to the Louisiana line), I-20 (Vicksburg through Jackson to Meridian and Alabama), and I-10 (the Gulf Coast through Biloxi-Gulfport). Drive-alone commuting (81.2%) sits well above the national average (68.7%), concentrating roadway exposure across the Jackson metro and along the interstate spine. Average commute time is 24.7 minutes. Rural fatalities (505 of 753 in 2024) dominate the state's fatality mix, reflecting high-speed two-lane and US-highway exposure outside the metros. The Jackson DMA is the largest in-state media market; the Gulf Coast (Biloxi-Gulfport) and Hattiesburg-Laurel are secondary volume markets.",

    truckAudience:
      "Mississippi is a north-south and east-west freight crossroads. I-55 carries heavy truck traffic between Memphis and the Gulf, I-20 is a major east-west artery linking Texas and Louisiana to Alabama and the Southeast, and I-10 moves freight along the entire Gulf Coast. The Port of Gulfport and the Jackson distribution corridor add commercial vehicle volume. Pure comparative negligence (§ 11-7-15) is favorable for truck cases where a plaintiff may bear some fault, since recovery is reduced rather than barred. Trucking matters on these interstates frequently involve out-of-state interstate carriers with multi-state insurance structures.",

    motorcycleAudience:
      "Mississippi has a universal motorcycle helmet law (Miss. Code Ann. § 63-7-64) requiring all riders and passengers to wear a helmet regardless of age, which tends to reduce fatal head-injury claims relative to partial-helmet states but does not eliminate serious-injury motorcycle litigation. The Gulf Coast (US-90, I-10) and the Natchez Trace Parkway draw recreational riders, including out-of-state visitors. The 3-year SOL (§ 15-1-49) gives a somewhat longer intake window than the 2-year states, but early intake remains important for evidence preservation.",

    ruralUrbanContext:
      "Mississippi's fatality burden is overwhelmingly rural: 505 of 753 preliminary 2024 fatalities (about 67%) occurred on rural roads, versus 219 urban. This reflects the state's dispersed population and reliance on high-speed two-lane state and US highways outside the Jackson, Gulf Coast, and Hattiesburg metros. Rural counties have lower broadband penetration, so digital-only campaigns underreach the very markets producing the most serious crashes. Local radio, outdoor advertising along the I-55/I-20/I-10 corridors, and community media are necessary complements for plaintiff firms targeting non-metro Mississippi.",

    judicialContext:
      "Mississippi historically produced some of the highest plaintiff verdicts in the country before its early-2000s tort-reform wave, which introduced the § 11-1-60 non-economic damages caps. Hinds County (Jackson) remains the state's most prominent plaintiff venue. Coast counties (Harrison, Jackson, Hancock) and the Delta also have plaintiff-leaning jury pools. Venue analysis — plaintiff residency and crash location — meaningfully affects expected case value, and the statutory non-economic cap should be modeled into every projection.",

    marketSaturationTitle: "Jackson vs. Gulf Coast & Secondary Markets",
    marketSaturationTip:
      "Jackson (Hinds County and the metro ring of Madison and Rankin counties) carries the highest PI advertiser concentration in Mississippi. The Gulf Coast (Biloxi-Gulfport, Harrison County) is a distinct, lower-saturation market with strong casino-tourism traffic and I-10/US-90 crash exposure. Hattiesburg-Laurel and the Columbus-Tupelo-West Point market in north and central Mississippi offer mid-market opportunities with favorable cost-per-case economics for firms willing to advertise outside the Jackson DMA.",

    freightCorridorTitle: "I-55 / I-20 / I-10 Freight Corridors",
    freightCorridorTip:
      "I-55 is the principal north-south freight route through the state (Memphis to the Gulf), I-20 the principal east-west route (Texas/Louisiana to Alabama), and I-10 the Gulf Coast freight spine. Truck PI cases on these corridors typically involve interstate carriers, multi-state insurance, and venue questions. Geo-targeting along the I-55/I-20 interchange at Jackson and the I-10 coast corridor reaches the highest commercial-vehicle exposure in the state.",

    solUrgencyTitle: "3-Year SOL — Standard PI Window",
    solUrgencyTip:
      "Mississippi's personal injury statute of limitations is three years from the date of injury (Miss. Code Ann. § 15-1-49). Claims against governmental entities under the Mississippi Tort Claims Act carry a shorter one-year limitation plus a 90-day pre-suit notice requirement, so crashes involving public vehicles, road conditions, or municipal defendants demand faster intake. Early evidence preservation and prompt provider engagement protect both the case and the client relationship.",

    internetAccessTitle: "Delta & Rural Mississippi Connectivity Gap",
    internetAccessTip:
      "The Mississippi Delta and rural counties across the state have among the lowest broadband penetration in the nation and high uninsured populations. These areas carry disproportionate rural-crash exposure along US-highway and two-lane routes. Digital-only campaigns underreach them. Local radio, outdoor advertising, and community health partnerships are necessary channels for plaintiff firms seeking cases outside the Jackson, Gulf Coast, and Hattiesburg metros.",

    outOfStateTitle: "Cross-Border DMAs — Memphis (North) & New Orleans (South)",
    outOfStateTip:
      "North Mississippi (DeSoto County and the surrounding suburbs) sits inside the Memphis, TN DMA, and far south Mississippi falls within the New Orleans, LA DMA. Firms advertising in those neighboring DMAs reach Mississippi residents who will litigate under Mississippi law — pure comparative negligence, the 3-year SOL, and the § 11-1-60 non-economic cap. In-state media buys in Jackson and the Gulf Coast will not cover DeSoto County; reaching it requires a Memphis-DMA placement.",

    footerSourcesLabel:
      "FARS 2024 (preliminary) — NHTSA Fatality Analysis Reporting System; U.S. Census ACS 2024 1-year estimates; Miss. Code Ann. §§ 11-7-15, 15-1-49, 11-1-60, 63-7-64",

    keyTakeaways: [
      "Pure comparative negligence (Miss. Code Ann. § 11-7-15) — recovery reduced by fault, never barred, even for majority-at-fault plaintiffs.",
      "3-year PI statute of limitations (§ 15-1-49); 1-year + 90-day notice for governmental claims under the MS Tort Claims Act.",
      "Statutory non-economic damages cap: $1M in non-med-mal cases, $500K in med-mal (§ 11-1-60) — model into expected case value.",
      "Rural-dominant fatality mix (505 of 753 preliminary 2024 fatalities); pair digital with radio/outdoor along I-55, I-20, and I-10.",
      "Cross-border DMAs: Memphis covers north MS (DeSoto County), New Orleans covers far south MS — in-state buys miss them.",
    ],
  },

  // No injuryData yet; add when Mississippi-specific deep crash data is integrated.
};
