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

/* -- Metadata ------------------------------------------------------------ */

export function generateMetadata() {
  return {
    title:
      "Roundup (Glyphosate) Tort Intelligence | Legal Marketing Intelligence",
    description:
      "Comprehensive advertising intelligence brief for Roundup glyphosate litigation — case data, qualification criteria, settlement projections, and geographic targeting.",
  };
}

/* -- Static Data --------------------------------------------------------- */

const ROUNDUP_TORT_CONTEXT = {
  tortName: "Roundup (Glyphosate)",
  injury: "Non-Hodgkin Lymphoma (NHL) — cancer of the lymphatic system",
  mdlNumber: "MDL 2741, N.D. California, Judge Vince Chhabria",
  pendingCases: "3,887+ in MDL (March 2026), ~61,000 additional active state court cases. ~100,000 claims already settled for $11B+.",
  settlementRange: "$5K–$250K per individual claim. Tier 1 (Severe/Terminal): $200K–$250K+, Tier 2 (Moderate): $100K–$200K, Tier 3 (Lower): $50K–$100K, Tier 4 (Minimal/Class): $10K–$50K. $7.25B class settlement proposed Feb 2026.",
  estimatedCPA: "$2,500–$3,500. Comparable torts: Depo-Provera ~$2,500–$4,500, Tylenol ~$2,550, PFAS ~$3,000, NEC ~$4,000, Hair Relaxer ~$4,500, Paraquat ~$9,950",
  bellwetherDate: "N/A — litigation is late-stage. $7.25B class settlement prelim approved March 2026. SCOTUS preemption decision expected June 2026. Fairness hearing July 2026.",
  caseSummary: "Roundup is a glyphosate-based herbicide manufactured by Monsanto (acquired by Bayer in 2018). Over 170,000 plaintiffs allege prolonged exposure caused NHL. MDL 2741 in N.D. California. Bayer has settled ~100,000 claims for $11B+. In Feb 2026, Bayer proposed a $7.25B class settlement. SCOTUS is hearing Bayer's preemption appeal (Durnell case) with a decision expected summer 2026. Key studies: IARC 2015 Group 2A 'probably carcinogenic', Zhang 2019 meta-analysis 41% increased NHL risk. EPA maintains 'not likely carcinogenic.'",
  qualification: "Product: Roundup or any glyphosate-based herbicide. Minimum 40 hours lifetime use OR 3+ years regular use. Occupational users (farmers, landscapers) have strongest claims. Diagnosis: NHL or related subtype. Not currently represented. SOL: 2–3 years from diagnosis. Three screening tiers: Tier 1 Basic (2–3 questions, lowest CPL), Tier 2 Qualified (4–6 steps, mid CPL), Tier 3 Retainer-Ready (full intake, highest CPA but lowest fallout).",
  advertisingLandscape: "Stage: Late-stage (winding down). ~15 active Meta ads from ~8 advertisers. ~25 Google Ads from ~12 advertisers. ~5 TikTok ads from ~3 advertisers. Most firms paused due to class settlement + SCOTUS uncertainty. Peak was 2019–2021. CPA ~$2,500–$3,500. New ad spend not recommended until after June 2026. Firms with existing inventory hold cases worth $50K–$250K each at ~$3,000 CPA.",
  targetingInsights: "Occupational exposure drives strongest claims — agricultural workers, landscapers, groundskeepers. Residential users (homeowners using Roundup 3+ years) also qualify. Age 40–75, male skew. Top glyphosate states: Iowa, Illinois, Kansas, Texas, Minnesota, Indiana, Nebraska, Ohio, Missouri, Wisconsin. High-value crossover states (high glyphosate + high NHL): Iowa, Wisconsin, Minnesota, Ohio, Kentucky, Nebraska, Illinois, Missouri, Kansas, Michigan. Key DMAs: Des Moines, Minneapolis–St. Paul, Milwaukee, Cleveland/Columbus, St. Louis, Kansas City, Omaha, Louisville.",
};

const SCIENTIFIC_STUDIES = [
  {
    study: "IARC Monograph (Working Group)",
    year: "2015",
    source: "WHO/IARC",
    finding:
      "Classified glyphosate as \"probably carcinogenic to humans\" (Group 2A). Based on \"limited\" evidence in humans and \"sufficient\" evidence in animals.",
  },
  {
    study: "Zhang et al. (UW meta-analysis)",
    year: "2019",
    source: "Mutation Research",
    finding:
      "41% increased risk of NHL with high glyphosate exposure (meta-analysis of 6 studies)",
  },
  {
    study: "Andreotti et al. (Agricultural Health Study)",
    year: "2018",
    source: "JNCI",
    finding:
      "No statistically significant association between glyphosate and NHL overall in 54,000+ pesticide applicators",
  },
  {
    study: "Weisenburger (review)",
    year: "2021",
    source: "Clin Lymphoma",
    finding:
      "\"Coherent and compelling evidence\" that glyphosate/GBFs are a cause of NHL",
  },
  {
    study: "EPA Interim Decision",
    year: "2020",
    source: "U.S. EPA",
    finding:
      "\"Not likely to be carcinogenic to humans\" — contradicts IARC classification",
  },
];

const CANCER_INCIDENCE_DATA = {
  cancerSite: "Non-Hodgkin Lymphoma",
  subtitle: "Non-Hodgkin Lymphoma incidence rates across U.S. counties",
  nationalAvg: 20.3,
  states: [
    { state: "ME", avgRate: 28.1, annualCases: "572", pctRising: 31 },
    { state: "NH", avgRate: 26.3, annualCases: "503", pctRising: 20 },
    { state: "NY", avgRate: 25.3, annualCases: "5,340", pctRising: 21 },
    { state: "CT", avgRate: 24.6, annualCases: "1,145", pctRising: 25 },
    { state: "KY", avgRate: 23.8, annualCases: "1,188", pctRising: 31 },
    { state: "IA", avgRate: 23.5, annualCases: "864", pctRising: 42 },
    { state: "OH", avgRate: 22.5, annualCases: "3,378", pctRising: 44 },
    { state: "PA", avgRate: 22.2, annualCases: "3,855", pctRising: 17 },
    { state: "MI", avgRate: 22.1, annualCases: "2,771", pctRising: 29 },
    { state: "IL", avgRate: 21.9, annualCases: "3,068", pctRising: 27 },
  ],
  hotspots: [
    { county: "Niagara County", state: "NY", rate: 32.0, trend: 0.7, cases: 100 },
    { county: "Ocean County", state: "NJ", rate: 27.5, trend: 1.2, cases: 285 },
    { county: "New London County", state: "CT", rate: 27.5, trend: 0.2, cases: 105 },
    { county: "Cayuga County", state: "NY", rate: 29.5, trend: 1.0, cases: 32 },
    { county: "Jefferson County", state: "NY", rate: 28.7, trend: 0.2, cases: 36 },
    { county: "Morgan County", state: "IN", rate: 27.7, trend: 1.3, cases: 26 },
  ],
  note: "Non-Hodgkin Lymphoma is the primary cancer linked to glyphosate (Roundup) exposure. Agricultural and suburban communities with regular glyphosate use may see elevated rates. Counties with above-average incidence and rising trends may represent areas with larger potential claimant pools. Source: CDC/NCI USCS cancer statistics.",
};

const TRIPLE_SIGNAL_COUNTIES = [
  { county: "Niagara County", state: "NY", cancerRate: 32.0, trend: "Rising" as const, judicial: "Liberal", piScore: 97.2, verdict: "Very High ($1M+)" },
  { county: "Kitsap County", state: "WA", cancerRate: 26.0, trend: "Rising" as const, judicial: "Liberal", piScore: 97.2, verdict: "Very High" },
  { county: "Erie County (Buffalo)", state: "NY", cancerRate: 25.4, trend: "Falling" as const, judicial: "Liberal", piScore: 97.2, verdict: "Very High ($1M+)" },
  { county: "St. Louis County", state: "MN", cancerRate: 25.4, trend: "Rising" as const, judicial: "Liberal", piScore: 88.9, verdict: "High" },
  { county: "Pike County", state: "KY", cancerRate: 24.9, trend: "Rising" as const, judicial: "Liberal", piScore: 87.5, verdict: "High" },
  { county: "Rock County", state: "WI", cancerRate: 24.7, trend: "Rising" as const, judicial: "Liberal", piScore: 80.6, verdict: "High" },
  { county: "Madison County", state: "IN", cancerRate: 23.9, trend: "Rising" as const, judicial: "Liberal", piScore: 76.4, verdict: "Moderate" },
  { county: "Madison County", state: "IL", cancerRate: 22.2, trend: "Stable" as const, judicial: "Liberal", piScore: 87.5, verdict: "Very High" },
];

const TOP_PI_STATES = [
  { state: "NY", piScore: 97.2, verdict: "Very High ($1M+)", cancerRate: "25.3", key: "Pure comparative, no caps" },
  { state: "WA", piScore: 97.2, verdict: "Very High", cancerRate: "20.3", key: "Pure comparative, no caps" },
  { state: "MN", piScore: 88.9, verdict: "High", cancerRate: "22.3", key: "No punitive cap" },
  { state: "KY", piScore: 87.5, verdict: "High", cancerRate: "23.8", key: "Pure comparative, no caps" },
  { state: "IL", piScore: 87.5, verdict: "Very High", cancerRate: "21.9", key: "No caps, MDL-favorable" },
];

const QUALIFICATION_CRITERIA = [
  {
    criterion: "Product",
    standard: "Roundup or any glyphosate-based herbicide",
    notes: "Includes all Roundup formulations and generic glyphosate products",
  },
  {
    criterion: "Minimum Exposure",
    standard: "At least 40 hours lifetime use OR 3+ years of regular use",
    notes: "Occupational users (landscapers, farmers) have strongest claims",
  },
  {
    criterion: "Exposure Type",
    standard: "Occupational or residential",
    notes: "Occupational claimants receive higher settlement tiers",
  },
  {
    criterion: "Diagnosis",
    standard: "Non-Hodgkin lymphoma or related subtype",
    notes: "DLBCL, follicular lymphoma, CLL, mantle cell, etc.",
  },
  {
    criterion: "Diagnosis Timing",
    standard: "After exposure period",
    notes: "Latency can be 5–20+ years",
  },
  {
    criterion: "Existing Representation",
    standard: "Not currently represented",
    notes: "Standard disqualifier",
  },
  {
    criterion: "Statute of Limitations",
    standard: "2–3 years from diagnosis (varies by state)",
    notes: "Some states have discovery rule exceptions",
  },
];

const SCREENING_QUESTIONS = [
  "Did you use Roundup or a glyphosate weedkiller?",
  "How many years did you use it? (Minimum 3 years)",
  "Was your use occupational or residential?",
  "How often did you use it? (Weekly, monthly, seasonally)",
  "Have you been diagnosed with non-Hodgkin lymphoma or another blood cancer?",
  "When were you diagnosed?",
  "What type of NHL? (If known)",
  "What treatment have you received?",
  "Do you currently have an attorney for this claim?",
  "What state do you reside in?",
];

const DISQUALIFIERS = [
  "Never used Roundup/glyphosate products",
  "Less than 40 hours total lifetime exposure / less than 3 years use",
  "No NHL or blood cancer diagnosis",
  "Cancer diagnosis preceded Roundup exposure",
  "Already represented by an attorney",
  "Statute of limitations expired",
];

const LITIGATION_TIMELINE = [
  { date: "1974", event: "Glyphosate first registered as herbicide by EPA", short: "Glyphosate Registered" },
  { date: "1996", event: "Roundup Ready GMO crops introduced; glyphosate usage surges", short: "Roundup Ready Launch" },
  { date: "March 2015", event: "IARC classifies glyphosate as 'probably carcinogenic' (Group 2A)", short: "IARC: Probably Carcinogenic" },
  { date: "2016", event: "MDL 2741 established in N.D. California; Judge Chhabria assigned", short: "MDL 2741 Established" },
  { date: "June 2018", event: "Bayer acquires Monsanto for $63 billion", short: "Bayer Acquires Monsanto" },
  { date: "August 2018", event: "Johnson v. Monsanto: first trial, $289M verdict (reduced to $78M)", short: "First Verdict: $289M" },
  { date: "March 2019", event: "Hardeman v. Monsanto: $80M federal verdict", short: "Hardeman: $80M" },
  { date: "May 2019", event: "Pilliod v. Monsanto: $2B verdict (reduced to $87M on appeal)", short: "Pilliod: $2B" },
  { date: "June 2020", event: "Bayer announces $10.9B global settlement (~100K claims)", short: "$10.9B Settlement" },
  { date: "Nov 2023", event: "Missouri jury awards $1.5B (reduced to $611M on appeal)", short: "$1.5B Missouri Verdict" },
  { date: "Feb 2024", event: "Philadelphia jury awards $2.25B (reduced to $400M)", short: "$2.25B Philly Verdict" },
  { date: "March 2025", event: "Georgia jury awards $2B ($65M compensatory + $2B punitive)", short: "$2B Georgia Verdict" },
  { date: "May 2025", event: "Pennsylvania court upholds $175M Caranci verdict", short: "$175M Upheld" },
  { date: "June 2025", event: "Missouri court upholds $611M verdict for 3 plaintiffs", short: "$611M Upheld" },
  { date: "Aug 2025", event: "Bayer reserves additional $1.4B for Roundup litigation", short: "$1.4B Reserve Added" },
  { date: "Jan 2026", event: "SCOTUS agrees to hear Bayer's preemption appeal (Durnell case)", short: "SCOTUS Takes Case" },
  { date: "Feb 2026", event: "Bayer proposes $7.25B class settlement for current + future claims", short: "$7.25B Settlement Proposed" },
  { date: "March 2026", event: "Missouri judge grants preliminary approval of $7.25B settlement", short: "Settlement Prelim Approved" },
  { date: "April 2026", event: "SCOTUS oral arguments on federal preemption", short: "SCOTUS Arguments", future: true },
  { date: "June 2026", event: "Opt-out deadline June 4; SCOTUS decision expected", short: "Opt-Out / SCOTUS Decision", future: true },
  { date: "July 2026", event: "Fairness hearing scheduled for class settlement approval", short: "Fairness Hearing", future: true },
];

const SETTLEMENT_TIERS = [
  {
    tier: "Tier 1: Severe / Terminal",
    severity: "High",
    range: "$200K – $250K+",
    factors:
      "Occupational exposure, aggressive NHL (DLBCL), terminal diagnosis, long duration (10+ years), significant medical costs, lost earning capacity",
  },
  {
    tier: "Tier 2: Moderate",
    severity: "Moderate",
    range: "$100K – $200K",
    factors:
      "Significant exposure, NHL diagnosis with treatment, moderate severity, good documentation",
  },
  {
    tier: "Tier 3: Lower",
    severity: "Mild",
    range: "$50K – $100K",
    factors:
      "Residential exposure, indolent NHL, treatable condition, moderate documentation",
  },
  {
    tier: "Tier 4: Minimal / Class",
    severity: "Lowest",
    range: "$10K – $50K",
    factors:
      "Class settlement tier: residential claimants, older age, indolent NHL, limited documentation",
  },
];

const CLASS_SETTLEMENT_TIERS = [
  { category: "Occupational, under 60, aggressive NHL", avgPayout: "$165,000" },
  { category: "Occupational, 60–77, aggressive NHL", avgPayout: "$105,000" },
  { category: "Occupational, under 60, indolent NHL", avgPayout: "$85,000" },
  { category: "Occupational, 60–77, indolent NHL", avgPayout: "$60,000" },
  { category: "Residential, under 60, aggressive NHL", avgPayout: "$40,000" },
  { category: "Residential, 60–77, aggressive NHL", avgPayout: "$30,000" },
  { category: "Residential, under 60, indolent NHL", avgPayout: "$25,000" },
  { category: "Residential, 60–77, indolent NHL", avgPayout: "$20,000" },
  { category: "Any, age 78+", avgPayout: "$10,000" },
];

/* AD_METRICS removed — now sourced from Supabase live queries */

const COMPARATIVE_CPA = [
  { tort: "Roundup", stage: "Late", cpa: "~$2,500–$3,500", settlement: "$5K–$250K", highlight: true },
  { tort: "Depo-Provera", stage: "Early-mid", cpa: "~$2,500–$4,500", settlement: "$100K–$1.5M" },
  { tort: "Tylenol", stage: "Early", cpa: "~$2,550", settlement: "$60–90K" },
  { tort: "PFAS (AFFF)", stage: "Mid-late", cpa: "~$3,000", settlement: "$75–175K" },
  { tort: "NEC Formula", stage: "Mid", cpa: "~$4,000", settlement: "$100–300K" },
  { tort: "Hair Relaxer", stage: "Early", cpa: "~$4,500", settlement: "$75–125K" },
  { tort: "Paraquat", stage: "Mid-late", cpa: "~$9,950", settlement: "$105–250K" },
];

const TRACKED_KEYWORDS = [
  { keyword: "roundup lawsuit", volume: "74,000", difficulty: "High" as const, cpc: "$38.50" },
  { keyword: "roundup settlement", volume: "49,500", difficulty: "High" as const, cpc: "$32.00" },
  { keyword: "roundup cancer", volume: "33,100", difficulty: "High" as const, cpc: "$28.75" },
  { keyword: "roundup lawsuit payout", volume: "22,200", difficulty: "Medium" as const, cpc: "$35.40" },
  { keyword: "roundup lawyer", volume: "14,800", difficulty: "High" as const, cpc: "$48.00" },
  { keyword: "roundup non hodgkin lymphoma", volume: "8,100", difficulty: "Medium" as const, cpc: "$42.50" },
];

/* PAID_AD_DATA, SAMPLE_ADS, TOP_FIRMS removed — now sourced from Supabase live queries */

const EXPOSURE_PROFILES = [
  {
    group: "Agricultural Workers",
    detail: "Farmers, farmhands, crop dusters — highest exposure, strongest claims, highest settlement tiers",
  },
  {
    group: "Landscapers / Groundskeepers",
    detail: "Professional applicators with regular occupational exposure",
  },
  {
    group: "Residential Users",
    detail: "Homeowners who used Roundup on lawns/gardens regularly for 3+ years",
  },
  {
    group: "General Characteristics",
    detail: "Age 40–75, male skew, NHL demographics — more common in men and non-Hispanic Whites, incidence increases with age",
  },
];

const STATE_GLYPHOSATE = [
  { rank: 1, state: "Iowa", usage: "20M+ lbs", crops: "Corn, soybeans", nhlRate: "14.9", signal: "HIGH" as const },
  { rank: 2, state: "Illinois", usage: "20M+ lbs", crops: "Corn, soybeans", nhlRate: "12.7", signal: "HIGH" as const },
  { rank: 3, state: "Kansas", usage: "20M+ lbs", crops: "Wheat, soybeans, sorghum", nhlRate: "12.3", signal: "HIGH" as const },
  { rank: 4, state: "Texas", usage: "20M+ lbs", crops: "Cotton, corn, sorghum", nhlRate: "11.0", signal: "MED-HI" as const },
  { rank: 5, state: "Minnesota", usage: "15–20M lbs", crops: "Corn, soybeans, sugar beets", nhlRate: "14.1", signal: "HIGH" as const },
  { rank: 6, state: "Indiana", usage: "15–20M lbs", crops: "Corn, soybeans", nhlRate: "N/A", signal: "HIGH" as const },
  { rank: 7, state: "Nebraska", usage: "15–20M lbs", crops: "Corn, soybeans", nhlRate: "12.8", signal: "HIGH" as const },
  { rank: 8, state: "Ohio", usage: "10–15M lbs", crops: "Corn, soybeans", nhlRate: "13.4", signal: "HIGH" as const },
  { rank: 9, state: "Missouri", usage: "10–15M lbs", crops: "Soybeans, corn", nhlRate: "12.7", signal: "HIGH" as const },
  { rank: 10, state: "Wisconsin", usage: "10–15M lbs", crops: "Corn, soybeans", nhlRate: "14.2", signal: "HIGH" as const },
  { rank: 11, state: "South Dakota", usage: "10–15M lbs", crops: "Corn, soybeans", nhlRate: "13.3", signal: "MED-HI" as const },
  { rank: 12, state: "North Dakota", usage: "10–15M lbs", crops: "Wheat, soybeans", nhlRate: "13.2", signal: "MED-HI" as const },
  { rank: 13, state: "Michigan", usage: "10–15M lbs", crops: "Corn, soybeans", nhlRate: "12.5", signal: "MED-HI" as const },
  { rank: 14, state: "Kentucky", usage: "5–10M lbs", crops: "Corn, soybeans", nhlRate: "13.6", signal: "MED-HI" as const },
  { rank: 15, state: "Pennsylvania", usage: "5–10M lbs", crops: "Corn, soybeans", nhlRate: "13.1", signal: "MED-HI" as const },
];

const CROSSOVER_STATES = [
  { state: "Iowa", usage: "20M+ lbs", nhlRate: "14.9 (highest)", dmas: "Des Moines, Cedar Rapids" },
  { state: "Wisconsin", usage: "10–15M lbs", nhlRate: "14.2", dmas: "Milwaukee, Madison" },
  { state: "Minnesota", usage: "15–20M lbs", nhlRate: "14.1", dmas: "Minneapolis–St. Paul" },
  { state: "Ohio", usage: "10–15M lbs", nhlRate: "13.4", dmas: "Cleveland, Columbus, Cincinnati" },
  { state: "Kentucky", usage: "5–10M lbs", nhlRate: "13.6", dmas: "Louisville, Lexington" },
  { state: "Nebraska", usage: "15–20M lbs", nhlRate: "12.8", dmas: "Omaha, Lincoln" },
  { state: "Illinois", usage: "20M+ lbs", nhlRate: "12.7", dmas: "Chicago, Springfield, Champaign" },
  { state: "Missouri", usage: "10–15M lbs", nhlRate: "12.7", dmas: "St. Louis, Kansas City" },
  { state: "Kansas", usage: "20M+ lbs", nhlRate: "12.3", dmas: "Wichita, Kansas City" },
  { state: "Michigan", usage: "10–15M lbs", nhlRate: "12.5", dmas: "Detroit, Grand Rapids" },
];

const TARGETING_IMPLICATIONS = [
  { title: "Concentrate in Agricultural States", detail: "Focus spend in Midwest/Great Plains: Iowa, Illinois, Minnesota, Wisconsin, Ohio, Missouri, Kansas, Nebraska, Indiana" },
  { title: "Occupational Targeting on Meta", detail: "Men 40–75, agriculture/farming interests, landscaping/lawn care professionals, rural zip codes" },
  { title: "Residential Targeting", detail: "Homeowners 45–75, lawn/garden interests, suburban zip codes in high-usage states" },
  { title: "High-Volume Search Keywords", detail: "\"Roundup lawsuit\" (74K/mo) and \"Roundup settlement\" (49K/mo) still have massive search volume" },
  { title: "DMA-Level Focus", detail: "Des Moines, Minneapolis–St. Paul, Milwaukee, Cleveland/Columbus, St. Louis, Kansas City, Omaha, Louisville" },
  { title: "Timing: Wait for Clarity", detail: "New ad spend should wait until after SCOTUS decision (expected June 2026) and class settlement opt-out deadline (June 4, 2026)" },
];

/* -- Helpers ------------------------------------------------------------- */

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

/* -- Format Helpers (from dynamic page) --------------------------------- */

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

/* -- Page ---------------------------------------------------------------- */

const TORT_SLUG = "roundup";

export default async function RoundupPage() {
  /* -- Live data fetch from Supabase ------------------------------------ */
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
  const tortLabel = "Roundup";
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
            Roundup (Glyphosate)
          </h1>
          <span className="rounded-full bg-emerald-50 border border-success/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-success">
            Active Litigation
          </span>
          <span className="rounded-full bg-amber-50 border border-warning/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-warning">
            Class Settlement Pending
          </span>
        </div>
        <p className="mt-1 text-lg text-slate-gray">
          Non-Hodgkin Lymphoma (NHL)
        </p>
        <p className="mt-0.5 text-xs text-slate-gray">
          Last Updated: April 16, 2026
        </p>
      </div>

      {/* -- 2. Key Stats Row ---------------------------------------------- */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Scale className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Pending Cases
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">3,887+</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">MDL 2741 (March 2026)</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <DollarSign className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Total Settled
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">$11B+</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">~100K claims resolved</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Settlement Range
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">$5K – $250K</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Per individual claim</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Estimated CPA
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">~$2,500 – $3,500</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Signed retainer</p>
        </div>
      </div>

      {/* -- 3. Case Summary ----------------------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-4">
          Case Summary
        </h2>
        <div className="space-y-4 text-sm leading-relaxed text-midnight-navy/80">
          <p>
            Roundup is a glyphosate-based herbicide manufactured by Monsanto
            (acquired by Bayer in 2018) and the most widely used weedkiller in
            the world. Over 170,000 plaintiffs have filed lawsuits alleging that
            prolonged exposure to Roundup caused them to develop non-Hodgkin
            lymphoma (NHL) and that Monsanto knew about the cancer risk but
            failed to warn consumers.
          </p>
          <p>
            The litigation is consolidated as MDL No. 2741 in the U.S. District
            Court for the Northern District of California under Judge Vince
            Chhabria. As of March 2026, approximately 3,887 cases remain pending
            in the MDL, with roughly 61,000 additional active cases in state
            courts across the country. Bayer has already settled approximately
            100,000 claims for over $11 billion.
          </p>
          <p>
            In February 2026, Bayer proposed a $7.25 billion class-action
            settlement (preliminarily approved March 2026) to resolve both
            current and future claims over a 17–21 year period. Separately, the
            U.S. Supreme Court is hearing Bayer&apos;s preemption appeal (Durnell
            case), with arguments in April 2026 and a decision expected by summer
            2026. Bayer argues that federal pesticide law (FIFRA) preempts state
            failure-to-warn claims because EPA-approved labels could not legally
            add a cancer warning.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Defendants
            </p>
            <p className="text-sm text-midnight-navy">
              Bayer AG, Monsanto Company
            </p>
          </div>
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Legal Theories
            </p>
            <p className="text-sm text-midnight-navy">
              Failure to warn, design defect, negligence, fraudulent
              concealment, breach of warranty
            </p>
          </div>
        </div>
      </div>

      {/* -- 4. Harm / Injury ---------------------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4.5 h-4.5 text-alert" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Harm / Injury
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-midnight-navy/80 mb-4">
          The core injury is non-Hodgkin lymphoma (NHL) — a cancer of the
          lymphatic system. NHL encompasses over 60 subtypes, with the most
          common being diffuse large B-cell lymphoma (DLBCL) and follicular
          lymphoma. The 5-year survival rate is approximately 74%, but aggressive
          subtypes have significantly worse prognosis.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
              Symptoms &amp; Complications
            </p>
            <ul className="space-y-1.5">
              {[
                "Swollen lymph nodes (painless)",
                "Fatigue and weakness",
                "Unexplained weight loss",
                "Fever and night sweats",
                "Abdominal pain or swelling",
                "Chest pain, coughing, difficulty breathing",
                "Frequent infections",
                "Easy bruising or bleeding",
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
              Chemotherapy, immunotherapy, radiation therapy, targeted therapy,
              stem cell transplant, CAR T-cell therapy, hospitalization,
              long-term surveillance.
            </p>
            <div className="mt-4 rounded-md border border-warning/20 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold text-warning">Other Linked Conditions</p>
              <p className="mt-1 text-sm text-midnight-navy/80">
                Multiple myeloma, B-cell lymphoma, chronic lymphocytic leukemia
                (CLL), hairy cell leukemia. Some research also suggests links to
                liver damage, endocrine disruption, and kidney disease.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* -- 5. Scientific Evidence ---------------------------------------- */}
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
        <div className="mt-4 rounded-md border border-warning/20 bg-amber-50 px-4 py-3">
          <p className="text-sm text-midnight-navy/80">
            <span className="font-semibold text-warning">Key point:</span>{" "}
            Scientific evidence is genuinely contested. IARC (WHO) classifies
            glyphosate as &quot;probably carcinogenic&quot; while the EPA maintains it is
            &quot;not likely carcinogenic.&quot; This tension is central to the litigation.
            Plaintiff attorneys rely heavily on the IARC classification and the
            Zhang meta-analysis. Bayer/defense cites EPA and the Agricultural
            Health Study.
          </p>
        </div>
      </div>

      {/* -- 5b. Cancer Incidence Insight ----------------------------------- */}
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

      {/* -- 5c. Market Opportunity Signals ---------------------------------- */}
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
          All three signals present — national avg NHL rate: {CANCER_INCIDENCE_DATA.nationalAvg} per 100K
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
                    <span className={`font-semibold text-xs ${
                      c.trend === "Rising" ? "text-intelligence-teal" : c.trend === "Falling" ? "text-alert" : "text-slate-gray"
                    }`}>
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
                        c.verdict.startsWith("Very High")
                          ? "bg-red-50 text-alert"
                          : c.verdict === "High"
                          ? "bg-amber-50 text-warning"
                          : "bg-slate-50 text-slate-gray"
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
            These counties combine above-average Non-Hodgkin Lymphoma incidence
            with plaintiff-friendly legal environments. Many overlap with
            agricultural communities where glyphosate exposure is highest. Firms
            targeting these markets benefit from both elevated cancer rates and
            favorable legal conditions.
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

      {/* -- 6. Qualification Criteria ------------------------------------- */}
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
                "2–3 yes/no questions + contact info. \"Did you use Roundup? Diagnosed with cancer?\" Cheapest but highest rejection at intake.",
            },
            {
              label: "Tier 2: Qualified Lead",
              cpl: "Mid-Range CPL",
              color: "border-warning/30 bg-amber-50",
              tagColor: "bg-warning/10 text-warning",
              details:
                "4–6 step form. Confirmed 3+ years use, NHL diagnosis, exposure type (occupational vs. residential), diagnosis year, attorney check. Better conversion.",
            },
            {
              label: "Tier 3: Retainer-Ready",
              cpl: "Highest CPA",
              color: "border-alert/30 bg-red-50",
              tagColor: "bg-alert/10 text-alert",
              details:
                "Full intake with exposure history, specific product ID, diagnosis details (NHL subtype, stage, treatment), medical records auth, employment history. Most expensive but lowest fallout.",
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

      {/* -- 7. Litigation Timeline ---------------------------------------- */}
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

      {/* -- 8. Settlement Projections ------------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Settlement Projections
          </h2>
        </div>
        <p className="mb-4 text-xs text-slate-gray">
          Projections based on the $7.25B class settlement proposal, prior payouts,
          and jury verdicts. Bayer has already settled ~100,000 claims for $11B+.
          Average payout in 2020 settlement: ~$160,000.
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

        {/* $7.25B Class Settlement Tiers */}
        <h3 className="mt-6 mb-3 text-sm font-semibold text-midnight-navy">
          $7.25B Class Settlement Tiers (Proposed, Feb 2026)
        </h3>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Category
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  Avg Payout
                </th>
              </tr>
            </thead>
            <tbody>
              {CLASS_SETTLEMENT_TIERS.map((t) => (
                <tr
                  key={t.category}
                  className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                >
                  <td className="py-2.5 pr-4 text-midnight-navy/80">
                    {t.category}
                  </td>
                  <td className="py-2.5 pl-3 text-right font-mono font-semibold text-midnight-navy">
                    {t.avgPayout}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-slate-gray">
            Actual awards may range from 80% to 120% of the average based on individual claim scoring.
          </p>
        </div>

        {/* Factors */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-emerald-50/60 px-4 py-3">
            <p className="text-xs font-semibold text-success mb-1.5">
              Factors Increasing Value
            </p>
            <ul className="space-y-1">
              {[
                "10+ years occupational use",
                "Aggressive NHL subtype (DLBCL)",
                "Terminal diagnosis",
                "Younger age",
                "High medical costs",
                "Strong documentation",
                "Occupational exposure",
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
                "Short/casual residential use",
                "Indolent NHL",
                "Older age at diagnosis",
                "Weak documentation",
                "Pre-existing risk factors",
              ].map((f) => (
                <li key={f} className="flex items-center gap-1.5 text-xs text-midnight-navy/70">
                  <XCircle className="w-3 h-3 shrink-0 text-alert" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Key Verdict Benchmarks */}
        <div className="mt-4 rounded-md bg-cloud/60 px-4 py-3">
          <p className="text-xs font-semibold text-midnight-navy mb-2">
            Key Verdict Benchmarks
          </p>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-midnight-navy/70">
            <span className="rounded bg-intelligence-teal/10 px-2 py-1 font-medium text-intelligence-teal">
              $289M (2018)
            </span>
            <ChevronRight className="w-3 h-3 text-slate-gray" />
            <span className="rounded bg-intelligence-teal/10 px-2 py-1 font-medium text-intelligence-teal">
              $80M (2019)
            </span>
            <ChevronRight className="w-3 h-3 text-slate-gray" />
            <span className="rounded bg-intelligence-teal/10 px-2 py-1 font-medium text-intelligence-teal">
              $2B (2019)
            </span>
            <ChevronRight className="w-3 h-3 text-slate-gray" />
            <span className="rounded bg-intelligence-teal/10 px-2 py-1 font-medium text-intelligence-teal">
              $1.5B (2023)
            </span>
            <ChevronRight className="w-3 h-3 text-slate-gray" />
            <span className="rounded bg-intelligence-teal/10 px-2 py-1 font-medium text-intelligence-teal">
              $2.25B (2024)
            </span>
            <ChevronRight className="w-3 h-3 text-slate-gray" />
            <span className="rounded bg-intelligence-teal/10 px-2 py-1 font-medium text-intelligence-teal">
              $2B (2025)
            </span>
          </div>
        </div>

        {/* Timeline to Payout */}
        <div className="mt-4 rounded-md bg-cloud/60 px-4 py-3">
          <p className="text-xs font-semibold text-midnight-navy mb-2">
            Timeline to Payout
          </p>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-midnight-navy/70">
            <span className="rounded bg-intelligence-teal/10 px-2 py-1 font-medium text-intelligence-teal">
              Prelim Approved Mar 2026
            </span>
            <ChevronRight className="w-3 h-3 text-slate-gray" />
            <span className="rounded bg-intelligence-teal/10 px-2 py-1 font-medium text-intelligence-teal">
              Opt-Out Jun 4, 2026
            </span>
            <ChevronRight className="w-3 h-3 text-slate-gray" />
            <span className="rounded bg-intelligence-teal/10 px-2 py-1 font-medium text-intelligence-teal">
              Fairness Hearing Jul 2026
            </span>
            <ChevronRight className="w-3 h-3 text-slate-gray" />
            <span className="rounded bg-intelligence-teal/10 px-2 py-1 font-medium text-intelligence-teal">
              Payments Begin (21-yr schedule)
            </span>
          </div>
        </div>
      </div>

      {/* -- 9. Advertising Landscape (LIVE DATA) --------------------------- */}
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
              detail: "Was dominant, currently minimal due to class settlement uncertainty",
              color: "border-blue-500/30 bg-blue-50",
            },
            {
              channel: "Google Ads/LSAs",
              detail: "Reduced activity, high-intent search still running",
              color: "border-emerald-500/30 bg-emerald-50",
            },
            {
              channel: "TV / Broadcast",
              detail: "Was ~20% of spend at peak, most firms pulled back",
              color: "border-indigo-500/30 bg-indigo-50",
            },
            {
              channel: "Lead Gen Networks",
              detail:
                "Per-lead or per-retainer pricing through legal lead generation networks",
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

        {/* Warning Callout (editorial) */}
        <div className="mt-4 rounded-md border border-warning/20 bg-amber-50 px-4 py-3">
          <p className="text-xs text-midnight-navy/80">
            <span className="font-semibold text-warning">Market Timing Risk:</span>{" "}
            The $7.25B class settlement (Feb 2026) and pending SCOTUS preemption
            decision created a &quot;double pause&quot; in advertising. New ad spend is not
            recommended until after June 2026. Firms with existing inventory hold
            cases worth $50K–$250K at ~$3,000 CPA.
          </p>
        </div>
      </div>

      {/* -- 9b. Cost Benchmark Scorecard (LIVE DATA) ---------------------- */}
      <CostBenchmarkScorecard data={benchmark} />

      {/* -- 10. Organic Search Landscape ---------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Organic Search Landscape
          </h2>
        </div>
        <p className="mb-4 text-xs text-slate-gray">
          Top organic search results for Roundup litigation keywords. Understanding who ranks helps assess content competition and SEO opportunity.
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

      {/* -- 10b. Sample Ads (LIVE DATA) ------------------------------------- */}
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

      {/* -- 11. Top Advertisers (LIVE DATA) -------------------------------- */}
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
          Competitive landscape — firms with the highest advertising presence for Roundup litigation.
        </p>

        {topAdvertisers.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-slate-gray">{topAdvertisers.length} advertisers tracked</p>
              <Link
                href="/advertising/saturation/roundup"
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

      {/* -- 12. Top Markets by Saturation (LIVE DATA) --------------------- */}
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

      {/* -- 14. Geographic & Demographic Targeting ------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Geographic &amp; Demographic Targeting
          </h2>
        </div>

        {/* Exposure Profile */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Exposure Profile
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 mb-6">
          {EXPOSURE_PROFILES.map((ep) => (
            <div key={ep.group} className="rounded-lg border border-cloud bg-cloud/40 p-4">
              <p className="text-sm font-bold text-midnight-navy mb-1">
                {ep.group}
              </p>
              <p className="text-xs leading-relaxed text-midnight-navy/70">
                {ep.detail}
              </p>
            </div>
          ))}
        </div>

        {/* Top Glyphosate Usage States */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Top Glyphosate Usage States (Agricultural, USGS 2019)
        </h3>
        <p className="mb-3 text-xs text-slate-gray">
          States with the highest agricultural glyphosate usage, primarily
          Midwest/Great Plains reflecting corn and soybean production.
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
                  Usage Level
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Key Crops
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  NHL Incidence
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  Signal
                </th>
              </tr>
            </thead>
            <tbody>
              {STATE_GLYPHOSATE.map((s) => (
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
                    {s.usage}
                  </td>
                  <td className="py-2.5 px-3 text-midnight-navy/70 text-xs">
                    {s.crops}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-midnight-navy">
                    {s.nhlRate}
                  </td>
                  <td className="py-2.5 pl-3 text-center">
                    <SignalBadge signal={s.signal} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Crossover States */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          High-Value Crossover: Glyphosate Usage + NHL Incidence
        </h3>
        <p className="mb-3 text-xs text-slate-gray">
          States where both agricultural glyphosate usage AND NHL incidence rates
          are above the national average — the overlap of exposure and disease.
        </p>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  State
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  Glyphosate Usage
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  NHL Rate (per 100K)
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
                  <td className="py-2.5 px-3 text-right font-mono text-midnight-navy/80">
                    {s.usage}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-midnight-navy">
                    {s.nhlRate}
                  </td>
                  <td className="py-2.5 pl-3 text-midnight-navy/80">
                    {s.dmas}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Targeting Implications — Card Layout */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Targeting Implications
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {TARGETING_IMPLICATIONS.map((imp, i) => (
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

        <p className="mt-4 text-[11px] text-slate-gray">
          Source: USGS Pesticide National Synthesis Project (2019), NCI State Cancer Profiles (2018–2022)
        </p>
      </div>

      {/* -- 15. Footer / Disclaimer --------------------------------------- */}
      <div className="rounded-lg border border-cloud bg-cloud/40 p-5">
        <p className="text-xs leading-relaxed text-slate-gray">
          This page is refreshed monthly. Content reflects research and publicly
          available data as of the date shown. Settlement projections are attorney
          estimates and industry benchmarks — not guarantees. This page does not
          constitute legal advice.
        </p>
        <p className="mt-3 text-[11px] text-slate-gray/80">
          Data sources: USGS Pesticide National Synthesis Project (2019), NCI
          SEER, State Cancer Profiles (CDC/NCI, 2018–2022), IARC Monograph Vol.
          112, Meta Ad Library, JPML MDL Statistics, court filings,
          ConsumerShield, Taqtics Mass Tort Report, Lawsuit Information Center.
        </p>
      </div>

      <AskAIPanel tortContext={ROUNDUP_TORT_CONTEXT} />
    </div>
  );
}
