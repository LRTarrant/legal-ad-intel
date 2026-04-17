"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Scale,
  DollarSign,
  Target,
  Calendar,
  AlertTriangle,
  TrendingUp,
  FileText,
  Shield,
  MapPin,
  Users,
  Clock,
  XCircle,
  ChevronRight,
  Eye,
  Monitor,
  Database,
  Activity,
  Crosshair,
  Brain,
  Smartphone,
  Landmark,
  School,
  ArrowUpDown,
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
import {
  extractDomain,
} from "@/lib/queries";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
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

export interface SocialMediaPageData {
  youthTop15: YouthMentalHealthRow[];
  avgMde: number;
  topMdeState: YouthMentalHealthRow | null;
  teenScreenTime: TeenScreenTimeRow[];
  regulatorySorted: StateRegulatoryRow[];
  judicialByState: Record<string, { counties: number; profiles: Record<string, number> }>;
  piByState: Record<string, number>;
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

function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
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

function lawStatusBadge(status: string | null) {
  if (!status) return { bg: "bg-slate-100", text: "text-slate-500", label: "None" };
  const s = status.toLowerCase();
  if (s === "in effect") return { bg: "bg-emerald-50", text: "text-success", label: "In Effect" };
  if (s.includes("pending") || s.includes("enacted")) return { bg: "bg-amber-50", text: "text-warning", label: status };
  if (s.includes("enjoined")) return { bg: "bg-red-50", text: "text-alert", label: "Enjoined" };
  return { bg: "bg-slate-100", text: "text-slate-500", label: status };
}

/* ------------------------------------------------------------------ */
/*  Static Data                                                        */
/* ------------------------------------------------------------------ */

const QUALIFICATION_CRITERIA = [
  { criterion: "Claimant Age", detail: "Must have been a minor (under 18, or under 21 in some filings) when addiction began" },
  { criterion: "Platform Usage", detail: "Must demonstrate habitual/compulsive use of named defendant platforms (Instagram, Facebook, TikTok, Snapchat, YouTube)" },
  { criterion: "Mental Health Diagnosis", detail: "Documented diagnosis: depression, anxiety, PTSD, eating disorder, self-harm, suicidal ideation, or related conditions" },
  { criterion: "Causation Link", detail: "Medical/psychological records linking social media use to mental health decline" },
  { criterion: "Time Period", detail: "Usage primarily during 2012\u2013present (when addictive design features became prevalent)" },
  { criterion: "Excluded", detail: "Adult-onset claims without minor-age exposure; claims against platforms not named as defendants" },
];

const LITIGATION_TIMELINE = [
  { date: "Oct 2023", event: "33 state AGs file federal COPPA suit against Meta", future: false },
  { date: "Jun 2025", event: "Six school districts selected for federal bellwether discovery", future: false },
  { date: "Jan 2026", event: "KGM v. Meta & YouTube trial begins; TikTok and Snapchat settle pre-trial", future: false },
  { date: "Mar 2026", event: "KGM verdict \u2014 $6M ($4.2M Meta, $1.8M YouTube)", future: false },
  { date: "Mar 2026", event: "New Mexico jury awards $375M against Meta", future: false },
  { date: "Jun 15, 2026", event: "Federal MDL bellwether #1 (school district case)", future: true },
  { date: "Aug 6, 2026", event: "Federal MDL bellwether #2 (state AG case)", future: true },
];

const PLATFORM_DEFENDANTS = [
  { platform: "Instagram", parent: "Meta", mdl: true, agActions: "41+ states", settlement: "No global settlement" },
  { platform: "Facebook", parent: "Meta", mdl: true, agActions: "41+ states", settlement: "No global settlement" },
  { platform: "TikTok", parent: "ByteDance", mdl: true, agActions: "Multiple states", settlement: "Settled KGM pre-trial" },
  { platform: "Snapchat", parent: "Snap Inc.", mdl: true, agActions: "FL, others", settlement: "Settled KGM pre-trial" },
  { platform: "YouTube", parent: "Google/Alphabet", mdl: true, agActions: "Multiple states", settlement: "No global settlement" },
  { platform: "Discord", parent: "Discord Inc.", mdl: true, agActions: "Limited", settlement: "None" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SocialMediaClient({ data }: { data: SocialMediaPageData }) {
  const [regSort, setRegSort] = useState<"score" | "state">("score");

  const sortedRegulatory = useMemo(() => {
    const rows = [...data.regulatorySorted];
    if (regSort === "state") rows.sort((a, b) => a.state.localeCompare(b.state));
    return rows;
  }, [data.regulatorySorted, regSort]);

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

  // PI score stats
  const piEntries = Object.entries(data.piByState).sort((a, b) => b[1] - a[1]);
  const topPiStates = piEntries.slice(0, 10);

  return (
    <div className="space-y-8">
      {/* ── 1. Page Header ──────────────────────────────────────────────── */}
      <div>
        <Link
          href="/mdl-tracker"
          className="text-sm text-slate-gray hover:text-midnight-navy"
        >
          <span className="flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            MDL Tracker
          </span>
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl font-bold text-midnight-navy">
            Social Media Addiction
          </h1>
          <span className="rounded-full bg-emerald-50 border border-success/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-success">
            Active MDL &mdash; Bellwether Trials Underway
          </span>
        </div>
        <p className="mt-1 text-lg text-slate-gray">
          Youth Mental Health &amp; Platform Liability Litigation
        </p>
        <p className="mt-0.5 text-xs text-slate-gray">
          Last Updated: April 17, 2026
        </p>
      </div>

      {/* ── 2. Key Stats Row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Scale className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Federal Cases
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">2,400+</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">MDL 3047, N.D. Cal.</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Individual Claims
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">10,000+</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Plus ~800 school districts</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <DollarSign className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Key Verdicts
            </p>
          </div>
          <p className="text-xl font-bold text-midnight-navy">$6M / $375M</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">KGM verdict / NM verdict</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Landmark className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              State AGs
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">41+</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">State AG actions filed</p>
        </div>
      </div>

      {/* ── 3. Case Summary ─────────────────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-4">
          Case Summary
        </h2>
        <div className="space-y-4 text-sm leading-relaxed text-midnight-navy/80">
          <p>
            <span className="font-semibold text-midnight-navy">MDL 3047</span> &mdash;{" "}
            <em>In Re: Social Media Adolescent Addiction/Personal Injury Products Liability Litigation</em>.
            Consolidated in N.D. Cal. before Judge Yvonne Gonzalez Rogers. Also JCCP 5255 in L.A. Superior Court (Judge Carolyn B. Kuhl).
          </p>
          <p>
            Plaintiffs allege defendants deliberately engineered platforms with addictive design features &mdash;
            infinite scroll, autoplay, push notifications, algorithmic feeds, intermittent variable rewards &mdash;
            that exploit adolescent brain development. Claims include negligent product design, failure to warn,
            fraudulent concealment, and consumer protection violations. Courts have largely rejected Section 230
            and First Amendment defenses, finding these claims target product design rather than speech.
          </p>
          <p>
            <span className="font-semibold text-midnight-navy">Eligible Claimants:</span>{" "}
            Individuals who became addicted to social media before age 21 and suffered mental health injuries
            (depression, anxiety, eating disorders, self-harm, suicidal ideation, or death). Statute of limitations
            varies by state; for minors, typically tolled until age 18.
          </p>
          <p>
            <span className="font-semibold text-midnight-navy">Settlement Landscape:</span>{" "}
            No global settlement. TikTok and Snapchat reached confidential settlements in KGM case. The $6M KGM
            verdict and $375M New Mexico verdict are early indicators but non-binding on other cases. Federal
            bellwether outcomes in summer 2026 will heavily influence future settlement posture.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Key Defendants
            </p>
            <p className="text-sm text-midnight-navy">
              Meta (Instagram/Facebook), Google/Alphabet (YouTube), Snap Inc. (Snapchat), ByteDance (TikTok), Discord
            </p>
          </div>
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Legal Theories
            </p>
            <p className="text-sm text-midnight-navy">
              Negligent product design (addictive algorithms), failure to warn, fraudulent concealment, consumer protection violations
            </p>
          </div>
        </div>
      </div>

      {/* ── 4. Litigation Timeline ─────────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Key Rulings &amp; Milestones
          </h2>
        </div>
        <div className="overflow-x-auto pb-2">
          <div className="relative flex items-start" style={{ minWidth: `${LITIGATION_TIMELINE.length * 150}px` }}>
            <div className="absolute left-[75px] right-[75px] top-[52px] h-px bg-intelligence-teal/30" />
            {LITIGATION_TIMELINE.map((e, i) => (
              <div
                key={i}
                className={`flex min-w-[150px] flex-1 flex-col items-center text-center ${e.future ? "opacity-60" : ""}`}
              >
                <p
                  className={`mb-2 text-[10px] font-semibold leading-tight ${
                    e.future ? "text-slate-gray" : "text-midnight-navy"
                  }`}
                >
                  {e.date}
                </p>
                <div
                  className={`relative z-10 h-3 w-3 shrink-0 rounded-full border-2 ${
                    e.future
                      ? "border-slate-gray/40 bg-white border-dashed"
                      : "border-intelligence-teal bg-intelligence-teal"
                  }`}
                />
                <p
                  className={`mt-2 max-w-[130px] text-[10px] leading-tight ${
                    e.future ? "italic text-slate-gray" : "text-midnight-navy/80"
                  }`}
                >
                  {e.event}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 5. Research & Criteria ──────────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Research &amp; Qualification Criteria
          </h2>
        </div>
        <p className="mb-4 text-sm text-slate-gray">
          What firms should know before advertising
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Criterion
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Detail
                </th>
              </tr>
            </thead>
            <tbody>
              {QUALIFICATION_CRITERIA.map((c) => (
                <tr
                  key={c.criterion}
                  className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                >
                  <td className="py-3 pr-4 font-medium text-midnight-navy whitespace-nowrap">
                    {c.criterion}
                  </td>
                  <td className="py-3 pl-3 text-midnight-navy/80">
                    {c.detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 px-4 py-3">
            <p className="text-xs font-semibold text-intelligence-teal mb-1.5">
              Volume Opportunity
            </p>
            <p className="text-xs leading-relaxed text-midnight-navy/70">
              Massive claimant pool &mdash; 95% of teens use social media, ~20% have diagnosed mental health conditions.
              Statute of limitations tolled for minors; many potential claimants haven&apos;t aged out yet.
            </p>
          </div>
          <div className="rounded-md bg-amber-50 border border-warning/20 px-4 py-3">
            <p className="text-xs font-semibold text-warning mb-1.5">
              Documentation Challenge
            </p>
            <p className="text-xs leading-relaxed text-midnight-navy/70">
              Requires both platform usage evidence AND clinical mental health records &mdash;
              a higher documentation bar than many torts. School district track is a separate
              opportunity (economic harm, not individual PI).
            </p>
          </div>
        </div>
      </div>

      {/* ── 6. Market Opportunity Signals ──────────────────────────────── */}
      <div className="rounded-lg border border-intelligence-teal/20 bg-gradient-to-br from-intelligence-teal/[0.04] to-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Crosshair className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Market Opportunity Signals
          </h2>
        </div>
        <p className="mb-6 text-sm text-slate-gray">
          Five intelligence layers for identifying high-opportunity markets
        </p>

        {/* ── Signal 1: Youth Mental Health Index ─────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 1: Youth Mental Health Index
            </h3>
          </div>
          <p className="mb-2 text-xs text-slate-gray">
            Source: Mental Health America &mdash; % of youth (12&ndash;17) with at least one major depressive episode
          </p>

          {/* Insight Banner */}
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              National average: <span className="font-bold text-midnight-navy">{data.avgMde}%</span> of youth
              experienced a major depressive episode.
              {data.topMdeState && (
                <>
                  {" "}{data.topMdeState.state} leads at{" "}
                  <span className="font-bold text-midnight-navy">{data.topMdeState.mde_percentage}%</span>.
                </>
              )}
            </p>
          </div>

          {/* Horizontal Bar Chart */}
          {data.youthTop15.length > 0 ? (
            <div className="rounded-lg bg-white p-4">
              <p className="mb-3 text-xs font-semibold text-midnight-navy">
                Top 15 States by Youth MDE Rate (%)
              </p>
              <ResponsiveContainer width="100%" height={data.youthTop15.length * 32 + 20}>
                <BarChart
                  data={data.youthTop15}
                  layout="vertical"
                  margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
                >
                  <XAxis type="number" domain={[0, "auto"]} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="state"
                    width={120}
                    tick={{ fontSize: 11, fill: "#1B2A4A" }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "MDE Rate"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="mde_percentage" radius={[0, 4, 4, 0]}>
                    {data.youthTop15.map((_, i) => (
                      <Cell key={i} fill={i < 5 ? "#F59E0B" : "#FBBF24"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
              <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
              <p className="text-sm font-medium text-midnight-navy/60">
                Youth mental health data loading...
              </p>
            </div>
          )}
        </div>

        {/* ── Signal 2: Teen Screen Time Index ────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-4 h-4 text-intelligence-teal" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 2: Teen Screen Time Index
            </h3>
          </div>
          <p className="mb-2 text-xs text-slate-gray">
            Source: Verizon/CDC Analysis &mdash; average daily screen time for teens by state
          </p>

          {/* Insight Banner */}
          <div className="mb-4 rounded-md border border-intelligence-teal/30 bg-intelligence-teal/5 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              {data.teenScreenTime.length > 0 ? (
                <>
                  {data.teenScreenTime[0].state} teens average{" "}
                  <span className="font-bold text-midnight-navy">
                    {fmtMinutes(data.teenScreenTime[0].avg_daily_minutes)}
                  </span>{" "}
                  daily screen time &mdash; 26% more than the national median.
                </>
              ) : (
                "Teen screen time data loading..."
              )}
            </p>
          </div>

          {/* Horizontal Bar Chart */}
          {data.teenScreenTime.length > 0 ? (
            <div className="rounded-lg bg-white p-4">
              <p className="mb-3 text-xs font-semibold text-midnight-navy">
                Top 15 States by Average Daily Screen Time
              </p>
              <ResponsiveContainer width="100%" height={Math.min(data.teenScreenTime.length, 15) * 32 + 20}>
                <BarChart
                  data={data.teenScreenTime.slice(0, 15)}
                  layout="vertical"
                  margin={{ top: 0, right: 60, bottom: 0, left: 0 }}
                >
                  <XAxis
                    type="number"
                    domain={[0, "auto"]}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => fmtMinutes(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="state"
                    width={120}
                    tick={{ fontSize: 11, fill: "#1B2A4A" }}
                  />
                  <Tooltip
                    formatter={(value) => [fmtMinutes(Number(value)), "Avg Daily"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="avg_daily_minutes" radius={[0, 4, 4, 0]}>
                    {data.teenScreenTime.slice(0, 15).map((_, i) => (
                      <Cell key={i} fill={i < 5 ? "#14B8A6" : "#5EEAD4"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
              <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
              <p className="text-sm font-medium text-midnight-navy/60">
                Teen screen time data loading...
              </p>
            </div>
          )}
        </div>

        {/* ── Signal 3: State Regulatory & AG Activity ────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Landmark className="w-4 h-4 text-intelligence-teal" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 3: State Regulatory &amp; AG Activity
            </h3>
          </div>
          <p className="mb-2 text-xs text-slate-gray">
            Source: AVPA / News Reporting &mdash; enacted legislation and AG enforcement activity
          </p>

          {/* Insight Banner */}
          <div className="mb-4 rounded-md border border-intelligence-teal/30 bg-intelligence-teal/5 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              <span className="font-bold text-midnight-navy">
                {data.regulatorySorted.filter((r) => r.has_law_enacted).length}
              </span>{" "}
              states have enacted social media minor protection laws.{" "}
              <span className="font-bold text-midnight-navy">41+</span> state AGs have taken legal action.
            </p>
          </div>

          {/* Interactive Table */}
          {data.regulatorySorted.length > 0 ? (
            <div className="rounded-lg bg-white">
              <div className="flex items-center justify-between px-4 py-3 border-b border-cloud">
                <p className="text-xs font-semibold text-midnight-navy">
                  {data.regulatorySorted.length} states tracked
                </p>
                <button
                  onClick={() => setRegSort(regSort === "score" ? "state" : "score")}
                  className="flex items-center gap-1 text-xs font-medium text-intelligence-teal hover:underline"
                >
                  <ArrowUpDown className="w-3 h-3" />
                  Sort by {regSort === "score" ? "State" : "Score"}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-cloud">
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                        State
                      </th>
                      <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                        Law Enacted
                      </th>
                      <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                        Law Status
                      </th>
                      <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                        AG Action
                      </th>
                      <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                        Regulatory Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRegulatory.map((r) => {
                      const badge = lawStatusBadge(r.law_status);
                      return (
                        <tr
                          key={r.state}
                          className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                        >
                          <td className="py-3 px-4 font-medium text-midnight-navy">
                            {r.state}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {r.has_law_enacted ? (
                              <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                                Yes
                              </span>
                            ) : (
                              <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                No
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.bg} ${badge.text}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {r.has_ag_action ? (
                              <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                                Yes
                              </span>
                            ) : (
                              <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                No
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                r.regulatory_score >= 4
                                  ? "bg-intelligence-teal/10 text-intelligence-teal"
                                  : r.regulatory_score >= 2
                                  ? "bg-amber-50 text-warning"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {r.regulatory_score}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
              <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
              <p className="text-sm font-medium text-midnight-navy/60">
                Regulatory data loading...
              </p>
            </div>
          )}
        </div>

        {/* ── Signal 4: Judicial Profiles ──────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Scale className="w-4 h-4 text-intelligence-teal" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 4: Judicial Profiles
            </h3>
          </div>
          <p className="mb-3 text-xs text-slate-gray">
            Plaintiff vs. defense-leaning counties across states
          </p>

          {judicialStates.length > 0 ? (
            <div className="rounded-lg bg-white p-4">
              <div className="mb-4 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {liberalCount} Liberal
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  {moderateCount} Moderate
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                  {conservativeCount} Conservative
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-intelligence-teal/10 px-3 py-1 text-xs font-semibold text-intelligence-teal">
                  {judicialStates.length} States with Data
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {judicialStates
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([state, v]) => {
                    const dominant = Object.entries(v.profiles).sort((a, b) => b[1] - a[1])[0];
                    const profile = dominant?.[0] ?? "Unknown";
                    const color =
                      profile === "Liberal"
                        ? "border-blue-300/50 bg-blue-50"
                        : profile === "Moderate"
                        ? "border-amber-300/50 bg-amber-50"
                        : profile === "Conservative"
                        ? "border-rose-300/50 bg-rose-50"
                        : "border-slate-200 bg-slate-50";
                    return (
                      <div key={state} className={`rounded-md border p-2.5 ${color}`}>
                        <p className="text-sm font-bold text-midnight-navy">{state}</p>
                        <p className="text-[10px] text-midnight-navy/60">{profile}</p>
                        <p className="text-[10px] text-slate-gray">{v.counties} counties</p>
                      </div>
                    );
                  })}
              </div>
              <Link
                href="/judicial-profiles"
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-intelligence-teal hover:underline"
              >
                View Full Judicial Profiles <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
              <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
              <p className="text-sm font-medium text-midnight-navy/60">
                Judicial profile data loading...
              </p>
            </div>
          )}
        </div>

        {/* ── Signal 5: PI Viability Scores ────────────────────────────── */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-intelligence-teal" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 5: PI Viability Scores
            </h3>
          </div>
          <p className="mb-3 text-xs text-slate-gray">
            State-level personal injury viability composite scores
          </p>

          {topPiStates.length > 0 ? (
            <div className="rounded-lg bg-white p-4">
              <p className="mb-3 text-xs font-semibold text-midnight-navy">
                Top 10 States by PI Viability
              </p>
              <div className="flex flex-wrap gap-2">
                {topPiStates.map(([state, score]) => (
                  <div
                    key={state}
                    className="rounded-lg border border-intelligence-teal/20 bg-white px-4 py-2.5"
                  >
                    <p className="text-sm font-bold text-midnight-navy">
                      {state}{" "}
                      <span className="font-mono text-intelligence-teal">{score.toFixed(1)}</span>
                    </p>
                    <p className="text-[11px] text-midnight-navy/60">
                      {score >= 90 ? "Very High" : score >= 75 ? "High" : score >= 60 ? "Moderate" : "Low"}
                    </p>
                  </div>
                ))}
              </div>
              <Link
                href="/pi-viability"
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-intelligence-teal hover:underline"
              >
                View Full PI Viability Scores <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
              <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
              <p className="text-sm font-medium text-midnight-navy/60">
                PI viability data loading...
              </p>
            </div>
          )}
        </div>

        {/* Cross-links */}
        <div className="flex flex-wrap gap-4">
          <Link
            href="/judicial-profiles"
            className="inline-flex items-center gap-1 text-xs font-semibold text-intelligence-teal hover:underline"
          >
            View Judicial Profiles <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/pi-viability"
            className="inline-flex items-center gap-1 text-xs font-semibold text-intelligence-teal hover:underline"
          >
            View PI Viability Scores <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── 7. School District Claims ──────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <School className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            School District Claims
          </h2>
        </div>
        <div className="space-y-4 text-sm leading-relaxed text-midnight-navy/80">
          <p>
            Approximately <span className="font-bold text-midnight-navy">~800 school districts</span> have
            filed claims alleging economic harm from social media&apos;s impact on student mental health.
            This is a distinct case track from individual PI claims.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Bellwether Districts
            </p>
            <p className="text-sm text-midnight-navy">
              Breathitt County (KY), Tucson USD (AZ), plus districts in MD, GA, NJ, SC
            </p>
          </div>
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Key Stat
            </p>
            <p className="text-sm text-midnight-navy">
              DeKalb County Schools (GA) spent <span className="font-bold">$4.3M</span> addressing student mental health impacts
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-md border border-intelligence-teal/20 bg-intelligence-teal/[0.06] px-4 py-3">
          <p className="text-xs leading-relaxed text-midnight-navy/80">
            <span className="font-semibold text-midnight-navy">Note:</span> Some firms are pursuing
            school district representation as a separate case track. This data helps identify which
            districts have already filed and which haven&apos;t.
          </p>
        </div>
      </div>

      {/* ── 8. Platform Defendant Breakdown ────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Platform Defendant Breakdown
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Platform
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Parent Company
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  Named in MDL
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  AG Actions
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Settlement Status
                </th>
              </tr>
            </thead>
            <tbody>
              {PLATFORM_DEFENDANTS.map((d) => (
                <tr
                  key={d.platform}
                  className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                >
                  <td className="py-3 pr-4 font-medium text-midnight-navy">
                    {d.platform}
                  </td>
                  <td className="py-3 px-3 text-midnight-navy/80">{d.parent}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                      Yes
                    </span>
                  </td>
                  <td className="py-3 px-3 text-midnight-navy/80">{d.agActions}</td>
                  <td className="py-3 pl-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        d.settlement.includes("Settled")
                          ? "bg-amber-50 text-warning"
                          : d.settlement === "None"
                          ? "bg-slate-100 text-slate-500"
                          : "bg-red-50 text-alert"
                      }`}
                    >
                      {d.settlement}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 9. Advertising Landscape (LIVE DATA) ──────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Advertising Landscape
          </h2>
          {data.hasLiveData && (
            <span className="rounded-full bg-emerald-50 border border-success/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success flex items-center gap-1">
              <Database className="w-3 h-3" /> Live Data
            </span>
          )}
        </div>

        {data.hasLiveData ? (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-6">
              <div className="rounded-lg bg-cloud/60 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Users className="w-3.5 h-3.5 text-intelligence-teal" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
                    Advertisers
                  </p>
                </div>
                <p className="text-2xl font-bold text-midnight-navy">{fmtNum(data.totalAdvertisers)}</p>
              </div>
              <div className="rounded-lg bg-cloud/60 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <DollarSign className="w-3.5 h-3.5 text-intelligence-teal" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
                    Est. Spend
                  </p>
                </div>
                <p className="text-2xl font-bold text-midnight-navy">{fmtCur(data.totalSpend)}</p>
              </div>
              <div className="rounded-lg bg-cloud/60 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Eye className="w-3.5 h-3.5 text-intelligence-teal" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
                    Unique Creatives
                  </p>
                </div>
                <p className="text-2xl font-bold text-midnight-navy">{fmtNum(data.totalCreatives)}</p>
              </div>
              <div className="rounded-lg bg-cloud/60 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Monitor className="w-3.5 h-3.5 text-intelligence-teal" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
                    Platforms
                  </p>
                </div>
                <p className="text-2xl font-bold text-midnight-navy">{data.allPlatforms.length}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {data.allPlatforms.map((p) => (
                    <span
                      key={p}
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                      style={{ backgroundColor: PLATFORM_COLORS[p] ?? "#6B7280" }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {data.segments.length > 0 && (
              <>
                <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
                  Advertiser Segments
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-6">
                  {data.segments.map((seg) => {
                    const meta = segMeta(seg.segment);
                    const spendPct = data.totalSpend > 0 ? (seg.total_spend / data.totalSpend) * 100 : 0;
                    return (
                      <div
                        key={seg.segment}
                        className="rounded-lg border p-4"
                        style={{ borderColor: meta.color + "40", backgroundColor: meta.bg }}
                      >
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: meta.color }}>
                          {meta.label}
                        </p>
                        <p className="mt-2 text-2xl font-bold text-midnight-navy">
                          {seg.advertiser_count}
                        </p>
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-xs text-slate-gray">
                            <span>Spend</span>
                            <span className="font-medium text-midnight-navy">{fmtCur(seg.total_spend)}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-white/60">
                            <div
                              className={`h-1.5 rounded-full ${meta.bar}`}
                              style={{ width: `${Math.min(spendPct, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-slate-gray">
                            <span>Creatives</span>
                            <span className="font-medium text-midnight-navy">{fmtNum(seg.total_creatives)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center mb-6">
            <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
            <p className="text-sm font-medium text-midnight-navy/60">
              Live advertising data collection in progress
            </p>
            <p className="mt-1 text-xs text-slate-gray">
              Data will appear here automatically once collected from ad platforms.
            </p>
          </div>
        )}
      </div>

      {/* ── 9b. Cost Benchmark Scorecard (LIVE DATA) ───────────────────── */}
      <CostBenchmarkScorecard data={data.benchmark} />

      {/* ── 10. Top Advertisers (LIVE DATA) ────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Top Advertisers
          </h2>
          {data.topAdvertisers.length > 0 && (
            <span className="rounded-full bg-emerald-50 border border-success/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success flex items-center gap-1">
              <Database className="w-3 h-3" /> Live Data
            </span>
          )}
        </div>
        <p className="mb-4 text-xs text-slate-gray">
          Competitive landscape &mdash; firms with the highest advertising presence for social media addiction litigation.
        </p>

        {data.topAdvertisers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cloud">
                  <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                    Advertiser
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                    Segment
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                    Platforms
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                    Est. Spend
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                    Creatives
                  </th>
                  <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                    Markets
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.topAdvertisers.map((adv, i) => {
                  const meta = segMeta(adv.segment);
                  const advPlatforms = data.platformMap[adv.advertiser_name] ?? [];
                  return (
                    <tr
                      key={`${adv.advertiser_name}-${i}`}
                      className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium text-midnight-navy">
                        {adv.advertiser_name}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: meta.bg, color: meta.color }}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {advPlatforms.length > 0 ? (
                            advPlatforms.map((p) => (
                              <span
                                key={p}
                                className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                                style={{ backgroundColor: PLATFORM_COLORS[p] ?? "#6B7280" }}
                              >
                                {p}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-gray">&mdash;</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-sm text-midnight-navy">
                        {fmtCur(adv.total_spend)}
                      </td>
                      <td className="py-3 px-3 text-right text-sm text-midnight-navy">
                        {fmtNum(adv.total_creatives)}
                      </td>
                      <td className="py-3 pl-3 text-right text-sm text-midnight-navy">
                        {fmtNum(adv.market_count)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
            <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
            <p className="text-sm font-medium text-midnight-navy/60">
              Advertiser data collection in progress
            </p>
            <p className="mt-1 text-xs text-slate-gray">
              Top advertisers will appear here once data is collected from ad platforms.
            </p>
          </div>
        )}
      </div>

      {/* ── 11. Sample Ads (LIVE DATA) ────────────────────────────────── */}
      {data.sampleAds.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4.5 h-4.5 text-intelligence-teal" />
            <h2 className="font-heading text-lg font-semibold text-midnight-navy">
              Sample Ads
            </h2>
            <span className="rounded-full bg-emerald-50 border border-success/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success flex items-center gap-1">
              <Database className="w-3 h-3" /> Live Data
            </span>
          </div>
          <p className="mb-4 text-xs text-slate-gray">
            Recent advertisements observed across platforms
          </p>
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
                <div
                  key={ad.id}
                  className="rounded-lg border border-cloud bg-cloud/40 p-4 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                      style={{ backgroundColor: sourceBadge.color }}
                    >
                      {sourceBadge.label}
                    </span>
                    <span className="text-[10px] text-slate-gray">
                      {ad.ad_format ?? "\u2014"}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-midnight-navy leading-snug line-clamp-2">
                    {ad.advertiser_raw}
                  </p>
                  {ad.creative_text && (
                    <p className="text-xs text-midnight-navy/60 line-clamp-2">
                      {ad.creative_text}
                    </p>
                  )}
                  {ad.source === "google_ads" && domain && (
                    <p className="text-xs text-intelligence-teal truncate">{domain}</p>
                  )}
                  {ad.source === "meta_ad_library" && ad.creative_url && (
                    <a
                      href={ad.creative_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-intelligence-teal hover:underline"
                    >
                      View in Ad Library &rarr;
                    </a>
                  )}
                  <p className="mt-auto text-[10px] text-slate-gray">
                    {ad.first_seen === ad.last_seen
                      ? ad.last_seen
                      : `${ad.first_seen} \u2014 ${ad.last_seen}`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 12. Top Markets by Saturation (LIVE DATA) ──────────────────── */}
      {data.topMarkets.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4.5 h-4.5 text-intelligence-teal" />
            <h2 className="font-heading text-lg font-semibold text-midnight-navy">
              Top Markets by Saturation
            </h2>
            <span className="rounded-full bg-emerald-50 border border-success/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success flex items-center gap-1">
              <Database className="w-3 h-3" /> Live Data
            </span>
          </div>
          <div className="space-y-2">
            {data.topMarkets.map((m, i) => {
              const score = m.saturation_score ?? 0;
              const scoreColor =
                score >= 75 ? "#EF4444" :
                score >= 50 ? "#F59E0B" :
                score >= 25 ? "#F59E0B" :
                "#10B981";
              return (
                <div
                  key={`${m.geo_name}-${i}`}
                  className="flex items-center gap-4 rounded-md bg-cloud/60 px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-midnight-navy truncate">
                      {m.geo_name}
                      {m.state_abbr && (
                        <span className="ml-1.5 text-xs text-slate-gray">
                          {m.state_abbr}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-gray">
                      {fmtNum(m.total_advertisers)} advertisers &middot; {fmtCur(m.estimated_spend)} spend
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-24 h-2 rounded-full bg-white">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(score, 100)}%`,
                          backgroundColor: scoreColor,
                        }}
                      />
                    </div>
                    <span
                      className="text-sm font-bold w-10 text-right"
                      style={{ color: scoreColor }}
                    >
                      {score.toFixed(0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 13. SERP Visibility (LIVE DATA) ────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Organic Search Landscape
          </h2>
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

        {/* SERP Preview */}
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
                  {r.snippet && (
                    <p className="mt-0.5 text-sm text-midnight-navy/60 pr-8">{r.snippet}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── 14. Sources & Methodology ──────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Sources &amp; Methodology
          </h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            "Mental Health America \u2014 State of Mental Health in America (2024 data)",
            "CDC Youth Risk Behavior Survey (YRBS) 2023",
            "Verizon/CDC Teen Screen Time Analysis",
            "AVPA State Laws for Social Media Tracker",
            "JPML MDL Statistics",
            "Court filings from MDL 3047 and JCCP 5255",
            "State AG press releases and court documents",
          ].map((source) => (
            <div
              key={source}
              className="flex items-start gap-2 rounded-md bg-cloud/60 px-3 py-2"
            >
              <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-intelligence-teal" />
              <p className="text-xs text-midnight-navy/80">{source}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 15. Footer / Disclaimer ─────────────────────────────────────── */}
      <div className="rounded-lg border border-cloud bg-cloud/40 p-5">
        <p className="text-xs leading-relaxed text-slate-gray">
          This page is refreshed monthly. Content reflects research and publicly
          available data as of the date shown. Settlement projections are attorney
          estimates and industry benchmarks &mdash; not guarantees. This page does not
          constitute legal advice.
        </p>
        <p className="mt-3 text-[11px] text-slate-gray/80">
          Data sources: Mental Health America (2024), CDC YRBS (2023), Verizon/CDC Analysis,
          AVPA State Law Tracker, JPML, MDL 3047 &amp; JCCP 5255 court filings, state AG
          press releases.
        </p>
      </div>
    </div>
  );
}
