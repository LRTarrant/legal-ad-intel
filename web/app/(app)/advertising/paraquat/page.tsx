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
  Crosshair,
} from "lucide-react";
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
  extractDomain,
} from "@/lib/queries";
import { CostBenchmarkScorecard } from "../../components/cost-benchmark-scorecard";

export const dynamic = "force-dynamic";

/* ── Metadata ──────────────────────────────────────────────────────────── */

export function generateMetadata() {
  return {
    title:
      "Paraquat Tort Intelligence | Legal Marketing Intelligence",
    description:
      "Comprehensive advertising intelligence brief for Paraquat Parkinson's disease litigation — case data, qualification criteria, settlement projections, and geographic targeting.",
  };
}

/* ── Static Data ───────────────────────────────────────────────────────── */

const PARAQUAT_TORT_CONTEXT = {
  tortName: "Paraquat (Parkinson's Disease)",
  injury: "Parkinson's Disease — linked to chronic exposure to paraquat herbicide in agricultural settings",
  mdlNumber: "MDL 3004, S.D. Illinois, Chief Judge Nancy J. Rosenstengel",
  pendingCases: "6,542+ (MDL) / 8,257+ (total incl. state)",
  settlementRange: "$100K–$1.5M per plaintiff depending on severity tier. Tier 1 (young-onset, extensive exposure): $750K–$1.5M, Tier 2 (moderate exposure): $300K–$750K, Tier 3 (limited exposure): $100K–$300K",
  estimatedCPA: "~$9,950. Comparable torts: Tylenol ~$2,550, PFAS ~$3,000, NEC ~$4,000, Hair Relaxer ~$4,500, Depo-Provera ~$2,500–$4,500",
  bellwetherDate: "First bellwether settled Jan 2026 on eve of trial. Master Settlement Agreement signed Aug 2025. QSF approved Mar 2026.",
  caseSummary: "Paraquat is a highly toxic herbicide widely used in U.S. agriculture since the 1960s. Thousands of agricultural workers, farmworkers, and pesticide applicators allege that chronic exposure to paraquat caused them to develop Parkinson's disease. Scientific research has consistently linked paraquat exposure to a significantly elevated risk of Parkinson's, with some studies showing a 150–200% increased risk. The litigation consolidated as MDL 3004 in the Southern District of Illinois in June 2021 under Chief Judge Nancy J. Rosenstengel. A Master Settlement Agreement was signed in August 2025 and a Qualified Settlement Fund (QSF) was approved in March 2026. Syngenta, the largest manufacturer, has announced it will cease paraquat production by June 2026.",
  qualification: "Exposure: Agricultural workers, farmworkers, or pesticide applicators with meaningful paraquat exposure. Qualifying diagnosis: Parkinson's disease diagnosed by a qualified neurologist. Causation timeline: Temporal relationship between exposure and diagnosis. Statute of limitations: Claim filed within applicable state deadline.",
  advertisingLandscape: "Stage: Mid-late. Primary channels: Google Search/LSAs, Meta lead forms, rural radio, Spanish-language media. Primary demographic: Agricultural workers aged 50+ (latency period). Key regions: Central Valley CA, Mississippi Delta, Midwest Corn Belt, Texas Rio Grande Valley.",
  targetingInsights: "Primary demographic: Agricultural workers aged 50+, former pesticide applicators and farm laborers. Key focus: Hispanic/Latino communities (overrepresented in agricultural labor). Key regions: Central Valley CA, Mississippi Delta (MS, AR, LA), Midwest Corn Belt (IL, IN, IA, MN, MO), Texas Rio Grande Valley. Spanish-language media is critical for reaching agricultural worker communities.",
};

const SCIENTIFIC_STUDIES = [
  {
    study: "Tanner et al.",
    year: "2011",
    source: "Am J Epidemiology",
    finding:
      "Found paraquat exposure associated with 2.5x increased Parkinson's disease risk among exposed agricultural workers.",
  },
  {
    study: "Costello et al.",
    year: "2009",
    source: "Epidemiology",
    finding:
      "Demonstrated a dose-response relationship between paraquat exposure and Parkinson's disease incidence in a large population study.",
  },
  {
    study: "Meta-analyses (multiple)",
    year: "2009–2024",
    source: "Various peer-reviewed",
    finding:
      "Consistently show 1.5–2.5x elevated Parkinson's disease risk across exposed populations. Paraquat generates oxidative stress and damages dopaminergic neurons in the substantia nigra.",
  },
];

const DUAL_SIGNAL_STATES = [
  { state: "CA", piScore: 94.4, verdict: "Very High ($1M+)", negligence: "Pure comparative", notable: "Largest agricultural state, many liberal counties" },
  { state: "MO", piScore: 93.1, verdict: "High", negligence: "Pure comparative", notable: "High verdict history" },
  { state: "MN", piScore: 88.9, verdict: "High", negligence: "Modified comparative (50%)", notable: "Strong agricultural belt" },
  { state: "IL", piScore: 87.5, verdict: "Very High", negligence: "Modified comparative (50%)", notable: "MDL venue state, Very High verdicts" },
  { state: "MS", piScore: 84.7, verdict: "High", negligence: "Pure comparative", notable: "Many liberal counties, agricultural economy" },
  { state: "LA", piScore: 84.7, verdict: "High", negligence: "Pure comparative", notable: "Agricultural/chemical exposure history" },
  { state: "IA", piScore: 78.3, verdict: "Moderate", negligence: "Modified comparative (50%)", notable: "Major corn/soybean state" },
  { state: "IN", piScore: 72.2, verdict: "Moderate", negligence: "Modified comparative (51%)", notable: "Heavy agricultural use" },
  { state: "KS", piScore: 66.7, verdict: "Moderate", negligence: "Modified comparative (50%)", notable: "Wheat belt, heavy paraquat use" },
  { state: "TX", piScore: 52.8, verdict: "Moderate", negligence: "Modified comparative (51%)", notable: "Massive agricultural acreage" },
];

const TOP_PI_STATES = [
  { state: "CA", piScore: 94.4, verdict: "Very High ($1M+)", key: "Pure comparative, no caps" },
  { state: "MO", piScore: 93.1, verdict: "High", key: "Pure comparative, high verdict history" },
  { state: "MN", piScore: 88.9, verdict: "High", key: "No punitive cap, agricultural belt" },
  { state: "IL", piScore: 87.5, verdict: "Very High", key: "MDL venue, caps struck down" },
  { state: "MS", piScore: 84.7, verdict: "High", key: "Pure comparative, agricultural economy" },
];

const QUALIFICATION_CRITERIA = [
  {
    criterion: "Paraquat Exposure",
    standard: "Documented paraquat exposure (occupational records, farm employment history, proximity to sprayed fields)",
    notes: "Agricultural workers, pesticide applicators, and residents near sprayed fields qualify",
  },
  {
    criterion: "Qualifying Diagnosis",
    standard: "Diagnosis of Parkinson's disease by a qualified neurologist",
    notes: "Young-onset Parkinson's (before age 50) is highest value",
  },
  {
    criterion: "Temporal Relationship",
    standard: "Temporal relationship between paraquat exposure and Parkinson's diagnosis",
    notes: "Symptoms may develop years or decades after initial exposure",
  },
  {
    criterion: "Statute of Limitations",
    standard: "Claim filed within applicable state deadline",
    notes: "Varies by state; discovery rule may extend deadline",
  },
];

const SCREENING_QUESTIONS = [
  "Who is the claimant? (You or loved one)",
  "What was your occupation? (Farm worker, pesticide applicator, agricultural laborer, etc.)",
  "Were you exposed to paraquat herbicide? (Mixing, spraying, handling, or proximity to sprayed fields)",
  "How long were you exposed to paraquat? (Duration in years)",
  "When were you exposed? (Approximate years)",
  "Have you been diagnosed with Parkinson's disease?",
  "When were you diagnosed?",
  "Who diagnosed you? (Neurologist, primary care physician, etc.)",
  "What symptoms do you experience? (Tremors, rigidity, slowed movement, balance issues)",
  "Already have an attorney?",
];

const DISQUALIFIERS = [
  "No documented or provable paraquat exposure",
  "No Parkinson's disease diagnosis",
  "Parkinson's diagnosis clearly attributable to genetic factors with no chemical exposure",
  "Claims filed outside statute of limitations without tolling basis",
  "Already represented by another attorney",
];

const LITIGATION_TIMELINE = [
  { date: "2017", event: "First paraquat lawsuits filed", short: "First Lawsuits Filed" },
  { date: "June 2021", event: "MDL 3004 created, transferred to S.D. Illinois", short: "MDL 3004 Created" },
  { date: "2021", event: "Syngenta reached $187.5M settlement with water utilities (separate from personal injury)", short: "$187.5M Water Settlement" },
  { date: "2022–2024", event: "Discovery, Daubert hearings, bellwether case selection", short: "Discovery / Daubert" },
  { date: "Jan 2026", event: "First bellwether case settles on eve of trial", short: "Bellwether Settles" },
  { date: "Aug 2025", event: "Master Settlement Agreement signed", short: "MSA Signed" },
  { date: "Mar 2026", event: "Qualified Settlement Fund (QSF) approved", short: "QSF Approved" },
  { date: "June 2026", event: "Syngenta to cease paraquat production", short: "Production Ceases", future: true },
  { date: "Ongoing", event: "New filings continue; SOL windows open in many states", short: "New Filings Continue", future: true },
];

const SETTLEMENT_TIERS = [
  {
    tier: "Tier 1: Young-Onset, Extensive Exposure",
    severity: "High",
    range: "$750K – $1.5M",
    factors:
      "Young-onset Parkinson's (diagnosed before age 50) with documented extensive exposure history",
  },
  {
    tier: "Tier 2: Moderate Exposure",
    severity: "Moderate",
    range: "$300K – $750K",
    factors:
      "Parkinson's diagnosis with moderate-to-significant documented paraquat exposure",
  },
  {
    tier: "Tier 3: Limited Exposure",
    severity: "Mild",
    range: "$100K – $300K",
    factors:
      "Parkinson's diagnosis with limited but provable exposure history",
  },
];

const COMPARATIVE_CPA = [
  { tort: "Tylenol", stage: "Early", cpa: "~$2,550", settlement: "$60–90K" },
  { tort: "Depo-Provera", stage: "Early-mid", cpa: "~$2,500–$4,500", settlement: "TBD ($100K–$1.5M)" },
  { tort: "PFAS (AFFF)", stage: "Mid-late", cpa: "~$3,000", settlement: "$75–175K" },
  { tort: "NEC Formula", stage: "Mid", cpa: "~$4,000", settlement: "$100–300K" },
  { tort: "Hair Relaxer", stage: "Early", cpa: "~$4,500", settlement: "$90K–$1M" },
  { tort: "Paraquat", stage: "Mid-late", cpa: "~$9,950", settlement: "$100K–$1.5M", highlight: true },
];

const GEOGRAPHIC_TARGETING = {
  primaryDemographic: "Agricultural workers aged 50+ (latency period means older plaintiffs)",
  ageRange: "50+ (peak diagnosed demographics due to latency)",
  regionalFocus: "Agricultural regions with heavy paraquat use — Central Valley CA, Midwest Corn Belt, Mississippi Delta",
  keyMetros: [
    "Central Valley, CA",
    "Mississippi Delta (MS, AR, LA)",
    "Midwest Corn Belt (IL, IN, IA)",
    "Minnesota / Missouri",
    "Texas Rio Grande Valley",
    "Pacific Northwest (WA, OR)",
  ],
};

const TRACKED_KEYWORDS = [
  { keyword: "paraquat lawsuit", volume: "22,200", difficulty: "High" as const, cpc: "$52.00" },
  { keyword: "paraquat parkinson's", volume: "14,800", difficulty: "High" as const, cpc: "$45.50" },
  { keyword: "paraquat settlement", volume: "9,900", difficulty: "Medium" as const, cpc: "$48.00" },
  { keyword: "paraquat herbicide lawsuit", volume: "6,600", difficulty: "Medium" as const, cpc: "$42.00" },
  { keyword: "paraquat exposure attorney", volume: "3,600", difficulty: "Medium" as const, cpc: "$55.00" },
  { keyword: "paraquat class action", volume: "2,400", difficulty: "Medium" as const, cpc: "$38.00" },
];

/* ── Helpers ────────────────────────────────────────────────────────────── */

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

const TORT_SLUG = "paraquat";

export default async function ParaquatPage() {
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
  const tortLabel = "Paraquat";
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
            Paraquat
          </h1>
          <span className="rounded-full bg-emerald-50 border border-success/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-success">
            Active Litigation
          </span>
          <span className="rounded-full bg-intelligence-teal/10 border border-intelligence-teal/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-intelligence-teal">
            MDL 3004
          </span>
        </div>
        <p className="mt-1 text-lg text-slate-gray">
          Parkinson&apos;s Disease Litigation — Agricultural Herbicide Exposure
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
              Cases Filed
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">8,257+</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">MDL 3004 + state courts</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <DollarSign className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Settlement Range
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">$100K – $1.5M</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Per plaintiff</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Primary Injury
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy text-lg">Parkinson&apos;s Disease</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Status
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy text-lg">Active — MSA Signed</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Chief Judge Nancy J. Rosenstengel, S.D. Illinois</p>
        </div>
      </div>

      {/* ── 3. Case Summary ─────────────────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-4">
          Case Summary
        </h2>
        <div className="space-y-4 text-sm leading-relaxed text-midnight-navy/80">
          <p>
            Paraquat is a highly toxic herbicide widely used in U.S. agriculture
            since the 1960s. Thousands of agricultural workers, farmworkers, and
            pesticide applicators allege that chronic exposure to paraquat caused
            them to develop Parkinson&apos;s disease. Scientific research has
            consistently linked paraquat exposure to a significantly elevated risk
            of Parkinson&apos;s, with some studies showing a 150–200% increased risk.
          </p>
          <p>
            The litigation consolidated as MDL 3004 in the Southern District of
            Illinois in June 2021 under Chief Judge Nancy J. Rosenstengel. In
            January 2026, the first bellwether case settled on the eve of trial,
            and a Master Settlement Agreement was signed in August 2025. A
            Qualified Settlement Fund (QSF) was approved in March 2026. Syngenta,
            the largest manufacturer, has announced it will cease paraquat
            production by June 2026.
          </p>
          <p>
            Despite the settlement framework, new filings continue as additional
            plaintiffs are diagnosed and the statute of limitations windows remain
            open in many states. The litigation represents a significant
            opportunity for plaintiff firms, particularly those with connections
            to agricultural communities.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Key Defendants
            </p>
            <p className="text-sm text-midnight-navy">
              Syngenta, Chevron, Growmark
            </p>
          </div>
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Legal Theories
            </p>
            <p className="text-sm text-midnight-navy">
              Failure to warn, negligent design, negligence, strict liability,
              fraudulent concealment of neurotoxicity risks.
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
          Paraquat is a neurotoxin that generates oxidative stress and damages
          dopaminergic neurons in the substantia nigra, the brain region
          controlling movement. Unlike Roundup (NHL) or Hair Relaxer
          (ovarian/uterine cancer), Paraquat litigation is exclusively about
          Parkinson&apos;s disease.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
              Symptoms &amp; Effects
            </p>
            <ul className="space-y-1.5">
              {[
                "Tremors (resting and action tremors)",
                "Rigidity (muscle stiffness)",
                "Bradykinesia (slowed movement)",
                "Postural instability (balance problems)",
                "Cognitive decline",
                "Progressive neurodegeneration — no cure",
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
              Severity Tiers
            </p>
            <div className="space-y-2">
              <div className="rounded-md border border-alert/20 bg-red-50 px-4 py-3">
                <p className="text-xs font-semibold text-alert">Tier 1 (Highest)</p>
                <p className="mt-1 text-sm text-midnight-navy/80">
                  Young-onset Parkinson&apos;s (diagnosed before age 50) with
                  documented extensive exposure
                </p>
              </div>
              <div className="rounded-md border border-warning/20 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold text-warning">Tier 2</p>
                <p className="mt-1 text-sm text-midnight-navy/80">
                  Parkinson&apos;s diagnosis with moderate-to-significant documented
                  exposure
                </p>
              </div>
              <div className="rounded-md border border-success/20 bg-emerald-50 px-4 py-3">
                <p className="text-xs font-semibold text-success">Tier 3</p>
                <p className="mt-1 text-sm text-midnight-navy/80">
                  Parkinson&apos;s diagnosis with limited but provable exposure
                  history
                </p>
              </div>
            </div>
            <div className="mt-3 rounded-md bg-cloud/60 px-4 py-3">
              <p className="text-xs font-semibold text-midnight-navy">Latency</p>
              <p className="mt-1 text-sm text-midnight-navy/80">
                Symptoms may develop years or decades after initial exposure
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
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              <span className="font-semibold text-midnight-navy">Regulatory:</span>{" "}
              Paraquat is classified as a Restricted Use Pesticide (RUP) by the
              EPA — only certified applicators can use it. Banned in 67+ countries
              including the EU, China, and Brazil. Despite mounting evidence, the
              EPA has not banned paraquat in the U.S.
            </p>
          </div>
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              <span className="font-semibold text-midnight-navy">Key point:</span>{" "}
              Courts have accepted paraquat-Parkinson&apos;s causation testimony
              under Daubert standards. The consistent finding of 1.5–2.5x elevated
              risk across multiple studies provides strong epidemiological support
              for plaintiff claims.
            </p>
          </div>
        </div>
      </div>

      {/* ── 5c. Market Opportunity Signals ─────────────────────────────── */}
      <div className="rounded-lg border border-intelligence-teal/20 bg-gradient-to-br from-intelligence-teal/[0.04] to-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Crosshair className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Market Opportunity Signals
          </h2>
        </div>
        <p className="mb-5 text-sm text-slate-gray">
          Agricultural states where judicial climate and plaintiff-friendly laws create strong filing opportunities
        </p>

        {/* Signal Legend — 2 signals only (no cancer) */}
        <div className="mb-5 flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-midnight-navy/80">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#14b8a6" }} />
            Liberal/Moderate Judicial Profile
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-midnight-navy/80">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#10b981" }} />
            Plaintiff-Friendly State (PI Viability)
          </span>
        </div>

        {/* Key Agricultural States Table */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Key Agricultural States for Paraquat Filing
        </h3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-intelligence-teal/20">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  State
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  PI Score
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  Negligence Rule
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  Avg Jury Verdict
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Notable
                </th>
              </tr>
            </thead>
            <tbody>
              {DUAL_SIGNAL_STATES.map((s) => (
                <tr
                  key={s.state}
                  className="border-b border-cloud/50 hover:bg-intelligence-teal/[0.04] transition-colors"
                >
                  <td className="py-3 pr-4 font-medium text-midnight-navy">
                    {s.state}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-midnight-navy">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#10b981" }} />
                      {s.piScore}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center text-xs text-midnight-navy/80">
                    {s.negligence}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        s.verdict.includes("Very High")
                          ? "bg-red-50 text-alert"
                          : s.verdict === "High"
                          ? "bg-amber-50 text-warning"
                          : "bg-emerald-50 text-success"
                      }`}
                    >
                      {s.verdict}
                    </span>
                  </td>
                  <td className="py-3 pl-3 text-xs text-midnight-navy/70">
                    {s.notable}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* State PI Viability Summary */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Top PI Viability States
        </h3>
        <div className="flex flex-wrap gap-2 mb-6">
          {TOP_PI_STATES.map((s) => (
            <div
              key={s.state}
              className="rounded-lg border border-intelligence-teal/20 bg-white px-4 py-2.5"
            >
              <p className="text-sm font-bold text-midnight-navy">
                {s.state}{" "}
                <span className="font-mono text-intelligence-teal">{s.piScore}</span>
              </p>
              <p className="text-[11px] text-midnight-navy/60">
                {s.verdict}
              </p>
              <p className="text-[10px] text-slate-gray">{s.key}</p>
            </div>
          ))}
        </div>

        {/* Insight Callout */}
        <div className="rounded-md border border-intelligence-teal/20 bg-intelligence-teal/[0.06] px-4 py-3 mb-4">
          <p className="text-sm leading-relaxed text-midnight-navy/80">
            Agricultural states with pure comparative fault rules and
            plaintiff-friendly judicial profiles present the strongest filing
            opportunities for paraquat cases. Illinois benefits from MDL venue
            familiarity, while California and Missouri combine high PI viability
            with large exposed agricultural workforces.
          </p>
        </div>

        {/* Cross-links */}
        <div className="flex flex-wrap gap-4">
          <Link
            href="/judicial-profiles"
            className="inline-flex items-center gap-1 text-xs font-semibold text-intelligence-teal hover:underline"
          >
            View Judicial Profiles
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/pi-viability"
            className="inline-flex items-center gap-1 text-xs font-semibold text-intelligence-teal hover:underline"
          >
            View PI Viability Scores
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
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
                "2–3 yes/no questions + contact info. Were you exposed to paraquat? Diagnosed with Parkinson's? Cheapest but highest rejection at intake.",
            },
            {
              label: "Tier 2: Qualified Lead",
              cpl: "Mid-Range CPL",
              color: "border-warning/30 bg-amber-50",
              tagColor: "bg-warning/10 text-warning",
              details:
                "4–6 step form. Confirmed agricultural exposure, Parkinson's diagnosis, exposure duration, attorney check. Better conversion.",
            },
            {
              label: "Tier 3: Retainer-Ready",
              cpl: "Highest CPA",
              color: "border-alert/30 bg-red-50",
              tagColor: "bg-alert/10 text-alert",
              details:
                "10–15 step deep intake. Occupation details, exposure method, duration, specific diagnosis, neurologist confirmation, symptom history, treatment. Most expensive but lowest fallout.",
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
          Individual recoveries depend on severity, exposure documentation, age
          at diagnosis, and negotiation. The Master Settlement Agreement framework
          provides a structured claims process.
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
                  Estimated Range
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Description
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
                "Young-onset Parkinson's (before age 50)",
                "Extensive documented exposure (10+ years)",
                "Occupational records proving paraquat contact",
                "Severe symptoms (wheelchair-dependent, etc.)",
                "No family history of Parkinson's",
                "Multiple exposure pathways documented",
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
                "Limited or undocumented exposure",
                "Late-onset Parkinson's (over 70)",
                "Strong family history of Parkinson's",
                "Short exposure duration",
                "Weak documentation of paraquat use",
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
              MSA Signed Aug 2025
            </span>
            <ChevronRight className="w-3 h-3 text-slate-gray" />
            <span className="rounded bg-intelligence-teal/10 px-2 py-1 font-medium text-intelligence-teal">
              QSF Approved Mar 2026
            </span>
            <ChevronRight className="w-3 h-3 text-slate-gray" />
            <span className="rounded bg-intelligence-teal/10 px-2 py-1 font-medium text-intelligence-teal">
              Claims Processing 2026
            </span>
            <ChevronRight className="w-3 h-3 text-slate-gray" />
            <span className="rounded bg-intelligence-teal/10 px-2 py-1 font-medium text-intelligence-teal">
              First Payments 2026–2027
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
              channel: "Spanish-Language Media",
              detail: "Critical for reaching agricultural worker communities — TV, radio, and digital in Spanish",
              color: "border-blue-500/30 bg-blue-50",
            },
            {
              channel: "Google Ads/LSAs",
              detail: "High-intent search queries for paraquat lawsuit and Parkinson's keywords",
              color: "border-emerald-500/30 bg-emerald-50",
            },
            {
              channel: "Rural Radio & Local TV",
              detail: "Reaching agricultural workers in rural markets and farming communities",
              color: "border-indigo-500/30 bg-indigo-50",
            },
            {
              channel: "Farm Industry Publications",
              detail: "Agricultural trade publications, farm websites, and agricultural worker advocacy organizations",
              color: "border-purple-500/30 bg-purple-50",
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

        {/* Warning (editorial) */}
        <div className="mt-4 rounded-md border border-warning/20 bg-amber-50 px-4 py-3">
          <p className="text-xs text-midnight-navy/80">
            <span className="font-semibold text-warning">High CPA Note:</span>{" "}
            Paraquat has the highest CPA (~$9,950) among tracked torts due to the
            specialized demographic (agricultural workers) and the need for
            Spanish-language advertising. However, settlement values ($100K–$1.5M)
            provide strong ROI for qualified leads.
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
          Top organic search results for Paraquat litigation keywords. Understanding who ranks helps assess content competition and SEO opportunity.
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
          Competitive landscape — firms with the highest advertising presence for Paraquat litigation.
        </p>

        {topAdvertisers.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-slate-gray">{topAdvertisers.length} advertisers tracked</p>
              <Link
                href="/advertising/saturation/paraquat"
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

        {/* Primary Demographic */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
            Target Demographics
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-cloud/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
                Primary Demographic
              </p>
              <p className="text-sm text-midnight-navy">
                {GEOGRAPHIC_TARGETING.primaryDemographic}
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
                Age Range
              </p>
              <p className="text-sm text-midnight-navy">
                {GEOGRAPHIC_TARGETING.ageRange}
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
                Regional Focus
              </p>
              <p className="text-sm text-midnight-navy">
                {GEOGRAPHIC_TARGETING.regionalFocus}
              </p>
            </div>
          </div>
        </div>

        {/* Key Regions */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Key Agricultural Regions
        </h3>
        <div className="grid gap-1.5 sm:grid-cols-2 mb-6">
          {GEOGRAPHIC_TARGETING.keyMetros.map((metro) => (
            <div
              key={metro}
              className="flex items-center gap-2 rounded-md bg-cloud/60 px-3 py-2"
            >
              <MapPin className="w-3.5 h-3.5 shrink-0 text-intelligence-teal" />
              <p className="text-sm text-midnight-navy">{metro}</p>
            </div>
          ))}
        </div>

        {/* Targeting Implications */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Targeting Implications
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { title: "Spanish-Language Media", detail: "Critical for reaching agricultural worker communities — Hispanic/Latino workers are overrepresented in agricultural labor and paraquat exposure" },
            { title: "Rural & Agricultural Markets", detail: "Focus on rural radio, local TV, and farm industry publications in Central Valley CA, Midwest Corn Belt, Mississippi Delta, Texas Rio Grande Valley" },
            { title: "Community Organizations", detail: "Partner with agricultural worker advocacy groups, farmworker unions, and community health organizations for trusted outreach" },
            { title: "Creative Messaging", detail: "Lead with Parkinson's disease diagnosis, mention specific agricultural work history, emphasize the Master Settlement Agreement and active claims process" },
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
          Data sources: Tanner et al. (2011), Costello et al. (2009), EPA regulatory
          filings, JPML, court filings, Meta Ad Library, Google Ads transparency data.
        </p>
      </div>

      <NewLandingPagesCard tortSlug="paraquat" tortLabel="Paraquat" />
      <AskAIPanel tortContext={PARAQUAT_TORT_CONTEXT} />
    </div>
  );
}
