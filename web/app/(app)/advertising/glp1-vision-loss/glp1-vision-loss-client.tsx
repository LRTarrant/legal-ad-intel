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
  EyeOff,
  Monitor,
  Database,
  Activity,
  Crosshair,
  Landmark,
  Pill,
  ShieldAlert,
  Globe,
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

export interface GLP1VisionLossPageData {
  prescriptionTop15: GLP1PrescriptionRow[];
  obesityTop15: ObesityRow[];
  diabetesTop15: DiabetesRow[];
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

/* ------------------------------------------------------------------ */
/*  Static Data                                                        */
/* ------------------------------------------------------------------ */

const QUALIFICATION_CRITERIA = [
  { criterion: "Drug", detail: "Ozempic, Wegovy, Rybelsus (semaglutide), Mounjaro, Zepbound (tirzepatide)" },
  { criterion: "Injury", detail: "NAION (non-arteritic anterior ischemic optic neuropathy), sudden vision loss, permanent visual field deficits, optic nerve damage" },
  { criterion: "Causation", detail: "Vision loss developed after starting GLP-1 medication" },
  { criterion: "Medical Records", detail: "Ophthalmologist diagnosis of NAION or ischemic optic neuropathy; fundoscopy/OCT records; visual field testing" },
  { criterion: "Prescription Records", detail: "Pharmacy records confirming GLP-1 prescription and start date" },
  { criterion: "Key Differentiator", detail: "Weight-loss users face 7.64x risk vs. 4.28x for diabetic users \u2014 indication matters for case strength" },
  { criterion: "Excluded", detail: "Pre-existing NAION or optic nerve conditions before GLP-1 use; arteritic (giant cell arteritis-related) ischemic optic neuropathy" },
];

const LITIGATION_TIMELINE = [
  { date: "Dec 2017", event: "FDA approves Ozempic (semaglutide) for type 2 diabetes", future: false },
  { date: "Jun 2021", event: "FDA approves Wegovy (semaglutide) for weight loss", future: false },
  { date: "May 2022", event: "FDA approves Mounjaro (tirzepatide) for type 2 diabetes", future: false },
  { date: "Jul 2024", event: "Harvard/JAMA study: GLP-1 users face 4.28x\u20137.64x NAION risk", future: false },
  { date: "Late 2024", event: "First NAION lawsuits filed against Novo Nordisk and Eli Lilly", future: false },
  { date: "Jun 2025", event: "EMA adds NAION to semaglutide labels (EU)", future: false },
  { date: "Fall 2025", event: "Plaintiffs petition JPML for MDL consolidation", future: false },
  { date: "Dec 15, 2025", event: "JPML creates MDL 3163, assigns to Judge Marston (E.D. Pa.)", future: false },
  { date: "Jan 2026", event: "NJ multicounty litigation petitioned (30+ plaintiffs, Middlesex County)", future: false },
  { date: "Apr 2026", event: "~30 cases in MDL and growing rapidly", future: true },
  { date: "Jun 2, 2026", event: "Science Day \u2014 expert causation presentations", future: true },
];

const DRUG_DEFENDANTS = [
  { drug: "Ozempic", manufacturer: "Novo Nordisk", indication: "Type 2 diabetes", ingredient: "Semaglutide", approved: "Dec 2017", inMdl: true },
  { drug: "Wegovy", manufacturer: "Novo Nordisk", indication: "Weight loss", ingredient: "Semaglutide", approved: "Jun 2021", inMdl: true },
  { drug: "Rybelsus", manufacturer: "Novo Nordisk", indication: "Type 2 diabetes (oral)", ingredient: "Semaglutide", approved: "Sep 2019", inMdl: true },
  { drug: "Mounjaro", manufacturer: "Eli Lilly", indication: "Type 2 diabetes", ingredient: "Tirzepatide", approved: "May 2022", inMdl: true },
  { drug: "Zepbound", manufacturer: "Eli Lilly", indication: "Weight loss", ingredient: "Tirzepatide", approved: "Nov 2023", inMdl: true },
];

const NAION_RISK_CARDS = [
  { value: "4.28x", label: "NAION Risk", sub: "Diabetic GLP-1 users vs. non-GLP-1 diabetic patients", color: "border-amber-200 bg-amber-50", accent: "text-amber-600" },
  { value: "7.64x", label: "NAION Risk", sub: "Weight-loss GLP-1 users vs. non-GLP-1 weight-loss patients", color: "border-red-200 bg-red-50", accent: "text-red-600" },
  { value: "9.48 days", label: "Median Time-to-Onset", sub: "Eye disorders (FAERS, tirzepatide)", color: "border-intelligence-teal/30 bg-intelligence-teal/5", accent: "text-intelligence-teal" },
  { value: "EMA Warning", label: "EU Label Updated", sub: "NAION added to semaglutide labels (Jun 2025)", color: "border-emerald-200 bg-emerald-50", accent: "text-emerald-600" },
  { value: "No FDA Warning", label: "U.S. Labels Unchanged", sub: "No NAION risk on any GLP-1 label (as of Apr 2026)", color: "border-red-300 bg-red-50", accent: "text-red-600" },
  { value: "2\u201310 / 100K", label: "NAION General Prevalence", sub: "GLP-1 users face dramatically elevated risk above baseline", color: "border-slate-200 bg-slate-50", accent: "text-slate-600" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function GLP1VisionLossClient({ data }: { data: GLP1VisionLossPageData }) {
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
            GLP-1 Vision Loss
          </h1>
          <span className="rounded-full bg-amber-50 border border-amber-400/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-600">
            New MDL &mdash; Early Stage Litigation
          </span>
        </div>
        <p className="mt-1 text-lg text-slate-gray">
          NAION &amp; Permanent Vision Loss Litigation &mdash; Ozempic, Wegovy, Mounjaro, Zepbound
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
          <p className="text-2xl font-bold text-midnight-navy">~30</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">MDL 3163, E.D. Pa. (newly formed)</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <EyeOff className="w-3.5 h-3.5 text-red-500" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              NAION Risk (Weight-Loss)
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">7.64x</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Harvard/JAMA 2024 study</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Science Day
            </p>
          </div>
          <p className="text-xl font-bold text-midnight-navy">Jun 2, 2026</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Expert causation presentations</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Landmark className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Defendants
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">2</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Novo Nordisk + Eli Lilly</p>
        </div>
      </div>

      {/* -- 3. Case Summary ------------------------------------------ */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-4">
          Case Summary
        </h2>
        <div className="space-y-4 text-sm leading-relaxed text-midnight-navy/80">
          <p>
            <span className="font-semibold text-midnight-navy">MDL 3163</span> &mdash;{" "}
            <em>In Re: GLP-1 NAION Products Liability Litigation</em>.
            Consolidated in E.D. Pennsylvania before Judge Karen S. Marston (same judge as MDL 3094 GI track).
            MDL created December 15, 2025 &mdash; approximately 30 federal cases as of April 2026, growing rapidly.
          </p>
          <p>
            Plaintiffs allege GLP-1 drugs cause non-arteritic anterior ischemic optic neuropathy (NAION),
            a sudden loss of vision caused by reduced blood flow to the optic nerve. NAION often causes
            permanent, irreversible vision loss. The core claim is that manufacturers knew or should have
            known about the NAION risk based on clinical trial signals and post-market adverse event reports,
            yet failed to warn patients and prescribers. The litigation is bolstered by the EMA&apos;s decision
            to add NAION to semaglutide labels in June 2025 &mdash; while the FDA has NOT added a similar
            warning, creating a central regulatory gap that plaintiffs use to argue the U.S. label is inadequate.
          </p>

          {/* Key Evidence callout */}
          <div className="rounded-md border border-intelligence-teal/20 bg-intelligence-teal/5 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-intelligence-teal mb-2">
              Key Evidence
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs text-midnight-navy/80">
              <li>Harvard/JAMA July 2024 study: NAION risk 4.28x higher in diabetic GLP-1 users, 7.64x higher in weight-loss users</li>
              <li>FAERS data: Semaglutide has higher reporting rate of vision impairment vs. other antidiabetic/weight-loss drugs</li>
              <li>FAERS eye disorders: Median time-to-onset 9.48 days for tirzepatide</li>
              <li>EMA added NAION warning to semaglutide labels (June 2025); FDA has NOT</li>
              <li>NJ multicounty litigation petitioned (30+ plaintiffs, Middlesex County)</li>
            </ul>
          </div>

          <p>
            <span className="font-semibold text-midnight-navy">Eligible Claimants:</span>{" "}
            Patients prescribed any GLP-1 receptor agonist (Ozempic, Wegovy, Rybelsus, Mounjaro, Zepbound)
            who subsequently developed NAION, sudden vision loss, optic nerve damage, or permanent visual field
            deficits. Both diabetes and weight-loss indication patients qualify &mdash; though weight-loss
            patients face 7.64x risk (nearly double the diabetic risk).
          </p>
          <p>
            <span className="font-semibold text-midnight-navy">Settlement Landscape:</span>{" "}
            No settlements &mdash; litigation is in very early stages (MDL created Dec 2025).
            Science Day in June 2026 will be a pivotal moment for establishing causation. The fact
            that the same judge (Marston) oversees both MDL 3094 (GI) and MDL 3163 (NAION) creates
            potential for coordinated proceedings. This is a ground-floor opportunity for firms &mdash;
            early case acquisition before the MDL matures could yield significant returns.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Key Defendants
            </p>
            <p className="text-sm text-midnight-navy">
              Novo Nordisk (Ozempic, Wegovy, Rybelsus &mdash; semaglutide) and Eli Lilly (Mounjaro, Zepbound &mdash; tirzepatide)
            </p>
          </div>
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Legal Theory
            </p>
            <p className="text-sm text-midnight-navy">
              Failure to warn &mdash; EMA/FDA regulatory gap as central evidence of inadequate U.S. labeling
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
          <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-xs font-semibold text-amber-600 mb-1.5">
              Ground-Floor Opportunity
            </p>
            <p className="text-xs leading-relaxed text-midnight-navy/70">
              With only ~30 cases in the MDL, this is one of the earliest-stage mass torts available.
              Firms that establish advertising presence now will have significant first-mover advantage
              as Science Day (June 2026) and causation evidence drive case count growth.
            </p>
          </div>
          <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 px-4 py-3">
            <p className="text-xs font-semibold text-intelligence-teal mb-1.5">
              Weight-Loss vs. Diabetes Indication
            </p>
            <p className="text-xs leading-relaxed text-midnight-navy/70">
              Weight-loss GLP-1 users face 7.64x NAION risk &mdash; nearly double the 4.28x risk
              for diabetic users. Targeting by indication can significantly improve lead quality.
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

        {/* -- Signal 6a: GLP-1 Prescription Volume -------------------- */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Pill className="w-4 h-4 text-intelligence-teal" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 1: GLP-1 Prescription Volume by State (Top 15)
            </h3>
          </div>
          <p className="mb-2 text-xs text-slate-gray">
            Source: GLP-1 Newsroom 2024 State-by-State Data
          </p>

          {/* Insight Banner */}
          <div className="mb-4 rounded-md border border-intelligence-teal/20 bg-intelligence-teal/5 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              {data.prescriptionTop15.length > 0 ? (
                <>
                  {data.prescriptionTop15[0].state} leads at{" "}
                  <span className="font-bold text-midnight-navy">{data.prescriptionTop15[0].statewide_usage_pct}%</span>{" "}
                  statewide GLP-1 usage &mdash; nearly 1 in 4 adults. States with the highest
                  prescription rates represent the largest potential NAION plaintiff pools.
                </>
              ) : (
                "Prescription data loading..."
              )}
            </p>
          </div>

          {/* Horizontal Bar Chart */}
          {data.prescriptionTop15.length > 0 ? (
            <div className="rounded-lg bg-white p-4">
              <p className="mb-3 text-xs font-semibold text-midnight-navy">
                Top 15 States by Statewide GLP-1 Usage (%)
              </p>
              <ResponsiveContainer width="100%" height={data.prescriptionTop15.length * 32 + 20}>
                <BarChart
                  data={data.prescriptionTop15}
                  layout="vertical"
                  margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
                >
                  <XAxis type="number" domain={[0, "auto"]} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="state"
                    width={140}
                    tick={{ fontSize: 11, fill: "#1B2A4A" }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "Statewide Usage"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="statewide_usage_pct" radius={[0, 4, 4, 0]}>
                    {data.prescriptionTop15.map((_, i) => (
                      <Cell key={i} fill={i < 5 ? "#1A8C96" : "#4FB8C4"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
              <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
              <p className="text-sm font-medium text-midnight-navy/60">
                GLP-1 prescription data loading...
              </p>
            </div>
          )}
        </div>

        {/* -- Signal 6b: Obesity Prevalence --------------------------- */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 2: Obesity Prevalence by State (Top 15)
            </h3>
          </div>
          <p className="mb-2 text-xs text-slate-gray">
            Source: CDC BRFSS 2024
          </p>

          {/* Insight Banner */}
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              Weight-loss GLP-1 users face{" "}
              <span className="font-bold text-midnight-navy">7.64x NAION risk</span> &mdash;
              nearly double the risk for diabetic users. High-obesity states have the most
              weight-loss indication prescriptions.
            </p>
          </div>

          {/* Horizontal Bar Chart */}
          {data.obesityTop15.length > 0 ? (
            <div className="rounded-lg bg-white p-4">
              <p className="mb-3 text-xs font-semibold text-midnight-navy">
                Top 15 States by Obesity Prevalence (%)
              </p>
              <ResponsiveContainer width="100%" height={data.obesityTop15.length * 32 + 20}>
                <BarChart
                  data={data.obesityTop15}
                  layout="vertical"
                  margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
                >
                  <XAxis type="number" domain={[0, "auto"]} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="state"
                    width={140}
                    tick={{ fontSize: 11, fill: "#1B2A4A" }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "Obesity Prevalence"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="obesity_prevalence_pct" radius={[0, 4, 4, 0]}>
                    {data.obesityTop15.map((_, i) => (
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
                Obesity prevalence data loading...
              </p>
            </div>
          )}
        </div>

        {/* -- Signal 6c: Diabetes Prevalence -------------------------- */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 3: Diabetes Prevalence by State (Top 15)
            </h3>
          </div>
          <p className="mb-2 text-xs text-slate-gray">
            Source: CDC BRFSS 2021
          </p>

          {/* Insight Banner */}
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              Diabetic GLP-1 users face{" "}
              <span className="font-bold text-midnight-navy">4.28x NAION risk</span> (Harvard/JAMA 2024).
              {data.diabetesTop15.length > 0 && (
                <>
                  {" "}{data.diabetesTop15[0].state} leads with{" "}
                  <span className="font-bold text-midnight-navy">{data.diabetesTop15[0].diabetes_prevalence_pct}%</span>{" "}
                  diabetes prevalence &mdash; combined with high GLP-1 usage, it represents the
                  highest-concentration plaintiff pool.
                </>
              )}
            </p>
          </div>

          {/* Horizontal Bar Chart */}
          {data.diabetesTop15.length > 0 ? (
            <div className="rounded-lg bg-white p-4">
              <p className="mb-3 text-xs font-semibold text-midnight-navy">
                Top 15 States by Diabetes Prevalence (%)
              </p>
              <ResponsiveContainer width="100%" height={data.diabetesTop15.length * 32 + 20}>
                <BarChart
                  data={data.diabetesTop15}
                  layout="vertical"
                  margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
                >
                  <XAxis type="number" domain={[0, "auto"]} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="state"
                    width={140}
                    tick={{ fontSize: 11, fill: "#1B2A4A" }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "Diabetes Prevalence"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="diabetes_prevalence_pct" radius={[0, 4, 4, 0]}>
                    {data.diabetesTop15.map((_, i) => (
                      <Cell key={i} fill={i < 5 ? "#EF4444" : "#F87171"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
              <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
              <p className="text-sm font-medium text-midnight-navy/60">
                Diabetes prevalence data loading...
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

      {/* -- 7. Drug Defendant Breakdown ------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Pill className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Drug Defendant Breakdown
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">Drug</th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">Manufacturer</th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">Indication</th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">Active Ingredient</th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">FDA Approved</th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">Named in MDL</th>
              </tr>
            </thead>
            <tbody>
              {DRUG_DEFENDANTS.map((d) => (
                <tr
                  key={d.drug}
                  className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                >
                  <td className="py-3 pr-4 font-medium text-midnight-navy">{d.drug}</td>
                  <td className="py-3 px-3 text-midnight-navy/80">{d.manufacturer}</td>
                  <td className="py-3 px-3 text-midnight-navy/80">{d.indication}</td>
                  <td className="py-3 px-3 text-midnight-navy/80">{d.ingredient}</td>
                  <td className="py-3 px-3 text-midnight-navy/80">{d.approved}</td>
                  <td className="py-3 pl-3 text-center">
                    <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                      Yes
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* -- 8. NAION Risk Profile (UNIQUE) ---------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm border border-red-100">
        <div className="flex items-center gap-2 mb-4">
          <EyeOff className="w-4.5 h-4.5 text-red-500" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            NAION Risk Profile
          </h2>
        </div>
        <p className="mb-4 text-xs text-slate-gray">
          Vision-specific risk data from Harvard/JAMA 2024 study and FAERS reports
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NAION_RISK_CARDS.map((card) => (
            <div
              key={card.value}
              className={`rounded-lg border p-4 ${card.color}`}
            >
              <p className={`text-2xl font-bold ${card.accent}`}>{card.value}</p>
              <p className="mt-1 text-sm font-semibold text-midnight-navy">{card.label}</p>
              <p className="mt-0.5 text-xs text-midnight-navy/60">{card.sub}</p>
            </div>
          ))}
        </div>
        {/* Context callout */}
        <div className="mt-4 rounded-md border border-midnight-navy/10 bg-midnight-navy/[0.03] px-4 py-3">
          <p className="text-sm leading-relaxed text-midnight-navy/80">
            NAION causes sudden, painless vision loss &mdash; typically in one eye &mdash; due to ischemia of
            the optic nerve head. Vision loss is usually permanent. There is no proven treatment. The
            Harvard/JAMA study found the risk was nearly twice as high for weight-loss patients (7.64x)
            compared to diabetic patients (4.28x), suggesting the weight-loss indication may carry
            disproportionate risk.
          </p>
        </div>
      </div>

      {/* -- 9. Regulatory Gap Callout (UNIQUE) ------------------------ */}
      <div className="rounded-lg border-2 border-red-300 bg-gradient-to-br from-red-50 to-amber-50 p-6 shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="w-5 h-5 text-red-600" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Regulatory Gap &mdash; Failure-to-Warn Centerpiece
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* EMA (EU) */}
          <div className="rounded-lg border-2 border-emerald-300 bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-emerald-600" />
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                EMA (European Union)
              </p>
            </div>
            <p className="text-2xl font-bold text-emerald-600 mb-1">NAION Warning Added</p>
            <p className="text-sm font-semibold text-midnight-navy mb-2">June 2025</p>
            <p className="text-xs leading-relaxed text-midnight-navy/70">
              The European Medicines Agency added NAION as a possible side effect to
              semaglutide product labels, acknowledging the risk identified in the
              Harvard/JAMA study and post-market surveillance data.
            </p>
          </div>
          {/* FDA (US) */}
          <div className="rounded-lg border-2 border-red-300 bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <p className="text-xs font-bold uppercase tracking-wider text-red-600">
                FDA (United States)
              </p>
            </div>
            <p className="text-2xl font-bold text-red-600 mb-1">NO Warning</p>
            <p className="text-sm font-semibold text-midnight-navy mb-2">As of April 2026</p>
            <p className="text-xs leading-relaxed text-midnight-navy/70">
              The FDA has NOT added a NAION warning to any GLP-1 receptor agonist label.
              U.S. prescribing information for Ozempic, Wegovy, Mounjaro, and Zepbound
              makes no mention of NAION risk.
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-md bg-white/80 border border-red-200 px-4 py-3">
          <p className="text-sm font-medium leading-relaxed text-midnight-navy/80">
            This transatlantic regulatory gap is central to plaintiffs&apos; failure-to-warn claims.
            European regulators acknowledged the NAION risk and updated labels; U.S. regulators
            have not. Plaintiffs argue this demonstrates that the U.S. label is inadequate and that
            manufacturers failed to voluntarily update their warnings despite mounting evidence.
          </p>
        </div>
      </div>

      {/* -- 10. Advertising Landscape (LIVE DATA) --------------------- */}
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

      {/* -- 10b. Cost Benchmark Scorecard (LIVE DATA) ----------------- */}
      <CostBenchmarkScorecard data={data.benchmark} />

      {/* -- 11. Top Advertisers (LIVE DATA) --------------------------- */}
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
          Competitive landscape &mdash; firms with the highest advertising presence for GLP-1 vision loss litigation.
        </p>

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
                    <tr
                      key={`${adv.advertiser_name}-${i}`}
                      className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium text-midnight-navy">{adv.advertiser_name}</td>
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
            <p className="text-sm font-medium text-midnight-navy/60">
              Advertiser data collection in progress
            </p>
            <p className="mt-1 text-xs text-slate-gray">
              Top advertisers will appear here once data is collected from ad platforms.
            </p>
          </div>
        )}
      </div>

      {/* -- 12. Sample Ads (LIVE DATA) -------------------------------- */}
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

      {/* -- 13. Top Markets by Saturation (LIVE DATA) ----------------- */}
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

      {/* -- 14. SERP Visibility (LIVE DATA) --------------------------- */}
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

      {/* -- 15. Sources & Methodology -------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Sources &amp; Methodology
          </h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            "Harvard/JAMA (July 2024) \u2014 GLP-1 and NAION risk study",
            "GLP-1 Newsroom State-by-State Prescription Data (2024)",
            "CDC BRFSS Adult Obesity Prevalence Maps (2024)",
            "CDC National Diabetes Statistics Report / BRFSS (2021)",
            "FDA FAERS Adverse Event Reports",
            "European Medicines Agency (EMA) Safety Communications (2025)",
            "JPML MDL Statistics",
            "MDL Update \u2014 MDL 3163 tracking",
            "King Law / Robert King Law Firm \u2014 NAION litigation analysis",
            "Helbock Law Firm \u2014 GLP-1 lawsuit tracker",
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

      {/* -- 16. Footer / Disclaimer ---------------------------------- */}
      <div className="rounded-lg border border-cloud bg-cloud/40 p-5">
        <p className="text-xs leading-relaxed text-slate-gray">
          This page is refreshed monthly. Content reflects research and publicly
          available data as of the date shown. Settlement projections are attorney
          estimates and industry benchmarks &mdash; not guarantees. This page does not
          constitute legal advice.
        </p>
        <p className="mt-3 text-[11px] text-slate-gray/80">
          Data sources: Harvard/JAMA (2024), GLP-1 Newsroom (2024), CDC BRFSS (2021\u20132024),
          FDA FAERS, EMA Safety Communications (2025), JPML, MDL 3163 court filings.
        </p>
      </div>
    </div>
  );
}
