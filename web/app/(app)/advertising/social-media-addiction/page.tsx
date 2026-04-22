import nextDynamic from "next/dynamic";
import { getSupabase } from "@/lib/supabase";
import type { SocialMediaPageData } from "./social-media-client";

const SocialMediaClient = nextDynamic(() => import("./social-media-client").then((m) => m.SocialMediaClient));
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
      "Social Media Addiction Tort Intelligence | Legal Marketing Intelligence",
    description:
      "Youth mental health & platform liability litigation intelligence — MDL 3047 case data, state signals, advertising landscape, and geographic targeting.",
  };
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const TORT_SLUG = "social_media_addiction";
const MASS_TORT_SLUG = "social-media-addiction";

/* ------------------------------------------------------------------ */
/*  Data fetching                                                       */
/* ------------------------------------------------------------------ */

interface YouthMentalHealthRow {
  state: string;
  mde_percentage: number;
  mde_count: number;
  overall_youth_rank: number;
}

interface TeenScreenTimeRow {
  state: string;
  avg_daily_minutes: number;
  national_rank: number;
}

interface StateRegulatoryRow {
  state: string;
  has_law_enacted: boolean;
  law_name: string | null;
  law_status: string | null;
  has_ag_action: boolean;
  ag_action_detail: string | null;
  regulatory_score: number;
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

async function fetchTeenScreenTime(): Promise<TeenScreenTimeRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("teen_screen_time")
    .select("state,avg_daily_minutes,national_rank")
    .order("national_rank", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    state: String(d.state),
    avg_daily_minutes: Number(d.avg_daily_minutes) || 0,
    national_rank: Number(d.national_rank) || 0,
  }));
}

async function fetchStateRegulatory(): Promise<StateRegulatoryRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("social_media_state_regulatory")
    .select("*");

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    state: String(d.state),
    has_law_enacted: Boolean(d.has_law_enacted),
    law_name: d.law_name != null ? String(d.law_name) : null,
    law_status: d.law_status != null ? String(d.law_status) : null,
    has_ag_action: Boolean(d.has_ag_action),
    ag_action_detail: d.ag_action_detail != null ? String(d.ag_action_detail) : null,
    regulatory_score: Number(d.regulatory_score) || 0,
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

export default async function SocialMediaAddictionPage() {
  let youthMentalHealth: YouthMentalHealthRow[] = [];
  let teenScreenTime: TeenScreenTimeRow[] = [];
  let stateRegulatory: StateRegulatoryRow[] = [];
  let judicialRows: JudicialRow[] = [];
  let piScores: PiRow[] = [];

  /* ── Supabase data (Promise.allSettled — resilient) ───────────────── */
  const results = await Promise.allSettled([
    fetchYouthMentalHealth(),
    fetchTeenScreenTime(),
    fetchStateRegulatory(),
    fetchJudicialProfiles(),
    fetchPiScores(),
  ]);

  if (results[0].status === "fulfilled") youthMentalHealth = results[0].value;
  else console.error("[SocialMedia] fetchYouthMentalHealth failed:", results[0].reason);

  if (results[1].status === "fulfilled") teenScreenTime = results[1].value;
  else console.error("[SocialMedia] fetchTeenScreenTime failed:", results[1].reason);

  if (results[2].status === "fulfilled") stateRegulatory = results[2].value;
  else console.error("[SocialMedia] fetchStateRegulatory failed:", results[2].reason);

  if (results[3].status === "fulfilled") judicialRows = results[3].value;
  else console.error("[SocialMedia] fetchJudicialProfiles failed:", results[3].reason);

  if (results[4].status === "fulfilled") piScores = results[4].value;
  else console.error("[SocialMedia] fetchPiScores failed:", results[4].reason);

  /* ── Advertising data (standard query helpers) ────────────────────── */
  const now = new Date();
  const windowEnd = now.toISOString().slice(0, 10);
  const windowStartDate = new Date(now);
  windowStartDate.setDate(windowStartDate.getDate() - 90);
  const windowStart = windowStartDate.toISOString().slice(0, 10);

  const [segments, topAdvertisers, platforms, saturation, benchmarks, serpVisibility, serpResults, sampleAds] =
    await Promise.all([
      getSegmentSummary(TORT_SLUG),
      getTopAdvertisersBySegment(TORT_SLUG, 25),
      getAdvertiserPlatforms(TORT_SLUG),
      getAdSaturationWindowed(windowStart, windowEnd, TORT_SLUG),
      getTortCostBenchmarks(),
      getSerpVisibilityWindowed(windowStart, windowEnd, TORT_SLUG),
      getSerpTopResults(TORT_SLUG, 5),
      getSampleAds(TORT_SLUG, 12),
    ]);

  /* ── Aggregate advertising stats ──────────────────────────────────── */
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

  const tortLabel = "Social Media Addiction";
  const tortLabelLower = tortLabel.toLowerCase();
  const benchmark = benchmarks
    .sort((a, b) => b.observed_date.localeCompare(a.observed_date))
    .find((b) => {
      const bName = b.tort_name.toLowerCase();
      if (bName === tortLabelLower) return true;
      if (bName.includes("social media") || bName.includes("social_media")) return true;
      return false;
    }) ?? null;

  const hasLiveData = totalAdvertisers > 0 || totalSpend > 0 || totalCreatives > 0;

  /* ── Build aggregations for client ────────────────────────────────── */

  // Sort youth mental health by MDE percentage desc for top 15
  const youthTop15 = [...youthMentalHealth]
    .sort((a, b) => b.mde_percentage - a.mde_percentage)
    .slice(0, 15);

  // Compute national average MDE
  const avgMde =
    youthMentalHealth.length > 0
      ? youthMentalHealth.reduce((s, r) => s + r.mde_percentage, 0) / youthMentalHealth.length
      : 18.82;

  // State regulatory sorted by regulatory_score desc
  const regulatorySorted = [...stateRegulatory].sort(
    (a, b) => b.regulatory_score - a.regulatory_score
  );

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

  /* ── Build page data for client ───────────────────────────────────── */
  const pageData: SocialMediaPageData = {
    youthTop15,
    avgMde: Number(avgMde.toFixed(2)),
    topMdeState: youthTop15[0] ?? null,
    teenScreenTime,
    regulatorySorted,
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

  // Summary for AI panel
  const topYouthStates = youthTop15.slice(0, 5).map((s) => `${s.state} (${s.mde_percentage}%)`).join(", ");
  const topScreenStates = teenScreenTime.slice(0, 5).map((s) => {
    const h = Math.floor(s.avg_daily_minutes / 60);
    const m = s.avg_daily_minutes % 60;
    return `${s.state} (${h}h ${m}m)`;
  }).join(", ");

  return (
    <>
      <SocialMediaClient data={pageData} />
      <AskAIPanel
        tortContext={{
          tortName: "Social Media Addiction",
          injury: "Depression, anxiety, eating disorders, self-harm, suicidal ideation — linked to addictive social media platform design targeting adolescents",
          mdlNumber: "MDL 3047, N.D. Cal. (Judge Yvonne Gonzalez Rogers); also JCCP 5255",
          pendingCases: "2,400+ federal; 10,000+ individual; ~800 school districts; 41+ state AGs",
          settlementRange: "KGM verdict: $6M ($4.2M Meta, $1.8M YouTube). New Mexico verdict: $375M against Meta. No global settlement yet.",
          estimatedCPA: "TBD — early-stage individual PI tort with emerging advertising landscape",
          bellwetherDate: "Jun 15, 2026 (federal MDL bellwether #1 — school district); Aug 6, 2026 (bellwether #2 — state AG)",
          caseSummary: "Plaintiffs allege social media platforms (Meta/Instagram, Google/YouTube, Snap/Snapchat, ByteDance/TikTok, Discord) deliberately engineered addictive features exploiting adolescent brain development. Claims include negligent product design, failure to warn, fraudulent concealment, and consumer protection violations. Section 230 and First Amendment defenses largely rejected.",
          qualification: "Claimant must have been a minor (under 18, or under 21 in some filings) when addiction began. Requires documented mental health diagnosis (depression, anxiety, PTSD, eating disorder, self-harm, suicidal ideation) and medical records linking social media use to mental health decline. Platform usage on named defendant platforms during 2012–present.",
          advertisingLandscape: `Active advertisers: ${totalAdvertisers}. Estimated spend: $${totalSpend > 0 ? (totalSpend / 1000).toFixed(0) + "K" : "N/A"}. Platforms: ${allPlatforms.size > 0 ? Array.from(allPlatforms).join(", ") : "data collection in progress"}.`,
          targetingInsights: `Top youth MDE states: ${topYouthStates}. Top teen screen time: ${topScreenStates}. ${regulatorySorted.filter((r) => r.regulatory_score >= 4).length} states with high regulatory scores (4-5). Key signals: youth mental health burden, teen screen time exposure, state regulatory activity, judicial profiles, PI viability scores.`,
        }}
      />
    </>
  );
}
