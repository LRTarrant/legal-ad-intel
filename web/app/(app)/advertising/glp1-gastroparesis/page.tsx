import { assertTortAccess } from "@/lib/entitlements/guards";
import nextDynamic from "next/dynamic";
import { getSupabase } from "@/lib/supabase";
import type { GLP1GastroparesisPageData } from "./glp1-gastroparesis-client";

const GLP1GastroparesisClient = nextDynamic(() => import("./glp1-gastroparesis-client").then((m) => m.GLP1GastroparesisClient));
import { AskAIPanel } from "../../components/ask-ai-panel";
import { NewLandingPagesCard } from "../../components/new-landing-pages-card";
import {
  getSegmentSummary,
  getTopAdvertisersBySegment,
  getAdvertiserPlatforms,
  getAdSaturationWindowed,
  getTortCostBenchmarks,
  getSerpVisibilityWindowed,
  getSerpTopResults,
  getSampleAds,
  getFaersGlp1Signals,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return {
    title:
      "GLP-1 Gastroparesis Tort Intelligence | Legal Marketing Intelligence",
    description:
      "Stomach paralysis & severe GI injury litigation intelligence — MDL 3094 case data, GLP-1 prescription signals, advertising landscape, and geographic targeting.",
  };
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const TORT_SLUG = "glp1_gastroparesis";
const MASS_TORT_SLUG = "glp1-gastroparesis";

/* ------------------------------------------------------------------ */
/*  Data fetching                                                       */
/* ------------------------------------------------------------------ */

interface GLP1PrescriptionRow {
  state: string;
  total_prescriptions_2024: number;
  yoy_change_pct: number;
  statewide_usage_pct: number;
}

interface ObesityPrevalenceRow {
  state: string;
  obesity_prevalence_pct: number;
  data_year: number;
}

interface DiabetesPrevalenceRow {
  state: string;
  diabetes_prevalence_pct: number;
  data_year: number;
}

interface JudicialRow {
  state: string;
  county_name: string;
  judicial_profile: string;
}

interface PiRow {
  state: string;
  composite_score: number | null;
}

async function fetchGLP1Prescriptions(): Promise<GLP1PrescriptionRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("glp1_prescriptions")
    .select("state,total_prescriptions_2024,yoy_change_pct,statewide_usage_pct");

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    state: String(d.state),
    total_prescriptions_2024: Number(d.total_prescriptions_2024) || 0,
    yoy_change_pct: Number(d.yoy_change_pct) || 0,
    statewide_usage_pct: Number(d.statewide_usage_pct) || 0,
  }));
}

async function fetchObesityPrevalence(): Promise<ObesityPrevalenceRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("obesity_prevalence")
    .select("state,obesity_prevalence_pct,data_year");

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    state: String(d.state),
    obesity_prevalence_pct: Number(d.obesity_prevalence_pct) || 0,
    data_year: Number(d.data_year) || 0,
  }));
}

async function fetchDiabetesPrevalence(): Promise<DiabetesPrevalenceRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("diabetes_prevalence")
    .select("state,diabetes_prevalence_pct,data_year");

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    state: String(d.state),
    diabetes_prevalence_pct: Number(d.diabetes_prevalence_pct) || 0,
    data_year: Number(d.data_year) || 0,
  }));
}

async function fetchJudicialProfiles(): Promise<JudicialRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("judicial_profiles")
    .select("state,county_name,judicial_profile")
    .range(0, 3999);

  if (error) throw error;
  return (data ?? []) as unknown as JudicialRow[];
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
/*  Page Component                                                      */
/* ------------------------------------------------------------------ */

export default async function GLP1GastroparesisPage() {

  // Gate on the account's purchased tort add-ons (tort-keyed surface).
  const denied = await assertTortAccess("glp1-gastroparesis");
  if (denied) return denied;
  let glp1Prescriptions: GLP1PrescriptionRow[] = [];
  let obesityPrevalence: ObesityPrevalenceRow[] = [];
  let diabetesPrevalence: DiabetesPrevalenceRow[] = [];
  let judicialRows: JudicialRow[] = [];
  let piScores: PiRow[] = [];

  /* -- Supabase data (Promise.allSettled -- resilient) --------------- */
  const results = await Promise.allSettled([
    fetchGLP1Prescriptions(),
    fetchObesityPrevalence(),
    fetchDiabetesPrevalence(),
    fetchJudicialProfiles(),
    fetchPiScores(),
  ]);

  if (results[0].status === "fulfilled") glp1Prescriptions = results[0].value;
  else console.error("[GLP1] fetchGLP1Prescriptions failed:", results[0].reason);

  if (results[1].status === "fulfilled") obesityPrevalence = results[1].value;
  else console.error("[GLP1] fetchObesityPrevalence failed:", results[1].reason);

  if (results[2].status === "fulfilled") diabetesPrevalence = results[2].value;
  else console.error("[GLP1] fetchDiabetesPrevalence failed:", results[2].reason);

  if (results[3].status === "fulfilled") judicialRows = results[3].value;
  else console.error("[GLP1] fetchJudicialProfiles failed:", results[3].reason);

  if (results[4].status === "fulfilled") piScores = results[4].value;
  else console.error("[GLP1] fetchPiScores failed:", results[4].reason);

  /* -- Advertising data (standard query helpers) --------------------- */
  const now = new Date();
  const windowEnd = now.toISOString().slice(0, 10);
  const windowStartDate = new Date(now);
  windowStartDate.setDate(windowStartDate.getDate() - 90);
  const windowStart = windowStartDate.toISOString().slice(0, 10);

  const [segments, topAdvertisers, platforms, saturation, benchmarks, serpVisibility, serpResults, sampleAds, faersSignals] =
    await Promise.all([
      getSegmentSummary(TORT_SLUG),
      getTopAdvertisersBySegment(TORT_SLUG, 25),
      getAdvertiserPlatforms(TORT_SLUG),
      getAdSaturationWindowed(windowStart, windowEnd, TORT_SLUG),
      getTortCostBenchmarks(),
      getSerpVisibilityWindowed(windowStart, windowEnd, TORT_SLUG),
      getSerpTopResults(TORT_SLUG, 5),
      getSampleAds(TORT_SLUG, 12),
      // getFaersGlp1Signals never throws (returns an empty structure on error),
      // so it is safe inside Promise.all.
      getFaersGlp1Signals("gastroparesis"),
    ]);

  /* -- Aggregate advertising stats ---------------------------------- */
  const platformMap = new Map<string, string[]>();
  for (const p of platforms) {
    if (p.advertiser_name) {
      platformMap.set(p.advertiser_name, p.platforms);
    }
  }
  const totalAdvertisers = segments.reduce((s, r) => s + r.advertiser_count, 0);
  const totalSpend = segments.reduce((s, r) => s + r.total_spend, 0);
  const totalCreatives = segments.reduce((s, r) => s + r.total_creatives, 0);
  const allPlatforms = new Set<string>();
  for (const p of platforms) {
    for (const plat of p.platforms) allPlatforms.add(plat);
  }
  const topMarkets = [...saturation]
    .sort((a, b) => (b.saturation_score ?? 0) - (a.saturation_score ?? 0))
    .slice(0, 10);

  const tortLabel = "GLP-1 Gastroparesis";
  const tortLabelLower = tortLabel.toLowerCase();
  const benchmark = benchmarks
    .sort((a, b) => b.observed_date.localeCompare(a.observed_date))
    .find((b) => {
      const bName = b.tort_name.toLowerCase();
      if (bName === tortLabelLower) return true;
      if (bName.includes("glp-1") || bName.includes("glp1") || bName.includes("gastroparesis")) return true;
      return false;
    }) ?? null;

  const hasLiveData = totalAdvertisers > 0 || totalSpend > 0 || totalCreatives > 0;

  /* -- Build aggregations for client -------------------------------- */

  // Top 15 states by GLP-1 usage
  const prescriptionTop15 = [...glp1Prescriptions]
    .sort((a, b) => b.statewide_usage_pct - a.statewide_usage_pct)
    .slice(0, 15);

  // Top 15 states by obesity
  const obesityTop15 = [...obesityPrevalence]
    .sort((a, b) => b.obesity_prevalence_pct - a.obesity_prevalence_pct)
    .slice(0, 15);

  // Top 15 states by diabetes
  const diabetesTop15 = [...diabetesPrevalence]
    .sort((a, b) => b.diabetes_prevalence_pct - a.diabetes_prevalence_pct)
    .slice(0, 15);

  // Judicial aggregation by state
  const judicialByState: Record<string, { counties: number; profiles: Record<string, number> }> = {};
  for (const j of judicialRows) {
    if (!judicialByState[j.state]) {
      judicialByState[j.state] = { counties: 0, profiles: {} };
    }
    judicialByState[j.state].counties++;
    judicialByState[j.state].profiles[j.judicial_profile] =
      (judicialByState[j.state].profiles[j.judicial_profile] || 0) + 1;
  }

  // PI scores by state
  const piByState: Record<string, number> = {};
  for (const p of piScores) {
    if (p.composite_score != null) {
      piByState[p.state] = p.composite_score;
    }
  }

  /* -- Build page data for client ----------------------------------- */
  const pageData: GLP1GastroparesisPageData = {
    prescriptionTop15,
    obesityTop15,
    diabetesTop15,
    judicialByState,
    piByState,
    // advertising data
    segments,
    topAdvertisers,
    platformMap: Object.fromEntries(platformMap),
    totalAdvertisers,
    totalSpend,
    totalCreatives,
    allPlatforms: Array.from(allPlatforms).sort(),
    topMarkets,
    benchmark,
    hasLiveData,
    serpVisibility,
    serpResults,
    sampleAds,
    faersSignals,
  };

  // Summary for AI panel
  const topRxStates = prescriptionTop15.slice(0, 5).map((s) => `${s.state} (${s.statewide_usage_pct}%)`).join(", ");
  const topObesityStates = obesityTop15.slice(0, 5).map((s) => `${s.state} (${s.obesity_prevalence_pct}%)`).join(", ");

  return (
    <>
      <GLP1GastroparesisClient data={pageData} />
      <NewLandingPagesCard tortSlug="glp1-gastroparesis" tortLabel="GLP-1 Gastroparesis" />
      <AskAIPanel
        tortContext={{
          tortName: "GLP-1 Gastroparesis",
          injury: "Gastroparesis (stomach paralysis), bowel obstruction, ileus, aspiration during surgery, severe persistent vomiting — linked to GLP-1 receptor agonist drugs",
          mdlNumber: "MDL 3094, E.D. Pa. (Judge Karen S. Marston)",
          pendingCases: "3,546 federal MDL cases as of April 2026",
          settlementRange: "No settlements yet. Bellwether trial selection underway. Analysts compare trajectory to Vioxx and Belviq.",
          estimatedCPA: "TBD — active MDL with growing case count and significant settlement pressure",
          bellwetherDate: "Bellwether trial selection underway (2026)",
          caseSummary: "Plaintiffs allege Novo Nordisk (Ozempic, Wegovy, Rybelsus) and Eli Lilly (Mounjaro, Zepbound) knew GLP-1 receptor agonists cause severe gastroparesis, bowel obstruction, ileus, and other serious GI injuries beyond typical nausea/vomiting. Core failure-to-warn theory strengthened by FDA post-market label changes adding gastroparesis, ileus, and aspiration warnings.",
          qualification: "Patient prescribed Ozempic, Wegovy, Rybelsus, Mounjaro, or Zepbound who developed gastroparesis, stomach paralysis, severe vomiting requiring hospitalization, bowel obstruction, ileus, or aspiration during surgery. Both diabetes and weight-loss patients qualify. Must have prescription records and physician-documented diagnosis.",
          advertisingLandscape: `Active advertisers: ${totalAdvertisers}. Estimated spend: $${totalSpend > 0 ? (totalSpend / 1000).toFixed(0) + "K" : "N/A"}. Platforms: ${allPlatforms.size > 0 ? Array.from(allPlatforms).join(", ") : "data collection in progress"}.`,
          targetingInsights: `Top GLP-1 prescription states: ${topRxStates}. Top obesity states: ${topObesityStates}. Key signals: GLP-1 prescription volume, obesity prevalence, diabetes prevalence, judicial profiles, PI viability scores. South and Appalachia dominate prescriptions, directly mapping potential plaintiff pools.`,
        }}
      />
    </>
  );
}
