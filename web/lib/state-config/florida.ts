import { floridaCompetitiveData } from "@/lib/data/competitive-landscape/florida";
import type { StateConfig } from "./_types";

export const floridaConfig: StateConfig = {
  slug: "florida",
  stateCode: "FL",
  stateName: "Florida",

  metadata: {
    title: "Florida State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Florida — accident data, demographics, judicial profiles, and market opportunity signals.",
  },

  trafficStats: {
    // FLHSMV Crash Facts 2023 (carried from the legacy FLHSMV const).
    totalCrashes: 395_175, // FLHSMV totalCrashes2023 (not surfaced as a tile; County map drives FARS counts)
    totalFatalities: 3_375, // FLHSMV totalFatalities2023 — renders in the Annual Fatalities tile
    motorcycleFatalities: 621, // FLHSMV motorcycleFatalities2023
    // Not reported in the legacy FL const — left null (nullable in the type).
    speedRelatedFatalities: null,
    speedRelatedPct: null,
    alcoholRelatedFatalities: null,
    alcoholRelatedPct: null,
    // Interface-required counts the legacy FL const never carried and the v2
    // shell does NOT render. Left 0 rather than fabricate a precise figure
    // (FLHSMV breakouts unverified). Source from FLHSMV Crash Facts if ever surfaced.
    unrestrainedFatalities: 0,
    distractedDrivingFatalCrashes: 0,
    // FL urban/rural fatality split not in the legacy const (legacy's "78% rural
    // road share" is road-class, not the fatality urban/rural split). Left null →
    // the Rural Fatal Share tile reads "not reported".
    urbanFatalities: null,
    ruralFatalities: null,
    reportYear: 2023,
    sourceLabel: "FLHSMV Crash Facts 2023",
    fatalitiesSourceLabel: "FLHSMV 2023",

    // Rate tile (snapshot): FL is ~17% above the national VMT fatality rate.
    fatalityRatePerVmt: 1.47, // FLHSMV ratePerVMT
    nationalFatalityRatePerVmt: 1.26, // FLHSMV nationalRate
    // Pedestrian / bicycle fatalities — feed the "Pedestrian & Cyclist Crisis"
    // cross-signal card (FL keeps the Boating case card, so showPedBikeCard is off).
    pedestrianFatalities: 791, // FLHSMV pedestrianFatalities2023
    bicycleFatalities: 234, // FLHSMV bicycleFatalities2023
  },

  workplaceStats: {
    // Interface-required macro employment figures the legacy const carried only
    // as sector employment (wrong unit). The v2 shell does NOT render these two;
    // left 0 rather than fabricate a precise statewide total.
    totalEmployment: 0,
    qcewCoveredEmployment: 0,
    totalWorkplaceFatalities: 284, // BLS CFOI — legacy totalWorkplaceFatalities2024 (renders)
    constructionFatalities: 88, // legacy constructionFatalities2024 (renders)
    constructionPctTotal: 31, // 88 / 284 ≈ 31% (renders: "88 (31% of all workplace deaths)")
    // CFOI sector breakout not in the legacy const; v2 shell does NOT render.
    transportWarehouseFatalities: 0,
    truckTransportFatalities: null, // not reported in legacy const (renders only when set)
    // Derived from the legacy "falls = 23% of fatalities" share × 284 ≈ 65.
    // This line DOES render in the Construction card; approximation, see summary.
    fallsSlipsTrips: 65,
    transportationIncidents: 0, // not in legacy const; v2 shell does NOT render
    reportYear: 2024, // matches the 284 / 88 CFOI figures the legacy page showed

    // Optional bespoke metrics (carried from the legacy BLS_FL const).
    constructionWorkers: 628_001, // BLS_FL constructionWorkers
    constructionEmploymentYoYPct: 4.5, // BLS_FL constructionYoY
    truckingWorkers: 68_239, // BLS_FL truckingWorkers
    workplaceFatalityRatePer100k: 2.9, // BLS_FL workplaceFatalityRate (snapshot rate tile)
    nationalWorkplaceFatalityRatePer100k: 3.3, // BLS_FL nationalWorkplaceRate
    hispanicWorkerFatalitySharePct: 42, // BLS_FL hispanicSharePct
    constructionFallsSharePct: 23, // BLS_FL fallsSharePct (vs 17% national)
  },

  commuteStats: {
    driveAlone: 72.1, // legacy COMMUTE_FL driveAlone
    nationalAvg: 68.7,
    avgCommuteMinutes: 28, // ACS FL mean commute ~27.8 min (not rendered; autoAudience set)
  },

  competitiveData: floridaCompetitiveData,

  content: {
    heroSubtitle:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Florida — combining accident data, demographics, judicial profiles, and market opportunity signals across MVA, trucking, motorcycle, construction, and boating. Major metros: Miami–Fort Lauderdale, Tampa, Orlando, Jacksonville, and Fort Myers. Population ~22.6M, ~27% Hispanic.",

    legalLandscape:
      "Florida shifted from pure comparative to modified comparative negligence (51% bar) in 2023 via tort reform (HB 837) — plaintiffs must now be less than 51% at fault to recover, and the PI statute of limitations was cut from four years to two. The change narrowed the window for marginal cases, but Florida remains a strong plaintiff state: no non-economic damage caps for personal injury, historically high jury verdicts, and one of the largest population bases in the nation.",

    // Verdict-card one-liner (the fuller HB 837 story lives in legalLandscape +
    // the cross-signal insights).
    viabilityNote:
      "Strong plaintiff state — no non-economic PI caps and high jury verdicts — tempered by the 2023 HB 837 shift to modified comparative (51% bar) and a shortened 2-year SOL.",

    autoAudience:
      "Florida's I-4 corridor (Tampa–Orlando–Daytona) and South Florida (Miami–Fort Lauderdale–West Palm Beach) are the highest-volume markets. Target ages 25–44, with Spanish-language media critical in Miami-Dade (67% Hispanic).",
    autoMedia:
      "CTV/digital in Miami, Tampa, Orlando, and Jacksonville metros. Radio in the I-4 corridor. Spanish-language campaigns are mandatory in South Florida.",

    truckAudience:
      "Florida's position as a logistics terminus (ports of Miami, Jacksonville, Tampa) drives heavy truck traffic. I-95 and I-75 are primary corridors. Target passenger-vehicle occupants in truck-involved crashes.",
    truckMedia:
      "Billboard corridors along I-95 / I-75 / I-4. Digital geo-fencing at truck stops and distribution hubs.",

    motorcycleAudience:
      "Year-round riding season makes Florida a top motorcycle fatality state. Daytona Beach (Bike Week), South Florida, and the Gulf Coast are hotspots. Florida has no helmet requirement for riders over 21 carrying $10K+ insurance. Target males 35–64.",
    motorcycleMedia:
      "Year-round campaigns (no seasonal pause needed). Digital targeting motorcycle-interest audiences. CTV during Bike Week and Biketoberfest. Radio in Daytona, Fort Myers, and Tampa markets.",

    constructionAudience:
      "Florida's construction boom (628K workers, +4.5% growth) concentrates in South Florida, Orlando, Tampa, and Jacksonville. Hispanic workers are 42% of fatalities — Spanish-language outreach is critical. Falls are the #1 construction cause.",
    constructionMedia:
      "Spanish-language radio and digital in Miami-Dade, Broward, Orange, and Hillsborough. Target construction-worker communities and safety-supply stores. Geo-fence major development sites.",

    boatingAudience:
      "#1 boating-accident state. Monroe County (Florida Keys) and Miami-Dade lead. Target boat owners, marina communities, and fishing charters. Spring-break and summer peak seasons.",
    boatingMedia:
      "Seasonal digital + local radio around marinas and waterfront communities. Geo-target boat shows (Miami, Fort Lauderdale). CTV in Gulf Coast and Southeast FL markets.",

    ruralUrbanContext:
      "Florida's fatal crashes skew heavily toward rural-class roads despite the state's dense metros — sprawling suburban arterials with high speeds and inadequate pedestrian infrastructure drive a disproportionate share of deaths outside the urban cores.",

    judicialContext:
      "Miami-Dade, Broward, Hillsborough, Orange, and Duval are the largest filing venues. Judicial leanings vary between the South Florida and I-4 urban cores and the more conservative Panhandle and rural counties — venue selection matters.",

    askAiPageName: "Florida State Intelligence",
    askAiPageContext:
      "State-level intelligence for plaintiff firm advertising and case acquisition in Florida — combining FARS accident data, census demographics, judicial profiles, PI viability scores, storm events, boating accidents, cancer incidence, and market opportunity signals across MVA, trucking, motorcycle, construction, and boating.",
    footerSourcesLabel:
      "FARS (NHTSA), FLHSMV Crash Facts 2023, ACS 5-Year Estimates, BLS QCEW/CFOI, NOAA Storm Events, USCG Boating Accidents, Judicial Profile Data",

    // Bespoke Cross-Signal Insight cards — all six ported from the legacy page.
    customInsights: [
      {
        icon: "🏙️",
        tone: "teal",
        title: "South Florida: Nation's Densest PI Market",
        stats: [
          { label: "Miami-Dade + Broward + Palm Beach population", value: "6.1M" },
          { label: "Combined fatal crashes (FARS)", value: "3,500+" },
          { label: "Spanish-speaking population (Miami-Dade)", value: "67%" },
        ],
        body: "South Florida is the most competitive PI advertising market in the U.S. — saturated with plaintiff firms. Differentiation requires Spanish-language creative, community presence, and hyper-local targeting in underserved areas of Broward and Palm Beach versus over-served Miami-Dade.",
      },
      {
        icon: "⚠️",
        tone: "red",
        title: "The I-4 Corridor: Florida's Deadliest Road",
        stats: [
          { label: "Route", value: "Tampa → Orlando → Daytona" },
          { label: "Ranking", value: "Among America's most dangerous interstates" },
          { label: "Counties along the route", value: "Hillsborough · Orange · Volusia" },
        ],
        body: "The I-4 corridor through central Florida is consistently ranked among the deadliest interstates in the U.S. Construction zones, tourist traffic, and high-speed design contribute to fatalities. Geo-fenced campaigns along I-4 with accident-triggered ad sequences can reach victims in the critical 24–72 hour window.",
      },
      {
        icon: "⚓",
        tone: "teal",
        title: "Florida Keys: Boating Accident Capital",
        stats: [
          { label: "Monroe County boating accidents", value: "425 (most in state)" },
          { label: "Monroe County boating deaths", value: "26" },
          { label: "Vessel mix", value: "Commercial fishing · charter · recreational" },
        ],
        body: "Monroe County's extreme boating-accident concentration creates a niche PI market most firms overlook. Tourism-driven seasonal patterns (winter/spring peak) align with snowbird arrivals. Targeted campaigns during high season in Key West, Marathon, and Islamorada reach both local and visiting victims.",
      },
      {
        icon: "👷",
        tone: "amber",
        title: "Construction Boom + Hispanic Workforce = Underserved Market",
        stats: [
          { label: "Construction workers", value: "628,001 (+4.5% YoY)" },
          { label: "Hispanic share of workplace fatalities", value: "42%" },
          { label: "Construction fatalities (2024)", value: "88" },
        ],
        body: "Florida's construction boom employs over 628K workers, with Hispanic workers disproportionately represented in both the workforce and fatalities. Spanish-language PI advertising for workplace injuries is significantly underserved relative to demand. Firms offering bilingual intake and culturally competent outreach have a structural advantage.",
      },
      {
        icon: "🌀",
        tone: "amber",
        title: "Hurricane Season: Compound Risk Window",
        stats: [
          { label: "Hurricane events / deaths (NOAA)", value: "73 / 99" },
          { label: "Tropical-storm events", value: "538" },
          { label: "Season", value: "June–November" },
        ],
        body: "Florida's June–November hurricane season creates compound risk — traffic accidents during evacuations, property damage, workplace injuries during cleanup, and boating incidents. Storm-triggered advertising campaigns can be pre-built and activated when named storms approach. Post-storm, target cleanup workers and displaced residents.",
      },
      {
        icon: "🚶",
        tone: "red",
        title: "Pedestrian & Cyclist Fatality Crisis",
        stats: [
          { label: "Pedestrian fatalities (2023)", value: "791" },
          { label: "Cyclist fatalities (2023)", value: "234" },
          { label: "National rank", value: "#1 pedestrian fatality rate" },
        ],
        body: "Florida has the highest pedestrian fatality rate in the nation, concentrated in sprawling suburban areas with inadequate sidewalks. Orlando, Tampa, and Jacksonville metros are worst. This is a distinct case type from MVA — target walk-to-work demographics, transit users, and cycling communities with separate campaigns.",
      },
    ],
  },
};
