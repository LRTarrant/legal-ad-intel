import { rhodeIslandCompetitiveData } from "@/lib/data/competitive-landscape/rhode-island";
import type { StateConfig } from "./_types";

export const rhodeIslandConfig: StateConfig = {
  slug: "rhode-island",
  stateCode: "RI",
  stateName: "Rhode Island",

  metadata: {
    title: "Rhode Island State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Rhode Island — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across the Providence-New Bedford media market.",
  },

  // Source: FARS 2024 Annual Report File. Motorcycle and speed-related fatalities
  // are not broken out in the data handed to us; left null per source.
  // Urban/rural split provided by FARS 2024.
  trafficStats: {
    totalCrashes: 0, // not provided; FARS counts fatalities, not total crashes
    totalFatalities: 52,
    motorcycleFatalities: null,
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 20,
    alcoholRelatedPct: 38.5,
    unrestrainedFatalities: 0, // not provided in source data
    distractedDrivingFatalCrashes: 0, // not provided in source data
    urbanFatalities: 42,
    ruralFatalities: 7,
    reportYear: 2024,
    sourceLabel: "FARS 2024 Annual Report File",
  },

  // Source: BLS Census of Fatal Occupational Injuries — Rhode Island 2023.
  // RI recorded only 6 fatal work injuries in 2023 (lowest of any state, down
  // from 7 in 2022). At that volume BLS suppresses the industry and event
  // breakouts, so only the total is verifiable. Sub-fields zeroed and the
  // section is hidden via features.showWorkplaceSection = false.
  workplaceStats: {
    totalEmployment: 0, // not separately verified at suppression-level detail
    qcewCoveredEmployment: 0,
    totalWorkplaceFatalities: 6,
    constructionFatalities: 0,
    constructionPctTotal: 0,
    transportWarehouseFatalities: 0,
    truckTransportFatalities: null,
    fallsSlipsTrips: 0,
    transportationIncidents: 0,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 2024 1-year estimates (Census Reporter).
  // driveAlone = B08006 drove alone (403,522) / total workers (565,855) = 71.3%.
  // avgCommuteMinutes = B08013 aggregate (13,137,320) / B08303 commuters (500,335) = 26.3.
  commuteStats: {
    driveAlone: 71.3,
    nationalAvg: 68.7,
    avgCommuteMinutes: 26.3,
  },

  competitiveData: rhodeIslandCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Rhode Island — combining FARS crash data, demographics, judicial profiles, and market opportunity signals. The entire state sits within the Providence-New Bedford media market. Population ~1.1M.",

    legalLandscape:
      "Rhode Island follows pure comparative negligence: a plaintiff's recovery is reduced in proportion to their share of fault but is never barred, even when the plaintiff is more at fault than the defendant (R.I. Gen. Laws § 9-20-4). This is more plaintiff-favorable than the modified comparative bars used in most neighboring states. The personal injury statute of limitations is three years from the date of injury (R.I. Gen. Laws § 9-1-14). Rhode Island is a traditional at-fault (tort) state and imposes no general statutory cap on non-economic damages in standard PI cases. Providence County is the state's dominant litigation center, with the Providence County Superior Court handling the bulk of significant auto and premises matters.",

    autoAudience:
      "Rhode Island's crash exposure is concentrated along the dense I-95 corridor, which runs the length of the state from the Connecticut line through Providence to the Massachusetts border, plus I-195 (Providence to the East Bay and southeastern Massachusetts) and Route 146. Drive-alone commuting (71.3%) runs above the national average (68.7%). With 52 traffic fatalities in 2024 and 42 of them in urban areas, case volume is tightly concentrated around Providence and its surrounding cities (Cranston, Warwick, Pawtucket). The state's small geography means short EMS response times and a compact, accessible client base.",

    truckAudience:
      "I-95 through Rhode Island is a primary New England freight artery connecting the New York metro to Boston, and the Port of Providence adds regional distribution traffic. Despite the state's small size, interstate carriers move continuously through the I-95 / I-195 corridor, generating commercial-vehicle exposure that is disproportionate to Rhode Island's footprint. Trucking PI cases here frequently involve multi-state carriers with insurance and venue questions that span the Providence-New Bedford market into Connecticut and Massachusetts.",

    motorcycleAudience:
      "Rhode Island requires helmets for riders under 21, for novice riders (during their first year of licensure), and for all passengers; experienced riders 21 and older may ride without one. FARS 2024 does not break out a Rhode Island motorcycle-fatality count in the data available here, so a specific figure is omitted. Coastal routes (Route 1A, Ocean Drive in Newport, the South County shoreline) draw recreational and out-of-state riders in the warm months. The 3-year SOL gives reasonable intake runway, but early evidence preservation still matters on rider cases.",

    constructionAudience:
      "Rhode Island recorded only 6 total work fatalities in 2023, the lowest of any state, and BLS suppresses the industry breakout at that volume, so a separate construction figure is not published. The workplace section is hidden on this page for that reason. Providence's ongoing downtown and waterfront redevelopment still generates active job-site exposure; third-party liability (crane, scaffold, electrical, and OSHA-cited incidents involving a non-employer at fault) remains the primary recovery path where workers' compensation limits direct claims, but the case volume is thin relative to larger states.",

    ruralUrbanContext:
      "Rhode Island is one of the most urbanized states in the country: 42 of its 52 traffic fatalities in 2024 occurred in urban areas, with only 7 rural. There is effectively no rural/urban media split to plan around. Broadband penetration is high statewide and the geography is compact, so digital-first campaigns reach nearly the entire injured population without the rural connectivity gaps that affect larger states. The practical planning question is competitive density within a single market, not geographic coverage.",

    judicialContext:
      "Providence County Superior Court is Rhode Island's principal civil venue and handles the large majority of significant PI matters. The compact state court system means a relatively small, consistent bench and bar; venue selection offers far less strategic variation than in multi-county states. Plaintiff residency and crash location still matter for the occasional Washington, Kent, Newport, or Bristol County filing, but most case-value modeling centers on Providence County.",

    marketSaturationTitle: "One Market: Providence-New Bedford",
    marketSaturationTip:
      "All of Rhode Island falls inside the Providence-New Bedford DMA, which it shares with southeastern Massachusetts (New Bedford, Fall River, the South Coast). There is no secondary in-state market to arbitrage. The competitive question is share of voice within a single, contested media market rather than which metro to enter. Because the DMA crosses the state line, Rhode Island PI advertisers compete for attention with southeastern Massachusetts firms on the same TV, radio, and digital inventory.",

    freightCorridorTitle: "I-95 New England Freight Spine",
    freightCorridorTip:
      "I-95 through Providence is a continuous high-volume freight route between the New York metro and Boston, with I-195 branching toward the East Bay and southeastern Massachusetts and the Port of Providence feeding regional distribution. Truck-crash exposure here is concentrated on a short, heavily traveled stretch. Cases often involve interstate carriers with multi-state insurance structures and venue questions spanning Rhode Island, Connecticut, and Massachusetts.",

    solUrgencyTitle: "3-Year SOL — Standard PI Window",
    solUrgencyTip:
      "Rhode Island's personal injury statute of limitations is three years from the date of injury (R.I. Gen. Laws § 9-1-14), in line with neighboring Massachusetts and Connecticut. Claims against municipal or state defendants may carry shorter notice requirements, so early case screening still matters even though the general window is comfortable. Prompt intake and evidence preservation protect the case and the client relationship well before the SOL becomes a bar.",

    internetAccessTitle: "High Statewide Connectivity",
    internetAccessTip:
      "Rhode Island's compact, highly urbanized geography supports strong broadband penetration across essentially the entire state. Digital-only campaigns reach nearly the whole injured population without the rural coverage gaps that force larger states into radio and outdoor as fill-in channels. Spend efficiency favors targeted search and social within the single Providence-New Bedford market, with broadcast used for reach and brand rather than to close geographic holes.",

    outOfStateTitle: "Coastal & Cross-Border Visitors",
    outOfStateTip:
      "Newport, the South County beaches, and the I-95 / I-195 corridors draw summer visitors from the Boston and New York metros, plus continuous cross-border traffic with southeastern Massachusetts and Connecticut. Out-of-state visitors injured in Rhode Island may not know local counsel or the state's pure comparative negligence rule, which can favor them where they bear partial fault. Geo-fenced digital along the coastal and interstate corridors can capture these cases before injured visitors engage attorneys back home.",

    footerSourcesLabel:
      "FARS 2024 Annual Report File; BLS Census of Fatal Occupational Injuries (Rhode Island, 2023); U.S. Census ACS 2024 1-year estimates",
  },

  features: {
    // RI reported only 6 total work fatalities in 2023; BLS suppresses the
    // industry/event breakout at that volume, so the workplace section is hidden.
    showWorkplaceSection: false,
  },

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
