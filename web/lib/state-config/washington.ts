import { washingtonCompetitiveData } from "@/lib/data/competitive-landscape/washington";
import type { StateConfig } from "./_types";

export const washingtonConfig: StateConfig = {
  slug: "washington",
  stateCode: "WA",
  stateName: "Washington",

  metadata: {
    title: "Washington State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Washington — combining FARS crash data, workplace-fatality data, demographics, judicial profiles, and market opportunity signals across Seattle-Tacoma, Spokane, Vancouver/Clark County, the Tri-Cities, and Bellingham.",
  },

  // Source: FARS 2024 (preliminary) — fatality counts already loaded in our DB.
  // urban/rural and alcohol splits are the FARS preliminary breakdowns for WA.
  // motorcycle / speed / unrestrained / distracted are left null/0 because no
  // authoritative WA WTSC/WSDOT 2024 figure was confirmed at author time.
  trafficStats: {
    totalCrashes: 0, // no citable WSDOT 2024 statewide crash total confirmed
    totalFatalities: 730,
    motorcycleFatalities: null, // not confirmed from WA WTSC/WSDOT 2024
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 204,
    alcoholRelatedPct: 27.9, // 204 / 730
    unrestrainedFatalities: 0, // no citable WTSC/WSDOT 2024 figure
    distractedDrivingFatalCrashes: 0, // no citable WTSC/WSDOT 2024 figure
    urbanFatalities: 428,
    ruralFatalities: 291,
    reportYear: 2024,
    sourceLabel: "FARS 2024 (preliminary)",
  },

  // Source: BLS Census of Fatal Occupational Injuries — Washington 2023
  // (Table A-1, fatal injuries by industry and event/exposure; corroborated by
  // Table A-7). Total = 97. Event totals: Transportation incidents 20, Falls/
  // slips/trips 21, Violent acts 17, Exposure to harmful substances 24.
  // Industry: Construction 16, Transportation & Warehousing 17, Truck
  // Transportation 10.
  // Employment base: BLS CES total nonfarm, WA 2023 annual average (~3,591,500),
  // via FRED series WANA. CFOI release does not publish an employment denominator,
  // so totalEmployment and qcewCoveredEmployment use the same CES annual average.
  workplaceStats: {
    totalEmployment: 3591500,
    qcewCoveredEmployment: 3591500,
    totalWorkplaceFatalities: 97,
    constructionFatalities: 16,
    constructionPctTotal: 16.5, // 16 / 97
    transportWarehouseFatalities: 17,
    truckTransportFatalities: 10, // BLS CFOI 2023 WA, Truck Transportation (NAICS 484)
    fallsSlipsTrips: 21,
    transportationIncidents: 20,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS (Census Reporter, ACS 2024 1-year; tables B08006 /
  // B08013 / B08303). Drive-alone share = 65.1% (2,559,867 of 3,932,815 workers).
  // Mean travel time = 27.2 min (aggregate 89,307,904 min / 3,287,301 commuters).
  commuteStats: {
    driveAlone: 65.1,
    nationalAvg: 68.7,
    avgCommuteMinutes: 27.2,
  },

  competitiveData: washingtonCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Washington — combining FARS crash data, workplace-fatality data, demographics, judicial profiles, and market opportunity signals across Seattle-Tacoma, Spokane, Vancouver/Clark County (Portland OR market), the Tri-Cities, and Bellingham. Population ~7.9M.",

    legalLandscape:
      "Washington follows pure comparative negligence — a plaintiff's recovery is reduced by their percentage of fault but is never barred, even at 99% fault (RCW 4.22.005). This is more plaintiff-favorable than the modified-comparative-fault states that bar recovery at 50% or 51%, and it lets firms pursue cases other states would screen out. The personal injury statute of limitations is three years from the date of injury (RCW 4.16.080), longer than Pennsylvania's two years. Washington is not a no-fault auto state. Critically, Washington has no statutory cap on non-economic damages: the legislative cap was struck down as unconstitutional under the state constitution's right to jury trial in Sofie v. Fibreboard Corp. (1989), so PI verdicts in Washington are uncapped. King County (Seattle) is the state's primary plaintiff venue, with Pierce (Tacoma) and Spokane counties as secondary litigation centers.",

    autoAudience:
      "Washington's crash exposure concentrates on the I-5 corridor, which runs the full length of the populated western side from the Oregon border through Vancouver, Tacoma, Seattle, and Everett to the Canadian border, and on I-90, the primary east-west route crossing the Cascades from Seattle to Spokane. I-405 carries heavy commuter volume on the Eastside (Bellevue, Renton, Kirkland), and I-82 connects the Yakima Valley to the Tri-Cities. Drive-alone commuting (65.1%) is below the national average (68.7%), reflecting Seattle's transit share, but the long mean commute (27.2 minutes) and dense I-5 / I-405 congestion keep crash exposure high in the central Puget Sound metro. The Seattle-Tacoma metro drives the largest share of case volume; Spokane anchors eastern Washington.",

    truckAudience:
      "Washington is the freight gateway for the Pacific Northwest. The Ports of Seattle and Tacoma (operating jointly as the Northwest Seaport Alliance) generate intense drayage and commercial-vehicle traffic feeding I-5 and I-90. I-90 is the major east-west freight artery over Snoqualmie Pass to Spokane and the inland Northwest; I-5 carries north-south freight between the Canadian border, the Puget Sound ports, and the Portland metro. Truck Transportation accounted for 10 of Washington's 97 workplace fatalities in 2023, and transportation incidents were the single largest fatal-injury event category statewide (20 of 97). Interstate carriers on these corridors often carry multi-state insurance structures and raise venue questions across the Washington-Oregon line.",

    motorcycleAudience:
      "Washington has a universal motorcycle helmet law — all riders and passengers must wear a helmet regardless of age or experience (RCW 46.37.530) — which reduces fatal-injury severity relative to partial-helmet states but does not eliminate motorcycle case volume. The Cascade mountain passes (Highway 2 over Stevens Pass, I-90 over Snoqualmie, Highway 410 / Chinook Pass) and the North Cascades and Olympic Peninsula loops draw recreational and touring riders, including out-of-state visitors from Oregon and British Columbia. A statewide WA 2024 motorcycle-fatality count is not yet confirmed from WTSC/WSDOT, so that tile is omitted; the 3-year SOL still leaves a wider intake window than most neighboring states.",

    constructionAudience:
      "The Seattle-Bellevue construction market has run one of the most sustained commercial and residential building cycles on the West Coast, and Spokane and the Tri-Cities (driven by Hanford-area and infrastructure work) add eastern-Washington volume. Construction represented 16 of Washington's 97 workplace fatalities in 2023 (about 16.5%). Washington is a monopolistic workers'-compensation state — coverage runs through the state Department of Labor & Industries rather than private carriers — so third-party liability (crane, scaffold, electrical, equipment, and general-contractor or property-owner negligence where a non-employer is at fault) is the primary recovery path beyond the L&I claim. Workers on active Puget Sound and Spokane job sites and their families are the core target.",

    boatingAudience:
      "Washington has extensive recreational and commercial maritime activity across Puget Sound, the San Juan Islands, Lake Washington, and the Columbia River, plus the nation's largest ferry system. Boating and on-water incidents generate seasonal personal-injury and wrongful-death cases distinct from auto volume, concentrated in the summer months and in the Puget Sound and San Juan boating corridors.",

    ruralUrbanContext:
      "Washington's FARS 2024 preliminary split is close to even — 291 rural fatalities versus 428 urban — but the rural share is disproportionate relative to where most of the state's population lives in the urban Puget Sound corridor. Eastern Washington (the Columbia Basin, Palouse, and Okanogan) and the rural stretches of Highway 2, Highway 12, and US-97 carry high per-capita fatality rates on two-lane highways. These rural and small-metro markets have lower broadband penetration than the Seattle metro, so digital-only campaigns underreach them; radio, outdoor, and community media remain necessary complements for plaintiff firms targeting non-metro Washington.",

    judicialContext:
      "King County (Seattle) is among the more plaintiff-favorable venues on the West Coast and produces the state's highest auto, premises, and product verdicts. Pierce County (Tacoma) and Snohomish County (Everett) are also workable plaintiff venues in the central Puget Sound. Spokane County anchors eastern Washington and tends to be more moderate, as do the smaller agricultural counties of the Columbia Basin and Yakima Valley. With no cap on non-economic damages after Sofie v. Fibreboard, venue selection — plaintiff residency and crash-location analysis — can materially shift expected case value, particularly when a King County venue is available.",

    marketSaturationTitle: "Seattle-Tacoma vs. Spokane & Secondary Markets",
    marketSaturationTip:
      "The Seattle-Tacoma metro attracts the highest PI advertiser concentration in Washington and the steepest cost-per-case. Spokane (eastern Washington's hub) and the Vancouver/Clark County market (which buys into the Portland OR DMA) offer materially lower ad saturation. The Yakima Valley and Tri-Cities (Kennewick-Pasco-Richland) and the Bellingham/Whatcom market near the Canadian border are mid-market opportunities with favorable cost-per-case economics and growing agricultural, distribution, and cross-border workforces.",

    freightCorridorTitle: "I-5 / I-90 & Northwest Seaport Alliance Corridors",
    freightCorridorTip:
      "I-5 is the West Coast's primary north-south freight spine, linking the Canadian border, the Ports of Seattle and Tacoma, and the Portland metro. I-90 carries east-west freight over Snoqualmie Pass between Puget Sound and Spokane. The Northwest Seaport Alliance concentrates drayage and commercial-vehicle traffic in south Seattle and Tacoma. Trucking PI cases on these corridors frequently involve interstate carriers, multi-state insurance, and Washington-Oregon venue questions across the I-5 / I-205 river crossings.",

    solUrgencyTitle: "3-Year SOL — Wider Window, but Notice Rules Compress It",
    solUrgencyTip:
      "Washington's 3-year personal injury statute of limitations (RCW 4.16.080) is longer than Pennsylvania's two years, but cases against state or local government defendants require a tort claim filing with a mandatory waiting period before suit (RCW 4.92 / RCW 4.96), which compresses the practical timeline. Claims involving transit agencies (Sound Transit, King County Metro), ferries, or municipal road-design defects carry these procedural traps. Fast intake and early evidence preservation protect both the case and the client relationship well before the SOL becomes a bar.",

    internetAccessTitle: "Eastern Washington & Cascade Connectivity Gap",
    internetAccessTip:
      "Washington's eastern counties — the Columbia Basin, Okanogan, Ferry, Stevens, and the rural Palouse — and the Cascade and Olympic Peninsula communities have lower broadband penetration than the Puget Sound metro. These areas run along Highway 2, US-97, and Highway 12 and see disproportionate two-lane-highway crash exposure. Digital-only campaigns underreach them; local radio, outdoor advertising, and community partnerships are necessary channels for plaintiff firms seeking cases outside the Seattle-Tacoma and Spokane metros.",

    outOfStateTitle: "British Columbia & Cascade Tourism Opportunity",
    outOfStateTip:
      "The I-5 border crossing at Blaine, the San Juan Islands, the North Cascades, and the Mount Rainier and Olympic park corridors draw heavy out-of-state and cross-border traffic from Oregon and British Columbia. Visitors injured in Washington often do not know local PI attorneys or the state's 3-year SOL and pure-comparative-fault rule. Geo-fenced digital along I-5 near the border, I-90 over Snoqualmie, and the SR-20 North Cascades and Mount Rainier approach routes can capture cases from this high-volume seasonal and cross-border segment before they engage out-of-state counsel.",

    footerSourcesLabel:
      "FARS 2024 (preliminary) traffic fatalities; BLS Census of Fatal Occupational Injuries — Washington 2023; U.S. Census ACS (Census Reporter, ACS 2024 1-year).",
  },

  // Boating section is relevant for WA (Puget Sound / San Juans / ferries);
  // leave the default flag (shown) and rely on the boating data source.
  features: {
    showWorkplaceSection: true,
  },

  // No injuryData yet; add when state-specific deep crash data is integrated.
};
