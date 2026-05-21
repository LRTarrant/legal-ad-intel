/**
 * Shared FAERS signal machinery for tort pages.
 *
 * Three signals, computed live from the ingested FAERS dataset
 * (drug_adverse_events ~1.58M / drug_adverse_event_drugs ~8.16M /
 * drug_adverse_event_reactions ~5.57M rows):
 *   1. Drug-by-drug breakdown  - per brand: qualifying events, top reactions,
 *      % serious-death, % serious-hospitalization.
 *   2. Reporting-source concentration - per-brand consumer / lawyer report
 *      share vs the dataset-wide baseline (a litigation-activity signal).
 *   3. Trend - monthly qualifying-event counts per brand.
 *
 * Data access: two STABLE SECURITY INVOKER RPCs,
 * faers_drug_breakdown_by_reactions / faers_monthly_trend_by_reactions
 * (migration 20260521120000). PostgREST cannot GROUP BY across the FAERS
 * three-way join, so the aggregation runs in the database.
 *
 * Drug matching uses EXACT medicinalproduct strings, not substring ILIKE: a
 * full-table ILIKE scan over 8.16M drug rows exceeds the 8s statement timeout.
 * Per-tort brand maps and MedDRA preferred-term lists are facts about the data
 * shape (verified against the live dataset), hard-coded per tort in the
 * faers-<tort>.ts config files.
 *
 * This module holds the tort-agnostic parts: types, the pure shaping logic,
 * and the cached fetch entry point. Per-tort config (brand map, reaction PTs,
 * baseline, editorial copy) lives in faers-glp1.ts / faers-depo-provera.ts.
 */

import { unstable_cache } from "next/cache";
import { getSupabase } from "@/lib/supabase";

/* ------------------------------------------------------------------ */
/*  Concentration signal - the dual-proxy framing                       */
/* ------------------------------------------------------------------ */

/**
 * Which reporting-source share is the litigation signal for a tort.
 *
 * FAERS tags every report with a primary-source qualification. Two of those
 * codes are litigation tells, and which one to surface depends on how mature
 * the tort is:
 *
 *   "consumer"  - PRE-MDL / early torts. Mass-tort claimant intake routes
 *                 through the manufacturer and stays tagged qualification = 5
 *                 (consumer). A per-drug consumer share ABOVE the 36.6%
 *                 dataset baseline (FAERS_CONSUMER_BASELINE_PCT) is an
 *                 INDIRECT lawyer-flood proxy - intake is happening but firms
 *                 are not yet filing FAERS reports under their own name.
 *
 *   "lawyer"    - MATURE MDLs. Plaintiff firms file FAERS reports DIRECTLY as
 *                 qualification = 4 (lawyer). A per-drug lawyer share above
 *                 the 0.73% dataset baseline (FAERS_LAWYER_BASELINE_PCT) is
 *                 DIRECT litigation-activity evidence, not a proxy. Example:
 *                 Depo-Provera meningioma reports are ~95% lawyer-sourced.
 *
 * Both signals are statistically meaningful only at ~200+ qualifying events
 * for the drug; below that the proxy is noisy. Picking the wrong mode INVERTS
 * the signal - a mature MDL read in "consumer" mode looks quiet because its
 * reports are lawyer-tagged, not consumer-tagged. Choose the mode from the
 * tort's litigation stage before wiring the LiveFaersSignals component.
 */
export type ConcentrationMode = "consumer" | "lawyer";

/**
 * Consumer-report share across the full FAERS dataset
 * (primarysource_qualification = 5; 579,614 of 1,583,293 events = 36.61% as of
 * 2026-03-31). Stable dataset-wide figure - a constant, not recomputed.
 */
export const FAERS_CONSUMER_BASELINE_PCT = 36.6;

/**
 * Lawyer-report share across the full FAERS dataset
 * (primarysource_qualification = 4; 11,534 of 1,583,293 events = 0.73% as of
 * 2026-03-31). The denominator a mature-MDL drug's lawyer share is read
 * against.
 */
export const FAERS_LAWYER_BASELINE_PCT = 0.73;

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type FaersTrendDirection =
  | "accelerating"
  | "stable"
  | "declining"
  | "insufficient";

export interface FaersReaction {
  pt: string;
  count: number;
}

export interface FaersTrendPoint {
  /** First day of the month, ISO `YYYY-MM-DD`. */
  month: string;
  count: number;
}

export interface FaersDrugSignal {
  brand: string;
  totalEvents: number;
  deaths: number;
  hospitalizations: number;
  consumerReports: number;
  lawyerReports: number;
  /** Percentages, 0-100, one decimal. */
  deathPct: number;
  hospitalizationPct: number;
  consumerPct: number;
  lawyerPct: number;
  topReactions: FaersReaction[];
  trend: FaersTrendPoint[];
  trendDirection: FaersTrendDirection;
}

export interface FaersSignals {
  drugs: FaersDrugSignal[];
  /** Dataset baseline for the concentration signal (see ConcentrationMode). */
  baselinePct: number;
  /** Human-readable latest receivedate, e.g. "March 2026". */
  dataCurrentThrough: string | null;
  /** ISO `YYYY-MM-DD` first-of-month bounds of the trend window. */
  windowStart: string | null;
  windowEnd: string | null;
  /** False when the RPCs returned nothing (or errored) - page degrades gracefully. */
  hasData: boolean;
}

/**
 * Per-tort signal configuration. `brandMap` key order is the render order.
 */
export interface FaersSignalConfig {
  /** Stable identifier for the cache entry and logs, e.g. "depo-provera". */
  cacheKey: string;
  /** Ordered brand -> exact `medicinalproduct` strings. */
  brandMap: Record<string, string[]>;
  /** Exact MedDRA preferred terms defining the injury. */
  reactionPts: string[];
  /** Dataset baseline % for the concentration signal. */
  baselinePct: number;
}

/* ------------------------------------------------------------------ */
/*  RPC row shapes (migration 20260521120000)                           */
/* ------------------------------------------------------------------ */

interface BreakdownRow {
  brand: string;
  total_events: number;
  deaths: number;
  hospitalizations: number;
  consumer_reports: number;
  lawyer_reports: number;
  max_receivedate: string | null;
  top_reactions: FaersReaction[] | null;
}

interface TrendRow {
  brand: string;
  month: string;
  event_count: number;
}

/** Minimal typed view of the Supabase `.rpc()` surface (the generated
 *  database.types.ts does not yet describe these functions). */
type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const MONTH_FMT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function pct(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

/** "2026-03-31" -> "March 2026". */
function formatMonthYear(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const d = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return MONTH_FMT.format(d);
}

/**
 * Classify a monthly trend: compare the back half of the window to the front
 * half. Needs >= 4 months of data, else "insufficient".
 */
function classifyTrend(points: FaersTrendPoint[]): FaersTrendDirection {
  if (points.length < 4) return "insufficient";
  const mid = Math.floor(points.length / 2);
  const front = points.slice(0, mid);
  const back = points.slice(points.length - mid);
  const avg = (xs: FaersTrendPoint[]) =>
    xs.reduce((s, p) => s + p.count, 0) / (xs.length || 1);
  const frontAvg = avg(front);
  const backAvg = avg(back);
  if (frontAvg === 0) return backAvg > 0 ? "accelerating" : "stable";
  const ratio = backAvg / frontAvg;
  if (ratio >= 1.2) return "accelerating";
  if (ratio <= 0.8) return "declining";
  return "stable";
}

const EMPTY_SIGNALS = (config: FaersSignalConfig): FaersSignals => ({
  drugs: Object.keys(config.brandMap).map((brand) => ({
    brand,
    totalEvents: 0,
    deaths: 0,
    hospitalizations: 0,
    consumerReports: 0,
    lawyerReports: 0,
    deathPct: 0,
    hospitalizationPct: 0,
    consumerPct: 0,
    lawyerPct: 0,
    topReactions: [],
    trend: [],
    trendDirection: "insufficient",
  })),
  baselinePct: config.baselinePct,
  dataCurrentThrough: null,
  windowStart: null,
  windowEnd: null,
  hasData: false,
});

/* ------------------------------------------------------------------ */
/*  Fetch + shape                                                       */
/* ------------------------------------------------------------------ */

async function fetchFaersSignals(
  config: FaersSignalConfig,
): Promise<FaersSignals> {
  const sb = getSupabase() as unknown as RpcClient;

  const [breakdownRes, trendRes] = await Promise.all([
    sb.rpc("faers_drug_breakdown_by_reactions", {
      p_brand_map: config.brandMap,
      p_reaction_pts: config.reactionPts,
    }),
    sb.rpc("faers_monthly_trend_by_reactions", {
      p_brand_map: config.brandMap,
      p_reaction_pts: config.reactionPts,
    }),
  ]);

  if (breakdownRes.error) {
    throw new Error(
      `faers_drug_breakdown_by_reactions: ${breakdownRes.error.message}`,
    );
  }
  if (trendRes.error) {
    throw new Error(
      `faers_monthly_trend_by_reactions: ${trendRes.error.message}`,
    );
  }

  return shapeFaersSignals(
    Object.keys(config.brandMap),
    config.baselinePct,
    (breakdownRes.data ?? []) as BreakdownRow[],
    (trendRes.data ?? []) as TrendRow[],
  );
}

/**
 * Pure transform: raw RPC rows -> the shape the page consumes. Kept separate
 * from the network call so it can be unit-tested with mocked RPC responses.
 * `brands` is the canonical render order (brand-map key order).
 */
function shapeFaersSignals(
  brands: string[],
  baselinePct: number,
  breakdown: BreakdownRow[],
  trend: TrendRow[],
): FaersSignals {
  // Group trend rows by brand, chronologically.
  const trendByBrand = new Map<string, FaersTrendPoint[]>();
  for (const row of trend) {
    const month = String(row.month).slice(0, 10);
    const list = trendByBrand.get(row.brand) ?? [];
    list.push({ month, count: Number(row.event_count) || 0 });
    trendByBrand.set(row.brand, list);
  }
  for (const list of trendByBrand.values()) {
    list.sort((a, b) => a.month.localeCompare(b.month));
  }

  // Render brands in the supplied canonical order.
  const byBrand = new Map(breakdown.map((r) => [r.brand, r]));
  const drugs: FaersDrugSignal[] = [];
  for (const brand of brands) {
    const row = byBrand.get(brand);
    const total = Number(row?.total_events) || 0;
    const deaths = Number(row?.deaths) || 0;
    const hosp = Number(row?.hospitalizations) || 0;
    const consumer = Number(row?.consumer_reports) || 0;
    const lawyer = Number(row?.lawyer_reports) || 0;
    const points = trendByBrand.get(brand) ?? [];
    drugs.push({
      brand,
      totalEvents: total,
      deaths,
      hospitalizations: hosp,
      consumerReports: consumer,
      lawyerReports: lawyer,
      deathPct: pct(deaths, total),
      hospitalizationPct: pct(hosp, total),
      consumerPct: pct(consumer, total),
      lawyerPct: pct(lawyer, total),
      topReactions: (row?.top_reactions ?? []).map((r) => ({
        pt: r.pt,
        count: Number(r.count) || 0,
      })),
      trend: points,
      trendDirection: classifyTrend(points),
    });
  }

  // Latest receivedate across all brands.
  const maxDates = breakdown
    .map((r) => r.max_receivedate)
    .filter((d): d is string => Boolean(d))
    .sort();
  const dataCurrentThrough = formatMonthYear(maxDates[maxDates.length - 1] ?? null);

  // Trend window bounds across all brands.
  const allMonths = trend.map((r) => String(r.month).slice(0, 10)).sort();

  return {
    drugs,
    baselinePct,
    dataCurrentThrough,
    windowStart: allMonths[0] ?? null,
    windowEnd: allMonths[allMonths.length - 1] ?? null,
    hasData: drugs.some((d) => d.totalEvents > 0),
  };
}

/* ------------------------------------------------------------------ */
/*  Public, cached entry point                                          */
/* ------------------------------------------------------------------ */

/** 7 days - the underlying FAERS data refreshes on a weekly cron. */
const REVALIDATE_SECONDS = 60 * 60 * 24 * 7;

const getCachedFaersSignals = unstable_cache(
  (config: FaersSignalConfig) => fetchFaersSignals(config),
  ["faers-signals"],
  { revalidate: REVALIDATE_SECONDS, tags: ["faers-signals"] },
);

/**
 * Fetch the three live FAERS signals for a tort page. Cached for 7 days
 * (matches the weekly data cron). Never throws - on failure returns an empty,
 * `hasData: false` structure so the page degrades gracefully.
 */
export async function getFaersSignals(
  config: FaersSignalConfig,
): Promise<FaersSignals> {
  try {
    return await getCachedFaersSignals(config);
  } catch (err) {
    console.error(`[faers-signals] ${config.cacheKey} failed:`, err);
    return EMPTY_SIGNALS(config);
  }
}

/** Exported for unit tests - pure shaping logic without the network call. */
export const __test = { shapeFaersSignals, classifyTrend, formatMonthYear, pct };
