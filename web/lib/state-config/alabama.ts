import { alabamaCompetitiveData } from "@/lib/data/competitive-landscape/alabama";
import type { StateConfig } from "./_types";

export const alabamaConfig: StateConfig = {
  slug: "alabama",
  stateCode: "AL",
  stateName: "Alabama",

  metadata: {
    title: "Alabama State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Alabama — FARS accident data, demographics, judicial profiles, PI viability scores, and live PI-firm competition by market.",
  },

  // Fatality breakdowns from FARS 2023 ARF (consistent with other states);
  // total crash volume from ALDOT Crash Facts 2023. Sourced 2026-06-29 — the
  // legacy bespoke page never carried these; values verified against the
  // primary releases (legacy impaired=196 and truck=134 were wrong and dropped).
  trafficStats: {
    totalCrashes: 143_487, // ALDOT Crash Facts 2023
    totalFatalities: 974, // FARS 2023 ARF (ALDOT counts 975)
    motorcycleFatalities: 94, // FARS 2023 (legacy 92 = ALDOT moto/moped)
    speedRelatedFatalities: 235, // FARS 2023
    speedRelatedPct: 24.1, // 235 / 974
    alcoholRelatedFatalities: 283, // FARS 2023, BAC .08+ (legacy 196 was wrong)
    alcoholRelatedPct: 29, // FARS 2023
    unrestrainedFatalities: 381, // FARS 2023 (unrestrained PV occupants)
    distractedDrivingFatalCrashes: 60, // ALDOT Crash Facts 2023 (distracted-driving fatalities)
    urbanFatalities: 390, // FARS 2023
    ruralFatalities: 581, // FARS 2023 (+3 unknown = 974)
    reportYear: 2023,
    sourceLabel: "FARS 2023 ARF / ALDOT Crash Facts 2023",
  },

  workplaceStats: {
    totalEmployment: 2_258_127, // BLS LAUS 2023 annual-avg employed
    qcewCoveredEmployment: 2_075_785, // BLS QCEW 2023 annual avg
    totalWorkplaceFatalities: 75, // BLS CFOI 2023
    constructionFatalities: 15, // BLS CFOI 2023
    constructionPctTotal: 20, // 15 / 75
    transportWarehouseFatalities: 24, // BLS CFOI 2023
    truckTransportFatalities: 20, // BLS CFOI 2023 (legacy 134 was a mislabeled traffic figure)
    fallsSlipsTrips: 13, // BLS CFOI 2023
    transportationIncidents: 34, // BLS CFOI 2023 (largest event category)
    reportYear: 2023,
  },

  commuteStats: {
    driveAlone: 80.0, // ACS 2023 1-yr, DP03_0019PE
    nationalAvg: 68.7,
    avgCommuteMinutes: 25.5, // ACS 2023 1-yr, DP03_0025E
  },

  competitiveData: alabamaCompetitiveData,

  features: {
    // Alabama opts into the larger numbered section headings (slated to become
    // the default for all states once verified).
    numberedSectionHeadings: true,
  },

  content: {
    heroTagline:
      "We turn where accidents actually happen into a strategy built for your budget — and a campaign you can launch.",
    heroSubtitle:
      "Real accident, boating & construction data, matched to local demographics and live competition. No guesswork — every number carries its source.",

    legalLandscape:
      "Alabama is one of just four states (plus DC) that still follow pure contributory negligence — any plaintiff fault, however small, bars recovery. That rule is the single biggest drag on PI viability here, pulling down otherwise strong damage-cap and jury-verdict signals. Because clear liability is decisive, case selection and unambiguous-fault evidence are the deciding factor for advertising ROI: target cases with clean defendant fault.",

    // Verdict-card one-liner (the fuller story lives in legalLandscape).
    viabilityNote:
      "Strong caps & verdicts, dragged down by the contributory-negligence rule.",
    topOpportunityNote:
      "Motor vehicle is the dominant case type — concentrated in the Birmingham DMA.",
    competitionNote: "Shunnarah & Morgan dominate; the metros are crowded.",

    autoAudience:
      "Adults 25–44 in high-fatality rural counties — carpool corridors like Winston, DeKalb & Franklin skew blue-collar with heavy road exposure. Alcohol-impaired driving drives ~29% of fatalities.",
    autoMedia:
      "Radio + digital in rural markets; CTV in Birmingham, Huntsville & Mobile metros. Lean into holiday-weekend and DUI-enforcement windows.",

    truckAudience:
      "Families of CDL holders and occupants of passenger vehicles struck along commercial corridors — I-65, I-20 & I-59 carry the heaviest freight traffic through the state.",
    truckMedia:
      "Billboard corridors plus digital geo-fencing along the major interstates where collisions concentrate.",

    motorcycleAudience:
      "Males 35–64 in suburban/exurban counties; Baldwin, Mobile & Jefferson carry the highest rider volume.",
    motorcycleMedia:
      "Seasonal spring/summer flights — social plus streaming audio against motorcycle-enthusiast interests.",

    constructionAudience:
      "Construction-boom counties with rising employment — reach workers' families, union halls and safety-equipment retailers.",
    constructionMedia:
      "Spanish-language media in Franklin/DeKalb (high Hispanic workforce); radio across rural construction corridors.",

    boatingAudience:
      "Lakefront and Gulf Coast counties — boating-enthusiast and marina-adjacent demographics around Baldwin & Mobile.",
    boatingMedia:
      "Seasonal spring/summer; local radio + geo-targeted digital around major waterways and launch points.",

    ruralUrbanContext:
      "Alabama is rural-heavy where it's deadliest — roughly 60% of traffic fatalities occur on rural roads (581 of 974). The highest-fatality counties also tend to have lower internet access and higher uninsured rates, so a digital-only plan under-reaches exactly where the case volume is.",

    judicialContext:
      "Jefferson (Birmingham) is the dominant venue; the judicial mix skews conservative outside the metros. Venue selection matters in a contributory-negligence state where clear liability is everything.",

    askAiPageName: "Alabama State Intelligence",
    askAiPageContext:
      "State-level intelligence for plaintiff firm advertising and case acquisition in Alabama — FARS accident data, census demographics, judicial profiles, PI viability scores, storm events, single-incident legal news, and live PI-firm competition by market across MVA, trucking, motorcycle, construction, and boating.",
    footerSourcesLabel: "ALDOT Crash Facts 2023 (state crash data)",

    // The legacy page's 6 "Proprietary Signals" cards, ported losslessly.
    customInsights: [
      {
        icon: "📍",
        tone: "amber",
        title: "Greene County is a media desert",
        stats: [
          { label: "Fatality rate", value: "552 per 100K (highest in state)" },
          { label: "Access", value: "High poverty, low home-internet" },
        ],
        body: "Radio and community outreach are the only channels that reliably reach this high-fatality county. A digital-first plan misses it entirely.",
      },
      {
        icon: "📅",
        tone: "red",
        title: "DUI deaths spike on a calendar",
        stats: [
          { label: "Alcohol-impaired share", value: "29% of traffic deaths (283/yr)" },
          { label: "Timing", value: "Clustered on holiday weekends" },
        ],
        body: "Time-triggered campaigns around holiday-weekend and DUI-enforcement windows catch victims while they're actively searching.",
      },
      {
        icon: "🏗️",
        tone: "steel",
        title: "Construction boom + high road fatalities",
        stats: [
          { label: "Construction employment", value: "+2.2% YoY (~101,300 workers)" },
          { label: "On-site deaths", value: "15 (BLS CFOI 2023)" },
          { label: "Overlap", value: "High-carpool counties (Winston, DeKalb)" },
        ],
        body: "Growing construction activity creates both workplace-injury cases and increased road exposure for commuters. Target construction-accident AND MVA cases in these corridors simultaneously.",
      },
      {
        icon: "📈",
        tone: "emerald",
        title: "Huntsville–Madison: tech growth creates a new PI market",
        stats: [
          { label: "Madison WFH rate", value: "13.6% (among the highest)" },
          { label: "Huntsville MSA", value: "517K, fastest-growing metro" },
        ],
        body: "Rapid population growth plus infrastructure lag means rising accident rates. Digital-first advertising is viable here given high internet penetration — an early-mover advantage for firms establishing presence.",
      },
      {
        icon: "🌪️",
        tone: "amber",
        title: "Tornado Alley overlaps the high-fatality counties",
        stats: [
          { label: "Severe weather", value: "Among the most tornado-prone states" },
          { label: "Overlap", value: "Storm-prone counties run high on fatalities" },
        ],
        body: "Property damage and injury from severe weather compound with traffic incidents during evacuations and storm response. Weather-triggered campaigns in storm season catch a distinct, time-sensitive segment.",
      },
      {
        icon: "🚛",
        tone: "steel",
        title: "Interstate corridors: trucking + MVA convergence",
        stats: [
          { label: "Freight corridors", value: "I-65 · I-20 · I-59 (Birmingham hub)" },
          { label: "Truck-transport worker deaths", value: "20 (BLS CFOI 2023)" },
        ],
        body: "Alabama is a Southeast logistics hub with heavy commercial-truck traffic. Geo-fence digital ads along I-65/I-20/I-59 to target truck-accident victims, and place billboards at major truck stops to reach CDL drivers for workplace-injury cases.",
      },
    ],
  },
};
