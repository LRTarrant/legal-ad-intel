import { georgiaCompetitiveData } from "@/lib/data/competitive-landscape/georgia";
import { gaInjuryData } from "@/lib/data/ga-injury-stats";
import type { StateConfig, InjuryDataRow } from "./_types";

/* GDOT county injury data → shared InjuryDataRow shape (mirrors the legacy
 * georgia-client mapping). GDOT only carries fatal / serious / visible-injury /
 * total-crash columns, so possible/no/unknown injury are zero-filled. The
 * placeholder "None" county is dropped. */
const GA_INJURY_ROWS: InjuryDataRow[] = gaInjuryData
  .filter((r) => r.county !== "None")
  .map((r) => ({
    year: r.year,
    county: r.county,
    fatal: r.fatalities,
    seriousInjury: r.seriousInjuries,
    minorInjury: r.visibleInjuries,
    possibleInjury: 0,
    noInjury: 0,
    unknown: 0,
    total: r.totalCrashes,
  }));

export const georgiaConfig: StateConfig = {
  slug: "georgia",
  stateCode: "GA",
  stateName: "Georgia",

  metadata: {
    title: "Georgia State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Georgia.",
  },

  trafficStats: {
    totalCrashes: 373_135, // 2023 GOHS Overview of Motor Vehicle Crashes, p. 5
    totalFatalities: 1_615, // 2023 GOHS Overview of Motor Vehicle Crashes, p. 1/8
    motorcycleFatalities: 196, // 2023 GOHS Overview, p. 7/8
    speedRelatedFatalities: 349, // 2023 GOHS Overview, p. 8
    speedRelatedPct: 21.6, // 349 / 1,615
    alcoholRelatedFatalities: 433, // 2023 GOHS Overview, p. 8
    alcoholRelatedPct: 27, // 2023 GOHS Overview, p. 7
    unrestrainedFatalities: 464, // 2023 GOHS Overview, p. 8
    distractedDrivingFatalCrashes: 41, // 2023 GOHS Distracted Driving Traffic Safety Facts
    // Sourced per Phase 3 audit (legacy const carried only ruralFatalShare=34.6%,
    // i.e. 559 rural roadway fatalities ÷ 1,615 total → urban = 1,615 − 559 = 1,056).
    urbanFatalities: 1_056,
    ruralFatalities: 559, // 2023 GOHS Overview, p. 8
    reportYear: 2023,
    sourceLabel: "GOHS 2023",
  },

  workplaceStats: {
    // Sourced per Phase 3 audit: legacy carries QCEW covered employment 4,802,800
    // (2023 Q2). No separate total-employment figure exists in the legacy const;
    // QCEW covered employment is used for both (it is the total-covered-employment base).
    totalEmployment: 4_802_800,
    qcewCoveredEmployment: 4_802_800, // 2023 Q2 BLS QCEW covered employment
    totalWorkplaceFatalities: 192, // 2023 BLS CFOI Georgia state table
    constructionFatalities: 37, // 2023 BLS CFOI Georgia (NAICS 23)
    constructionPctTotal: 19.3, // 37 / 192
    transportWarehouseFatalities: 36, // 2023 BLS CFOI Georgia (NAICS 48-49)
    truckTransportFatalities: 26, // BLS Fatal Work Injuries in Georgia — 2024 release, Table 2
    fallsSlipsTrips: 35, // 2023 BLS CFOI Georgia state table
    transportationIncidents: 69, // 2023 BLS CFOI Georgia state table
    reportYear: 2023,
  },

  commuteStats: {
    driveAlone: 72.3, // ACS 5-Year 2019–2023, Table S0801
    nationalAvg: 68.7,
    avgCommuteMinutes: 28.3, // ACS 5-Year 2019–2023, Table S0801
  },

  competitiveData: georgiaCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Georgia — combining accident data, demographics, judicial profiles, GDOT crash dashboards, and market opportunity signals across MVA, trucking, motorcycle, construction, and boating. Major metros: Atlanta, Augusta, Savannah, Columbus, and Macon. Population ~10.9M.",

    legalLandscape:
      "Georgia follows modified comparative negligence with a 50% bar — plaintiffs who are 50% or more at fault are barred from recovery. Georgia has a 2-year statute of limitations for personal injury, which provides a reasonable window for case acquisition compared to shorter-SOL states. Georgia does not cap non-economic damages in most PI cases, though punitive damages are generally capped at $250,000 (O.C.G.A. § 51-12-5.1) with exceptions for intentional torts and product liability.",

    // Verdict-card one-liner — the fuller story lives in `legalLandscape` + the
    // cross-signal insights.
    viabilityNote:
      "No cap on non-economic damages and a reasonable 2-year SOL, tempered by the modified-comparative 50% bar; punitive damages generally capped at $250K.",

    autoAudience:
      "Atlanta metro (Fulton, DeKalb, Gwinnett, Cobb) dominates volume, with I-75, I-85, and the I-285 perimeter ranking among the highest-fatality corridors in the Southeast. Georgia recorded 373,135 police-reported crashes and 1,615 fatalities in 2023, with 27% alcohol-related and 21.6% speed-related. The 2-year statute of limitations (O.C.G.A. § 9-3-33) provides a reasonable acquisition window. Savannah and Augusta are secondary markets with meaningful crash volume.",
    autoMedia:
      "Digital + CTV in Atlanta metro, where 72.3% of workers drive alone (ACS 2019–2023) with a 28.3-minute average commute. Billboard and radio along I-75 (Atlanta–Macon–Valdosta), I-85 (Atlanta–Gainesville), I-95 (Savannah coast corridor), and I-16 (Macon–Savannah). Geo-fenced mobile and streaming ads around the I-285 perimeter capture high-exposure commuter audiences.",

    truckAudience:
      "Georgia is a major freight hub — the Port of Savannah is the 3rd busiest container port in the U.S. and generates heavy truck traffic along I-16 and I-95. BLS CFOI data show 36 transportation/warehousing workplace fatalities and 26 in truck transportation alone in 2023. Atlanta sits at the intersection of I-75, I-85, and I-20, creating one of the busiest freight corridors in the Southeast. FMCSA federal preemption considerations apply to interstate carrier claims.",
    truckMedia:
      "Geo-fenced digital ads along I-75, I-85, I-16, and I-95 corridors targeting passenger vehicle occupants involved in truck collisions. Truck stop billboards at major rest areas and weigh stations between Savannah and Atlanta. The Savannah DMA reaches into South Carolina, extending campaign coverage across state lines for multi-jurisdiction trucking claims.",

    motorcycleAudience:
      "GOHS reported 196 motorcycle fatalities in 2023, representing roughly 12% of all Georgia traffic deaths. North Georgia mountains (Blue Ridge, Dahlonega) and coastal routes draw motorcycle tourism. Fulton and Gwinnett counties lead in volume. Georgia requires helmets for all riders (O.C.G.A. § 40-6-315), which affects severity distributions compared to states without universal helmet laws.",
    motorcycleMedia:
      "Seasonal spring/summer campaigns aligned with peak riding months (March–October). Social media and streaming ads targeting motorcycle-interest audiences. Digital geo-fencing near popular riding routes in the North Georgia mountains and along coastal GA-17. Atlanta metro digital for urban motorcycle commuters on surface streets and I-285.",

    constructionAudience:
      "BLS CFOI recorded 37 construction fatalities in Georgia in 2023 (19.3% of all 192 workplace deaths), with falls/slips/trips accounting for 35 fatalities statewide. Atlanta's construction boom, Savannah's port expansion, and Augusta's growth corridors sustain a large at-risk workforce. Third-party negligence claims may exist alongside workers' compensation where a non-employer party contributed to the injury.",
    constructionMedia:
      "Job site proximity targeting via mobile geo-fencing in Atlanta, Savannah, and Augusta metro areas. Construction injury and workers' comp keyword campaigns. Spanish-language digital and radio for the growing Hispanic workforce in metro Atlanta construction. Target both injured workers and family members searching on their behalf.",

    boatingAudience:
      "Georgia has extensive lake and coastal recreation — Lake Lanier, Lake Oconee, Lake Hartwell, the Intracoastal Waterway, and barrier islands (Tybee, Jekyll, St. Simons). Summer weekends drive peak accident volume. Target boating enthusiasts and coastal vacation demographics in the Savannah and Brunswick DMAs.",
    boatingMedia:
      "Seasonal spring/summer campaigns (May–September peak). Geo-targeted digital around Lake Lanier, Lake Oconee, and coastal communities. Local radio in lakeside and coastal counties. Marina signage, boat ramp postings, and outfitter partnerships reach boaters at the point of activity.",

    ruralUrbanContext:
      "34.6% of Georgia's 2023 traffic fatalities (559 of 1,615) occurred on rural roadways, yet these counties carry lower internet access and higher uninsured rates. Digital-only campaigns miss a significant share of potential claimants. Radio, local TV, and community health partnerships in South Georgia's I-75 corridor and the rural Black Belt reach underserved markets with less advertising competition.",

    judicialContext:
      "The top accident counties by total deaths overlap with some of the state's most plaintiff-friendly judicial profiles. Satellite counties around Atlanta — Gwinnett, Forsyth, Henry, and Cherokee — are growing rapidly with less advertising saturation, offering better cost-per-case economics than Fulton County proper.",

    askAiPageName: "Georgia State Intelligence",
    askAiPageContext:
      "State-level intelligence for plaintiff firm advertising and case acquisition in Georgia — combining FARS accident data, census demographics, judicial profiles, PI viability scores, storm events, GDOT crash dashboards, and market opportunity signals across MVA, trucking, motorcycle, construction, and boating.",
    footerSourcesLabel:
      "FARS (NHTSA), GDOT AASHTOWare Safety Portal, GOHS 2023 Traffic Safety Facts, BLS CFOI 2023, BLS QCEW, ACS 5-Year Estimates 2019–2023, NOAA Storm Events, USCG Boating Accidents, Judicial Profile Data",

    // Bespoke Cross-Signal Insight cards (ported from the legacy georgia-client,
    // Section 13). Rendered in place of the v2 shell's 5 fixed cards.
    customInsights: [
      {
        icon: "🍑",
        tone: "teal",
        title: "High-Volume Counties & Judicial Profile",
        stats: [
          { label: "Fast-growing satellite counties", value: "Gwinnett · Forsyth · Henry · Cherokee" },
        ],
        body: "The top accident counties by total deaths (shown in the county table above) overlap with some of the state's most plaintiff-friendly judicial profiles. Cross-referencing crash volume with judicial leanings reveals which counties combine high case supply with favorable venue dynamics. Satellite counties around Atlanta (Gwinnett, Forsyth, Henry, Cherokee) are growing rapidly with less advertising saturation, offering better cost-per-case economics than Fulton County proper.",
      },
      {
        icon: "🚢",
        tone: "steel",
        title: "Savannah MSA Growth & Trucking Opportunity",
        stats: [
          { label: "Port of Savannah rank", value: "#3 U.S. container port" },
          { label: "Transport/warehousing workplace deaths", value: "36" },
        ],
        body: "The Port of Savannah is the 3rd busiest container port in the U.S. and continues to expand capacity. The Savannah MSA (see demographics table above) is one of Georgia's fastest-growing metros, driving both construction and freight activity. I-16 from Savannah to Macon and I-95 along the coast see extreme truck traffic, while BLS data show 36 transportation/warehousing workplace fatalities statewide. Savannah-market trucking campaigns reach into South Carolina for cross-border coverage.",
      },
      {
        icon: "🛣️",
        tone: "amber",
        title: "Rural Fatal Share & Ad Strategy",
        stats: [
          { label: "Rural share of 2023 fatalities", value: "34.6%" },
          { label: "Rural roadway fatalities", value: "559" },
        ],
        body: "34.6% of Georgia's 2023 traffic fatalities occurred on rural roadways, yet the rural/urban table shows these counties have lower internet access and higher uninsured rates. Digital-only campaigns miss a significant share of potential claimants. Firms investing in radio, local TV, and community health partnerships in South Georgia's I-75 corridor and the rural Black Belt can reach underserved markets with less advertising competition.",
      },
      {
        icon: "🏗️",
        tone: "red",
        title: "Workplace Fatalities & Industry Hotspots",
        stats: [
          { label: "2023 workplace fatalities", value: "192" },
          { label: "Construction", value: "37" },
          { label: "Transportation/warehousing", value: "36" },
          { label: "Transportation incidents (leading event)", value: "69" },
        ],
        body: "Georgia recorded 192 workplace fatalities in 2023, with construction (37) and transportation/warehousing (36) as the top industry sectors. Transportation incidents (69) were the leading event type. Atlanta's construction growth and Savannah's logistics expansion concentrate workplace injury risk in these two metros, creating dual-market opportunities for firms handling both workers' comp and third-party negligence claims.",
      },
      {
        icon: "📊",
        tone: "emerald",
        title: "Demographic Growth & Tort Exposure",
        stats: [
          { label: "Drive-alone commute", value: "72.3%" },
          { label: "Average commute", value: "28.3 min" },
        ],
        body: "Georgia's MSA demographics (above) show rapid population growth in suburban Atlanta metros and along the Savannah corridor. Growing populations drive more vehicle-miles traveled, more construction activity, and more tort exposure. Combined with 72.3% drive-alone commute rates and a 28.3-minute average commute, Georgia's expanding suburban ring creates rising case volume in counties that are not yet saturated by national PI advertisers.",
      },
    ],
  },

  injuryData: {
    rows: GA_INJURY_ROWS,
    years: [2020, 2021, 2022],
    latestYear: 2021, // 2022 is partial (through Nov 8, 2022)
    sourceName: "GDOT AASHTOWare Crash Data Portal",
    sourceUrl: "https://gdot.aashtowaresafety.net/crash-data#/",
    partialYearLabels: { 2022: "(through Nov 2022)" },
  },

  features: {
    // Render the native FARS "Georgia Crash Intelligence" charts (yearly trend,
    // top-10 counties, fatalities-by-crash-type). page.tsx fetches the FARS data.
    showCrashIntelligence: true,
  },
};
