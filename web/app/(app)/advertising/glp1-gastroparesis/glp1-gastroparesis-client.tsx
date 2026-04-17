"use client";

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
  Pill,
  Landmark,
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

export interface GLP1GastroparesisPageData {
  prescriptionTop15: GLP1PrescriptionRow[];
  obesityTop15: ObesityPrevalenceRow[];
  diabetesTop15: DiabetesPrevalenceRow[];
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
  { criterion: "Injury", detail: "Gastroparesis, stomach paralysis, bowel obstruction, ileus, aspiration during surgery, severe persistent vomiting" },
  { criterion: "Causation", detail: "Symptoms developed after starting GLP-1 medication" },
  { criterion: "Medical Records", detail: "Diagnosis of gastroparesis or GI injury documented by physician; hospitalization records strengthen claim" },
  { criterion: "Prescription Records", detail: "Pharmacy records confirming GLP-1 prescription" },
  { criterion: "Excluded", detail: "Mild/transient nausea or vomiting (expected side effect); pre-existing gastroparesis before GLP-1 use" },
];

const LITIGATION_TIMELINE = [
  { date: "Dec 2017", event: "FDA approves Ozempic (semaglutide) for type 2 diabetes", future: false },
  { date: "Jun 2021", event: "FDA approves Wegovy (semaglutide) for weight loss", future: false },
  { date: "May 2022", event: "FDA approves Mounjaro (tirzepatide) for type 2 diabetes", future: false },
  { date: "Aug 2023", event: "First major gastroparesis lawsuits filed", future: false },
  { date: "Sep 2023", event: "FDA adds ileus warning to Ozempic label", future: false },
  { date: "Oct 2023", event: "JAMA study: Ozempic triples gastroparesis risk", future: false },
  { date: "Nov 2023", event: "CNN investigation brings national attention", future: false },
  { date: "Feb 2024", event: "JPML creates MDL 3094, transfers to E.D. Pa.", future: false },
  { date: "Nov 2024", event: "FDA requires postmarketing aspiration study; updates all GLP-1 labels", future: false },
  { date: "Jan 2025", event: "FDA adds gastroparesis \u201cnot recommended\u201d language", future: false },
  { date: "Apr 2026", event: "3,546 cases pending in MDL", future: false },
];

const DRUG_DEFENDANTS = [
  { drug: "Ozempic", manufacturer: "Novo Nordisk", indication: "Type 2 diabetes", activeIngredient: "Semaglutide", fdaApproved: "Dec 2017", namedInMDL: true },
  { drug: "Wegovy", manufacturer: "Novo Nordisk", indication: "Weight loss", activeIngredient: "Semaglutide", fdaApproved: "Jun 2021", namedInMDL: true },
  { drug: "Rybelsus", manufacturer: "Novo Nordisk", indication: "Type 2 diabetes (oral)", activeIngredient: "Semaglutide", fdaApproved: "Sep 2019", namedInMDL: true },
  { drug: "Mounjaro", manufacturer: "Eli Lilly", indication: "Type 2 diabetes", activeIngredient: "Tirzepatide", fdaApproved: "May 2022", namedInMDL: true },
  { drug: "Zepbound", manufacturer: "Eli Lilly", indication: "Weight loss", activeIngredient: "Tirzepatide", fdaApproved: "Nov 2023", namedInMDL: true },
];

const FAERS_STATS = [
  { label: "Total Tirzepatide AE Reports", value: "67,305", sub: "Through Q1 2025" },
  { label: "GI Disorder ROR", value: "2.66", sub: "Statistically significant" },
  { label: "Median GI Onset", value: "5.57 days", sub: "Time to first GI event" },
  { label: "Serious Outcomes", value: "9,266", sub: "288 deaths, 3,009 hospitalizations" },
];

const FAERS_TOP_GI = [
  { event: "Nausea", pct: 27.7 },
  { event: "Diarrhea", pct: 12.8 },
  { event: "Vomiting", pct: 10.6 },
  { event: "Constipation", pct: 8.1 },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function GLP1GastroparesisClient({ data }: { data: GLP1GastroparesisPageData }) {
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
      {/* -- 1. Page Header ------------------------------------------------ */}
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
            GLP-1 Gastroparesis
          </h1>
          <span className="rounded-full bg-intelligence-teal/10 border border-intelligence-teal/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-intelligence-teal">
            Active MDL &mdash; 3,546 Pending Cases
          </span>
        </div>
        <p className="mt-1 text-lg text-slate-gray">
          Stomach Paralysis &amp; Severe GI Injury Litigation &mdash; Ozempic, Wegovy, Mounjaro, Zepbound
        </p>
        <p className="mt-0.5 text-xs text-slate-gray">
          Last Updated: April 17, 2026
        </p>
      </div>

      {/* -- 2. Key Stats Row ---------------------------------------------- */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Scale className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              MDL Cases
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">3,546</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">MDL 3094, E.D. Pa.</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <DollarSign className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Medicare GLP-1 Spend
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">$27.5B</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">2024 Medicare spending</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Gastroparesis Risk
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">3.4x</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Mayo Clinic increase</p>
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

      {/* -- 3. Case Summary ----------------------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-4">
          Case Summary
        </h2>
        <div className="space-y-4 text-sm leading-relaxed text-midnight-navy/80">
          <p>
            <span className="font-semibold text-midnight-navy">MDL 3094</span> &mdash;{" "}
            <em>In Re: GLP-1 Receptor Agonist (Ozempic/Wegovy/Mounjaro) Products Liability Litigation</em>.
            Consolidated in E.D. Pennsylvania before Judge Karen S. Marston. MDL created February 2024 with 3,546 federal cases as of April 2026.
          </p>
          <p>
            <span className="font-semibold text-midnight-navy">Legal Theory:</span>{" "}
            Plaintiffs allege manufacturers knew GLP-1 receptor agonists cause severe gastroparesis (stomach paralysis),
            bowel obstruction, ileus, and other serious GI injuries beyond the typical nausea/vomiting disclosed on labels.
            Claims allege defendants conducted inadequate clinical trials, suppressed internal safety data, and marketed
            the drugs aggressively while downplaying risks. The core failure-to-warn theory is strengthened by the FDA&apos;s
            own post-market label changes adding gastroparesis, ileus, and aspiration warnings &mdash; changes plaintiffs
            argue came years too late.
          </p>
          <p>
            <span className="font-semibold text-midnight-navy">Key Evidence:</span>{" "}
            JAMA 2023 study showing Ozempic triples gastroparesis risk; Mayo Clinic 2024 finding 3.4x increase among GLP-1 users;
            67,305 tirzepatide FAERS reports with GI disorder ROR of 2.66; CNN investigation (2023) bringing national spotlight;
            FDA-required postmarketing aspiration study (Nov 2024); 75.8% of FAERS reports involving female patients.
          </p>
          <p>
            <span className="font-semibold text-midnight-navy">Eligible Claimants:</span>{" "}
            Patients prescribed Ozempic, Wegovy, Rybelsus, Mounjaro, or Zepbound who subsequently developed gastroparesis,
            stomach paralysis, severe vomiting requiring hospitalization, bowel obstruction, ileus, or aspiration during surgery.
            Both diabetes and weight-loss indication patients qualify.
          </p>
          <p>
            <span className="font-semibold text-midnight-navy">Settlement Landscape:</span>{" "}
            No settlements yet. Bellwether trial selection is underway. The massive case count (3,546 and growing)
            and clear regulatory acknowledgment of the risks (FDA label changes) create significant settlement pressure.
            Analysts compare this MDL&apos;s trajectory to Vioxx and Belviq.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Key Defendants
            </p>
            <p className="text-sm text-midnight-navy">
              Novo Nordisk (Ozempic, Wegovy, Rybelsus &mdash; semaglutide), Eli Lilly (Mounjaro, Zepbound &mdash; tirzepatide)
            </p>
          </div>
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              FDA Label Timeline
            </p>
            <p className="text-sm text-midnight-navy">
              Sep 2023: ileus warning &bull; Nov 2024: aspiration warning &bull; Jan 2025: gastroparesis &ldquo;not recommended&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* -- 4. Litigation Timeline ---------------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Litigation Timeline
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

      {/* -- 5. Research & Qualification Criteria -------------------------- */}
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
              Massive claimant pool &mdash; over 40 million Americans prescribed GLP-1 drugs.
              Medicare spending alone hit $27.5B in 2024. Both diabetes and weight-loss patients qualify,
              expanding the eligible population significantly.
            </p>
          </div>
          <div className="rounded-md bg-amber-50 border border-warning/20 px-4 py-3">
            <p className="text-xs font-semibold text-warning mb-1.5">
              Documentation Challenge
            </p>
            <p className="text-xs leading-relaxed text-midnight-navy/70">
              Requires physician-documented gastroparesis diagnosis AND pharmacy prescription records.
              Mild/transient nausea is excluded &mdash; claimants need documented severe GI injury,
              hospitalization, or surgical complication.
            </p>
          </div>
        </div>
      </div>

      {/* -- 6. Market Opportunity Signals --------------------------------- */}
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

        {/* -- Signal 6a: GLP-1 Prescription Volume ----------------------- */}
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

          <div className="mb-4 rounded-md border border-intelligence-teal/30 bg-intelligence-teal/5 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              West Virginia leads at <span className="font-bold text-midnight-navy">24%</span> statewide
              GLP-1 usage &mdash; nearly 1 in 4 adults. Kentucky follows at{" "}
              <span className="font-bold text-midnight-navy">22%</span>. The South and Appalachia dominate
              prescriptions, directly mapping the potential plaintiff pool.
            </p>
          </div>

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
                    formatter={(value: number, _name: string, props: { payload: GLP1PrescriptionRow }) => [
                      `${value}% (${props.payload.total_prescriptions_2024.toLocaleString()} prescriptions)`,
                      "Statewide Usage",
                    ]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="statewide_usage_pct" radius={[0, 4, 4, 0]}>
                    {data.prescriptionTop15.map((_, i) => (
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
                GLP-1 prescription data loading...
              </p>
            </div>
          )}
        </div>

        {/* -- Signal 6b: Obesity Prevalence ------------------------------ */}
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

          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              Mississippi (<span className="font-bold text-midnight-navy">40.5%</span>) and
              West Virginia (<span className="font-bold text-midnight-navy">41.0%</span>) exceed
              40% adult obesity. Obesity is the primary driver of GLP-1 prescriptions &mdash;
              high-obesity states represent concentrated plaintiff pools.
            </p>
          </div>

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
                    formatter={(value) => [`${value}%`, "Obesity Rate"]}
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

        {/* -- Signal 6c: Diabetes Prevalence ----------------------------- */}
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

          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              West Virginia has the nation&apos;s highest diabetes prevalence at{" "}
              <span className="font-bold text-midnight-navy">18.2%</span>. Diabetic GLP-1 users face
              a 4.28x NAION risk (Harvard/JAMA 2024). High-diabetes states overlap heavily with high-GLP-1 states.
            </p>
          </div>

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
                    formatter={(value) => [`${value}%`, "Diabetes Rate"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="diabetes_prevalence_pct" radius={[0, 4, 4, 0]}>
                    {data.diabetesTop15.map((_, i) => (
                      <Cell key={i} fill={i < 5 ? "#EF4444" : "#FCA5A5"} />
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

        {/* -- Signal 6d: Judicial Profiles ------------------------------- */}
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

        {/* -- Signal 6e: PI Viability Scores ----------------------------- */}
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

      {/* -- 7. Drug Defendant Breakdown ----------------------------------- */}
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
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Drug
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Manufacturer
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Indication
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Active Ingredient
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  FDA Approved
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  Named in MDL
                </th>
              </tr>
            </thead>
            <tbody>
              {DRUG_DEFENDANTS.map((d) => (
                <tr
                  key={d.drug}
                  className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                >
                  <td className="py-3 pr-4 font-medium text-midnight-navy">
                    {d.drug}
                  </td>
                  <td className="py-3 px-3 text-midnight-navy/80">{d.manufacturer}</td>
                  <td className="py-3 px-3 text-midnight-navy/80">{d.indication}</td>
                  <td className="py-3 px-3 text-midnight-navy/80">{d.activeIngredient}</td>
                  <td className="py-3 px-3 text-midnight-navy/80">{d.fdaApproved}</td>
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

      {/* -- 8. FAERS Adverse Event Profile -------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            FAERS Adverse Event Profile
          </h2>
        </div>
        <p className="mb-4 text-sm text-slate-gray">
          FDA FAERS data for tirzepatide (Mounjaro/Zepbound) &mdash; through Q1 2025
        </p>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-6">
          {FAERS_STATS.map((stat) => (
            <div key={stat.label} className="rounded-lg bg-cloud/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-midnight-navy">{stat.value}</p>
              <p className="mt-0.5 text-[11px] text-slate-gray">{stat.sub}</p>
            </div>
          ))}
        </div>

        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Top GI Adverse Events (% of reports)
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FAERS_TOP_GI.map((gi) => (
            <div key={gi.event} className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
              <p className="text-2xl font-bold text-midnight-navy">{gi.pct}%</p>
              <p className="mt-1 text-xs font-medium text-midnight-navy/70">{gi.event}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-md border border-intelligence-teal/20 bg-intelligence-teal/[0.06] px-4 py-3">
          <p className="text-xs leading-relaxed text-midnight-navy/80">
            <span className="font-semibold text-midnight-navy">Note:</span>{" "}
            75.8% of FAERS reports for tirzepatide involved female patients. Median time-to-onset
            for GI adverse events was 5.57 days. Source: FDA FAERS via PMC pharmacovigilance studies.
          </p>
        </div>
      </div>

      {/* -- 9. Advertising Landscape (LIVE DATA) -------------------------- */}
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

      {/* -- 9b. Cost Benchmark Scorecard (LIVE DATA) ---------------------- */}
      <CostBenchmarkScorecard data={data.benchmark} />

      {/* -- 10. Top Advertisers (LIVE DATA) ------------------------------- */}
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
          Competitive landscape &mdash; firms with the highest advertising presence for GLP-1 gastroparesis litigation.
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

      {/* -- 11. Sample Ads (LIVE DATA) ------------------------------------ */}
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

      {/* -- 12. Top Markets by Saturation (LIVE DATA) --------------------- */}
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

      {/* -- 13. SERP Visibility (LIVE DATA) ------------------------------- */}
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

      {/* -- 14. Sources & Methodology ------------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Sources &amp; Methodology
          </h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            "GLP-1 Newsroom State-by-State GLP-1 Prescription Data (2024)",
            "CDC BRFSS Adult Obesity Prevalence Maps (2024)",
            "CDC National Diabetes Statistics Report / BRFSS (2021)",
            "FDA FAERS Adverse Event Reports",
            "JAMA (2023) \u2014 GLP-1 and gastroparesis risk",
            "Mayo Clinic (2024) \u2014 GLP-1 and gastroparesis increase",
            "Harvard/JAMA (2024) \u2014 GLP-1 and NAION risk",
            "KFF Medicare GLP-1 Spending Report (2024)",
            "JPML MDL Statistics",
            "PMC Pharmacovigilance Studies (tirzepatide FAERS analysis)",
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

      {/* -- 15. Footer / Disclaimer --------------------------------------- */}
      <div className="rounded-lg border border-cloud bg-cloud/40 p-5">
        <p className="text-xs leading-relaxed text-slate-gray">
          This page is refreshed monthly. Content reflects research and publicly
          available data as of the date shown. Settlement projections are attorney
          estimates and industry benchmarks &mdash; not guarantees. This page does not
          constitute legal advice.
        </p>
        <p className="mt-3 text-[11px] text-slate-gray/80">
          Data sources: GLP-1 Newsroom (2024), CDC BRFSS (2024/2021), FDA FAERS,
          JAMA (2023), Mayo Clinic (2024), Harvard/JAMA (2024), KFF (2024), JPML,
          PMC Pharmacovigilance Studies.
        </p>
      </div>
    </div>
  );
}
