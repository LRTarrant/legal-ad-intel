import nextDynamic from "next/dynamic";
import { getSupabase } from "@/lib/supabase";
import type { AlabamaPageData, AlabamaDataErrors } from "./alabama-client";
import { getJudicialProfiles, type JudicialProfileRow } from "@/lib/queries/judicial";

const AlabamaClient = nextDynamic(() => import("./alabama-client").then((m) => m.AlabamaClient));

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return {
    title: "Alabama State Intelligence | Legal Marketing Intelligence",
    description:
      "Cross-signal intelligence for plaintiff firm advertising and case acquisition in Alabama — accident data, demographics, judicial profiles, and market opportunity signals.",
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
/*  Data-fetching helpers                                               */
/* ------------------------------------------------------------------ */

async function fetchAccidentSummary(): Promise<AccidentSummaryRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    rpc: (fn: string, params: Record<string, string>) => Promise<{ data: unknown; error: unknown }>;
  };
  const { data, error } = await sb.rpc("get_state_accident_summary", {
    p_state: "AL",
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
    { p_state: "AL" }
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
    p_state: "Alabama",
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
    p_state: "AL",
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
    .eq("state", "AL");
  if (error) throw error;
  return (data ?? []) as unknown as PIViabilityRow[];
}

async function fetchCensusDemographics(): Promise<CensusDemographicsRow[]> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("census_demographics")
    .select("*")
    .eq("state_abbr", "AL")
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
    .like("cbsa_title", "%, AL%")
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
    .eq("state", "Alabama");
  if (error) throw error;
  return count ?? 0;
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                      */
/* ------------------------------------------------------------------ */

export default async function AlabamaStatePage() {
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
    getJudicialProfiles("AL"),
    fetchStormCount(),
  ]);

  if (results[0].status === "fulfilled") accidentSummary = results[0].value;
  else console.error("[Alabama] fetchAccidentSummary failed:", results[0].reason);

  if (results[1].status === "fulfilled") ruralUrban = results[1].value;
  else console.error("[Alabama] fetchRuralUrbanComparison failed:", results[1].reason);

  if (results[2].status === "fulfilled") stormSummary = results[2].value;
  else console.error("[Alabama] fetchStormSummary failed:", results[2].reason);

  if (results[3].status === "fulfilled") boatingSummary = results[3].value;
  else console.error("[Alabama] fetchBoatingSummary failed:", results[3].reason);

  if (results[4].status === "fulfilled") piViability = results[4].value;
  else console.error("[Alabama] fetchPIViability failed:", results[4].reason);

  if (results[5].status === "fulfilled") censusDemographics = results[5].value;
  else console.error("[Alabama] fetchCensusDemographics failed:", results[5].reason);

  if (results[6].status === "fulfilled") msaDemographics = results[6].value;
  else console.error("[Alabama] fetchMSADemographics failed:", results[6].reason);

  if (results[7].status === "fulfilled") judicialRows = results[7].value;
  else console.error("[Alabama] fetchJudicialProfiles failed:", results[7].reason);

  if (results[8].status === "fulfilled") stormCount = results[8].value;
  else console.error("[Alabama] fetchStormCount failed:", results[8].reason);

  const errors: AlabamaDataErrors = {
    accidentSummary: results[0].status === "rejected",
    ruralUrban: results[1].status === "rejected",
    stormSummary: results[2].status === "rejected",
    boatingSummary: results[3].status === "rejected",
    piViability: results[4].status === "rejected",
    censusDemographics: results[5].status === "rejected",
    msaDemographics: results[6].status === "rejected",
    judicialProfiles: results[7].status === "rejected",
    stormCount: results[8].status === "rejected",
  };

  const pageData: AlabamaPageData = {
    accidentSummary,
    ruralUrban,
    stormSummary,
    boatingSummary,
    piViability: piViability[0] ?? null,
    censusDemographics,
    msaDemographics,
    judicialProfiles: judicialRows,
    stormCount,
    errors,
  };

  return <AlabamaClient data={pageData} />;
}
