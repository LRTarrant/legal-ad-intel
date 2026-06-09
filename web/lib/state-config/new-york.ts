import { newYorkCompetitiveData } from "@/lib/data/competitive-landscape/new-york";
import type { StateConfig } from "./_types";

export const newYorkConfig: StateConfig = {
  slug: "new-york",
  stateCode: "NY",
  stateName: "New York",

  metadata: {
    title: "New York State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in New York — combining state DOT crash and injury data, demographics, judicial profiles, and market opportunity signals across New York City, Buffalo, Rochester, Albany, Syracuse.",
  },

  // Source: state DOT annual crash report (2023).
  trafficStats: {
    totalCrashes: 382000,
    totalFatalities: 1101, // FARS 2024 Annual Report File
    motorcycleFatalities: 120,
    speedRelatedFatalities: 350,
    speedRelatedPct: 32.0,
    alcoholRelatedFatalities: 157, // FARS 2024 Annual Report File
    alcoholRelatedPct: 14.3, // 157 / 1101 FARS 2024 Annual Report File
    unrestrainedFatalities: 250,
    distractedDrivingFatalCrashes: 80,
    urbanFatalities: 812, // FARS 2024 Annual Report File
    ruralFatalities: 283, // FARS 2024 Annual Report File
    reportYear: 2023,
    sourceLabel: "ITSMR NY 2023",
    fatalitiesSourceLabel: "FARS 2024 Annual Report File",
    fatalitiesReportYear: 2024,
  },

  // Source: BLS Census of Fatal Occupational Injuries — New York 2023.
  workplaceStats: {
    totalEmployment: 9400000,
    qcewCoveredEmployment: 9369000,
    totalWorkplaceFatalities: 246,
    constructionFatalities: 60,
    constructionPctTotal: 24.0,
    transportWarehouseFatalities: 27,
    truckTransportFatalities: 11,
    fallsSlipsTrips: 54,
    transportationIncidents: 62,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 5-year estimates.
  commuteStats: {
    driveAlone: 55.0,
    nationalAvg: 68.7,
    avgCommuteMinutes: 33.0,
  },

  competitiveData: newYorkCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in New York — combining NYSDOT crash data, demographics, judicial profiles, and market opportunity signals across New York City, Buffalo, Rochester, Albany, and Syracuse. Population ~20M.",

    legalLandscape:
      "New York uses pure comparative negligence — plaintiffs can recover even if they are 99% at fault, with recovery reduced proportionally by their share of fault. The general personal injury statute of limitations is three years from the date of injury (CPLR § 214). New York imposes no caps on non-economic damages and generally no caps on punitive damages. New York City venues — particularly the Bronx and Brooklyn — are among the highest-verdict plaintiff jurisdictions in the country. New York's Scaffold Law (Labor Law § 240) imposes absolute liability on owners and contractors for gravity-related construction injuries, making NYC construction cases a distinct high-value category.",

    autoAudience:
      "New York's drive-alone commuting rate (55.0%) is well below the national average (68.7%), driven by heavy transit use in New York City. However, upstate markets — Buffalo (Erie County), Rochester (Monroe), Albany (Albany/Rensselaer), and Syracuse (Onondaga) — follow typical vehicle-dependent patterns with high per-capita crash exposure. NYC accounts for approximately 73% of the state's urban fatalities; I-90 (Thruway), I-87, and I-81 are the key upstate crash corridors.",

    truckAudience:
      "New York is a major freight gateway — the Port of New York/New Jersey, I-87 (Thruway), and I-90 carry substantial truck volume. The Buffalo–Niagara border crossing is the busiest U.S.–Canada commercial crossing by truck. Rural upstate corridors along I-81 and Route 17/I-86 see concentrated truck-crash exposure. NYC construction site logistics also generate significant commercial-vehicle incident volume.",

    motorcycleAudience:
      "New York recorded 120 motorcycle fatalities in 2023. The state has a universal helmet law — all riders must wear helmets regardless of age or experience. The Catskills, Adirondacks, and Hudson Valley draw significant riding traffic, including out-of-state riders unfamiliar with New York courts. Summer and fall peak seasons concentrate exposure.",

    constructionAudience:
      "New York City is one of the largest construction markets in the world. The Scaffold Law (Labor Law § 240) creates absolute liability for gravity-related construction injuries on NYC job sites, making construction PI a distinct, high-value category. Upstate construction growth in Buffalo and Albany adds secondary volume. Workers and families of injured workers — especially non-union or subcontractor laborers — are the primary target.",

    ruralUrbanContext:
      "New York's rural fatalities (~304 in 2023, ≈28% of total) are concentrated upstate — the Southern Tier, North Country, and western NY. Urban fatalities (~800) are concentrated in New York City. Rural upstate areas have lower internet penetration, making digital-only advertising insufficient for plaintiff firms targeting non-metro markets. Local radio and community media are essential in those regions.",

    judicialContext:
      "Venue selection in New York is critically important. The Bronx and Kings (Brooklyn) counties have produced the highest average verdicts in the state. Manhattan (New York County) and Queens are also strong plaintiff venues. Nassau and Suffolk (Long Island) are moderate. Upstate counties — Erie (Buffalo), Monroe (Rochester), Albany — are more variable. For maximum case value, NYC venue is a strategic priority wherever plaintiff residency or crash location permits it.",

    marketSaturationTitle: "NYC Saturation vs. Upstate Opportunity",
    marketSaturationTip:
      "New York City — especially the outer boroughs — has the highest PI advertiser density in the state. National firms compete aggressively on digital and broadcast. Buffalo, Rochester, Albany, and Syracuse are materially less saturated with comparable case economies on a cost-per-case basis. Upstate markets also benefit from simpler media mixes (fewer platforms, lower CPMs) relative to the NYC DMA.",

    freightCorridorTitle: "Thruway / I-87 Freight Corridor",
    freightCorridorTip:
      "The I-90 (New York Thruway) between New York City and Buffalo, and I-87 (Northway) from NYC to the Canadian border, carry heavy freight volume. The Buffalo–Niagara crossing is the busiest U.S.–Canada commercial truck crossing. Trucking PI cases on these routes often involve out-of-state or Canadian carriers, which can affect jurisdiction and carrier insurance structure.",

    solUrgencyTitle: "3-Year SOL + NYC Venue Urgency",
    solUrgencyTip:
      "New York's 3-year statute of limitations is relatively generous, but early venue analysis is the real urgency driver. Cases that can be filed in the Bronx or Brooklyn — the state's highest-verdict venues — produce dramatically different outcomes than the same case filed upstate. Fast intake and early plaintiff-address verification let firms capture the maximum venue advantage before the client shops elsewhere.",

    internetAccessTitle: "Upstate NY Connectivity Gap",
    internetAccessTip:
      "Rural upstate New York — the North Country, Southern Tier, and parts of western NY — has lower broadband penetration and higher uninsured populations. These areas have elevated per-capita fatality rates. Digital-only advertising reaches a fraction of these communities. Local radio, outdoor, and community partnerships are necessary for plaintiff firms targeting non-metro upstate markets.",

    outOfStateTitle: "Catskills / Adirondacks Tourism Opportunity",
    outOfStateTip:
      "The Catskills, Adirondacks, Hudson Valley, and Finger Lakes draw significant out-of-state visitors and riders year-round. Out-of-state visitors injured in New York may not know local attorneys or New York's pure comparative negligence system. Geo-fenced digital along popular tourism routes, combined with partnerships with ski resorts, marinas, and lodges, can capture cases that would otherwise go to out-of-state referrals.",

    footerSourcesLabel:
      "NYSDOT / ITSMR — New York State Traffic Safety Statistical Repository 2023",
  },

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
