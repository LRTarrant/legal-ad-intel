import { newHampshireCompetitiveData } from "@/lib/data/competitive-landscape/new-hampshire";
import type { StateConfig } from "./_types";

export const newHampshireConfig: StateConfig = {
  slug: "new-hampshire",
  stateCode: "NH",
  stateName: "New Hampshire",

  metadata: {
    title: "New Hampshire State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in New Hampshire — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across Manchester, Nashua, Concord, and Portsmouth.",
  },

  // Source: FARS 2024 Annual Report File. Motorcycle and speed fatalities are not
  // in our FARS extract for NH — left null (no citable state-DOT 2024 figure).
  // totalCrashes / unrestrainedFatalities / distractedDrivingFatalCrashes are
  // non-nullable and set to 0 (not separately citable for NH at the 2024 vintage).
  trafficStats: {
    totalCrashes: 0,
    totalFatalities: 133,
    motorcycleFatalities: null,
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 45,
    alcoholRelatedPct: 33.8,
    unrestrainedFatalities: 0,
    distractedDrivingFatalCrashes: 0,
    urbanFatalities: 58,
    ruralFatalities: 75,
    reportYear: 2024,
    sourceLabel: "FARS 2024 Annual Report File",
  },

  // Source: BLS Census of Fatal Occupational Injuries — New Hampshire 2023.
  // The verified 2023 state total and its industry/event breakdown could not be
  // retrieved from a citable source (bls.gov 403s automated fetch across all
  // CFOI paths; available mirrors carry only a 3-year rate or 2024 data). Per the
  // "accuracy over completeness" rule, all fields are zeroed and the section is
  // hidden via features.showWorkplaceSection:false rather than inventing figures.
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

  // Source: U.S. Census ACS 2024 1-year estimates (via Census Reporter).
  // driveAlone = B08006 drove-alone (545,519) / total workers (754,095) = 72.3%.
  // avgCommuteMinutes = B08013 aggregate travel time (17,385,604) /
  //   B08303 commuters who travel (633,145) = 27.5 min.
  commuteStats: {
    driveAlone: 72.3,
    nationalAvg: 68.7,
    avgCommuteMinutes: 27.5,
  },

  competitiveData: newHampshireCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in New Hampshire — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across Manchester, Nashua, Concord, and Portsmouth. Population ~1.4M. Note: New Hampshire has no in-state Nielsen DMA — most of the state is the Boston DMA, with the Seacoast falling in the Portland–Auburn, ME DMA.",

    legalLandscape:
      "New Hampshire uses modified comparative negligence with a 51% bar: a plaintiff's recovery is barred only when the plaintiff's fault is greater than the combined fault of the defendants, and any recovery is reduced in proportion to the plaintiff's share of fault (RSA 507:7-d). The personal injury statute of limitations is three years from the act or omission complained of (RSA 508:4). Critically, New Hampshire is one of the very few states that does NOT mandate automobile liability insurance — drivers are not required to carry coverage if they can otherwise demonstrate financial responsibility — which materially narrows the pool of recovery sources and elevates the importance of uninsured/underinsured motorist (UM/UIM) analysis on every auto file. New Hampshire is not a no-fault state, so an injured party pursues the at-fault driver directly (subject to that driver actually being insured or having assets). The state's litigation activity concentrates around Hillsborough County (Manchester and Nashua) and the Merrimack County seat in Concord.",

    autoAudience:
      "New Hampshire's crash exposure runs along three interstate corridors: I-93 (the state's spine, running from the Massachusetts border through Manchester and Concord up into the Lakes Region and White Mountains), I-95 (the short but heavily traveled Seacoast stretch through Portsmouth), and I-89 (Concord northwest toward Lebanon and the Vermont border). Drive-alone commuting (72.3%) runs above the national average (68.7%), and a large share of southern-tier residents commute into the Massachusetts (Boston) job market along I-93, concentrating peak-hour exposure in Hillsborough County. Manchester and Nashua are the highest-volume auto markets; Concord and the Seacoast follow.",

    truckAudience:
      "I-93 and I-95 carry the bulk of New Hampshire's commercial truck traffic between the Boston metro, the Seacoast port at Portsmouth, and northern New England. I-89 links the Concord area to the Upper Valley and Vermont freight network. Because New Hampshire does not mandate auto liability insurance for private drivers, commercial-vehicle cases — where federally regulated interstate carriers do carry substantial coverage — are often a more reliable recovery path than passenger-vehicle collisions. Identifying whether a defendant is an interstate motor carrier (with FMCSA-mandated minimums) versus an uninsured private driver is a threshold question on every New Hampshire collision.",

    motorcycleAudience:
      "New Hampshire is a destination motorcycle state — Laconia Motorcycle Week in the Lakes Region is one of the oldest and largest rallies in the country, drawing hundreds of thousands of out-of-state riders each June along I-93 and the Route 11/Route 3 corridors. New Hampshire has NO adult helmet law: helmets are required only for riders under 18 (RSA 265:122). Motorcycle and speed-related fatality counts are not broken out in our FARS 2024 extract for New Hampshire. The combination of a heavy seasonal out-of-state rider influx, no adult helmet requirement, and the absence of mandatory auto insurance makes early intake and UM/UIM review especially important for motorcycle cases.",

    constructionAudience:
      "Southern New Hampshire's Manchester–Nashua corridor and the Seacoast continue an active commercial and residential construction cycle, much of it tied to spillover demand from the Boston metro. Third-party liability — crane, scaffold, electrical, and OSHA-cited incidents involving a non-employer at fault — is the primary recovery path where the workers' compensation bar limits direct claims against the employer. Workers on active southern-tier and Seacoast job sites and their families are the primary target. (New Hampshire's verified BLS CFOI 2023 workplace-fatality breakdown could not be confirmed from a citable source, so the workplace statistics section is hidden on this surface.)",

    ruralUrbanContext:
      "New Hampshire's fatalities skew rural: 75 of 133 traffic fatalities in 2024 (FARS) occurred on rural roads versus 58 urban. The northern two-thirds of the state — the White Mountains, the North Country, and the Lakes Region — is sparsely populated, with long rural stretches of I-93, Route 2, and Route 16 that draw heavy seasonal tourist and recreational traffic. These rural markets have lower broadband penetration and thinner local media; digital-only campaigns underreach them. Radio, outdoor along the I-93 and Route 16 tourist corridors, and community media are necessary complements for plaintiff firms targeting non-metro New Hampshire.",

    judicialContext:
      "New Hampshire's superior court litigation concentrates in Hillsborough County (Manchester and Nashua), the state's most populous county, and in Merrimack County (Concord). Rockingham County (the Seacoast and the I-93/I-95 southern tier) is a growing venue tied to Seacoast and Massachusetts-adjacent development. New Hampshire is a comparatively small, conservative-bench state with no statutory cap on non-economic damages in standard PI cases; venue and the comparative-fault allocation under RSA 507:7-d are the primary drivers of expected case value.",

    marketSaturationTitle: "Manchester/Nashua vs. Concord & the Seacoast",
    marketSaturationTip:
      "Manchester and Nashua (Hillsborough County) anchor New Hampshire's PI advertiser concentration, but both sit inside the Boston DMA — meaning broadcast TV buys reach a Massachusetts-dominated audience and waste a large share of impressions on out-of-state viewers. Concord (Merrimack County) and Portsmouth/the Seacoast (Rockingham County, partly in the Portland–Auburn, ME DMA) offer lower-saturation opportunities, but the cross-DMA structure makes geo-targeted digital, local radio, and search materially more efficient than TV for reaching New Hampshire residents specifically.",

    freightCorridorTitle: "I-93 / I-95 Freight & Commuter Corridors",
    freightCorridorTip:
      "I-93 is New Hampshire's primary north–south artery, carrying both Boston-bound commuter traffic and interstate freight from the Massachusetts border through Manchester and Concord. I-95 through Portsmouth is a short but high-volume Seacoast freight and toll corridor linking Massachusetts to Maine. I-89 connects Concord to the Upper Valley and Vermont. Trucking PI cases on these corridors typically involve interstate carriers with FMCSA-mandated insurance and multi-state venue questions — a more dependable recovery path in a state that does not require private drivers to carry liability coverage.",

    solUrgencyTitle: "3-Year SOL — Confirm the Defendant Is Even Insured",
    solUrgencyTip:
      "New Hampshire's personal injury statute of limitations is three years from the act or omission (RSA 508:4). The bigger early-intake risk is not the clock but the coverage question: because New Hampshire does not mandate auto liability insurance, a meaningful share of at-fault drivers carry no coverage at all. Confirming the defendant's insurance status — and the client's own UM/UIM limits — at intake is essential to setting realistic expectations and protecting the recovery before evidence and witnesses fade.",

    internetAccessTitle: "North Country & Lakes Region Connectivity Gap",
    internetAccessTip:
      "New Hampshire's North Country (Coös and northern Grafton counties) and parts of the Lakes Region have lower broadband penetration and thinner local digital media. These areas run along I-93, Route 3, and Route 16 and see disproportionate rural and seasonal-tourist crash exposure. Digital-only campaigns underreach these markets. Local radio, outdoor advertising along the tourist corridors, and community partnerships are necessary channels for plaintiff firms seeking cases outside the Manchester–Nashua–Concord southern tier.",

    outOfStateTitle: "Laconia Bike Week & White Mountains Tourism Opportunity",
    outOfStateTip:
      "Laconia Motorcycle Week (each June) and the White Mountains / Lakes Region tourist season draw hundreds of thousands of out-of-state visitors and riders, many from Massachusetts and southern New England, onto New Hampshire's rural corridors. Out-of-state visitors injured in New Hampshire often do not know local PI attorneys, the state's 3-year SOL, or that New Hampshire does not require drivers to carry insurance. Geo-fenced digital along I-93, Route 16, and the Laconia rally footprint, paired with Lakes Region accommodation partnerships, can capture these seasonal cases before visitors engage out-of-state counsel.",

    footerSourcesLabel:
      "FARS 2024 Annual Report File; U.S. Census ACS 2024 1-year estimates; New Hampshire RSA 507:7-d, RSA 508:4, RSA 265:122",
  },

  features: {
    // BLS CFOI 2023 NH total + breakdown could not be verified from a citable
    // source; hide the workplace section rather than display zeroed/invented data.
    showWorkplaceSection: false,
  },

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
