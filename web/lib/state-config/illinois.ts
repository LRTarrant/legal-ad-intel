import { illinoisCompetitiveData } from "@/lib/data/competitive-landscape/illinois";
import type { StateConfig } from "./_types";

export const illinoisConfig: StateConfig = {
  slug: "illinois",
  stateCode: "IL",
  stateName: "Illinois",

  metadata: {
    title: "Illinois State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Illinois — combining state DOT crash and injury data, demographics, judicial profiles, and market opportunity signals across Chicago, Rockford, Peoria, Champaign-Urbana, Springfield.",
  },

  // Source: state DOT annual crash report (2024).
  trafficStats: {
    totalCrashes: 303913,
    totalFatalities: 1177, // FARS 2024 Annual Report File
    motorcycleFatalities: 144,
    speedRelatedFatalities: null, // not broken out in IDOT 2024 summary tables
    speedRelatedPct: null,
    alcoholRelatedFatalities: 285, // FARS 2024 Annual Report File
    alcoholRelatedPct: 24.2, // 285 / 1177 FARS 2024 Annual Report File
    unrestrainedFatalities: 255,
    distractedDrivingFatalCrashes: 0,
    urbanFatalities: 799, // FARS 2024 Annual Report File
    ruralFatalities: 376, // FARS 2024 Annual Report File
    reportYear: 2024,
    sourceLabel: "IDOT 2024",
    fatalitiesSourceLabel: "FARS 2024 Annual Report File",
  },

  // Source: BLS Census of Fatal Occupational Injuries — Illinois 2023.
  workplaceStats: {
    totalEmployment: 6120000,
    qcewCoveredEmployment: 5938000,
    totalWorkplaceFatalities: 145,
    constructionFatalities: 30,
    constructionPctTotal: 20.7,
    transportWarehouseFatalities: 40,
    truckTransportFatalities: null, // not broken out in BLS CFOI 2023 IL state tables
    fallsSlipsTrips: 25,
    transportationIncidents: 55,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 5-year estimates.
  commuteStats: {
    driveAlone: 67.3,
    nationalAvg: 68.7,
    avgCommuteMinutes: 28.5,
  },

  competitiveData: illinoisCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Illinois — combining IDOT crash data, demographics, judicial profiles, and market opportunity signals across Chicago, Rockford, Peoria, Springfield, and Champaign-Urbana. Population ~13M.",

    legalLandscape:
      "Illinois uses modified comparative negligence with a 51% bar — plaintiffs who are 51% or more at fault are barred from recovery; those at 50% or less recover with damages reduced by their share of fault. The personal injury statute of limitations is two years from the date of injury (735 ILCS 5/13-202). Illinois imposes no cap on non-economic damages in standard PI cases. Chicago (Cook County) is the state's dominant PI venue and one of the most plaintiff-favorable jurisdictions in the Midwest, producing consistently high verdicts in auto, premises, and trucking cases.",

    autoAudience:
      "Illinois drive-alone commuting (67.3%) is slightly below the national average (68.7%), driven by heavy transit use in the Chicago metro. Outside Chicago, vehicle dependence follows typical Midwest patterns. The state's major crash corridors run along I-90/94 (Chicago metro expressways), I-55 (Chicago to St. Louis), I-80 (Chicago to the Iowa border), and I-57 (Chicago to southern Illinois). Chicago's expressway system concentrates crash exposure in Cook, DuPage, Lake, Kane, Will, and McHenry counties.",

    truckAudience:
      "Illinois is the nation's central intermodal freight hub. Chicago is the convergence point for BNSF, Union Pacific, and Norfolk Southern rail networks, and I-80 through the Chicago metro is among the highest-volume truck corridors in the country. I-55 and I-57 carry significant agricultural and manufactured goods freight downstate. The state's transport and warehouse sector recorded 40 workplace fatalities in 2023 — reflecting the scale of Illinois freight activity — and commercial vehicle cases in the Chicago metro often involve national carriers with complex multi-state insurance structures.",

    motorcycleAudience:
      "Illinois recorded 144 motorcycle fatalities in 2024 — roughly 12% of total traffic fatalities. Illinois has no universal helmet law for adult riders. Chicago area traffic density and rural downstate riding routes create distinct risk profiles for urban and rural motorcycle cases. Summer riding season along the Great River Road and Shawnee National Forest routes concentrates downstate exposure.",

    constructionAudience:
      "Chicago is one of the largest construction markets in the United States, with active commercial, residential, and infrastructure projects across the metro. Construction fatalities represent 20.7% of all Illinois workplace fatalities (30 of 145 in 2023). Third-party liability — crane, scaffold, electrical, and fall protection cases involving a non-employer — is the primary recovery vehicle where workers' compensation limits direct claims. Downstate, infrastructure and agricultural facility construction add secondary volume in Peoria, Springfield, and southern Illinois.",

    ruralUrbanContext:
      "Illinois divides sharply along the Chicago/downstate axis. The Chicago metro — Cook, DuPage, Lake, Kane, Will, and McHenry counties — concentrates the majority of crash volume and legal advertising activity. Downstate Illinois is largely rural and agricultural, with significantly lower broadband penetration in the central and southern counties. Digital-only campaigns that perform in Chicago substantially underperform in rural McLean, Sangamon, Marion, and the Egyptian-region counties. Radio, community media, and outdoor are necessary channels downstate.",

    judicialContext:
      "Cook County (Chicago) is the dominant PI venue in Illinois and one of the most plaintiff-favorable jurisdictions in the Midwest. Madison County (Alton/Belleville, St. Louis metro) has historically been a strong plaintiff venue for mass tort and occupational disease cases. DuPage County is more defense-oriented. For auto and trucking PI cases, venue analysis should prioritize plaintiff residency in Cook or Madison counties wherever crash location and domicile permit it.",

    marketSaturationTitle: "Chicago Metro Saturation vs. Downstate Opportunity",
    marketSaturationTip:
      "The Chicago DMA — Cook, DuPage, Lake, Kane, Will, and McHenry counties — has the highest PI advertiser density in Illinois by a wide margin. National firms compete aggressively across digital, broadcast, and outdoor. Downstate markets — Peoria, Springfield, Champaign-Urbana, Rockford, and the Belleville/O'Fallon area (Madison County) — offer lower CPMs, less competitive digital auctions, and access to a strong plaintiff venue without Chicago market pricing.",

    freightCorridorTitle: "I-80 / Intermodal Hub — National Freight Convergence Point",
    freightCorridorTip:
      "Illinois is the central node of the North American freight network. I-80 through the Chicago metro carries one of the highest truck volumes of any interstate in the country. The BNSF and Union Pacific intermodal yards in Elburn, Joliet, and Elwood generate continuous truck movement on surrounding interstates. I-55 and I-57 carry downstate agricultural and industrial freight. Trucking PI cases in the Chicago metro frequently involve national carriers with complex multi-state insurance structures.",

    solUrgencyTitle: "2-Year SOL — Chicago Venue Urgency Multiplier",
    solUrgencyTip:
      "Illinois's 2-year personal injury statute of limitations is tight, particularly for complex commercial vehicle cases requiring early accident reconstruction and evidence holds. The additional urgency in Illinois is venue: cases filed in Cook County produce dramatically different expected outcomes than the same case filed downstate. Fast intake to verify plaintiff residency and crash location — and to confirm Cook County venue eligibility — is the key early-stage decision before the client shops elsewhere.",

    internetAccessTitle: "Downstate IL Connectivity Gap",
    internetAccessTip:
      "Rural downstate Illinois — including the central and southern counties of McLean, Logan, Sangamon, Marion, Jefferson, and the Egyptian region — has significantly lower broadband penetration than the Chicago metro. These areas have higher uninsured populations and elevated per-capita fatality rates. Digital-only advertising is insufficient for plaintiff firms targeting non-metro Illinois. Radio, outdoor, and community partnerships are necessary channels, particularly in the St. Louis–border and far southern counties.",

    outOfStateTitle: "Chicago Visitor & Tourism Opportunity",
    outOfStateTip:
      "Chicago draws tens of millions of out-of-state and international visitors annually. Out-of-state visitors injured in Illinois — in traffic incidents, premises cases, or during large-scale events — may not know local attorneys or Illinois's 2-year SOL. Downtown Chicago geo-fenced digital, partnerships with major hotel concierge networks, and campaigns around large convention events can capture injury cases from this high-value visitor segment.",

    footerSourcesLabel:
      "Illinois Department of Transportation — Illinois Traffic Crash Report 2024 (IDOT 2024)",
  },

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
