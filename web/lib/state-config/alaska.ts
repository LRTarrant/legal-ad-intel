import { alaskaCompetitiveData } from "@/lib/data/competitive-landscape/alaska";
import type { StateConfig } from "./_types";

export const alaskaConfig: StateConfig = {
  slug: "alaska",
  stateCode: "AK",
  stateName: "Alaska",

  metadata: {
    title: "Alaska State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Alaska — combining FARS crash data, demographics, and market opportunity signals across Anchorage, Fairbanks, and Juneau.",
  },

  // Source: FARS 2024 Annual Report File. Alaska does not publish a citable
  // 2024 state-DOT motorcycle or speed-related fatality breakout, so those
  // fields stay null per source-data discipline. totalCrashes /
  // unrestrainedFatalities / distractedDrivingFatalCrashes are not separately
  // verifiable for 2024 and are set to 0 (non-nullable) rather than invented.
  trafficStats: {
    totalCrashes: 0,
    totalFatalities: 70,
    motorcycleFatalities: null,
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 14,
    alcoholRelatedPct: 20,
    unrestrainedFatalities: 0,
    distractedDrivingFatalCrashes: 0,
    urbanFatalities: 33,
    ruralFatalities: 37,
    reportYear: 2024,
    sourceLabel: "FARS 2024 Annual Report File",
  },

  // Source: BLS Census of Fatal Occupational Injuries — Alaska 2023.
  // Alaska's CFOI release reports a total of 29 fatal work injuries and an
  // event breakdown (transportation incidents = 18, the most frequent event),
  // but BLS suppresses the industry-level breakout (construction,
  // transportation & warehousing, etc.) for low-count states. Because the
  // industry fields cannot be verified, they are zeroed and the workplace
  // section is hidden (features.showWorkplaceSection = false) rather than
  // populated with invented figures. Only the total and the verifiable
  // transportation-incident event count are real.
  workplaceStats: {
    totalEmployment: 0,
    qcewCoveredEmployment: 0,
    totalWorkplaceFatalities: 29,
    constructionFatalities: 0,
    constructionPctTotal: 0,
    transportWarehouseFatalities: 0,
    truckTransportFatalities: null, // not broken out in BLS CFOI 2023 AK state tables
    fallsSlipsTrips: 0,
    transportationIncidents: 18,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 2024 1-year (Census Reporter, tables B08006 / B08013 / B08303).
  // driveAlone = drove-alone workers (241,972) / total workers (361,983) = 66.8%.
  // avgCommuteMinutes = aggregate travel time (6,567,965) / commuters (331,506) = 19.8.
  commuteStats: {
    driveAlone: 66.8,
    nationalAvg: 68.7,
    avgCommuteMinutes: 19.8,
  },

  competitiveData: alaskaCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Alaska — combining FARS crash data, demographics, and market opportunity signals across Anchorage, Fairbanks, and Juneau. Population ~740K, spread across the largest and most road-isolated geography of any U.S. state.",

    legalLandscape:
      "Alaska follows pure comparative negligence: a plaintiff's recovery is reduced in proportion to their share of fault but is never barred, even if the plaintiff is found more than 50% at fault (AS 09.17.060). This is more plaintiff-friendly than the modified comparative regimes in most states. The personal injury statute of limitations is two years from the date of injury (AS 09.10.070). Alaska is an at-fault (tort) state for auto claims. Critically, Alaska caps non-economic damages by statute (AS 09.17.010) — generally the greater of $400,000 or $8,000 times the injured party's life expectancy in years, with a higher cap for severe permanent physical impairment or severe disfigurement — so case valuation must account for the cap on pain-and-suffering recovery. Anchorage (Third Judicial District) is the dominant litigation venue; Fairbanks (Fourth) and Juneau (First) are the secondary court centers.",

    autoAudience:
      "Alaska's connected road system is small relative to its landmass: the Seward Highway and Glenn Highway feed the Anchorage bowl, the Parks Highway links Anchorage to Fairbanks, and the Richardson and Steese Highways serve the Interior. Drive-alone commuting (66.8%) runs just below the national average (68.7%), with short average commutes (19.8 minutes) concentrated in the Anchorage and Mat-Su areas. Anchorage and the Matanuska-Susitna Borough drive the large majority of auto case volume. A defining feature is that many Alaska communities are off the road system entirely, reachable only by air or boat — crashes and injuries in those areas involve extended EMS response and medevac logistics that materially affect both injury severity and case workup.",

    truckAudience:
      "Commercial trucking in Alaska is concentrated on the limited Interior highway network — the Parks, Richardson, and Dalton Highways. The Dalton Highway (the haul road to the North Slope oil fields) is a heavy-truck corridor with long isolated stretches, severe winter conditions, and minimal services, which raises both crash severity and the time to emergency response. Freight that does not move by road moves by barge, rail (the Alaska Railroad), or air, so commercial-vehicle case volume is lower than in road-connected states but individual cases often involve high-value oilfield and resource-sector carriers.",

    motorcycleAudience:
      "Alaska's short riding season concentrates motorcycle exposure into the summer months along the Seward, Glenn, and Parks Highways and the road-accessible scenic routes. Alaska requires helmets for riders under 18 and for all passengers; adult operators 18 and over are not universally required to wear a helmet (AS 28.35.245). FARS 2024 does not publish a citable Alaska motorcycle-fatality count, so that figure is intentionally left blank rather than estimated. The 2-year SOL (AS 09.10.070) makes early intake important for the seasonal rider segment, including out-of-state visitors who ride during the tourist season.",

    constructionAudience:
      "Construction and resource-extraction work (oil, gas, fishing, and mining) are central to Alaska's economy, and remote job sites compound injury risk because of distance from trauma care. BLS CFOI 2023 reported 29 total work fatalities in Alaska, with transportation incidents (18) the single most frequent fatal event — a reflection of the state's reliance on aircraft, vessels, and long-haul highway travel to reach work. BLS suppresses the construction-specific count for Alaska because of low case numbers, so this surface does not display an industry breakdown. Third-party liability remains the primary recovery path where workers' compensation limits direct claims against the employer.",

    boatingAudience:
      "Alaska has more coastline than the rest of the United States combined, and commercial fishing plus recreational and subsistence boating are woven into daily life across the coastal and river communities. Vessel incidents are a meaningful share of the state's transportation-related fatalities. Maritime injury cases frequently fall under the Jones Act and general maritime law rather than ordinary state negligence, which changes both the venue analysis and the available remedies — a distinction worth flagging in intake for any on-the-water injury.",

    ruralUrbanContext:
      "Alaska's rural/urban divide is the most extreme in the nation. FARS 2024 records 37 rural and 33 urban traffic fatalities, but 'rural' in Alaska often means off the road system entirely — communities reachable only by small aircraft, boat, or snowmachine. EMS response in these areas can take hours and depends on weather and medevac availability, which raises injury severity and complicates the evidentiary record (crash reconstruction, scene preservation, and timely medical documentation are all harder). Digital-only campaigns underreach village and bush Alaska, where broadband is limited or absent; satellite-delivered media, local radio, and tribal and community health partnerships are necessary channels for firms seeking cases outside the Anchorage and Fairbanks road belt.",

    judicialContext:
      "Alaska's trial courts are organized into four judicial districts: Third (Anchorage and Southcentral), Fourth (Fairbanks and the Interior), First (Juneau and Southeast), and Second (Nome and the northwest). Anchorage handles the largest civil caseload. Because the statutory non-economic damages cap (AS 09.17.010) limits pain-and-suffering recovery, venue and judge selection matter less for damages ceilings than in uncapped states and more for the economic-loss and liability questions that determine whether a case clears the cap.",

    marketSaturationTitle: "Anchorage vs. Fairbanks & Juneau",
    marketSaturationTip:
      "Anchorage is Alaska's dominant DMA and concentrates nearly all of the state's PI advertiser activity, anchored by the Anchorage–Mat-Su population base. Fairbanks (Interior) and Juneau (Southeast capital) are far smaller secondary markets with thin advertiser competition and favorable cost-per-case economics, but limited population and high media-delivery costs cap absolute volume. A statewide plaintiff firm should weight Anchorage for scale while using low-cost radio and digital in Fairbanks and Juneau to claim share where few competitors advertise.",

    freightCorridorTitle: "Parks / Richardson / Dalton Highway Corridors",
    freightCorridorTip:
      "Alaska's truck freight rides a handful of long, isolated highways. The Dalton Highway (the North Slope haul road) and the Richardson and Parks Highways carry oilfield and resource freight through stretches with no services and severe winter conditions, so commercial-vehicle crashes there tend to be high-severity with delayed response. Carriers are often oilfield-service and resource-sector operators with substantial insurance structures, which raises the value of the cases that do occur even though total commercial-vehicle volume is low.",

    solUrgencyTitle: "2-Year SOL + Remote-Scene Evidence Risk",
    solUrgencyTip:
      "Alaska's 2-year personal injury statute of limitations (AS 09.10.070) is compounded by the state's geography: crashes and injuries in off-road-system communities are harder to document and reconstruct, and physical evidence and witnesses are harder to reach before they disperse. Fast intake, early scene and medical-record preservation, and prompt engagement with treating providers (often by medevac or in a regional hub) are critical to protect both the case and the SOL window.",

    internetAccessTitle: "Bush & Village Connectivity Gap",
    internetAccessTip:
      "Broadband is limited or absent across much of rural and bush Alaska, and many communities have no road access at all. Digital-only campaigns systematically underreach these populations. Satellite-delivered television and radio, statewide and community radio networks, and partnerships with tribal health organizations and regional hubs are the channels that actually reach injured Alaskans outside the Anchorage and Fairbanks road belt.",

    outOfStateTitle: "Summer Tourist & Cruise-Season Visitors",
    outOfStateTip:
      "Alaska draws a large seasonal influx of out-of-state visitors — cruise passengers in Southeast and Southcentral, plus road-trip and RV travelers on the Seward, Glenn, and Parks Highways. Visitors injured in Alaska rarely know local PI counsel or the state's 2-year SOL and damages cap. Geo-fenced digital around cruise ports (Juneau, Seward, Whittier) and the main highway tourist corridors, paired with hospitality-sector partnerships, can capture these cases before visitors return home and engage out-of-state attorneys.",

    footerSourcesLabel:
      "FARS 2024 Annual Report File; BLS Census of Fatal Occupational Injuries (Alaska 2023); U.S. Census ACS 2024 1-year estimates",
  },

  features: {
    // BLS suppresses the industry breakout for Alaska (low counts); only the
    // total + transportation-incident event count are verifiable, so the
    // workplace section is hidden rather than shown with zeroed sub-fields.
    showWorkplaceSection: false,
    // Boating is materially relevant in Alaska, but no boating dataset is
    // wired for this state yet; hide the summary until data is integrated.
    showBoatingSummary: false,
  },

  // No injuryData yet; add when Alaska-specific deep crash data is integrated.
};
