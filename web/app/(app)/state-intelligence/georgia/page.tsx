import nextDynamic from "next/dynamic";
import { getSupabase } from "@/lib/supabase";
import type { GeorgiaPageData } from "./georgia-client";
import { getJudicialProfiles, type JudicialProfileRow } from "@/lib/queries/judicial";

const GeorgiaClient = nextDynamic(() => import("./georgia-client").then((m) => m.GeorgiaClient));

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return {
    title: "Georgia State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Georgia.",
  };
}

/* ------------------------------------------------------------------ */
/*  Types for RPC results                                              */
/* ------------------------------------------------------------------ */

interface AccidentSummaryRow {
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

interface RuralUrbanRow {
  category: string;
  fatal_crashes: number;
  total_deaths: number;
  total_population: number | null;
  deaths_per_100k: number | null;
  avg_deaths_per_100k: number | null;
  avg_median_income: number | null;
  avg_poverty_pct: number | null;
  avg_internet_pct: number | null;
  avg_uninsured_pct: number | null;
}

interface StormSummaryRow {
  event_type: string;
  event_count: number;
  total_deaths: number;
  total_injuries: number;
  total_property_damage: string | null;
}

interface BoatingSummaryRow {
  county: string;
  accident_count: number;
  total_deaths: number;
  total_injuries: number;
  top_causes: string | null;
}

interface PIViabilityRow {
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

interface CensusDemographicsRow {
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

interface MSADemographicsRow {
  cbsa_code: string;
  cbsa_title: string;
  total_population: number;
  median_household_income: number | null;
  pct_poverty: number | null;
  pct_uninsured: number | null;
  pct_employed: number | null;
}

/* ------------------------------------------------------------------ */
/*  Types for FARS crash chart data                                     */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Data-fetching helpers                                               */
/* ------------------------------------------------------------------ */

async function fetchAccidentSummary(): Promise<AccidentSummaryRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    rpc: (fn: string, params: Record<string, string>) => Promise<{ data: unknown; error: unknown }>;
  };
  const { data, error } = await sb.rpc("get_state_accident_summary", {
    p_state: "GA",
  });
  if (error) throw error;
  return (data ?? []) as unknown as AccidentSummaryRow[];
}

async function fetchRuralUrbanComparison(): Promise<RuralUrbanRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    rpc: (fn: string, params: Record<string, string>) => Promise<{ data: unknown; error: unknown }>;
  };
  const { data, error } = await sb.rpc(
    "get_state_rural_urban_comparison",
    { p_state: "GA" }
  );
  if (error) throw error;
  return (data ?? []) as unknown as RuralUrbanRow[];
}

async function fetchStormSummary(): Promise<StormSummaryRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    rpc: (fn: string, params: Record<string, string>) => Promise<{ data: unknown; error: unknown }>;
  };
  const { data, error } = await sb.rpc("get_state_storm_summary", {
    p_state: "Georgia",
  });
  if (error) throw error;
  return (data ?? []) as unknown as StormSummaryRow[];
}

async function fetchBoatingSummary(): Promise<BoatingSummaryRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    rpc: (fn: string, params: Record<string, string>) => Promise<{ data: unknown; error: unknown }>;
  };
  const { data, error } = await sb.rpc("get_state_boating_summary", {
    p_state: "GA",
  });
  if (error) throw error;
  return (data ?? []) as unknown as BoatingSummaryRow[];
}

async function fetchPIViability(): Promise<PIViabilityRow[]> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("pi_viability_scores")
    .select("*")
    .eq("state", "GA");
  if (error) throw error;
  return (data ?? []) as unknown as PIViabilityRow[];
}

async function fetchCensusDemographics(): Promise<CensusDemographicsRow[]> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("census_demographics")
    .select("*")
    .eq("state_abbr", "GA")
    .order("total_population", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as CensusDemographicsRow[];
}

async function fetchMSADemographics(): Promise<MSADemographicsRow[]> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("msa_demographics")
    .select("*")
    .like("cbsa_title", "%, GA%")
    .order("total_population", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MSADemographicsRow[];
}

async function fetchFARSYearlyTrend(): Promise<FARSYearlyTrendRow[]> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_fars_yearly_trend", {
    p_state: "GA",
  });
  if (!error && data) return data as FARSYearlyTrendRow[];

  // Fallback: aggregate from fars_fatalities table directly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (supabase as any)
    .from("fars_fatalities")
    .select("year, fatalities, has_motorcycle, has_large_truck, drunk_drivers")
    .eq("state", "GA")
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
      entry = { year: r.year, fatal_crashes: 0, total_fatalities: 0, motorcycle_fatalities: 0, truck_fatalities: 0, dui_fatalities: 0 };
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

async function fetchFARSTopCounties(): Promise<FARSTopCountyRow[]> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("fars_fatalities")
    .select("county_name, fatalities")
    .eq("state", "GA")
    .gte("year", 2020)
    .lte("year", 2024)
    .not("county_name", "is", null);
  if (error) throw error;
  const rows = (data ?? []) as Array<{ county_name: string; fatalities: number }>;

  const byCounty = new Map<string, number>();
  for (const r of rows) {
    byCounty.set(r.county_name, (byCounty.get(r.county_name) ?? 0) + r.fatalities);
  }
  return Array.from(byCounty.entries())
    .map(([county_name, fatalities]) => ({ county_name, fatalities }))
    .sort((a, b) => b.fatalities - a.fatalities)
    .slice(0, 10);
}

async function fetchStormCount(): Promise<number> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error } = await (supabase as any)
    .from("storm_events")
    .select("*", { count: "exact", head: true })
    .eq("state", "Georgia");
  if (error) throw error;
  return count ?? 0;
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                      */
/* ------------------------------------------------------------------ */

export default async function GeorgiaStatePage() {
  let accidentSummary: AccidentSummaryRow[] = [];
  let ruralUrban: RuralUrbanRow[] = [];
  let stormSummary: StormSummaryRow[] = [];
  let boatingSummary: BoatingSummaryRow[] = [];
  let piViability: PIViabilityRow[] = [];
  let censusDemographics: CensusDemographicsRow[] = [];
  let msaDemographics: MSADemographicsRow[] = [];
  let judicialRows: JudicialProfileRow[] = [];
  let stormCount = 0;
  let farsYearlyTrend: FARSYearlyTrendRow[] = [];
  let farsTopCounties: FARSTopCountyRow[] = [];

  const results = await Promise.allSettled([
    fetchAccidentSummary(),
    fetchRuralUrbanComparison(),
    fetchStormSummary(),
    fetchBoatingSummary(),
    fetchPIViability(),
    fetchCensusDemographics(),
    fetchMSADemographics(),
    getJudicialProfiles("GA"),
    fetchStormCount(),
    fetchFARSYearlyTrend(),
    fetchFARSTopCounties(),
  ]);

  if (results[0].status === "fulfilled") accidentSummary = results[0].value;
  else console.error("[Georgia] fetchAccidentSummary failed:", results[0].reason);

  if (results[1].status === "fulfilled") ruralUrban = results[1].value;
  else console.error("[Georgia] fetchRuralUrbanComparison failed:", results[1].reason);

  if (results[2].status === "fulfilled") stormSummary = results[2].value;
  else console.error("[Georgia] fetchStormSummary failed:", results[2].reason);

  if (results[3].status === "fulfilled") boatingSummary = results[3].value;
  else console.error("[Georgia] fetchBoatingSummary failed:", results[3].reason);

  if (results[4].status === "fulfilled") piViability = results[4].value;
  else console.error("[Georgia] fetchPIViability failed:", results[4].reason);

  if (results[5].status === "fulfilled") censusDemographics = results[5].value;
  else console.error("[Georgia] fetchCensusDemographics failed:", results[5].reason);

  if (results[6].status === "fulfilled") msaDemographics = results[6].value;
  else console.error("[Georgia] fetchMSADemographics failed:", results[6].reason);

  if (results[7].status === "fulfilled") judicialRows = results[7].value;
  else console.error("[Georgia] fetchJudicialProfiles failed:", results[7].reason);

  if (results[8].status === "fulfilled") stormCount = results[8].value;
  else console.error("[Georgia] fetchStormCount failed:", results[8].reason);

  if (results[9].status === "fulfilled") farsYearlyTrend = results[9].value;
  else console.error("[Georgia] fetchFARSYearlyTrend failed:", results[9].reason);

  if (results[10].status === "fulfilled") farsTopCounties = results[10].value;
  else console.error("[Georgia] fetchFARSTopCounties failed:", results[10].reason);

  const pageData: GeorgiaPageData = {
    accidentSummary,
    ruralUrban,
    stormSummary,
    boatingSummary,
    piViability: piViability[0] ?? null,
    censusDemographics,
    msaDemographics,
    judicialProfiles: judicialRows,
    stormCount,
    farsYearlyTrend,
    farsTopCounties,
  };

  return <GeorgiaClient data={pageData} />;
}
