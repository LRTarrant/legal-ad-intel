import type {
  CompetitiveLandscapeData,
} from "@/lib/data/competitive-landscape/types";

export interface TrafficStatsBlock {
  totalCrashes: number;
  totalFatalities: number;
  motorcycleFatalities: number;
  speedRelatedFatalities: number;
  speedRelatedPct: number;
  alcoholRelatedFatalities: number;
  alcoholRelatedPct: number;
  unrestrainedFatalities: number;
  distractedDrivingFatalCrashes: number;
  urbanFatalities: number;
  ruralFatalities: number;
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
  truckTransportFatalities: number;
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

export interface StateContent {
  /** Optional override for the hero subtitle. Falls back to a generic one. */
  heroSubtitle?: string;
  /** 1-2 paragraph state-specific narrative. Auto-generated for bulk launches; hand-written for top tiers. */
  massTortClimate?: string;
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
