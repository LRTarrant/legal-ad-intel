"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Scale,
  DollarSign,
  Target,
  AlertTriangle,
  TrendingUp,
  FileText,
  Shield,
  MapPin,
  Users,
  Clock,
  ChevronRight,
  Eye,
  Monitor,
  Database,
  Crosshair,
  Activity,
  Landmark,
  Layers,
  ExternalLink,
  Inbox,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CostBenchmarkScorecard } from "../../components/cost-benchmark-scorecard";
import type { BenchmarkScorecardData } from "../../components/cost-benchmark-scorecard";
import { extractDomain } from "@/lib/queries";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
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
  tier: string; // 'A' | 'B' | 'C' | 'D'
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

interface SegmentRow {
  segment: string;
  advertiser_count: number;
  total_spend: number;
  total_creatives: number;
}

interface AdvertiserRow {
  advertiser_name: string;
  segment: string;
  total_spend: number;
  total_creatives: number;
  market_count: number;
}

interface MarketRow {
  geo_name: string;
  state_abbr: string | null;
  saturation_score: number | null;
  total_advertisers: number;
  estimated_spend: number;
}

interface SerpVisRow {
  domain: string;
  visibility_score: number;
  avg_position: number | null;
  organic_appearances: number;
  paid_appearances: number;
  top_3_count: number;
  top_10_count: number;
}

interface SerpResultRow {
  domain: string;
  title: string;
  link: string | null;
  snippet: string | null;
  position: number;
}

interface SampleAdRow {
  id: string;
  advertiser_raw: string;
  creative_text: string | null;
  creative_url: string | null;
  source: string;
  ad_format: string | null;
  first_seen: string;
  last_seen: string;
}

export interface AiSuicidePageData {
  adverseEvents: AiSuicideAdverseEventRow[];
  timeline: AiSuicideTimelineRow[];
  qualifyingTiers: AiSuicideQualifyingTierRow[];
  settlementProjections: AiSuicideSettlementProjectionRow[];
  volumeSignalsTop15: VolumeSignalRow[];
  judicialByState: Record<string, { counties: number; profiles: Record<string, number> }>;
  // advertising
  segments: SegmentRow[];
  topAdvertisers: AdvertiserRow[];
  platformMap: Record<string, string[]>;
  totalAdvertisers: number;
  totalSpend: number;
  totalCreatives: number;
  allPlatforms: string[];
  topMarkets: MarketRow[];
  benchmark: BenchmarkScorecardData | null;
  hasLiveData: boolean;
  serpVisibility: SerpVisRow[];
  serpResults: SerpResultRow[];
  sampleAds: SampleAdRow[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtCur(n: number | null): string {
  if (n == null) return "\u2014";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtNum(n: number | null): string {
  if (n == null) return "\u2014";
  return n.toLocaleString();
}

const SEGMENT_META: Record<string, { label: string; color: string; bg: string; bar: string }> = {
  on_docket:  { label: "On-Docket Firms",  color: "#10B981", bg: "#ECFDF5", bar: "bg-emerald-500" },
  off_docket: { label: "Off-Docket Firms", color: "#F59E0B", bg: "#FFFBEB", bar: "bg-amber-500" },
  aggregator: { label: "Aggregators",       color: "#7C3AED", bg: "#FAF5FF", bar: "bg-purple-500" },
  unknown:    { label: "Unknown",           color: "#6B7280", bg: "#F9FAFB", bar: "bg-slate-400" },
};

function segMeta(seg: string) {
  return SEGMENT_META[seg] ?? SEGMENT_META.unknown;
}

const PLATFORM_COLORS: Record<string, string> = {
  meta:       "#3B82F6",
  google:     "#10B981",
  tiktok:     "#EC4899",
  youtube:    "#EF4444",
  ispot:      "#8B5CF6",
  mediaradar: "#F59E0B",
  tv:         "#6366F1",
};

function getSeverityBorderColor(severity: string): string {
  switch (severity) {
    case "critical": return "border-l-red-500";
    case "high": return "border-l-amber-500";
    case "medium": return "border-l-slate-400";
    default: return "border-l-slate-300";
  }
}

function getSeverityBadge(severity: string): { bg: string; text: string; label: string } {
  switch (severity) {
    case "critical": return { bg: "bg-red-100", text: "text-red-700", label: "Critical" };
    case "high": return { bg: "bg-amber-100", text: "text-amber-700", label: "High" };
    case "medium": return { bg: "bg-slate-100", text: "text-slate-600", label: "Medium" };
    default: return { bg: "bg-slate-100", text: "text-slate-500", label: severity };
  }
}

const TIER_META: Record<string, { color: string; bg: string; border: string; label: string }> = {
  A: { color: "#059669", bg: "bg-emerald-50", border: "border-emerald-300", label: "Tier A — Cleanest" },
  B: { color: "#0891B2", bg: "bg-cyan-50",    border: "border-cyan-300",    label: "Tier B — Strong" },
  C: { color: "#D97706", bg: "bg-amber-50",   border: "border-amber-300",   label: "Tier C — Qualified" },
  D: { color: "#6B7280", bg: "bg-slate-50",   border: "border-slate-300",   label: "Tier D — Investigate" },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AiSuicideClient({ data }: { data: AiSuicidePageData }) {
  // Judicial summary stats
  const judicialStates = Object.entries(data.judicialByState);
  const liberalCount = judicialStates.filter(([, v]) => {
    const dominant = Object.entries(v.profiles).sort((a, b) => b[1] - a[1])[0];
    return dominant && dominant[0] === "Liberal";
  }).length;
  const moderateCount = judicialStates.filter(([, v]) => {
    const dominant = Object.entries(v.profiles).sort((a, b) => b[1] - a[1])[0];
    return dominant && dominant[0] === "Moderate";
  }).length;
  const conservativeCount = judicialStates.filter(([, v]) => {
    const dominant = Object.entries(v.profiles).sort((a, b) => b[1] - a[1])[0];
    return dominant && dominant[0] === "Conservative";
  }).length;

  const sortedTimeline = useMemo(() => {
    return [...data.timeline].sort((a, b) => a.id - b.id);
  }, [data.timeline]);

  return (
    <div className="space-y-8">
      {/* -- 1. Page Header ------------------------------------------------ */}
      <div>
        <Link
          href="/advertising/bard-powerport"
          className="text-sm text-slate-gray hover:text-midnight-navy"
        >
          <span className="flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Tort Profiles
          </span>
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl font-bold text-midnight-navy">
            AI Suicide / Self-Harm
          </h1>
          <span className="rounded-full bg-intelligence-teal/10 border border-intelligence-teal/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-intelligence-teal">
            EMERGING &mdash; PRE-MDL
          </span>
        </div>
        <p className="mt-1 text-lg text-slate-gray">
          AI Chatbot Suicide, Self-Harm, and Companion Dependency Litigation
        </p>
        <p className="mt-1 text-sm text-slate-gray">
          Advertising intelligence brief for the emerging AI chatbot harm litigation &mdash;
          Character.AI, ChatGPT, and Replika lawsuits, Garcia settlement analysis,
          state legislation tracker, qualifying criteria, settlement projections, and
          state-level volume signals for plaintiff firms moving early on a pre-MDL opportunity.
        </p>
        <p className="mt-0.5 text-xs text-slate-gray">
          Last Updated: April 22, 2026
        </p>
      </div>

      {/* -- 2. Key Stats Row ---------------------------------------------- */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Scale className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              MDL Status
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">None yet</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Individual filings in state + federal courts</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Activity className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Filed Lawsuits
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">15+</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Civil suits across CA, FL, TX, CO, NY, CT</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Landmark className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Settled Cases
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">5</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Character.AI/Google &mdash; Jan. 2026 (terms sealed)</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Comparable Verdict
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">$6M</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">K.G.M. v. Meta (social media, Mar. 2026)</p>
        </div>
      </div>

      {/* -- 3. Case Summary ----------------------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-4">
          Case Summary
        </h2>
        <div className="space-y-4 text-sm leading-relaxed text-midnight-navy/80">
          <p>
            <span className="font-semibold text-midnight-navy">Defendants:</span>{" "}
            Character Technologies, Inc. (Character.AI); OpenAI, Inc.; Google LLC / Alphabet Inc.; Microsoft Corporation; co-founders Noam Shazeer and Daniel De Freitas; CEO Sam Altman.{" "}
            <span className="font-semibold text-midnight-navy">Courts:</span>{" "}
            No MDL. Cases filed individually in M.D. Fla., E.D. Tex., D. Colo., N.D.N.Y., San Francisco Superior Court, LA County Superior Court, Connecticut.{" "}
            <span className="font-semibold text-midnight-navy">Key ruling:</span>{" "}
            May 2025 &mdash; Judge Conway denied MTD, ruling chatbot output is NOT protected by the First Amendment.{" "}
            <span className="font-semibold text-midnight-navy">Comparable verdict:</span>{" "}
            $6M (K.G.M. v. Meta, social media addiction, March 2026).
          </p>
          <p>
            <span className="font-semibold text-midnight-navy">Core Allegations:</span>{" "}
            AI chatbot companies knowingly designed companion AI systems that are addictive, deceptively
            human-like, and inadequately safeguarded against vulnerable users in mental-health crises.
            Chatbots fostered romantic dependency, provided suicide method instructions, failed to
            provide crisis resources when suicidal ideation was expressed, and in some cases actively
            encouraged self-harm. Claims include strict product liability (design defect), failure to
            warn, negligence, wrongful death, IIED, and state consumer protection violations.
          </p>
          <p>
            <span className="font-semibold text-midnight-navy">Settlement Projections:</span>{" "}
            No disclosed settlement values from the January 2026 Character.AI/Google resolution.
            The K.G.M. v. Meta social media addiction verdict ($6M, non-fatal) anchors the comparable
            range. Projected: Tier A (minor wrongful death, chat logs) $3M&ndash;$25M; Tier B (adult
            wrongful death) $1M&ndash;$12M. Upward pressure from: OpenAI allegedly eliminating suicide
            refusal rules to maximize engagement, 377 flagged messages in Raine case without intervention,
            and Character.AI chatbots affirmatively encouraging suicide.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Coordination Status
            </p>
            <p className="text-sm text-midnight-navy">
              No MDL. Watch JPML filings + MTMP Spring 2026 AI chatbot session for coordination signals.
            </p>
          </div>
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Legal Theories
            </p>
            <p className="text-sm text-midnight-navy">
              Strict product liability (design defect), failure to warn, negligence, wrongful death, IIED, FDUTPA, CLRA, COPPA violations, CA SB 243, NY Gen. Business Law 1700
            </p>
          </div>
        </div>
      </div>

      {/* -- 4. Key Adverse Events ----------------------------------------- */}
      <div id="adverse-events" className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4.5 h-4.5 text-red-500" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Key Adverse Events &amp; Harm Catalogue
          </h2>
        </div>
        <p className="mb-4 text-sm text-midnight-navy/70">
          Documented harm events from court filings, press coverage, and academic research linking AI chatbot interactions to suicide, self-harm, and psychological crisis.
        </p>

        {data.adverseEvents.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.adverseEvents.map((item) => {
              const badge = getSeverityBadge(item.severity);
              return (
                <div
                  key={item.id}
                  className={`rounded-lg border-l-4 ${getSeverityBorderColor(item.severity)} border border-cloud bg-white p-4`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-midnight-navy">
                      {item.category}
                    </p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-midnight-navy/70 mb-2">
                    {item.detail}
                  </p>
                  <p className="text-[10px] text-slate-gray">
                    {item.source} ({item.year})
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
            <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
            <p className="text-sm font-medium text-midnight-navy/60">
              Adverse event data loading...
            </p>
          </div>
        )}
      </div>

      {/* -- 5. Regulatory & Litigation Timeline --------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Regulatory &amp; Litigation Timeline
          </h2>
        </div>

        {sortedTimeline.length > 0 ? (
          <div className="relative pl-8">
            <div className="absolute left-3 top-2 bottom-2 w-px bg-intelligence-teal/20" />
            {sortedTimeline.map((entry) => (
              <div
                key={entry.id}
                className={`relative mb-4 last:mb-0 ${entry.is_future ? "opacity-60" : ""}`}
              >
                <div
                  className={`absolute -left-5 top-1.5 h-3 w-3 rounded-full border-2 ${
                    entry.is_future
                      ? "border-slate-gray/40 bg-white"
                      : "border-intelligence-teal bg-intelligence-teal"
                  }`}
                  style={entry.is_future ? { borderStyle: "dashed" } : undefined}
                />
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-xs font-semibold ${entry.is_future ? "text-slate-gray" : "text-midnight-navy"}`}>
                        {entry.event_date}
                      </p>
                      {entry.is_future && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          Watch
                        </span>
                      )}
                    </div>
                    <p className={`mt-0.5 text-sm leading-relaxed ${entry.is_future ? "italic text-slate-gray" : "text-midnight-navy/80"}`}>
                      {entry.event}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-gray">
                      {entry.significance}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
            <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
            <p className="text-sm font-medium text-midnight-navy/60">
              Timeline data loading...
            </p>
          </div>
        )}
      </div>

      {/* -- 6. Tiered Qualification Criteria ------------------------------ */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Tiered Qualification Criteria
          </h2>
        </div>
        <p className="mb-4 text-sm text-midnight-navy/70">
          Intake is stratified by harm severity, evidence quality, and lead economics. Tier A (minor
          wrongful death with preserved chat logs) commands the highest case value. Tier D
          (dependency without physical harm) is the broadest but most expensive to screen.
        </p>

        {data.qualifyingTiers.length > 0 ? (
          <div className="space-y-3">
            {data.qualifyingTiers.map((t) => {
              const meta = TIER_META[t.tier] ?? TIER_META.D;
              return (
                <div
                  key={t.id}
                  className={`rounded-lg border-l-4 ${meta.border} border bg-white p-4`}
                  style={{ borderLeftColor: meta.color }}
                >
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <p className="text-sm font-bold" style={{ color: meta.color }}>
                      {meta.label}: {t.label}
                    </p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.bg}`} style={{ color: meta.color }}>
                      {t.estimated_cpl_band}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-midnight-navy/80 mb-2">
                    <span className="font-semibold text-midnight-navy">Criteria: </span>
                    {t.criteria}
                  </p>
                  <p className="text-xs leading-relaxed text-midnight-navy/70 mb-1">
                    <span className="font-semibold text-midnight-navy">Intake signal: </span>
                    {t.intake_signal}
                  </p>
                  {t.notes && (
                    <p className="text-xs leading-relaxed text-slate-gray italic">
                      {t.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
            <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
            <p className="text-sm font-medium text-midnight-navy/60">
              Qualification tier data loading...
            </p>
          </div>
        )}

        {/* Qualifying Injuries */}
        <h3 className="mt-6 mb-3 text-sm font-semibold text-midnight-navy">
          Qualifying Harm Categories
        </h3>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {[
            "Completed suicide (minor or adult) linked to AI chatbot use",
            "Suicide attempt requiring hospitalization",
            "Self-harm with documented AI chatbot encouragement",
            "Chatbot-induced psychosis or psychiatric hospitalization",
            "Emotional dependency leading to social isolation",
            "AI chatbot posing as therapist without credentials",
            "Sexual exploitation of minor via AI chatbot",
            "Chatbot providing suicide method instructions",
            "Chatbot discouraging crisis resources or family contact",
            "Financial/life ruin from AI chatbot manipulation",
            "Violence encouragement against family members",
            "Wrongful death (including homicide-suicide via chatbot psychosis)",
          ].map((injury) => (
            <div
              key={injury}
              className="flex items-center gap-2 rounded-md bg-red-50/60 px-3 py-2"
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />
              <p className="text-xs text-midnight-navy/80">{injury}</p>
            </div>
          ))}
        </div>
      </div>

      {/* -- 7. Settlement Projections ------------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Settlement Projections by Injury Tier
          </h2>
        </div>
        <p className="mb-4 text-sm text-midnight-navy/70">
          Pre-MDL estimates anchored on the K.G.M. v. Meta social media addiction verdict ($6M, March 2026)
          and the undisclosed Character.AI/Google five-case settlement (January 2026). These are directional &mdash; not guarantees.
        </p>
        {data.settlementProjections.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cloud">
                  <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">Injury Tier</th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">Low</th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">High</th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">Comparable</th>
                  <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">Rationale</th>
                </tr>
              </thead>
              <tbody>
                {data.settlementProjections.map((row) => (
                  <tr key={row.id} className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors">
                    <td className="py-3 pr-4 font-medium text-midnight-navy">{row.injury_tier}</td>
                    <td className="py-3 px-3 text-right font-mono text-midnight-navy">{fmtCur(row.low_estimate)}</td>
                    <td className="py-3 px-3 text-right font-mono text-midnight-navy">{fmtCur(row.high_estimate)}</td>
                    <td className="py-3 px-3 text-xs text-midnight-navy/70">{row.comparable_litigation}</td>
                    <td className="py-3 pl-3 text-xs text-midnight-navy/70">{row.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
            <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
            <p className="text-sm font-medium text-midnight-navy/60">
              Settlement projection data loading...
            </p>
          </div>
        )}
      </div>

      {/* -- 8. Volume Signals by State ------------------------------------ */}
      <div className="rounded-lg border border-intelligence-teal/20 bg-gradient-to-br from-intelligence-teal/[0.04] to-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Crosshair className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Volume Signals by State
          </h2>
        </div>
        <p className="mb-6 text-sm text-slate-gray">
          Composite ranking combining youth suicide rates, AI chatbot adoption, and state-level litigation/regulatory activity
        </p>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-intelligence-teal" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Composite Signal Ranking (Top 15)
            </h3>
          </div>
          <p className="mb-2 text-xs text-slate-gray">
            Source: CDC WISQARS youth suicide rates (age 10-24), Pew Research teen AI chatbot adoption (Dec. 2025), state litigation/regulatory activity.
          </p>

          <div className="mb-4 rounded-md border border-intelligence-teal/30 bg-intelligence-teal/5 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              64% of US teens have used AI chatbots (Pew Research, Dec. 2025). States with the highest
              youth suicide rates, largest teen populations, and active litigation or regulatory
              enforcement represent the deepest plaintiff pools.
            </p>
          </div>

          {data.volumeSignalsTop15.length > 0 ? (
            <div className="rounded-lg bg-white p-4">
              <p className="mb-3 text-xs font-semibold text-midnight-navy">
                Youth Suicide Rate per 100K (Age 10-24) by State
              </p>
              <ResponsiveContainer width="100%" height={data.volumeSignalsTop15.length * 32 + 20}>
                <BarChart
                  data={data.volumeSignalsTop15}
                  layout="vertical"
                  margin={{ top: 0, right: 60, bottom: 0, left: 0 }}
                >
                  <XAxis type="number" domain={[0, "auto"]} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="state"
                    width={140}
                    tick={{ fontSize: 11, fill: "#1B2A4A" }}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `${value.toFixed(1)} per 100K`,
                      "Youth suicide rate",
                    ]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="youth_suicide_rate_per_100k" radius={[0, 4, 4, 0]}>
                    {data.volumeSignalsTop15.map((_, i) => (
                      <Cell key={i} fill={i < 5 ? "#0d9488" : "#5EEAD4"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
              <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
              <p className="text-sm font-medium text-midnight-navy/60">Volume signal data loading...</p>
            </div>
          )}
        </div>
      </div>

      {/* -- 9. Strategic Opportunity Cards --------------------------------- */}
      <div className="rounded-lg border border-intelligence-teal/20 bg-gradient-to-br from-intelligence-teal/[0.04] to-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Monitor className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Strategic Market Gaps
          </h2>
          <span className="rounded-full bg-cyan-50 border border-cyan-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-700">
            Research-derived
          </span>
        </div>
        <p className="mb-6 text-sm text-slate-gray">
          Five underserved angles identified from the gap between current firm activity and the full harm landscape.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              title: "Gap 1: Adult Non-Minor Victims (Ages 18-40)",
              detail: "Most advertising targets families of minors, yet 7 of 8 November 2025 OpenAI suits involve adult plaintiffs (ages 23-48). There is virtually no intake advertising targeting adult ChatGPT users who suffered documented mental health crises. Adult users represent a much larger potential pool than minors.",
            },
            {
              title: "Gap 2: Replika and Other Companion AI Platforms",
              detail: "All current filings and advertising target Character.AI and OpenAI. Replika has 10M+ users, was restricted in Italy for creating emotional dependency, and has documented self-harm links. No Replika-specific cases filed. The firm that files first will define that sub-category.",
            },
            {
              title: "Gap 3: School-Age Users — Parent + School District Angle",
              detail: "Schools frequently provide AI chatbot access (ChatGPT via OpenAI Education, Bing Copilot). No current lawsuits name school districts as defendants. Mirrors the 2,000+ school district social media addiction suits. Adds a deep-pocket defendant with identifiable plaintiffs.",
            },
            {
              title: "Gap 4: LGBTQ+ Youth and Gender Identity Vulnerability",
              detail: "The Enneking case explicitly notes gender identity issues. LGBTQ+ youth use AI chatbots at disproportionately high rates for support and have elevated suicide risk. No firm intake page specifically targets this population. Both a volume and media opportunity.",
            },
            {
              title: "Gap 5: Section 230 Thought Leadership",
              detail: "The May 2025 Conway ruling that chatbot output is not First Amendment-protected was critical, but Section 230 immunity has not been resolved at the appellate level. A firm publishing the clearest SEO-optimized explanation of why Section 230 does NOT apply to AI chatbot harm will capture organic search from families researching lawsuit defenses.",
            },
          ].map((hook, i) => (
            <div key={i} className="rounded-lg border-l-4 border-intelligence-teal bg-intelligence-teal/5 p-4">
              <div className="flex items-start gap-2">
                <Target className="w-4 h-4 mt-0.5 shrink-0 text-intelligence-teal" />
                <div>
                  <p className="text-sm font-semibold text-midnight-navy">{hook.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-midnight-navy/70">{hook.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* -- 10. Bottom-Line Angles ---------------------------------------- */}
      <div className="rounded-lg border-l-4 border-intelligence-teal bg-intelligence-teal/[0.04] p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Bottom-Line Recommendations
          </h2>
        </div>
        <div className="space-y-3 text-sm text-midnight-navy/80">
          <p>
            <span className="font-semibold text-midnight-navy">1. Move now on adult victim intake.</span>{" "}
            The field is fixated on minor victims, but adult cases (Shamblin 23, Enneking 26, Ceccanti 48, Gordon 40)
            are legally viable and represent a much larger addressable pool. Build dedicated adult-focused creatives.
          </p>
          <p>
            <span className="font-semibold text-midnight-navy">2. Chat log preservation is everything.</span>{" "}
            Cases with preserved AI chat logs showing encouragement or failure to intervene are
            orders of magnitude more valuable than dependency-only claims. Lead with &ldquo;Do you have
            screenshots or chat history?&rdquo; as the primary qualifying question.
          </p>
          <p>
            <span className="font-semibold text-midnight-navy">3. California and New York offer statutory claims.</span>{" "}
            CA SB 243 (effective Jan. 2026) and NY Gen. Business Law 1700 create private rights of action
            specifically for companion chatbot harms. Prioritize intake in these states for the strongest
            legal theories beyond common-law negligence.
          </p>
          <p>
            <span className="font-semibold text-midnight-navy">4. Replika is the unclaimed territory.</span>{" "}
            10M+ users, documented emotional dependency, no filed cases. First-mover advantage is enormous.
          </p>
        </div>
      </div>

      {/* -- 11. Advertising Landscape (LIVE DATA) ------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Top Advertisers
          </h2>
          {data.topAdvertisers.length > 0 && (
            <span className="rounded-full bg-emerald-50 border border-success/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success flex items-center gap-1">
              <Database className="w-3 h-3" /> Live Data
            </span>
          )}
        </div>

        {data.topAdvertisers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cloud">
                  <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">Advertiser</th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">Segment</th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">Platforms</th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">Est. Spend</th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">Creatives</th>
                  <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">Markets</th>
                </tr>
              </thead>
              <tbody>
                {data.topAdvertisers.map((adv, i) => {
                  const meta = segMeta(adv.segment);
                  const advPlatforms = data.platformMap[adv.advertiser_name] ?? [];
                  return (
                    <tr key={`${adv.advertiser_name}-${i}`} className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors">
                      <td className="py-3 pr-4 font-medium text-midnight-navy">{adv.advertiser_name}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: meta.bg, color: meta.color }}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {advPlatforms.length > 0 ? (
                            advPlatforms.map((p) => (
                              <span key={p} className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: PLATFORM_COLORS[p] ?? "#6B7280" }}>
                                {p}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-gray">&mdash;</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-sm text-midnight-navy">{fmtCur(adv.total_spend)}</td>
                      <td className="py-3 px-3 text-right text-sm text-midnight-navy">{fmtNum(adv.total_creatives)}</td>
                      <td className="py-3 pl-3 text-right text-sm text-midnight-navy">{fmtNum(adv.market_count)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
            <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
            <p className="text-sm font-medium text-midnight-navy/60">Advertiser data collection in progress</p>
            <p className="mt-1 text-xs text-slate-gray">Top advertisers will appear here once data is collected from ad platforms. Field is very early &mdash; firms are advertising via organic landing pages.</p>
          </div>
        )}
      </div>

      {/* -- Sample Ads --------------------------------------------------- */}
      {data.sampleAds.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4.5 h-4.5 text-intelligence-teal" />
            <h2 className="font-heading text-lg font-semibold text-midnight-navy">Sample Ads</h2>
            <span className="rounded-full bg-emerald-50 border border-success/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success flex items-center gap-1">
              <Database className="w-3 h-3" /> Live Data
            </span>
          </div>
          <p className="mb-4 text-xs text-slate-gray">Recent advertisements observed across platforms</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.sampleAds.map((ad) => {
              const domain = ad.creative_url ? extractDomain(ad.creative_url) : null;
              const sourceBadge =
                ad.source === "google_ads"
                  ? { label: "Google Ads", color: "#10B981" }
                  : ad.source === "meta_ad_library"
                  ? { label: "Meta", color: "#3B82F6" }
                  : ad.source === "ispot"
                  ? { label: "TV", color: "#6366F1" }
                  : ad.source === "tiktok_ads"
                  ? { label: "TikTok", color: "#EC4899" }
                  : { label: ad.source, color: "#6B7280" };

              return (
                <div key={ad.id} className="rounded-lg border border-cloud bg-cloud/40 p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                      style={{ backgroundColor: sourceBadge.color }}
                    >
                      {sourceBadge.label}
                    </span>
                    <span className="text-[10px] text-slate-gray">{ad.ad_format ?? "\u2014"}</span>
                  </div>
                  <p className="text-sm font-semibold text-midnight-navy leading-snug line-clamp-2">{ad.advertiser_raw}</p>
                  {ad.creative_text && (
                    <p className="text-xs text-midnight-navy/60 line-clamp-2">{ad.creative_text}</p>
                  )}
                  {ad.source === "google_ads" && domain && (
                    <p className="text-xs text-intelligence-teal truncate">{domain}</p>
                  )}
                  {ad.source === "meta_ad_library" && ad.creative_url && (
                    <a href={ad.creative_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-intelligence-teal hover:underline">
                      View in Ad Library &rarr;
                    </a>
                  )}
                  <p className="mt-auto text-[10px] text-slate-gray">
                    {ad.first_seen === ad.last_seen ? ad.last_seen : `${ad.first_seen} \u2014 ${ad.last_seen}`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* -- Top Markets by Saturation ------------------------------------ */}
      {data.topMarkets.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4.5 h-4.5 text-intelligence-teal" />
            <h2 className="font-heading text-lg font-semibold text-midnight-navy">Top Markets by Saturation</h2>
            <span className="rounded-full bg-emerald-50 border border-success/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success flex items-center gap-1">
              <Database className="w-3 h-3" /> Live Data
            </span>
          </div>
          <div className="space-y-2">
            {data.topMarkets.map((m, i) => {
              const score = m.saturation_score ?? 0;
              const scoreColor = score >= 75 ? "#EF4444" : score >= 50 ? "#F59E0B" : score >= 25 ? "#F59E0B" : "#10B981";
              return (
                <div key={`${m.geo_name}-${i}`} className="flex items-center gap-4 rounded-md bg-cloud/60 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-midnight-navy truncate">
                      {m.geo_name}
                      {m.state_abbr && <span className="ml-1.5 text-xs text-slate-gray">{m.state_abbr}</span>}
                    </p>
                    <p className="text-xs text-slate-gray">
                      {fmtNum(m.total_advertisers)} advertisers &middot; {fmtCur(m.estimated_spend)} spend
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-24 h-2 rounded-full bg-white">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(score, 100)}%`, backgroundColor: scoreColor }} />
                    </div>
                    <span className="text-sm font-bold w-10 text-right" style={{ color: scoreColor }}>
                      {score.toFixed(0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* -- Organic Search Landscape ------------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">Organic Search Landscape</h2>
          {data.serpVisibility.length > 0 && (
            <span className="rounded-full bg-emerald-50 border border-success/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success flex items-center gap-1">
              <Database className="w-3 h-3" /> Live Data
            </span>
          )}
        </div>
        {data.serpVisibility.length > 0 ? (
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cloud">
                  <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">Domain</th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">Visibility</th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">Avg Pos</th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">Organic</th>
                  <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">Top 10</th>
                </tr>
              </thead>
              <tbody>
                {[...data.serpVisibility]
                  .sort((a, b) => b.visibility_score - a.visibility_score)
                  .slice(0, 15)
                  .map((row) => (
                    <tr key={row.domain} className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors">
                      <td className="py-3 pr-4 font-medium text-midnight-navy">{row.domain}</td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-midnight-navy">{row.visibility_score.toFixed(1)}</td>
                      <td className="py-3 px-3 text-right font-mono text-midnight-navy/80">{row.avg_position != null ? row.avg_position.toFixed(1) : "\u2014"}</td>
                      <td className="py-3 px-3 text-right text-midnight-navy/80">{row.organic_appearances}</td>
                      <td className="py-3 pl-3 text-right text-midnight-navy/80">{row.top_10_count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
            <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
            <p className="text-sm font-medium text-midnight-navy/60">SERP visibility data collection in progress</p>
            <p className="mt-1 text-xs text-slate-gray">Visibility rankings will appear here once collected.</p>
          </div>
        )}

        {data.serpResults.length > 0 && (
          <>
            <h3 className="mb-3 text-sm font-semibold text-midnight-navy">SERP Preview</h3>
            <div className="space-y-0 divide-y divide-cloud">
              {data.serpResults.map((r, i) => (
                <div key={`${r.domain}-${i}`} className="relative py-3 first:pt-0 last:pb-0">
                  <span className="absolute top-3 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-intelligence-teal/10 text-[10px] font-bold text-intelligence-teal">
                    {r.position}
                  </span>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-gray/20 text-[8px] font-bold text-slate-gray">
                      {r.domain.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-xs text-success">{r.domain}</span>
                  </div>
                  {r.link ? (
                    <a href={r.link} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-intelligence-teal hover:underline">
                      {r.title}
                    </a>
                  ) : (
                    <p className="text-sm font-medium text-intelligence-teal">{r.title}</p>
                  )}
                  {r.snippet && <p className="mt-0.5 text-sm text-midnight-navy/60 pr-8">{r.snippet}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* -- Sources & Methodology ---------------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">Sources &amp; Methodology</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            "Garcia v. Character Technologies (M.D. Fla. 6:24-cv-01903)",
            "Raine v. OpenAI (SF Superior Court, Aug. 2025)",
            "SMVLC/TJLP November 2025 seven-case filing",
            "Bloomberg Law settlement notices (Jan. 2026)",
            "Kentucky AG v. Character Technologies (Jan. 2026)",
            "FTC 6(b) Orders to seven AI companies (Sept. 2025)",
            "California SB 243 / NY Gen. Business Law 1700",
            "K.G.M. v. Meta $6M verdict (March 2026)",
            "CDC YRBS 2023 / SAMHSA 2024 NSDUH",
            "Pew Research — Teens, Social Media and AI Chatbots (Dec. 2025)",
            "Northeastern University jailbreak study (arXiv 2507.02990)",
            "Stanford HAI — AI in Mental Health Care (June 2025)",
            "MTMP Spring 2026 — Deaths Linked to AI Chatbots session",
            "Plaintiff firm landing pages (Levin Papantonio, Levy Konigsberg, TorHoerman, TruLaw)",
          ].map((source) => (
            <div key={source} className="flex items-start gap-2 rounded-md bg-cloud/60 px-3 py-2">
              <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-intelligence-teal" />
              <p className="text-xs text-midnight-navy/80">{source}</p>
            </div>
          ))}
        </div>
      </div>

      {/* -- Footer / Disclaimer ------------------------------------------ */}
      <div className="rounded-lg border border-cloud bg-cloud/40 p-5">
        <p className="text-xs leading-relaxed text-slate-gray">
          This page is refreshed monthly. Content reflects research and publicly available data as of the date shown.
          Settlement projections are attorney estimates and industry benchmarks based on analogous litigation &mdash; not
          guarantees. This page does not constitute legal advice. AI Suicide / Self-Harm is a pre-MDL emerging tort; case
          counts, coordination, and venue may evolve quickly. If you or someone you know is in crisis, contact the
          988 Suicide &amp; Crisis Lifeline by calling or texting 988.
        </p>
        <p className="mt-3 text-[11px] text-slate-gray/80">
          Data sources: Court filings, press releases, Bloomberg Law, Reuters, NYT, CNN, CBS News, Washington Post,
          CDC YRBS, SAMHSA NSDUH, Pew Research, Stanford HAI, FTC orders, state legislation, plaintiff firm landing
          pages, Meta Ad Library.
        </p>
      </div>
    </div>
  );
}
