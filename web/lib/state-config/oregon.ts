import { oregonCompetitiveData } from "@/lib/data/competitive-landscape/oregon";
import type { StateConfig } from "./_types";

export const oregonConfig: StateConfig = {
  slug: "oregon",
  stateCode: "OR",
  stateName: "Oregon",

  metadata: {
    title: "Oregon State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Oregon — combining FARS crash and fatality data, demographics, judicial profiles, and market opportunity signals across Portland, Eugene, Medford-Klamath Falls, and Bend.",
  },

  // Source: NHTSA FARS 2024 Annual Report File. Fatality counts only; FARS does not
  // publish motorcycle or speed-related splits in the release and we
  // have no citable Oregon DOT 2024 figure for those, so they stay null.
  // totalCrashes / unrestrainedFatalities / distractedDrivingFatalCrashes are
  // non-nullable and have no citable 2024 source here, so they are set to 0.
  trafficStats: {
    totalCrashes: 0,
    totalFatalities: 538,
    motorcycleFatalities: null,
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 157,
    alcoholRelatedPct: 29.2,
    unrestrainedFatalities: 0,
    distractedDrivingFatalCrashes: 0,
    urbanFatalities: 247,
    ruralFatalities: 291,
    reportYear: 2024,
    sourceLabel: "FARS 2024 Annual Report File",
  },

  // Source: BLS Census of Fatal Occupational Injuries — Oregon 2023 reported a
  // total of 54 fatal work injuries (transportation incidents 29, the leading
  // event). The industry sub-breakdown (construction, transportation/warehousing)
  // and the falls/slips/trips event count are not published / suppressed in the
  // small-state CFOI tables and could not be verified, so the block is zeroed and
  // the workplace section is hidden (features.showWorkplaceSection: false) per the
  // accuracy-over-completeness rule rather than inventing the missing fields.
  workplaceStats: {
    totalEmployment: 0,
    qcewCoveredEmployment: 0,
    totalWorkplaceFatalities: 0,
    constructionFatalities: 0,
    constructionPctTotal: 0,
    transportWarehouseFatalities: 0,
    truckTransportFatalities: null,
    fallsSlipsTrips: 0,
    transportationIncidents: 0,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 2024 1-year (via Census Reporter). driveAlone from
  // B08006 (1,356,937 drove alone / 2,080,165 workers 16+ = 65.2%);
  // avgCommuteMinutes from B08013 aggregate (40,038,940 min) / B08303 commuters
  // (1,725,235) = 23.2 min. nationalAvg is the standard 68.7 reference.
  commuteStats: {
    driveAlone: 65.2,
    nationalAvg: 68.7,
    avgCommuteMinutes: 23.2,
  },

  competitiveData: oregonCompetitiveData,

  features: {
    // Workplace block could not be fully verified for Oregon CFOI 2023 — hide it.
    showWorkplaceSection: false,
  },

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Oregon — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across Portland, Eugene, Medford-Klamath Falls, and Bend. The Portland metro dominates the state's population and case volume, and the Portland DMA extends across the Columbia River to cover southwest Washington. Population ~4.3M.",

    legalLandscape:
      "Oregon applies modified comparative negligence with a 51% bar: a plaintiff who is 51% or more at fault recovers nothing, while a plaintiff who is 50% or less at fault recovers damages reduced by their share of fault (ORS 31.600). The personal injury statute of limitations is two years from the date of injury (ORS 12.110). Oregon is a tort / at-fault state, but it mandates first-party personal injury protection (PIP) medical benefits on every auto policy, so initial medical and wage-loss expenses are paid by the injured party's own insurer before any third-party recovery (ORS 742.520). There is no general statutory cap on noneconomic damages in standard personal injury cases — the Oregon Supreme Court held the $500,000 cap (ORS 31.710) unconstitutional as applied to ordinary PI claims in Busch v. McInnis Waste Systems (2020); the cap survives only for wrongful-death claims and claims against public bodies under the sovereign-immunity quid pro quo recognized in Horton v. OHSU (2016). Multnomah County (Portland) is the state's dominant litigation venue.",

    autoAudience:
      "Oregon's crash exposure concentrates along I-5, the spine that runs north-to-south through Portland, Salem, Eugene, and Medford and carries the bulk of the state's population and traffic, and I-84, which runs east from Portland through the Columbia River Gorge toward eastern Oregon and Idaho. Drive-alone commuting (65.2%) runs slightly below the national average (68.7%), reflecting Portland's relatively strong transit use, but the suburban rings around Portland (Washington, Clackamas, and Multnomah counties) still drive the largest share of auto case volume. Eugene (Lane County), Medford (Jackson County), and Bend (Deschutes County) are the secondary volume markets.",

    truckAudience:
      "Oregon is a major West Coast freight corridor. I-5 links the ports and distribution hubs of California, Oregon, and Washington and carries continuous interstate trucking through the Willamette Valley. I-84 is the primary east-west freight route connecting Portland to the inland Northwest and the I-80/I-15 network beyond Idaho. The Port of Portland and Willamette Valley distribution infrastructure generate heavy commercial-vehicle volume. Trucking PI cases on I-5 and I-84 frequently involve interstate carriers with multi-state insurance structures and venue questions across the Oregon–Washington and Oregon–Idaho lines.",

    motorcycleAudience:
      "Oregon has a universal motorcycle helmet law: every operator and passenger must wear an approved helmet regardless of age or experience (ORS 814.269). The Cascade scenic routes, the Columbia River Gorge along I-84, and the coastal Highway 101 corridor draw recreational riders, including out-of-state visitors from Washington and California. The FARS 2024 release does not break out Oregon motorcycle fatalities, so that count is shown as not reported. The 2-year SOL (ORS 12.110) makes early intake critical for motorcycle cases.",

    ruralUrbanContext:
      "Oregon's 2024 fatalities split 291 rural to 247 urban (FARS) — rural roads account for the majority of traffic deaths despite holding a minority of the population. Eastern and southern Oregon, including the high desert around Bend, the Klamath Basin, and the long rural stretches of I-84, carry disproportionate fatal-crash exposure relative to their population. These non-metro markets also have lower broadband penetration, so digital-only campaigns underperform there; radio, outdoor, and community media are necessary complements for plaintiff firms targeting rural Oregon.",

    judicialContext:
      "Multnomah County (Portland) is Oregon's dominant and most plaintiff-favorable venue, consistently producing the state's highest auto and premises verdicts. Lane County (Eugene) and the Willamette Valley counties are moderate-to-favorable. Jackson County (Medford) and Deschutes County (Bend) are smaller, more conservative benches. Venue analysis — plaintiff residency and crash location — can materially shift expected case value across Oregon's metros.",

    marketSaturationTitle: "Portland vs. Secondary Oregon Markets",
    marketSaturationTip:
      "The Portland metro (Multnomah, Washington, and Clackamas counties) attracts the highest PI advertiser concentration in Oregon, and the Portland DMA reach extends across the Columbia River into southwest Washington (Vancouver / Clark County), so Portland buys serve a two-state audience. Eugene (Lane County), Medford-Klamath Falls (Jackson/Klamath), and Bend (Deschutes County) carry materially lower ad saturation and more favorable cost-per-case economics for firms willing to build presence outside the Portland metro.",

    freightCorridorTitle: "I-5 & I-84 Freight Corridors",
    freightCorridorTip:
      "I-5 is the primary West Coast freight artery through Oregon, connecting California and Washington distribution networks through the Willamette Valley. I-84 carries east-west freight from the Port of Portland through the Columbia River Gorge to the inland Northwest and Idaho. Trucking PI cases on these corridors often involve interstate carriers and cross-border venue questions along the Oregon–Washington and Oregon–Idaho lines.",

    solUrgencyTitle: "2-Year SOL & Mandatory PIP",
    solUrgencyTip:
      "Oregon's personal injury statute of limitations is two years from the date of injury (ORS 12.110). Because Oregon mandates first-party PIP medical benefits (ORS 742.520), injured clients often receive early medical coverage from their own insurer, which can delay their search for counsel — making proactive intake and early case evaluation important before the 2-year window closes. Claims against public bodies (e.g., transit districts or ODOT) carry separate tort-claim notice requirements with shorter deadlines.",

    internetAccessTitle: "Eastern & Southern Oregon Connectivity Gap",
    internetAccessTip:
      "Rural eastern and southern Oregon — the high desert around Bend, the Klamath Basin, and the I-84 corridor counties — have lower broadband penetration than the Portland metro. These areas see disproportionate truck- and rural-crash exposure. Digital-only campaigns underreach them; local radio, outdoor advertising, and community partnerships are necessary channels for plaintiff firms pursuing cases outside the Willamette Valley.",

    outOfStateTitle: "Coast, Gorge & Cascades Tourism Opportunity",
    outOfStateTip:
      "The Oregon Coast (Highway 101), the Columbia River Gorge (I-84), and the Cascades draw significant out-of-state visitors and riders from Washington and California. Visitors injured in Oregon may not know local PI attorneys or Oregon's 2-year SOL and mandatory-PIP framework. Geo-fenced digital along the coastal and Gorge corridors, paired with partnerships near resort and recreation areas, can capture these cases before visitors engage out-of-state counsel.",

    footerSourcesLabel:
      "NHTSA FARS 2024 Annual Report File; U.S. Census ACS 2024 1-year; BLS CFOI 2023",
  },

  // No injuryData yet; add when Oregon-specific deep crash data is integrated.
};
