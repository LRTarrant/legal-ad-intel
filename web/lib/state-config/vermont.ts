import { vermontCompetitiveData } from "@/lib/data/competitive-landscape/vermont";
import type { StateConfig } from "./_types";

export const vermontConfig: StateConfig = {
  slug: "vermont",
  stateCode: "VT",
  stateName: "Vermont",

  metadata: {
    title: "Vermont State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Vermont — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across the Burlington-Plattsburgh DMA. A single-market, rural-mountain state with a 51% comparative-negligence bar and a 3-year PI statute of limitations.",
  },

  // Source: FARS 2024 Annual Report File (NHTSA). Vermont is reported as a
  // single market; FARS rural/urban split is available, motorcycle and
  // speed-related breakouts are not in our extract for this state.
  trafficStats: {
    totalCrashes: 0, // not pulled in this build (FARS fatality extract only)
    totalFatalities: 59,
    motorcycleFatalities: null, // not in our FARS extract for VT
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 25,
    alcoholRelatedPct: 42.4,
    unrestrainedFatalities: 0, // not separately citable in our extract
    distractedDrivingFatalCrashes: 0, // not separately citable in our extract
    urbanFatalities: 16,
    ruralFatalities: 42,
    reportYear: 2024,
    sourceLabel: "FARS 2024 Annual Report File",
  },

  // Source: BLS Census of Fatal Occupational Injuries — Vermont 2023.
  // Vermont recorded 16 total fatal work injuries in 2023 (BLS Northeast
  // Information Office). BLS publishes only rounded percentage shares for
  // Vermont's industry/event breakdown (transportation incidents 31%; violent
  // acts, falls/slips/trips, and contact incidents 19% each) — no citable raw
  // sub-counts. Per accuracy-over-completeness, the total is kept and all
  // sub-fields are zeroed; features.showWorkplaceSection is false (see below).
  workplaceStats: {
    totalEmployment: 0,
    qcewCoveredEmployment: 0,
    totalWorkplaceFatalities: 16,
    constructionFatalities: 0,
    constructionPctTotal: 0,
    transportWarehouseFatalities: 0,
    truckTransportFatalities: null,
    fallsSlipsTrips: 0,
    transportationIncidents: 0,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 2024 1-year estimates (tables B08006, B08013,
  // B08303). driveAlone = 231,409 / 340,565 workers. avgCommuteMinutes =
  // 6,839,940 aggregate minutes / 286,208 commuters (excludes work-from-home).
  commuteStats: {
    driveAlone: 68.0,
    nationalAvg: 68.7,
    avgCommuteMinutes: 23.9,
  },

  competitiveData: vermontCompetitiveData,

  features: {
    // Workplace breakdown suppressed: BLS publishes only percentage shares for
    // Vermont 2023, no citable raw industry/event counts. Total verified (16)
    // but sub-fields are not, so the section is hidden.
    showWorkplaceSection: false,
    // Single-DMA, low-density state — no meaningful multi-metro saturation map.
    showRuralUrban: true,
  },

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Vermont — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across the Burlington-Plattsburgh DMA. Vermont is a small, rural-mountain state (population ~648,000) where nearly the entire market sits in one DMA shared with northern New York.",

    legalLandscape:
      "Vermont follows modified comparative negligence with a 51% bar (12 V.S.A. § 1036): a plaintiff recovers only if their share of fault is not greater than the combined fault of the defendants, and damages are reduced in proportion to the plaintiff's fault. The personal injury statute of limitations is three years from the date of injury (12 V.S.A. § 512), longer than neighboring New Hampshire and Massachusetts. Vermont is an at-fault (tort) state for auto claims, so an injured party pursues the at-fault driver and that driver's insurer directly. Vermont imposes no general statutory cap on non-economic damages in standard personal injury cases. Litigation is concentrated in Chittenden County (Burlington), the state's largest population and commercial center.",

    autoAudience:
      "Vermont's fatal-crash exposure is overwhelmingly rural: 42 of 59 traffic fatalities in 2024 occurred on rural roads versus 16 on urban roads (FARS 2024). The state's two spine interstates — I-89 (Canadian border at Highgate Springs through Burlington and Montpelier to the New Hampshire line at White River Junction) and I-91 (Massachusetts border at Brattleboro north through White River Junction, St. Johnsbury, to the Canadian border at Derby Line) — carry most through traffic. Drive-alone commuting (68.0%) tracks the national average (68.7%), but Vermont's mountain geography and dispersed population mean long distances between population centers and long EMS response times after serious crashes. Burlington (Chittenden County) and its suburbs drive the largest share of case volume; the rest of the state is thin and rural.",

    truckAudience:
      "Vermont's commercial-vehicle exposure follows I-89 and I-91, which connect the Montreal and Quebec freight corridor to southern New England and the I-95 corridor. Cross-border Canadian carriers, regional distribution traffic, and seasonal supply runs to ski and resort areas generate the bulk of heavy-truck volume. Rural two-lane state highways feeding the interstates carry log trucks, milk and agricultural haulers, and aggregate trucks. Trucking PI cases on the I-89/I-91 corridors often involve interstate or cross-border carriers with multi-jurisdiction insurance structures and complex venue questions.",

    motorcycleAudience:
      "Vermont has a universal motorcycle helmet law: every operator and passenger must wear an approved helmet regardless of age or experience (23 V.S.A. § 1256). The state's mountain routes — Route 100 down the spine of the Green Mountains, the gaps, and the scenic byways — draw substantial recreational and touring riders in summer and fall, including out-of-state visitors from the New York, Massachusetts, and Quebec markets. The 3-year SOL gives more intake runway than neighboring New Hampshire's, but rural crash locations and long EMS times make early evidence preservation and prompt provider engagement important for motorcycle cases.",

    constructionAudience:
      "Vermont's construction workforce is small and concentrated around Chittenden County (Burlington) and the resort-development corridors. Third-party liability — incidents where a non-employer party (a general contractor, equipment supplier, or property owner) is at fault — is the primary recovery path beyond workers' compensation. Note: Vermont's 2023 workplace-fatality detail is not published at a citable raw-count level (BLS reports only rounded percentage shares for the state), so this surface relies on the statewide total rather than an industry breakdown.",

    ruralUrbanContext:
      "Vermont is one of the most rural states in the country, and its fatality data shows it: 42 of 59 traffic fatalities in 2024 were on rural roads (about 71%), versus 16 urban (FARS 2024). Serious crashes on remote two-lane mountain highways mean long EMS transport times and, often, transfer to larger trauma centers in Burlington, Lebanon (NH), or out of state. For plaintiff firms, this rural concentration argues against a digital-only strategy: large stretches of Vermont have limited broadband, and radio, outdoor along I-89/I-91, and community media reach the rural population that digital campaigns miss.",

    judicialContext:
      "Vermont's trial bench is small and centralized — the Superior Court Civil Division hears most PI matters, with the highest case volume in Chittenden County (Burlington). Vermont juries are generally regarded as moderate rather than high-verdict, and the small population means jury pools and local reputation matter. Venue and the plaintiff's county of residence can shift expected case value; Chittenden County is the most active and most closely watched civil venue in the state.",

    solUrgencyTitle: "3-Year SOL — Longer Window, But Rural Evidence Decays Fast",
    solUrgencyTip:
      "Vermont's 3-year personal injury statute of limitations (12 V.S.A. § 512) is more generous than neighboring New Hampshire's. The longer window does not remove urgency: rural crash scenes on mountain highways are cleared quickly, weather and seasonal road conditions change the scene, and witnesses to a remote crash are harder to locate later. Claims against municipal or state defendants may carry shorter notice requirements. Fast intake and early scene and evidence preservation protect both the case and the client relationship well before the SOL becomes a bar.",

    outOfStateTitle: "Ski, Leaf-Peeper & Cross-Border Visitor Opportunity",
    outOfStateTip:
      "Vermont's seasonal traffic swings hard with tourism: ski-season traffic to Stowe, Killington, Sugarbush, and Jay Peak in winter, and fall leaf-peeper traffic on the Green Mountain byways. Much of this volume is out-of-state visitors from the New York, Massachusetts, Connecticut, and Quebec markets, plus Canadian cross-border travelers, who will not know Vermont's 3-year SOL or its 51% comparative-fault bar. Geo-fenced digital along the I-89/I-91 resort corridors and partnerships with ski-area and lodging operators can capture these cases before visitors engage out-of-state counsel.",

    internetAccessTitle: "Rural Broadband Gap — Radio & Outdoor Still Matter",
    internetAccessTip:
      "Large parts of rural Vermont — the Northeast Kingdom (Essex, Orleans, Caledonia counties) and the mountain interior — have limited broadband penetration. These are the same areas where rural fatal crashes concentrate. Digital-only campaigns underreach this population. Local radio, outdoor advertising along I-89 and I-91, and community partnerships are necessary channels for plaintiff firms seeking cases outside the Burlington metro.",

    footerSourcesLabel:
      "FARS 2024 Annual Report File (NHTSA) · BLS Census of Fatal Occupational Injuries, Vermont 2023 · U.S. Census ACS 2024 1-Year Estimates",
  },

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
