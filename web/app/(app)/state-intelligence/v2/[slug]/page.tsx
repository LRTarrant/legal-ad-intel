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
  median_household_income: number | null;
  per_capita_income: number | null;
  pct_poverty: number | null;
  pct_uninsured: number | null;
  pct_employed: number | null;
  pct_with_internet: number | null;
  pct_disability: number | null;
  pct_veterans: number | null;
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
  return (data ?? []) as CensusDemographicsRow[];
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
  return (data ?? []) as MSADemographicsRow[];
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

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default async function StateIntelligencePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  console.log(`[v2/state-intel] Request for slug: ${slug}`);
  const config = getStateConfig(slug);
  if (!config) {
    console.log(
      `[v2/state-intel] No config found for slug: ${slug}. Available: ${STATE_SLUGS.join(", ")}`,
    );
    notFound();
  }
  console.log(
    `[v2/state-intel] Loaded config for ${config.stateName}, fetching data...`,
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
  ]);

  if (results[0].status === "fulfilled") accidentSummary = results[0].value;
  else
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
  };

  return <StateIntelligenceClient config={config} data={pageData} />;
}
