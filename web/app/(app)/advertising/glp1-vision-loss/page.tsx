import { getSupabase } from "@/lib/supabase";
import { GLP1VisionLossClient, type GLP1VisionLossPageData } from "./glp1-vision-loss-client";
import { AskAIPanel } from "../../components/ask-ai-panel";
import {
  getSegmentSummary,
  getTopAdvertisersBySegment,
  getAdvertiserPlatforms,
  getAdSaturationWindowed,
  getTortCostBenchmarks,
  getSerpVisibilityWindowed,
  getSerpTopResults,
  getSampleAds,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return {
    title:
      "GLP-1 Vision Loss (NAION) Tort Intelligence | Legal Marketing Intelligence",
    description:
      "GLP-1 receptor agonist NAION litigation intelligence — MDL 3163 case data, prescription volumes, obesity & diabetes prevalence, regulatory gap analysis, and geographic targeting.",
  };
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const TORT_SLUG = "glp1_vision_loss";
const MASS_TORT_SLUG = "glp1-vision-loss";

/* ------------------------------------------------------------------ */
/*  Data fetching                                                       */
/* ------------------------------------------------------------------ */

interface GLP1PrescriptionRow {
  state: string;
  total_prescriptions_2024: number;
  yoy_change_pct: number;
  statewide_usage_pct: number;
}

interface ObesityRow {
  state: string;
  obesity_prevalence_pct: number;
  data_year: number;
}

interface DiabetesRow {
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

async function fetchObesityPrevalence(): Promise<ObesityRow[]> {
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

async function fetchDiabetesPrevalence(): Promise<DiabetesRow[]> {
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

export default async function GLP1VisionLossPage() {
  let glp1Prescriptions: GLP1PrescriptionRow[] = [];
  let obesityPrevalence: ObesityRow[] = [];
  let diabetesPrevalence: DiabetesRow[] = [];
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
  else console.error("[GLP1VisionLoss] fetchGLP1Prescriptions failed:", results[0].reason);

  if (results[1].status === "fulfilled") obesityPrevalence = results[1].value;
  else console.error("[GLP1VisionLoss] fetchObesityPrevalence failed:", results[1].reason);

  if (results[2].status === "fulfilled") diabetesPrevalence = results[2].value;
  else console.error("[GLP1VisionLoss] fetchDiabetesPrevalence failed:", results[2].reason);

  if (results[3].status === "fulfilled") judicialRows = results[3].value;
  else console.error("[GLP1VisionLoss] fetchJudicialProfiles failed:", results[3].reason);

  if (results[4].status === "fulfilled") piScores = results[4].value;
  else console.error("[GLP1VisionLoss] fetchPiScores failed:", results[4].reason);

  /* -- Advertising data (standard query helpers) --------------------- */
  const now = new Date();
  const windowEnd = now.toISOString().slice(0, 10);
  const windowStartDate = new Date(now);
  windowStartDate.setDate(windowStartDate.getDate() - 90);
  const windowStart = windowStartDate.toISOString().slice(0, 10);

  const adResults = await Promise.allSettled([
    getSegmentSummary(TORT_SLUG),
    getTopAdvertisersBySegment(TORT_SLUG, 25),
    getAdvertiserPlatforms(TORT_SLUG),
    getAdSaturationWindowed(windowStart, windowEnd, TORT_SLUG),
    getTortCostBenchmarks(),
    getSerpVisibilityWindowed(windowStart, windowEnd, TORT_SLUG),
    getSerpTopResults(TORT_SLUG, 5),
    getSampleAds(TORT_SLUG, 12),
  ]);

  const segments = adResults[0].status === "fulfilled" ? adResults[0].value : [];
  const topAdvertisers = adResults[1].status === "fulfilled" ? adResults[1].value : [];
  const platforms = adResults[2].status === "fulfilled" ? adResults[2].value : [];
  const saturation = adResults[3].status === "fulfilled" ? adResults[3].value : [];
  const benchmarks = adResults[4].status === "fulfilled" ? adResults[4].value : [];
  const serpVisibility = adResults[5].status === "fulfilled" ? adResults[5].value : [];
  const serpResults = adResults[6].status === "fulfilled" ? adResults[6].value : [];
  const sampleAds = adResults[7].status === "fulfilled" ? adResults[7].value : [];

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

  const tortLabel = "GLP-1 Vision Loss";
  const tortLabelLower = tortLabel.toLowerCase();
  const benchmark = benchmarks
    .sort((a, b) => b.observed_date.localeCompare(a.observed_date))
    .find((b) => {
      const bName = b.tort_name.toLowerCase();
      if (bName === tortLabelLower) return true;
      if (bName.includes("glp-1") && bName.includes("vision")) return true;
      if (bName.includes("naion")) return true;
      return false;
    }) ?? null;

  const hasLiveData = totalAdvertisers > 0 || totalSpend > 0 || totalCreatives > 0;

  /* -- Build aggregations for client -------------------------------- */

  // GLP-1 prescriptions: top 15 by statewide_usage_pct
  const prescriptionTop15 = [...glp1Prescriptions]
    .sort((a, b) => b.statewide_usage_pct - a.statewide_usage_pct)
    .slice(0, 15);

  // Obesity: top 15 by obesity_prevalence_pct
  const obesityTop15 = [...obesityPrevalence]
    .sort((a, b) => b.obesity_prevalence_pct - a.obesity_prevalence_pct)
    .slice(0, 15);

  // Diabetes: top 15 by diabetes_prevalence_pct
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
  const pageData: GLP1VisionLossPageData = {
    prescriptionTop15,
    obesityTop15,
    diabetesTop15,
    judicialByState,
    piByState,
    // advertising
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
  };

  const topPrescriptionStates = prescriptionTop15.slice(0, 3).map((s) => `${s.state} (${s.statewide_usage_pct}%)`).join(", ");
  const topObesityStates = obesityTop15.slice(0, 3).map((s) => `${s.state} (${s.obesity_prevalence_pct}%)`).join(", ");
  const topDiabetesStates = diabetesTop15.slice(0, 3).map((s) => `${s.state} (${s.diabetes_prevalence_pct}%)`).join(", ");

  return (
    <>
      <GLP1VisionLossClient data={pageData} />
      <AskAIPanel
        tortContext={{
          tortName: "GLP-1 Vision Loss (NAION)",
          injury: "Non-arteritic anterior ischemic optic neuropathy (NAION) — sudden, painless, usually permanent vision loss caused by GLP-1 receptor agonist drugs (Ozempic, Wegovy, Mounjaro, Zepbound)",
          mdlNumber: "MDL 3163, E.D. Pa. (Judge Karen S. Marston)",
          pendingCases: "~30 federal MDL cases (rapidly growing)",
          settlementRange: "No settlements yet — MDL created December 2025, very early-stage litigation",
          estimatedCPA: "TBD — nascent tort with early-stage advertising landscape",
          bellwetherDate: "Science Day scheduled June 2, 2026 — expert causation presentations",
          caseSummary: "Plaintiffs allege GLP-1 drugs cause NAION — sudden vision loss from reduced blood flow to the optic nerve. Harvard/JAMA study found 4.28x risk for diabetic users and 7.64x risk for weight-loss users. EMA added NAION warning to EU semaglutide labels in June 2025, but FDA has NOT added a similar warning — creating the central regulatory gap that drives failure-to-warn claims. Same judge (Marston) oversees both MDL 3094 (GI track) and MDL 3163 (NAION).",
          qualification: "Patients prescribed any GLP-1 receptor agonist (Ozempic, Wegovy, Rybelsus, Mounjaro, Zepbound) who subsequently developed NAION, sudden vision loss, optic nerve damage, or permanent visual field deficits. Weight-loss patients face 7.64x risk (nearly double diabetic risk).",
          advertisingLandscape: `Active advertisers: ${totalAdvertisers}. Estimated spend: $${totalSpend > 0 ? (totalSpend / 1000).toFixed(0) + "K" : "N/A"}. Platforms: ${allPlatforms.size > 0 ? Array.from(allPlatforms).join(", ") : "data collection in progress"}.`,
          targetingInsights: `Top GLP-1 prescription states: ${topPrescriptionStates}. Top obesity states: ${topObesityStates}. Top diabetes states: ${topDiabetesStates}. Key signals: GLP-1 prescription volume, obesity prevalence (weight-loss indication = 7.64x risk), diabetes prevalence (4.28x risk), judicial profiles, PI viability scores.`,
        }}
      />
    </>
  );
}
