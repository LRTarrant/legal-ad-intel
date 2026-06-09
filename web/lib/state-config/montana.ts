import { montanaCompetitiveData } from "@/lib/data/competitive-landscape/montana";
import type { StateConfig } from "./_types";

export const montanaConfig: StateConfig = {
  slug: "montana",
  stateCode: "MT",
  stateName: "Montana",

  metadata: {
    title: "Montana State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Montana — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across the Billings, Missoula, Great Falls, Butte-Bozeman, and Helena DMAs.",
  },

  // Source: FARS 2024 Annual Report File. Montana has no single state-DOT figure
  // wired here; fatality counts are FARS-sourced. motorcycle/speed are not in our
  // data → null. totalCrashes, unrestrained, and distracted-driving fatal crashes
  // are not separately verified for MT → 0.
  trafficStats: {
    totalCrashes: 0,
    totalFatalities: 206,
    motorcycleFatalities: null,
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: 92,
    alcoholRelatedPct: 44.7,
    unrestrainedFatalities: 0,
    distractedDrivingFatalCrashes: 0,
    urbanFatalities: 42,
    ruralFatalities: 163,
    reportYear: 2024,
    sourceLabel: "FARS 2024 Annual Report File",
  },

  // Source: Montana Dept. of Labor & Industry / BLS Census of Fatal Occupational
  // Injuries — Montana 2023 (38 total fatal work injuries). Industry and event
  // sub-breakouts are suppressed / occupation-coded in the small-state CFOI tables,
  // so only the verified total is kept; sub-fields are zeroed and the workplace
  // section is hidden (features.showWorkplaceSection = false).
  workplaceStats: {
    totalEmployment: 0,
    qcewCoveredEmployment: 0,
    totalWorkplaceFatalities: 38,
    constructionFatalities: 0,
    constructionPctTotal: 0,
    transportWarehouseFatalities: 0,
    truckTransportFatalities: null,
    fallsSlipsTrips: 0,
    transportationIncidents: 0,
    reportYear: 2023,
  },

  // Source: U.S. Census ACS 2024 1-year (Montana, FIPS 30).
  // driveAlone = B08006 drove-alone (404,489) / total commuters (565,069) = 71.6%.
  // avgCommuteMinutes = B08013 aggregate (9,745,630) / B08303 commuters (499,040) = 19.5.
  commuteStats: {
    driveAlone: 71.6,
    nationalAvg: 68.7,
    avgCommuteMinutes: 19.5,
  },

  competitiveData: montanaCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Montana — combining FARS crash data, demographics, judicial profiles, and market opportunity signals across the Billings, Missoula, Great Falls, Butte-Bozeman, and Helena DMAs. A vast, sparsely populated state where rural crash exposure and long EMS response times dominate the case-acquisition picture.",

    legalLandscape:
      "Montana follows modified comparative negligence with a 51% bar: a plaintiff who is 51% or more at fault is barred from recovery, while a plaintiff at 50% or less recovers with damages reduced by their share of fault (Mont. Code § 27-1-702). The personal injury statute of limitations is three years from the date of injury (Mont. Code § 27-2-204). Montana is a traditional at-fault (tort) state for auto claims. There is no general statutory cap on non-economic damages in standard personal injury cases — the only cap is in medical-malpractice actions. Helmets are required for motorcycle riders under 18 only. The combination of a three-year SOL, no general non-economic cap, and at-fault liability makes Montana a comparatively plaintiff-workable jurisdiction once liability is established.",

    autoAudience:
      "Montana's crash exposure is dominated by long-distance highway travel across a vast rural geography. Interstate 90 (east-west across the southern half of the state through Billings, Bozeman, and Missoula), I-94 (Billings northeast toward North Dakota), and I-15 (north-south through Helena and Great Falls) carry the bulk of through-traffic and freight. Drive-alone commuting (71.6%) runs above the national average (68.7%), but average commute times are short (19.5 minutes) because most population centers are small. The largest case volume tracks the Billings and Missoula DMAs, with Great Falls, the Butte-Bozeman corridor, and Helena as secondary markets.",

    truckAudience:
      "Montana is a heavy freight pass-through state. I-90 and I-94 form a primary northern-tier east-west trucking artery connecting the Pacific Northwest to the upper Midwest, and I-15 links Montana to Canadian freight at the north and Salt Lake City to the south. Long hauls, mountain grades, winter conditions, and sparse roadside infrastructure raise the severity of commercial-vehicle crashes. Truck PI cases on these corridors frequently involve out-of-state and interstate carriers with multi-state insurance structures, making early scene investigation and venue analysis important.",

    motorcycleAudience:
      "Montana's helmet law only requires helmets for riders under 18, so most adult riders ride unhelmeted, which raises injury and fatality severity. The state's scenic routes — Beartooth Highway, Going-to-the-Sun Road in Glacier National Park, and the corridors around Yellowstone — draw substantial recreational and out-of-state rider traffic in summer. Many injured riders are visitors who do not know local counsel or Montana's three-year SOL, creating an intake-timing opportunity for firms that can reach them quickly.",

    ruralUrbanContext:
      "Montana's fatality picture is overwhelmingly rural: of 206 traffic fatalities in 2024, 163 occurred on rural roads versus only 42 in urban areas (FARS 2024). Long distances to trauma care and extended EMS response times turn survivable crashes into fatalities and turn injuries into long-term disability claims. Alcohol-related crashes are a defining factor — 92 of 206 fatalities (44.7%) were alcohol-related, one of the highest shares in the country. Rural Montana also has lower broadband penetration, so digital-only campaigns underreach the highest-exposure populations; radio, outdoor, and local community media are essential complements.",

    judicialContext:
      "Montana's trial courts are organized into judicial districts spanning multiple counties, reflecting the state's low population density. Yellowstone County (Billings), Missoula County, Cascade County (Great Falls), Gallatin County (Bozeman), and Lewis and Clark County (Helena) are the higher-volume civil venues. With no general non-economic damages cap and a three-year SOL, venue and liability analysis — particularly establishing the defendant's share under the 51% bar — drives expected case value more than statutory limits do.",

    marketSaturationTitle: "Several Small DMAs, No Dominant Market",
    marketSaturationTip:
      "Montana fragments across five small in-state DMAs — Billings, Missoula, Great Falls, Butte-Bozeman, and Helena — rather than one dominant metro. No single market commands the kind of PI advertiser concentration seen in larger states, which keeps media costs lower and leaves room for a firm to own a market with sustained local presence. Billings (the largest market) and Missoula carry the most volume; Great Falls, Butte-Bozeman, and Helena are efficient secondary buys with favorable cost-per-case economics.",

    freightCorridorTitle: "I-90 / I-94 / I-15 Freight & Tourist Corridors",
    freightCorridorTip:
      "I-90 and I-94 form the state's primary east-west freight spine, and I-15 carries north-south Canada-to-Utah traffic. Layered on top of freight is heavy seasonal tourist traffic feeding Glacier and Yellowstone National Parks. The mix of long-haul commercial vehicles, unfamiliar out-of-state drivers, and mountain-grade winter conditions produces high-severity crashes with frequent interstate-carrier and multi-state-insurer defendants.",

    solUrgencyTitle: "3-Year SOL — But Rural Evidence Decays Fast",
    solUrgencyTip:
      "Montana's three-year personal injury statute of limitations (Mont. Code § 27-2-204) is longer than many states, but the practical urgency is higher than the calendar suggests. Rural crash scenes are cleared slowly and documented inconsistently, EMS and trauma records originate from distant facilities, and out-of-state visitors leave the state quickly. Fast intake and early evidence preservation protect both the case and the client relationship well before the SOL becomes a bar. Claims against governmental defendants can carry shorter notice requirements.",

    internetAccessTitle: "Rural Connectivity Gap",
    internetAccessTip:
      "Large portions of rural Montana have limited broadband and cellular coverage, and these are the same areas (rural highways) where 163 of the state's 206 fatalities occurred in 2024. Digital-only campaigns systematically underreach the highest-exposure populations. Local radio, highway outdoor along I-90/I-94/I-15, and partnerships with rural clinics and community organizations are necessary channels for plaintiff firms targeting non-metro Montana.",

    outOfStateTitle: "Glacier & Yellowstone Tourist Traffic",
    outOfStateTip:
      "Glacier and Yellowstone National Parks draw millions of seasonal visitors, many driving rented vehicles or motorcycles on unfamiliar mountain roads. Visitors injured in Montana often do not know local PI counsel or the state's three-year SOL, and they leave the state soon after. Geo-fenced digital along park-access corridors (US-2, US-89, I-90 near the Yellowstone gateways) and partnerships with lodging and rental operators can capture these high-severity cases before injured visitors engage out-of-state counsel.",

    footerSourcesLabel:
      "FARS 2024 Annual Report File · Montana Dept. of Labor & Industry CFOI 2023 · U.S. Census ACS 2024 1-year",
  },

  features: {
    // CFOI 2023 verified the 38-fatality total only; industry/event sub-breakouts
    // are suppressed in the small-state tables, so the workplace section is hidden.
    showWorkplaceSection: false,
  },

  // No injuryData yet; add when Montana-specific deep crash data is integrated.
};
