import { assertTortAccess } from "@/lib/entitlements/guards";
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
      "AFFF / Firefighter Foam Tort Intelligence | Legal Marketing Intelligence",
    description:
      "Comprehensive advertising intelligence brief for AFFF firefighting foam (PFAS) litigation — case data, qualification criteria, settlement projections, and geographic targeting.",
  };
}

/* ── Static Data ───────────────────────────────────────────────────────── */

const AFFF_TORT_CONTEXT = {
  tortName: "AFFF / Firefighter Foam",
  injury: "Kidney Cancer, Testicular Cancer, Bladder Cancer — linked to PFAS 'forever chemicals' in AFFF firefighting foam",
  mdlNumber: "MDL 2873, D. South Carolina, Judge Richard M. Gergel",
  pendingCases: "15,222+ (April 2026)",
  settlementRange: "Water System Claims: $12.975B+ combined. Individual PI Claims: $75K–$500K per plaintiff (no global PI settlement yet)",
  estimatedCPA: "~$3,000. Comparable torts: Tylenol ~$2,550, NEC ~$4,000, Hair Relaxer ~$4,500, Depo-Provera ~$2,500–$4,500, Paraquat ~$9,950",
  bellwetherDate: "PI bellwether trials scheduling ongoing as of April 2026.",
  caseSummary: "AFFF (Aqueous Film-Forming Foam) is a firefighting suppressant used since the 1960s by military, municipal, and airport firefighters. AFFF contains per- and polyfluoroalkyl substances (PFAS)—known as 'forever chemicals'—that persist indefinitely in the environment and accumulate in human blood and tissue. The MDL 2873, consolidated in the District of South Carolina before Judge Richard M. Gergel, encompasses both water contamination claims and personal injury claims from individuals who developed cancer or other serious diseases after occupational or environmental AFFF exposure. Major defendants include 3M, DuPont/Chemours/Corteva, BASF, Johnson Controls, and Carrier/Kidde-Fenwal. Water system settlements have reached nearly $13 billion, but individual personal injury bellwether trials are still pending.",
  qualification: "Exposure Type: Occupational use of AFFF (firefighters, military personnel) OR residential/drinking water contamination near military bases, airports, or industrial sites. Duration: Minimum 6 months occupational exposure; or documented contaminated water supply. Diagnosis: Kidney cancer, testicular cancer, bladder cancer, thyroid disease, ulcerative colitis, or other PFAS-linked condition. Timing: Diagnosis during or after exposure period. Documentation: Medical records, military service records, fire department employment records, water testing results.",
  advertisingLandscape: "Stage: Mid-Late. Primary channels: Google Search/LSAs, Meta lead forms, TV, legal lead gen networks. Primary demographic: Military veterans, active-duty firefighters, municipal firefighters, airport crash-rescue crews. Key states: CA, FL, CO, AK, AR, DE, HI, MI, NC, OH, PA.",
  targetingInsights: "Primary demographic: Military veterans and firefighters aged 35–75. Key states with highest military PFAS contamination: CA, FL, CO, AK, AR, DE, HI, MI, NC, OH, PA. Metro areas: San Diego, Colorado Springs, Jacksonville FL, Fayetteville NC, Hampton Roads VA. Cross-reference PFAS Contamination Intelligence page for installation-level targeting data.",
};

const SCIENTIFIC_STUDIES = [
  {
    study: "NASEM Report",
    year: "2022",
    source: "National Academies",
    finding:
      "Confirmed PFAS exposure linked to kidney and testicular cancer, thyroid disease, elevated cholesterol.",
  },
  {
    study: "ATSDR Toxicological Profile",
    year: "2021",
    source: "ATSDR / CDC",
    finding:
      "PFOA/PFOS classified as sufficient evidence for kidney cancer in humans.",
  },
  {
    study: "EPA Health Advisory",
    year: "2022",
    source: "U.S. EPA",
    finding:
      "Lowered PFOS/PFOA advisory to near-zero (4 ppt) reflecting cancer risk.",
  },
  {
    study: "IARC (WHO)",
    year: "2023",
    source: "World Health Organization",
    finding:
      "PFOA classified Group 1 carcinogen; PFOS classified Group 2B (possibly carcinogenic).",
  },
  {
    study: "C8 Health Project (DuPont)",
    year: "2012",
    source: "Epidemiology",
    finding:
      "Probable link between PFOA exposure and kidney cancer, testicular cancer, thyroid disease, ulcerative colitis, high cholesterol, pregnancy-induced hypertension.",
  },
];

const INJURIES = [
  { injury: "Kidney Cancer (Renal Cell Carcinoma)", classification: "Primary", icd10: "C64" },
  { injury: "Testicular Cancer", classification: "Primary", icd10: "C62" },
  { injury: "Bladder Cancer", classification: "Associated", icd10: "C67" },
  { injury: "Thyroid Disease", classification: "Associated", icd10: "E01-E07" },
  { injury: "Ulcerative Colitis", classification: "Associated", icd10: "K51" },
  { injury: "Non-Hodgkin Lymphoma", classification: "Emerging", icd10: "C82-C85" },
  { injury: "Liver Cancer", classification: "Emerging", icd10: "C22" },
  { injury: "Prostate Cancer", classification: "Emerging", icd10: "C61" },
];

const CANCER_INCIDENCE_DATA = {
  cancerSites: ["Kidney & Renal Pelvis", "Bladder"],
  subtitle: "Kidney & bladder cancer incidence rates across U.S. states",
  insightText:
    "AFFF exposure is most strongly linked to kidney and bladder cancers. States with high military installation density and elevated PFAS contamination levels often show above-average incidence rates for these cancers — a correlation that strengthens plaintiff recruitment arguments.",
  kidneyNationalAvg: 18.7,
  bladderNationalAvg: 13.91,
  kidneyStates: [
    { state: "KY", avgRate: 24.1, annualCases: "2,156", pctRising: 68 },
    { state: "IA", avgRate: 22.8, annualCases: "1,421", pctRising: 72 },
    { state: "SD", avgRate: 22.3, annualCases: "396", pctRising: 65 },
    { state: "WV", avgRate: 21.9, annualCases: "928", pctRising: 70 },
    { state: "MS", avgRate: 21.5, annualCases: "1,312", pctRising: 58 },
    { state: "OH", avgRate: 21.2, annualCases: "5,442", pctRising: 74 },
    { state: "IN", avgRate: 20.8, annualCases: "3,102", pctRising: 66 },
    { state: "PA", avgRate: 20.5, annualCases: "5,891", pctRising: 62 },
  ],
  bladderStates: [
    { state: "ME", avgRate: 19.8, annualCases: "586", pctRising: 55 },
    { state: "CT", avgRate: 18.2, annualCases: "1,312", pctRising: 60 },
    { state: "NH", avgRate: 17.9, annualCases: "487", pctRising: 52 },
    { state: "VT", avgRate: 17.6, annualCases: "228", pctRising: 48 },
    { state: "RI", avgRate: 17.3, annualCases: "376", pctRising: 56 },
    { state: "PA", avgRate: 16.8, annualCases: "4,822", pctRising: 63 },
  ],
};

const TRIPLE_SIGNAL_COUNTIES = [
  { county: "San Diego County", state: "CA", cancerRate: 22.4, trend: "Rising" as const, judicial: "Moderate", piScore: 94.4, verdict: "Very High" },
  { county: "El Paso County", state: "CO", cancerRate: 21.8, trend: "Rising" as const, judicial: "Moderate", piScore: 72.2, verdict: "High" },
  { county: "Duval County", state: "FL", cancerRate: 20.9, trend: "Rising" as const, judicial: "Liberal", piScore: 77.8, verdict: "High" },
  { county: "Cumberland County", state: "NC", cancerRate: 21.2, trend: "Rising" as const, judicial: "Moderate", piScore: 73.6, verdict: "High" },
  { county: "Hampton Roads", state: "VA", cancerRate: 20.6, trend: "Rising" as const, judicial: "Moderate", piScore: 76.4, verdict: "High" },
  { county: "Anchorage", state: "AK", cancerRate: 21.1, trend: "Rising" as const, judicial: "Moderate", piScore: 70.8, verdict: "High" },
  { county: "New Castle County", state: "DE", cancerRate: 22.1, trend: "Rising" as const, judicial: "Liberal", piScore: 84.7, verdict: "Very High" },
  { county: "Washtenaw County", state: "MI", cancerRate: 20.4, trend: "Rising" as const, judicial: "Liberal", piScore: 83.3, verdict: "Very High" },
];

const TOP_PI_STATES = [
  { state: "NY", piScore: 97.2, verdict: "Very High ($1M+)", cancerRate: "20.1", key: "Pure comparative, no caps" },
  { state: "CA", piScore: 94.4, verdict: "Very High ($1M+)", cancerRate: "19.8", key: "Pure comparative, no caps" },
  { state: "DE", piScore: 84.7, verdict: "Very High", cancerRate: "22.1", key: "Major PFAS contamination state" },
  { state: "MI", piScore: 83.3, verdict: "Very High", cancerRate: "20.4", key: "Numerous contaminated bases" },
  { state: "FL", piScore: 77.8, verdict: "High", cancerRate: "19.5", key: "High military installation density" },
];

const QUALIFICATION_CRITERIA = [
  {
    criterion: "Exposure Type",
    standard: "Occupational use of AFFF (firefighters, military personnel) OR residential/drinking water contamination near military bases, airports, or industrial sites",
    notes: "Both occupational and environmental exposure qualify",
  },
  {
    criterion: "Duration",
    standard: "Minimum 6 months occupational exposure; or documented contaminated water supply",
    notes: "Longer exposure duration strengthens the claim",
  },
  {
    criterion: "Qualifying Diagnosis",
    standard: "Kidney cancer, testicular cancer, bladder cancer, thyroid disease, ulcerative colitis, or other PFAS-linked condition",
    notes: "Kidney and testicular cancer are the strongest claims",
  },
  {
    criterion: "Causation Timeline",
    standard: "Diagnosis during or after exposure period",
    notes: "Latency period for PFAS cancers can be 10–30 years",
  },
  {
    criterion: "Statute of Limitations",
    standard: "Varies by state; discovery rule often applies",
    notes: "Many states allow claims from discovery of PFAS link",
  },
  {
    criterion: "Documentation",
    standard: "Medical records, military service records, fire department employment records, water testing results",
    notes: "Military DD-214 forms and AFFF exposure logs are key evidence",
  },
];

const SCREENING_QUESTIONS = [
  "Who is the claimant? (You or loved one)",
  "What was your occupation? (Firefighter, military, airport crew, etc.)",
  "Did you use or handle AFFF firefighting foam?",
  "How long were you exposed to AFFF? (Duration in years)",
  "Where were you stationed or employed? (Base/installation name)",
  "Did you drink water from wells near military bases or airports?",
  "Have you been diagnosed with kidney cancer, testicular cancer, bladder cancer, thyroid disease, or ulcerative colitis?",
  "When were you diagnosed?",
  "Treatment received? (Surgery, chemotherapy, radiation, etc.)",
  "Already have an attorney?",
];

const DISQUALIFIERS = [
  "No occupational or environmental AFFF/PFAS exposure",
  "Exposure less than 6 months with no water contamination",
  "No qualifying cancer or disease diagnosis",
  "Diagnosis existed before AFFF exposure",
  "Already represented by another attorney",
];

const LITIGATION_TIMELINE = [
  { date: "December 2018", event: "MDL 2873 created, consolidated in D.S.C. before Judge Gergel", short: "MDL 2873 Created" },
  { date: "June 2023", event: "3M announces $10.3B water system settlement", short: "3M $10.3B Settlement" },
  { date: "June 2023", event: "DuPont/Chemours/Corteva announce $1.185B water settlement", short: "DuPont $1.185B Settlement" },
  { date: "December 2023", event: "Carrier Global $615M water settlement", short: "Carrier $615M Settlement" },
  { date: "April 2024", event: "New Jersey $875M PFAS settlement", short: "NJ $875M Settlement" },
  { date: "October 2025", event: "Personal injury bellwether trial selection pushed past this date", short: "PI Bellwether Delayed" },
  { date: "April 2026", event: "15,222+ cases pending; PI bellwether scheduling ongoing", short: "15,222+ Cases Pending" },
  { date: "2026–2027 (projected)", event: "PI bellwether trials expected to begin", short: "PI Bellwether Trials", future: true },
];

const SETTLEMENT_TIERS = [
  {
    tier: "Water System Claims",
    severity: "Resolved",
    range: "$12.975B+",
    factors: "3M ($10.3B) + DuPont/Chemours/Corteva ($1.185B) + Carrier ($615M) + NJ ($875M). Substantially resolved.",
  },
  {
    tier: "Kidney Cancer (PI)",
    severity: "High",
    range: "$200K – $500K",
    factors: "Strongest individual PI claims; supported by IARC Group 1 carcinogen classification for PFOA.",
  },
  {
    tier: "Testicular Cancer (PI)",
    severity: "High",
    range: "$200K – $500K",
    factors: "Strong scientific evidence from C8 Health Project and NASEM report.",
  },
  {
    tier: "Bladder Cancer (PI)",
    severity: "Moderate",
    range: "$100K – $300K",
    factors: "Associated injury; supported by epidemiological data but less direct evidence.",
  },
  {
    tier: "Other PFAS Conditions",
    severity: "Varies",
    range: "$75K – $200K",
    factors: "Thyroid disease, ulcerative colitis; lower values but high volume potential.",
  },
];

const COMPARATIVE_CPA = [
  { tort: "Tylenol", stage: "Early", cpa: "~$2,550", settlement: "$60–90K" },
  { tort: "Depo-Provera", stage: "Early-mid", cpa: "~$2,500–$4,500", settlement: "TBD ($100K–$1.5M)" },
  { tort: "PFAS (AFFF)", stage: "Mid-late", cpa: "~$3,000", settlement: "$75K–$500K", highlight: true },
  { tort: "NEC Formula", stage: "Mid", cpa: "~$4,000", settlement: "$100–300K" },
  { tort: "Hair Relaxer", stage: "Early", cpa: "~$4,500", settlement: "$90K–$1M" },
  { tort: "Paraquat", stage: "Mid-late", cpa: "~$9,950", settlement: "$105–250K" },
];

const GEOGRAPHIC_TARGETING = {
  primaryDemographic: "Military veterans, active-duty firefighters, municipal firefighters, airport crash-rescue crews",
  ageRange: "35–75 (reflecting latency period for cancer development)",
  regionalFocus: "States with highest military PFAS contamination: CA, FL, CO, AK, AR, DE, HI, MI, NC, OH, PA",
  keyMetros: [
    "San Diego, CA",
    "Colorado Springs, CO",
    "Jacksonville, FL",
    "Fayetteville, NC",
    "Hampton Roads, VA",
    "Anchorage, AK",
    "Dover, DE",
    "Detroit, MI",
    "Honolulu, HI",
    "Columbus, OH",
  ],
};

const TRACKED_KEYWORDS = [
  { keyword: "AFFF lawsuit", volume: "27,100", difficulty: "High" as const, cpc: "$42.00" },
  { keyword: "firefighter foam cancer", volume: "14,800", difficulty: "High" as const, cpc: "$38.50" },
  { keyword: "PFAS lawsuit", volume: "12,100", difficulty: "High" as const, cpc: "$35.80" },
  { keyword: "AFFF cancer lawsuit", volume: "8,100", difficulty: "Medium" as const, cpc: "$40.20" },
  { keyword: "firefighting foam settlement", volume: "6,600", difficulty: "Medium" as const, cpc: "$32.00" },
  { keyword: "AFFF settlement amounts", volume: "4,400", difficulty: "Medium" as const, cpc: "$28.40" },
];

const KEY_DEFENDANTS = [
  "3M Company",
  "DuPont de Nemours / Chemours / Corteva",
  "BASF Corporation",
  "Tyco Fire Products (Johnson Controls)",
  "Carrier Global / Kidde-Fenwal",
  "Dynax Corporation",
  "National Foam / Angus Fire",
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

const TORT_SLUG = "firefighter_foam";

export default async function AfffPage() {

  // Gate on the account's purchased tort add-ons (tort-keyed surface).
  const denied = await assertTortAccess("afff-firefighting-foam");
  if (denied) return denied;
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
  const tortLabel = "AFFF";
  const tortLabelLower = tortLabel.toLowerCase();
  const tortLabelWords = tortLabelLower.split(/[\s\/,]+/).filter(Boolean);
  const benchmark = benchmarks
    .sort((a, b) => b.observed_date.localeCompare(a.observed_date))
    .find((b) => {
      const bName = b.tort_name.toLowerCase();
      if (bName === tortLabelLower) return true;
      if (bName.includes(tortLabelLower) || tortLabelLower.includes(bName)) return true;
      if (bName.includes("firefight") || bName.includes("pfas")) return true;
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
            AFFF / Firefighter Foam
          </h1>
          <span className="rounded-full bg-emerald-50 border border-success/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-success">
            Active MDL
          </span>
        </div>
        <p className="mt-1 text-lg text-slate-gray">
          Aqueous Film-Forming Foam (AFFF) Litigation Intelligence — MDL-2873
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
              Pending Cases
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">15,222+</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">MDL 2873, D. South Carolina</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <DollarSign className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Water Settlements
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">$12.975B+</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Combined (3M + DuPont + Carrier + NJ)</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Individual PI Estimate
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy text-lg">$75K – $500K</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Per plaintiff (no global PI settlement yet)</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Status
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy text-lg">PI Bellwethers Pending</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Judge Richard M. Gergel, D.S.C.</p>
        </div>
      </div>

      {/* ── 3. Case Summary ─────────────────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-4">
          Case Summary
        </h2>
        <div className="space-y-4 text-sm leading-relaxed text-midnight-navy/80">
          <p>
            AFFF (Aqueous Film-Forming Foam) is a firefighting suppressant used
            since the 1960s by military, municipal, and airport firefighters.
            AFFF contains per- and polyfluoroalkyl substances (PFAS)—known as
            &ldquo;forever chemicals&rdquo;—that persist indefinitely in the
            environment and accumulate in human blood and tissue.
          </p>
          <p>
            The MDL 2873, consolidated in the District of South Carolina before
            Judge Richard M. Gergel, encompasses both water contamination claims
            and personal injury claims from individuals who developed cancer or
            other serious diseases after occupational or environmental AFFF
            exposure. Water system settlements have reached nearly $13 billion,
            but individual personal injury bellwether trials are still pending.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Key Defendants
            </p>
            <p className="text-sm text-midnight-navy">
              {KEY_DEFENDANTS.join(", ")}
            </p>
          </div>
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Legal Theories
            </p>
            <p className="text-sm text-midnight-navy">
              Strict liability, failure to warn, negligent design, negligence,
              public nuisance, unjust enrichment.
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
          PFAS chemicals in AFFF persist in the human body for years and have
          been linked to multiple cancers and serious health conditions.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Injury
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  Classification
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  ICD-10
                </th>
              </tr>
            </thead>
            <tbody>
              {INJURIES.map((inj) => (
                <tr
                  key={inj.injury}
                  className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                >
                  <td className="py-3 pr-4 font-medium text-midnight-navy">
                    {inj.injury}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        inj.classification === "Primary"
                          ? "bg-red-50 text-alert"
                          : inj.classification === "Associated"
                          ? "bg-amber-50 text-warning"
                          : "bg-slate-50 text-slate-gray"
                      }`}
                    >
                      {inj.classification}
                    </span>
                  </td>
                  <td className="py-3 pl-3 text-center font-mono text-xs text-midnight-navy/70">
                    {inj.icd10}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            The IARC classification of PFOA as a Group 1 carcinogen (2023)
            significantly strengthened the scientific basis for individual PI
            claims. Combined with the C8 Health Project&apos;s probable link
            findings and the NASEM report, the evidentiary foundation for AFFF
            cancer claims is among the strongest in active mass torts.
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

        {/* National Benchmarks */}
        <div className="mb-5 flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-intelligence-teal/10 px-3 py-1 text-sm font-semibold text-intelligence-teal">
            Kidney Avg: {CANCER_INCIDENCE_DATA.kidneyNationalAvg} per 100K
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-intelligence-teal/10 px-3 py-1 text-sm font-semibold text-intelligence-teal">
            Bladder Avg: {CANCER_INCIDENCE_DATA.bladderNationalAvg} per 100K
          </span>
        </div>

        {/* Kidney Cancer States Table */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Kidney &amp; Renal Pelvis — Above-Average States
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
              {CANCER_INCIDENCE_DATA.kidneyStates.map((s) => (
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

        {/* Bladder Cancer States Table */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Bladder — Above-Average States
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
              {CANCER_INCIDENCE_DATA.bladderStates.map((s) => (
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

        {/* Cross-link to PFAS page */}
        <Link
          href="/advertising/pfas-contamination"
          className="inline-flex items-center gap-1 text-sm font-semibold text-intelligence-teal hover:underline"
        >
          View PFAS Contamination Intelligence
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>

        {/* Explanatory Note */}
        <div className="mt-4 rounded-md bg-cloud/60 px-4 py-3">
          <p className="text-xs leading-relaxed text-slate-gray">
            {CANCER_INCIDENCE_DATA.insightText}
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
          All three signals present — national avg kidney cancer rate: {CANCER_INCIDENCE_DATA.kidneyNationalAvg} per 100K
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
            These counties combine above-average kidney cancer incidence with
            plaintiff-friendly legal environments — liberal or moderate judicial
            climates and states with favorable PI statutes. Firms advertising
            in these markets near contaminated military installations may find
            both a larger potential claimant pool and more favorable litigation
            outcomes.
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
          <Link
            href="/advertising/pfas-contamination"
            className="inline-flex items-center gap-1 text-xs font-semibold text-intelligence-teal hover:underline"
          >
            View PFAS Contamination Data
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
                "2–3 yes/no questions + contact info. Were you a firefighter/military? Exposed to AFFF? Diagnosed with cancer? Cheapest but highest rejection at intake.",
            },
            {
              label: "Tier 2: Qualified Lead",
              cpl: "Mid-Range CPL",
              color: "border-warning/30 bg-amber-50",
              tagColor: "bg-warning/10 text-warning",
              details:
                "4–6 step form. Confirmed AFFF exposure, duration, qualifying diagnosis, diagnosis year, attorney check. Better conversion.",
            },
            {
              label: "Tier 3: Retainer-Ready",
              cpl: "Highest CPA",
              color: "border-alert/30 bg-red-50",
              tagColor: "bg-alert/10 text-alert",
              details:
                "10–15 step deep intake. Installation/base name, years of service, AFFF frequency, specific diagnosis, treatment history, water testing results. Most expensive but lowest fallout.",
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
          Water system claims are substantially resolved ($12.975B+). Individual
          PI claims have no global settlement yet — bellwether trials will set
          benchmark values. Kidney and testicular cancer claims are expected to
          command the highest individual values.
        </p>

        {/* Settlement Tiers */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Claim Type
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  Status
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
                          : t.severity === "Resolved"
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
                "Kidney or testicular cancer diagnosis",
                "Long occupational AFFF exposure (10+ years)",
                "Military service at highly contaminated base",
                "Multiple cancer diagnoses",
                "Strong documentation (DD-214, exposure logs)",
                "Plaintiff-friendly jurisdiction",
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
                "Short exposure duration (<6 months)",
                "Emerging (not primary) cancer type",
                "Weak documentation of exposure",
                "Pre-existing risk factors (smoking for bladder cancer)",
                "Unfavorable jurisdiction",
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
              PI Bellwethers 2026–2027
            </span>
            <ChevronRight className="w-3 h-3 text-slate-gray" />
            <span className="rounded bg-intelligence-teal/10 px-2 py-1 font-medium text-intelligence-teal">
              Bellwether Verdicts 2027
            </span>
            <ChevronRight className="w-3 h-3 text-slate-gray" />
            <span className="rounded bg-intelligence-teal/10 px-2 py-1 font-medium text-intelligence-teal">
              PI Settlement Framework 2027–2028
            </span>
            <ChevronRight className="w-3 h-3 text-slate-gray" />
            <span className="rounded bg-intelligence-teal/10 px-2 py-1 font-medium text-intelligence-teal">
              First PI Payments 2028+
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
              channel: "Google Ads/LSAs",
              detail: "Primary channel — high-intent search queries for AFFF lawsuit, firefighter foam cancer keywords",
              color: "border-emerald-500/30 bg-emerald-50",
            },
            {
              channel: "Meta (Facebook/Instagram)",
              detail: "Veteran and firefighter audience targeting, lead generation forms",
              color: "border-blue-500/30 bg-blue-50",
            },
            {
              channel: "TV",
              detail: "Growing presence as PI bellwethers approach — broad reach for veteran demographics",
              color: "border-indigo-500/30 bg-indigo-50",
            },
            {
              channel: "Legal Lead Gen Networks",
              detail: "Per-lead or per-retainer pricing through legal lead generation networks",
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
          Top organic search results for AFFF litigation keywords. Understanding who ranks helps assess content competition and SEO opportunity.
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
          Competitive landscape — firms with the highest advertising presence for AFFF litigation.
        </p>

        {topAdvertisers.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-slate-gray">{topAdvertisers.length} advertisers tracked</p>
              <Link
                href="/advertising/saturation/firefighter_foam"
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
            { title: "Focus on Military Installation Areas", detail: "Concentrate ad spend near bases with documented PFAS contamination — San Diego, Colorado Springs, Jacksonville, Fayetteville, Hampton Roads" },
            { title: "Veteran & Firefighter Targeting", detail: "Military veterans aged 35–75, active-duty and municipal firefighters, airport crash-rescue crews — use veteran-interest audiences on Meta and Google" },
            { title: "Cross-Reference PFAS Data", detail: "Use PFAS Contamination Intelligence page to identify bases with extreme contamination levels for hyper-local geographic targeting" },
            { title: "Creative Messaging", detail: "Lead with PFAS 'forever chemicals' angle, reference $12.975B in water settlements already paid, emphasize individual PI claims still pending — creates urgency" },
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
          Data sources: NASEM (2022), ATSDR (2021), EPA (2022), IARC/WHO (2023),
          C8 Health Project (2012), JPML, court filings, Meta Ad Library, Google
          Ads transparency data.
        </p>
      </div>

      <NewLandingPagesCard tortSlug="afff-firefighting-foam" tortLabel="AFFF / Firefighter Foam" />
      <AskAIPanel tortContext={AFFF_TORT_CONTEXT} />
    </div>
  );
}
