import Link from "next/link";
import {
  ArrowLeft,
  Scale,
  DollarSign,
  Target,
  Calendar,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Shield,
  MapPin,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Search,
  Megaphone,
  Image,
  BarChart3,
  ExternalLink,
  Globe,
  Eye,
} from "lucide-react";

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

const AD_METRICS = [
  { metric: "Stage", value: "Early-to-mid (Stage 2–3)" },
  { metric: "Estimated CPA", value: "~$2,500 – $4,500" },
  { metric: "Active Meta advertisers", value: "~96 active ads (April 2026)" },
  { metric: "Primary channels", value: "Meta, Google Ads/LSAs, legal lead gen networks" },
  { metric: "Case growth rate", value: "~40–50% month-over-month" },
];

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

const ORGANIC_SERP_RESULTS = [
  {
    position: 1,
    title: "Depo-Provera Lawsuit | Brain Tumor Claims — TorHoerman Law",
    url: "https://www.torhoermanlaw.com/depo-provera-lawsuit/",
    description: "Were you diagnosed with a meningioma brain tumor after receiving Depo-Provera injections? You may qualify for compensation. Free case review.",
    domain: "torhoermanlaw.com",
  },
  {
    position: 2,
    title: "Depo-Provera Meningioma Lawsuit — AboutLawsuits.com",
    url: "https://www.aboutlawsuits.com/depo-provera-meningioma-lawsuit/",
    description: "Depo-Provera lawsuits are being pursued by women diagnosed with meningioma brain tumors after use of the injectable birth control.",
    domain: "aboutlawsuits.com",
  },
  {
    position: 3,
    title: "Depo-Provera Lawsuit Update 2026 — Drugwatch",
    url: "https://www.drugwatch.com/depo-provera/lawsuit/",
    description: "More than 3,400 Depo-Provera lawsuits have been filed alleging the birth control injection causes meningioma brain tumors.",
    domain: "drugwatch.com",
  },
  {
    position: 4,
    title: "Depo-Provera Brain Tumor Lawsuit — Morgan & Morgan",
    url: "https://www.forthepeople.com/mass-tort/depo-provera-lawsuit/",
    description: "If you used Depo-Provera and developed a brain tumor, you may be entitled to compensation. Contact Morgan & Morgan for a free consultation.",
    domain: "forthepeople.com",
  },
  {
    position: 5,
    title: "Depo-Provera Lawsuit — Ben Crump Law",
    url: "https://bencrump.com/mass-torts/depo-provera-lawsuit/",
    description: "Depo-Provera has been linked to meningioma brain tumors. Learn about the lawsuit and your legal options.",
    domain: "bencrump.com",
  },
];

const TRACKED_KEYWORDS = [
  { keyword: "depo provera lawsuit", volume: "49,500", difficulty: "High" as const, cpc: "$42.80" },
  { keyword: "depo provera meningioma", volume: "22,200", difficulty: "High" as const, cpc: "$38.50" },
  { keyword: "depo provera brain tumor", volume: "14,800", difficulty: "Medium" as const, cpc: "$35.20" },
  { keyword: "depo provera lawyer", volume: "8,100", difficulty: "High" as const, cpc: "$52.00" },
  { keyword: "depo provera settlement", volume: "6,600", difficulty: "Medium" as const, cpc: "$28.40" },
  { keyword: "depo shot lawsuit", volume: "4,400", difficulty: "Medium" as const, cpc: "$31.00" },
];

const PAID_AD_DATA = {
  meta: {
    platform: "Meta (Facebook / Instagram)",
    activeAds: 96,
    advertisers: 34,
    avgSpend: "$15K–$45K/mo",
    commonFormats: ["Lead Form Ads", "Video Ads", "Carousel"],
    topAdvertisers: [
      { name: "TorHoerman Law", ads: 12, status: "Active" },
      { name: "Lawsuit Legal News", ads: 9, status: "Active" },
      { name: "Morgan & Morgan", ads: 8, status: "Active" },
      { name: "Ben Crump Law", ads: 7, status: "Active" },
      { name: "OnderLaw", ads: 5, status: "Active" },
    ],
  },
  google: {
    platform: "Google Ads",
    activeAds: 45,
    advertisers: 22,
    avgSpend: "$20K–$60K/mo",
    commonFormats: ["Search Ads", "Local Service Ads (LSAs)", "Display"],
    topAdvertisers: [
      { name: "Morgan & Morgan", ads: 8, status: "Active" },
      { name: "Sokolove Law", ads: 6, status: "Active" },
      { name: "Weitz & Luxenberg", ads: 5, status: "Active" },
      { name: "Pintas & Mullins", ads: 4, status: "Active" },
      { name: "Riddle & Brantley", ads: 3, status: "Active" },
    ],
  },
  tiktok: {
    platform: "TikTok",
    activeAds: 18,
    advertisers: 8,
    avgSpend: "$5K–$15K/mo",
    commonFormats: ["In-Feed Video", "Spark Ads"],
    topAdvertisers: [
      { name: "Lawsuit Legal News", ads: 5, status: "Active" },
      { name: "TorHoerman Law", ads: 4, status: "Active" },
      { name: "Mass Tort Alliance", ads: 3, status: "Active" },
    ],
  },
};

const SAMPLE_ADS = [
  {
    platform: "Meta",
    advertiser: "TorHoerman Law",
    type: "Lead Form Ad",
    headline: "Depo-Provera Linked to Brain Tumors",
    body: "Were you diagnosed with a meningioma after Depo-Provera injections? You may qualify for significant compensation. Free case review — no fees unless you win.",
    cta: "Sign Up",
    landingPage: "https://www.torhoermanlaw.com/depo-provera-lawsuit/",
  },
  {
    platform: "Meta",
    advertiser: "Lawsuit Legal News",
    type: "Video Ad",
    headline: "Depo Shot & Brain Tumor Risk",
    body: "New studies confirm Depo-Provera users face 5.5x higher risk of meningioma. Find out if you qualify for the lawsuit.",
    cta: "Learn More",
    landingPage: "#",
  },
  {
    platform: "Google",
    advertiser: "Morgan & Morgan",
    type: "Search Ad",
    headline: "Depo-Provera Lawsuit — Free Case Review | ForThePeople.com",
    body: "Diagnosed With A Brain Tumor After Depo-Provera? You May Be Entitled To Compensation. America's Largest Injury Firm. No Win, No Fee.",
    cta: null,
    landingPage: "https://www.forthepeople.com/mass-tort/depo-provera-lawsuit/",
  },
  {
    platform: "Google",
    advertiser: "Sokolove Law",
    type: "Search Ad",
    headline: "Depo Provera Meningioma Lawyers — Experienced Mass Tort Attorneys",
    body: "Over 40 Years of Experience. Exposed to Depo-Provera & Diagnosed with Meningioma? Act Now.",
    cta: null,
    landingPage: "#",
  },
  {
    platform: "TikTok",
    advertiser: "TorHoerman Law",
    type: "In-Feed Video",
    headline: "Did you know Depo-Provera is linked to brain tumors?",
    body: "If you or a loved one used Depo-Provera and were diagnosed with a meningioma, you may be entitled to compensation. Link in bio.",
    cta: "Learn More",
    landingPage: "#",
  },
  {
    platform: "TikTok",
    advertiser: "Lawsuit Legal News",
    type: "Spark Ad",
    headline: "Depo-Provera Brain Tumor Lawsuit Update 2026",
    body: "Over 3,400 cases filed. Settlement talks could begin next year. See if you qualify.",
    cta: "Sign Up",
    landingPage: "#",
  },
];

const TOP_FIRMS = [
  { firm: "TorHoerman Law", totalAds: 21, platforms: 3, markets: 12, estSpend: "$85K/mo", trend: "up" as const },
  { firm: "Morgan & Morgan", totalAds: 18, platforms: 2, markets: 28, estSpend: "$120K/mo", trend: "up" as const },
  { firm: "Lawsuit Legal News", totalAds: 17, platforms: 3, markets: 8, estSpend: "$55K/mo", trend: "up" as const },
  { firm: "Ben Crump Law", totalAds: 12, platforms: 2, markets: 15, estSpend: "$70K/mo", trend: "up" as const },
  { firm: "Sokolove Law", totalAds: 11, platforms: 1, markets: 22, estSpend: "$95K/mo", trend: "stable" as const },
  { firm: "OnderLaw", totalAds: 8, platforms: 2, markets: 6, estSpend: "$35K/mo", trend: "up" as const },
  { firm: "Weitz & Luxenberg", totalAds: 7, platforms: 1, markets: 18, estSpend: "$80K/mo", trend: "down" as const },
  { firm: "Pintas & Mullins", totalAds: 6, platforms: 2, markets: 10, estSpend: "$40K/mo", trend: "stable" as const },
];

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

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function DepoProveraPage() {
  return (
    <div className="space-y-8">
      {/* ── 1. Page Header ──────────────────────────────────────────────── */}
      <div>
        <Link
          href="/torts"
          className="text-sm text-slate-gray hover:text-midnight-navy"
        >
          <span className="flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            All Torts
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

      {/* ── 9. Advertising Landscape ────────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Advertising Landscape
          </h2>
        </div>

        {/* Metrics Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Metric
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {AD_METRICS.map((m) => (
                <tr
                  key={m.metric}
                  className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                >
                  <td className="py-3 pr-4 font-medium text-midnight-navy whitespace-nowrap">
                    {m.metric}
                  </td>
                  <td className="py-3 pl-3 text-midnight-navy/80">{m.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Channel Breakdown */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Channel Breakdown
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 mb-6">
          {[
            {
              channel: "Meta (Facebook/Instagram)",
              detail: "Dominant channel, ~96 active ads, quiz-style lead forms",
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
                "On Point Legal Leads, TSEG — per-lead or per-retainer pricing",
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

        {/* Comparative CPA */}
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

        {/* Meta Warning */}
        <div className="mt-4 rounded-md border border-warning/20 bg-amber-50 px-4 py-3">
          <p className="text-xs text-midnight-navy/80">
            <span className="font-semibold text-warning">Platform Risk:</span>{" "}
            Meta recently removed law firm ads recruiting plaintiffs for social
            media addiction lawsuits (April 2026). Has not affected Depo-Provera,
            but signals platform risk for firms reliant on Meta.
          </p>
        </div>
      </div>

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

        {/* SERP Preview Cards */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          SERP Preview
        </h3>
        <div className="space-y-0 divide-y divide-cloud">
          {ORGANIC_SERP_RESULTS.map((r) => (
            <div key={r.position} className="relative py-3 first:pt-0 last:pb-0">
              <span className="absolute top-3 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-intelligence-teal/10 text-[10px] font-bold text-intelligence-teal">
                {r.position}
              </span>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-gray/20 text-[8px] font-bold text-slate-gray">
                  {r.domain.charAt(0).toUpperCase()}
                </span>
                <span className="text-xs text-success">{r.domain}</span>
              </div>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-intelligence-teal hover:underline"
              >
                {r.title}
              </a>
              <p className="mt-0.5 text-sm text-midnight-navy/60 pr-8">
                {r.description}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-3 text-[11px] text-slate-gray/60 italic">Sample data — live SERP tracking coming soon.</p>
      </div>

      {/* ── 11. Paid Advertising by Platform ─────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Paid Advertising by Platform
          </h2>
        </div>
        <p className="mb-4 text-xs text-slate-gray">
          Active paid advertising across major platforms for Depo-Provera litigation.
        </p>

        <div className="space-y-4">
          {(
            [
              { key: "meta" as const, border: "border-l-blue-500", accent: "bg-blue-50" },
              { key: "google" as const, border: "border-l-emerald-500", accent: "bg-emerald-50" },
              { key: "tiktok" as const, border: "border-l-slate-800", accent: "bg-slate-50" },
            ] as const
          ).map(({ key, border, accent }) => {
            const platform = PAID_AD_DATA[key];
            return (
              <div
                key={key}
                className={`rounded-lg border border-l-4 ${border} ${accent} p-4`}
              >
                <h3 className="text-sm font-bold text-midnight-navy mb-3">
                  {platform.platform}
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-gray">Active Ads</p>
                    <p className="text-lg font-bold text-midnight-navy">{platform.activeAds}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-gray">Advertisers</p>
                    <p className="text-lg font-bold text-midnight-navy">{platform.advertisers}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-gray">Est. Spend</p>
                    <p className="text-sm font-bold text-midnight-navy">{platform.avgSpend}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-gray">Formats</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {platform.commonFormats.map((f) => (
                        <span
                          key={f}
                          className="inline-block rounded-full bg-white/80 border border-cloud px-1.5 py-0.5 text-[9px] font-medium text-midnight-navy/70"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Top Advertisers Mini-Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-cloud">
                        <th className="py-2 pr-4 text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
                          Advertiser
                        </th>
                        <th className="py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-gray text-right">
                          # Ads
                        </th>
                        <th className="py-2 pl-3 text-[10px] font-semibold uppercase tracking-wider text-slate-gray text-center">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {platform.topAdvertisers.map((a) => (
                        <tr
                          key={a.name}
                          className="border-b border-cloud/50 hover:bg-white/60 transition-colors"
                        >
                          <td className="py-2 pr-4 font-medium text-midnight-navy text-xs">
                            {a.name}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-midnight-navy/80 text-xs">
                            {a.ads}
                          </td>
                          <td className="py-2 pl-3 text-center">
                            <span className="inline-block rounded-full bg-emerald-50 border border-success/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-[11px] text-slate-gray/60 italic">Sample data — live tracking coming soon.</p>
      </div>

      {/* ── 12. Sample Ads ───────────────────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Image className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Sample Ads
          </h2>
        </div>
        <p className="mb-4 text-xs text-slate-gray">
          Representative ad creative currently running across platforms. 2 samples per channel.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SAMPLE_ADS.map((ad, i) => {
            const platformColor =
              ad.platform === "Meta"
                ? "bg-blue-500"
                : ad.platform === "Google"
                ? "bg-emerald-500"
                : "bg-slate-800";
            return (
              <div
                key={i}
                className="rounded-lg border border-cloud bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ${platformColor}`}
                  >
                    {ad.platform}
                  </span>
                  <span className="inline-block rounded-full bg-cloud px-2 py-0.5 text-[10px] font-medium text-midnight-navy/70">
                    {ad.type}
                  </span>
                </div>
                <p className="text-[10px] text-slate-gray mb-1">{ad.advertiser}</p>
                <p className="text-sm font-bold text-midnight-navy mb-1">{ad.headline}</p>
                <p className="text-sm text-midnight-navy/70 mb-3">{ad.body}</p>
                {ad.cta && (
                  <span className="inline-block rounded bg-intelligence-teal/10 px-3 py-1 text-xs font-semibold text-intelligence-teal mb-2">
                    {ad.cta}
                  </span>
                )}
                <div className="mt-auto pt-2 border-t border-cloud">
                  {ad.landingPage !== "#" ? (
                    <a
                      href={ad.landingPage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-intelligence-teal hover:underline"
                    >
                      View Landing Page
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <p className="text-xs text-slate-gray/50 italic">Landing page not available</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-[11px] text-slate-gray/60 italic">Sample data — live tracking coming soon.</p>
      </div>

      {/* ── 13. Top Firms Advertising ────────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Top Firms Advertising
          </h2>
        </div>
        <p className="mb-4 text-xs text-slate-gray">
          Competitive landscape — firms with the highest advertising presence for Depo-Provera litigation.
        </p>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-6">
          <div className="rounded-lg bg-white p-4 shadow-sm border border-cloud">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">Total Active Ads</p>
            <p className="text-2xl font-bold text-midnight-navy">
              {TOP_FIRMS.reduce((sum, f) => sum + f.totalAds, 0)}
            </p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm border border-cloud">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">Unique Firms</p>
            <p className="text-2xl font-bold text-midnight-navy">{TOP_FIRMS.length}</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm border border-cloud">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">Avg Platforms</p>
            <p className="text-2xl font-bold text-midnight-navy">
              {(TOP_FIRMS.reduce((sum, f) => sum + f.platforms, 0) / TOP_FIRMS.length).toFixed(1)}
            </p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm border border-cloud">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">Total Est. Spend</p>
            <p className="text-2xl font-bold text-midnight-navy">$580K/mo</p>
          </div>
        </div>

        {/* CSS Bar Chart */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Estimated Monthly Ad Spend
        </h3>
        <div className="space-y-2 mb-6">
          {TOP_FIRMS.map((f) => {
            const spend = parseInt(f.estSpend.replace(/[^0-9]/g, ""));
            const maxSpend = 120; // $120K is the max
            const widthPercent = (spend / maxSpend) * 100;
            return (
              <div key={f.firm} className="flex items-center gap-3">
                <p className="w-[140px] shrink-0 truncate text-xs font-medium text-midnight-navy">
                  {f.firm}
                </p>
                <div className="flex-1 h-6 rounded bg-cloud/60">
                  <div
                    className="h-6 rounded bg-intelligence-teal flex items-center justify-end px-2"
                    style={{ width: `${widthPercent}%` }}
                  >
                    <span className="text-[10px] font-bold text-white whitespace-nowrap">
                      {f.estSpend}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail Table */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Detailed Breakdown
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Firm
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  Total Ads
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  Platforms
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  Markets
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  Est. Monthly Spend
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody>
              {TOP_FIRMS.map((f) => (
                <tr
                  key={f.firm}
                  className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                >
                  <td className="py-3 pr-4 font-medium text-midnight-navy">
                    {f.firm}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-midnight-navy/80">
                    {f.totalAds}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-midnight-navy/80">
                    {f.platforms}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-midnight-navy/80">
                    {f.markets}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-midnight-navy">
                    {f.estSpend}
                  </td>
                  <td className="py-3 pl-3 text-center">
                    {f.trend === "up" ? (
                      <TrendingUp className="inline w-4 h-4 text-success" />
                    ) : f.trend === "down" ? (
                      <TrendingDown className="inline w-4 h-4 text-alert" />
                    ) : (
                      <Minus className="inline w-4 h-4 text-slate-gray" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] text-slate-gray/60 italic">Sample data — live tracking coming soon.</p>
      </div>

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
        <div className="space-y-2">
          {[
            "Concentrate ad spend in high-rate states rather than running nationally",
            "On Meta, layer demographic targeting: women 25–55, Black women, lower-education, Medicaid-eligible income brackets",
            "DMA-level focus: Baltimore, New Orleans, Columbia SC, Cleveland/Columbus OH, Jackson MS, Memphis, Philadelphia, Detroit",
            "Pharmacist-prescribing states (where pharmacists can directly administer DMPA without physician visit): CA, CO, HI, ID, IL, IN, MD, ME, MN, NV, NM, NH, OR, SC, TN, VA + DC",
          ].map((imp, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-md bg-cloud/60 px-4 py-2.5"
            >
              <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-intelligence-teal" />
              <p className="text-xs leading-relaxed text-midnight-navy/80">
                {imp}
              </p>
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
    </div>
  );
}
