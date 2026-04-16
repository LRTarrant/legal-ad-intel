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
} from "lucide-react";
import { AskAIPanel } from "../../../components/ask-ai-panel";
import {
  getSegmentSummary,
  getTopAdvertisersBySegment,
  getAdvertiserPlatforms,
  getAdSaturationWindowed,
  getTortCostBenchmarks,
  getSerpVisibilityWindowed,
  getSerpTopResults,
  getSampleAds,
  extractDomain,
} from "@/lib/queries";
import { CostBenchmarkScorecard } from "../../../components/cost-benchmark-scorecard";

export const dynamic = "force-dynamic";

/* ── Metadata ──────────────────────────────────────────────────────────── */

export function generateMetadata() {
  return {
    title:
      "Depo-Provera (Meningioma) Tort Intelligence | Legal Marketing Intelligence",
    description:
      "Comprehensive advertising intelligence brief for Depo-Provera meningioma litigation — case data, qualification criteria, settlement projections, and geographic targeting.",
  };
}

/* ── Static Data ───────────────────────────────────────────────────────── */

const DEPO_TORT_CONTEXT = {
  tortName: "Depo-Provera (Meningioma)",
  injury: "Meningioma — brain tumor in the meninges (tissue lining the brain/spinal cord)",
  mdlNumber: "MDL 3140, N.D. Florida, Judge M. Casey Rodgers",
  pendingCases: "3,490+ (April 2026), 3,873% increase from March 2025 to March 2026",
  settlementRange: "$100K–$1.5M depending on severity tier. Tier 1 (Severe): $500K–$1.5M+, Tier 2 (Moderate): $250K–$500K, Tier 3 (Lower): $100K–$250K, Tier 4 (Minimal): $25K–$100K",
  estimatedCPA: "$2,500–$4,500. Comparable torts: Tylenol ~$2,550, PFAS ~$3,000, NEC ~$4,000, Hair Relaxer ~$4,500, Paraquat ~$9,950",
  bellwetherDate: "December 2026 (first bellwether trial). Settlement negotiations could begin 2027, first payments late 2027–2028.",
  caseSummary: "Depo-Provera (DMPA) is a Pfizer-manufactured injectable contraceptive. Thousands of women allege prolonged use caused meningioma brain tumors. MDL 3140 consolidated in N.D. Florida. Pfizer's central defense is federal preemption, but the FDA's December 2025 label change adding a meningioma warning undercuts this defense. Key studies: López-González (BMJ, 2024) 5.5x risk, Griffin (2024) 1.53x odds, Xiao (JAMA Neurology, 2025) 2.43x risk.",
  qualification: "Product: Depo-Provera, Depo-SubQ Provera 104, or authorized generic. Minimum 2 injections or 12 months use. Diagnosed with meningioma after initiating use. Use window 1992–present. Not currently represented. Statute of limitations 2–3 years from diagnosis. Three screening tiers: Tier 1 Basic (2–3 questions, lowest CPL), Tier 2 Qualified (4–6 steps, mid CPL), Tier 3 Retainer-Ready (10–15 steps, highest CPA but lowest fallout).",
  advertisingLandscape: "Stage: Early-to-mid (2–3). ~96 active Meta ads from ~34 advertisers. ~45 Google Ads from ~22 advertisers. ~18 TikTok ads from ~8 advertisers. Primary channels: Meta lead forms, Google Search/LSAs, legal lead gen networks. Top advertisers: TorHoerman Law (21 ads, ~$85K/mo), Morgan & Morgan (18 ads, ~$120K/mo), Lawsuit Legal News (17 ads, ~$55K/mo), Ben Crump Law (12 ads, ~$70K/mo). Platform risk: Meta removed law firm ads for social media addiction lawsuits in April 2026.",
  targetingInsights: "41.2% of Black women have ever used Depo-Provera vs 20.3% White. Higher use among women without HS diploma (39.9%), rural women (29.4%). Top prescribing states (Medicaid, per 10K): RI (376), MS (309), MD (303), LA (291), SC (280), NM (268), OH (265), IA (253). High-value crossover states (high DMPA + high Black pop): MS, MD, LA, SC, OH, PA, TN, VA, NC, MI. Key DMAs: Baltimore, New Orleans, Columbia SC, Cleveland/Columbus, Jackson MS, Memphis, Philadelphia, Detroit. 424K+ Medicaid DMPA prescriptions in 2023.",
};

const SCIENTIFIC_STUDIES = [
  {
    study: "López-González et al. (French national case-control)",
    year: "2024",
    source: "BMJ",
    finding:
      "5.5x higher odds of meningioma with 1+ year use",
  },
  {
    study: "Griffin et al. (U.S. insurance database)",
    year: "2024",
    source: "Medical journal",
    finding:
      "1.53x higher odds (OR 1.53, CI 1.40–1.67). 117,503 cases analyzed",
  },
  {
    study: "Xiao et al. (U.S. cohort, TriNetX)",
    year: "2025",
    source: "JAMA Neurology",
    finding:
      "2.43x relative risk (CI 1.77–3.33). Highest for 4+ years use. NNH of 1,152",
  },
  {
    study: "Roland et al. (European case-control)",
    year: "2022–2023",
    source: "French study",
    finding:
      "5.5x higher odds among injectable users (small sample)",
  },
];

const QUALIFICATION_CRITERIA = [
  {
    criterion: "Product",
    standard: "Depo-Provera, Depo-SubQ Provera 104, or authorized generic",
    notes: "Unauthorized generics and oral MPA do not qualify",
  },
  {
    criterion: "Minimum Exposure",
    standard: "At least 2 injections or 12 months of use",
    notes: "Some screen at 6+ months; most firms require 12 months",
  },
  {
    criterion: "Diagnosis",
    standard: "Meningioma (intracranial or spinal)",
    notes: "Some forms accept other brain tumors; meningioma is primary",
  },
  {
    criterion: "Diagnosis Timing",
    standard: "After initiating Depo-Provera use",
    notes: "Most accepted within 5–15 years of first use",
  },
  {
    criterion: "Use Window",
    standard: "1992–present",
    notes: "Pre-1992 use before FDA approval",
  },
  {
    criterion: "Existing Representation",
    standard: "Not currently represented",
    notes: "Standard disqualifier",
  },
  {
    criterion: "Statute of Limitations",
    standard: "2–3 years from diagnosis (varies by state)",
    notes: "Filing deadlines are a real constraint",
  },
];

const SCREENING_QUESTIONS = [
  "Who is the claimant? (You or loved one)",
  "Which product? (Depo-Provera / SubQ / generic)",
  "How many injections? (Minimum 2)",
  "Duration of use? (6 months to 1+ year)",
  "When did you start/stop?",
  "Diagnosed with brain tumor? (Meningioma specifically)",
  "When diagnosed?",
  "Treatment received? (Surgery, radiation, etc.)",
  "Symptoms? (Headaches, seizures, vision, etc.)",
  "Already have an attorney?",
];

const DISQUALIFIERS = [
  "Never used Depo-Provera",
  "Only 1 injection / less than 6 months",
  "No brain tumor diagnosis",
  "Brain tumor existed before Depo use",
  "Already represented",
  "Use prior to 1992",
];

const LITIGATION_TIMELINE = [
  { date: "1992", event: "FDA approves Depo-Provera for U.S. contraceptive use", short: "FDA Approves Depo-Provera" },
  { date: "March 2024", event: "BMJ publishes French study — 5.5x meningioma risk", short: "BMJ Study: 5.5x Risk" },
  { date: "October 2024", event: "First Depo-Provera meningioma lawsuit filed", short: "First Lawsuit Filed" },
  { date: "December 2024", event: "Motion filed with JPML to consolidate into MDL", short: "MDL Consolidation Motion" },
  { date: "February 2025", event: "MDL No. 3140 established in N.D. Florida; Judge Rodgers assigned", short: "MDL 3140 Established" },
  { date: "April 2025", event: "Proof of Use/Injury Questionnaire deadline set", short: "Questionnaire Deadline" },
  { date: "June 2025", event: "Third-party review of MDL complaints begins", short: "Complaint Review Begins" },
  { date: "September 2025", event: "Pfizer files summary judgment motion (preemption); JAMA Neurology study published", short: "Pfizer SJ Motion Filed" },
  { date: "October 2025", event: "1,346 cases in MDL; 439+ in state courts", short: "1,346 Cases in MDL" },
  { date: "December 2025", event: "FDA adds meningioma warning to Depo-Provera label", short: "FDA Label Warning Added" },
  { date: "February 2026", event: "2,100+ cases; court orders supplemental briefing on preemption", short: "2,100+ Cases Filed" },
  { date: "March 2026", event: "3,099 cases — 47.7% jump in one month", short: "3,099 Cases — 47.7% Jump" },
  { date: "April 2026", event: "MDL leadership reappointed; 3,490+ cases pending", short: "3,490+ Cases Pending" },
  { date: "Spring 2026", event: "Expert witness challenges (Daubert) expected", short: "Daubert Challenges", future: true },
  { date: "December 2026", event: "First bellwether trial scheduled", short: "Bellwether Trial", future: true },
  { date: "2027 (projected)", event: "Settlement negotiations could begin; first payments late 2027–2028", short: "Settlement Negotiations", future: true },
];

const SETTLEMENT_TIERS = [
  {
    tier: "Tier 1: Severe",
    severity: "High",
    range: "$500K – $1.5M+",
    factors:
      "WHO Grade II/III, craniotomy/multiple surgeries, radiation, permanent neuro damage, disability, lost earning capacity",
  },
  {
    tier: "Tier 2: Moderate",
    severity: "Moderate",
    range: "$250K – $500K",
    factors:
      "Symptomatic Grade I requiring surgery, partial recovery with residual effects, ongoing monitoring",
  },
  {
    tier: "Tier 3: Lower",
    severity: "Mild",
    range: "$100K – $250K",
    factors:
      "Small non-surgical Grade I, incidental finding, watch-and-wait, minimal symptoms",
  },
  {
    tier: "Tier 4: Minimal",
    severity: "Lowest",
    range: "$25K – $100K",
    factors:
      "Suspected/unconfirmed diagnosis, limited documentation",
  },
];

/* AD_METRICS removed — now sourced from Supabase live queries */

const COMPARATIVE_CPA = [
  { tort: "Depo-Provera", stage: "Early-mid", cpa: "~$2,500–$4,500", settlement: "TBD ($100K–$1.5M)", highlight: true },
  { tort: "Tylenol", stage: "Early", cpa: "~$2,550", settlement: "$60–90K" },
  { tort: "PFAS (AFFF)", stage: "Mid-late", cpa: "~$3,000", settlement: "$75–175K" },
  { tort: "NEC Formula", stage: "Mid", cpa: "~$4,000", settlement: "$100–300K" },
  { tort: "Hair Relaxer", stage: "Early", cpa: "~$4,500", settlement: "$75–125K" },
  { tort: "Paraquat", stage: "Mid-late", cpa: "~$9,950", settlement: "$105–250K" },
];

const DEMOGRAPHIC_PROFILE = [
  { demographic: "Overall", value: "24.5%" },
  { demographic: "Black women", value: "41.2%" },
  { demographic: "Hispanic women", value: "27.2%" },
  { demographic: "White women", value: "20.3%" },
  { demographic: "Asian women", value: "7.1%" },
  { demographic: "No HS diploma", value: "39.9%" },
  { demographic: "HS diploma/GED", value: "33.7%" },
  { demographic: "Some college", value: "29.2%" },
  { demographic: "Bachelor's+", value: "12.7%" },
  { demographic: "Rural", value: "29.4%" },
  { demographic: "Urban", value: "23.5%" },
];

const STATE_PRESCRIBING = [
  { rank: 1, state: "Rhode Island", totalRx: "4,138", rate: 376, blackPop: "8.5%", signal: "HIGH" as const },
  { rank: 2, state: "Mississippi", totalRx: "9,873", rate: 309, blackPop: "38.0%", signal: "HIGH" as const },
  { rank: 3, state: "Maryland", totalRx: "19,676", rate: 303, blackPop: "31.1%", signal: "HIGH" as const },
  { rank: 4, state: "Louisiana", totalRx: "14,822", rate: 291, blackPop: "33.1%", signal: "HIGH" as const },
  { rank: 5, state: "South Carolina", totalRx: "15,109", rate: 280, blackPop: "27.0%", signal: "HIGH" as const },
  { rank: 6, state: "New Mexico", totalRx: "5,637", rate: 268, blackPop: "2.6%", signal: "HIGH" as const },
  { rank: 7, state: "Ohio", totalRx: "31,814", rate: 265, blackPop: "13.1%", signal: "HIGH" as const },
  { rank: 8, state: "Iowa", totalRx: "8,087", rate: 253, blackPop: "4.1%", signal: "HIGH" as const },
  { rank: 9, state: "Oklahoma", totalRx: "9,638", rate: 235, blackPop: "7.8%", signal: "MED-HI" as const },
  { rank: 10, state: "Vermont", totalRx: "1,139", rate: 207, blackPop: "1.4%", signal: "MED-HI" as const },
  { rank: 11, state: "West Virginia", totalRx: "3,396", rate: 200, blackPop: "3.6%", signal: "MED-HI" as const },
  { rank: 12, state: "Montana", totalRx: "1,774", rate: 177, blackPop: "0.6%", signal: "MED-HI" as const },
  { rank: 13, state: "Pennsylvania", totalRx: "21,632", rate: 166, blackPop: "12.0%", signal: "MED-HI" as const },
  { rank: 14, state: "Oregon", totalRx: "6,462", rate: 154, blackPop: "2.2%", signal: "MED-HI" as const },
  { rank: 15, state: "Tennessee", totalRx: "11,053", rate: 154, blackPop: "17.1%", signal: "MED-HI" as const },
  { rank: 16, state: "Kentucky", totalRx: "7,180", rate: 153, blackPop: "8.6%", signal: "MED-HI" as const },
  { rank: 17, state: "Virginia", totalRx: "13,497", rate: 150, blackPop: "20.0%", signal: "MED" as const },
  { rank: 18, state: "Colorado", totalRx: "9,160", rate: 148, blackPop: "4.6%", signal: "MED" as const },
  { rank: 19, state: "Arizona", totalRx: "11,121", rate: 144, blackPop: "5.2%", signal: "MED" as const },
  { rank: 20, state: "Delaware", totalRx: "1,424", rate: 142, blackPop: "23.2%", signal: "MED" as const },
];

const CROSSOVER_STATES = [
  { state: "Mississippi", rate: 309, blackPop: "38.0%", totalRx: "9,873", dmas: "Jackson" },
  { state: "Maryland", rate: 303, blackPop: "31.1%", totalRx: "19,676", dmas: "Baltimore, DC suburbs" },
  { state: "Louisiana", rate: 291, blackPop: "33.1%", totalRx: "14,822", dmas: "New Orleans, Baton Rouge" },
  { state: "South Carolina", rate: 280, blackPop: "27.0%", totalRx: "15,109", dmas: "Columbia, Charleston" },
  { state: "Ohio", rate: 265, blackPop: "13.1%", totalRx: "31,814", dmas: "Cleveland, Columbus, Cincinnati" },
  { state: "Pennsylvania", rate: 166, blackPop: "12.0%", totalRx: "21,632", dmas: "Philadelphia, Pittsburgh" },
  { state: "Tennessee", rate: 154, blackPop: "17.1%", totalRx: "11,053", dmas: "Memphis, Nashville" },
  { state: "Virginia", rate: 150, blackPop: "20.0%", totalRx: "13,497", dmas: "Norfolk, Richmond" },
  { state: "North Carolina", rate: 130, blackPop: "22.2%", totalRx: "14,251", dmas: "Charlotte, Raleigh" },
  { state: "Michigan", rate: 132, blackPop: "14.1%", totalRx: "13,151", dmas: "Detroit, Grand Rapids" },
];

const TRACKED_KEYWORDS = [
  { keyword: "depo provera lawsuit", volume: "49,500", difficulty: "High" as const, cpc: "$42.80" },
  { keyword: "depo provera meningioma", volume: "22,200", difficulty: "High" as const, cpc: "$38.50" },
  { keyword: "depo provera brain tumor", volume: "14,800", difficulty: "Medium" as const, cpc: "$35.20" },
  { keyword: "depo provera lawyer", volume: "8,100", difficulty: "High" as const, cpc: "$52.00" },
  { keyword: "depo provera settlement", volume: "6,600", difficulty: "Medium" as const, cpc: "$28.40" },
  { keyword: "depo shot lawsuit", volume: "4,400", difficulty: "Medium" as const, cpc: "$31.00" },
];

/* PAID_AD_DATA, SAMPLE_ADS, TOP_FIRMS removed — now sourced from Supabase live queries */

/* ── Helpers ────────────────────────────────────────────────────────────── */

function SignalBadge({ signal }: { signal: "HIGH" | "MED-HI" | "MED" }) {
  const styles = {
    HIGH: "bg-red-50 text-alert border-alert/20",
    "MED-HI": "bg-amber-50 text-warning border-warning/20",
    MED: "bg-slate-50 text-slate-gray border-slate-gray/20",
  };
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles[signal]}`}
    >
      {signal}
    </span>
  );
}

/* ── Format Helpers (from dynamic page) ─────────────────────────────── */

function fmtCur(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtNum(n: number | null): string {
  if (n == null) return "—";
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

/* ── Page ───────────────────────────────────────────────────────────────── */

const TORT_SLUG = "depo_provera";

export default async function DepoProveraPage() {
  /* ── Live data fetch from Supabase ─────────────────────────────────── */
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

  // Build platform lookup by advertiser
  const platformMap = new Map<string, string[]>();
  for (const p of platforms) {
    if (p.advertiser_name) {
      platformMap.set(p.advertiser_name, p.platforms);
    }
  }

  // Aggregate stats
  const totalAdvertisers = segments.reduce((s, r) => s + r.advertiser_count, 0);
  const totalSpend = segments.reduce((s, r) => s + r.total_spend, 0);
  const totalCreatives = segments.reduce((s, r) => s + r.total_creatives, 0);

  // All unique platforms
  const allPlatforms = new Set<string>();
  for (const p of platforms) {
    for (const plat of p.platforms) allPlatforms.add(plat);
  }

  // Get saturation markets (top by saturation score)
  const topMarkets = [...saturation]
    .sort((a, b) => (b.saturation_score ?? 0) - (a.saturation_score ?? 0))
    .slice(0, 10);

  // Fuzzy-match benchmark
  const tortLabel = "Depo-Provera";
  const tortLabelLower = tortLabel.toLowerCase();
  const tortLabelWords = tortLabelLower.split(/[\s\/,]+/).filter(Boolean);
  const benchmark = benchmarks
    .sort((a, b) => b.observed_date.localeCompare(a.observed_date))
    .find((b) => {
      const bName = b.tort_name.toLowerCase();
      if (bName === tortLabelLower) return true;
      if (bName.includes(tortLabelLower) || tortLabelLower.includes(bName)) return true;
      return tortLabelWords.some((w) => w.length > 3 && bName.includes(w));
    }) ?? null;

  const hasLiveData = totalAdvertisers > 0 || totalSpend > 0 || totalCreatives > 0;

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
            Depo-Provera
          </h1>
          <span className="rounded-full bg-emerald-50 border border-success/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-success">
            Active Litigation
          </span>
        </div>
        <p className="mt-1 text-lg text-slate-gray">
          Meningioma (Brain Tumor)
        </p>
        <p className="mt-0.5 text-xs text-slate-gray">
          Last Updated: April 16, 2026
        </p>
      </div>

      {/* ── 2. Key Stats Row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Scale className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Pending Cases
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">3,490+</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">MDL 3140</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <DollarSign className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Settlement Range
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">$100K – $1.5M</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Projected</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Estimated CPA
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">~$2,500 – $4,500</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Bellwether Trial
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">Dec 2026</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">First scheduled</p>
        </div>
      </div>

      {/* ── 3. Case Summary ─────────────────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-4">
          Case Summary
        </h2>
        <div className="space-y-4 text-sm leading-relaxed text-midnight-navy/80">
          <p>
            Depo-Provera (depot medroxyprogesterone acetate, or DMPA) is a
            Pfizer-manufactured injectable contraceptive administered every three
            months, FDA-approved in the United States since 1992. Thousands of
            women are alleging that prolonged use caused them to develop
            meningioma — a tumor of the tissue lining the brain and spinal cord —
            and that Pfizer knew or should have known about this risk for decades
            but failed to update the U.S. warning label.
          </p>
          <p>
            The litigation is consolidated as MDL No. 3140 in the U.S. District
            Court for the Northern District of Florida under Judge M. Casey
            Rodgers. As of April 2026, more than 3,490 cases are pending in the
            MDL, with additional filings in state courts across Delaware, New
            York, California, Illinois, and Pennsylvania. Case volume has grown
            dramatically — a 3,873% increase from March 2025 to March 2026.
          </p>
          <p>
            Pfizer&apos;s central defense is federal preemption: the argument that
            the FDA previously rejected a stronger warning label, so state-level
            failure-to-warn claims should be blocked. In December 2025, the FDA
            approved a label change adding a meningioma warning — a pivotal
            development that undercuts this defense.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Defendants
            </p>
            <p className="text-sm text-midnight-navy">
              Pfizer Inc., Greenstone LLC, Pharmacia &amp; Upjohn Company LLC,
              A-S Medication Solutions, Prasco Laboratories, Preferred
              Pharmaceuticals Inc.
            </p>
          </div>
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Legal Theories
            </p>
            <p className="text-sm text-midnight-navy">
              Failure to warn, negligent design, negligence, fraudulent
              concealment, breach of implied warranty of safety.
            </p>
          </div>
        </div>
      </div>

      {/* ── 4. Harm / Injury ────────────────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4.5 h-4.5 text-alert" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Harm / Injury
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-midnight-navy/80 mb-4">
          The core injury is meningioma — a tumor forming in the meninges (tissue
          surrounding the brain and spinal cord). ~90% intracranial, ~10% spinal.
          While most are classified as benign (WHO Grade I), they can cause
          serious neurological complications requiring craniotomy.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
              Symptoms &amp; Complications
            </p>
            <ul className="space-y-1.5">
              {[
                "Chronic headaches and migraines",
                "Seizures",
                "Vision problems (blurred vision, partial vision loss)",
                "Hearing loss",
                "Memory loss and cognitive impairment",
                "Trouble speaking",
                "Weakness in arms or legs",
                "Permanent neurological damage or disability",
              ].map((s) => (
                <li
                  key={s}
                  className="flex items-start gap-2 text-sm text-midnight-navy/80"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-alert/60" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
              Treatment
            </p>
            <p className="text-sm leading-relaxed text-midnight-navy/80">
              Brain surgery (craniotomy/tumor excision), radiation therapy,
              chemotherapy, hospitalization, long-term &quot;watch and wait&quot;
              surveillance with serial MRI.
            </p>
            <div className="mt-4 rounded-md border border-alert/20 bg-red-50 px-4 py-3">
              <p className="text-xs font-semibold text-alert">FDA Label Update</p>
              <p className="mt-1 text-sm text-midnight-navy/80">
                The FDA&apos;s updated label now instructs providers to
                discontinue Depo-Provera immediately if a meningioma is
                diagnosed.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Scientific Evidence ──────────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Scientific Evidence
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Study
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  Year
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  Source
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Finding
                </th>
              </tr>
            </thead>
            <tbody>
              {SCIENTIFIC_STUDIES.map((s) => (
                <tr
                  key={s.study}
                  className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                >
                  <td className="py-3 pr-4 font-medium text-midnight-navy">
                    {s.study}
                  </td>
                  <td className="py-3 px-3 text-center text-midnight-navy">
                    {s.year}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-block rounded-full bg-intelligence-teal/10 px-2 py-0.5 text-xs font-medium text-intelligence-teal">
                      {s.source}
                    </span>
                  </td>
                  <td className="py-3 pl-3 text-midnight-navy/80">
                    {s.finding}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 rounded-md bg-cloud/60 px-4 py-3">
          <p className="text-sm text-midnight-navy/80">
            <span className="font-semibold text-midnight-navy">Key point:</span>{" "}
            Multiple independent studies consistently show elevated risk. Other
            contraceptives (IUDs, oral pills, etc.) show NO increased risk —
            strengthening the DMPA-specific association.
          </p>
        </div>
      </div>

      {/* ── 6. Qualification Criteria ───────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Qualification Criteria
          </h2>
        </div>

        {/* Core Criteria Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Criterion
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Standard
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Notes
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
                  <td className="py-3 px-3 text-midnight-navy/80">
                    {c.standard}
                  </td>
                  <td className="py-3 pl-3 text-midnight-navy/60 text-xs">
                    {c.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Screening Tiers */}
        <h3 className="mt-6 mb-3 text-sm font-semibold text-midnight-navy">
          Screening Depth Tiers
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              label: "Tier 1: Basic Lead",
              cpl: "Lowest CPL",
              color: "border-success/30 bg-emerald-50",
              tagColor: "bg-success/10 text-success",
              details:
                "2–3 yes/no questions + contact info. Cheapest but highest rejection at intake.",
            },
            {
              label: "Tier 2: Qualified Lead",
              cpl: "Mid-Range CPL",
              color: "border-warning/30 bg-amber-50",
              tagColor: "bg-warning/10 text-warning",
              details:
                "4–6 step form. Confirmed 12+ months use, meningioma, diagnosis year, attorney check. Better conversion.",
            },
            {
              label: "Tier 3: Retainer-Ready",
              cpl: "Highest CPA",
              color: "border-alert/30 bg-red-50",
              tagColor: "bg-alert/10 text-alert",
              details:
                "10–15 step deep intake. Product ID, injection dates/count, tumor type, treatment, symptoms, narrative. Most expensive but lowest fallout.",
            },
          ].map((tier) => (
            <div
              key={tier.label}
              className={`rounded-lg border p-4 ${tier.color}`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-midnight-navy">
                  {tier.label}
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tier.tagColor}`}
                >
                  {tier.cpl}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-midnight-navy/70">
                {tier.details}
              </p>
            </div>
          ))}
        </div>

        {/* Common Screening Questions */}
        <h3 className="mt-6 mb-3 text-sm font-semibold text-midnight-navy">
          Common Screening Questions
        </h3>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {SCREENING_QUESTIONS.map((q, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-md bg-cloud/60 px-3 py-2"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-intelligence-teal/10 text-[10px] font-bold text-intelligence-teal">
                {i + 1}
              </span>
              <p className="text-xs text-midnight-navy/80">{q}</p>
            </div>
          ))}
        </div>

        {/* Disqualifiers */}
        <h3 className="mt-6 mb-3 text-sm font-semibold text-midnight-navy">
          Disqualifiers
        </h3>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {DISQUALIFIERS.map((d) => (
            <div
              key={d}
              className="flex items-center gap-2 rounded-md bg-red-50/60 px-3 py-2"
            >
              <XCircle className="w-3.5 h-3.5 shrink-0 text-alert/70" />
              <p className="text-xs text-midnight-navy/80">{d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 7. Litigation Timeline ──────────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Litigation Timeline
          </h2>
        </div>
        <div className="overflow-x-auto pb-2">
          <div className="relative flex items-start" style={{ minWidth: `${LITIGATION_TIMELINE.length * 140}px` }}>
            {/* Connecting line */}
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
                    e.future
                      ? "italic text-slate-gray"
                      : "text-midnight-navy/80"
                  }`}
                >
                  {e.short}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 8. Settlement Projections ───────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Settlement Projections
          </h2>
        </div>
        <p className="mb-4 text-xs text-slate-gray">
          No settlements reached yet. Projections based on attorney estimates and
          comparable mass tort outcomes. Average jury verdict in prior meningioma
          cases ~$3M; settlements ~$868K. Mass tort economics will bring
          individual Depo settlements lower.
        </p>

        {/* Settlement Tiers */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Tier
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  Severity
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  Range
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Qualifying Factors
                </th>
              </tr>
            </thead>
            <tbody>
              {SETTLEMENT_TIERS.map((t) => (
                <tr
                  key={t.tier}
                  className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                >
                  <td className="py-3 pr-4 font-medium text-midnight-navy whitespace-nowrap">
                    {t.tier}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        t.severity === "High"
                          ? "bg-red-50 text-alert"
                          : t.severity === "Moderate"
                          ? "bg-amber-50 text-warning"
                          : t.severity === "Mild"
                          ? "bg-emerald-50 text-success"
                          : "bg-slate-50 text-slate-gray"
                      }`}
                    >
                      {t.severity}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-midnight-navy whitespace-nowrap">
                    {t.range}
                  </td>
                  <td className="py-3 pl-3 text-midnight-navy/70 text-xs">
                    {t.factors}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Factors */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-emerald-50/60 px-4 py-3">
            <p className="text-xs font-semibold text-success mb-1.5">
              Factors Increasing Value
            </p>
            <ul className="space-y-1">
              {[
                "6+ years use",
                "Multiple meningiomas",
                "Younger age",
                "Complex tumor location",
                "WHO Grade II/III",
                "Permanent impairment",
              ].map((f) => (
                <li key={f} className="flex items-center gap-1.5 text-xs text-midnight-navy/70">
                  <TrendingUp className="w-3 h-3 shrink-0 text-success" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-md bg-red-50/60 px-4 py-3">
            <p className="text-xs font-semibold text-alert mb-1.5">
              Factors Decreasing Value
            </p>
            <ul className="space-y-1">
              {[
                "Short duration",
                "Incidental finding",
                "No surgery",
                "Pre-existing risk factors",
                "Weak documentation",
              ].map((f) => (
                <li key={f} className="flex items-center gap-1.5 text-xs text-midnight-navy/70">
                  <XCircle className="w-3 h-3 shrink-0 text-alert" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Timeline to Payout */}
        <div className="mt-4 rounded-md bg-cloud/60 px-4 py-3">
          <p className="text-xs font-semibold text-midnight-navy mb-2">
            Timeline to Payout
          </p>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-midnight-navy/70">
            <span className="rounded bg-intelligence-teal/10 px-2 py-1 font-medium text-intelligence-teal">
              Bellwether Dec 2026
            </span>
            <ChevronRight className="w-3 h-3 text-slate-gray" />
            <span className="rounded bg-intelligence-teal/10 px-2 py-1 font-medium text-intelligence-teal">
              Settlement Framework Spring 2027
            </span>
            <ChevronRight className="w-3 h-3 text-slate-gray" />
            <span className="rounded bg-intelligence-teal/10 px-2 py-1 font-medium text-intelligence-teal">
              Claims Admin Summer 2027
            </span>
            <ChevronRight className="w-3 h-3 text-slate-gray" />
            <span className="rounded bg-intelligence-teal/10 px-2 py-1 font-medium text-intelligence-teal">
              First Payments Late 2027–2028
            </span>
          </div>
        </div>
      </div>

      {/* ── 9. Advertising Landscape (LIVE DATA) ──────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Advertising Landscape
          </h2>
          {hasLiveData && (
            <span className="rounded-full bg-emerald-50 border border-success/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success flex items-center gap-1">
              <Database className="w-3 h-3" /> Live Data
            </span>
          )}
        </div>

        {hasLiveData ? (
          <>
            {/* Live Summary Stats */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-6">
              <div className="rounded-lg bg-cloud/60 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Users className="w-3.5 h-3.5 text-intelligence-teal" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
                    Advertisers
                  </p>
                </div>
                <p className="text-2xl font-bold text-midnight-navy">{fmtNum(totalAdvertisers)}</p>
              </div>
              <div className="rounded-lg bg-cloud/60 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <DollarSign className="w-3.5 h-3.5 text-intelligence-teal" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
                    Est. Spend
                  </p>
                </div>
                <p className="text-2xl font-bold text-midnight-navy">{fmtCur(totalSpend)}</p>
              </div>
              <div className="rounded-lg bg-cloud/60 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Eye className="w-3.5 h-3.5 text-intelligence-teal" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
                    Unique Creatives
                  </p>
                </div>
                <p className="text-2xl font-bold text-midnight-navy">{fmtNum(totalCreatives)}</p>
              </div>
              <div className="rounded-lg bg-cloud/60 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Monitor className="w-3.5 h-3.5 text-intelligence-teal" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
                    Platforms
                  </p>
                </div>
                <p className="text-2xl font-bold text-midnight-navy">{allPlatforms.size}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {Array.from(allPlatforms).sort().map((p) => (
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

            {/* Live Segment Breakdown */}
            {segments.length > 0 && (
              <>
                <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
                  Advertiser Segments
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-6">
                  {segments.map((seg) => {
                    const meta = segMeta(seg.segment);
                    const spendPct = totalSpend > 0 ? (seg.total_spend / totalSpend) * 100 : 0;
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

        {/* Channel Breakdown (editorial) */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Channel Breakdown
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 mb-6">
          {[
            {
              channel: "Meta (Facebook/Instagram)",
              detail: "Dominant channel, quiz-style lead forms",
              color: "border-blue-500/30 bg-blue-50",
            },
            {
              channel: "Google Ads/LSAs",
              detail: "High-intent search queries, pay-per-lead pricing",
              color: "border-emerald-500/30 bg-emerald-50",
            },
            {
              channel: "Legal Lead Gen Networks",
              detail:
                "Per-lead or per-retainer pricing through legal lead generation networks",
              color: "border-purple-500/30 bg-purple-50",
            },
            {
              channel: "TV",
              detail: "Less prevalent, may increase as litigation matures",
              color: "border-indigo-500/30 bg-indigo-50",
            },
          ].map((ch) => (
            <div
              key={ch.channel}
              className={`rounded-lg border p-3 ${ch.color}`}
            >
              <p className="text-sm font-semibold text-midnight-navy">
                {ch.channel}
              </p>
              <p className="mt-1 text-xs text-midnight-navy/70">{ch.detail}</p>
            </div>
          ))}
        </div>

        {/* Comparative CPA (editorial) */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Comparative CPA
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Tort
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  Stage
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  CPA
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  Settlement Range
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARATIVE_CPA.map((c) => (
                <tr
                  key={c.tort}
                  className={`border-b border-cloud/50 transition-colors ${
                    c.highlight
                      ? "bg-intelligence-teal/5 font-semibold"
                      : "hover:bg-cloud/40"
                  }`}
                >
                  <td className="py-3 pr-4 font-medium text-midnight-navy">
                    {c.tort}
                  </td>
                  <td className="py-3 px-3 text-center text-midnight-navy/80">
                    {c.stage}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-midnight-navy">
                    {c.cpa}
                  </td>
                  <td className="py-3 pl-3 text-right font-mono text-midnight-navy/80">
                    {c.settlement}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Meta Warning (editorial) */}
        <div className="mt-4 rounded-md border border-warning/20 bg-amber-50 px-4 py-3">
          <p className="text-xs text-midnight-navy/80">
            <span className="font-semibold text-warning">Platform Risk:</span>{" "}
            Meta recently removed law firm ads recruiting plaintiffs for social
            media addiction lawsuits (April 2026). Has not affected Depo-Provera,
            but signals platform risk for firms reliant on Meta.
          </p>
        </div>
      </div>

      {/* ── 9b. Cost Benchmark Scorecard (LIVE DATA) ───────────────────── */}
      <CostBenchmarkScorecard data={benchmark} />

      {/* ── 10. Organic Search Landscape ──────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Organic Search Landscape
          </h2>
        </div>
        <p className="mb-4 text-xs text-slate-gray">
          Top organic search results for Depo-Provera litigation keywords. Understanding who ranks helps assess content competition and SEO opportunity.
        </p>

        {/* Tracked Keywords Table */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Tracked Keywords
        </h3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Keyword
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  Monthly Volume
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  Difficulty
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  Est. CPC
                </th>
              </tr>
            </thead>
            <tbody>
              {TRACKED_KEYWORDS.map((k) => (
                <tr
                  key={k.keyword}
                  className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                >
                  <td className="py-3 pr-4 font-medium text-midnight-navy">
                    {k.keyword}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-midnight-navy/80">
                    {k.volume}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        k.difficulty === "High"
                          ? "bg-red-50 text-alert border-alert/20"
                          : k.difficulty === "Medium"
                          ? "bg-amber-50 text-warning border-warning/20"
                          : "bg-emerald-50 text-success border-success/20"
                      }`}
                    >
                      {k.difficulty}
                    </span>
                  </td>
                  <td className="py-3 pl-3 text-right font-mono text-midnight-navy">
                    {k.cpc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SERP Visibility Rankings (LIVE DATA) */}
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-midnight-navy">
            SERP Visibility Rankings
          </h3>
          {serpVisibility.length > 0 && (
            <span className="rounded-full bg-emerald-50 border border-success/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success flex items-center gap-1">
              <Database className="w-3 h-3" /> Live Data
            </span>
          )}
        </div>
        {serpVisibility.length > 0 ? (
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cloud">
                  <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                    Domain
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                    Visibility Score
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                    Avg Position
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                    Organic
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                    Paid
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                    Top 3
                  </th>
                  <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                    Top 10
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...serpVisibility]
                  .sort((a, b) => b.visibility_score - a.visibility_score)
                  .slice(0, 15)
                  .map((row) => (
                    <tr
                      key={row.domain}
                      className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium text-midnight-navy">
                        {row.domain}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-midnight-navy">
                        {row.visibility_score.toFixed(1)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-midnight-navy/80">
                        {row.avg_position != null ? row.avg_position.toFixed(1) : "—"}
                      </td>
                      <td className="py-3 px-3 text-right text-midnight-navy/80">
                        {row.organic_appearances}
                      </td>
                      <td className="py-3 px-3 text-right text-midnight-navy/80">
                        {row.paid_appearances}
                      </td>
                      <td className="py-3 px-3 text-right text-midnight-navy/80">
                        {row.top_3_count}
                      </td>
                      <td className="py-3 pl-3 text-right text-midnight-navy/80">
                        {row.top_10_count}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center mb-6">
            <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
            <p className="text-sm font-medium text-midnight-navy/60">
              SERP visibility data collection in progress
            </p>
            <p className="mt-1 text-xs text-slate-gray">
              Visibility rankings will appear here once SERP data is collected.
            </p>
          </div>
        )}

        {/* SERP Preview Cards (LIVE DATA) */}
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-midnight-navy">
            SERP Preview
          </h3>
          {serpResults.length > 0 && (
            <span className="rounded-full bg-emerald-50 border border-success/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success flex items-center gap-1">
              <Database className="w-3 h-3" /> Live Data
            </span>
          )}
        </div>
        {serpResults.length > 0 ? (
          <div className="space-y-0 divide-y divide-cloud">
            {serpResults.map((r, i) => (
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
                  <a
                    href={r.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-intelligence-teal hover:underline"
                  >
                    {r.title}
                  </a>
                ) : (
                  <p className="text-sm font-medium text-intelligence-teal">
                    {r.title}
                  </p>
                )}
                {r.snippet && (
                  <p className="mt-0.5 text-sm text-midnight-navy/60 pr-8">
                    {r.snippet}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
            <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
            <p className="text-sm font-medium text-midnight-navy/60">
              SERP data collection in progress
            </p>
            <p className="mt-1 text-xs text-slate-gray">
              Live organic search results will appear here once collected.
            </p>
          </div>
        )}
      </div>

      {/* ── 10b. Sample Ads (LIVE DATA) ──────────────────────────────── */}
      {sampleAds.length > 0 && (
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
            {sampleAds.map((ad) => {
              const domain = ad.creative_url
                ? extractDomain(ad.creative_url)
                : null;
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
                      {ad.ad_format ?? "—"}
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
                    <p className="text-xs text-intelligence-teal truncate">
                      {domain}
                    </p>
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
                      : `${ad.first_seen} — ${ad.last_seen}`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 11. Top Advertisers (LIVE DATA) ────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Top Advertisers
          </h2>
          {topAdvertisers.length > 0 && (
            <span className="rounded-full bg-emerald-50 border border-success/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success flex items-center gap-1">
              <Database className="w-3 h-3" /> Live Data
            </span>
          )}
        </div>
        <p className="mb-4 text-xs text-slate-gray">
          Competitive landscape — firms with the highest advertising presence for Depo-Provera litigation.
        </p>

        {topAdvertisers.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-slate-gray">{topAdvertisers.length} advertisers tracked</p>
              <Link
                href="/advertising/saturation/depo_provera"
                className="flex items-center gap-1 text-xs font-semibold text-intelligence-teal hover:underline"
              >
                Full saturation view <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
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
                  {topAdvertisers.map((adv, i) => {
                    const meta = segMeta(adv.segment);
                    const advPlatforms = platformMap.get(adv.advertiser_name) ?? [];
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
                              <span className="text-xs text-slate-gray">—</span>
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
          </>
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

      {/* ── 12. Top Markets by Saturation (LIVE DATA) ──────────────────── */}
      {topMarkets.length > 0 && (
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
            {topMarkets.map((m, i) => {
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
                      {fmtNum(m.total_advertisers)} advertisers · {fmtCur(m.estimated_spend)} spend
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

      {/* ── 14. Geographic & Demographic Targeting ──────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Geographic &amp; Demographic Targeting
          </h2>
        </div>

        {/* Demographic Profile */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Demographic Profile of Depo-Provera Users
        </h3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Demographic
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  Ever Used Depo-Provera
                </th>
              </tr>
            </thead>
            <tbody>
              {DEMOGRAPHIC_PROFILE.map((d) => (
                <tr
                  key={d.demographic}
                  className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                >
                  <td className="py-2.5 pr-4 text-midnight-navy">
                    {d.demographic}
                  </td>
                  <td className="py-2.5 pl-3 text-right font-mono font-semibold text-midnight-navy">
                    {d.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-slate-gray">
            Source: CDC National Health Statistics Report, 2023
          </p>
        </div>

        {/* State Prescribing */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          State-Level DMPA Prescribing Intensity (Medicaid, 2023)
        </h3>
        <p className="mb-3 text-xs text-slate-gray">
          Top 20 states by per-capita prescribing rate. Higher rates indicate
          greater drug exposure in the Medicaid population.
        </p>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud">
                <th className="py-3 pr-2 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center w-10">
                  #
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  State
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  Total Rx
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  Rate/10K
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  % Black Pop
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  Signal
                </th>
              </tr>
            </thead>
            <tbody>
              {STATE_PRESCRIBING.map((s) => (
                <tr
                  key={s.state}
                  className={`border-b border-cloud/50 transition-colors ${
                    s.signal === "HIGH"
                      ? "bg-red-50/40 hover:bg-red-50/70"
                      : "hover:bg-cloud/40"
                  }`}
                >
                  <td className="py-2.5 pr-2 text-center text-xs text-slate-gray">
                    {s.rank}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-midnight-navy">
                    {s.state}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-midnight-navy/80">
                    {s.totalRx}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-midnight-navy">
                    {s.rate}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-midnight-navy/80">
                    {s.blackPop}
                  </td>
                  <td className="py-2.5 pl-3 text-center">
                    <SignalBadge signal={s.signal} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-slate-gray">
            Source: CMS Medicaid State Drug Utilization Data, 2023. Rate per 10K
            women of reproductive age.
          </p>
        </div>

        {/* Crossover States */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          High-Value Targeting Crossover States
        </h3>
        <p className="mb-3 text-xs text-slate-gray">
          States with both above-median DMPA prescribing rates AND above-median
          Black population — where drug exposure and the most impacted
          demographic overlap.
        </p>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  State
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  Rate/10K
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  % Black
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  Total Rx
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Key DMAs
                </th>
              </tr>
            </thead>
            <tbody>
              {CROSSOVER_STATES.map((s) => (
                <tr
                  key={s.state}
                  className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                >
                  <td className="py-2.5 pr-4 font-medium text-midnight-navy">
                    {s.state}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-midnight-navy">
                    {s.rate}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-midnight-navy/80">
                    {s.blackPop}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-midnight-navy/80">
                    {s.totalRx}
                  </td>
                  <td className="py-2.5 pl-3 text-midnight-navy/80">
                    {s.dmas}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Targeting Implications */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Targeting Implications
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { title: "Concentrate in High-Rate States", detail: "Focus ad spend in high-prescribing states rather than running nationally — RI, MS, MD, LA, SC, NM, OH, IA" },
            { title: "Layer Demographic Targeting on Meta", detail: "Women 25–55, Black women, lower-education, Medicaid-eligible income brackets" },
            { title: "DMA-Level Focus", detail: "Baltimore, New Orleans, Columbia SC, Cleveland/Columbus OH, Jackson MS, Memphis, Philadelphia, Detroit" },
            { title: "Pharmacist-Prescribing States", detail: "States where pharmacists can directly administer DMPA: CA, CO, HI, ID, IL, IN, MD, ME, MN, NV, NM, NH, OR, SC, TN, VA + DC" },
          ].map((imp, i) => (
            <div key={i} className="rounded-lg border-l-4 border-intelligence-teal bg-intelligence-teal/5 p-4">
              <div className="flex items-start gap-2">
                <Target className="w-4 h-4 mt-0.5 shrink-0 text-intelligence-teal" />
                <div>
                  <p className="text-sm font-semibold text-midnight-navy">{imp.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-midnight-navy/70">{imp.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 15. Footer / Disclaimer ─────────────────────────────────────── */}
      <div className="rounded-lg border border-cloud bg-cloud/40 p-5">
        <p className="text-xs leading-relaxed text-slate-gray">
          This page is refreshed monthly. Content reflects research and publicly
          available data as of the date shown. Settlement projections are attorney
          estimates and industry benchmarks — not guarantees. This page does not
          constitute legal advice.
        </p>
        <p className="mt-3 text-[11px] text-slate-gray/80">
          Data sources: CMS Medicaid State Drug Utilization Data (2023), CDC
          National Health Statistics Reports (2023), U.S. Census Bureau, CBTRUS,
          Meta Ad Library, JPML, court filings.
        </p>
      </div>

      <AskAIPanel tortContext={DEPO_TORT_CONTEXT} />
    </div>
  );
}
