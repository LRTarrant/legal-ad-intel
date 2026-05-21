/**
 * Live FAERS signals for the GLP-1 tort pages (gastroparesis & vision-loss).
 *
 * Three signals, all sourced from the ingested FAERS dataset
 * (~1.58M events, 2024-01 .. 2026-03):
 *   1. Drug-by-drug breakdown  - per brand: qualifying events, top reactions,
 *      % serious-death, % serious-hospitalization.
 *   2. Consumer-report concentration - per-brand consumer-report share vs the
 *      dataset-wide baseline (lawyer-flood proxy).
 *   3. Trend - monthly qualifying-event counts per brand.
 *
 * Data access: two STABLE SECURITY INVOKER RPCs (migration 20260521000000).
 * PostgREST cannot GROUP BY across the FAERS three-way join, so the aggregation
 * runs in the database. See web/lib/supabase.ts for why aggregation must not be
 * pulled row-by-row to the client.
 *
 * Drug matching uses EXACT medicinalproduct strings, not substring ILIKE:
 * a full-table ILIKE scan over 8.16M drug rows exceeds the 8s statement
 * timeout, and exact match is served by the existing
 * idx_drug_adverse_event_drugs_medicinalproduct btree index. The brand ->
 * string map and MedDRA preferred-term lists below are facts about the data
 * shape (verified against the live dataset), hard-coded by design.
 */

import { unstable_cache } from "next/cache";
import { getSupabase } from "@/lib/supabase";

/* ------------------------------------------------------------------ */
/*  Constants - data-shape facts (see PR notes for derivation)          */
/* ------------------------------------------------------------------ */

export const GLP1_BRANDS = [
  "Ozempic",
  "Wegovy",
  "Rybelsus",
  "Mounjaro",
  "Zepbound",
] as const;

export type Glp1Brand = (typeof GLP1_BRANDS)[number];

/**
 * Exact `medicinalproduct` strings per brand. Bare uppercase brand names
 * dominate (>99% of each brand's volume). Bare "SEMAGLUTIDE" / "TIRZEPATIDE"
 * are deliberately excluded - generic-only reports cannot be attributed to a
 * single brand. Long-tail dosage/format variants ("OZEMPIC INJ 2MG/3ML" etc.)
 * are excluded (<1% of volume); documented in the on-page methodology note.
 */
export const GLP1_BRAND_MAP: Record<Glp1Brand, string[]> = {
  Ozempic: ["OZEMPIC"],
  Wegovy: ["WEGOVY"],
  Rybelsus: ["RYBELSUS"],
  Mounjaro: ["MOUNJARO"],
  Zepbound: ["ZEPBOUND"],
};

/**
 * Gastroparesis-spectrum MedDRA preferred terms. The dataset has NO literal
 * "Gastroparesis" PT - its canonical term is "Impaired gastric emptying".
 * Obstruction / ileus PTs are the gastroparesis-spectrum injuries named in
 * MDL 3094.
 */
export const GASTROPARESIS_REACTION_PTS = [
  "Impaired gastric emptying",
  "Intestinal obstruction",
  "Ileus",
  "Small intestinal obstruction",
  "Ileus paralytic",
  "Large intestinal obstruction",
  "Gastrointestinal obstruction",
  "Diabetic gastroparesis",
  "Distal intestinal obstruction syndrome",
];

/**
 * NAION / optic-neuropathy / vision-loss MedDRA preferred terms. The dataset
 * has NO literal "NAION" PT - "Optic ischaemic neuropathy" is the closest
 * preferred term and the core MDL 3163 injury. Non-ischemic ocular-surface
 * terms (Eye pain, Dry eye, etc.) and `%papill%` false positives (Papillary
 * thyroid cancer) are deliberately excluded.
 */
export const VISION_LOSS_REACTION_PTS = [
  "Optic ischaemic neuropathy",
  "Visual impairment",
  "Vision blurred",
  "Blindness",
  "Blindness unilateral",
  "Optic neuritis",
  "Blindness transient",
  "Visual field defect",
  "Papilloedema",
  "Visual acuity reduced",
  "Optic nerve disorder",
  "Optic neuropathy",
  "Ocular stroke",
  "Optic atrophy",
  "Optic nerve injury",
  "Optic disc oedema",
  "Amaurosis fugax",
  "Tunnel vision",
  "Eye infarction",
  "Optic disc haemorrhage",
];

/**
 * Consumer-report share across the full FAERS dataset
 * (primarysource_qualification = 5; 579,614 of 1,583,293 events = 36.61% as of
 * 2026-03-31). Stable dataset-wide figure - a constant, not recomputed per
 * request. A per-brand share materially above this baseline is consistent with
 * active claimant intake (mass-tort consumer intake routes through
 * manufacturers and stays tagged 5=consumer). Preliminary signal only.
 */
export const FAERS_CONSUMER_BASELINE_PCT = 36.6;

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type FaersPage = "gastroparesis" | "vision_loss";

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
  /** Percentages, 0-100, one decimal. */
  deathPct: number;
  hospitalizationPct: number;
  consumerPct: number;
  topReactions: FaersReaction[];
  trend: FaersTrendPoint[];
  trendDirection: FaersTrendDirection;
}

export interface FaersGlp1Signals {
  page: FaersPage;
  drugs: FaersDrugSignal[];
  consumerBaselinePct: number;
  /** Human-readable latest receivedate, e.g. "March 2026". */
  dataCurrentThrough: string | null;
  /** ISO `YYYY-MM-DD` first-of-month bounds of the trend window. */
  windowStart: string | null;
  windowEnd: string | null;
  /** False when the RPCs returned nothing (or errored) - page degrades gracefully. */
  hasData: boolean;
}

/* ------------------------------------------------------------------ */
/*  RPC row shapes (migration 20260521000000)                           */
/* ------------------------------------------------------------------ */

interface BreakdownRow {
  brand: string;
  total_events: number;
  deaths: number;
  hospitalizations: number;
  consumer_reports: number;
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

const EMPTY_SIGNALS = (page: FaersPage): FaersGlp1Signals => ({
  page,
  drugs: [],
  consumerBaselinePct: FAERS_CONSUMER_BASELINE_PCT,
  dataCurrentThrough: null,
  windowStart: null,
  windowEnd: null,
  hasData: false,
});

/* ------------------------------------------------------------------ */
/*  Fetch + shape                                                       */
/* ------------------------------------------------------------------ */

async function fetchFaersGlp1Signals(page: FaersPage): Promise<FaersGlp1Signals> {
  const reactionPts =
    page === "gastroparesis"
      ? GASTROPARESIS_REACTION_PTS
      : VISION_LOSS_REACTION_PTS;

  const sb = getSupabase() as unknown as RpcClient;

  const [breakdownRes, trendRes] = await Promise.all([
    sb.rpc("faers_glp1_drug_breakdown", {
      p_brand_map: GLP1_BRAND_MAP,
      p_reaction_pts: reactionPts,
    }),
    sb.rpc("faers_glp1_monthly_trend", {
      p_brand_map: GLP1_BRAND_MAP,
      p_reaction_pts: reactionPts,
    }),
  ]);

  if (breakdownRes.error) {
    throw new Error(`faers_glp1_drug_breakdown: ${breakdownRes.error.message}`);
  }
  if (trendRes.error) {
    throw new Error(`faers_glp1_monthly_trend: ${trendRes.error.message}`);
  }

  return shapeFaersSignals(
    page,
    (breakdownRes.data ?? []) as BreakdownRow[],
    (trendRes.data ?? []) as TrendRow[],
  );
}

/**
 * Pure transform: raw RPC rows -> the shape the page consumes. Kept separate
 * from the network call so it can be unit-tested with mocked RPC responses.
 */
function shapeFaersSignals(
  page: FaersPage,
  breakdown: BreakdownRow[],
  trend: TrendRow[],
): FaersGlp1Signals {
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

  // Render brands in the canonical GLP1_BRANDS order.
  const byBrand = new Map(breakdown.map((r) => [r.brand, r]));
  const drugs: FaersDrugSignal[] = [];
  for (const brand of GLP1_BRANDS) {
    const row = byBrand.get(brand);
    const total = Number(row?.total_events) || 0;
    const deaths = Number(row?.deaths) || 0;
    const hosp = Number(row?.hospitalizations) || 0;
    const consumer = Number(row?.consumer_reports) || 0;
    const points = trendByBrand.get(brand) ?? [];
    drugs.push({
      brand,
      totalEvents: total,
      deaths,
      hospitalizations: hosp,
      consumerReports: consumer,
      deathPct: pct(deaths, total),
      hospitalizationPct: pct(hosp, total),
      consumerPct: pct(consumer, total),
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
    page,
    drugs,
    consumerBaselinePct: FAERS_CONSUMER_BASELINE_PCT,
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

const getCachedFaersGlp1Signals = unstable_cache(
  (page: FaersPage) => fetchFaersGlp1Signals(page),
  ["faers-glp1-signals"],
  { revalidate: REVALIDATE_SECONDS, tags: ["faers-glp1"] },
);

/**
 * Fetch the three live FAERS signals for a GLP-1 tort page. Cached for 7 days
 * (matches the weekly data cron). Never throws - on failure returns an empty,
 * `hasData: false` structure so the page degrades gracefully.
 */
export async function getFaersGlp1Signals(
  page: FaersPage,
): Promise<FaersGlp1Signals> {
  try {
    return await getCachedFaersGlp1Signals(page);
  } catch (err) {
    console.error("[faers-glp1] getFaersGlp1Signals failed:", err);
    return EMPTY_SIGNALS(page);
  }
}

/** Exported for unit tests - pure shaping logic without the network call. */
export const __test = { shapeFaersSignals, classifyTrend, formatMonthYear, pct };
