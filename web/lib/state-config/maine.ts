import { maineCompetitiveData } from "@/lib/data/competitive-landscape/maine";
import type { StateConfig } from "./_types";

export const maineConfig: StateConfig = {
  slug: "maine",
  stateCode: "ME",
  stateName: "Maine",

  metadata: {
    title: "Maine State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Maine — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across the Portland-Auburn, Bangor, and Presque Isle media markets.",
  },

  // Source: FARS 2024 Annual Report File (NHTSA). Maine reports motorcycle and
  // speed-related fatalities only through this federal source; both are null
  // here because no citable Maine state-DOT 2024 figure was confirmed.
  trafficStats: {
    totalCrashes: 0, // not citable from FARS 2024; left 0 per data rule
    totalFatalities: 177,
    motorcycleFatalities: null,
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 62,
    alcoholRelatedPct: 35,
    unrestrainedFatalities: 0, // not citable from FARS 2024; left 0 per data rule
    distractedDrivingFatalCrashes: 0, // not citable from FARS 2024; left 0 per data rule
    urbanFatalities: 34,
    ruralFatalities: 142,
    reportYear: 2024,
    sourceLabel: "FARS 2024 Annual Report File",
  },

  // Source: BLS Census of Fatal Occupational Injuries — Maine 2023.
  // Maine's CFOI is a small-state series: only the statewide total (27) is
  // published for 2023; the event-type and industry sub-categories are
  // suppressed (the Maine DOL CFOI report breaks out event/industry detail for
  // 2024 only, not 2023). Sub-fields are therefore zeroed and the workplace
  // section is hidden (features.showWorkplaceSection = false) rather than
  // fabricate a breakdown. Total verified via the Maine Department of Labor
  // mirror (maine.gov/labor "2024 Annual Census of Fatal Occupational
  // Injuries", Table 1).
  workplaceStats: {
    totalEmployment: 0,
    qcewCoveredEmployment: 0,
    totalWorkplaceFatalities: 27,
    constructionFatalities: 0,
    constructionPctTotal: 0,
    transportWarehouseFatalities: 0,
    truckTransportFatalities: null, // not broken out in BLS CFOI 2023 ME state tables
    fallsSlipsTrips: 0,
    transportationIncidents: 0,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 2024 1-year (via Census Reporter).
  // driveAlone = B08006003 / B08006001 = 497,706 / 702,479 = 70.9%.
  // avgCommuteMinutes = B08013001 / B08303001 = 15,320,260 / 599,409 = 25.6 min.
  commuteStats: {
    driveAlone: 70.9,
    nationalAvg: 68.7,
    avgCommuteMinutes: 25.6,
  },

  competitiveData: maineCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Maine — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across the Portland-Auburn, Bangor, and Presque Isle media markets. Population ~1.4M, the most rural state in the nation by share of population.",

    legalLandscape:
      "Maine follows a modified comparative negligence rule with an idiosyncratic formulation. Under Me. Rev. Stat. tit. 14 § 156, a plaintiff whose fault is equal to or greater than the defendant's is barred from recovery; below that threshold, damages are reduced not by a fixed percentage but by whatever amount the jury \"deems just and equitable\" having regard to the claimant's share of responsibility. This discretionary-reduction language is distinctive — most modified-comparative states reduce the award by the plaintiff's exact fault percentage, while Maine leaves the size of the reduction to the jury, which raises the stakes of how comparative fault is framed at trial. Maine's personal injury statute of limitations is notably long at six years from the date of injury (Me. Rev. Stat. tit. 14 § 752), one of the more generous PI windows in the country and far longer than neighboring states. Maine is an at-fault (tort) auto-insurance state. The combination of a six-year SOL and discretionary fault reduction shapes both intake timing and case-valuation strategy.",

    autoAudience:
      "Maine's crash exposure concentrates along its two primary highway corridors: I-95, which runs the length of the state from the New Hampshire border through Portland, Bangor, and up to Houlton near the Canadian border, and I-295, the spur that carries the heaviest commuter volume through Portland and the southern coast. Drive-alone commuting (70.9%) runs above the national average (68.7%), and the average commute is short (25.6 minutes), consistent with a small, dispersed population. The Portland-Auburn market — anchored by Cumberland and York counties in the populous southern coast — drives the largest share of case volume. Bangor (Penobscot County) and the northern Presque Isle market (Aroostook County) serve central and northern Maine.",

    truckAudience:
      "I-95 is Maine's freight backbone, carrying interstate truck traffic between the New England metros and the Canadian Maritime provinces via the Houlton border crossing. Maine's forest-products and logging economy puts heavy commercial vehicles on rural state routes far from the interstate, where two-lane roads and winter conditions raise crash severity. The state's rural fatality share is dominant — 142 of 177 traffic fatalities in 2024 occurred on rural roads (80%) — and rural truck-corridor exposure is a meaningful driver of that figure. Trucking cases in northern Maine frequently involve interstate or cross-border carriers with multi-jurisdiction insurance structures.",

    motorcycleAudience:
      "Maine's helmet law is partial: helmets are required for riders under 18, for novice riders, and for anyone operating under a learner's permit (Me. Rev. Stat. tit. 29-A § 2083); experienced adult riders are exempt. Maine is a heavy seasonal motorcycle-touring destination — coastal Route 1, the western mountains, and Acadia-area routes draw substantial out-of-state riders in summer. FARS 2024 does not break out a citable Maine motorcycle-fatality figure here, so it is left null. The six-year PI SOL gives motorcycle claimants an unusually long window, but early intake still matters for evidence preservation on rural crashes.",

    ruralUrbanContext:
      "Maine is the most rural state in the nation by share of population, and its crash data reflects it: 142 of 177 traffic fatalities in 2024 were on rural roads (80%), versus just 34 urban (19%). Rural fatalities cluster on two-lane state routes far from the I-95/I-295 corridor, where higher speeds, longer EMS response times, and winter conditions raise severity. Broadband penetration is lower across Aroostook, Piscataquis, and the western mountain counties, so digital-only campaigns underreach the very markets where the per-capita fatality risk is highest. Radio, outdoor, and local community media are essential complements for plaintiff firms targeting non-coastal Maine.",

    judicialContext:
      "Maine has a relatively small, unified trial court system (the Superior Court hears civil jury trials statewide), so venue variation is narrower than in larger states. Cumberland County (Portland) handles the largest civil docket and is the state's primary litigation center; Penobscot County (Bangor) and York County (the southern coast) follow. The state's discretionary comparative-fault reduction under tit. 14 § 156 makes jury composition and the framing of fault more consequential to case value than in jurisdictions that apply a mechanical percentage reduction.",

    marketSaturationTitle: "Portland-Auburn vs. Bangor & Presque Isle",
    marketSaturationTip:
      "Portland-Auburn is the dominant Maine DMA, anchored by the populous southern coast (Cumberland and York counties), and attracts the highest PI advertiser concentration in the state. Bangor serves central Maine and the Penobscot region with materially lower ad saturation. Presque Isle (Aroostook County) covers the sparsely populated far north and is one of the smallest media markets in the country, offering low-cost reach for firms willing to serve northern Maine.",

    freightCorridorTitle: "I-95 / I-295 Freight & Border Corridor",
    freightCorridorTip:
      "I-95 carries Maine's heaviest freight volume the full length of the state and feeds the Houlton port of entry into Canada, while I-295 concentrates commuter and distribution traffic through Greater Portland. Trucking PI cases on these corridors often involve interstate or cross-border carriers with complex multi-jurisdiction insurance and venue questions. Logging and forest-products trucks on rural feeder routes add a second layer of commercial-vehicle exposure away from the interstate.",

    solUrgencyTitle: "6-Year PI SOL — One of the Longest in the Country",
    solUrgencyTip:
      "Maine's six-year personal injury statute of limitations (Me. Rev. Stat. tit. 14 § 752) is among the most generous in the nation and far longer than most states' two- or three-year windows. The long window reduces SOL-driven intake pressure but does not eliminate the value of fast intake: evidence on rural crashes degrades, witnesses move, and claims against governmental entities can carry shorter notice requirements. Firms should treat the six-year window as a competitive advantage for re-engaging older or previously-declined claims rather than a reason to slow intake.",

    internetAccessTitle: "Northern & Western Maine Connectivity Gap",
    internetAccessTip:
      "Aroostook, Piscataquis, and the western mountain counties have lower broadband penetration and the highest per-capita rural-crash exposure in the state. Digital-only campaigns underreach these markets, which fall largely within the small Presque Isle and Bangor DMAs. Local radio, outdoor advertising along Route 1 and rural state routes, and community partnerships are necessary channels for plaintiff firms seeking cases outside the Portland-Auburn coast.",

    outOfStateTitle: "Coastal & Mountain Tourism Opportunity",
    outOfStateTip:
      "Maine draws heavy seasonal tourism — Acadia National Park, the coastal Route 1 corridor, and the western mountains pull large numbers of out-of-state visitors and motorcycle tourists each summer. Out-of-state visitors injured in Maine may not know local PI attorneys or that Maine offers an unusually long six-year SOL. Geo-fenced digital along Route 1 and I-95, combined with partnerships with coastal and Acadia-area accommodations, can capture cases from this high-volume seasonal segment before they engage out-of-state counsel.",

    footerSourcesLabel:
      "FARS 2024 Annual Report File (NHTSA); BLS Census of Fatal Occupational Injuries (Maine 2023, via Maine DOL); U.S. Census ACS 2024 1-year",
  },

  features: {
    // Maine's BLS CFOI 2023 series publishes only the statewide total (27); the
    // event/industry breakdown is suppressed for a state this small, so the
    // workplace section is hidden rather than rendered with zeroed sub-fields.
    showWorkplaceSection: false,
  },

  // No injuryData yet; add when Maine-specific deep crash data is integrated.
};
