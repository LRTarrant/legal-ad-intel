import { assertTortAccess } from "@/lib/entitlements/guards";
import nextDynamic from "next/dynamic";
import { getSupabase } from "@/lib/supabase";
import type { RobloxPageData } from "./roblox-client";

const RobloxClient = nextDynamic(() => import("./roblox-client").then((m) => m.RobloxClient));
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
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return {
    title:
      "Roblox Child Exploitation Tort Intelligence | Legal Marketing Intelligence",
    description:
      "Gaming platform liability & child sexual exploitation litigation intelligence — MDL 3166 case data, state enforcement signals, advertising landscape, and geographic targeting.",
  };
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const TORT_SLUG = "roblox_abuse";
const MASS_TORT_SLUG = "roblox-abuse";

/* ------------------------------------------------------------------ */
/*  Data fetching                                                       */
/* ------------------------------------------------------------------ */

interface YouthMentalHealthRow {
  state: string;
  mde_percentage: number;
  mde_count: number;
  overall_youth_rank: number;
}

interface ParentalConcernRow {
  state: string;
  download_requests_per_10k: number;
  google_search_volume: number;
  media_mentions: number;
  lawsuits_filed: number;
  concern_score: number;
  national_rank: number;
}

interface StateEnforcementRow {
  state: string;
  has_ag_action: boolean;
  ag_action_type: string | null;
  ag_action_detail: string | null;
  has_criminal_cases: boolean;
  criminal_case_detail: string | null;
  enforcement_score: number;
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

async function fetchYouthMentalHealth(): Promise<YouthMentalHealthRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("youth_mental_health")
    .select("state,mde_percentage,mde_count,overall_youth_rank");

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    state: String(d.state),
    mde_percentage: Number(d.mde_percentage) || 0,
    mde_count: Number(d.mde_count) || 0,
    overall_youth_rank: Number(d.overall_youth_rank) || 0,
  }));
}

async function fetchParentalConcern(): Promise<ParentalConcernRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("roblox_parental_concern")
    .select("*")
    .order("national_rank", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    state: String(d.state),
    download_requests_per_10k: Number(d.download_requests_per_10k) || 0,
    google_search_volume: Number(d.google_search_volume) || 0,
    media_mentions: Number(d.media_mentions) || 0,
    lawsuits_filed: Number(d.lawsuits_filed) || 0,
    concern_score: Number(d.concern_score) || 0,
    national_rank: Number(d.national_rank) || 0,
  }));
}

async function fetchStateEnforcement(): Promise<StateEnforcementRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("roblox_state_enforcement")
    .select("*")
    .order("enforcement_score", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    state: String(d.state),
    has_ag_action: Boolean(d.has_ag_action),
    ag_action_type: d.ag_action_type != null ? String(d.ag_action_type) : null,
    ag_action_detail: d.ag_action_detail != null ? String(d.ag_action_detail) : null,
    has_criminal_cases: Boolean(d.has_criminal_cases),
    criminal_case_detail: d.criminal_case_detail != null ? String(d.criminal_case_detail) : null,
    enforcement_score: Number(d.enforcement_score) || 0,
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

export default async function RobloxAbusePage() {

  // Gate on the account's purchased tort add-ons (tort-keyed surface).
  const denied = await assertTortAccess("roblox-abuse");
  if (denied) return denied;
  let youthMentalHealth: YouthMentalHealthRow[] = [];
  let parentalConcern: ParentalConcernRow[] = [];
  let stateEnforcement: StateEnforcementRow[] = [];
  let judicialRows: JudicialRow[] = [];
  let piScores: PiRow[] = [];

  /* -- Supabase data (Promise.allSettled -- resilient) --------------- */
  const results = await Promise.allSettled([
    fetchYouthMentalHealth(),
    fetchParentalConcern(),
    fetchStateEnforcement(),
    fetchJudicialProfiles(),
    fetchPiScores(),
  ]);

  if (results[0].status === "fulfilled") youthMentalHealth = results[0].value;
  else console.error("[RobloxAbuse] fetchYouthMentalHealth failed:", results[0].reason);

  if (results[1].status === "fulfilled") parentalConcern = results[1].value;
  else console.error("[RobloxAbuse] fetchParentalConcern failed:", results[1].reason);

  if (results[2].status === "fulfilled") stateEnforcement = results[2].value;
  else console.error("[RobloxAbuse] fetchStateEnforcement failed:", results[2].reason);

  if (results[3].status === "fulfilled") judicialRows = results[3].value;
  else console.error("[RobloxAbuse] fetchJudicialProfiles failed:", results[3].reason);

  if (results[4].status === "fulfilled") piScores = results[4].value;
  else console.error("[RobloxAbuse] fetchPiScores failed:", results[4].reason);

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

  const tortLabel = "Roblox Abuse";
  const tortLabelLower = tortLabel.toLowerCase();
  const benchmark = benchmarks
    .sort((a, b) => b.observed_date.localeCompare(a.observed_date))
    .find((b) => {
      const bName = b.tort_name.toLowerCase();
      if (bName === tortLabelLower) return true;
      if (bName.includes("roblox")) return true;
      return false;
    }) ?? null;

  const hasLiveData = totalAdvertisers > 0 || totalSpend > 0 || totalCreatives > 0;

  /* -- Build aggregations for client -------------------------------- */

  // Youth mental health: top 15 by MDE percentage desc
  const youthTop15 = [...youthMentalHealth]
    .sort((a, b) => b.mde_percentage - a.mde_percentage)
    .slice(0, 15);

  // National average MDE
  const avgMde =
    youthMentalHealth.length > 0
      ? youthMentalHealth.reduce((s, r) => s + r.mde_percentage, 0) / youthMentalHealth.length
      : 18.82;

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
  const pageData: RobloxPageData = {
    parentalConcern,
    youthTop15,
    avgMde: Number(avgMde.toFixed(2)),
    topMdeState: youthTop15[0] ?? null,
    stateEnforcement,
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
  };

  const topConcernStates = parentalConcern.slice(0, 3).map((s) => `${s.state} (${s.concern_score})`).join(", ");
  const topEnforcementStates = stateEnforcement.slice(0, 3).map((s) => `${s.state} (${s.enforcement_score})`).join(", ");

  return (
    <>
      <RobloxClient data={pageData} />
      <NewLandingPagesCard tortSlug="roblox-abuse" tortLabel="Roblox Abuse" />
      <AskAIPanel
        tortContext={{
          tortName: "Roblox Child Exploitation",
          injury: "Child sexual exploitation, grooming, sextortion, coerced explicit images, assault, trafficking — via Roblox gaming platform",
          mdlNumber: "MDL 3166, N.D. Cal. (Chief Judge Richard Seeborg)",
          pendingCases: "146+ federal MDL cases and growing rapidly",
          settlementRange: "No settlements yet — MDL created December 2025, early-stage litigation",
          estimatedCPA: "TBD — emerging tort with early-stage advertising landscape",
          bellwetherDate: "Not yet scheduled — MDL is in initial organization phase",
          caseSummary: "Plaintiffs allege Roblox deliberately prioritized growth metrics over child safety, creating a platform where predators could spoof age, groom children through in-game chat and Robux gifting, then migrate conversations to Discord/Snapchat where exploitation escalated. Claims include product liability (defective design), failure to warn, negligence, consumer fraud, and civil sex trafficking. Co-defendants include Discord, Snap Inc., and Meta.",
          qualification: "Children who were groomed, sexually exploited, coerced into sharing explicit content, or sexually assaulted by predators who contacted them through Roblox. Includes sextortion victims and families of children who suffered severe mental health consequences.",
          advertisingLandscape: `Active advertisers: ${totalAdvertisers}. Estimated spend: $${totalSpend > 0 ? (totalSpend / 1000).toFixed(0) + "K" : "N/A"}. Platforms: ${allPlatforms.size > 0 ? Array.from(allPlatforms).join(", ") : "data collection in progress"}.`,
          targetingInsights: `Top parental concern states: ${topConcernStates}. Top enforcement states: ${topEnforcementStates}. ${stateEnforcement.filter((r) => r.has_ag_action).length} states with AG actions. Key signals: parental concern index, youth mental health burden, state enforcement activity, judicial profiles, PI viability scores.`,
        }}
      />
    </>
  );
}
