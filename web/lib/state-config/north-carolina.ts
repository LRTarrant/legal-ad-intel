import { northCarolinaCompetitiveData } from "@/lib/data/competitive-landscape/north-carolina";
import type { StateConfig } from "./_types";

export const northCarolinaConfig: StateConfig = {
  slug: "north-carolina",
  stateCode: "NC",
  stateName: "North Carolina",

  metadata: {
    title: "North Carolina State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in North Carolina — combining state DOT crash and injury data, demographics, judicial profiles, and market opportunity signals across Charlotte, Raleigh-Durham, Greensboro, Winston-Salem, Asheville.",
  },

  // Traffic totals, alcohol, motorcycle, distracted: NCDMV 2023.
  // Speed-related and unrestrained fatalities: NCDOT 2022 Traffic Crash Facts
  //   (best single-source tabulation available; narrower speed definition than FARS).
  trafficStats: {
    totalCrashes: 284157,
    totalFatalities: 1619, // FARS 2024 (preliminary)
    motorcycleFatalities: 202,
    speedRelatedFatalities: 426, // NCDOT 2022 Crash Facts — "Speed – Fatalities" (exceeding limit or unsafe for conditions)
    speedRelatedPct: 25.3,       // 426 / 1686 (2023 total); NCDOT 2022 source-matched pct to be verified
    alcoholRelatedFatalities: 344, // FARS 2024 (preliminary)
    alcoholRelatedPct: 21.2, // 344 / 1619 FARS 2024 (preliminary)
    unrestrainedFatalities: 562, // NCDOT 2022 Crash Facts — "Unbelted Persons Killed"
    distractedDrivingFatalCrashes: 132,
    urbanFatalities: 604, // FARS 2024 (preliminary)
    ruralFatalities: 1009, // FARS 2024 (preliminary)
    reportYear: 2023,
    sourceLabel: "NCDMV 2023",
  },

  // Source: BLS Census of Fatal Occupational Injuries — North Carolina 2023.
  workplaceStats: {
    totalEmployment: 4858000,
    qcewCoveredEmployment: 4858000,
    totalWorkplaceFatalities: 177,
    constructionFatalities: 43,
    constructionPctTotal: 24.3,
    transportWarehouseFatalities: 23,
    truckTransportFatalities: 17,
    fallsSlipsTrips: 38,
    transportationIncidents: 62,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 5-year estimates.
  commuteStats: {
    driveAlone: 81.0,
    nationalAvg: 68.7,
    avgCommuteMinutes: 25.0,
  },

  competitiveData: northCarolinaCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in North Carolina — combining NCDMV crash data, demographics, judicial profiles, and market opportunity signals across Charlotte, Raleigh-Durham, Greensboro, Winston-Salem, and Asheville. Population ~11M.",

    legalLandscape:
      "North Carolina applies pure contributory negligence — one of only four states (plus D.C.) still using this doctrine. A plaintiff who bears any degree of fault is barred from recovery entirely. The personal injury statute of limitations is three years from the date of injury (N.C.G.S. § 1-52(16)). Punitive damages are capped at the greater of $250,000 or three times compensatory damages (N.C.G.S. § 1D-25); no caps apply to non-economic damages in standard PI cases. The contributory-negligence bar raises the intake standard: cases where plaintiff fault is clearly absent or strongly deniable carry far lower early-stage risk.",

    autoAudience:
      "North Carolina's major crash corridors follow I-85 (Charlotte–Greensboro–Durham), I-95 (eastern rural corridor), and I-40 (Raleigh–Greensboro–Asheville). Drive-alone commuting (81.0%) is well above the national average (68.7%), concentrating exposure in suburban and exurban Charlotte and Raleigh-Durham. Rural eastern NC counties generate disproportionate fatality rates relative to population.",

    truckAudience:
      "North Carolina sits on a major East Coast freight corridor — I-95 and I-85 carry heavy truck traffic between the Northeast and Southeast. Charlotte's logistics infrastructure and the Research Triangle's distribution networks also drive truck volume. Concentration of rural fatalities in the eastern part of the state aligns with I-95 trucking exposure.",

    motorcycleAudience:
      "North Carolina's Blue Ridge Parkway and Appalachian foothills draw significant motorcycle traffic, including out-of-state riders. North Carolina has a universal helmet law for riders under 21; riders 21+ are not required to wear helmets. Summer and fall riding seasons concentrate crash exposure. The state's 202 motorcycle fatalities in 2023 represent roughly 12% of total traffic fatalities.",

    constructionAudience:
      "Charlotte and the Research Triangle are among the fastest-growing construction markets in the Southeast, concentrating worksite exposure. North Carolina's contributory negligence doctrine means third-party construction liability cases require clear absence of worker fault. Workers and families of injured workers in non-covered or OSHA-specific scenarios are the primary targets.",

    ruralUrbanContext:
      "North Carolina's rural eastern counties — particularly along I-95 and the coastal plain — have fatality rates far above the state average despite lower population density. Lower internet penetration in rural NC limits digital reach; local radio, community newspapers, and outdoor in those markets are necessary complements to digital campaigns.",

    judicialContext:
      "Filing venue in North Carolina matters significantly under the contributory negligence doctrine. Mecklenburg (Charlotte) and Wake (Raleigh) counties have large, diverse jury pools. Plaintiff-leaning urban venues can produce strong verdicts even in a contributory-negligence regime, especially for cases with clear defendant fault and severe injuries.",

    marketSaturationTitle: "Charlotte & Triangle Saturation vs. Secondary Markets",
    marketSaturationTip:
      "Charlotte (Mecklenburg) and Raleigh-Durham (Wake/Durham/Orange) attract heavy national PI advertiser spend. Surrounding growing counties — Cabarrus, Union, Johnston, Harnett — offer comparable case volume with lower advertising density. Greensboro-Winston-Salem (Guilford/Forsyth) is a mid-size market with favorable cost-per-case economics.",

    freightCorridorTitle: "I-95 / I-85 Freight Corridor",
    freightCorridorTip:
      "The I-95 corridor through eastern NC and I-85 between Charlotte and the Research Triangle carry substantial truck traffic. Rural eastern counties along I-95 see high truck-involved crash rates relative to population. Trucking PI campaigns along these corridors reach a demographic with high economic vulnerability and limited legal representation.",

    solUrgencyTitle: "Contributory Negligence — The Real Intake Risk",
    solUrgencyTip:
      "North Carolina's 3-year SOL gives more time than some states, but the contributory negligence rule creates a different urgency: early evidence must establish zero plaintiff fault. Any shared fault bars recovery entirely. Fast intake, immediate scene documentation, and preserved communications are critical — the risk is losing the case at summary judgment, not missing a filing deadline.",

    internetAccessTitle: "Eastern NC Connectivity Gap",
    internetAccessTip:
      "Rural eastern North Carolina — along I-95 and the coastal plain — has lower broadband penetration and higher uninsured populations. These counties also have elevated fatality rates. Digital-only campaigns cannot reach these communities effectively. Local radio, community health center partnerships, and outdoor advertising are necessary channels for plaintiff firms targeting eastern NC.",

    outOfStateTitle: "Blue Ridge / Appalachian Tourism Opportunity",
    outOfStateTip:
      "The Blue Ridge Parkway and Appalachian foothills draw significant out-of-state visitors and riders. Out-of-state visitors injured in NC may not know local attorneys or the state's strict contributory negligence rule. Geo-fenced digital along tourism corridors and partnerships with Blue Ridge-area accommodations can capture cases from this segment.",

    footerSourcesLabel:
      "NCDMV Traffic Crash Statistics Report 2023 — North Carolina Division of Motor Vehicles; NCDOT 2022 Traffic Crash Facts — North Carolina Department of Transportation",
  },

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
