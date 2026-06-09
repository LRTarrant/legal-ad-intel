import { connecticutCompetitiveData } from "@/lib/data/competitive-landscape/connecticut";
import type { StateConfig } from "./_types";

export const connecticutConfig: StateConfig = {
  slug: "connecticut",
  stateCode: "CT",
  stateName: "Connecticut",

  metadata: {
    title: "Connecticut State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Connecticut — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across Hartford, New Haven, Stamford, Bridgeport, Waterbury, and New London.",
  },

  // Source: FARS 2024 (preliminary). Connecticut repealed no-fault auto in 1993;
  // standard tort liability applies. Motorcycle/speed not broken out in our data.
  trafficStats: {
    totalCrashes: 0,
    totalFatalities: 310, // FARS 2024 (preliminary)
    motorcycleFatalities: null,
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 109, // FARS 2024 (preliminary)
    alcoholRelatedPct: 35.2, // 109 / 310 FARS 2024 (preliminary)
    unrestrainedFatalities: 0,
    distractedDrivingFatalCrashes: 0,
    urbanFatalities: 269, // FARS 2024 (preliminary)
    ruralFatalities: 39, // FARS 2024 (preliminary)
    reportYear: 2024,
    sourceLabel: "FARS 2024 (preliminary)",
  },

  // Source: BLS Census of Fatal Occupational Injuries — Connecticut 2023.
  // Verified via Wayback snapshot of bls.gov/iif/state-data CFOI 2023 CT table.
  // Total 33; Construction (NAICS industry) 10; Transportation & warehousing 5;
  // Falls/slips/trips (event) 8; Transportation incidents (event) 14.
  // Total employment / QCEW covered employment left at 0 (not separately verified).
  workplaceStats: {
    totalEmployment: 0,
    qcewCoveredEmployment: 0,
    totalWorkplaceFatalities: 33,
    constructionFatalities: 10,
    constructionPctTotal: 30.3, // 10 / 33
    transportWarehouseFatalities: 5,
    truckTransportFatalities: null, // not broken out in BLS CFOI 2023 CT state tables
    fallsSlipsTrips: 8,
    transportationIncidents: 14,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 2024 1-year (via Census Reporter, geo 04000US09).
  // driveAlone = B08006 drove-alone (1,315,496) / total workers (1,874,388).
  // avgCommuteMinutes = B08013 aggregate (43,866,844) / B08303 commuters (1,623,782).
  commuteStats: {
    driveAlone: 70.2,
    nationalAvg: 68.7,
    avgCommuteMinutes: 27.0,
  },

  competitiveData: connecticutCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Connecticut — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across Hartford, New Haven, Stamford, Bridgeport, Waterbury, and New London. Population ~3.6M.",

    legalLandscape:
      "Connecticut uses modified comparative negligence with a 51% bar (Conn. Gen. Stat. § 52-572h): a plaintiff whose share of fault is greater than the combined fault of the defendants is barred from recovery, while a plaintiff at or below that threshold recovers with damages reduced by their percentage of fault. The personal injury statute of limitations is two years from the date the injury is first sustained or discovered (Conn. Gen. Stat. § 52-584), with an outer three-year limit from the act or omission. Connecticut is NOT a no-fault state — it repealed its no-fault auto insurance regime in 1993, so standard tort liability governs auto claims. The state imposes no general statutory cap on non-economic damages in standard personal injury cases. Hartford (Hartford County) and the New Haven / Fairfield judicial districts are the primary litigation centers.",

    autoAudience:
      "Connecticut's crash exposure concentrates along three interstate corridors: I-95, which runs the length of the densely populated coast from Greenwich through Bridgeport, New Haven, and New London; I-91, the north-south spine from New Haven through Hartford to the Massachusetts line; and I-84, the east-west route through Danbury, Waterbury, and Hartford. Drive-alone commuting (70.2%) sits just above the national average (68.7%), concentrating exposure in the Hartford and New Haven metros and the affluent Fairfield County suburbs. The compact geography means most case volume clusters within the I-95/I-91/I-84 triangle.",

    truckAudience:
      "Connecticut is a through-state for Northeast freight. I-95 is one of the busiest truck corridors on the Eastern Seaboard, carrying interstate carriers between the New York metro and Providence/Boston. I-84 links the Hudson Valley and western Massachusetts freight networks through Danbury and Hartford, and I-91 feeds the Springfield, MA distribution belt. Trucking PI cases on these corridors frequently involve out-of-state carriers with multi-state insurance structures, and Connecticut's 2-year SOL (§ 52-584) makes early intake critical before evidence and ELD data are lost.",

    motorcycleAudience:
      "Connecticut requires helmets only for riders under 18 (Conn. Gen. Stat. § 14-289g); riders 18 and older may legally ride without a helmet, which raises injury severity in adult motorcycle crashes. Motorcycle fatalities are not separately broken out in our FARS 2024 preliminary data for Connecticut. Recreational riding in the Litchfield Hills and eastern Connecticut, plus heavy out-of-state rider traffic on I-95 and along the shoreline, makes early intake on motorcycle cases important given the 2-year SOL.",

    constructionAudience:
      "Construction accounted for 10 of Connecticut's 33 workplace fatalities in 2023 (30.3%), the single largest industry share. Active markets include downtown Hartford and Stamford office and residential development, New Haven's biotech and Yale-anchored expansion, and ongoing I-95 and rail-corridor infrastructure work. Third-party liability — crane, scaffold, electrical, and OSHA-cited incidents involving a non-employer at fault — is the primary recovery path where workers' compensation limits direct claims against the employer. Workers on active Fairfield County and Hartford-area job sites and their families are the primary target.",

    ruralUrbanContext:
      "Connecticut is heavily urban: FARS 2024 preliminary data records 269 urban fatalities against 39 rural. The rural exposure concentrates in the northeast 'Quiet Corner' (Windham and Tolland counties) and the northwest Litchfield Hills, where two-lane state routes and lower seatbelt-use patterns raise per-crash severity. Because rural volume is small in absolute terms, plaintiff firms should weight spend toward the coastal I-95 and central I-91 metros, treating rural counties as a radio-and-outdoor supplement rather than a primary digital target.",

    judicialContext:
      "Connecticut organizes its trial courts into judicial districts rather than counties for civil purposes. The Hartford, New Haven, Fairfield (Bridgeport), and Stamford-Norwalk judicial districts handle the bulk of high-value PI litigation. Fairfield County juries, drawn from one of the wealthiest counties in the nation, can return substantial verdicts, while Hartford and New Haven offer deep, experienced civil benches. Venue selection — driven by plaintiff residency and crash or injury location — can materially shift expected case value across these districts.",

    marketSaturationTitle: "Hartford-New Haven DMA vs. the Fairfield County NY-DMA Split",
    marketSaturationTip:
      "Most of Connecticut sits in the Hartford-New Haven DMA, the state's primary and most cost-efficient broadcast market. But wealthy Fairfield County — Stamford, Norwalk, and Greenwich — falls inside the New York DMA, where ad rates are among the most expensive in the country and PI advertiser saturation is intense. Far-eastern Connecticut (New London / Norwich area) bleeds into the Providence and Boston DMAs. Firms targeting Fairfield County pay NY-metro CPMs; Hartford-New Haven and Waterbury deliver materially better cost-per-case economics for the rest of the state.",

    freightCorridorTitle: "I-95 / I-84 / I-91 Freight Corridors",
    freightCorridorTip:
      "I-95 along the Connecticut coast is one of the highest-volume truck routes in the Northeast, connecting the New York metro to Providence and Boston. I-84 carries east-west freight through Danbury, Waterbury, and Hartford, and I-91 links New Haven north to Hartford and the Springfield, MA distribution belt. Trucking PI cases on these routes commonly involve interstate carriers with complex multi-state insurance and venue questions.",

    solUrgencyTitle: "2-Year SOL (§ 52-584) — Short Window",
    solUrgencyTip:
      "Connecticut's personal injury statute of limitations is two years from the date the injury is sustained or discovered (Conn. Gen. Stat. § 52-584), with an outer three-year repose limit. Claims against the state or municipalities carry separate, shorter notice-of-claim deadlines. Fast intake, early evidence preservation, and prompt engagement with treating providers are critical to protect both the case and the client relationship before the SOL becomes a bar.",

    outOfStateTitle: "I-95 Shoreline & Casino Tourism Opportunity",
    outOfStateTip:
      "Connecticut's I-95 shoreline, the Foxwoods and Mohegan Sun casino corridor in the southeast, and the Litchfield Hills draw heavy out-of-state traffic from New York, New Jersey, and Massachusetts. Out-of-state visitors injured in Connecticut often do not know local PI attorneys or the state's 2-year SOL. Geo-fenced digital along I-95 and the casino corridor, combined with shoreline and tourism-area partnerships, can capture these cases before injured visitors engage out-of-state counsel.",

    footerSourcesLabel:
      "FARS 2024 (preliminary) · BLS CFOI 2023 · U.S. Census ACS 2024 1-year",
  },

  features: {
    showWorkplaceSection: true,
  },

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
