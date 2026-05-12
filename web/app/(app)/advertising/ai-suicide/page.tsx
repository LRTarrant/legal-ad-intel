import nextDynamic from "next/dynamic";
import { getSupabase } from "@/lib/supabase";
import type { AiSuicidePageData } from "./ai-suicide-client";

const AiSuicideClient = nextDynamic(() => import("./ai-suicide-client").then((m) => m.AiSuicideClient));
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
import { getJudicialProfiles, type JudicialProfileRow } from "@/lib/queries/judicial";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return {
    title:
      "AI Suicide / Self-Harm (Pre-MDL) Tort Intelligence | Legal Marketing Intelligence",
    description:
      "Advertising intelligence brief for the emerging AI chatbot suicide and self-harm litigation — Character.AI, ChatGPT, and Replika lawsuits, Garcia settlement, Raine v. OpenAI, qualifying criteria, settlement projections, and state-level volume signals for plaintiff firms.",
  };
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const TORT_SLUG = "ai_suicide";

/* ------------------------------------------------------------------ */
/*  Data-fetching helpers                                               */
/* ------------------------------------------------------------------ */

interface AiSuicideAdverseEventRow {
  id: number;
  category: string;
  detail: string;
  severity: string;
  source: string;
  year: number;
}

interface AiSuicideTimelineRow {
  id: number;
  event_date: string;
  event: string;
  significance: string;
  is_future: boolean;
}

interface AiSuicideQualifyingTierRow {
  id: number;
  tier: string;
  label: string;
  criteria: string;
  intake_signal: string;
  estimated_cpl_band: string;
  notes: string;
}

interface AiSuicideSettlementProjectionRow {
  id: number;
  injury_tier: string;
  low_estimate: number;
  high_estimate: number;
  comparable_litigation: string;
  rationale: string;
}

interface VolumeSignalRow {
  state: string;
  youth_suicide_rate_per_100k: number;
  ai_chatbot_adoption_index: string;
  composite_signal_rank: number;
}

async function fetchAiSuicideAdverseEvents(): Promise<AiSuicideAdverseEventRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("ai_suicide_adverse_events")
    .select("id,category,detail,severity,source,year");

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    id: Number(d.id),
    category: String(d.category),
    detail: String(d.detail),
    severity: String(d.severity),
    source: String(d.source),
    year: Number(d.year) || 0,
  }));
}

async function fetchAiSuicideTimeline(): Promise<AiSuicideTimelineRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("ai_suicide_timeline")
    .select("id,event_date,event,significance,is_future")
    .order("id", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    id: Number(d.id),
    event_date: String(d.event_date),
    event: String(d.event),
    significance: String(d.significance),
    is_future: Boolean(d.is_future),
  }));
}

async function fetchAiSuicideQualifyingTiers(): Promise<AiSuicideQualifyingTierRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("ai_suicide_qualifying_criteria_tiers")
    .select("id,tier,label,criteria,intake_signal,estimated_cpl_band,notes")
    .order("id", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    id: Number(d.id),
    tier: String(d.tier),
    label: String(d.label),
    criteria: String(d.criteria),
    intake_signal: String(d.intake_signal),
    estimated_cpl_band: String(d.estimated_cpl_band),
    notes: String(d.notes ?? ""),
  }));
}

async function fetchAiSuicideSettlementProjections(): Promise<AiSuicideSettlementProjectionRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("ai_suicide_settlement_projections")
    .select("id,injury_tier,low_estimate,high_estimate,comparable_litigation,rationale")
    .order("id", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    id: Number(d.id),
    injury_tier: String(d.injury_tier),
    low_estimate: Number(d.low_estimate) || 0,
    high_estimate: Number(d.high_estimate) || 0,
    comparable_litigation: String(d.comparable_litigation),
    rationale: String(d.rationale),
  }));
}

async function fetchVolumeSignalsByState(): Promise<VolumeSignalRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("ai_suicide_volume_signals_by_state")
    .select("state,youth_suicide_rate_per_100k,ai_chatbot_adoption_index,composite_signal_rank")
    .order("composite_signal_rank", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    state: String(d.state),
    youth_suicide_rate_per_100k: Number(d.youth_suicide_rate_per_100k) || 0,
    ai_chatbot_adoption_index: String(d.ai_chatbot_adoption_index),
    composite_signal_rank: Number(d.composite_signal_rank) || 0,
  }));
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                      */
/* ------------------------------------------------------------------ */

export default async function AiSuicidePage() {
  let adverseEvents: AiSuicideAdverseEventRow[] = [];
  let timeline: AiSuicideTimelineRow[] = [];
  let qualifyingTiers: AiSuicideQualifyingTierRow[] = [];
  let settlementProjections: AiSuicideSettlementProjectionRow[] = [];
  let volumeSignals: VolumeSignalRow[] = [];
  let judicialRows: JudicialProfileRow[] = [];

  /* -- Supabase data (Promise.allSettled -- resilient) --------------- */
  const results = await Promise.allSettled([
    fetchAiSuicideAdverseEvents(),
    fetchAiSuicideTimeline(),
    fetchAiSuicideQualifyingTiers(),
    fetchAiSuicideSettlementProjections(),
    fetchVolumeSignalsByState(),
    getJudicialProfiles(),
  ]);

  if (results[0].status === "fulfilled") adverseEvents = results[0].value;
  else console.error("[AiSuicide] fetchAiSuicideAdverseEvents failed:", results[0].reason);

  if (results[1].status === "fulfilled") timeline = results[1].value;
  else console.error("[AiSuicide] fetchAiSuicideTimeline failed:", results[1].reason);

  if (results[2].status === "fulfilled") qualifyingTiers = results[2].value;
  else console.error("[AiSuicide] fetchAiSuicideQualifyingTiers failed:", results[2].reason);

  if (results[3].status === "fulfilled") settlementProjections = results[3].value;
  else console.error("[AiSuicide] fetchAiSuicideSettlementProjections failed:", results[3].reason);

  if (results[4].status === "fulfilled") volumeSignals = results[4].value;
  else console.error("[AiSuicide] fetchVolumeSignalsByState failed:", results[4].reason);

  if (results[5].status === "fulfilled") judicialRows = results[5].value;
  else console.error("[AiSuicide] fetchJudicialProfiles failed:", results[5].reason);

  /* -- Advertising data (standard query helpers) --------------------- */
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

  const tortLabel = "AI Suicide / Self-Harm";
  const tortLabelLower = tortLabel.toLowerCase();
  const benchmark = benchmarks
    .sort((a, b) => b.observed_date.localeCompare(a.observed_date))
    .find((b) => {
      const bName = b.tort_name.toLowerCase();
      if (bName === tortLabelLower) return true;
      if (bName.includes("ai suicide") || bName.includes("chatbot") || bName.includes("self-harm")) return true;
      return false;
    }) ?? null;

  const hasLiveData = totalAdvertisers > 0 || totalSpend > 0 || totalCreatives > 0;

  /* -- Judicial aggregation by state -------------------------------- */
  const judicialByState: Record<string, { counties: number; profiles: Record<string, number> }> = {};
  for (const j of judicialRows) {
    if (!judicialByState[j.state]) {
      judicialByState[j.state] = { counties: 0, profiles: {} };
    }
    judicialByState[j.state].counties++;
    judicialByState[j.state].profiles[j.judicial_profile] =
      (judicialByState[j.state].profiles[j.judicial_profile] || 0) + 1;
  }

  /* -- Build page data for client ----------------------------------- */
  const pageData: AiSuicidePageData = {
    adverseEvents,
    timeline,
    qualifyingTiers,
    settlementProjections,
    volumeSignalsTop15: volumeSignals.slice(0, 15),
    judicialByState,
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

  const topSignalStates = volumeSignals
    .slice(0, 5)
    .map((s) => `${s.state} (rank #${s.composite_signal_rank})`)
    .join(", ");

  return (
    <>
      <AiSuicideClient data={pageData} />
      <NewLandingPagesCard tortSlug="ai-suicide" tortLabel="AI Suicide / Self-Harm" />
      <AskAIPanel
        tortContext={{
          tortName: "AI Suicide / Self-Harm (Pre-MDL)",
          injury:
            "Completed suicide, attempted suicide, self-harm, chatbot-induced psychosis, emotional dependency, social isolation, financial ruin, and family estrangement — all linked to AI companion chatbot interactions (Character.AI, ChatGPT, Replika). Victims include minors (ages 13-17), young adults (18-35), and older adults (40+). At least nine completed suicides and one homicide-suicide documented in court filings.",
          mdlNumber: "No MDL yet — cases being filed individually in federal and state courts across California, Florida, Texas, Colorado, New York, and Connecticut as of April 2026",
          pendingCases:
            "15+ civil lawsuits filed. Five Character.AI/Google cases settled January 2026 (terms undisclosed). Eight OpenAI cases pending. Kentucky AG lawsuit pending. Texas AG investigation ongoing. FTC 6(b) inquiry covering seven companies.",
          settlementRange:
            "Pre-MDL — no disclosed settlement values. Closest comparable: K.G.M. v. Meta social media addiction verdict ($6M — $3M compensatory + $3M punitive, March 2026). Character.AI/Google five-case settlement terms undisclosed. Projected ranges: Tier A (minor wrongful death, chat logs) $3M-$25M; Tier B (adult wrongful death) $1M-$12M; Tier C (non-fatal self-harm) $250K-$4M; Tier D (dependency only) $25K-$400K.",
          estimatedCPA:
            "No reliable benchmark yet — very early tort. CPL bands by tier: A ($3K-$8K), B ($1.5K-$4K), C ($800-$2.5K), D ($300-$900). Social media addiction comparable CPL adds premium due to lower supply and higher media value of AI suicide cases.",
          bellwetherDate:
            "None scheduled. No MDL consolidation. Watch JPML filings and MTMP Spring 2026 AI Chatbot session for coordination signals. Projected bellwether window: 2027-2028 post-hypothetical MDL.",
          caseSummary:
            "Plaintiffs allege AI chatbot companies — Character Technologies (Character.AI), OpenAI (ChatGPT), Google/Alphabet, and Microsoft — knowingly designed companion AI systems that are addictive, deceptively human-like, and inadequately safeguarded against vulnerable users in mental-health crises. Core theories: strict product liability (design defect — no adequate crisis intervention), failure to warn, negligence, wrongful death, IIED, state consumer protection violations (FDUTPA, CLRA, TDTPA). Key precedent: May 2025 Conway ruling that chatbot output is NOT protected by the First Amendment. California SB 243 and New York Gen. Business Law § 1700 create private rights of action for companion chatbot harms.",
          qualification:
            "Person who used an AI companion chatbot (Character.AI, ChatGPT, Replika, or comparable) AND: (a) died by suicide with AI chat logs preserved showing chatbot failure to intervene or active encouragement, (b) survived a suicide attempt linked to AI chatbot interactions, (c) required psychiatric hospitalization after AI-induced crisis, or (d) suffered documented emotional dependency/social isolation from AI chatbot use. Required: device with chat history OR exported chat logs, medical records (death certificate, ER records, psychiatric records), timing within statute of limitations.",
          advertisingLandscape: `Active advertisers: ${totalAdvertisers}. Estimated spend: $${totalSpend > 0 ? (totalSpend / 1000).toFixed(0) + "K" : "N/A"}. Platforms: ${allPlatforms.size > 0 ? Array.from(allPlatforms).join(", ") : "data collection in progress"}. Field is very early — Levin Papantonio, Levy Konigsberg, TorHoerman Law, TruLaw, and Nadrich & Cohen have intake pages. Opportunity window is wide.`,
          targetingInsights: `Top volume-signal states: ${topSignalStates}. Primary demographic: families of minors (13-17) who used AI chatbots and suffered mental health crises or died by suicide. Secondary: young adults (18-35) who used ChatGPT/Character.AI during mental health vulnerability. Tertiary: adult survivors (any age) with documented AI chatbot-induced psychiatric harm. High-value signal: preserved chat logs showing AI encouragement of self-harm or failure to provide crisis resources.`,
        }}
      />
    </>
  );
}
