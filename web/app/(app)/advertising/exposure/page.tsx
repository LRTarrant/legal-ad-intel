import { getSupabase } from "@/lib/supabase";
import {
  ExposureClient,
  type PesticideStateRow,
  type PesticideCountyRow,
  type DiseaseMortalityRow,
  type CrossRefRow,
  type ExposurePageData,
} from "./exposure-client";
import { AskAIPanel } from "../../components/ask-ai-panel";

export const dynamic = "force-dynamic";

export const metadata = {
  title:
    "Environmental & Occupational Exposure Intelligence | Legal Marketing Intelligence",
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const COMPOUNDS = ["PARAQUAT", "GLYPHOSATE"] as const;
const YEARS = [2013, 2014, 2015, 2016, 2017] as const;

/* ------------------------------------------------------------------ */
/*  State-code lookup (2-letter → full name & reverse)                 */
/* ------------------------------------------------------------------ */

const STATE_ABBR_MAP: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
  Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS",
  Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK",
  Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT",
  Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI",
  Wyoming: "WY", "District of Columbia": "DC",
};

/* ------------------------------------------------------------------ */
/*  Data fetching helpers (server-side aggregation RPCs)                */
/*                                                                      */
/*  WARNING: Do NOT replace these with client-side pagination loops      */
/*  over pesticide_usage. The table has 30k+ rows; paginating in        */
/*  1000-row chunks fires dozens of sequential queries. See PR           */
/*  "fix(perf): FARS pagination storm" for the incident class.          */
/* ------------------------------------------------------------------ */

interface RpcStateRow {
  compound: string;
  state_name: string;
  state_fips: string;
  avg_high_lbs: number;
  avg_low_lbs: number;
  total_high_lbs: number;
  county_count: number;
  year_count: number;
}

interface RpcCountyRow {
  compound: string;
  fips: string;
  county_name: string | null;
  state_name: string;
  avg_high_lbs: number;
  avg_low_lbs: number;
  years_active: number;
}

interface RpcStateYearRow {
  compound: string;
  year: number;
  state_name: string;
  state_fips: string;
  total_high_lbs: number;
  total_low_lbs: number;
  county_count: number;
}

interface RpcCountyYearRow {
  compound: string;
  year: number;
  fips: string;
  county_name: string | null;
  state_name: string;
  high_lbs: number;
  low_lbs: number;
}

async function fetchPesticideStateSummary(): Promise<RpcStateRow[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .rpc("get_pesticide_state_summary", { filter_state: null } as never)
    .throwOnError();
  return (data ?? []) as unknown as RpcStateRow[];
}

async function fetchPesticideCountySummary(): Promise<RpcCountyRow[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .rpc("get_pesticide_county_summary", { filter_state: null } as never)
    .throwOnError();
  return (data ?? []) as unknown as RpcCountyRow[];
}

async function fetchPesticideStateByYear(): Promise<RpcStateYearRow[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .rpc("get_pesticide_state_by_year", { filter_state: null } as never)
    .throwOnError();
  return (data ?? []) as unknown as RpcStateYearRow[];
}

async function fetchPesticideCountyByYear(): Promise<RpcCountyYearRow[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .rpc("get_pesticide_county_by_year", { filter_state: null } as never)
    .throwOnError();
  return (data ?? []) as unknown as RpcCountyYearRow[];
}

interface RawDiseaseRow {
  state_name: string;
  state_fips: string;
  disease: string;
  mortality_rate: number;
  deaths_count: number | null;
  year: number;
  change_pct: number | null;
  change_period: string | null;
}

async function fetchDiseaseMortality(): Promise<RawDiseaseRow[]> {
  const supabase = getSupabase();
  // disease_mortality table is not in generated types yet — cast to bypass
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("disease_mortality")
    .select("*")
    .order("state_name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as RawDiseaseRow[];
}

interface PiRow {
  state: string;
  composite_score: number | null;
}

async function fetchPiScores(): Promise<PiRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("pi_viability_scores")
    .select("state,composite_score");

  if (error) throw error;
  return (data ?? []) as PiRow[];
}

/* ------------------------------------------------------------------ */
/*  Aggregation (maps pre-aggregated RPC data by compound)              */
/* ------------------------------------------------------------------ */

function stateRowsForCompound(
  rows: RpcStateRow[],
  compound: string
): PesticideStateRow[] {
  return rows
    .filter((r) => r.compound === compound)
    .map((r) => ({
      state_name: r.state_name,
      state_fips: r.state_fips,
      avg_high_lbs: Number(r.avg_high_lbs),
      avg_low_lbs: Number(r.avg_low_lbs),
      county_count: Number(r.county_count),
      total_high_lbs: Number(r.total_high_lbs),
    }));
}

function countyRowsForCompound(
  rows: RpcCountyRow[],
  compound: string
): PesticideCountyRow[] {
  return rows
    .filter((r) => r.compound === compound)
    .map((r) => ({
      county_name: r.county_name,
      state_name: r.state_name,
      fips: r.fips,
      avg_high_lbs: Number(r.avg_high_lbs),
      avg_low_lbs: Number(r.avg_low_lbs),
      years_active: Number(r.years_active),
    }));
}

function stateYearRows(
  rows: RpcStateYearRow[],
  compound: string,
  year: number
): PesticideStateRow[] {
  return rows
    .filter((r) => r.compound === compound && r.year === year)
    .map((r) => ({
      state_name: r.state_name,
      state_fips: r.state_fips,
      avg_high_lbs: Number(r.total_high_lbs),
      avg_low_lbs: Number(r.total_low_lbs),
      county_count: Number(r.county_count),
      total_high_lbs: Number(r.total_high_lbs),
    }));
}

function countyYearRows(
  rows: RpcCountyYearRow[],
  compound: string,
  year: number
): PesticideCountyRow[] {
  return rows
    .filter((r) => r.compound === compound && r.year === year)
    .map((r) => ({
      county_name: r.county_name,
      state_name: r.state_name,
      fips: r.fips,
      avg_high_lbs: Number(r.high_lbs),
      avg_low_lbs: Number(r.low_lbs),
      years_active: 1,
    }));
}

function computeSummary(states: PesticideStateRow[]) {
  const totalLbs = states.reduce((sum, s) => sum + s.avg_high_lbs, 0);
  const stateCount = states.length;
  const countyCount = states.reduce((sum, s) => sum + s.county_count, 0);
  const topState =
    states.length > 0
      ? [...states].sort((a, b) => b.avg_high_lbs - a.avg_high_lbs)[0].state_name
      : "N/A";
  return { totalLbs, stateCount, countyCount, topState };
}

function computeDiseaseSummary(rows: RawDiseaseRow[]) {
  if (rows.length === 0) {
    return {
      avgRate: 0,
      highestState: "N/A",
      highestRate: 0,
      aboveAvgCount: 0,
      fastestSurge: "N/A",
      fastestSurgePct: 0,
    };
  }

  const avgRate = rows.reduce((s, r) => s + r.mortality_rate, 0) / rows.length;
  const sorted = [...rows].sort((a, b) => b.mortality_rate - a.mortality_rate);
  const highestState = sorted[0].state_name;
  const highestRate = sorted[0].mortality_rate;
  const aboveAvgCount = rows.filter((r) => r.mortality_rate > avgRate).length;

  const withSurge = rows.filter((r) => r.change_pct != null);
  const surgeSorted = [...withSurge].sort(
    (a, b) => (b.change_pct ?? 0) - (a.change_pct ?? 0)
  );
  const fastestSurge = surgeSorted.length > 0 ? surgeSorted[0].state_name : "N/A";
  const fastestSurgePct = surgeSorted.length > 0 ? surgeSorted[0].change_pct ?? 0 : 0;

  return { avgRate, highestState, highestRate, aboveAvgCount, fastestSurge, fastestSurgePct };
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return ((value - min) / (max - min)) * 100;
}

function computeCrossRef(
  pesticideStates: PesticideStateRow[],
  diseaseRows: RawDiseaseRow[],
  piScores: PiRow[],
  disease: string
): CrossRefRow[] {
  const diseaseByState = new Map<string, RawDiseaseRow>();
  for (const d of diseaseRows.filter((r) => r.disease === disease)) {
    diseaseByState.set(d.state_name, d);
  }

  const piByAbbr = new Map<string, number>();
  for (const p of piScores) {
    if (p.composite_score != null) {
      piByAbbr.set(p.state, p.composite_score);
    }
  }

  // Build rows for states that have pesticide data
  const candidates = pesticideStates
    .filter((p) => diseaseByState.has(p.state_name))
    .map((p) => {
      const d = diseaseByState.get(p.state_name)!;
      const abbr = STATE_ABBR_MAP[p.state_name] ?? "";
      const piScore = piByAbbr.get(abbr) ?? null;
      return {
        state_name: p.state_name,
        state_abbr: abbr,
        pesticide_lbs: p.avg_high_lbs,
        mortality_rate: d.mortality_rate,
        surge_pct: d.change_pct,
        pi_score: piScore,
      };
    });

  if (candidates.length === 0) return [];

  // Compute normalized scores
  const usageVals = candidates.map((c) => c.pesticide_lbs);
  const mortVals = candidates.map((c) => c.mortality_rate);
  const surgeVals = candidates.map((c) => c.surge_pct ?? 0);
  const piVals = candidates.map((c) => c.pi_score ?? 50);

  const usageMin = Math.min(...usageVals);
  const usageMax = Math.max(...usageVals);
  const mortMin = Math.min(...mortVals);
  const mortMax = Math.max(...mortVals);
  const surgeMin = Math.min(...surgeVals);
  const surgeMax = Math.max(...surgeVals);
  const piMin = Math.min(...piVals);
  const piMax = Math.max(...piVals);

  const scored = candidates.map((c) => {
    const usageNorm = normalize(c.pesticide_lbs, usageMin, usageMax);
    const mortNorm = normalize(c.mortality_rate, mortMin, mortMax);
    const surgeNorm = normalize(c.surge_pct ?? 0, surgeMin, surgeMax);
    const piNorm = normalize(c.pi_score ?? 50, piMin, piMax);

    const composite = usageNorm * 0.35 + mortNorm * 0.25 + piNorm * 0.25 + surgeNorm * 0.15;

    return { ...c, composite_score: composite };
  });

  scored.sort((a, b) => b.composite_score - a.composite_score);

  return scored.map((s, i) => ({
    ...s,
    rank: i + 1,
    grade: gradeFromComposite(s.composite_score, i, scored.length),
  }));
}

function gradeFromComposite(
  score: number,
  rank: number,
  total: number
): string {
  const pct = total > 0 ? rank / total : 1;
  if (pct <= 0.1) return "A+";
  if (pct <= 0.25) return "A";
  if (pct <= 0.45) return "B+";
  if (pct <= 0.7) return "B";
  return "C";
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default async function ExposurePage() {
  let rpcStateRows: RpcStateRow[] = [];
  let rpcCountyRows: RpcCountyRow[] = [];
  let rpcStateYearRows: RpcStateYearRow[] = [];
  let rpcCountyYearRows: RpcCountyYearRow[] = [];
  let diseaseRows: RawDiseaseRow[] = [];
  let piScores: PiRow[] = [];

  try {
    [rpcStateRows, rpcCountyRows, rpcStateYearRows, rpcCountyYearRows, diseaseRows, piScores] = await Promise.all([
      fetchPesticideStateSummary(),
      fetchPesticideCountySummary(),
      fetchPesticideStateByYear(),
      fetchPesticideCountyByYear(),
      fetchDiseaseMortality(),
      fetchPiScores(),
    ]);
  } catch {
    // Gracefully degrade — render empty state
  }

  // Map pre-aggregated RPC data by compound: 5-year averages
  const pesticideStates = {
    paraquat: stateRowsForCompound(rpcStateRows, "PARAQUAT"),
    glyphosate: stateRowsForCompound(rpcStateRows, "GLYPHOSATE"),
  };

  const pesticideCounties = {
    paraquat: countyRowsForCompound(rpcCountyRows, "PARAQUAT"),
    glyphosate: countyRowsForCompound(rpcCountyRows, "GLYPHOSATE"),
  };

  // Per-year breakdowns from pre-aggregated RPC data
  const pesticideYearlyStates: Record<string, Record<string, PesticideStateRow[]>> = {
    paraquat: {},
    glyphosate: {},
  };
  const pesticideYearlyCounties: Record<string, Record<string, PesticideCountyRow[]>> = {
    paraquat: {},
    glyphosate: {},
  };

  for (const compound of COMPOUNDS) {
    const key = compound.toLowerCase();
    for (const year of YEARS) {
      pesticideYearlyStates[key][String(year)] = stateYearRows(rpcStateYearRows, compound, year);
      pesticideYearlyCounties[key][String(year)] = countyYearRows(rpcCountyYearRows, compound, year);
    }
  }

  // Summary stats
  const summaryStats = {
    paraquat: computeSummary(pesticideStates.paraquat),
    glyphosate: computeSummary(pesticideStates.glyphosate),
  };

  const yearlyStats: Record<string, Record<string, ReturnType<typeof computeSummary>>> = {
    paraquat: {},
    glyphosate: {},
  };
  for (const compound of COMPOUNDS) {
    const key = compound.toLowerCase();
    for (const year of YEARS) {
      yearlyStats[key][String(year)] = computeSummary(pesticideYearlyStates[key][String(year)]);
    }
  }

  // Disease summary
  const parkinsonsRows = diseaseRows.filter((r) => r.disease === "Parkinsons Disease");
  const diseaseSummary = computeDiseaseSummary(parkinsonsRows);

  // Cross-reference
  const crossRef = {
    paraquat: computeCrossRef(pesticideStates.paraquat, diseaseRows, piScores, "Parkinsons Disease"),
    glyphosate: computeCrossRef(pesticideStates.glyphosate, diseaseRows, piScores, "Parkinsons Disease"),
  };

  // Disease mortality mapped for client
  const diseaseMortality: DiseaseMortalityRow[] = diseaseRows.map((r) => ({
    state_name: r.state_name,
    state_fips: r.state_fips,
    disease: r.disease,
    mortality_rate: r.mortality_rate,
    deaths_count: r.deaths_count,
    year: r.year,
    change_pct: r.change_pct,
    change_period: r.change_period,
  }));

  const pageData: ExposurePageData = {
    pesticideStates,
    pesticideCounties,
    pesticideYearlyStates,
    pesticideYearlyCounties,
    diseaseMortality,
    crossRef,
    summaryStats,
    yearlyStats,
    diseaseSummary,
  };

  const topParaquatStates = pesticideStates.paraquat
    .sort((a, b) => b.avg_high_lbs - a.avg_high_lbs)
    .slice(0, 5)
    .map((s) => s.state_name);

  const topGlyphosateStates = pesticideStates.glyphosate
    .sort((a, b) => b.avg_high_lbs - a.avg_high_lbs)
    .slice(0, 5)
    .map((s) => s.state_name);

  return (
    <>
      <ExposureClient data={pageData} />
      <AskAIPanel
        pageContext={{
          pageName: "Environmental & Occupational Exposure Intelligence",
          pageDescription:
            "Cross-references county-level pesticide exposure data (USGS) with state-level disease mortality (CDC) and PI viability scores to identify highest-value markets for environmental tort case acquisition.",
          dataSummary: `Paraquat: ${summaryStats.paraquat.stateCount} states, ${summaryStats.paraquat.countyCount} counties, ${Math.round(summaryStats.paraquat.totalLbs).toLocaleString()} lbs/yr avg. Top states: ${topParaquatStates.join(", ")}. Glyphosate: ${summaryStats.glyphosate.stateCount} states, ${summaryStats.glyphosate.countyCount} counties, ${Math.round(summaryStats.glyphosate.totalLbs).toLocaleString()} lbs/yr avg. Top states: ${topGlyphosateStates.join(", ")}. Parkinson's Disease mortality: national avg ${diseaseSummary.avgRate.toFixed(1)} per 100K, highest state: ${diseaseSummary.highestState} (${diseaseSummary.highestRate.toFixed(1)}), ${diseaseSummary.aboveAvgCount} states above average. Compound-to-tort mapping: Paraquat → Parkinson's Disease → Paraquat tort; Glyphosate → Non-Hodgkin Lymphoma → Roundup tort.`,
        }}
      />
    </>
  );
}
