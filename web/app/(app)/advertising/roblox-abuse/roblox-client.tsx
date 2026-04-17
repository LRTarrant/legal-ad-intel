"use client";

import { useMemo, useState } from "react";
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
  Activity,
  Crosshair,
  Brain,
  Landmark,
  ArrowUpDown,
  Gamepad2,
  Siren,
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

export interface RobloxPageData {
  parentalConcern: ParentalConcernRow[];
  youthTop15: YouthMentalHealthRow[];
  avgMde: number;
  topMdeState: YouthMentalHealthRow | null;
  stateEnforcement: StateEnforcementRow[];
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

function enforcementBadge(type: string | null) {
  if (!type) return { bg: "bg-slate-100", text: "text-slate-500", label: "None" };
  const t = type.toLowerCase();
  if (t.includes("lawsuit") || t.includes("sued")) return { bg: "bg-red-50", text: "text-red-600", label: "AG Lawsuit" };
  if (t.includes("investigation") || t.includes("subpoena")) return { bg: "bg-orange-50", text: "text-orange-600", label: "Investigation/Subpoena" };
  if (t.includes("county")) return { bg: "bg-blue-50", text: "text-blue-600", label: "County Lawsuit" };
  return { bg: "bg-slate-100", text: "text-slate-500", label: type };
}

/* ------------------------------------------------------------------ */
/*  Static Data                                                        */
/* ------------------------------------------------------------------ */

const QUALIFICATION_CRITERIA = [
  { criterion: "Platform", detail: "Child must have used Roblox (co-defendants: Discord, Snapchat, Instagram)" },
  { criterion: "Harm Type", detail: "Sexual exploitation, grooming, sextortion, coerced images, assault, trafficking" },
  { criterion: "Predator Contact", detail: "Adult predator initiated contact through Roblox platform features" },
  { criterion: "Age", detail: "Child was a minor at time of exploitation" },
  { criterion: "Evidence", detail: "Platform usage records, chat logs, police reports, medical/psychological records" },
  { criterion: "Excluded", detail: "General dissatisfaction with platform content; no predator contact involved" },
];

const LITIGATION_TIMELINE = [
  { date: "Oct 2024", event: "Hindenburg Research publishes report calling Roblox \"pedophile hellscape\"", future: false },
  { date: "Nov 2024", event: "Roblox announces safety changes (restricting stranger messaging for children)", future: false },
  { date: "Apr\u2013Aug 2025", event: "Wave of family lawsuits filed across multiple states", future: false },
  { date: "Aug 2025", event: "Louisiana AG sues Roblox", future: false },
  { date: "Sep 2025", event: "Plaintiffs file motion to consolidate into MDL", future: false },
  { date: "Oct 2025", event: "Florida AG issues criminal subpoena to Roblox", future: false },
  { date: "Nov 2025", event: "Texas AG Paxton sues Roblox", future: false },
  { date: "Dec 2025", event: "JPML creates MDL 3166, transfers cases to N.D. Cal.", future: false },
  { date: "Jan 2026", event: "First MDL complaints filed (Parker Waichman, others)", future: false },
  { date: "Feb 2026", event: "LA County sues Roblox \u2014 first CA government entity", future: false },
  { date: "Mar 2026", event: "Texas judge allows deceptive practices claim to proceed", future: false },
  { date: "Apr 2026", event: "146+ cases in MDL and growing", future: true },
];

const CO_DEFENDANTS = [
  { platform: "Roblox", role: "Initial contact, grooming, Robux leverage", cases: "All 146+", agActions: "TX, LA, FL, KY, IA, NE, TN, GA, LA County" },
  { platform: "Discord", role: "Off-platform migration for explicit content", cases: "13+ cases", agActions: "Named in multiple family suits" },
  { platform: "Snapchat", role: "Off-platform channel for exploitation", cases: "4+ cases", agActions: "FL AG action (separate)" },
  { platform: "Meta (Instagram/Facebook)", role: "Off-platform channel", cases: "1+ cases", agActions: "Named in individual suits" },
];

const SAFETY_FAILURES = [
  { year: "2018", detail: "29-year-old caught with 175 hours of video grooming 150 minors via Roblox" },
  { year: "2020\u20132024", detail: "Media expos\u00E9s reveal digital strip clubs, sex parties, child predators on platform" },
  { year: "2024", detail: "National Center on Sexual Exploitation labels Roblox \"a tool for sexual predators\"" },
  { year: "Oct 2024", detail: "Hindenburg report reveals Roblox cut trust & safety spending; rejected parental approval features" },
  { year: "2024", detail: "Roblox reports 24,500+ suspected exploitation cases to NCMEC" },
  { year: "Nov 2024", detail: "Roblox finally restricts stranger messaging for children (years after warnings)" },
];

const GROOMING_PATTERN = [
  "Predator creates account, spoofs age as minor",
  "Contacts child through in-game chat in popular \"experiences\"",
  "Builds trust using Robux (in-game currency) as leverage",
  "Moves conversation to Discord, Snapchat, or other off-platform channel",
  "Coerces child into sharing explicit images or meeting in person",
  "Exploitation escalates \u2014 sextortion, blackmail, assault, trafficking",
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RobloxClient({ data }: { data: RobloxPageData }) {
  const [enforcementSort, setEnforcementSort] = useState<"score" | "state">("score");

  const sortedEnforcement = useMemo(() => {
    const rows = [...data.stateEnforcement];
    if (enforcementSort === "state") rows.sort((a, b) => a.state.localeCompare(b.state));
    return rows;
  }, [data.stateEnforcement, enforcementSort]);

  // Judicial summary stats
  const judicialStates = Object.entries(data.judicialByState);
  const plaintiffFriendlyCount = judicialStates.filter(([, v]) => {
    const dominant = Object.entries(v.profiles).sort((a, b) => b[1] - a[1])[0];
    return dominant && dominant[0] === "Plaintiff-Friendly";
  }).length;

  // PI score stats
  const piEntries = Object.entries(data.piByState).sort((a, b) => b[1] - a[1]);
  const topPiStates = piEntries.slice(0, 10);

  return (
    <div className="space-y-8">
      {/* -- 1. Page Header ------------------------------------------- */}
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
            Roblox Child Exploitation
          </h1>
          <span className="rounded-full bg-amber-50 border border-amber-400/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-600">
            Active MDL &mdash; Early Stage Litigation
          </span>
        </div>
        <p className="mt-1 text-lg text-slate-gray">
          Gaming Platform Liability &amp; Child Sexual Exploitation Litigation
        </p>
        <p className="mt-0.5 text-xs text-slate-gray">
          Last Updated: April 17, 2026
        </p>
      </div>

      {/* -- 2. Key Stats Row ----------------------------------------- */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Scale className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Federal MDL Cases
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">146+</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">MDL 3166, N.D. Cal. (and growing)</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              NCMEC Reports
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">24,500+</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Exploitation reports (2024)</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Daily Active Users
            </p>
          </div>
          <p className="text-xl font-bold text-midnight-navy">151.5M</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">56% under 16 years old</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Landmark className="w-3.5 h-3.5 text-red-500" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              State AG Actions
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">9+</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">State AG actions filed</p>
        </div>
      </div>

      {/* -- 3. Case Summary ------------------------------------------ */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-4">
          Case Summary
        </h2>
        <div className="space-y-4 text-sm leading-relaxed text-midnight-navy/80">
          <p>
            <span className="font-semibold text-midnight-navy">MDL 3166</span> &mdash;{" "}
            <em>In Re: Roblox Corporation Child Sexual Exploitation and Assault Litigation</em>.
            Consolidated in N.D. Cal. before Chief Judge Richard Seeborg.
            MDL created December 2025 &mdash; one of the newest federal MDLs.
          </p>
          <p>
            Plaintiffs allege Roblox deliberately prioritized growth metrics over child safety,
            creating a platform where predators could spoof age, groom children through in-game
            chat and Robux gifting, then migrate conversations to Discord/Snapchat where
            exploitation escalated. Claims include product liability (defective design of
            communication/safety systems), failure to warn, negligence, consumer fraud
            (misleading parents about platform safety), and civil sex trafficking.
          </p>

          {/* Grooming Pattern */}
          <div className="rounded-md border border-red-200 bg-red-50/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-2">
              Grooming Pattern (consistent across cases)
            </p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-midnight-navy/80">
              {GROOMING_PATTERN.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          <p>
            <span className="font-semibold text-midnight-navy">Eligible Claimants:</span>{" "}
            Children who were groomed, sexually exploited, coerced into sharing explicit content,
            or sexually assaulted by predators who contacted them through Roblox. Includes
            sextortion victims and families of children who suffered severe mental health consequences.
          </p>
          <p>
            <span className="font-semibold text-midnight-navy">Settlement Landscape:</span>{" "}
            No settlements yet in the MDL. Litigation is in early stages &mdash; MDL was only
            created in December 2025. However, the pace of state AG actions and the Hindenburg
            report revelations suggest significant pressure building.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Key Defendants
            </p>
            <p className="text-sm text-midnight-navy">
              Roblox Corporation (San Mateo, CA), Discord Inc., Snap Inc., Meta Platforms Inc.
            </p>
          </div>
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Key Evidence
            </p>
            <p className="text-sm text-midnight-navy">
              Hindenburg Research report (Oct 2024), 24,500+ NCMEC self-reports, rejected parental approval features
            </p>
          </div>
        </div>
      </div>

      {/* -- 4. Litigation Timeline ----------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Key Rulings &amp; Milestones
          </h2>
        </div>
        <div className="overflow-x-auto pb-2">
          <div className="relative flex items-start" style={{ minWidth: `${LITIGATION_TIMELINE.length * 140}px` }}>
            <div className="absolute left-[70px] right-[70px] top-[52px] h-px bg-intelligence-teal/30" />
            {LITIGATION_TIMELINE.map((e, i) => (
              <div
                key={i}
                className={`flex min-w-[140px] flex-1 flex-col items-center text-center ${e.future ? "opacity-60" : ""}`}
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
                  className={`mt-2 max-w-[120px] text-[10px] leading-tight ${
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

      {/* -- 5. Research & Qualification Criteria ---------------------- */}
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
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-xs font-semibold text-red-600 mb-1.5">
              Urgency Signal
            </p>
            <p className="text-xs leading-relaxed text-midnight-navy/70">
              This MDL is in its earliest stages &mdash; firms that establish advertising presence
              now will have first-mover advantage as the case count grows rapidly.
              146+ cases filed in just 4 months since MDL creation.
            </p>
          </div>
          <div className="rounded-md bg-amber-50 border border-warning/20 px-4 py-3">
            <p className="text-xs font-semibold text-warning mb-1.5">
              Documentation Challenge
            </p>
            <p className="text-xs leading-relaxed text-midnight-navy/70">
              Requires evidence of predator contact through Roblox AND resulting exploitation/harm.
              Platform usage records, chat logs, police reports, and medical/psychological records
              strengthen claims significantly.
            </p>
          </div>
        </div>
      </div>

      {/* -- 6. Market Opportunity Signals ----------------------------- */}
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

        {/* -- Signal 6a: Parental Concern Index ----------------------- */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 1: Parental Concern Index (Top 10)
            </h3>
          </div>
          <p className="mb-2 text-xs text-slate-gray">
            Source: Dolman Law Group Analysis &mdash; composite score of download requests, search volume, media mentions, and lawsuits
          </p>

          {/* Insight Banner */}
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              {data.parentalConcern.length > 0 ? (
                <>
                  {data.parentalConcern[0].state} leads with a Parental Concern Score of{" "}
                  <span className="font-bold text-midnight-navy">{data.parentalConcern[0].concern_score}</span>.
                  {" "}{data.parentalConcern.reduce((max, r) => r.lawsuits_filed > max.lawsuits_filed ? r : max, data.parentalConcern[0]).state}{" "}
                  has the most lawsuits filed ({data.parentalConcern.reduce((max, r) => r.lawsuits_filed > max.lawsuits_filed ? r : max, data.parentalConcern[0]).lawsuits_filed}).
                </>
              ) : (
                "Parental concern data loading..."
              )}
            </p>
          </div>

          {/* Horizontal Bar Chart */}
          {data.parentalConcern.length > 0 ? (
            <div className="rounded-lg bg-white p-4">
              <p className="mb-3 text-xs font-semibold text-midnight-navy">
                Top 10 States by Parental Concern Score
              </p>
              <ResponsiveContainer width="100%" height={data.parentalConcern.length * 32 + 20}>
                <BarChart
                  data={data.parentalConcern}
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
                    formatter={(value) => [`${value}`, "Concern Score"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="concern_score" radius={[0, 4, 4, 0]}>
                    {data.parentalConcern.map((_, i) => (
                      <Cell key={i} fill={i < 3 ? "#EF4444" : "#F87171"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Detail Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-cloud">
                      <th className="py-2 pr-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">State</th>
                      <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">Downloads/10K</th>
                      <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">Search Vol.</th>
                      <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">Media Mentions</th>
                      <th className="py-2 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">Lawsuits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.parentalConcern.map((r) => (
                      <tr key={r.state} className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors">
                        <td className="py-2 pr-3 font-medium text-midnight-navy">{r.state}</td>
                        <td className="py-2 px-3 text-right text-midnight-navy/80">{fmtNum(r.download_requests_per_10k)}</td>
                        <td className="py-2 px-3 text-right text-midnight-navy/80">{fmtNum(r.google_search_volume)}</td>
                        <td className="py-2 px-3 text-right text-midnight-navy/80">{fmtNum(r.media_mentions)}</td>
                        <td className="py-2 pl-3 text-right font-semibold text-midnight-navy">{r.lawsuits_filed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
              <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
              <p className="text-sm font-medium text-midnight-navy/60">
                Parental concern data loading...
              </p>
            </div>
          )}
        </div>

        {/* -- Signal 6b: Youth Mental Health Index -------------------- */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 2: Youth Mental Health Index
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

        {/* -- Signal 6c: State AG & Law Enforcement Activity ---------- */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Siren className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 3: State AG &amp; Law Enforcement Activity
            </h3>
          </div>
          <p className="mb-2 text-xs text-slate-gray">
            Source: Court filings / News reporting &mdash; state-level enforcement actions against Roblox
          </p>

          {/* Insight Banner */}
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              <span className="font-bold text-midnight-navy">9+</span> state attorneys general have taken
              direct legal action against Roblox.{" "}
              <span className="font-bold text-midnight-navy">{data.stateEnforcement.length}</span> states
              have documented exploitation cases.
            </p>
          </div>

          {/* Interactive Table */}
          {data.stateEnforcement.length > 0 ? (
            <div className="rounded-lg bg-white">
              <div className="flex items-center justify-between px-4 py-3 border-b border-cloud">
                <p className="text-xs font-semibold text-midnight-navy">
                  {data.stateEnforcement.length} states tracked
                </p>
                <button
                  onClick={() => setEnforcementSort(enforcementSort === "score" ? "state" : "score")}
                  className="flex items-center gap-1 text-xs font-medium text-intelligence-teal hover:underline"
                >
                  <ArrowUpDown className="w-3 h-3" />
                  Sort by {enforcementSort === "score" ? "State" : "Score"}
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
                        AG Action
                      </th>
                      <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                        Action Detail
                      </th>
                      <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                        Criminal Cases
                      </th>
                      <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                        Enforcement Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedEnforcement.map((r) => {
                      const badge = enforcementBadge(r.ag_action_type);
                      return (
                        <tr
                          key={r.state}
                          className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                        >
                          <td className="py-3 px-4 font-medium text-midnight-navy">
                            {r.state}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {r.has_ag_action ? (
                              <span
                                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.bg} ${badge.text}`}
                              >
                                {badge.label}
                              </span>
                            ) : (
                              <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                None
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-xs text-midnight-navy/80 max-w-[200px]">
                            {r.ag_action_detail ?? "\u2014"}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {r.has_criminal_cases ? (
                              <span className="inline-block rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-600">
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
                                r.enforcement_score >= 8
                                  ? "bg-red-50 text-red-600"
                                  : r.enforcement_score >= 5
                                  ? "bg-orange-50 text-orange-600"
                                  : r.enforcement_score >= 3
                                  ? "bg-amber-50 text-warning"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {r.enforcement_score}
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
                Enforcement data loading...
              </p>
            </div>
          )}
        </div>

        {/* -- Signal 6d: Judicial Profiles ----------------------------- */}
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
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-success">
                  {plaintiffFriendlyCount} Plaintiff-Friendly States
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-intelligence-teal/10 px-3 py-1 text-xs font-semibold text-intelligence-teal">
                  {judicialStates.length} States with Data
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {judicialStates
                  .sort(([a], [b]) => a.localeCompare(b))
                  .slice(0, 20)
                  .map(([state, v]) => {
                    const dominant = Object.entries(v.profiles).sort((a, b) => b[1] - a[1])[0];
                    const profile = dominant?.[0] ?? "Unknown";
                    const color =
                      profile === "Plaintiff-Friendly"
                        ? "border-success/30 bg-emerald-50"
                        : profile === "Moderate" || profile === "Mixed"
                        ? "border-intelligence-teal/30 bg-intelligence-teal/5"
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

        {/* -- Signal 6e: PI Viability Scores -------------------------- */}
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

      {/* -- 7. Co-Defendant Platform Breakdown ----------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Gamepad2 className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Co-Defendant Platform Breakdown
          </h2>
        </div>
        <p className="mb-4 text-xs text-slate-gray">
          How platforms interact in the exploitation pattern
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Platform
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Role in Exploitation
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  Cases Named
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  AG Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {CO_DEFENDANTS.map((d) => (
                <tr
                  key={d.platform}
                  className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                >
                  <td className="py-3 pr-4 font-medium text-midnight-navy">
                    {d.platform}
                  </td>
                  <td className="py-3 px-3 text-midnight-navy/80">{d.role}</td>
                  <td className="py-3 px-3 text-center text-midnight-navy/80">{d.cases}</td>
                  <td className="py-3 pl-3 text-midnight-navy/80 text-xs">{d.agActions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* -- 8. Platform Safety Failure Timeline ----------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm border border-red-100">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4.5 h-4.5 text-red-500" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Platform Safety Failure Timeline
          </h2>
        </div>
        <p className="mb-4 text-xs text-slate-gray">
          Roblox&apos;s documented safety track record
        </p>
        <div className="space-y-3">
          {SAFETY_FAILURES.map((item, i) => (
            <div key={i} className="flex gap-4 items-start">
              <div className="shrink-0 w-24 text-right">
                <span className="inline-block rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-600">
                  {item.year}
                </span>
              </div>
              <div className="relative pt-1">
                <div className="absolute left-0 top-0 h-full w-px bg-red-200" />
                <div className="absolute left-[-3px] top-1.5 h-2 w-2 rounded-full bg-red-400" />
                <p className="pl-4 text-sm text-midnight-navy/80 leading-relaxed">
                  {item.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* -- 9. Advertising Landscape (LIVE DATA) --------------------- */}
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

      {/* -- 9b. Cost Benchmark Scorecard (LIVE DATA) ----------------- */}
      <CostBenchmarkScorecard data={data.benchmark} />

      {/* -- 10. Top Advertisers (LIVE DATA) -------------------------- */}
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
          Competitive landscape &mdash; firms with the highest advertising presence for Roblox abuse litigation.
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

      {/* -- 11. Sample Ads (LIVE DATA) ------------------------------- */}
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

      {/* -- 12. Top Markets by Saturation (LIVE DATA) ---------------- */}
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

      {/* -- 13. SERP Visibility (LIVE DATA) -------------------------- */}
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

      {/* -- 14. Sources & Methodology -------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Sources &amp; Methodology
          </h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            "Dolman Law Group Parental Concern Index (Q2 2025)",
            "Mental Health America \u2014 State of Mental Health in America",
            "Hindenburg Research Report (October 2024)",
            "NCMEC CyberTipline Data (2024)",
            "JPML MDL Statistics",
            "Court filings: MDL 3166",
            "State AG press releases and court documents",
            "ICAC Task Force Program data",
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

      {/* -- 15. Footer / Disclaimer ---------------------------------- */}
      <div className="rounded-lg border border-cloud bg-cloud/40 p-5">
        <p className="text-xs leading-relaxed text-slate-gray">
          This page is refreshed monthly. Content reflects research and publicly
          available data as of the date shown. Settlement projections are attorney
          estimates and industry benchmarks &mdash; not guarantees. This page does not
          constitute legal advice.
        </p>
        <p className="mt-3 text-[11px] text-slate-gray/80">
          Data sources: Dolman Law Group (2025), Mental Health America, Hindenburg Research (2024),
          NCMEC CyberTipline (2024), JPML, MDL 3166 court filings, state AG press releases,
          ICAC Task Force Program.
        </p>
      </div>
    </div>
  );
}
