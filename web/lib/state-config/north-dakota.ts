import { northDakotaCompetitiveData } from "@/lib/data/competitive-landscape/north-dakota";
import type { StateConfig } from "./_types";

export const northDakotaConfig: StateConfig = {
  slug: "north-dakota",
  stateCode: "ND",
  stateName: "North Dakota",

  metadata: {
    title: "North Dakota State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in North Dakota — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across the Fargo, Minot-Bismarck-Dickinson, and Grand Forks markets.",
  },

  // Source: FARS 2024 Annual Report File. Motorcycle and speed-related fatality
  // counts are not broken out in the data we were handed — left null rather than
  // researched or back-derived. totalCrashes / unrestrained / distracted fatal
  // crashes are not in the FARS fatality summary we were given — set to 0.
  trafficStats: {
    totalCrashes: 0,
    totalFatalities: 90,
    motorcycleFatalities: null,
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 28,
    alcoholRelatedPct: 31.1,
    unrestrainedFatalities: 0,
    distractedDrivingFatalCrashes: 0,
    urbanFatalities: 17,
    ruralFatalities: 73,
    reportYear: 2024,
    sourceLabel: "FARS 2024 Annual Report File",
  },

  // Source: BLS Census of Fatal Occupational Injuries — North Dakota 2023
  // (bls.gov/iif/state-data/fatal-occupational-injuries-in-north-dakota-2023.htm,
  // verified via Wayback snapshot 2026-05-16). Total (26), transportation
  // incidents (12), and falls/slips/trips (6) are published. Construction
  // industry detail is suppressed (blank cell — does not meet publication
  // criteria), so constructionFatalities / constructionPctTotal are 0.
  // Transportation and warehousing industry = 5; truck-transport subindustry is
  // not separately broken out (null). Employment denominators are not published
  // in this state table and are not invented here (0).
  workplaceStats: {
    totalEmployment: 0,
    qcewCoveredEmployment: 0,
    totalWorkplaceFatalities: 26,
    constructionFatalities: 0,
    constructionPctTotal: 0,
    transportWarehouseFatalities: 5,
    truckTransportFatalities: null,
    fallsSlipsTrips: 6,
    transportationIncidents: 12,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 2024 1-year estimates (B08006, B08013, B08303).
  // driveAlone = B08006003 / B08006001 = 324,171 / 422,457 = 76.7%.
  // avgCommuteMinutes = B08013001 / B08303001 = 6,857,485 / 392,504 = 17.5 min.
  commuteStats: {
    driveAlone: 76.7,
    nationalAvg: 68.7,
    avgCommuteMinutes: 17.5,
  },

  competitiveData: northDakotaCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in North Dakota — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across Fargo, the Minot-Bismarck-Dickinson corridor, and Grand Forks. Population ~800K across three media markets.",

    legalLandscape:
      "North Dakota applies modified comparative negligence under a 50% bar: a plaintiff is barred from recovery if their fault is as great as the combined fault of all defendants against whom recovery is sought (N.D.C.C. § 32-03.2-02). A plaintiff at exactly 50% (equal to the defendants' combined share) recovers nothing; below that threshold, damages are reduced by the plaintiff's percentage of fault. The personal injury statute of limitations is notably long at six years from the date of injury (N.D.C.C. § 28-01-16), one of the longer PI windows in the country and a meaningful difference for intake timing and case workup. North Dakota is also a no-fault automobile state: drivers carry personal injury protection (PIP / basic no-fault) coverage, and a claimant must clear a roughly $2,500 medical-expense threshold (or meet a serious-injury definition) before pursuing noneconomic damages against an at-fault driver (N.D.C.C. ch. 26.1-41). Helmets are required for motorcycle riders under age 18.",

    autoAudience:
      "North Dakota's traffic exposure is dominated by long-distance highway driving. Interstate 94 runs east-to-west across the southern tier through Fargo, Bismarck, and Dickinson; Interstate 29 runs north-to-south along the eastern edge through Fargo and Grand Forks; and U.S. 2 carries the northern corridor through Minot and Grand Forks. Drive-alone commuting is high at 76.7% (national average 68.7%), but the average commute is short at 17.5 minutes — exposure concentrates on rural intercity highway segments and oil-field haul routes, not congested urban arteries. The Fargo metro (Cass County) is the largest single case-volume market, with Bismarck (Burleigh County) and Grand Forks (Grand Forks County) as the secondary centers.",

    truckAudience:
      "Commercial-vehicle exposure is a defining feature of North Dakota. The Bakken oil patch in the west (Williston, Dickinson, and the surrounding Williams, McKenzie, and Stark county region) generates heavy truck traffic — crude haulers, frac-sand and water trucks, and rig-service fleets — on two-lane state highways and county roads that were not built for that volume. I-94 is the primary east-west freight artery feeding that activity, and U.S. 85 is the main north-south oil-patch corridor. The no-fault threshold (N.D.C.C. ch. 26.1-41) is cleared readily in serious truck collisions, and the long six-year SOL gives time to develop carrier, employer, and equipment-failure theories. Out-of-state and interstate carriers with multi-state insurance structures are common defendants in western North Dakota cases.",

    motorcycleAudience:
      "Motorcycle fatality counts are not separately broken out in the FARS 2024 figures we hold for North Dakota, so no count is shown. North Dakota requires helmets only for riders under age 18 (N.D.C.C. § 39-10.2-06); adult riders may legally ride without one, which tends to increase head-injury severity in crashes. Recreational riding concentrates on the Badlands and the Theodore Roosevelt National Park area in the west and on the lake routes in the central and eastern parts of the state, drawing seasonal out-of-state riders. The six-year SOL is generous, but early intake still matters because helmet-use and comparative-fault questions (under the 50% bar) shape case value from the outset.",

    constructionAudience:
      "Construction and extraction activity is heavily tied to the Bakken energy economy and to public infrastructure in the growing Fargo and Bismarck metros. BLS did not publish a separate construction-industry fatality count for North Dakota in 2023 (the cell is suppressed under publication criteria), so no construction-specific figure is shown here; the state recorded 26 total workplace fatalities, with 12 from transportation incidents and 5 in the transportation-and-warehousing industry. Third-party liability — non-employer contractors, equipment manufacturers, and oil-field service companies at fault — is the primary recovery path where workers' compensation (administered by North Dakota's monopolistic state fund, WSI) limits direct claims against the employer.",

    ruralUrbanContext:
      "North Dakota's fatalities are overwhelmingly rural: 73 of 90 traffic deaths in 2024 occurred on rural roads, versus 17 in urban areas (FARS 2024). That 81% rural share is among the highest in the nation and reflects the state's low population density, long intercity distances, and oil-field haul traffic. Rural counties — particularly the western oil patch and the agricultural north-central tier — have lower broadband penetration, so digital-only campaigns underreach the very areas generating the most severe cases. Radio, outdoor along I-94 / I-29 / U.S. 85, and community and agricultural media are essential complements for plaintiff firms targeting non-metro North Dakota.",

    judicialContext:
      "North Dakota is a single, statewide court system with district courts grouped into judicial districts; there is no metro venue with an outlier-verdict reputation comparable to large coastal jurisdictions. Jury awards tend to be conservative and grounded in actual economic loss, consistent with the state's rural, agricultural, and energy-sector character. Venue generally follows the county of the crash or the defendant's residence, and the 50% comparative-fault bar (N.D.C.C. § 32-03.2-02) makes liability apportionment a central driver of expected value. The long six-year SOL (N.D.C.C. § 28-01-16) gives firms unusual latitude to build damages and liability before filing.",

    marketSaturationTitle: "Fargo vs. the Bismarck & Grand Forks Markets",
    marketSaturationTip:
      "North Dakota is a three-market state for media planning: Fargo (the largest, shared with western Minnesota), Minot-Bismarck-Dickinson (a combined central-and-western market), and Grand Forks (the smallest, also shared with northwestern Minnesota). PI advertiser concentration is lowest in the country here — most national PI brands do not buy North Dakota media directly, which leaves cost-per-case economics favorable for in-state and regional firms. Fargo carries the most case volume; the Minot-Bismarck-Dickinson market is where Bakken commercial-vehicle and energy-sector cases originate and is materially under-advertised relative to its severity profile.",

    freightCorridorTitle: "Bakken Oil-Patch & I-94 Freight Corridors",
    freightCorridorTip:
      "The Bakken play in western North Dakota puts an unusually high density of heavy commercial trucks — crude, water, frac-sand, and rig-service vehicles — onto rural two-lane highways and U.S. 85, far from the metro courts. I-94 is the primary east-west freight artery linking that activity to Fargo and the interstate network. Truck PI cases on these corridors frequently involve interstate carriers and oil-field service companies with multi-state insurance structures, complex employer-versus-contractor liability, and equipment-failure theories that the six-year SOL gives ample time to develop.",

    solUrgencyTitle: "6-Year PI SOL — One of the Longest in the Country",
    solUrgencyTip:
      "North Dakota's six-year personal injury statute of limitations (N.D.C.C. § 28-01-16) is far longer than the two- and three-year windows common in most states. That latitude is a competitive advantage for thorough case workup, but it does not eliminate intake urgency: evidence at rural crash and oil-field sites degrades quickly, witnesses move, and the no-fault medical-expense threshold (N.D.C.C. ch. 26.1-41) must be documented early to support a noneconomic-damages claim. Claims against governmental entities can carry shorter notice requirements, so confirm the defendant profile before relying on the six-year window.",

    internetAccessTitle: "Western Oil Patch & North-Central Connectivity Gap",
    internetAccessTip:
      "North Dakota's western oil-patch counties (Williams, McKenzie, Dunn, Mountrail) and the sparsely populated north-central tier have lower broadband penetration and transient, energy-sector populations. These are exactly the areas with the highest commercial-vehicle and rural-highway exposure. Digital-only campaigns underreach them. Local radio, outdoor on U.S. 85 and I-94, and partnerships with energy-sector and agricultural community channels are necessary to capture cases outside the Fargo, Bismarck, and Grand Forks metros.",

    outOfStateTitle: "Energy-Sector & Cross-Border Workforce Opportunity",
    outOfStateTip:
      "North Dakota's Bakken workforce includes substantial out-of-state and transient labor, and the Fargo and Grand Forks markets straddle the Minnesota border. Out-of-state workers and drivers injured in North Dakota may not know local PI attorneys, the state's no-fault rules, or its long six-year SOL. Geo-fenced digital around oil-field hubs (Williston, Dickinson) and along the I-29 / I-94 border corridors, combined with energy-sector and trucking-industry channels, can capture these cases before injured workers engage counsel back in their home states.",

    footerSourcesLabel:
      "FARS 2024 Annual Report File · BLS Census of Fatal Occupational Injuries (North Dakota, 2023) · U.S. Census ACS 2024 1-year estimates",
  },

  // North Dakota is high-rural with a strong commercial-vehicle (Bakken) signal;
  // workplace section is shown because the BLS 2023 total and event breakdowns
  // are published and verified (construction industry detail is suppressed).
  features: {
    showWorkplaceSection: true,
  },

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
