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
      "Hair Relaxer (Cancer) Tort Intelligence | Legal Marketing Intelligence",
    description:
      "Comprehensive advertising intelligence brief for Hair Relaxer cancer litigation — case data, qualification criteria, settlement projections, and geographic targeting.",
  };
}

/* ── Static Data ───────────────────────────────────────────────────────── */

const HAIR_RELAXER_TORT_CONTEXT = {
  tortName: "Hair Relaxer (Cancer)",
  injury: "Uterine & Endometrial Cancer — linked to endocrine-disrupting chemicals in chemical hair straighteners",
  mdlNumber: "MDL 3060, N.D. Illinois, Judge Mary M. Rowland",
  pendingCases: "11,400+ (April 2026)",
  settlementRange: "$90K–$1M depending on injury type and age. Uterine Cancer (under 35): $250K–$1M, Uterine Cancer (over 50): $250K–$500K, Endometrial Cancer: $200K–$450K, Fibroids w/ Hysterectomy (under 40): $90K–$150K",
  estimatedCPA: "~$4,500. Comparable torts: Tylenol ~$2,550, PFAS ~$3,000, NEC ~$4,000, Depo-Provera ~$2,500–$4,500, Paraquat ~$9,950",
  bellwetherDate: "Expected 2027. Daubert motions filed April 2026; bellwether trials contingent on ruling.",
  caseSummary: "Chemical hair relaxer products containing endocrine-disrupting chemicals (formaldehyde, phthalates, parabens) have been linked to significantly elevated rates of uterine cancer, endometrial cancer, ovarian cancer, and uterine fibroids. A landmark 2022 NIH-funded study found that frequent users (more than 4 times per year) had a 156% increased risk of developing uterine cancer compared to non-users. Over 11,400 lawsuits are now consolidated in MDL-3060 before Judge Mary M. Rowland in the Northern District of Illinois. Primary defendants include L'Oréal, Revlon, SoftSheen-Carson, and other manufacturers.",
  qualification: "Product: History of frequent use of chemical hair relaxer or straightener products (typically 2+ years of regular use). Qualifying diagnosis: Uterine cancer, endometrial cancer, ovarian cancer, uterine fibroids (especially requiring hysterectomy), or endometriosis. Causation timeline: Diagnosis occurred after beginning use. Damages: Documented medical expenses, lost wages, pain and suffering, or fertility loss. Statute of limitations: Claim filed within applicable state deadline.",
  advertisingLandscape: "Stage: Early (2). Primary channels: Meta lead forms, Google Search/LSAs, legal lead gen networks. Primary demographic: Black women (disproportionately affected — highest usage rates of chemical hair relaxers). Key metro areas: Atlanta, Houston, Dallas, Chicago, Detroit, Philadelphia, Washington DC, Memphis, Charlotte, New Orleans.",
  targetingInsights: "Primary demographic: Black women aged 25–65 (disproportionately affected — highest usage rates). Key metro areas: Atlanta, Houston, Dallas, Chicago, Detroit, Philadelphia, Washington DC, Memphis, Charlotte, New Orleans. Regional focus: Southeast US and major urban centers with high African American populations.",
};

const SCIENTIFIC_STUDIES = [
  {
    study: "Sister Study (NIH)",
    year: "2022",
    source: "NIH / J Natl Cancer Inst",
    finding:
      "Women using hair relaxers >4x/year had 156% increased uterine cancer risk; even infrequent users (1-4x/year) had 54% increased risk. ~33,000 women studied.",
  },
  {
    study: "Black Women's Health Study",
    year: "2023",
    source: "Epidemiology journal",
    finding:
      "Long-term use (≥15 years, ≥5x/year) associated with elevated uterine cancer risk among postmenopausal women. ~45,000 Black women studied.",
  },
  {
    study: "EDC Mechanism Research",
    year: "2022–2024",
    source: "Multiple journals",
    finding:
      "Chemical hair relaxers contain endocrine-disrupting chemicals (EDCs) — formaldehyde, phthalates, parabens — that interfere with hormone production and may accelerate cancer cell growth in reproductive organs.",
  },
];

const CANCER_INCIDENCE_DATA = {
  cancerSite: "Ovary",
  subtitle: "Ovarian cancer incidence rates across U.S. counties",
  nationalAvg: 25.7,
  states: [
    { state: "IL", avgRate: 31.1, annualCases: "3,544", pctRising: 71 },
    { state: "MD", avgRate: 30.8, annualCases: "1,827", pctRising: 79 },
    { state: "OH", avgRate: 28.2, annualCases: "3,902", pctRising: 80 },
    { state: "CA", avgRate: 27.5, annualCases: "10,419", pctRising: 76 },
    { state: "NC", avgRate: 27.2, annualCases: "3,476", pctRising: 74 },
    { state: "FL", avgRate: 27.1, annualCases: "8,065", pctRising: 52 },
    { state: "GA", avgRate: 26.3, annualCases: "2,869", pctRising: 44 },
    { state: "NY", avgRate: 23.8, annualCases: "4,405", pctRising: 80 },
  ],
  hotspots: [
    { county: "Forsyth County", state: "GA", rate: 48.0, trend: 1.0, cases: 126 },
    { county: "Virginia Beach", state: "VA", rate: 43.6, trend: 3.3, cases: 223 },
    { county: "Carteret County", state: "NC", rate: 52.0, trend: 6.9, cases: 54 },
    { county: "Warren County", state: "OH", rate: 42.0, trend: 4.1, cases: 117 },
    { county: "Harford County", state: "MD", rate: 41.2, trend: 2.8, cases: 134 },
    { county: "St. Johns County", state: "FL", rate: 46.8, trend: 0.5, cases: 177 },
  ],
  note: "Ovarian cancer is one of the qualifying injuries in the Hair Relaxer litigation. Counties with above-average incidence rates and rising trends may represent areas with larger potential claimant pools. Source: CDC/NCI USCS cancer statistics.",
};

const TRIPLE_SIGNAL_COUNTIES = [
  { county: "Washington County", state: "MN", cancerRate: 51.0, trend: "Rising" as const, judicial: "Liberal", piScore: 88.9, verdict: "High" },
  { county: "Chittenden County", state: "VT", cancerRate: 40.3, trend: "Rising" as const, judicial: "Liberal", piScore: 93.1, verdict: "High" },
  { county: "Anoka County", state: "MN", cancerRate: 38.7, trend: "Rising" as const, judicial: "Liberal", piScore: 88.9, verdict: "High" },
  { county: "Champaign County", state: "IL", cancerRate: 36.8, trend: "Rising" as const, judicial: "Moderate", piScore: 87.5, verdict: "Very High" },
  { county: "Sangamon County", state: "IL", cancerRate: 36.0, trend: "Rising" as const, judicial: "Moderate", piScore: 87.5, verdict: "Very High" },
  { county: "McLean County", state: "IL", cancerRate: 35.7, trend: "Rising" as const, judicial: "Liberal", piScore: 87.5, verdict: "Very High" },
  { county: "Ramsey County (St. Paul)", state: "MN", cancerRate: 34.5, trend: "Rising" as const, judicial: "Liberal", piScore: 88.9, verdict: "High" },
  { county: "Hennepin County (Minneapolis)", state: "MN", cancerRate: 33.3, trend: "Rising" as const, judicial: "Liberal", piScore: 88.9, verdict: "High" },
];

const TOP_PI_STATES = [
  { state: "NY", piScore: 97.2, verdict: "Very High ($1M+)", cancerRate: "23.8", key: "Pure comparative, no caps" },
  { state: "CA", piScore: 94.4, verdict: "Very High ($1M+)", cancerRate: "27.5", key: "Pure comparative, no caps" },
  { state: "VT", piScore: 93.1, verdict: "High", cancerRate: "Elevated counties", key: "Pure comparative, no caps" },
  { state: "MN", piScore: 88.9, verdict: "High", cancerRate: "Elevated counties", key: "No punitive cap" },
  { state: "IL", piScore: 87.5, verdict: "Very High", cancerRate: "31.1", key: "MDL venue, caps struck down" },
];

const QUALIFICATION_CRITERIA = [
  {
    criterion: "Product Use",
    standard: "History of frequent use of chemical hair relaxer or straightener products (typically 2+ years of regular use)",
    notes: "Both professional salon and at-home products qualify",
  },
  {
    criterion: "Qualifying Diagnosis",
    standard: "Uterine cancer, endometrial cancer, ovarian cancer, uterine fibroids (especially requiring hysterectomy), or endometriosis",
    notes: "Uterine cancer is the strongest claim based on NIH study",
  },
  {
    criterion: "Causation Timeline",
    standard: "Diagnosis occurred after beginning use of chemical hair relaxer products",
    notes: "Longer use duration strengthens the claim",
  },
  {
    criterion: "Damages",
    standard: "Documented medical expenses, lost wages, pain and suffering, or fertility loss",
    notes: "Fertility loss particularly devastating for younger plaintiffs",
  },
  {
    criterion: "Statute of Limitations",
    standard: "Claim filed within applicable state deadline",
    notes: "Varies by state; discovery rule may extend deadline",
  },
];

const SCREENING_QUESTIONS = [
  "Who is the claimant? (You or loved one)",
  "Which products did you use? (Brand names of hair relaxers/straighteners)",
  "How often did you use the product? (Frequency per year)",
  "How long did you use the product? (Duration in years)",
  "When did you start/stop using hair relaxers?",
  "Have you been diagnosed with uterine cancer, endometrial cancer, ovarian cancer, uterine fibroids, or endometriosis?",
  "When were you diagnosed?",
  "Treatment received? (Surgery, chemotherapy, radiation, hysterectomy, etc.)",
  "Have you experienced fertility loss or had a hysterectomy?",
  "Already have an attorney?",
];

const DISQUALIFIERS = [
  "Never used chemical hair relaxer products",
  "Only occasional use (less than 1 year)",
  "No qualifying cancer or fibroid diagnosis",
  "Diagnosis existed before hair relaxer use",
  "Already represented by another attorney",
];

const LITIGATION_TIMELINE = [
  { date: "October 2022", event: "NIH Sister Study published linking hair relaxers to 2.4x uterine cancer risk", short: "NIH Study Published" },
  { date: "February 2023", event: "MDL-3060 established in N.D. Illinois before Judge Rowland", short: "MDL-3060 Established" },
  { date: "November 2023", event: "Motion to dismiss denied — thousands of claims proceed", short: "MTD Denied" },
  { date: "March 2024", event: "8,387 active lawsuits in MDL", short: "8,387 Cases in MDL" },
  { date: "January 2025", event: "Bellwether trial planning begins; parties dispute case selection", short: "Bellwether Planning" },
  { date: "August 2025", event: "Science Day scheduled for January 2026; case count exceeds 10,500", short: "10,500+ Cases" },
  { date: "January 2026", event: "Science Day hearing held — both sides present epidemiology, toxicology, causation evidence", short: "Science Day Hearing" },
  { date: "February 2026", event: "Bellwether phase entered; first-wave defendant discovery largely complete", short: "Bellwether Phase" },
  { date: "April 2026", event: "11,400+ cases pending; Daubert motions filed; bellwether trials expected 2027", short: "11,400+ Cases / Daubert" },
  { date: "2027 (projected)", event: "Bellwether trials expected if plaintiffs' experts survive Daubert", short: "Bellwether Trials", future: true },
];

const SETTLEMENT_TIERS = [
  {
    tier: "Uterine Cancer (under 35)",
    severity: "High",
    range: "$250K – $1,000K",
    factors:
      "Higher due to fertility loss, long remaining life expectancy, significant damages",
  },
  {
    tier: "Uterine Cancer (over 50)",
    severity: "Moderate",
    range: "$250K – $500K",
    factors:
      "Lower fertility impact but significant medical costs and pain/suffering",
  },
  {
    tier: "Endometrial Cancer",
    severity: "Moderate",
    range: "$200K – $450K",
    factors:
      "Tied to long-term exposure; treatment may include hysterectomy and chemotherapy",
  },
  {
    tier: "Fibroids w/ Hysterectomy (under 40)",
    severity: "Mild",
    range: "$90K – $150K",
    factors:
      "Permanent infertility factor; may require multiple surgeries",
  },
];

const COMPARATIVE_CPA = [
  { tort: "Tylenol", stage: "Early", cpa: "~$2,550", settlement: "$60–90K" },
  { tort: "Depo-Provera", stage: "Early-mid", cpa: "~$2,500–$4,500", settlement: "TBD ($100K–$1.5M)" },
  { tort: "PFAS (AFFF)", stage: "Mid-late", cpa: "~$3,000", settlement: "$75–175K" },
  { tort: "NEC Formula", stage: "Mid", cpa: "~$4,000", settlement: "$100–300K" },
  { tort: "Hair Relaxer", stage: "Early", cpa: "~$4,500", settlement: "$90K–$1M", highlight: true },
  { tort: "Paraquat", stage: "Mid-late", cpa: "~$9,950", settlement: "$105–250K" },
];

const GEOGRAPHIC_TARGETING = {
  primaryDemographic: "Black women (disproportionately affected — highest usage rates of chemical hair relaxers)",
  ageRange: "25–65 (peak usage demographics)",
  regionalFocus: "Southeast US and major urban centers with high African American populations",
  keyMetros: [
    "Atlanta",
    "Houston",
    "Dallas",
    "Chicago",
    "Detroit",
    "Philadelphia",
    "Washington DC",
    "Memphis",
    "Charlotte",
    "New Orleans",
  ],
};

const TRACKED_KEYWORDS = [
  { keyword: "hair relaxer lawsuit", volume: "33,100", difficulty: "High" as const, cpc: "$38.50" },
  { keyword: "hair relaxer cancer", volume: "18,100", difficulty: "High" as const, cpc: "$32.20" },
  { keyword: "hair relaxer uterine cancer", volume: "12,100", difficulty: "Medium" as const, cpc: "$35.80" },
  { keyword: "hair straightener lawsuit", volume: "8,100", difficulty: "High" as const, cpc: "$42.00" },
  { keyword: "hair relaxer settlement", volume: "6,600", difficulty: "Medium" as const, cpc: "$28.40" },
  { keyword: "chemical hair straightener lawsuit", volume: "4,400", difficulty: "Medium" as const, cpc: "$31.00" },
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

const TORT_SLUG = "hair_relaxer";

export default async function HairRelaxerPage() {
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
  const tortLabel = "Hair Relaxer";
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
            Hair Relaxer
          </h1>
          <span className="rounded-full bg-emerald-50 border border-success/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-success">
            Active Litigation
          </span>
        </div>
        <p className="mt-1 text-lg text-slate-gray">
          Chemical Hair Straightener Cancer Litigation — MDL-3060
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
          <p className="text-2xl font-bold text-midnight-navy">11,400+</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">MDL 3060</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <DollarSign className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Settlement Range
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">$90K – $1M</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Projected (pre-trial)</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Primary Injury
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy text-lg">Uterine &amp; Endometrial Cancer</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Status
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy text-lg">Expert Discovery / Daubert</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Judge Mary M. Rowland, N.D. Illinois</p>
        </div>
      </div>

      {/* ── 3. Case Summary ─────────────────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-4">
          Case Summary
        </h2>
        <div className="space-y-4 text-sm leading-relaxed text-midnight-navy/80">
          <p>
            Chemical hair relaxer products containing endocrine-disrupting
            chemicals (formaldehyde, phthalates, parabens) have been linked to
            significantly elevated rates of uterine cancer, endometrial cancer,
            ovarian cancer, and uterine fibroids. A landmark 2022 NIH-funded
            study found that frequent users (more than 4 times per year) had a
            156% increased risk of developing uterine cancer compared to
            non-users.
          </p>
          <p>
            Over 11,400 lawsuits are now consolidated in MDL-3060 before Judge
            Mary M. Rowland in the Northern District of Illinois, making it one
            of the five largest active MDLs in the federal system. Primary
            defendants include L&apos;Or&eacute;al, Revlon, SoftSheen-Carson,
            and other manufacturers of chemical hair straightening products.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Defendants
            </p>
            <p className="text-sm text-midnight-navy">
              L&apos;Or&eacute;al, Revlon, SoftSheen-Carson, Strength of Nature,
              Dabur International, Godrej Consumer Products, and other
              manufacturers of chemical hair straightening products.
            </p>
          </div>
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Legal Theories
            </p>
            <p className="text-sm text-midnight-navy">
              Failure to warn, negligent design, negligence, strict liability,
              breach of implied warranty of safety.
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
          Chemical hair relaxers contain endocrine-disrupting chemicals that
          interfere with hormone production and have been linked to cancers of
          the reproductive system and other serious conditions.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
              Linked Conditions
            </p>
            <ul className="space-y-1.5">
              {[
                "Uterine cancer (2.4x increased risk for frequent users)",
                "Endometrial cancer",
                "Ovarian cancer",
                "Uterine fibroids (often requiring hysterectomy)",
                "Fertility loss (particularly devastating for younger plaintiffs)",
                "Endocrine disruption from formaldehyde, phthalates, and parabens",
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
              Key Risk Factor
            </p>
            <p className="text-sm leading-relaxed text-midnight-navy/80">
              Frequent use (more than 4 times per year) showed the strongest
              association with cancer risk. Even infrequent users (1-4 times per
              year) had a 54% increased risk of uterine cancer compared to
              non-users.
            </p>
            <div className="mt-4 rounded-md border border-alert/20 bg-red-50 px-4 py-3">
              <p className="text-xs font-semibold text-alert">NIH Finding</p>
              <p className="mt-1 text-sm text-midnight-navy/80">
                The 2022 Sister Study found a 156% increased risk of uterine
                cancer among frequent hair relaxer users — the strongest
                epidemiological link in this litigation.
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
            The NIH Sister Study is the cornerstone of the litigation — its
            finding of a 156% increased uterine cancer risk among frequent users
            triggered the wave of lawsuits and MDL consolidation. The Daubert
            ruling on this evidence will be decisive.
          </p>
        </div>
      </div>

      {/* ── 5b. Cancer Incidence Insight ─────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Cancer Incidence Insight
          </h2>
        </div>
        <p className="mb-4 text-sm text-slate-gray">
          {CANCER_INCIDENCE_DATA.subtitle}
        </p>

        {/* National Benchmark */}
        <div className="mb-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-intelligence-teal/10 px-3 py-1 text-sm font-semibold text-intelligence-teal">
            National Avg: {CANCER_INCIDENCE_DATA.nationalAvg} per 100K
          </span>
        </div>

        {/* Above-Average States Table */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Above-Average States
        </h3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  State
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  Avg Rate
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  Annual Cases
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  % Counties Rising
                </th>
              </tr>
            </thead>
            <tbody>
              {CANCER_INCIDENCE_DATA.states.map((s) => (
                <tr
                  key={s.state}
                  className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                >
                  <td className="py-3 pr-4 font-medium text-midnight-navy">
                    {s.state}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-midnight-navy">
                    {s.avgRate}
                  </td>
                  <td className="py-3 px-3 text-right text-midnight-navy/80">
                    {s.annualCases}
                  </td>
                  <td className="py-3 pl-3 text-right">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                        s.pctRising > 60
                          ? "bg-red-50 text-alert"
                          : s.pctRising >= 30
                          ? "bg-amber-50 text-warning"
                          : "bg-emerald-50 text-success"
                      }`}
                    >
                      {s.pctRising}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Rising Hotspots */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Rising Hotspot Counties
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 mb-6">
          {CANCER_INCIDENCE_DATA.hotspots.map((h) => (
            <div
              key={`${h.county}-${h.state}`}
              className="rounded-md border border-intelligence-teal/20 bg-intelligence-teal/5 px-4 py-3"
            >
              <p className="text-sm font-medium text-midnight-navy">
                {h.county}, {h.state}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-midnight-navy/70">
                <span>
                  Rate: <span className="font-semibold text-midnight-navy">{h.rate}</span>
                </span>
                <span className="font-semibold text-intelligence-teal">
                  ↑ +{h.trend}%
                </span>
                <span>~{h.cases} cases/yr</span>
              </div>
            </div>
          ))}
        </div>

        {/* Cross-link */}
        <Link
          href="/cancer-incidence"
          className="inline-flex items-center gap-1 text-sm font-semibold text-intelligence-teal hover:underline"
        >
          Explore full cancer incidence data
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>

        {/* Explanatory Note */}
        <div className="mt-4 rounded-md bg-cloud/60 px-4 py-3">
          <p className="text-xs leading-relaxed text-slate-gray">
            {CANCER_INCIDENCE_DATA.note}
          </p>
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
          Counties where cancer incidence, judicial climate, and plaintiff-friendly laws converge
        </p>

        {/* Signal Legend */}
        <div className="mb-5 flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-midnight-navy/80">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#ef4444" }} />
            Above-Avg Cancer Rate
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-midnight-navy/80">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#14b8a6" }} />
            Liberal/Moderate Judicial
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-midnight-navy/80">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#10b981" }} />
            Plaintiff-Friendly State
          </span>
        </div>

        {/* Triple-Signal Counties Table */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Triple-Signal Counties
        </h3>
        <p className="mb-3 text-xs text-slate-gray">
          All three signals present — national avg ovarian cancer rate: {CANCER_INCIDENCE_DATA.nationalAvg} per 100K
        </p>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-intelligence-teal/20">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  County, State
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  Cancer Rate
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  Trend
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  Judicial
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  PI Score
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  Avg Jury Verdict
                </th>
              </tr>
            </thead>
            <tbody>
              {TRIPLE_SIGNAL_COUNTIES.map((c) => (
                <tr
                  key={`${c.county}-${c.state}`}
                  className="border-b border-cloud/50 hover:bg-intelligence-teal/[0.04] transition-colors"
                >
                  <td className="py-3 pr-4 font-medium text-midnight-navy">
                    {c.county}, {c.state}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="inline-flex items-center gap-1.5 font-mono text-midnight-navy">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#ef4444" }} />
                      {c.cancerRate}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-intelligence-teal font-semibold text-xs">
                      {c.trend === "Rising" ? "↑ Rising" : c.trend === "Falling" ? "↓ Falling" : "→ Stable"}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-intelligence-teal/10 px-2 py-0.5 text-xs font-medium text-intelligence-teal">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#14b8a6" }} />
                      {c.judicial}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-midnight-navy">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#10b981" }} />
                      {c.piScore}
                    </span>
                  </td>
                  <td className="py-3 pl-3 text-center">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        c.verdict === "Very High"
                          ? "bg-red-50 text-alert"
                          : "bg-amber-50 text-warning"
                      }`}
                    >
                      {c.verdict}
                    </span>
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
            These counties combine above-average ovarian cancer incidence with
            plaintiff-friendly legal environments — liberal or moderate judicial
            climates and states with no damage caps and high jury verdicts. Firms
            advertising in these markets may find both a larger potential claimant
            pool and more favorable litigation outcomes.
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
          <Link
            href="/cancer-incidence"
            className="inline-flex items-center gap-1 text-xs font-semibold text-intelligence-teal hover:underline"
          >
            View Cancer Incidence Data
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
                "2–3 yes/no questions + contact info. Did you use hair relaxers? Diagnosed with cancer? Cheapest but highest rejection at intake.",
            },
            {
              label: "Tier 2: Qualified Lead",
              cpl: "Mid-Range CPL",
              color: "border-warning/30 bg-amber-50",
              tagColor: "bg-warning/10 text-warning",
              details:
                "4–6 step form. Confirmed 2+ years use, qualifying diagnosis, diagnosis year, attorney check. Better conversion.",
            },
            {
              label: "Tier 3: Retainer-Ready",
              cpl: "Highest CPA",
              color: "border-alert/30 bg-red-50",
              tagColor: "bg-alert/10 text-alert",
              details:
                "10–15 step deep intake. Product brands used, frequency, duration, specific diagnosis, treatment history, symptoms, fertility impact. Most expensive but lowest fallout.",
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
          No settlements yet — litigation is pre-trial. Estimated ranges if
          causation evidence holds. Daubert ruling will be decisive — if
          plaintiffs&apos; experts survive, bellwether trials in 2027 will set
          benchmark values.
        </p>

        {/* Settlement Tiers */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Injury Type
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  Severity
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  Estimated Range
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Notes
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
                "Frequent use (>4x/year)",
                "Long duration (10+ years)",
                "Younger age at diagnosis",
                "Uterine cancer diagnosis",
                "Hysterectomy required",
                "Fertility loss",
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
                "Infrequent or short-term use",
                "Fibroids only (no cancer)",
                "Older age at diagnosis",
                "Pre-existing risk factors",
                "Weak documentation of product use",
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
              Daubert Ruling 2026
            </span>
            <ChevronRight className="w-3 h-3 text-slate-gray" />
            <span className="rounded bg-intelligence-teal/10 px-2 py-1 font-medium text-intelligence-teal">
              Bellwether Trials 2027
            </span>
            <ChevronRight className="w-3 h-3 text-slate-gray" />
            <span className="rounded bg-intelligence-teal/10 px-2 py-1 font-medium text-intelligence-teal">
              Settlement Framework 2027–2028
            </span>
            <ChevronRight className="w-3 h-3 text-slate-gray" />
            <span className="rounded bg-intelligence-teal/10 px-2 py-1 font-medium text-intelligence-teal">
              First Payments 2028+
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
              detail: "Primary channel — quiz-style lead forms targeting affected demographics",
              color: "border-blue-500/30 bg-blue-50",
            },
            {
              channel: "Google Ads/LSAs",
              detail: "High-intent search queries, pay-per-lead pricing for hair relaxer lawsuit keywords",
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
              detail: "Growing presence as litigation matures and case count increases",
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
            media addiction lawsuits (April 2026). Has not affected Hair Relaxer,
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
          Top organic search results for Hair Relaxer litigation keywords. Understanding who ranks helps assess content competition and SEO opportunity.
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
          Competitive landscape — firms with the highest advertising presence for Hair Relaxer litigation.
        </p>

        {topAdvertisers.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-slate-gray">{topAdvertisers.length} advertisers tracked</p>
              <Link
                href="/advertising/saturation/hair_relaxer"
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

        {/* Key Metro Areas */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Key Metro Areas
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
            { title: "Focus on Southeast US", detail: "Concentrate ad spend in Southeast US and major urban centers with high African American populations — Atlanta, Houston, Dallas, Memphis, Charlotte" },
            { title: "Demographic Targeting on Meta", detail: "Black women aged 25–65, beauty and hair care interest audiences, health-conscious demographics" },
            { title: "DMA-Level Focus", detail: "Atlanta, Houston, Dallas, Chicago, Detroit, Philadelphia, Washington DC, Memphis, Charlotte, New Orleans" },
            { title: "Creative Messaging", detail: "Lead with the NIH study finding (156% increased risk), name specific products, emphasize that no settlements have been reached yet to create urgency" },
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
          Data sources: NIH Sister Study (2022), Black Women&apos;s Health Study (2023),
          JPML, court filings, Meta Ad Library, Google Ads transparency data.
        </p>
      </div>

      <AskAIPanel tortContext={HAIR_RELAXER_TORT_CONTEXT} />
    </div>
  );
}
