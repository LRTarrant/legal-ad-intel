import type {
  CompetitiveLandscapeData,
} from "@/lib/data/competitive-landscape/types";

export interface TrafficStatsBlock {
  totalCrashes: number;
  totalFatalities: number;
  motorcycleFatalities: number;
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
}

export interface StateFeatureFlags {
  /** All default to true. Set to false to hide a section. */
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
