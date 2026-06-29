import type {
  CompetitiveLandscapeData,
} from "@/lib/data/competitive-landscape/types";

export interface TrafficStatsBlock {
  totalCrashes: number;
  totalFatalities: number;
  /** null = not reported / unavailable in source data for this state */
  motorcycleFatalities: number | null;
  /** null = not reported / unavailable in source data for this state */
  speedRelatedFatalities: number | null;
  /** null when speedRelatedFatalities is null */
  speedRelatedPct: number | null;
  /** null = not reported / unavailable in source data for this state */
  alcoholRelatedFatalities: number | null;
  /** null when alcoholRelatedFatalities is null */
  alcoholRelatedPct: number | null;
  unrestrainedFatalities: number;
  distractedDrivingFatalCrashes: number;
  /** null = not reported / unavailable in source data for this state */
  urbanFatalities: number | null;
  /** null = not reported / unavailable in source data for this state */
  ruralFatalities: number | null;
  /** Year of source data (e.g. 2024 means "TDOSHS 2024 report") */
  reportYear: number;
  /** Source label shown in footnotes, e.g. "TDOSHS 2024" or "TxDOT CRIS 2024" */
  sourceLabel: string;
  /**
   * Override source label for the fatality tiles (Annual Fatalities, Rural
   * Share, Alcohol-Related). Set when fatality fields come from a different
   * source than the rest of the block (e.g. FARS preliminary on a state-DOT
   * block). Falls back to sourceLabel when absent.
   */
  fatalitiesSourceLabel?: string;
  /**
   * Override report year for the fatality tiles. Set when FARS year differs
   * from the block-level reportYear (e.g. FARS 2024 on a 2023 state-DOT
   * block). Falls back to reportYear when absent.
   */
  fatalitiesReportYear?: number;

  /* --- Optional bespoke metrics (Phase 3 legacy-migration fidelity) --- */
  /** Registered motorcycles (AZ, CA moto cards). */
  registeredMotorcycles?: number;
  /** Traffic fatality rate per 100M VMT (CA, FL snapshot rate tile). */
  fatalityRatePerVmt?: number;
  /** National traffic fatality rate per 100M VMT, for the comparison sublabel. */
  nationalFatalityRatePerVmt?: number;
  /** Pedestrian fatalities (CA, FL). */
  pedestrianFatalities?: number;
  /** Bicycle fatalities (CA, FL). */
  bicycleFatalities?: number;
  /** Hit-and-run fatal crashes (CA). */
  hitAndRunFatalCrashes?: number;
  /** Motorcycle helmet-use rate, % (CA). */
  helmetUsePct?: number;
  /** Motorcycle fatality rate per 100K registered motorcycles (CA). */
  motorcycleFatalityRatePer100k?: number;
}

export interface WorkplaceStatsBlock {
  totalEmployment: number;
  qcewCoveredEmployment: number;
  totalWorkplaceFatalities: number;
  constructionFatalities: number;
  constructionPctTotal: number;
  transportWarehouseFatalities: number;
  /** null = not reported / unavailable in BLS CFOI state breakout for this state */
  truckTransportFatalities: number | null;
  fallsSlipsTrips: number;
  transportationIncidents: number;
  reportYear: number;

  /* --- Optional bespoke metrics (Phase 3 legacy-migration fidelity) --- */
  /** Construction-sector employment (CA, FL construction cards). */
  constructionWorkers?: number;
  /** Construction employment YoY % change (FL). */
  constructionEmploymentYoYPct?: number;
  /** Trucking-sector employment (CA, FL truck cards). */
  truckingWorkers?: number;
  /** Average annual trucking pay, USD (CA). */
  truckingAvgPay?: number;
  /** Workplace fatality rate per 100K FTE (CA, FL snapshot rate tile). */
  workplaceFatalityRatePer100k?: number;
  /** National workplace fatality rate per 100K FTE, for the comparison sublabel. */
  nationalWorkplaceFatalityRatePer100k?: number;
  /** Hispanic-worker fatality count (AZ). */
  hispanicWorkerFatalities?: number;
  /** Hispanic share of workplace fatalities, % (AZ, CA, FL). */
  hispanicWorkerFatalitySharePct?: number;
  /** Falls/slips/trips share of construction fatalities, % (FL). */
  constructionFallsSharePct?: number;
}

export interface CommuteStatsBlock {
  driveAlone: number;
  /** National average for context (commonly 68.7) */
  nationalAvg: number;
  avgCommuteMinutes: number;
}

export interface InjuryDataRow {
  year: number;
  county: string;
  fatal: number;
  seriousInjury: number;
  minorInjury: number;
  possibleInjury: number;
  noInjury: number;
  unknown: number;
  total: number;
}

export interface StateInjuryData {
  rows: InjuryDataRow[];
  years: number[];
  latestYear: number;
  /** Display name for the data source, e.g. "Tennessee TITAN" */
  sourceName: string;
  /** URL to the source's public page (for "Source: ..." link) */
  sourceUrl: string;
  /**
   * Per-year display label for partial/incomplete years, e.g.
   * `{ 2022: "(through Nov 2022)" }` or `{ 2025: "(Jan–Sept)" }`. The v2 shell
   * reads this; when absent it falls back to `{ 2025: "(Jan–Sept)" }`.
   */
  partialYearLabels?: Record<number, string>;
}

/**
 * A bespoke cross-signal insight card. When `StateContent.customInsights` is
 * set, the v2 shell renders these in place of its 5 fixed title+tip cards —
 * holding legacy stat-lines + custom topics (heat/Navajo, cancer, hurricane,
 * pedestrian, lane-splitting, …) losslessly.
 */
export interface CustomInsight {
  /** lucide icon name or emoji; falls back to a default marker. */
  icon?: string;
  title: string;
  tone?: "teal" | "emerald" | "red" | "amber" | "steel";
  /** Per-card stat-lines, e.g. { label: "Diagnoses", value: "182,000+" }. */
  stats?: { label: string; value: string }[];
  /** The "so what" paragraph. */
  body: string;
}

export interface CrashEmbed {
  name: string;
  iframeSrc: string;
  height: number;
  description?: string;
}

/**
 * State-specific narrative blocks rendered in the page UI.
 * Each block is short prose that lives in a specific section of the page.
 * Falls back to generic text when omitted.
 */
export interface StateContent {
  /** Hero section subtitle / lede paragraph. */
  heroSubtitle?: string;

  /**
   * Design-D hero headline override. Plain text; when omitted the shared
   * StateHero renders the templated default ("We turn where accidents
   * actually happen…"). Hand-written copy wins when present.
   */
  heroTagline?: string;

  /** Verdict card override: PI-viability "so what" note. Falls back to a
   *  score/component-derived default. */
  viabilityNote?: string;
  /** Verdict card override: top-opportunity note. Falls back to a
   *  case-volume-derived default. */
  topOpportunityNote?: string;
  /** Verdict card override: competition note (e.g. named firms). Falls back to
   *  a derived note from the tracked competitor field. */
  competitionNote?: string;

  /** Section: Legal landscape. Negligence rule, SOL, damages caps. ~3-5 sentences. */
  legalLandscape?: string;

  /** Auto card: audience description. */
  autoAudience?: string;
  /** Auto card: recommended media mix. */
  autoMedia?: string;

  /** Truck card: audience description. */
  truckAudience?: string;
  /** Truck card: recommended media mix. */
  truckMedia?: string;

  /** Motorcycle card: audience description. */
  motorcycleAudience?: string;
  /** Motorcycle card: recommended media mix. */
  motorcycleMedia?: string;

  /** Construction card: audience description. */
  constructionAudience?: string;
  /** Construction card: recommended media mix. */
  constructionMedia?: string;

  /** Boating card: audience description. */
  boatingAudience?: string;
  /** Boating card: recommended media mix. */
  boatingMedia?: string;

  /** Pedestrian/Bicycle card: audience description (CA — replaces Boating). */
  pedBikeAudience?: string;
  /** Pedestrian/Bicycle card: recommended media mix (CA — replaces Boating). */
  pedBikeMedia?: string;

  /** Section: Rural/urban divide. Why rural fatalities matter. */
  ruralUrbanContext?: string;

  /** Section: Judicial profile mix. State-specific commentary on bench. */
  judicialContext?: string;

  /** Cross-signal insight: market saturation card. */
  marketSaturationTitle?: string;
  marketSaturationTip?: string;

  /** Cross-signal insight: freight / trucking corridor card. */
  freightCorridorTitle?: string;
  freightCorridorTip?: string;

  /** Section: SOL urgency tip. Used in cross-signal insights. */
  solUrgencyTitle?: string;
  solUrgencyTip?: string;

  /** Section: Internet access tip. Used in cross-signal insights. */
  internetAccessTitle?: string;
  internetAccessTip?: string;

  /** Section: Out-of-state riders / visitors tip. Used in cross-signal insights. */
  outOfStateTitle?: string;
  outOfStateTip?: string;

  /** AskAI / footer pageName — e.g. "Texas State Intelligence". */
  askAiPageName?: string;
  askAiPageContext?: string;
  askAiSourcesAvailable?: string[];
  footerSourcesLabel?: string;

  /** Bullet list of 3-5 key takeaways. Optional. */
  keyTakeaways?: string[];

  /**
   * Bespoke cross-signal insight cards. When set, the v2 shell renders these
   * instead of its 5 fixed Cross-Signal Insight cards (used to port the legacy
   * pages' stat-line + custom-topic insights losslessly).
   */
  customInsights?: CustomInsight[];
}

export interface StateFeatureFlags {
  /** All default to true. Set to false to hide a section. */
  showWorkplaceSection?: boolean;
  showStormSummary?: boolean;
  showBoatingSummary?: boolean;
  showJudicialProfiles?: boolean;
  showCensusDemographics?: boolean;
  showMsaDemographics?: boolean;
  showRuralUrban?: boolean;
  /** Defaults to (injuryData != null) — show only when data is supplied */
  showInjuryTable?: boolean;
  /** Defaults to (crashEmbeds != null) */
  showCrashEmbeds?: boolean;
  /**
   * Render the native FARS "Crash Intelligence" charts section (yearly
   * fatality trend, top-10 counties, fatalities-by-crash-type). Defaults to
   * off; set true to opt in (GA). Requires the page to fetch farsYearlyTrend
   * / farsTopCounties — null-safe when the data is absent.
   */
  showCrashIntelligence?: boolean;
  /**
   * Render the Pedestrian/Bicycle case-type card in place of the Boating card
   * (CA). Defaults to off. When true, the Boating card is suppressed for this
   * state and the Ped/Bike card is driven by trafficStats.pedestrianFatalities
   * / bicycleFatalities / hitAndRunFatalCrashes + content.pedBikeAudience/Media.
   */
  showPedBikeCard?: boolean;
  /**
   * Use the larger numbered section headings ("01  Overview", text-2xl). This is
   * the DEFAULT for all states; set false to fall back to the small uppercase
   * eyebrow dividers.
   */
  numberedSectionHeadings?: boolean;
}

export interface StateConfig {
  /* Identity */
  /** URL slug, e.g. "tennessee" */
  slug: string;
  /** Two-letter state code, e.g. "TN" */
  stateCode: string;
  /** Full name, e.g. "Tennessee" — used in storm RPC (which uses full names) and headings */
  stateName: string;

  /* Page metadata */
  metadata: {
    title: string;
    description: string;
  };

  /* State-specific stats blocks (required) */
  trafficStats: TrafficStatsBlock;
  workplaceStats: WorkplaceStatsBlock;
  commuteStats: CommuteStatsBlock;

  /* Competitive landscape data (required) */
  competitiveData: CompetitiveLandscapeData;

  /* Optional content blocks */
  content?: StateContent;

  /* Optional deep data */
  injuryData?: StateInjuryData;
  crashEmbeds?: CrashEmbed[];

  /* Optional feature flags */
  features?: StateFeatureFlags;
}
