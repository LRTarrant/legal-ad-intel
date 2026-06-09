import { delawareCompetitiveData } from "@/lib/data/competitive-landscape/delaware";
import type { StateConfig } from "./_types";

export const delawareConfig: StateConfig = {
  slug: "delaware",
  stateCode: "DE",
  stateName: "Delaware",

  metadata: {
    title: "Delaware State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Delaware — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across Wilmington, Dover, and Sussex County. Delaware has no in-state Nielsen DMA: the north is in the Philadelphia DMA, the south in the Salisbury, MD DMA.",
  },

  // Source: FARS 2024 Annual Report File (fatality counts only).
  // Delaware does not publish a state-DOT 2024 crash report with the
  // motorcycle/speed breakouts FARS omits, so those stay null.
  trafficStats: {
    totalCrashes: 0, // no citable 2024 statewide crash count verified
    totalFatalities: 126,
    motorcycleFatalities: null, // not in our FARS extract; no citable state-DOT 2024 figure
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 29,
    alcoholRelatedPct: 23,
    unrestrainedFatalities: 0, // not citable
    distractedDrivingFatalCrashes: 0, // not citable
    urbanFatalities: 74,
    ruralFatalities: 51,
    reportYear: 2024,
    sourceLabel: "FARS 2024 Annual Report File",
  },

  // Source: BLS Census of Fatal Occupational Injuries — Delaware 2023, via the
  // Delaware Dept. of Labor "Delaware Workplace Fatalities — 2023" release.
  // Delaware is a small state: only the construction industry sector and the
  // top two event types are published. Employment totals are not separately
  // verified here, so they are zeroed (they do not drive the fatality tiles).
  workplaceStats: {
    totalEmployment: 0, // not separately verified for DE 2023
    qcewCoveredEmployment: 0, // not separately verified for DE 2023
    totalWorkplaceFatalities: 11,
    constructionFatalities: 4,
    constructionPctTotal: 36.4,
    transportWarehouseFatalities: 0, // not broken out as an industry in DE CFOI 2023 (only Construction shown)
    truckTransportFatalities: null, // not broken out in BLS CFOI 2023 DE state tables
    fallsSlipsTrips: 4,
    transportationIncidents: 4,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 2024 1-year estimates (via Census Reporter).
  // driveAlone = B08006 drove-alone / total workers = 361,073 / 500,340 = 72.2%.
  // avgCommuteMinutes = B08013 aggregate / B08303 commuters = 11,664,670 / 435,848 = 26.8.
  commuteStats: {
    driveAlone: 72.2,
    nationalAvg: 68.7,
    avgCommuteMinutes: 26.8,
  },

  competitiveData: delawareCompetitiveData,

  // Delaware reports a CFOI workplace-fatality breakdown (small but published),
  // so the workplace section stays visible.
  features: {
    showWorkplaceSection: true,
  },

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Delaware — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across Wilmington, Dover, and Sussex County. Delaware is the second-smallest state by area (~1M population) and, critically, has no in-state Nielsen DMA: northern Delaware buys through Philadelphia and southern Delaware through Salisbury, MD.",

    legalLandscape:
      "Delaware applies modified comparative negligence with a 51% bar (10 Del. C. § 8132): a plaintiff whose fault is greater than the combined fault of the defendants is barred from recovery, while a plaintiff at 50% or less recovers with damages reduced by their share of fault. The personal injury statute of limitations is two years from the date of injury (10 Del. C. § 8119) — a short window that makes fast intake essential. Delaware imposes no general statutory cap on non-economic damages in standard PI cases. Delaware requires mandatory add-on Personal Injury Protection (PIP) first-party benefits on auto policies, but it remains a tort state: PIP pays your medical and wage-loss benefits regardless of fault, and you retain the right to sue the at-fault driver for pain and suffering and any damages beyond PIP limits (there is no no-fault lawsuit threshold as in true no-fault states). All civil cases are venued in the Superior Court of Delaware (New Castle, Kent, and Sussex counties); New Castle County (Wilmington) carries the largest civil docket.",

    autoAudience:
      "Delaware's crash exposure concentrates on two corridors: I-95, which runs through Wilmington and New Castle County as the primary Northeast Corridor artery, and DE-1 (the Coastal Highway / Korean War Veterans Memorial Highway), which carries heavy north-south traffic from the Wilmington area through Dover to the Sussex County beach resorts. Drive-alone commuting (72.2%) runs above the national average (68.7%). New Castle County (Wilmington) is the dominant population and case-volume center; Kent County (Dover) and Sussex County (the beaches) are secondary, with Sussex spiking seasonally on summer beach traffic.",

    truckAudience:
      "Delaware sits on the I-95 Northeast freight spine between Baltimore and Philadelphia, funneling heavy interstate truck traffic through New Castle County. DE-1 carries commercial and tourism traffic south toward the Port of Wilmington's distribution network and the Sussex County beaches. Because Delaware is small and bracketed by Maryland, Pennsylvania, and New Jersey, trucking PI cases frequently involve interstate carriers with multi-state insurance structures and out-of-state defendant drivers, raising venue and choice-of-law questions even on short in-state crashes.",

    motorcycleAudience:
      "Delaware requires helmets for riders under 19 and for newly endorsed riders during their first two years after endorsement (21 Del. C. § 4185); experienced riders 19 and older may ride without a helmet but must have one in their possession. DE-1 and the Sussex County coastal routes draw recreational and out-of-state riders, particularly in summer from the Philadelphia, Baltimore, and New Jersey metros. FARS 2024 does not break out Delaware motorcycle fatalities in our extract, so a specific count is not shown here. The 2-year SOL (10 Del. C. § 8119) makes early intake critical for motorcycle cases, where injuries are severe and out-of-state riders often do not know Delaware counsel or the short filing window.",

    constructionAudience:
      "Construction was the single deadliest industry sector in Delaware in 2023, accounting for 4 of 11 workplace fatalities (36%), all in private industry. Specialty trade contractors and heavy/civil engineering construction (utility and water/sewer line work) drove the count. Third-party liability — a non-employer at fault on a job site — is the primary recovery path where workers' compensation limits direct claims against the employer. The Wilmington-area commercial corridor and ongoing DE-1 / coastal infrastructure work are the main job-site concentrations.",

    ruralUrbanContext:
      "Delaware's fatalities split 74 urban to 51 rural in FARS 2024, with rural fatalities concentrated in Kent and Sussex counties along DE-1 and the rural arterials feeding the beaches. Despite the state's small footprint, the rural southern counties carry a disproportionate share of fatal crashes relative to population. Because southern Delaware buys media through the Salisbury, MD DMA — a market that also covers Maryland's Eastern Shore — plaintiff firms targeting Sussex County must plan around a media footprint that crosses the state line and reaches a non-Delaware audience.",

    judicialContext:
      "Delaware's civil trial court is the Superior Court, sitting in all three counties. New Castle County (Wilmington) handles the largest civil and PI docket and is the primary venue for serious injury litigation. Kent (Dover) and Sussex (Georgetown) county courts handle lower volumes. Delaware is nationally known for its Court of Chancery and corporate bench, but that body does not hear personal injury cases — PI venue analysis here is about county of injury and plaintiff residency within the three-county Superior Court system.",

    marketSaturationTitle: "No In-State DMA — Wilmington vs. Sussex Media Splits",
    marketSaturationTip:
      "Delaware has no Nielsen DMA of its own. Northern Delaware (Wilmington, New Castle County) is part of the Philadelphia DMA — the 5th-largest U.S. TV market — so broadcast TV there is expensive and shared with millions of Pennsylvania and New Jersey viewers who are not Delaware case prospects. Southern Delaware (Sussex County) is in the Salisbury, MD DMA, a far smaller and cheaper market that also covers Maryland's Eastern Shore. Dover (Kent County) sits between the two. Spend efficiency favors geo-targeted digital, addressable TV, and radio over wasteful broadcast TV buys that pay for out-of-state reach.",

    freightCorridorTitle: "I-95 & DE-1 Freight Corridors",
    freightCorridorTip:
      "I-95 through New Castle County is one of the highest-volume freight routes on the East Coast, connecting Baltimore and Philadelphia. DE-1 is the primary north-south commercial and tourism artery, running from the Wilmington area through Dover to the Sussex beaches. Trucking PI cases on these corridors routinely involve interstate carriers, out-of-state drivers, and multi-state insurance structures, even when the crash itself is a short in-state segment.",

    solUrgencyTitle: "2-Year SOL — Short Filing Window",
    solUrgencyTip:
      "Delaware's personal injury statute of limitations is two years from the date of injury (10 Del. C. § 8119). Claims against state or municipal entities can carry separate, shorter notice requirements. Because Delaware is small and surrounded by three other states, many injured parties (especially summer beach visitors and interstate truck-crash victims) are non-residents who may not know Delaware's short window or local counsel. Fast intake and early evidence preservation protect both the case and the client relationship before the SOL becomes a bar.",

    outOfStateTitle: "Sussex County Beach Tourism Opportunity",
    outOfStateTip:
      "Rehoboth Beach, Dewey Beach, Bethany Beach, and Fenwick Island draw heavy summer traffic from the Philadelphia, Baltimore, Washington, and New Jersey metros down DE-1. Out-of-state visitors injured in Delaware — in auto, motorcycle, or premises incidents — typically do not know Delaware PI attorneys or the state's 2-year SOL. Geo-fenced digital along the DE-1 resort corridor and Salisbury-DMA radio, timed to the May–September season, can capture these cases before visitors engage out-of-state counsel back home.",

    footerSourcesLabel:
      "FARS 2024 Annual Report File (NHTSA); BLS Census of Fatal Occupational Injuries — Delaware 2023 (Delaware Dept. of Labor); U.S. Census ACS 2024 1-year estimates",
  },

  // No injuryData yet; Delaware does not publish a county-level injury-severity
  // crash table in the same form as Tennessee TITAN. Add when integrated.
};
