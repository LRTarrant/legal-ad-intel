import { southDakotaCompetitiveData } from "@/lib/data/competitive-landscape/south-dakota";
import type { StateConfig } from "./_types";

export const southDakotaConfig: StateConfig = {
  slug: "south-dakota",
  stateCode: "SD",
  stateName: "South Dakota",

  metadata: {
    title: "South Dakota State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in South Dakota — combining FARS crash data, demographics, and market opportunity signals across the Sioux Falls and Rapid City media markets.",
  },

  // Source: FARS 2024 Annual Report File. Rural/urban split is reported by
  // FARS; alcohol-related fatalities and share reported by FARS. Motorcycle,
  // speed-related, unrestrained, distracted-driving, and total-crash counts are
  // not available to us from a citable South Dakota source — left null/0 rather
  // than back-derived.
  trafficStats: {
    totalCrashes: 0,
    totalFatalities: 146,
    motorcycleFatalities: null,
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 56,
    alcoholRelatedPct: 38.4,
    unrestrainedFatalities: 0,
    distractedDrivingFatalCrashes: 0,
    urbanFatalities: 29,
    ruralFatalities: 117,
    reportYear: 2024,
    sourceLabel: "FARS 2024 Annual Report File",
  },

  // Source: BLS Census of Fatal Occupational Injuries — South Dakota 2023
  // (Midwest Information Office). Only the statewide total (20) is publicly
  // released; BLS suppresses the industry breakout (construction,
  // transportation/warehousing) for South Dakota due to its small worker count.
  // Per the accuracy-over-completeness rule we keep the verified total, zero the
  // unverifiable sub-fields, and hide the section (features.showWorkplaceSection
  // = false). The one event-type figure BLS does release is transportation
  // incidents (9, 45% of the state total).
  workplaceStats: {
    totalEmployment: 0,
    qcewCoveredEmployment: 0,
    totalWorkplaceFatalities: 20,
    constructionFatalities: 0,
    constructionPctTotal: 0,
    transportWarehouseFatalities: 0,
    truckTransportFatalities: null,
    fallsSlipsTrips: 0,
    transportationIncidents: 9,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 2024 1-year estimates (B08006, B08013, B08303).
  // driveAlone = 371,609 / 475,913 workers = 78.1%.
  // avgCommuteMinutes = 8,086,370 aggregate minutes / 437,656 commuters = 18.5.
  commuteStats: {
    driveAlone: 78.1,
    nationalAvg: 68.7,
    avgCommuteMinutes: 18.5,
  },

  competitiveData: southDakotaCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in South Dakota — combining FARS crash data, demographics, and market opportunity signals across the Sioux Falls and Rapid City media markets. Population ~924K, split between the eastern I-29 corridor and the western Black Hills.",

    legalLandscape:
      "South Dakota is one of the last states to use the idiosyncratic 'slight/gross' comparative negligence system rather than ordinary modified comparative negligence. Under SDCL 20-9-2, a plaintiff may recover only if their own negligence was 'slight' in comparison to the gross negligence of the defendant, and any recovery is then reduced in proportion to the plaintiff's share of fault. This is a materially stricter bar than the 50%/51% thresholds used in most states — a plaintiff whose fault is more than 'slight' (a question left to the jury, not a fixed percentage) recovers nothing — so careful fault and comparative-negligence analysis is decisive at intake. The personal injury statute of limitations is three years from the date of injury (SDCL 15-2-14). South Dakota is an at-fault (tort) state for auto claims. The two primary venues are Minnehaha County (Sioux Falls) in the east and Pennington County (Rapid City) in the west.",

    autoAudience:
      "South Dakota's crash exposure concentrates along I-29 (the eastern north-south corridor through Sioux Falls and Brookings), I-90 (the east-west route from Sioux Falls across the state to Rapid City and the Black Hills), and I-229 around Sioux Falls. Drive-alone commuting (78.1%) runs well above the national average (68.7%), and the average commute is short (18.5 minutes), reflecting a dispersed, car-dependent, largely rural population. Minnehaha County (Sioux Falls) is the largest case-volume market; Pennington County (Rapid City) anchors the western half of the state.",

    truckAudience:
      "Interstate 90 is South Dakota's principal long-haul freight artery, carrying cross-country truck traffic from Minnesota across the state to Wyoming and the Mountain West. I-29 links Sioux Falls into the Fargo–Sioux City–Omaha freight chain. Agricultural and livestock hauling adds heavy seasonal commercial-vehicle volume on US-83, US-281, and US-14. Trucking PI cases on these corridors frequently involve interstate carriers with multi-state insurance structures and out-of-state defendants.",

    motorcycleAudience:
      "South Dakota carries some of the highest seasonal motorcycle exposure of any state because of the Sturgis Motorcycle Rally, held each August in the Black Hills (Rapid City DMA), which draws hundreds of thousands of out-of-state riders for roughly ten days. South Dakota requires helmets only for riders under 18 — adult riders are not required to wear them — which raises injury severity in rally-season crashes. The three-year SOL (SDCL 15-2-14) gives more runway than many states, but rally-related cases involve out-of-state riders who return home quickly, so fast intake and clear out-of-state-claimant handling are critical.",

    constructionAudience:
      "Construction activity is concentrated in the growing Sioux Falls metro and around Rapid City. BLS does not publish a South Dakota construction-fatality breakout (the state's worker count is small enough that the industry detail is suppressed), so the workplace section is not surfaced for South Dakota. Where a non-employer third party is at fault — equipment manufacturers, subcontractors, or property owners — third-party liability remains the primary recovery path beyond workers' compensation.",

    ruralUrbanContext:
      "South Dakota is overwhelmingly a rural-fatality state: FARS 2024 attributes 117 of 146 traffic deaths (80%) to rural roads versus 29 urban. Long distances, higher rural travel speeds, delayed emergency response, and lower seat-belt use drive that imbalance. Much of the state outside Sioux Falls and Rapid City has limited broadband, so digital-only campaigns underreach the rural majority. Radio (including farm and ranch programming), outdoor along I-90 and I-29, and local community media are essential complements for plaintiff firms targeting non-metro South Dakota.",

    judicialContext:
      "South Dakota's two principal venues are Minnehaha County (Sioux Falls, Second Judicial Circuit) and Pennington County (Rapid City, Seventh Judicial Circuit). The state's conservative, rural jury pool and the demanding 'slight/gross' comparative rule (SDCL 20-9-2) tend to keep verdicts more moderate than in large urban venues. Venue and fault analysis — particularly establishing that the plaintiff's negligence was no more than 'slight' — carries unusual weight in setting realistic case value here.",

    marketSaturationTitle: "Sioux Falls vs. Rapid City — Two Markets, One State",
    marketSaturationTip:
      "South Dakota has only two media markets: Sioux Falls(-Mitchell), covering the populous eastern I-29 corridor, and Rapid City, covering the western Black Hills. Sioux Falls is the larger and faster-growing market and concentrates most PI advertiser activity. Rapid City is smaller and less saturated year-round but spikes hard around the August Sturgis rally. Splitting spend by season — steady Sioux Falls presence plus a Rapid City rally-window push — fits the state's two-market structure better than a single statewide buy.",

    freightCorridorTitle: "I-90 / I-29 Freight Corridors",
    freightCorridorTip:
      "I-90 is South Dakota's primary east-west long-haul truck route, running the full width of the state from Minnesota to Wyoming. I-29 connects Sioux Falls into the Fargo–Sioux City–Omaha freight network. Truck crashes on these interstates commonly involve interstate carriers and out-of-state drivers, which raises multi-state insurance and venue questions and rewards firms that can move quickly on evidence preservation.",

    solUrgencyTitle: "3-Year SOL — But Rally Cases Move Fast",
    solUrgencyTip:
      "South Dakota's personal injury statute of limitations is three years from the date of injury (SDCL 15-2-14), more generous than the two-year window in many neighboring states. The practical urgency comes less from the calendar and more from claimant mobility: Sturgis rally injuries involve out-of-state riders who leave the state within days, and claims against governmental entities can carry shorter notice requirements. Early intake protects evidence and the client relationship well before the three-year bar.",

    internetAccessTitle: "Rural Broadband Gap Outside the Two Metros",
    internetAccessTip:
      "Outside Sioux Falls and Rapid City, much of South Dakota — the central counties, the reservations, and the western ranching country — has limited broadband. Digital-only campaigns underreach the rural 80% of the state where most fatal crashes occur. Local and farm/ranch radio, outdoor on I-90 and I-29, and community partnerships are necessary channels to reach plaintiffs beyond the two metros.",

    outOfStateTitle: "Sturgis Rally — Out-of-State Rider Opportunity",
    outOfStateTip:
      "The Sturgis Motorcycle Rally each August brings hundreds of thousands of out-of-state riders into the Rapid City DMA and the Black Hills, with helmet-optional adult riding and a sharp spike in serious motorcycle crashes. Injured visitors rarely know South Dakota PI attorneys or the state's three-year SOL. Geo-fenced digital around Sturgis, Rapid City, and the Black Hills loop during the rally window, paired with rapid out-of-state-claimant intake, can capture these high-value seasonal cases before riders return home and engage out-of-state counsel.",

    footerSourcesLabel:
      "FARS 2024 Annual Report File; U.S. Census ACS 2024 1-year estimates; BLS CFOI 2023 (South Dakota)",
  },

  features: {
    // BLS suppresses South Dakota's CFOI industry breakout; only the statewide
    // total is verifiable, so the workplace section is hidden.
    showWorkplaceSection: false,
  },

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
