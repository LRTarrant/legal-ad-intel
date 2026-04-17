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

const KG_TO_LBS = 2.20462;
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
/*  Data fetching helpers                                              */
/* ------------------------------------------------------------------ */

interface RawPesticideRow {
  compound: string;
  year: number;
  state_fips: string;
  county_fips: string;
  fips: string;
  state_name: string;
  county_name: string | null;
  epest_low_kg: number | null;
  epest_high_kg: number | null;
}

async function fetchAllPesticide(): Promise<RawPesticideRow[]> {
  const supabase = getSupabase();
  const pageSize = 1000;
  const rows: RawPesticideRow[] = [];
  let from = 0;

  // pesticide_usage table is not in generated types yet — cast to bypass
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };

  while (true) {
    const { data, error } = await sb
      .from("pesticide_usage")
      .select("compound,year,state_fips,county_fips,fips,state_name,county_name,epest_low_kg,epest_high_kg")
      .order("state_name", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as unknown as RawPesticideRow[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
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
/*  Aggregation                                                        */
/* ------------------------------------------------------------------ */

function aggregateStateAvg(
  rows: RawPesticideRow[],
  compound: string
): PesticideStateRow[] {
  const filtered = rows.filter((r) => r.compound === compound);
  const byState = new Map<string, { highSum: number; lowSum: number; counties: Set<string>; yearCount: number; stateFips: string }>();

  for (const r of filtered) {
    let entry = byState.get(r.state_name);
    if (!entry) {
      entry = { highSum: 0, lowSum: 0, counties: new Set(), yearCount: 0, stateFips: r.state_fips };
      byState.set(r.state_name, entry);
    }
    entry.highSum += (r.epest_high_kg ?? 0) * KG_TO_LBS;
    entry.lowSum += (r.epest_low_kg ?? 0) * KG_TO_LBS;
    entry.counties.add(r.fips);
  }

  const yearCount = YEARS.length;

  return Array.from(byState.entries()).map(([state_name, e]) => ({
    state_name,
    state_fips: e.stateFips,
    avg_high_lbs: e.highSum / yearCount,
    avg_low_lbs: e.lowSum / yearCount,
    county_count: e.counties.size,
    total_high_lbs: e.highSum,
  }));
}

function aggregateStateYear(
  rows: RawPesticideRow[],
  compound: string,
  year: number
): PesticideStateRow[] {
  const filtered = rows.filter((r) => r.compound === compound && r.year === year);
  const byState = new Map<string, { highSum: number; lowSum: number; counties: Set<string>; stateFips: string }>();

  for (const r of filtered) {
    let entry = byState.get(r.state_name);
    if (!entry) {
      entry = { highSum: 0, lowSum: 0, counties: new Set(), stateFips: r.state_fips };
      byState.set(r.state_name, entry);
    }
    entry.highSum += (r.epest_high_kg ?? 0) * KG_TO_LBS;
    entry.lowSum += (r.epest_low_kg ?? 0) * KG_TO_LBS;
    entry.counties.add(r.fips);
  }

  return Array.from(byState.entries()).map(([state_name, e]) => ({
    state_name,
    state_fips: e.stateFips,
    avg_high_lbs: e.highSum,
    avg_low_lbs: e.lowSum,
    county_count: e.counties.size,
    total_high_lbs: e.highSum,
  }));
}

function aggregateCountyAvg(
  rows: RawPesticideRow[],
  compound: string
): PesticideCountyRow[] {
  const filtered = rows.filter((r) => r.compound === compound);
  const byFips = new Map<
    string,
    { highSum: number; lowSum: number; years: Set<number>; countyName: string | null; stateName: string }
  >();

  for (const r of filtered) {
    let entry = byFips.get(r.fips);
    if (!entry) {
      entry = { highSum: 0, lowSum: 0, years: new Set(), countyName: r.county_name, stateName: r.state_name };
      byFips.set(r.fips, entry);
    }
    entry.highSum += (r.epest_high_kg ?? 0) * KG_TO_LBS;
    entry.lowSum += (r.epest_low_kg ?? 0) * KG_TO_LBS;
    entry.years.add(r.year);
    if (!entry.countyName && r.county_name) entry.countyName = r.county_name;
  }

  const yearCount = YEARS.length;

  return Array.from(byFips.entries()).map(([fips, e]) => ({
    county_name: e.countyName,
    state_name: e.stateName,
    fips,
    avg_high_lbs: e.highSum / yearCount,
    avg_low_lbs: e.lowSum / yearCount,
    years_active: e.years.size,
  }));
}

function aggregateCountyYear(
  rows: RawPesticideRow[],
  compound: string,
  year: number
): PesticideCountyRow[] {
  const filtered = rows.filter((r) => r.compound === compound && r.year === year);
  return filtered.map((r) => ({
    county_name: r.county_name,
    state_name: r.state_name,
    fips: r.fips,
    avg_high_lbs: (r.epest_high_kg ?? 0) * KG_TO_LBS,
    avg_low_lbs: (r.epest_low_kg ?? 0) * KG_TO_LBS,
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
  let pesticideRows: RawPesticideRow[] = [];
  let diseaseRows: RawDiseaseRow[] = [];
  let piScores: PiRow[] = [];

  try {
    [pesticideRows, diseaseRows, piScores] = await Promise.all([
      fetchAllPesticide(),
      fetchDiseaseMortality(),
      fetchPiScores(),
    ]);
  } catch {
    // Gracefully degrade — render empty state
  }

  // Aggregate pesticide data: 5-year averages
  const pesticideStates = {
    paraquat: aggregateStateAvg(pesticideRows, "PARAQUAT"),
    glyphosate: aggregateStateAvg(pesticideRows, "GLYPHOSATE"),
  };

  const pesticideCounties = {
    paraquat: aggregateCountyAvg(pesticideRows, "PARAQUAT"),
    glyphosate: aggregateCountyAvg(pesticideRows, "GLYPHOSATE"),
  };

  // Per-year aggregations
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
      pesticideYearlyStates[key][String(year)] = aggregateStateYear(pesticideRows, compound, year);
      pesticideYearlyCounties[key][String(year)] = aggregateCountyYear(pesticideRows, compound, year);
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
