import { virginiaCompetitiveData } from "@/lib/data/competitive-landscape/virginia";
import type { StateConfig } from "./_types";

export const virginiaConfig: StateConfig = {
  slug: "virginia",
  stateCode: "VA",
  stateName: "Virginia",

  metadata: {
    title: "Virginia State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Virginia — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across Northern Virginia (Washington DC market), Richmond, Norfolk-Hampton Roads, Roanoke-Lynchburg, and Charlottesville.",
  },

  // Source: FARS 2024 (preliminary) — already loaded in our DB.
  // Urban/rural split, alcohol-related, and totals are FARS-derived.
  // Motorcycle, speed, total-crash, unrestrained, and distracted-driving
  // counts are left null/0 — no citable Virginia DMV "Crash Facts 2024"
  // figure was located to back them, and FARS preliminary does not break
  // them out here. Do not invent.
  trafficStats: {
    totalCrashes: 0, // no citable VA DMV "Crash Facts 2024" total located
    totalFatalities: 917,
    motorcycleFatalities: null, // not in our FARS dataset; no cited VA DMV figure
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 270,
    alcoholRelatedPct: 29.4, // 270 / 917
    unrestrainedFatalities: 0, // no citable VA DMV 2024 figure located
    distractedDrivingFatalCrashes: 0, // no citable VA DMV 2024 figure located
    urbanFatalities: 459,
    ruralFatalities: 456,
    reportYear: 2024,
    sourceLabel: "FARS 2024 (preliminary)",
  },

  // Source: BLS Census of Fatal Occupational Injuries — Virginia 2023
  // ("Fatal occupational injuries by selected characteristics, by major event
  // or exposure, Virginia," state-data page
  // https://www.bls.gov/iif/state-data/fatal-occupational-injuries-in-virginia-2023.htm
  // — direct bls.gov fetch 403s; retrieved via Wayback snapshot 20260516103248).
  // Total = 117 (corroborated by the VA DOLI FFY24 SOAR, which cites the BLS
  // CFOI CY2023 Virginia total of 117:
  // https://doli.virginia.gov/wp-content/uploads/2025/07/Virginia-FFY24-SOAR.pdf).
  // Event/exposure (Total row): Transportation incidents 40, Falls/slips/trips
  // 17, Violent acts 21, Exposure to harmful substances/environments 23,
  // Contact incidents 13. Industry (NAICS, Total row): Construction 14,
  // Transportation and warehousing 22. Truck Transportation is not broken out
  // separately in the VA state table -> null.
  // Employment base: the CFOI release publishes no employment denominator and a
  // citable VA CES/QCEW 2023 annual-average figure was not reachable at
  // authoring time (FRED/BLS unreachable), so totalEmployment /
  // qcewCoveredEmployment are left 0 (matching the New Jersey precedent in this
  // directory). Backfill from BLS CES (VA total nonfarm, 2023 annual avg) when
  // reachable.
  workplaceStats: {
    totalEmployment: 0, // VA CES/QCEW 2023 annual avg not reachable at authoring; left 0
    qcewCoveredEmployment: 0, // see above; CFOI release publishes no denominator
    totalWorkplaceFatalities: 117,
    constructionFatalities: 14, // NAICS Construction industry, BLS CFOI 2023 VA
    constructionPctTotal: 12.0, // 14 / 117
    transportWarehouseFatalities: 22, // NAICS Transportation & Warehousing
    truckTransportFatalities: null, // not broken out in BLS CFOI 2023 VA state table
    fallsSlipsTrips: 17,
    transportationIncidents: 40,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS. driveAlone = most recent clean statewide figure
  // located: "over 76%" of Virginia commuters drove alone (2019, Virginia DRPT
  // / ACS — https://content.govdelivery.com/accounts/VADRPT/bulletins/3cbbe03).
  // The 2023 ACS read trended lower with remote work; 76.0 is the conservative,
  // citable value. avgCommuteMinutes = 28.4 (Census QuickFacts "Mean travel
  // time to work" metric for Virginia, recent ACS 5-year — a long-stable VA
  // value).
  commuteStats: {
    driveAlone: 76.0,
    nationalAvg: 68.7,
    avgCommuteMinutes: 28.4,
  },

  competitiveData: virginiaCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Virginia — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across Northern Virginia (the Washington DC market), Richmond, Norfolk-Hampton Roads, Roanoke-Lynchburg, and Charlottesville. Population ~8.7M.",

    legalLandscape:
      "Virginia is one of only a handful of pure contributory negligence jurisdictions in the country: a plaintiff found even 1% at fault is completely barred from recovery. This is the single most important fact for case selection in Virginia — liability must be clean, and any shared fault can defeat an otherwise strong claim. The personal injury statute of limitations is two years from the date of injury (Va. Code § 8.01-243). Virginia is not a no-fault auto state, so injured parties pursue the at-fault driver directly. Virginia imposes a statutory cap on total damages in medical malpractice cases (Va. Code § 8.01-581.15), but standard personal injury cases carry no general cap on non-economic damages. The combination of the contributory-negligence bar and conservative-trending juries makes liability clarity, early intake, and venue analysis decisive in Virginia.",

    autoAudience:
      "Virginia's crash exposure concentrates on its interstate spine: I-95 (the primary North-South corridor through Northern Virginia, Richmond, and Petersburg), I-64 (Hampton Roads through Richmond to the Shenandoah Valley), I-81 (the heavy-truck corridor down the western Valley from Winchester through Roanoke to Bristol), I-66 (the Northern Virginia commuter artery into Washington), and I-264 (the Hampton Roads urban loop). Drive-alone commuting (about 76%) exceeds the national average (68.7%), with long Northern Virginia commutes (statewide mean travel time ~28.4 minutes) concentrating exposure in the Washington DC market suburbs — Fairfax, Arlington, Loudoun, and Prince William. The Washington DC market (Northern Virginia), Richmond, and Norfolk-Hampton Roads drive the largest share of case volume.",

    truckAudience:
      "Virginia is a major East Coast freight state. I-81 along the western Shenandoah Valley is one of the most truck-dense interstates in the nation, carrying through-freight between the Northeast and the Southeast with a heavy share of commercial vehicles. I-95 funnels North-South freight through Richmond and Northern Virginia, and the Port of Virginia (Norfolk-Hampton Roads) generates dense drayage and container-truck traffic across the Hampton Roads region. Trucking cases on these corridors frequently involve interstate carriers with multi-state insurance structures. Virginia's pure contributory-negligence rule raises the stakes on commercial-vehicle cases: clean liability against the carrier is essential, since any contributory fault assigned to the injured driver bars recovery entirely.",

    motorcycleAudience:
      "Virginia enforces a universal motorcycle helmet law — all riders and passengers must wear a helmet regardless of age, one of the stronger helmet mandates in the country. Motorcycle fatality counts are not broken out in our FARS preliminary dataset for Virginia, so a state-specific figure is intentionally omitted here. The Blue Ridge Parkway, Skyline Drive, and the western mountain routes draw significant recreational riders, including out-of-state visitors from Maryland, North Carolina, and the Washington metro. Under pure contributory negligence, any allegation that a rider contributed to the crash (lane positioning, speed, gear) can defeat the claim — early scene investigation and witness preservation are critical, and the 2-year SOL leaves little room to delay intake.",

    constructionAudience:
      "Northern Virginia's data-center and commercial-construction boom (Loudoun and Prince William counties host the densest data-center cluster in the world) and the Hampton Roads shipyard and port-infrastructure base generate substantial construction and industrial activity. Third-party liability — crane, scaffold, electrical, and OSHA-cited incidents involving a non-employer at fault — is the primary recovery path where workers' compensation limits direct claims against the employer. Virginia's contributory-negligence rule and conservative jury tendencies make liability clarity essential on these cases. (BLS CFOI 2023 recorded 117 fatal work injuries in Virginia, including 14 in construction.)",

    ruralUrbanContext:
      "Virginia's 2024 fatalities split almost evenly between rural (456) and urban (459) roads despite the population concentrating in the urban crescent (Northern Virginia, Richmond, Hampton Roads). The rural Southside, Southwest Virginia (the coalfields), and Shenandoah Valley counties carry disproportionate per-capita fatality exposure, much of it on I-81 and two-lane US routes. These rural markets have lower broadband penetration; digital-only campaigns underreach them. Radio, outdoor, and community media are essential complements for plaintiff firms targeting non-metro Virginia, particularly along the I-81 truck corridor.",

    judicialContext:
      "Virginia juries trend conservative relative to neighboring Maryland and the District of Columbia, and the pure contributory-negligence regime compounds the defense advantage — this is an honest constraint plaintiff firms must price into case selection and expected value. Within the state, the urban venues are comparatively more favorable: Richmond (City of Richmond), Norfolk and Portsmouth in Hampton Roads, and the inner Northern Virginia jurisdictions (Arlington, Alexandria, Fairfax) tend toward higher awards than the conservative rural Southside and Southwest circuits. Venue selection — driven by plaintiff residency and crash location — can materially shift expected case value, and clean liability remains the threshold requirement everywhere in the Commonwealth.",

    marketSaturationTitle: "Northern Virginia & Richmond vs. Secondary Markets",
    marketSaturationTip:
      "The Washington DC market (Northern Virginia — Fairfax, Arlington, Loudoun, Prince William) is the highest-cost, most-saturated PI advertising environment in Virginia, shared with DC and Maryland firms competing across the same media. Richmond and Norfolk-Hampton Roads are large, somewhat less saturated metros with strong case volume. Roanoke-Lynchburg and Charlottesville are mid-markets with materially lower ad saturation and favorable cost-per-case economics, anchored to the I-81 corridor and the central Virginia population base.",

    freightCorridorTitle: "I-81 & I-95 Freight Corridors",
    freightCorridorTip:
      "I-81 along the Shenandoah Valley is among the most truck-heavy interstates in the United States, moving through-freight between the Northeast and Southeast with a high commercial-vehicle share and a documented crash-severity problem. I-95 carries dense North-South freight through Richmond and Northern Virginia, and the Port of Virginia generates heavy drayage traffic across Hampton Roads. Trucking PI cases on these corridors often involve interstate carriers and complex venue questions — and Virginia's contributory-negligence bar makes establishing clean carrier liability the decisive issue.",

    solUrgencyTitle: "2-Year SOL + Contributory Negligence — Intake Speed Is Decisive",
    solUrgencyTip:
      "Virginia's 2-year personal injury statute of limitations (Va. Code § 8.01-243) is shorter than several neighboring states, and the pure contributory-negligence rule means any shared fault bars recovery entirely. Together these make fast intake and early evidence preservation more consequential in Virginia than in comparative-negligence states: scene documentation, witness statements, and vehicle data must be captured before they degrade, because a contributory-fault argument can defeat the case at any stage. Claims involving Commonwealth or municipal defendants may carry additional, shorter notice requirements.",

    internetAccessTitle: "Southwest Virginia & Southside Connectivity Gap",
    internetAccessTip:
      "Southwest Virginia (the coalfield counties), the rural Southside, and parts of the Shenandoah Valley have lower broadband penetration and higher uninsured populations. These areas run along I-81 and US-58/US-29 and see disproportionate truck-crash and two-lane-road exposure. Digital-only campaigns underreach these markets. Local radio (Roanoke-Lynchburg and Bristol media), outdoor advertising along I-81, and community partnerships are necessary channels for plaintiff firms seeking cases outside the Northern Virginia, Richmond, and Hampton Roads metros.",

    outOfStateTitle: "Blue Ridge & Coastal Tourism Opportunity",
    outOfStateTip:
      "The Blue Ridge Parkway, Skyline Drive, Shenandoah National Park, and the Virginia Beach oceanfront draw heavy out-of-state visitor and rider traffic from Maryland, North Carolina, and the Washington metro. Out-of-state visitors injured in Virginia often do not know local PI counsel, the 2-year SOL, or — critically — that Virginia's contributory-negligence rule can bar their claim outright. Geo-fenced digital along the Blue Ridge, I-81, and the Virginia Beach corridors, paired with hospitality-partner referral channels, can capture these seasonal cases before visitors engage out-of-state attorneys.",

    footerSourcesLabel:
      "FARS 2024 (preliminary) — NHTSA Fatality Analysis Reporting System; U.S. Census ACS (commuting); Va. Code § 8.01-243 (statute of limitations)",
  },

  features: {
    // Workplace stats backfilled with verified BLS CFOI 2023 Virginia figures
    // (total 117 + construction / transportation / falls sub-breakdowns).
    showWorkplaceSection: true,
  },

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
