import nextDynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import {
  getJudicialProfiles,
  type JudicialProfileRow,
} from "@/lib/queries/judicial";
import { getStateConfig, STATE_SLUGS } from "@/lib/state-config";

const StateIntelligenceClient = nextDynamic(() =>
  import("./state-intelligence-client").then(
    (m) => m.StateIntelligenceClient,
  ),
);

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  Types for RPC results                                              */
/* ------------------------------------------------------------------ */

export interface AccidentSummaryRow {
  county: string;
  total_population: number | null;
  fatal_crashes: number;
  total_deaths: number;
  truck_deaths: number;
  moto_deaths: number;
  drunk_driver_crashes: number;
  deaths_per_100k: number | null;
  rural_pct: number | null;
  judicial_profile: string | null;
}

export interface RuralUrbanRow {
  category: string;
  fatal_crashes: number;
  total_deaths: number;
  total_population?: number | null;
  deaths_per_100k?: number | null;
  avg_deaths_per_100k?: number | null;
  avg_median_income: number | null;
  avg_poverty_pct: number | null;
  avg_internet_pct: number | null;
  avg_uninsured_pct: number | null;
}

export interface StormSummaryRow {
  event_type: string;
  event_count: number;
  total_deaths: number;
  total_injuries: number;
  total_property_damage: string | null;
}

export interface BoatingSummaryRow {
  county: string;
  accident_count: number;
  total_deaths: number;
  total_injuries: number;
  top_causes: string | null;
}

export interface PIViabilityRow {
  state: string;
  negligence_rule: string;
  statute_of_limitations: string;
  composite_score: number;
  avg_jury_verdict: number | string | null;
  non_economic_cap: string | null;
  punitive_cap: string | null;
  negligence_score: number | null;
  non_economic_score: number | null;
  punitive_score: number | null;
  med_mal_score: number | null;
  sol_score: number | null;
  verdict_score: number | null;
}

export interface CensusDemographicsRow {
  fips_full: string;
  state_abbr: string;
  county_name: string;
  total_population: number;
  median_age: number | null;
  pct_white: number | null;
  pct_black: number | null;
  pct_hispanic: number | null;
  pct_asian: number | null;
  pct_native: number | null;
  median_household_income: number | null;
  per_capita_income: number | null;
  pct_poverty: number | null;
  pct_uninsured: number | null;
  pct_employed: number | null;
  pct_with_internet: number | null;
  pct_disability: number | null;
  pct_veterans: number | null;
  mean_commute_minutes: number | null;
}

export interface MSADemographicsRow {
  cbsa_code: string;
  cbsa_title: string;
  total_population: number;
  median_household_income: number | null;
  pct_poverty: number | null;
  pct_uninsured: number | null;
  pct_employed: number | null;
}

/** Native FARS "Crash Intelligence" charts (GA, behind showCrashIntelligence). */
export interface FARSYearlyTrendRow {
  year: number;
  fatal_crashes: number;
  total_fatalities: number;
  motorcycle_fatalities: number;
  truck_fatalities: number;
  dui_fatalities: number;
}

export interface FARSTopCountyRow {
  county_name: string;
  fatalities: number;
}

export interface StateIntelligencePageData {
  accidentSummary: AccidentSummaryRow[];
  ruralUrban: RuralUrbanRow[];
  stormSummary: StormSummaryRow[];
  boatingSummary: BoatingSummaryRow[];
  piViability: PIViabilityRow | null;
  censusDemographics: CensusDemographicsRow[];
  msaDemographics: MSADemographicsRow[];
  judicialProfiles: JudicialProfileRow[];
  stormCount: number;
  /** Tracked PI-firm count for the "Competition" verdict card level. */
  competition: { count: number };
  /** Native FARS charts — only rendered when features.showCrashIntelligence. */
  farsYearlyTrend?: FARSYearlyTrendRow[];
  farsTopCounties?: FARSTopCountyRow[];
}

/* ------------------------------------------------------------------ */
/*  Static params + metadata                                           */
/* ------------------------------------------------------------------ */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const config = getStateConfig(slug);
  if (!config) return {};
  return {
    title: config.metadata.title,
    description: config.metadata.description,
  };
}

/* ------------------------------------------------------------------ */
/*  Data fetchers (parameterized by state)                             */
/* ------------------------------------------------------------------ */

async function fetchRpc<T>(
  fn: string,
  params: Record<string, string>,
): Promise<T[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    rpc: (
      f: string,
      p: Record<string, string>,
    ) => Promise<{ data: unknown; error: unknown }>;
  };
  const { data, error } = await sb.rpc(fn, params);
  if (error) throw error;
  return (data ?? []) as unknown as T[];
}

async function fetchPIViability(
  stateCode: string,
): Promise<PIViabilityRow[]> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("pi_viability_scores")
    .select("*")
    .eq("state", stateCode);
  if (error) throw error;
  return (data ?? []) as PIViabilityRow[];
}

async function fetchCensusDemographics(
  stateCode: string,
): Promise<CensusDemographicsRow[]> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("census_demographics")
    .select("*")
    .eq("state_abbr", stateCode)
    .order("total_population", { ascending: false });
  if (error) throw error;
  // Same string-from-PostgREST issue as MSA; coerce numerics defensively.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    fips_full: r.fips_full,
    state_abbr: r.state_abbr,
    county_name: r.county_name,
    total_population: toNum(r.total_population) ?? 0,
    median_age: toNum(r.median_age),
    pct_white: toNum(r.pct_white),
    pct_black: toNum(r.pct_black),
    pct_hispanic: toNum(r.pct_hispanic),
    pct_asian: toNum(r.pct_asian),
    pct_native: toNum(r.pct_native),
    median_household_income: toNum(r.median_household_income),
    per_capita_income: toNum(r.per_capita_income),
    pct_poverty: toNum(r.pct_poverty),
    pct_uninsured: toNum(r.pct_uninsured),
    pct_employed: toNum(r.pct_employed),
    pct_with_internet: toNum(r.pct_with_internet),
    pct_disability: toNum(r.pct_disability),
    pct_veterans: toNum(r.pct_veterans),
    mean_commute_minutes: toNum(r.mean_commute_minutes),
  })) as CensusDemographicsRow[];
}

/**
 * Coerce a value to number-or-null. The msa_demographics table stores some
 * numeric columns as text/numeric (PostgREST hands them back as strings),
 * which crashes downstream toFixed() calls. Normalize here so the client
 * component can trust the types.
 */
function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

async function fetchMSADemographics(
  stateCode: string,
): Promise<MSADemographicsRow[]> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("msa_demographics")
    .select("*")
    .like("cbsa_title", `%, ${stateCode}%`)
    .order("total_population", { ascending: false });
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    cbsa_code: r.cbsa_code,
    cbsa_title: r.cbsa_title,
    total_population: toNum(r.total_population) ?? 0,
    median_household_income: toNum(r.median_household_income),
    pct_poverty: toNum(r.pct_poverty),
    pct_uninsured: toNum(r.pct_uninsured),
    pct_employed: toNum(r.pct_employed),
  })) as MSADemographicsRow[];
}

/**
 * Yearly FARS fatality trend for the native "Crash Intelligence" charts
 * (GA, behind the showCrashIntelligence flag). Tries the get_fars_yearly_trend
 * RPC first, then falls back to aggregating the fars_fatalities table directly.
 */
async function fetchFARSYearlyTrend(
  stateCode: string,
): Promise<FARSYearlyTrendRow[]> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_fars_yearly_trend", {
    p_state: stateCode,
  });
  if (!error && data) return data as FARSYearlyTrendRow[];

  // Fallback: aggregate from fars_fatalities table directly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (supabase as any)
    .from("fars_fatalities")
    .select("year, fatalities, has_motorcycle, has_large_truck, drunk_drivers")
    .eq("state", stateCode)
    .gte("year", 2019)
    .lte("year", 2024);
  if (res.error) throw res.error;
  const rows = (res.data ?? []) as Array<{
    year: number;
    fatalities: number;
    has_motorcycle: boolean;
    has_large_truck: boolean;
    drunk_drivers: number;
  }>;

  const byYear = new Map<number, FARSYearlyTrendRow>();
  for (const r of rows) {
    let entry = byYear.get(r.year);
    if (!entry) {
      entry = {
        year: r.year,
        fatal_crashes: 0,
        total_fatalities: 0,
        motorcycle_fatalities: 0,
        truck_fatalities: 0,
        dui_fatalities: 0,
      };
      byYear.set(r.year, entry);
    }
    entry.fatal_crashes += 1;
    entry.total_fatalities += r.fatalities;
    if (r.has_motorcycle) entry.motorcycle_fatalities += r.fatalities;
    if (r.has_large_truck) entry.truck_fatalities += r.fatalities;
    if (r.drunk_drivers > 0) entry.dui_fatalities += r.fatalities;
  }
  return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
}

/** Top-10 counties by cumulative FARS fatalities (2020–2024). */
async function fetchFARSTopCounties(
  stateCode: string,
): Promise<FARSTopCountyRow[]> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("fars_fatalities")
    .select("county_name, fatalities")
    .eq("state", stateCode)
    .gte("year", 2020)
    .lte("year", 2024)
    .not("county_name", "is", null);
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    county_name: string;
    fatalities: number;
  }>;

  const byCounty = new Map<string, number>();
  for (const r of rows) {
    byCounty.set(
      r.county_name,
      (byCounty.get(r.county_name) ?? 0) + r.fatalities,
    );
  }
  return Array.from(byCounty.entries())
    .map(([county_name, fatalities]) => ({ county_name, fatalities }))
    .sort((a, b) => b.fatalities - a.fatalities)
    .slice(0, 10);
}

async function fetchStormCount(stateName: string): Promise<number> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error } = await (supabase as any)
    .from("storm_events")
    .select("*", { count: "exact", head: true })
    .eq("state", stateName);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Count of tracked PI-firm competitors for the state (all markets), used to
 * derive the "Competition" verdict-card level. Same RPC the client-side
 * Competitive Analysis section uses; we only need the row count here, so a
 * thin server call keeps the verdict card filled even before the client
 * section hydrates. Sparse states return 0 → an "Open field" card.
 */
async function fetchCompetitorCount(stateCode: string): Promise<number> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_pi_competitors_by_dma", {
    p_state: stateCode,
    p_dma_code: null,
  });
  if (error) throw error;
  return Array.isArray(data) ? data.length : 0;
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default async function StateIntelligencePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  console.log(`[v2/state-intel] [START] slug=${slug}`);

  let config;
  try {
    config = getStateConfig(slug);
  } catch (e) {
    console.error(`[v2/state-intel] [ERR] getStateConfig threw:`, e);
    throw e;
  }
  if (!config) {
    console.log(
      `[v2/state-intel] [404] No config for slug=${slug}. Available: ${STATE_SLUGS.join(", ")}`,
    );
    notFound();
  }
  console.log(
    `[v2/state-intel] [CFG] Loaded ${config.stateName} config. injuryData rows=${config.injuryData?.rows.length ?? 0}, crashEmbeds=${config.crashEmbeds?.length ?? 0}`,
  );

  const { stateCode, stateName } = config;

  let accidentSummary: AccidentSummaryRow[] = [];
  let ruralUrban: RuralUrbanRow[] = [];
  let stormSummary: StormSummaryRow[] = [];
  let boatingSummary: BoatingSummaryRow[] = [];
  let piViability: PIViabilityRow[] = [];
  let censusDemographics: CensusDemographicsRow[] = [];
  let msaDemographics: MSADemographicsRow[] = [];
  let judicialRows: JudicialProfileRow[] = [];
  let stormCount = 0;
  let competitorCount = 0;
  let farsYearlyTrend: FARSYearlyTrendRow[] = [];
  let farsTopCounties: FARSTopCountyRow[] = [];

  // Native FARS "Crash Intelligence" charts are GA-only today. Skip the two
  // fars_fatalities aggregation queries for the ~42 states that don't render
  // them (gated by the same flag the client uses) instead of querying on every
  // state-page load.
  const showCrashIntelligence =
    config.features?.showCrashIntelligence === true;

  const results = await Promise.allSettled([
    fetchRpc<AccidentSummaryRow>("get_state_accident_summary", {
      p_state: stateCode,
    }),
    fetchRpc<RuralUrbanRow>("get_state_rural_urban_comparison", {
      p_state: stateCode,
    }),
    fetchRpc<StormSummaryRow>("get_state_storm_summary", {
      p_state: stateName,
    }),
    fetchRpc<BoatingSummaryRow>("get_state_boating_summary", {
      p_state: stateCode,
    }),
    fetchPIViability(stateCode),
    fetchCensusDemographics(stateCode),
    fetchMSADemographics(stateCode),
    getJudicialProfiles(stateCode),
    fetchStormCount(stateName),
    fetchCompetitorCount(stateCode),
    showCrashIntelligence
      ? fetchFARSYearlyTrend(stateCode)
      : Promise.resolve([] as FARSYearlyTrendRow[]),
    showCrashIntelligence
      ? fetchFARSTopCounties(stateCode)
      : Promise.resolve([] as FARSTopCountyRow[]),
  ]);

  if (results[0].status === "fulfilled") {
    // Drop any rows with a null county; they crash client-side .toLowerCase()
    // calls in sort/filter/judicial-merge useMemos. Texas's RPC returns one
    // such row (a statewide-aggregate or unmapped FIPS); not useful in the
    // county table anyway.
    accidentSummary = results[0].value.filter(
      (r) => r.county !== null && r.county !== undefined,
    );
    const dropped = results[0].value.length - accidentSummary.length;
    if (dropped > 0) {
      console.log(
        `[v2/state-intel] Dropped ${dropped} accident_summary rows with null county for ${stateCode}`,
      );
    }
  } else
    console.error(
      `[${stateCode}] fetchAccidentSummary failed:`,
      results[0].reason,
    );

  if (results[1].status === "fulfilled") ruralUrban = results[1].value;
  else
    console.error(
      `[${stateCode}] fetchRuralUrbanComparison failed:`,
      results[1].reason,
    );

  if (results[2].status === "fulfilled") stormSummary = results[2].value;
  else
    console.error(
      `[${stateCode}] fetchStormSummary failed:`,
      results[2].reason,
    );

  if (results[3].status === "fulfilled") boatingSummary = results[3].value;
  else
    console.error(
      `[${stateCode}] fetchBoatingSummary failed:`,
      results[3].reason,
    );

  if (results[4].status === "fulfilled") piViability = results[4].value;
  else
    console.error(
      `[${stateCode}] fetchPIViability failed:`,
      results[4].reason,
    );

  if (results[5].status === "fulfilled")
    censusDemographics = results[5].value;
  else
    console.error(
      `[${stateCode}] fetchCensusDemographics failed:`,
      results[5].reason,
    );

  if (results[6].status === "fulfilled") msaDemographics = results[6].value;
  else
    console.error(
      `[${stateCode}] fetchMSADemographics failed:`,
      results[6].reason,
    );

  if (results[7].status === "fulfilled") judicialRows = results[7].value;
  else
    console.error(
      `[${stateCode}] getJudicialProfiles failed:`,
      results[7].reason,
    );

  if (results[8].status === "fulfilled") stormCount = results[8].value;
  else
    console.error(
      `[${stateCode}] fetchStormCount failed:`,
      results[8].reason,
    );

  if (results[9].status === "fulfilled") competitorCount = results[9].value;
  else
    console.error(
      `[${stateCode}] fetchCompetitorCount failed:`,
      results[9].reason,
    );

  if (results[10].status === "fulfilled") farsYearlyTrend = results[10].value;
  else
    console.error(
      `[${stateCode}] fetchFARSYearlyTrend failed:`,
      results[10].reason,
    );

  if (results[11].status === "fulfilled") farsTopCounties = results[11].value;
  else
    console.error(
      `[${stateCode}] fetchFARSTopCounties failed:`,
      results[11].reason,
    );

  const pageData: StateIntelligencePageData = {
    accidentSummary,
    ruralUrban,
    stormSummary,
    boatingSummary,
    piViability: piViability[0] ?? null,
    censusDemographics,
    msaDemographics,
    judicialProfiles: judicialRows,
    stormCount,
    competition: { count: competitorCount },
    farsYearlyTrend,
    farsTopCounties,
  };

  console.log(
    `[v2/state-intel] [DONE] ${config.stateName} pageData rows: accident=${pageData.accidentSummary.length} ruralUrban=${pageData.ruralUrban.length} census=${pageData.censusDemographics.length} judicial=${pageData.judicialProfiles.length}`,
  );

  return <StateIntelligenceClient config={config} data={pageData} />;
}
