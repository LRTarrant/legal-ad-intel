import { iowaCompetitiveData } from "@/lib/data/competitive-landscape/iowa";
import type { StateConfig } from "./_types";

export const iowaConfig: StateConfig = {
  slug: "iowa",
  stateCode: "IA",
  stateName: "Iowa",

  metadata: {
    title: "Iowa State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Iowa — combining FARS crash data, BLS workplace-fatality data, Census commute demographics, and market opportunity signals across Des Moines, Cedar Rapids, the Quad Cities, and Sioux City.",
  },

  // Source: FARS 2024 Annual Report File. Iowa does not publish a state-DOT crash
  // volume / motorcycle / speed breakout we can cite at this vintage, so those
  // non-fatality fields are zeroed or nulled per the type contract.
  trafficStats: {
    totalCrashes: 0, // no citable 2024 statewide crash total at this vintage
    totalFatalities: 356,
    motorcycleFatalities: null, // not separately broken out in the FARS ARF
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 78,
    alcoholRelatedPct: 21.9, // 78 / 356, FARS 2024 ARF (BAC>=0.08)
    unrestrainedFatalities: 0, // not separately broken out in the FARS ARF
    distractedDrivingFatalCrashes: 0, // not separately broken out in the FARS ARF
    urbanFatalities: 127,
    ruralFatalities: 229,
    reportYear: 2024,
    sourceLabel: "FARS 2024 Annual Report File",
  },

  // Source: BLS Census of Fatal Occupational Injuries — Iowa 2023
  // (released 2025-03-27). Iowa's 2023 release reports the statewide total (91),
  // transportation incidents (42, 46% of total), and falls/slips/trips (19, 21%).
  // The release does not publish a citable construction-sector or
  // transportation-and-warehousing-sector fatality count for 2023, so those
  // industry-sector fields are zeroed (and truckTransport is nulled) rather than
  // invented. The total and event-type fields below are verified BLS figures.
  workplaceStats: {
    totalEmployment: 0, // employment base not pulled from a citable source for this block
    qcewCoveredEmployment: 0,
    totalWorkplaceFatalities: 91,
    constructionFatalities: 0, // not separately published in BLS CFOI 2023 Iowa release
    constructionPctTotal: 0,
    transportWarehouseFatalities: 0, // industry-sector breakout not published for 2023 Iowa
    truckTransportFatalities: null, // not broken out in BLS CFOI 2023 IA tables
    fallsSlipsTrips: 19,
    transportationIncidents: 42,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 2024 1-year estimates (via Census Reporter).
  // driveAlone = B08006 drove-alone (1,263,253) / total workers (1,649,748) = 76.6%.
  // avgCommuteMinutes = B08013 aggregate travel time (30,301,924) / B08303 commuters (1,486,971) = 20.4.
  commuteStats: {
    driveAlone: 76.6,
    nationalAvg: 68.7,
    avgCommuteMinutes: 20.4,
  },

  competitiveData: iowaCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Iowa — combining FARS crash data, BLS workplace-fatality data, demographics, and market opportunity signals across Des Moines, Cedar Rapids, the Quad Cities, and Sioux City. Population ~3.2M.",

    legalLandscape:
      "Iowa is an at-fault (tort) state that uses modified comparative negligence with a 51% bar: a plaintiff who is 51% or more at fault is barred from recovery, while a plaintiff at 50% or less recovers with damages reduced by their share of fault (Iowa Code § 668.3). The personal injury statute of limitations is two years from the date of injury (Iowa Code § 614.1(2)). Iowa imposes no statutory cap on non-economic damages in standard personal injury cases, but a 2023 reform (House File 161, codified at Iowa Code § 147.136A, effective February 16, 2023) capped non-economic damages in medical-malpractice actions at $1 million against individual providers and clinics and $2 million against hospitals (with a pre-existing $250,000 cap for non-permanent, non-fatal injuries and an exception for actual malice). Polk County (Des Moines) and Linn County (Cedar Rapids) are the state's primary litigation centers.",

    autoAudience:
      "Iowa's major crash corridors run along I-80 (the primary east-west freight artery, crossing the state from the Quad Cities through Des Moines to the Council Bluffs / Omaha area), I-35 (the north-south route through Des Moines connecting Minnesota to Missouri), and I-380 (the Cedar Rapids–Iowa City–Waterloo corridor). Drive-alone commuting (76.6%) runs well above the national average (68.7%), concentrating vehicle exposure across the Des Moines and Cedar Rapids metros. The Des Moines-Ames market drives the largest share of case volume, followed by the Cedar Rapids-Iowa City-Waterloo-Dubuque corridor and the Quad Cities.",

    truckAudience:
      "Iowa is a high-volume interstate freight state anchored by I-80, one of the nation's busiest coast-to-coast truck routes, which bisects the state east to west. I-35 carries north-south freight between the Twin Cities and Kansas City through Des Moines, and the two interstates' interchange at Des Moines is a major distribution node. Agricultural and food-processing logistics add heavy seasonal commercial-vehicle traffic on rural state and county routes. Trucking cases on these corridors frequently involve interstate carriers with multi-state insurance structures and venue questions spanning the Iowa–Illinois (Quad Cities) and Iowa–Nebraska (Council Bluffs/Omaha) lines.",

    motorcycleAudience:
      "Iowa is one of the few U.S. states with no motorcycle helmet law for any rider — helmets are not required at any age (there is no universal or partial mandate). That regulatory posture raises the severity of motorcycle-crash injuries relative to mandatory-helmet states and makes early intake on motorcycle cases especially valuable. Iowa's rural two-lane highways and seasonal ride routes attract recreational riders, including out-of-state visitors. FARS 2024 Annual Report File does not break out a citable Iowa motorcycle-fatality count at this vintage, but the absence of a helmet requirement is the defining marketing and case-value signal for this segment.",

    constructionAudience:
      "Des Moines anchors a steady commercial- and infrastructure-construction market, with additional activity around Cedar Rapids, Iowa City, and the Quad Cities. Workplace fatalities in Iowa totaled 91 in 2023 (BLS CFOI), with transportation incidents (42) and falls, slips, and trips (19) the leading event types. Third-party liability — a non-employer at fault in a crane, scaffold, equipment, or roadway-work-zone incident — is the primary recovery path where workers' compensation limits direct claims against the employer. The BLS 2023 Iowa release does not publish a separate construction-sector fatality count, so that figure is intentionally not shown.",

    ruralUrbanContext:
      "Iowa's traffic deaths are overwhelmingly rural: FARS 2024 Annual Report File records 229 rural fatalities against 127 urban (out of 356 total). High-speed two-lane state and county roads, longer EMS response times, and agricultural-equipment traffic drive rural crash severity. Rural Iowa counties also have lower broadband penetration, so digital-only campaigns underreach them. Local radio, outdoor advertising along I-80 and U.S. highways, and community media are necessary complements for plaintiff firms targeting non-metro Iowa.",

    judicialContext:
      "Polk County (Des Moines) and Linn County (Cedar Rapids) are Iowa's primary trial venues and produce the bulk of the state's higher PI verdicts. Scott County (Davenport, in the Quad Cities) and Johnson County (Iowa City) are secondary venues. Iowa juries are generally regarded as moderate relative to the largest plaintiff-favorable metros nationally, which makes venue selection — plaintiff residency, crash location, and corporate-defendant principal place of business — a meaningful driver of expected case value.",

    marketSaturationTitle: "Des Moines vs. Secondary Iowa Markets",
    marketSaturationTip:
      "Des Moines-Ames is Iowa's largest metro and attracts the highest PI advertiser concentration in the state. The Cedar Rapids-Iowa City-Waterloo-Dubuque corridor is the second-largest market with lower ad saturation and a sizable manufacturing and university-adjacent population. The Quad Cities (Davenport, shared with Illinois) and Sioux City offer mid-market opportunities with favorable cost-per-case economics. Note that southwest Iowa falls within the Omaha (NE) DMA, so firms targeting Council Bluffs and the western counties buy media through Omaha, not an in-state market.",

    freightCorridorTitle: "I-80 / I-35 / I-380 Freight Corridors",
    freightCorridorTip:
      "I-80 is one of the highest-volume long-haul truck routes in the country and runs the full width of Iowa, from the Quad Cities through Des Moines to Council Bluffs and the Omaha freight network. I-35 carries Twin Cities-to-Kansas City freight north-south through Des Moines, and I-380 links Cedar Rapids, Iowa City, and Waterloo. Truck-crash cases on these corridors commonly involve out-of-state carriers and multi-state insurance and venue issues, including the Iowa–Illinois and Iowa–Nebraska borders.",

    solUrgencyTitle: "2-Year SOL — Move Fast on Intake",
    solUrgencyTip:
      "Iowa's two-year personal injury statute of limitations (Iowa Code § 614.1(2)) is on the shorter end nationally. Claims against governmental entities (the state, counties, or municipalities) carry separate notice and timing requirements that can be shorter still. Fast intake, early evidence preservation, and prompt engagement with treating providers are critical to protect both the case and the client relationship before the SOL becomes a bar.",

    internetAccessTitle: "Rural Iowa Connectivity Gap",
    internetAccessTip:
      "Iowa's rural counties — which absorb the majority of the state's traffic fatalities (229 rural vs. 127 urban in FARS 2024) — have lower broadband penetration than the Des Moines and Cedar Rapids metros. Digital-only campaigns underreach these high-severity crash markets. Local radio, outdoor advertising along I-80 and U.S. highway corridors, and community partnerships are necessary channels for plaintiff firms seeking cases outside Iowa's metros.",

    outOfStateTitle: "No Helmet Law + I-80 Through-Traffic Opportunity",
    outOfStateTip:
      "Iowa's lack of any motorcycle helmet law, combined with I-80's heavy cross-country through-traffic, means many seriously injured riders and motorists on Iowa roads are out-of-state visitors who do not know local PI attorneys or Iowa's two-year SOL. Geo-fenced digital along the I-80 and I-35 corridors, paired with messaging on Iowa's at-fault rules and short filing window, can capture these cases before injured out-of-state parties engage counsel back home.",

    footerSourcesLabel:
      "FARS 2024 Annual Report File; BLS Census of Fatal Occupational Injuries — Iowa 2023; U.S. Census ACS 2024 1-year estimates",
  },

  // Iowa's 2023 BLS release publishes the statewide total and event-type counts
  // but not a construction or transportation/warehousing industry-sector
  // breakout; the section still renders on the verified total + event types.
  features: {
    showWorkplaceSection: true,
  },

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
