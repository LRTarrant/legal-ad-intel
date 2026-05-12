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
  Lightbulb,
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
      "Bair Hugger (MDL 2666) Tort Intelligence | Legal Marketing Intelligence",
    description:
      "Advertising intelligence brief for the 3M Bair Hugger forced-air warming MDL 2666 — case data, periprosthetic joint infection (PJI) qualification criteria, settlement projections, and Joint Replacement Belt geographic targeting.",
  };
}

/* ── Static Data ───────────────────────────────────────────────────────── */

const BAIR_HUGGER_TORT_CONTEXT = {
  tortName: "Bair Hugger (MDL 2666)",
  injury:
    "Periprosthetic Joint Infection (PJI) — deep bacterial infection at an implanted hip or knee prosthesis",
  mdlNumber: "MDL 2666, D. Minnesota, Judge Joan N. Ericksen",
  pendingCases:
    "8,550+ pending (April 2026) — 5th-largest active MDL; 10,701+ historically filed",
  settlementRange:
    "$30K–$250K+ depending on tier. Tier 1 (Severe, multiple revisions/sepsis/amputation): $150K–$250K+, Tier 2 (Moderate, single revision + 6w IV abx): $75K–$150K, Tier 3 (Lower, DAIR only): $30K–$75K, Tier 4 (Minimal): $10K–$30K. No global settlement reached; estimates only.",
  estimatedCPA:
    "$3,500–$6,500 (mid-stage MDL, narrow injury class). CPL $300–$500. Lead→Retainer 15–25% (lower than Depo because Bair Hugger device-use confirmation requires OR records). Attrition 25–35%.",
  bellwetherDate:
    "Hilke v. 3M tried January 21, 2026; verdict on appeal. Gareis v. 3M (2018) was a defense verdict. 18 bellwether candidates remain. Settlement framework discussions ongoing under Special Master James Rosenbaum.",
  caseSummary:
    "3M Bair Hugger forced-air warming system used in ~80% of US ORs during hip/knee arthroplasty. Plaintiffs allege the device draws contaminated floor air and disrupts laminar flow, depositing pathogens into open surgical wounds → deep PJI. MDL 2666 in D. Minn. before Judge Ericksen. In 2017 court excluded plaintiffs' experts and granted SJ; the 8th Circuit reversed (9 F.4th 768, Aug 2021), reinstating the experts and reviving the MDL. 3M spun off its Health Care segment as Solventum (2024); Solventum agreed to indemnify 3M for uninsured Bair Hugger liabilities.",
  qualification:
    "Total/partial hip or knee arthroplasty (or revision), Bair Hugger used during surgery (verified via OR/anesthesia records), deep PJI or deep SSI (superficial excluded), diagnosis within 1 year of surgery (some firms accept up to 2y), required revision/IV antibiotics/spacer/hospitalization, surgery 2010–present, not currently represented, within state SOL/statute of repose. Three screening tiers: Tier 1 Basic (3 yes/no, lowest CPL but high rejection at intake), Tier 2 Qualified (6–8 step), Tier 3 Retainer-Ready (12–15 step + HIPAA OR-records auth).",
  advertisingLandscape:
    "Stage: Mid-stage MDL with narrow injury class. Channels: Google Search/LSAs (dominant — high-intent post-complication queries), Meta (moderate, quiz-style intake; older skew, smaller TAM than Depo), legal lead-gen networks (TheLegalLeads, X Social Media, Lead Sherpa), legacy DRTV (Morgan & Morgan, Sokolove). On-docket firms: Meshbesher & Spence (Minneapolis local counsel), Seeger Weiss, Levin Papantonio, Ciresi Conlin, Anapol Weiss, Beasley Allen.",
  targetingInsights:
    "Demographics are INVERSE to Depo-Provera: 60–80, 76.6% non-Hispanic white, ~60% Medicare, slight female skew (58.6%). 'Joint Replacement Belt' = Upper Midwest (MN, MI, WI, IA, NE, SD, ND), Mountain West (UT, ID), Florida retirement corridor — NOT southern Black-population crossover states. Reusing Depo-Provera audiences will burn budget. Out-of-the-box signals: hospital PJI quality data (CMS Hospital Compare/CJR), adult-child caregiver Meta audiences, surgical-records-pull pipeline as CPA differentiator, state SOL filing-window heatmap, ASC shift (51% outpatient by 2026), VA hospital service areas, diabetic/obesity comorbidity targeting.",
};

const SCIENTIFIC_STUDIES = [
  {
    study: "McGovern et al. (Wake Forest observational)",
    year: "2011",
    source: "The Bone & Joint Journal",
    finding:
      "~3.8x increased risk of deep PJI when forced-air warming used vs. conductive warming during hip/knee arthroplasty",
    favorability: "Plaintiff" as const,
  },
  {
    study: "Augustine / Elghobashi CFD model",
    year: "2012",
    source: "Anesthesia & Analgesia",
    finding:
      "Computational fluid dynamics — FAW disrupts laminar airflow and mobilizes floor-level pathogens into the sterile field",
    favorability: "Plaintiff" as const,
  },
  {
    study: "Legg / Hamer — Forced Air Warming and Particle Counts",
    year: "2013",
    source: "The Bone & Joint Journal",
    finding:
      "Air sampling: forced-air warming generated significantly more airborne particles in the OR than conductive warming",
    favorability: "Plaintiff" as const,
  },
  {
    study: "Cochrane Review (Madrid et al.)",
    year: "2016",
    source: "Cochrane Database",
    finding:
      "Active warming reduced overall SSI (RR 0.36, 95% CI 0.20–0.66) — does not isolate forced-air harm",
    favorability: "Defense" as const,
  },
  {
    study: "FDA Statement",
    year: "2017",
    source: "FDA",
    finding:
      "\"Unable to identify a consistently reported association\" between forced-air warming and SSI",
    favorability: "Defense" as const,
  },
  {
    study: "AORN Meta-Analysis (Liu & Mehigan)",
    year: "2025",
    source: "AORN Journal",
    finding:
      "\"Pooled analysis did not show a significant increase in SSI risk with FAW use\"",
    favorability: "Defense" as const,
  },
  {
    study: "8th Circuit Ruling — In re Bair Hugger",
    year: "2021",
    source: "9 F.4th 768",
    finding:
      "Held plaintiffs' expert testimony admissible — \"weaknesses go to weight, not admissibility\"; MDL revived",
    favorability: "Plaintiff" as const,
  },
];

const QUALIFICATION_CRITERIA = [
  {
    criterion: "Procedure",
    standard:
      "Total hip arthroplasty, total knee arthroplasty, partial replacement, or revision",
    notes: "Some firms accept other orthopedic implant procedures",
  },
  {
    criterion: "Device Use",
    standard: "Bair Hugger used during surgery",
    notes: "Confirmed via operating room records or anesthesia notes",
  },
  {
    criterion: "Injury",
    standard: "Deep periprosthetic joint infection (PJI) or deep SSI",
    notes: "Superficial wound infections typically excluded",
  },
  {
    criterion: "Onset Window",
    standard: "Infection diagnosed within 1 year of surgery (most firms)",
    notes: "Some accept up to 2 years; CDC defines deep PJI as <90 days, chronic <1 year",
  },
  {
    criterion: "Treatment Required",
    standard: "Revision surgery, IV antibiotics, antibiotic spacer, or hospitalization",
    notes: "\"Required treatment\" is a key qualifier",
  },
  {
    criterion: "Surgery Date Window",
    standard: "Generally 2010–present",
    notes: "Some firms accept earlier; SOL is the binding constraint",
  },
  {
    criterion: "Existing Representation",
    standard: "Not currently represented",
    notes: "Standard disqualifier",
  },
  {
    criterion: "Statute of Limitations",
    standard: "2–4 years from injury discovery (varies by state)",
    notes: "Many states also have statutes of repose for medical devices; discovery rule typically applies",
  },
];

const SCREENING_QUESTIONS = [
  "Who is the claimant? (You or loved one)",
  "What procedure did you have? (Hip / knee / other)",
  "When was your surgery? (Date range)",
  "Where was the surgery performed? (Hospital + city/state)",
  "Was a Bair Hugger or forced-air warming blanket used? (Records can confirm)",
  "Did you develop an infection at the surgical site? (Time to diagnosis)",
  "What treatment did you receive? (Revision, IV antibiotics, spacer)",
  "Was it confirmed as a periprosthetic joint infection or deep SSI?",
  "Any complicating conditions? (Diabetes, immunosuppression — defense factors)",
  "Already have an attorney?",
];

const DISQUALIFIERS = [
  "Surgery without a joint implant (e.g., arthroscopy)",
  "Superficial wound infection only",
  "Infection diagnosed >2 years post-op (case-by-case)",
  "Bair Hugger not actually used (verifiable via OR records)",
  "Pre-existing infection at the surgical site",
  "Already represented",
  "Outside SOL / statute of repose for the state of surgery",
];

const LITIGATION_TIMELINE = [
  { date: "1987", event: "Bair Hugger invented by Dr. Scott Augustine (Augustine Medical)", short: "Bair Hugger Invented" },
  { date: "2002", event: "Augustine departs; Arizant Healthcare formed", short: "Arizant Formed" },
  { date: "2010", event: "3M acquires Arizant Healthcare for $810M", short: "3M Acquires Arizant" },
  { date: "2011", event: "McGovern study published — first major PJI signal", short: "McGovern Study" },
  { date: "Dec 2015", event: "MDL 2666 established in D. Minnesota under Judge Ericksen", short: "MDL 2666 Established" },
  { date: "Aug 2017", event: "District court excludes plaintiffs' experts; grants summary judgment", short: "Experts Excluded" },
  { date: "May 2018", event: "Gareis v. 3M — first bellwether — defense verdict", short: "Gareis Defense Verdict" },
  { date: "Aug 2021", event: "8th Circuit reverses — experts reinstated; MDL revived", short: "8th Circuit Reverses" },
  { date: "2024", event: "Solventum spin-off completed", short: "Solventum Spin-off" },
  { date: "2025", event: "Solventum SEC indemnification disclosures", short: "Solventum Indemnifies" },
  { date: "Jan 21, 2026", event: "Hilke v. 3M bellwether trial begins; verdict on appeal", short: "Hilke Bellwether" },
  { date: "2026", event: "Settlement talks ongoing under Special Master James Rosenbaum", short: "Special Master Talks" },
  { date: "2026–2027", event: "Additional bellwethers from remaining 18 candidates expected", short: "More Bellwethers", future: true },
  { date: "2027 (proj.)", event: "Possible global resolution framework", short: "Global Framework", future: true },
  { date: "2028+", event: "First payments projected after claims administration", short: "First Payments", future: true },
];

const SETTLEMENT_TIERS = [
  {
    tier: "Tier 1: Severe",
    severity: "High",
    range: "$150K – $250K+",
    factors:
      "Multiple revision surgeries, antibiotic spacer, sepsis, amputation, permanent disability, lost earning capacity",
  },
  {
    tier: "Tier 2: Moderate",
    severity: "Moderate",
    range: "$75K – $150K",
    factors:
      "Single revision surgery, 6+ weeks IV antibiotics, residual pain/limitation, ongoing monitoring",
  },
  {
    tier: "Tier 3: Lower",
    severity: "Mild",
    range: "$30K – $75K",
    factors:
      "DAIR procedure (no full revision), antibiotics only, full recovery",
  },
  {
    tier: "Tier 4: Minimal",
    severity: "Lowest",
    range: "$10K – $30K",
    factors:
      "Suspected PJI, weak documentation, comorbidities suggest alternate cause",
  },
];

const COMPARATIVE_CPA = [
  { tort: "Depo-Provera", stage: "Early-mid", cpa: "~$2,500–$4,500", settlement: "TBD ($100K–$1.5M)" },
  { tort: "Bair Hugger", stage: "Mid", cpa: "~$3,500–$6,500", settlement: "TBD ($30K–$250K+)", highlight: true },
  { tort: "Tylenol", stage: "Early", cpa: "~$2,550", settlement: "$60–90K" },
  { tort: "PFAS (AFFF)", stage: "Mid-late", cpa: "~$3,000", settlement: "$75–175K" },
  { tort: "NEC Formula", stage: "Mid", cpa: "~$4,000", settlement: "$100–300K" },
  { tort: "Hair Relaxer", stage: "Early", cpa: "~$4,500", settlement: "$75–125K" },
  { tort: "Paraquat", stage: "Mid-late", cpa: "~$9,950", settlement: "$105–250K" },
];

const DEMOGRAPHIC_PROFILE = [
  { demographic: "Mean age — Primary TKA", value: "67.6 years" },
  { demographic: "Mean age — Primary THA", value: "65.6 years" },
  { demographic: "Female", value: "58.6%" },
  { demographic: "Non-Hispanic White", value: "76.6%" },
  { demographic: "Race unreported", value: "14.0%" },
  { demographic: "Medicare primary payer", value: "~60%" },
];

const STATE_INTENSITY = [
  { rank: 1, state: "Utah", signal: "HIGH" as const, dmas: "Salt Lake City, Ogden", note: "Highest TKA rate in nation: 16/1000 Medicare" },
  { rank: 2, state: "Michigan", signal: "HIGH" as const, dmas: "Traverse City, Detroit, Grand Rapids", note: "Highest THA rate (Traverse City HRR: 7.55/1000)" },
  { rank: 3, state: "Iowa", signal: "HIGH" as const, dmas: "Des Moines, Cedar Rapids", note: "Joint Replacement Belt — high TKA density" },
  { rank: 4, state: "Nebraska", signal: "HIGH" as const, dmas: "Omaha, Lincoln", note: "JR Belt" },
  { rank: 5, state: "South Dakota", signal: "HIGH" as const, dmas: "Sioux Falls, Rapid City", note: "JR Belt" },
  { rank: 6, state: "Wisconsin", signal: "HIGH" as const, dmas: "Milwaukee, Madison, Green Bay", note: "JR Belt" },
  { rank: 7, state: "Minnesota", signal: "HIGH" as const, dmas: "Minneapolis-St. Paul, Rochester", note: "MDL home; Meshbesher & Spence local counsel" },
  { rank: 8, state: "Idaho", signal: "HIGH" as const, dmas: "Boise", note: "Mountain West — JR Belt" },
  { rank: 9, state: "North Dakota", signal: "HIGH" as const, dmas: "Fargo, Bismarck", note: "JR Belt" },
  { rank: 10, state: "Indiana", signal: "MED-HI" as const, dmas: "Indianapolis, Fort Wayne", note: "Industrial Midwest" },
  { rank: 11, state: "Ohio", signal: "MED-HI" as const, dmas: "Cleveland, Columbus, Cincinnati", note: "Industrial Midwest" },
  { rank: 12, state: "Pennsylvania", signal: "MED-HI" as const, dmas: "Philadelphia, Pittsburgh", note: "Eastern industrial" },
  { rank: 13, state: "Florida", signal: "MED-HI" as const, dmas: "Tampa, Orlando, Miami", note: "Retirement-corridor skew (65+ Medicare-heavy)" },
  { rank: 14, state: "Arizona", signal: "MED-HI" as const, dmas: "Phoenix, Tucson", note: "Sun City: 92.4% white Medicare population" },
  { rank: 15, state: "Maine", signal: "MED" as const, dmas: "Bangor, Portland", note: "New England retirement skew" },
];

const TRACKED_KEYWORDS = [
  { keyword: "bair hugger lawsuit", volume: "12,100", difficulty: "High" as const, cpc: "$35.50" },
  { keyword: "bair hugger lawsuit update", volume: "4,400", difficulty: "Medium" as const, cpc: "$28.40" },
  { keyword: "bair hugger settlement", volume: "3,600", difficulty: "Medium" as const, cpc: "$26.90" },
  { keyword: "bair hugger infection", volume: "2,900", difficulty: "Medium" as const, cpc: "$18.20" },
  { keyword: "bair hugger lawyer", volume: "1,900", difficulty: "High" as const, cpc: "$42.00" },
  { keyword: "forced air warming lawsuit", volume: "880", difficulty: "Low" as const, cpc: "$22.00" },
  { keyword: "3m bair hugger lawsuit", volume: "720", difficulty: "Medium" as const, cpc: "$32.00" },
  { keyword: "bair hugger mdl", volume: "590", difficulty: "Low" as const, cpc: "$19.50" },
  { keyword: "knee replacement infection lawsuit", volume: "1,300", difficulty: "Medium" as const, cpc: "$38.00" },
  { keyword: "hip replacement infection lawsuit", volume: "1,000", difficulty: "Medium" as const, cpc: "$36.00" },
];

const OOTB_SIGNALS = [
  {
    title: "Hospital Volume + CMS PJI Quality Data",
    detail:
      "Bair Hugger was used in ~80% of US ORs — that doesn't help narrow targeting. The flip side does: cross-reference CMS Hospital Compare PJI/SSI quality data, CJR (Comprehensive Care for Joint Replacement) participating hospitals (which track PJI obsessively), and Healthgrades \"Joint Replacement Excellence\" awards. Hospitals scoring in the worst CMS quartile have 30%+ higher readmission rates → density of qualifying plaintiffs.",
  },
  {
    title: "Caregiver / Adult-Child Audience",
    detail:
      "Median plaintiff is 65–80, post-revision-surgery, often using a walker — not the prime Facebook audience. Their adult children are. Target Meta lookalikes around \"caregiver of aging parent,\" \"parent recovery,\" \"post-surgical care.\" Copy: \"Did your mom/dad get an infection after their hip or knee replacement?\" Materially different from typical first-person lawsuit ads.",
  },
  {
    title: "Surgical-Records Friction as a Filter",
    detail:
      "Unlike Depo-Provera (patient knows they took the drug), Bair Hugger requires OR records to confirm device use. Firms that build a fast HIPAA-records-pull pipeline (ChartRequest, Datavant, PicnicHealth) get a CPA advantage. This tort rewards firms with records-acquisition infrastructure, not just lead-gen volume.",
  },
  {
    title: "Statute-of-Limitations Heatmap",
    detail:
      "PJI is often diagnosed 90 days–2 years post-op. State-by-state SOL × statute-of-repose creates filing windows. Texas: 2-yr SOL + 15-yr repose. California: 2-yr SOL with discovery rule. Florida: 4-yr SOL — most favorable. Tennessee, Indiana: 1-yr medical-products SOL — tight. Surface as a state ribbon so firms know which closing windows to attack.",
  },
  {
    title: "CMS HAC PJI Reporting Overlay",
    detail:
      "CMS publishes hospital-level PJI rates under the Hospital-Acquired Condition Reduction Program. Hospitals in the worst quartile have 30%+ higher joint-replacement readmissions. These hospitals = density of qualifying plaintiffs. Wire CMS Hospital Compare data into the platform as a Bair Hugger overlay.",
  },
  {
    title: "Ambulatory Surgery Center Shift (post-2024)",
    detail:
      "CMS moved THA/TKA to the ASC-covered procedure list in 2024. Projection: 51% of joint replacements outpatient by 2026. ASCs have less rigorous infection surveillance → higher PJI underreporting, but Bair Hugger usage is often higher in ASCs. Emerging case-source — flag as upward pressure on case volume in 2027–2028.",
  },
  {
    title: "Veterans / VA Hospitals",
    detail:
      "VA hospitals perform high volumes of joint replacements on 65+ male veterans (high BMI, diabetes-comorbid, ideal Bair Hugger plaintiff demographic). VA's MyHealtheVet portal is a records-acquisition advantage. Targeting layer: VA service area + veteran lookalikes.",
  },
  {
    title: "Diabetic / Obesity Comorbidity Targeting",
    detail:
      "Diabetes ~3x PJI risk; BMI 40+ ~4x. Plaintiff-favorable for qualification (more likely to develop PJI) but defense-friendly on causation (alternative cause). Net effect: better intake conversion, lower per-case settlement value. Target Tier 2/3 settlement plaintiffs but discount expected payout.",
  },
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

function FavorabilityBadge({ favorability }: { favorability: "Plaintiff" | "Defense" }) {
  const styles =
    favorability === "Plaintiff"
      ? "bg-emerald-50 text-success border-success/30"
      : "bg-red-50 text-alert border-alert/30";
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles}`}
    >
      {favorability}-favorable
    </span>
  );
}

/* ── Format Helpers ────────────────────────────────────────────────────── */

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

const TORT_SLUG = "bair_hugger";

export default async function BairHuggerPage() {
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

  const platformMap = new Map<string, string[]>();
  for (const p of platforms) {
    if (p.advertiser_name) {
      platformMap.set(p.advertiser_name, p.platforms);
    }
  }

  const totalAdvertisers = segments.reduce((s, r) => s + r.advertiser_count, 0);
  const totalSpend = segments.reduce((s, r) => s + r.total_spend, 0);
  const totalCreatives = segments.reduce((s, r) => s + r.total_creatives, 0);

  const allPlatforms = new Set<string>();
  for (const p of platforms) {
    for (const plat of p.platforms) allPlatforms.add(plat);
  }

  const topMarkets = [...saturation]
    .sort((a, b) => (b.saturation_score ?? 0) - (a.saturation_score ?? 0))
    .slice(0, 10);

  const tortLabel = "Bair Hugger";
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
            Bair Hugger
          </h1>
          <span className="rounded-full bg-emerald-50 border border-success/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-success">
            Active Litigation
          </span>
        </div>
        <p className="mt-1 text-lg text-slate-gray">
          Periprosthetic Joint Infection (PJI) — MDL 2666
        </p>
        <p className="mt-0.5 text-xs text-slate-gray">
          Last Updated: May 2, 2026
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
          <p className="text-2xl font-bold text-midnight-navy">8,550+</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">MDL 2666</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <DollarSign className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Settlement Range
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">$30K – $250K+</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Projected</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Estimated CPA
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">~$3,500 – $6,500</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Bellwether Trial
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">Hilke Jan 2026</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">On appeal · next 2026</p>
        </div>
      </div>

      {/* ── 3. Case Summary ─────────────────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-4">
          Case Summary
        </h2>
        <div className="space-y-4 text-sm leading-relaxed text-midnight-navy/80">
          <p>
            The 3M&trade; Bair Hugger&trade; Forced-Air Warming System is a
            perioperative warming device (originally Augustine Medical, then
            Arizant Healthcare, acquired by 3M in 2010 for ~$810M). It pushes
            warm air through a disposable blanket draped over surgical patients
            to prevent hypothermia. Plaintiffs allege the device draws
            contaminated air from beneath the operating table, disrupts laminar
            flow in ultra-clean ORs, and deposits airborne bacteria into open
            surgical wounds — leading to deep periprosthetic joint infections
            (PJIs) following hip and knee replacement surgeries.
          </p>
          <p>
            The litigation is consolidated as MDL No. 2666 — In re: Bair Hugger
            Forced Air Warming Devices Products Liability Litigation — in the
            U.S. District Court for the District of Minnesota under Judge Joan
            N. Ericksen. As of April 2026, 8,550 cases are pending in the MDL —
            the 5th-largest active MDL — with 10,701+ historically filed.
          </p>
          <p>
            The litigation has had a turbulent procedural history. In 2017,
            Judge Ericksen excluded plaintiffs&apos; general-causation experts
            and granted summary judgment for 3M. In August 2021, the 8th
            Circuit (9 F.4th 768) reversed that ruling, reinstating the experts
            and reviving the MDL. The first bellwether (Gareis v. 3M, 2018)
            ended in a defense verdict. The next bellwether (Hilke v. 3M)
            was tried beginning January 21, 2026 and is currently on appeal.
            18 bellwether candidates remain.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Defendants
            </p>
            <p className="text-sm text-midnight-navy">
              3M Company, Arizant Healthcare Inc. (subsidiary), Solventum
              Corporation (indemnitor).
            </p>
          </div>
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Legal Theories
            </p>
            <p className="text-sm text-midnight-navy">
              Strict product liability (design defect), failure to warn,
              negligence, breach of implied warranty.
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-md border border-warning/30 bg-amber-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-warning mb-1">
            Corporate Complexity Note
          </p>
          <p className="text-sm text-midnight-navy/80">
            3M completed the spin-off of its Health Care segment as Solventum
            Corporation in 2024, and Solventum agreed in SEC filings (late
            2025–early 2026) to indemnify 3M for uninsured Bair Hugger
            liabilities. The defense bench is still 3M, but the financial
            exposure has effectively transferred to Solventum — relevant for
            firms valuing case inventory against the indemnitor&apos;s balance
            sheet.
          </p>
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
          The core injury is periprosthetic joint infection (PJI) — a deep
          bacterial infection at the site of an implanted hip or knee
          prosthesis — and related deep surgical site infections (SSIs).
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
              Symptoms &amp; Complications
            </p>
            <ul className="space-y-1.5">
              {[
                "Joint pain, swelling, redness, drainage at incision",
                "Fever, chills, malaise",
                "Wound dehiscence",
                "Loosening of prosthesis",
                "Sepsis / bloodstream infection",
                "Osteomyelitis (bone infection)",
                "MRSA and other resistant infections",
                "Amputation (severe cases)",
                "Death (alleged in some cases)",
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
            <ul className="space-y-1.5">
              {[
                "Multi-stage revision surgery (DAIR, 1-stage, 2-stage exchange)",
                "Antibiotic spacer placement",
                "Extended IV antibiotics (typically 6+ weeks)",
                "Long-term oral suppressive antibiotics",
                "Resection arthroplasty / arthrodesis in failed cases",
              ].map((s) => (
                <li
                  key={s}
                  className="flex items-start gap-2 text-sm text-midnight-navy/80"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-intelligence-teal/60" />
                  {s}
                </li>
              ))}
            </ul>
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
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Finding
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  Favorability
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
                  <td className="py-3 px-3 text-midnight-navy/80">
                    {s.finding}
                  </td>
                  <td className="py-3 pl-3 text-center">
                    <FavorabilityBadge favorability={s.favorability} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 rounded-md border border-warning/30 bg-amber-50 px-4 py-3">
          <p className="text-sm text-midnight-navy/80">
            <span className="font-semibold text-warning">Honest read:</span>{" "}
            Unlike Depo-Provera (where the science is consistently
            plaintiff-favorable), Bair Hugger evidence is{" "}
            <span className="font-semibold">mixed and contested</span>.
            Plaintiffs lean on McGovern (2011) and CFD modeling; defense leans
            on the Cochrane Review, FDA statement, AORN 2025 meta-analysis,
            and CDC/NICE guidelines that decline to prohibit FAW. This is a
            causation-driven tort — case selection on documentation quality
            matters more here than in most torts.
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
                "3 yes/no questions: Hip/knee surgery? Infection? Bair Hugger used? + contact info. Cheapest but high rejection at intake — Bair Hugger use is hard to self-confirm.",
            },
            {
              label: "Tier 2: Qualified Lead",
              cpl: "Mid-Range CPL",
              color: "border-warning/30 bg-amber-50",
              tagColor: "bg-warning/10 text-warning",
              details:
                "6–8 step form. Procedure type, surgery date, infection diagnosis, treatment received, hospital + surgeon name, attorney check. Better conversion.",
            },
            {
              label: "Tier 3: Retainer-Ready",
              cpl: "Highest CPA",
              color: "border-alert/30 bg-red-50",
              tagColor: "bg-alert/10 text-alert",
              details:
                "12–15 step deep intake. HIPAA OR-records auth, pathology/culture, revision confirmation, treatment status, comorbidities (diabetes, smoking — defense will probe). Lowest fallout.",
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
          No global settlement reached. Sporadic individual settlements
          reportedly ranging from low five figures to seven figures, but none
          confirmed publicly. Projections below are based on attorney estimates
          and comparable surgical-implant infection MDL outcomes.
        </p>

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

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-emerald-50/60 px-4 py-3">
            <p className="text-xs font-semibold text-success mb-1.5">
              Factors Increasing Value
            </p>
            <ul className="space-y-1">
              {[
                "Multiple revisions / failed revisions",
                "MRSA or resistant organism cultured",
                "Documented sepsis or osteomyelitis",
                "Amputation",
                "Younger plaintiff with lost earnings",
                "Strong OR records confirming Bair Hugger use",
                "OR cultures matching plaintiff isolates",
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
                "Diabetes, obesity (BMI 40+), smoking, immunosuppression",
                "Long delay between surgery and infection",
                "No revision surgery",
                "Weak Bair Hugger documentation",
                "Pre-existing skin infection / colonization",
              ].map((f) => (
                <li key={f} className="flex items-center gap-1.5 text-xs text-midnight-navy/70">
                  <XCircle className="w-3 h-3 shrink-0 text-alert" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 rounded-md bg-cloud/60 px-4 py-3">
          <p className="text-xs font-semibold text-midnight-navy mb-2">
            Timeline to Payout
          </p>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-midnight-navy/70">
            <span className="rounded bg-intelligence-teal/10 px-2 py-1 font-medium text-intelligence-teal">
              Hilke Appeal &amp; Next Bellwethers 2026
            </span>
            <ChevronRight className="w-3 h-3 text-slate-gray" />
            <span className="rounded bg-intelligence-teal/10 px-2 py-1 font-medium text-intelligence-teal">
              Special Master Talks 2026–early 2027
            </span>
            <ChevronRight className="w-3 h-3 text-slate-gray" />
            <span className="rounded bg-intelligence-teal/10 px-2 py-1 font-medium text-intelligence-teal">
              Possible Global Resolution 2027
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

        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Channel Breakdown
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 mb-6">
          {[
            {
              channel: "Google Ads / LSAs",
              detail: "Dominant channel — high-intent post-complication search behavior",
              color: "border-emerald-500/30 bg-emerald-50",
            },
            {
              channel: "Meta (Facebook/Instagram)",
              detail: "Moderate — quiz-style intake; 50–80 demographic; smaller TAM than Depo",
              color: "border-blue-500/30 bg-blue-50",
            },
            {
              channel: "Legal Lead Gen Networks",
              detail: "TheLegalLeads, X Social Media, Lead Sherpa — CPA model ~$3K–$6K per signed retainer",
              color: "border-purple-500/30 bg-purple-50",
            },
            {
              channel: "TV / DRTV",
              detail: "Legacy buys from Morgan & Morgan and Sokolove — daytime cable, news, older demographic match",
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

        <div className="mt-4 rounded-md border border-warning/20 bg-amber-50 px-4 py-3">
          <p className="text-xs text-midnight-navy/80">
            <span className="font-semibold text-warning">Platform Risk:</span>{" "}
            Meta removed law-firm ads recruiting plaintiffs for social media
            addiction lawsuits (April 2026). No direct impact on Bair Hugger to
            date, but device/pharma plaintiff recruitment ads remain at platform
            discretion.
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
          Top organic search results for Bair Hugger litigation keywords.
          Understanding who ranks helps assess content competition and SEO
          opportunity.
        </p>

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
          Competitive landscape — firms with the highest advertising presence
          for Bair Hugger litigation.
        </p>

        {topAdvertisers.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-slate-gray">{topAdvertisers.length} advertisers tracked</p>
              <Link
                href="/advertising/saturation/bair_hugger"
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
              Top advertisers will appear here once data is collected from ad
              platforms.
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

      {/* ── 13. Geographic & Demographic Targeting ──────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Geographic &amp; Demographic Targeting
          </h2>
        </div>

        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Demographic Profile of Joint Replacement Patients (AJRR 2024)
        </h3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Demographic
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  Share / Value
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
            Source: AJRR 2024 Annual Report (PMC12192333).
          </p>
        </div>

        <div className="mb-6 rounded-md border border-warning/30 bg-amber-50 px-4 py-3">
          <p className="text-sm text-midnight-navy/80">
            <span className="font-semibold text-warning">
              Key Targeting Takeaway:
            </span>{" "}
            Bair Hugger demographics are essentially{" "}
            <span className="font-semibold">inverse to Depo-Provera</span>:
            older (60–80), majority white, Medicare population, slight female
            skew. The high-procedure states are NOT the high-Black-population
            Southern crossover states that work for Depo. Reuse of Depo
            audiences will burn budget.
          </p>
        </div>

        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          State-Level Joint Replacement Intensity (Medicare HRR Rates)
        </h3>
        <p className="mb-3 text-xs text-slate-gray">
          Highest hip+knee replacement rates per 1,000 Medicare beneficiaries.
          The &quot;Joint Replacement Belt&quot; runs through the Upper Midwest,
          Mountain West, and Florida retirement corridor.
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
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  Signal
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Key DMAs
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Note
                </th>
              </tr>
            </thead>
            <tbody>
              {STATE_INTENSITY.map((s) => (
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
                  <td className="py-2.5 px-3 text-center">
                    <SignalBadge signal={s.signal} />
                  </td>
                  <td className="py-2.5 px-3 text-midnight-navy/80">
                    {s.dmas}
                  </td>
                  <td className="py-2.5 pl-3 text-midnight-navy/60 text-xs">
                    {s.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-slate-gray">
            Source: Thirukumaran et al., 2020 (PMC8190867); CMS HRR-level
            Medicare data.
          </p>
        </div>
      </div>

      {/* ── 14. Out-of-the-Box Targeting Signals ──────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Out-of-the-Box Targeting Signals
          </h2>
          <span className="rounded-full bg-intelligence-teal/10 border border-intelligence-teal/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-intelligence-teal">
            Differentiated
          </span>
        </div>
        <p className="mb-4 text-xs text-slate-gray">
          Signals that go beyond standard demographic targeting and represent
          genuine intelligence advantages for firms working this MDL.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {OOTB_SIGNALS.map((s, i) => (
            <div
              key={s.title}
              className="rounded-lg border border-intelligence-teal/20 bg-intelligence-teal/5 p-4"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-intelligence-teal text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-midnight-navy">
                    {s.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-midnight-navy/70">
                    {s.detail}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 15. Targeting Implications ─────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Targeting Implications
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              title: "Concentrate in the Joint Replacement Belt",
              detail:
                "Upper Midwest (MN, MI, WI, IA, NE, SD, ND), Mountain West (UT, ID), Florida retirement corridor. Avoid pure Depo/Hair Relaxer overlap.",
            },
            {
              title: "Layer Meta on Adult-Child Caregiver Audiences",
              detail:
                "Not first-person plaintiff audiences. Copy targets caregiver of aging parent — \"Did your mom/dad get an infection after their hip or knee replacement?\"",
            },
            {
              title: "Local Counsel Anchor: Minneapolis-St. Paul DMA",
              detail:
                "MDL home; Meshbesher & Spence is the local heavyweight; in-state filings attract attention.",
            },
            {
              title: "Wire CMS Hospital Compare PJI Overlay",
              detail:
                "Surface high-PJI-rate hospitals as DMA-level density signals.",
            },
            {
              title: "Records-Acquisition Partnership Advantage",
              detail:
                "Promote firms with HIPAA records pipelines — flag this as a CPA differentiator in the campaign builder.",
            },
            {
              title: "SOL Filing-Window State Ribbon",
              detail:
                "State-by-state countdown for closing-window states (TN, IN — 1-yr; FL — 4-yr).",
            },
            {
              title: "VA Veteran Audience Overlay",
              detail:
                "Large population of qualifying patients with strong records access via MyHealtheVet.",
            },
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

      {/* ── 16. Footer / Disclaimer ─────────────────────────────────────── */}
      <div className="rounded-lg border border-cloud bg-cloud/40 p-5">
        <p className="text-xs leading-relaxed text-slate-gray">
          This page is refreshed monthly. Content reflects research and publicly
          available data as of the date shown. Settlement projections are
          attorney estimates and industry benchmarks — not guarantees. This
          page does not constitute legal advice.
        </p>
        <p className="mt-3 text-[11px] text-slate-gray/80">
          Data sources: JPML (MDL 2666 statistics); In re Bair Hugger, 9 F.4th
          768 (8th Cir. 2021); MDL Update; Miller &amp; Zois; Lawsuit
          Information Center; Robert King Law; Solventum 10-K
          (indemnification disclosures); 3M / Solventum defense statement;
          Thirukumaran et al. 2020 (PMC8190867); AJRR 2024 Annual Report
          (PMC12192333); CDC; CMS Comprehensive Care for Joint Replacement
          provider data; FDA MAUDE.
        </p>
      </div>

      <NewLandingPagesCard tortSlug="bair-hugger" tortLabel="Bair Hugger" />
      <AskAIPanel tortContext={BAIR_HUGGER_TORT_CONTEXT} />
    </div>
  );
}
