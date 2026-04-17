import { getSupabase } from "@/lib/supabase";
import { CaliforniaClient, type CaliforniaPageData } from "./california-client";
import { getJudicialProfiles, type JudicialProfileRow } from "@/lib/queries/judicial";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return {
    title: "California State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in California — accident data, demographics, judicial profiles, and market opportunity signals.",
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
  median_household_income: number | null;
  per_capita_income: number | null;
  pct_poverty: number | null;
  pct_uninsured: number | null;
  pct_employed: number | null;
  pct_with_internet: number | null;
  pct_disability: number | null;
  pct_veterans: number | null;
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
/*  Data-fetching helpers                                               */
/* ------------------------------------------------------------------ */

async function fetchAccidentSummary(): Promise<AccidentSummaryRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    rpc: (fn: string, params: Record<string, string>) => Promise<{ data: unknown; error: unknown }>;
  };
  const { data, error } = await sb.rpc("get_state_accident_summary", {
    p_state: "CA",
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
    { p_state: "CA" }
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
    p_state: "California",
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
    p_state: "CA",
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
    .eq("state", "CA");
  if (error) throw error;
  return (data ?? []) as unknown as PIViabilityRow[];
}

async function fetchCensusDemographics(): Promise<CensusDemographicsRow[]> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("census_demographics")
    .select("*")
    .eq("state_abbr", "CA")
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
    .like("cbsa_title", "%, CA%")
    .order("total_population", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MSADemographicsRow[];
}

async function fetchStormCount(): Promise<number> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error } = await (supabase as any)
    .from("storm_events")
    .select("*", { count: "exact", head: true })
    .eq("state", "California");
  if (error) throw error;
  return count ?? 0;
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                      */
/* ------------------------------------------------------------------ */

export default async function CaliforniaStatePage() {
  let accidentSummary: AccidentSummaryRow[] = [];
  let ruralUrban: RuralUrbanRow[] = [];
  let stormSummary: StormSummaryRow[] = [];
  let boatingSummary: BoatingSummaryRow[] = [];
  let piViability: PIViabilityRow[] = [];
  let censusDemographics: CensusDemographicsRow[] = [];
  let msaDemographics: MSADemographicsRow[] = [];
  let judicialRows: JudicialProfileRow[] = [];
  let stormCount = 0;

  const results = await Promise.allSettled([
    fetchAccidentSummary(),
    fetchRuralUrbanComparison(),
    fetchStormSummary(),
    fetchBoatingSummary(),
    fetchPIViability(),
    fetchCensusDemographics(),
    fetchMSADemographics(),
    getJudicialProfiles("CA"),
    fetchStormCount(),
  ]);

  if (results[0].status === "fulfilled") accidentSummary = results[0].value;
  else console.error("[California] fetchAccidentSummary failed:", results[0].reason);

  if (results[1].status === "fulfilled") ruralUrban = results[1].value;
  else console.error("[California] fetchRuralUrbanComparison failed:", results[1].reason);

  if (results[2].status === "fulfilled") stormSummary = results[2].value;
  else console.error("[California] fetchStormSummary failed:", results[2].reason);

  if (results[3].status === "fulfilled") boatingSummary = results[3].value;
  else console.error("[California] fetchBoatingSummary failed:", results[3].reason);

  if (results[4].status === "fulfilled") piViability = results[4].value;
  else console.error("[California] fetchPIViability failed:", results[4].reason);

  if (results[5].status === "fulfilled") censusDemographics = results[5].value;
  else console.error("[California] fetchCensusDemographics failed:", results[5].reason);

  if (results[6].status === "fulfilled") msaDemographics = results[6].value;
  else console.error("[California] fetchMSADemographics failed:", results[6].reason);

  if (results[7].status === "fulfilled") judicialRows = results[7].value;
  else console.error("[California] fetchJudicialProfiles failed:", results[7].reason);

  if (results[8].status === "fulfilled") stormCount = results[8].value;
  else console.error("[California] fetchStormCount failed:", results[8].reason);

  const pageData: CaliforniaPageData = {
    accidentSummary,
    ruralUrban,
    stormSummary,
    boatingSummary,
    piViability: piViability[0] ?? null,
    censusDemographics,
    msaDemographics,
    judicialProfiles: judicialRows,
    stormCount,
  };

  return <CaliforniaClient data={pageData} />;
}
