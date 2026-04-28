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
  Monitor,
  Database,
  Crosshair,
  Activity,
  Landmark,
  Layers,
  ExternalLink,
  Inbox,
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
import { CostBenchmarkScorecard } from "../../../components/cost-benchmark-scorecard";
import type { BenchmarkScorecardData } from "../../../components/cost-benchmark-scorecard";
import { extractDomain } from "@/lib/queries";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OlympusAdverseEventRow {
  id: number;
  category: string;
  detail: string;
  severity: string;
  source: string;
  year: number;
}

interface OlympusDeviceFailureTimelineRow {
  id: number;
  event_date: string;
  event: string;
  significance: string;
  is_future: boolean;
}

interface OlympusQualifyingTierRow {
  id: number;
  tier: string; // 'A' | 'B' | 'C' | 'D'
  label: string;
  criteria: string;
  intake_signal: string;
  estimated_cpl_band: string;
  notes: string;
}

interface OlympusSettlementProjectionRow {
  id: number;
  injury_tier: string;
  low_estimate: number;
  high_estimate: number;
  comparable_litigation: string;
  rationale: string;
}

interface ErcpVolumeRow {
  state: string;
  annual_ercp_estimate: number;
  rank: number;
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

export interface OlympusScopesPageData {
  adverseEvents: OlympusAdverseEventRow[];
  deviceFailureTimeline: OlympusDeviceFailureTimelineRow[];
  qualifyingTiers: OlympusQualifyingTierRow[];
  settlementProjections: OlympusSettlementProjectionRow[];
  ercpVolumeTop15: ErcpVolumeRow[];
  judicialByState: Record<string, { counties: number; profiles: Record<string, number> }>;
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
/*  Static competitive landing-page & ad-creative intelligence          */
/*  (hand-curated from research — refreshed monthly in seed data)        */
/* ------------------------------------------------------------------ */

interface CompetitiveLandingPage {
  firm: string;
  firmType: "Plaintiff Firm" | "Aggregator" | "Lead Gen";
  url: string;
  qualifyingWindow: string; // e.g. "30 days", "90 days"
  qualifyingInjuries: string[];
  hook: string; // the core message/angle
  cta: string;
  ctaStyle: "Phone + Form" | "Form Only" | "Phone Only" | "Chat";
  offersExposureTier: boolean;
  notes: string;
}

const COMPETITIVE_LANDING_PAGES: CompetitiveLandingPage[] = [
  {
    firm: "TorHoerman Law",
    firmType: "Plaintiff Firm",
    url: "https://www.torhoermanlaw.com/olympus-scope-lawsuit/",
    qualifyingWindow: "Not specified (broad)",
    qualifyingInjuries: ["Severe infection", "Sepsis", "Prolonged hospitalization", "Death"],
    hook: "Long-form SEO authority page — 2026 update framing, emphasizes June 2025 FDA import alert + 58 blocked devices",
    cta: "Free, no-obligation case consultation",
    ctaStyle: "Phone + Form",
    offersExposureTier: false,
    notes: "Strong SEO play. Heavy focus on FDA regulatory timeline. Chicago PI firm positioning.",
  },
  {
    firm: "Lawsuit Information Center",
    firmType: "Plaintiff Firm",
    url: "https://www.lawsuit-information-center.com/olympus-scope-infection-lawsuit.html",
    qualifyingWindow: "90 days post-procedure",
    qualifyingInjuries: ["CRE / drug-resistant infection", "Sepsis", "ICU admission", "Death"],
    hook: "The most detailed legal analysis page — breaks down design defect, failure to warn, and safer-alternative theories in plain English. Cites 70% market share, 35+ deaths, 50% CRE mortality.",
    cta: "Free consultation — 800-553-8082",
    ctaStyle: "Phone + Form",
    offersExposureTier: false,
    notes: "Competitive moat is depth of legal reasoning. Good for late-funnel traffic.",
  },
  {
    firm: "Motley Rice",
    firmType: "Plaintiff Firm",
    url: "https://www.motleyrice.com/medical-devices/duodenoscope-infection-lawsuit/olympus-endoscope-recall",
    qualifyingWindow: "Not specified",
    qualifyingInjuries: ["Infection", "UTI", "Sepsis", "Death"],
    hook: "MAJ-891 Class I recall-focused page — positions the January 2025 forceps/irrigation plug recall as the core claim driver",
    cta: "Free consultation",
    ctaStyle: "Phone + Form",
    offersExposureTier: false,
    notes: "Tier-1 firm. Specific to accessory recall, narrower intake.",
  },
  {
    firm: "Levin Papantonio",
    firmType: "Plaintiff Firm",
    url: "https://levinlaw.com/olympus-scopes-lawsuits-infection-sepsis-and-injury-after-endoscopy-procedures/",
    qualifyingWindow: "30 days post-procedure",
    qualifyingInjuries: ["IV antibiotics hospitalization", "HIV", "Tuberculosis", "Sepsis", "Organ failure", "Superbug"],
    hook: "Includes HIV and TB as qualifying diagnoses. Explicitly invites patients who received a notice of exposure.",
    cta: "Free case evaluation",
    ctaStyle: "Phone + Form",
    offersExposureTier: true,
    notes: "Tier-1 MDL firm. 30-day window is narrower than peers — higher quality bar.",
  },
  {
    firm: "Anapol Weiss",
    firmType: "Plaintiff Firm",
    url: "https://www.anapolweiss.com/philadelphia-mass-tort-lawyers/olympus-scope-lawsuit-attorneys/",
    qualifyingWindow: "Since 2015, unspecified post-procedure window",
    qualifyingInjuries: ["Antibiotic-resistant infection", "Sepsis", "Organ failure", "Prolonged hospitalization"],
    hook: "Leads with FDA import alerts and October 2025 Urgent Field Safety Notice. Mass-tort/MDL leadership positioning.",
    cta: "215-735-1130 · Free consultation",
    ctaStyle: "Phone + Form",
    offersExposureTier: false,
    notes: "Philadelphia-based but marketing nationwide. Strong brand authority angle.",
  },
  {
    firm: "Robert King Law Firm",
    firmType: "Plaintiff Firm",
    url: "https://www.robertkinglawfirm.com/mass-torts/olympus-scopes-lawsuit/",
    qualifyingWindow: "Not specified",
    qualifyingInjuries: ["Sepsis", "Infection requiring IV antibiotics", "No prior infection history in past year"],
    hook: "Most detailed recall/action timeline. Exclusion criteria (no prior infection history) is unusually specific.",
    cta: "585-496-2648 · Complete form to see if you qualify",
    ctaStyle: "Form Only",
    offersExposureTier: false,
    notes: "Sharp modal-form intake — strong conversion UX. Regional firm (NY).",
  },
  {
    firm: "The Lanier Law Firm",
    firmType: "Plaintiff Firm",
    url: "https://www.lanierlawfirm.com/product-liability/olympus-scopes-lawsuit/",
    qualifyingWindow: "90 days post-procedure",
    qualifyingInjuries: ["Infection + hospitalization", "Tuberculosis", "HIV"],
    hook: "Aggressive framing: 'even when devices were properly sterilized.' Includes TB + HIV diagnosis triggers.",
    cta: "800-723-3216 · Free consultation",
    ctaStyle: "Phone + Form",
    offersExposureTier: false,
    notes: "Tier-1 firm. Mark Lanier brand halo. Broad 90-day + HIV/TB casts a wide net.",
  },
  {
    firm: "Rafferty Domnick Cunningham & Yaffa (PBG Law)",
    firmType: "Plaintiff Firm",
    url: "https://www.pbglaw.com/olympus-duodenoscope-infection-lawsuits/",
    qualifyingWindow: "90 days (infection) / 30 days (TB/HIV)",
    qualifyingInjuries: ["Hospitalization", "Tuberculosis", "HIV", "Death (wrongful death)"],
    hook: "Split-window qualifier is unusually sophisticated — different timeframes for different diagnoses",
    cta: "Free consultation",
    ctaStyle: "Phone + Form",
    offersExposureTier: false,
    notes: "Florida-based. Cleanest tiered intake criteria in the field.",
  },
  {
    firm: "Sokolove Law",
    firmType: "Plaintiff Firm",
    url: "https://www.sokolovelaw.com/product-liability/medical-devices/endoscopy/",
    qualifyingWindow: "Within past 10 years + 30 days post-procedure",
    qualifyingInjuries: ["Sepsis", "IV antibiotics"],
    hook: "Frames as 'Endoscopy Lawsuit' (generic) rather than Olympus-specific — captures broader procedure traffic",
    cta: "Free case review",
    ctaStyle: "Phone + Form",
    offersExposureTier: false,
    notes: "Generic framing strategy — trades case quality for volume.",
  },
  {
    firm: "CohenMalad LLP",
    firmType: "Plaintiff Firm",
    url: "https://cohenandmalad.com/alerts/contaminated-olympus-scope-lawsuit",
    qualifyingWindow: "Not specified (broad)",
    qualifyingInjuries: ["Infection after endoscope/duodenoscope procedure"],
    hook: "Broadest possible qualifier. Pharmaceutical drug litigation framing.",
    cta: "317-636-6481 · Free confidential consultation",
    ctaStyle: "Phone + Form",
    offersExposureTier: false,
    notes: "Indianapolis-based. Broad net intake.",
  },
  {
    firm: "Saiontz & Kirk (YouHaveALawyer)",
    firmType: "Plaintiff Firm",
    url: "https://www.youhavealawyer.com/scope-infection-lawsuit/",
    qualifyingWindow: "Not specified",
    qualifyingInjuries: ["Bacterial infection post-colonoscopy/endoscopy/ERCP/bronchoscopy"],
    hook: "Also-generic 'scope infection' framing — captures colonoscopy infection traffic specifically",
    cta: "Free case review",
    ctaStyle: "Phone + Form",
    offersExposureTier: false,
    notes: "Not Olympus-branded; catches patients who don't yet know device brand.",
  },
  {
    firm: "Top Class Actions",
    firmType: "Aggregator",
    url: "https://topclassactions.com/lawsuit-settlements/investigations/olympus-endoscope-infection-lawsuit/",
    qualifyingWindow: "Not specified",
    qualifyingInjuries: ["Severe infection", "Sepsis after endoscopy/colonoscopy"],
    hook: "Pure lead-gen: 'It only takes a few minutes to see if you qualify.' Broad, low-quality casting net.",
    cta: "Form (leads resold to attorneys)",
    ctaStyle: "Form Only",
    offersExposureTier: false,
    notes: "Aggregator competition — their form traffic is the volume benchmark to beat on quality.",
  },
  {
    firm: "The Cochran Firm (DC)",
    firmType: "Plaintiff Firm",
    url: "https://www.cochranfirm.com/washington-dc/practice-areas/defective-recalled-products/medical-products/endoscope-infection/",
    qualifyingWindow: "Not specified",
    qualifyingInjuries: ["Infection", "Wrongful death"],
    hook: "UCLA Q180V outbreak / Virginia Mason storytelling — uses the 2013–2015 outbreak narrative",
    cta: "202-682-5800 or 1-800-THE-FIRM",
    ctaStyle: "Phone + Form",
    offersExposureTier: false,
    notes: "Cochran brand halo. Older UCLA-outbreak angle.",
  },
];

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

function getSeverityBorderColor(severity: string): string {
  switch (severity) {
    case "critical": return "border-l-red-500";
    case "high": return "border-l-amber-500";
    case "medium": return "border-l-slate-400";
    default: return "border-l-slate-300";
  }
}

function getSeverityBadge(severity: string): { bg: string; text: string; label: string } {
  switch (severity) {
    case "critical": return { bg: "bg-red-100", text: "text-red-700", label: "Critical" };
    case "high": return { bg: "bg-amber-100", text: "text-amber-700", label: "High" };
    case "medium": return { bg: "bg-slate-100", text: "text-slate-600", label: "Medium" };
    default: return { bg: "bg-slate-100", text: "text-slate-500", label: severity };
  }
}

const TIER_META: Record<string, { color: string; bg: string; border: string; label: string }> = {
  A: { color: "#059669", bg: "bg-emerald-50", border: "border-emerald-300", label: "Tier A — Cleanest" },
  B: { color: "#0891B2", bg: "bg-cyan-50",    border: "border-cyan-300",    label: "Tier B — Strong" },
  C: { color: "#D97706", bg: "bg-amber-50",   border: "border-amber-300",   label: "Tier C — Qualified" },
  D: { color: "#6B7280", bg: "bg-slate-50",   border: "border-slate-300",   label: "Tier D — Investigate" },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function OlympusScopesClient({ data }: { data: OlympusScopesPageData }) {
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

  const sortedTimeline = useMemo(() => {
    return [...data.deviceFailureTimeline].sort((a, b) => a.id - b.id);
  }, [data.deviceFailureTimeline]);

  // Competitive qualifying-window distribution
  const windowStats = useMemo(() => {
    const byWindow: Record<string, number> = {};
    for (const lp of COMPETITIVE_LANDING_PAGES) {
      const key = lp.qualifyingWindow.includes("30")
        ? "30 days"
        : lp.qualifyingWindow.includes("90")
        ? "90 days"
        : lp.qualifyingWindow.includes("10 years")
        ? "10-year lookback"
        : "Unspecified";
      byWindow[key] = (byWindow[key] || 0) + 1;
    }
    return byWindow;
  }, []);
  const exposureTierCount = COMPETITIVE_LANDING_PAGES.filter((lp) => lp.offersExposureTier).length;

  return (
    <div className="space-y-8">
      {/* -- 1. Page Header ------------------------------------------------ */}
      <div>
        <Link
          href="/advertising/torts/bard-powerport"
          className="text-sm text-slate-gray hover:text-midnight-navy"
        >
          <span className="flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Tort Profiles
          </span>
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl font-bold text-midnight-navy">
            Olympus Scopes
          </h1>
          <span className="rounded-full bg-intelligence-teal/10 border border-intelligence-teal/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-intelligence-teal">
            EMERGING &mdash; PRE-MDL
          </span>
        </div>
        <p className="mt-1 text-lg text-slate-gray">
          Duodenoscope, Bronchoscope, and Endoscope-Accessory Infection Litigation
        </p>
        <p className="mt-1 text-sm text-slate-gray">
          Advertising intelligence brief for the emerging Olympus scopes litigation &mdash;
          FDA recall timeline, Urgent Field Safety Notice analysis, hospital-outbreak geography,
          competitive landing-page teardowns, and qualification criteria for plaintiff firms
          moving early on a pre-MDL opportunity.
        </p>
        <p className="mt-0.5 text-xs text-slate-gray">
          Last Updated: April 21, 2026
        </p>
      </div>

      {/* -- 2. Key Stats Row ---------------------------------------------- */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Scale className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              MDL Status
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">None yet</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Individual filings in state + federal courts</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Activity className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              US Market Share
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">~70&ndash;75%</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Olympus share of US duodenoscope market</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Landmark className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              DOJ Plea
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">$85M</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">2018 guilty plea &mdash; failed adverse event reports</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              FDA Import Alert
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">58 devices</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Blocked from US import (June 2025)</p>
        </div>
      </div>

      {/* -- 3. Case Summary ----------------------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-4">
          Case Summary
        </h2>
        <div className="space-y-4 text-sm leading-relaxed text-midnight-navy/80">
          <p>
            <span className="font-semibold text-midnight-navy">Defendant:</span>{" "}
            Olympus Medical Systems Corporation / Olympus Corporation of the Americas.{" "}
            <span className="font-semibold text-midnight-navy">Court:</span>{" "}
            No MDL. Cases currently being filed individually in federal and state courts.{" "}
            <span className="font-semibold text-midnight-navy">JPML petition:</span>{" "}
            None confirmed as of April 2026.{" "}
            <span className="font-semibold text-midnight-navy">Historical verdict:</span>{" "}
            $6.6M jury verdict (Bigler/Virginia Mason, 2017 WA state). Confidential settlements in Shawver, Bigler, and Warner matters.
          </p>
          <p>
            <span className="font-semibold text-midnight-navy">Core Allegations:</span>{" "}
            Olympus reusable duodenoscopes (notably the TJF-Q180V, TJF-Q190V, TJF-Q290V, and TJF-Q170V),
            the MAJ-891 forceps/irrigation plug, certain laser-compatible bronchoscopes, and the ViziShot 2 FLEX
            aspiration needle have design and labeling defects that allow bacterial contamination to persist
            between patients even when manufacturer reprocessing instructions are followed. The elevator mechanism
            on duodenoscopes cannot be reliably sterilized; plaintiffs contend safer single-use and partially
            disposable alternatives were feasible. Failure to warn is amplified by the 2018 DOJ guilty plea for
            not reporting European outbreaks. The October 2025 Urgent Field Safety Notice acknowledges two deaths
            and five serious injuries tied to TJF models between 2024 and 2025.
          </p>
          <p>
            <span className="font-semibold text-midnight-navy">Settlement Projections:</span>{" "}
            No consolidated settlement framework yet. Historical confidential settlements and the 2017 Bigler
            verdict ($6.6M, with hospital comparative fault) anchor the high end. Analogous hospital-infection
            and device-defect MDLs (Bair Hugger, duodenoscope-related prior actions) have settled individual
            cases in the $50K&ndash;$2M+ range depending on severity. Death and CRE-sepsis cases with clean
            causation (identified Olympus device + cultured drug-resistant organism + short time window)
            command the top of the range.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Coordination Status
            </p>
            <p className="text-sm text-midnight-navy">
              No MDL. Watch JPML filings + MTMP Spring 2026 Olympus session for firm coordination signals.
            </p>
          </div>
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Legal Theories
            </p>
            <p className="text-sm text-midnight-navy">
              Design defect, failure to warn, fraudulent concealment (DOJ plea), negligence, breach of implied warranty, wrongful death
            </p>
          </div>
        </div>
      </div>

      {/* -- 4. Key Adverse Events ----------------------------------------- */}
      <div id="adverse-events" className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4.5 h-4.5 text-red-500" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Key Adverse Events &amp; FDA Actions
          </h2>
        </div>
        <p className="mb-4 text-sm text-midnight-navy/70">
          FDA recalls, safety communications, and outbreak-linked evidence documenting device failures and reporting gaps.
        </p>

        {data.adverseEvents.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.adverseEvents.map((item) => {
              const badge = getSeverityBadge(item.severity);
              return (
                <div
                  key={item.id}
                  className={`rounded-lg border-l-4 ${getSeverityBorderColor(item.severity)} border border-cloud bg-white p-4`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-midnight-navy">
                      {item.category}
                    </p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-midnight-navy/70 mb-2">
                    {item.detail}
                  </p>
                  <p className="text-[10px] text-slate-gray">
                    {item.source} ({item.year})
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
            <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
            <p className="text-sm font-medium text-midnight-navy/60">
              Adverse event data loading...
            </p>
          </div>
        )}
      </div>

      {/* -- 5. Device Failure & Litigation Timeline ----------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Device, Recall &amp; Litigation Timeline
          </h2>
        </div>

        {sortedTimeline.length > 0 ? (
          <div className="relative pl-8">
            <div className="absolute left-3 top-2 bottom-2 w-px bg-intelligence-teal/20" />
            {sortedTimeline.map((entry) => (
              <div
                key={entry.id}
                className={`relative mb-4 last:mb-0 ${entry.is_future ? "opacity-60" : ""}`}
              >
                <div
                  className={`absolute -left-5 top-1.5 h-3 w-3 rounded-full border-2 ${
                    entry.is_future
                      ? "border-slate-gray/40 bg-white"
                      : "border-intelligence-teal bg-intelligence-teal"
                  }`}
                  style={entry.is_future ? { borderStyle: "dashed" } : undefined}
                />
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-xs font-semibold ${entry.is_future ? "text-slate-gray" : "text-midnight-navy"}`}>
                        {entry.event_date}
                      </p>
                      {entry.is_future && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          Watch
                        </span>
                      )}
                    </div>
                    <p className={`mt-0.5 text-sm leading-relaxed ${entry.is_future ? "italic text-slate-gray" : "text-midnight-navy/80"}`}>
                      {entry.event}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-gray">
                      {entry.significance}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
            <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
            <p className="text-sm font-medium text-midnight-navy/60">
              Timeline data loading...
            </p>
          </div>
        )}
      </div>

      {/* -- 6. Tiered Qualification Criteria ------------------------------ */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Tiered Qualification Criteria
          </h2>
        </div>
        <p className="mb-4 text-sm text-midnight-navy/70">
          Intake is stratified by causation strength and lead economics. Tier A converts cheapest because
          the patient arrives pre-qualified (hospital notice letter). Tier D is the broadest but most expensive
          to screen.
        </p>

        {data.qualifyingTiers.length > 0 ? (
          <div className="space-y-3">
            {data.qualifyingTiers.map((t) => {
              const meta = TIER_META[t.tier] ?? TIER_META.D;
              return (
                <div
                  key={t.id}
                  className={`rounded-lg border-l-4 ${meta.border} border bg-white p-4`}
                  style={{ borderLeftColor: meta.color }}
                >
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <p className="text-sm font-bold" style={{ color: meta.color }}>
                      {meta.label}: {t.label}
                    </p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.bg}`} style={{ color: meta.color }}>
                      {t.estimated_cpl_band}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-midnight-navy/80 mb-2">
                    <span className="font-semibold text-midnight-navy">Criteria: </span>
                    {t.criteria}
                  </p>
                  <p className="text-xs leading-relaxed text-midnight-navy/70 mb-1">
                    <span className="font-semibold text-midnight-navy">Intake signal: </span>
                    {t.intake_signal}
                  </p>
                  {t.notes && (
                    <p className="text-xs leading-relaxed text-slate-gray italic">
                      {t.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
            <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
            <p className="text-sm font-medium text-midnight-navy/60">
              Qualification tier data loading...
            </p>
          </div>
        )}

        {/* Common Injuries */}
        <h3 className="mt-6 mb-3 text-sm font-semibold text-midnight-navy">
          Qualifying Injuries
        </h3>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {[
            "CRE (carbapenem-resistant Enterobacteriaceae) infection",
            "Pseudomonas aeruginosa bacteremia",
            "Klebsiella pneumoniae infection",
            "E. coli bacteremia",
            "Sepsis or septic shock within 30 days",
            "Organ failure (liver, kidney, multi-organ)",
            "Hospitalization with IV antibiotics",
            "Airway burns from bronchoscope-laser fire",
            "Needle/device fragment injury (ViziShot 2 FLEX)",
            "Distal-cover detachment injury (MAJ-2315)",
            "Wrongful death following scope procedure",
            "HIV / Tuberculosis exposure notification",
          ].map((injury) => (
            <div
              key={injury}
              className="flex items-center gap-2 rounded-md bg-red-50/60 px-3 py-2"
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />
              <p className="text-xs text-midnight-navy/80">{injury}</p>
            </div>
          ))}
        </div>
      </div>

      {/* -- 7. Settlement Projections ------------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Settlement Projections by Injury Tier
          </h2>
        </div>
        <p className="mb-4 text-sm text-midnight-navy/70">
          Pre-MDL estimates derived from the 2017 Bigler verdict, historical confidential Olympus settlements,
          and analogous hospital-infection/defective-device litigation. These are directional &mdash; not guarantees.
        </p>
        {data.settlementProjections.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cloud">
                  <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">Injury Tier</th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">Low</th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">High</th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">Comparable</th>
                  <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">Rationale</th>
                </tr>
              </thead>
              <tbody>
                {data.settlementProjections.map((row) => (
                  <tr key={row.id} className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors">
                    <td className="py-3 pr-4 font-medium text-midnight-navy">{row.injury_tier}</td>
                    <td className="py-3 px-3 text-right font-mono text-midnight-navy">{fmtCur(row.low_estimate)}</td>
                    <td className="py-3 px-3 text-right font-mono text-midnight-navy">{fmtCur(row.high_estimate)}</td>
                    <td className="py-3 px-3 text-xs text-midnight-navy/70">{row.comparable_litigation}</td>
                    <td className="py-3 pl-3 text-xs text-midnight-navy/70">{row.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
            <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
            <p className="text-sm font-medium text-midnight-navy/60">
              Settlement projection data loading...
            </p>
          </div>
        )}
      </div>

      {/* -- 8. Competitive Landing-Page Intelligence ---------------------- */}
      <div className="rounded-lg border border-intelligence-teal/20 bg-gradient-to-br from-intelligence-teal/[0.04] to-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Monitor className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Competitive Landing-Page Intelligence
          </h2>
          <span className="rounded-full bg-cyan-50 border border-cyan-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-700">
            Hand-curated
          </span>
        </div>
        <p className="mb-6 text-sm text-slate-gray">
          {COMPETITIVE_LANDING_PAGES.length} firms actively investigating Olympus scope claims, broken down by
          qualification window, injury scope, and CTA pattern. Refreshed monthly.
        </p>

        {/* Aggregate insights */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-6">
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">30-Day Window</p>
            <p className="text-2xl font-bold text-midnight-navy">{windowStats["30 days"] ?? 0}</p>
            <p className="text-[11px] text-slate-gray">Narrow / highest quality bar</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">90-Day Window</p>
            <p className="text-2xl font-bold text-midnight-navy">{windowStats["90 days"] ?? 0}</p>
            <p className="text-[11px] text-slate-gray">Broad / volume-oriented</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">Exposure-Tier Hook</p>
            <p className="text-2xl font-bold text-midnight-navy">{exposureTierCount}</p>
            <p className="text-[11px] text-slate-gray">Only {exposureTierCount} firms target notice-of-exposure patients</p>
          </div>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">Aggregators Present</p>
            <p className="text-2xl font-bold text-midnight-navy">
              {COMPETITIVE_LANDING_PAGES.filter((lp) => lp.firmType === "Aggregator").length}
            </p>
            <p className="text-[11px] text-slate-gray">Lead-resale competition</p>
          </div>
        </div>

        {/* Landing page table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud">
                <th className="py-3 pr-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">Firm</th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">Window</th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">Hook / Angle</th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">Exposure Tier</th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">CTA Style</th>
              </tr>
            </thead>
            <tbody>
              {COMPETITIVE_LANDING_PAGES.map((lp) => (
                <tr key={lp.firm} className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors align-top">
                  <td className="py-3 pr-3">
                    <a href={lp.url} target="_blank" rel="noopener noreferrer" className="font-medium text-intelligence-teal hover:underline inline-flex items-center gap-1">
                      {lp.firm}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <p className="text-[10px] text-slate-gray mt-0.5">{lp.firmType}</p>
                  </td>
                  <td className="py-3 px-3 text-xs text-midnight-navy/80">{lp.qualifyingWindow}</td>
                  <td className="py-3 px-3 text-xs text-midnight-navy/80 max-w-md">{lp.hook}</td>
                  <td className="py-3 px-3 text-center">
                    {lp.offersExposureTier ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        <Inbox className="w-3 h-3" /> Yes
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-gray">&mdash;</span>
                    )}
                  </td>
                  <td className="py-3 pl-3 text-xs text-midnight-navy/80">{lp.cta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Creative hooks observed */}
        <h3 className="mt-6 mb-3 text-sm font-semibold text-midnight-navy">
          Creative Hooks We Can Beat
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              title: "The 'Exposure Letter' Gap",
              detail: "Only 1 of 13 tracked firms explicitly invites patients who received a hospital exposure-notification letter. That's an under-served, pre-qualified intake with the cleanest causation chain (hospital has already identified the device and the exposed patient). Build a dedicated 'Got a hospital letter about a scope procedure?' creative + landing page.",
            },
            {
              title: "The Split-Window Edge",
              detail: "Rafferty Domnick uses 90 days for infections but 30 days for HIV/TB — that matches clinical reality better than a single cutoff. Adopting this gets you higher-quality leads without shrinking the funnel. Most firms use one blanket window and either over- or under-qualify.",
            },
            {
              title: "Bronchoscope-Fire / ViziShot Angle Is Empty",
              detail: "Every major firm markets the duodenoscope-infection story. Almost none run separate creatives for airway-fire bronchoscope injuries (Class I recall, 3 injuries + 1 death) or ViziShot 2 FLEX needle-fragment injuries (40 injuries + 1 death). Much lower volume, but a near-zero-competition keyword space.",
            },
            {
              title: "Hospital-Notice SEO Play",
              detail: "Patients who get exposure letters Google the hospital name + 'infection lawsuit' — not 'Olympus.' Build city/hospital-specific pages (Virginia Mason, UCLA, Cedars-Sinai, Hartford Hospital, UPMC) that capture that late-funnel traffic the branded pages miss.",
            },
          ].map((hook, i) => (
            <div key={i} className="rounded-lg border-l-4 border-intelligence-teal bg-intelligence-teal/5 p-4">
              <div className="flex items-start gap-2">
                <Target className="w-4 h-4 mt-0.5 shrink-0 text-intelligence-teal" />
                <div>
                  <p className="text-sm font-semibold text-midnight-navy">{hook.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-midnight-navy/70">{hook.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* -- 9. Market Opportunity Signals --------------------------------- */}
      <div className="rounded-lg border border-intelligence-teal/20 bg-gradient-to-br from-intelligence-teal/[0.04] to-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Crosshair className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Market Opportunity Signals
          </h2>
        </div>
        <p className="mb-6 text-sm text-slate-gray">
          Intelligence layers for identifying high-opportunity Olympus scope markets
        </p>

        {/* Signal 1: ERCP Volume by State */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-intelligence-teal" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 1: ERCP Volume by State (Top 15)
            </h3>
          </div>
          <p className="mb-2 text-xs text-slate-gray">
            Source: AHRQ HCUP inpatient utilization data + CMS outpatient claims (estimated). ~500K ERCPs/year nationally.
          </p>

          <div className="mb-4 rounded-md border border-intelligence-teal/30 bg-intelligence-teal/5 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              Olympus controls ~70&ndash;75% of the US duodenoscope market. States with the highest annual
              ERCP volume have the largest exposed patient pools &mdash; making them the deepest plaintiff
              pools for duodenoscope-infection claims.
            </p>
          </div>

          {data.ercpVolumeTop15.length > 0 ? (
            <div className="rounded-lg bg-white p-4">
              <p className="mb-3 text-xs font-semibold text-midnight-navy">
                Estimated Annual ERCP Procedures by State
              </p>
              <ResponsiveContainer width="100%" height={data.ercpVolumeTop15.length * 32 + 20}>
                <BarChart
                  data={data.ercpVolumeTop15}
                  layout="vertical"
                  margin={{ top: 0, right: 60, bottom: 0, left: 0 }}
                >
                  <XAxis type="number" domain={[0, "auto"]} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="state"
                    width={140}
                    tick={{ fontSize: 11, fill: "#1B2A4A" }}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `~${value.toLocaleString()} ERCPs/yr`,
                      "Annual ERCP volume",
                    ]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="annual_ercp_estimate" radius={[0, 4, 4, 0]}>
                    {data.ercpVolumeTop15.map((_, i) => (
                      <Cell key={i} fill={i < 5 ? "#0d9488" : "#5EEAD4"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
              <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
              <p className="text-sm font-medium text-midnight-navy/60">ERCP volume data loading...</p>
            </div>
          )}
        </div>

        {/* Signal 2: Outbreak Geography */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4 text-intelligence-teal" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 2: Historical Hospital-Outbreak Geography
            </h3>
          </div>
          <p className="mb-2 text-xs text-slate-gray">
            Hospitals where Olympus-linked CRE outbreaks were publicly identified. These populations received
            exposure notification letters and are the cleanest Tier A intake source.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { hospital: "Virginia Mason Medical Center", city: "Seattle, WA", year: "2013", detail: "Initial CRE cluster, 35+ infected, $6.6M Bigler verdict" },
              { hospital: "UCLA Ronald Reagan Medical Center", city: "Los Angeles, CA", year: "2015", detail: "CRE outbreak, 179 exposed, 7 infections, 2 deaths" },
              { hospital: "Cedars-Sinai Medical Center", city: "Los Angeles, CA", year: "2015", detail: "68 patients exposed to CRE-contaminated duodenoscope" },
              { hospital: "Hartford Hospital", city: "Hartford, CT", year: "2014", detail: "CRE outbreak linked to duodenoscopes" },
              { hospital: "UPMC Presbyterian", city: "Pittsburgh, PA", year: "2012", detail: "Early Klebsiella outbreak cluster" },
              { hospital: "Advocate Lutheran General", city: "Park Ridge, IL", year: "2013", detail: "NDM-producing E. coli outbreak" },
              { hospital: "Ambulatory surgery centers", city: "Nationwide", year: "2015–2025", detail: "Post-FDA safety communication exposure notices ongoing" },
            ].map((h) => (
              <div key={h.hospital} className="rounded-lg border border-cloud bg-white p-3">
                <p className="text-sm font-semibold text-midnight-navy">{h.hospital}</p>
                <p className="text-xs text-slate-gray mb-1">{h.city} &middot; {h.year}</p>
                <p className="text-[11px] text-midnight-navy/70 leading-snug">{h.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Signal 3: FDA Adverse Events Reference */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 3: FDA Adverse Events
            </h3>
          </div>
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              See{" "}
              <a href="#adverse-events" className="font-semibold text-intelligence-teal hover:underline">
                Key Adverse Events
              </a>{" "}
              above &mdash; {data.adverseEvents.length} documented categories of FDA recall and outbreak evidence,
              including {data.adverseEvents.filter((e) => e.severity === "critical").length} critical-severity findings.
            </p>
          </div>
        </div>

        {/* Signal 4: Judicial Profiles */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Scale className="w-4 h-4 text-intelligence-teal" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 4: Judicial Profiles
            </h3>
          </div>
          <p className="mb-2 text-xs text-slate-gray">
            Plaintiff vs. defense-leaning counties across states (pre-MDL venue intelligence)
          </p>

          <div className="mb-4 rounded-md border border-intelligence-teal/30 bg-intelligence-teal/5 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              With no MDL, venue selection is strategic. Early filings in plaintiff-favorable state courts
              (King County WA &mdash; where Bigler was tried, LA County CA, Philadelphia PA, Cook County IL)
              can set early verdict benchmarks before any consolidation.
            </p>
          </div>

          {judicialStates.length > 0 ? (
            <div>
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
              <p className="text-sm font-medium text-midnight-navy/60">Judicial profile data loading...</p>
            </div>
          )}
        </div>

        {/* Signal 5: PI Viability */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-intelligence-teal" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 5: PI Viability Scores
            </h3>
          </div>
          <p className="mb-3 text-xs text-slate-gray">
            State-level plaintiff-friendliness for personal injury claims
          </p>
          <Link
            href="/pi-viability"
            className="inline-flex items-center gap-1 text-xs font-semibold text-intelligence-teal hover:underline"
          >
            View PI Viability Scores <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

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

      {/* -- Cross-Signal Callout ----------------------------------------- */}
      <div className="rounded-lg border-l-4 border-intelligence-teal bg-intelligence-teal/[0.04] p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Cross-Signal Analysis
          </h2>
        </div>
        <p className="text-sm text-midnight-navy/80">
          The strongest Olympus scopes opportunities sit at the intersection of (a) high ERCP volume, (b) a
          historical outbreak hospital within the metro, and (c) a plaintiff-favorable state court. Seattle,
          Los Angeles, Philadelphia, Pittsburgh, and Chicago all hit those three layers. Houston, Miami, and
          Atlanta are large ERCP pools without the outbreak-letter inventory &mdash; meaning paid media
          must work harder, but the field is less crowded than the branded outbreak markets.
        </p>
      </div>

      {/* -- 10. Geographic & Demographic Targeting ----------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Geographic &amp; Demographic Targeting
          </h2>
        </div>

        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
            Target Demographics
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-cloud/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
                Primary Demographic
              </p>
              <p className="text-sm text-midnight-navy">
                Adults 45+ who underwent ERCP, EUS, bronchoscopy, or endoscopy at an academic medical center since 2015 and were subsequently hospitalized for sepsis or drug-resistant infection
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
                Secondary Demographic
              </p>
              <p className="text-sm text-midnight-navy">
                Families of deceased hospital-infection patients (wrongful death) &middot; Patients who received an exposure notification letter from their hospital
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
                Age Range
              </p>
              <p className="text-sm text-midnight-navy">
                45&ndash;80 (peak ERCP demographic &mdash; gallstone disease, pancreatic/biliary imaging, CBD clearance)
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
                Regional Focus
              </p>
              <p className="text-sm text-midnight-navy">
                High-ERCP + outbreak-hospital metros: Seattle, Los Angeles, Pittsburgh, Philadelphia, Chicago, Hartford, NYC, Boston
              </p>
            </div>
          </div>
        </div>

        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Key Metro Areas
        </h3>
        <div className="grid gap-1.5 sm:grid-cols-2 mb-6">
          {[
            "Seattle, WA (Virginia Mason — 2013 outbreak, Bigler $6.6M verdict)",
            "Los Angeles, CA (UCLA + Cedars-Sinai — 2015 CRE outbreaks)",
            "Pittsburgh, PA (UPMC — 2012 Klebsiella cluster)",
            "Hartford, CT (Hartford Hospital — 2014 outbreak)",
            "Chicago, IL (Advocate Lutheran + Cook County state venue)",
            "Philadelphia, PA (Anapol Weiss territory, Philly juries)",
            "Houston, TX (high ERCP volume, MD Anderson, less crowded)",
            "Miami / Fort Lauderdale, FL (high elderly ERCP volume)",
            "New York City, NY (large volume, tort-friendly state courts)",
            "Boston, MA (academic medical centers, MGH/BWH ERCP volume)",
          ].map((metro) => (
            <div
              key={metro}
              className="flex items-center gap-2 rounded-md bg-cloud/60 px-3 py-2"
            >
              <MapPin className="w-3.5 h-3.5 shrink-0 text-intelligence-teal" />
              <p className="text-sm text-midnight-navy">{metro}</p>
            </div>
          ))}
        </div>

        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Targeting Implications
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              title: "Pre-MDL First-Mover Advantage",
              detail: "With no MDL yet, every filing choice shapes the litigation's eventual consolidation and venue. Firms moving now build case inventory at the lowest CPL and earn early-bellwether positioning if the JPML consolidates later. Duodenoscope-scale torts typically grow 5–10x from first-filer count to pre-settlement peak.",
            },
            {
              title: "Exposure-Letter Intake Is Cheapest",
              detail: "Patients who received a hospital exposure-notification letter are pre-qualified by the hospital itself — causation is essentially established. These leads convert at multiples of generic 'scope infection' traffic. The 'Got a letter?' creative angle is massively underused in the field (only 1 of 13 tracked firms runs it).",
            },
            {
              title: "MTMP Spring 2026 Coordination",
              detail: "Olympus Scopes was a featured session at MTMP Spring 2026 (March). That means peer firms are actively pitching clients now. Expect paid search competition to heat up in Q2–Q3 2026. Lock in SEO content and retargeting audiences before CPCs climb.",
            },
            {
              title: "Bronchoscope-Fire / ViziShot Niches",
              detail: "Two Class I recalls sit outside the duodenoscope storyline: laser-compatible bronchoscope airway fires (3 injuries + 1 death) and ViziShot 2 FLEX needle fragments (40 injuries + 1 death). Low volume but near-zero competition — build separate narrow creatives rather than lumping under 'Olympus scope lawsuit' to capture the self-diagnosing patient.",
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

      {/* -- 11. Advertising Landscape (LIVE DATA) ------------------------- */}
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
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">Advertisers</p>
                </div>
                <p className="text-2xl font-bold text-midnight-navy">{fmtNum(data.totalAdvertisers)}</p>
              </div>
              <div className="rounded-lg bg-cloud/60 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <DollarSign className="w-3.5 h-3.5 text-intelligence-teal" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">Est. Spend</p>
                </div>
                <p className="text-2xl font-bold text-midnight-navy">{fmtCur(data.totalSpend)}</p>
              </div>
              <div className="rounded-lg bg-cloud/60 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Eye className="w-3.5 h-3.5 text-intelligence-teal" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">Unique Creatives</p>
                </div>
                <p className="text-2xl font-bold text-midnight-navy">{fmtNum(data.totalCreatives)}</p>
              </div>
              <div className="rounded-lg bg-cloud/60 p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Monitor className="w-3.5 h-3.5 text-intelligence-teal" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">Platforms</p>
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
                <h3 className="mb-3 text-sm font-semibold text-midnight-navy">Advertiser Segments</h3>
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
                        <p className="mt-2 text-2xl font-bold text-midnight-navy">{seg.advertiser_count}</p>
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
              Data will appear here automatically once collected from ad platforms. Field is still thin &mdash; expect low advertiser count relative to mature torts.
            </p>
          </div>
        )}
      </div>

      <CostBenchmarkScorecard data={data.benchmark} />

      {/* -- Top Advertisers ---------------------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">Top Advertisers</h2>
          {data.topAdvertisers.length > 0 && (
            <span className="rounded-full bg-emerald-50 border border-success/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success flex items-center gap-1">
              <Database className="w-3 h-3" /> Live Data
            </span>
          )}
        </div>
        <p className="mb-4 text-xs text-slate-gray">
          Competitive landscape &mdash; firms with the highest advertising presence for Olympus scope litigation.
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
                    <tr key={`${adv.advertiser_name}-${i}`} className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors">
                      <td className="py-3 pr-4 font-medium text-midnight-navy">{adv.advertiser_name}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: meta.bg, color: meta.color }}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {advPlatforms.length > 0 ? (
                            advPlatforms.map((p) => (
                              <span key={p} className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: PLATFORM_COLORS[p] ?? "#6B7280" }}>
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
            <p className="text-sm font-medium text-midnight-navy/60">Advertiser data collection in progress</p>
            <p className="mt-1 text-xs text-slate-gray">Top advertisers will appear here once data is collected from ad platforms.</p>
          </div>
        )}
      </div>

      {/* -- Sample Ads --------------------------------------------------- */}
      {data.sampleAds.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4.5 h-4.5 text-intelligence-teal" />
            <h2 className="font-heading text-lg font-semibold text-midnight-navy">Sample Ads</h2>
            <span className="rounded-full bg-emerald-50 border border-success/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success flex items-center gap-1">
              <Database className="w-3 h-3" /> Live Data
            </span>
          </div>
          <p className="mb-4 text-xs text-slate-gray">Recent advertisements observed across platforms</p>
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
                <div key={ad.id} className="rounded-lg border border-cloud bg-cloud/40 p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                      style={{ backgroundColor: sourceBadge.color }}
                    >
                      {sourceBadge.label}
                    </span>
                    <span className="text-[10px] text-slate-gray">{ad.ad_format ?? "\u2014"}</span>
                  </div>
                  <p className="text-sm font-semibold text-midnight-navy leading-snug line-clamp-2">{ad.advertiser_raw}</p>
                  {ad.creative_text && (
                    <p className="text-xs text-midnight-navy/60 line-clamp-2">{ad.creative_text}</p>
                  )}
                  {ad.source === "google_ads" && domain && (
                    <p className="text-xs text-intelligence-teal truncate">{domain}</p>
                  )}
                  {ad.source === "meta_ad_library" && ad.creative_url && (
                    <a href={ad.creative_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-intelligence-teal hover:underline">
                      View in Ad Library &rarr;
                    </a>
                  )}
                  <p className="mt-auto text-[10px] text-slate-gray">
                    {ad.first_seen === ad.last_seen ? ad.last_seen : `${ad.first_seen} \u2014 ${ad.last_seen}`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* -- Top Markets by Saturation ------------------------------------ */}
      {data.topMarkets.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4.5 h-4.5 text-intelligence-teal" />
            <h2 className="font-heading text-lg font-semibold text-midnight-navy">Top Markets by Saturation</h2>
            <span className="rounded-full bg-emerald-50 border border-success/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success flex items-center gap-1">
              <Database className="w-3 h-3" /> Live Data
            </span>
          </div>
          <div className="space-y-2">
            {data.topMarkets.map((m, i) => {
              const score = m.saturation_score ?? 0;
              const scoreColor = score >= 75 ? "#EF4444" : score >= 50 ? "#F59E0B" : score >= 25 ? "#F59E0B" : "#10B981";
              return (
                <div key={`${m.geo_name}-${i}`} className="flex items-center gap-4 rounded-md bg-cloud/60 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-midnight-navy truncate">
                      {m.geo_name}
                      {m.state_abbr && <span className="ml-1.5 text-xs text-slate-gray">{m.state_abbr}</span>}
                    </p>
                    <p className="text-xs text-slate-gray">
                      {fmtNum(m.total_advertisers)} advertisers &middot; {fmtCur(m.estimated_spend)} spend
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-24 h-2 rounded-full bg-white">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(score, 100)}%`, backgroundColor: scoreColor }} />
                    </div>
                    <span className="text-sm font-bold w-10 text-right" style={{ color: scoreColor }}>
                      {score.toFixed(0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* -- Organic Search Landscape ------------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">Organic Search Landscape</h2>
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
                  {r.snippet && <p className="mt-0.5 text-sm text-midnight-navy/60 pr-8">{r.snippet}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* -- Sources & Methodology ---------------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">Sources &amp; Methodology</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            "FDA MAUDE Database",
            "FDA 510(k) Database",
            "FDA Recall Database",
            "FDA Import Alert 89-04 (2025)",
            "Olympus Urgent Field Safety Notice (Oct 2025)",
            "U.S. DOJ Press Release (2018 plea)",
            "JPML Docket Monitoring",
            "AHRQ HCUP Inpatient ERCP Utilization",
            "Bigler v. Olympus (King County, WA 2017)",
            "MTMP Spring 2026 Olympus Scopes Session",
            "Plaintiff firm landing pages (hand-curated monthly)",
            "Meta Ad Library, Google Ads transparency data",
            "TorHoerman, Motley Rice, Levin Papantonio, Anapol Weiss, Lanier, Lawsuit Info Center",
          ].map((source) => (
            <div key={source} className="flex items-start gap-2 rounded-md bg-cloud/60 px-3 py-2">
              <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-intelligence-teal" />
              <p className="text-xs text-midnight-navy/80">{source}</p>
            </div>
          ))}
        </div>
      </div>

      {/* -- Footer / Disclaimer ------------------------------------------ */}
      <div className="rounded-lg border border-cloud bg-cloud/40 p-5">
        <p className="text-xs leading-relaxed text-slate-gray">
          This page is refreshed monthly. Content reflects research and publicly available data as of the date shown.
          Settlement projections are attorney estimates and industry benchmarks based on analogous litigation &mdash; not
          guarantees. This page does not constitute legal advice. Olympus Scopes is a pre-MDL emerging tort; case counts,
          coordination, and venue may evolve quickly.
        </p>
        <p className="mt-3 text-[11px] text-slate-gray/80">
          Data sources: FDA MAUDE / 510(k) / Recall / Import Alert databases, Olympus field safety notices, DOJ press
          releases, JPML docket, AHRQ HCUP, plaintiff firm landing pages, Meta Ad Library, Google Ads transparency data.
        </p>
      </div>
    </div>
  );
}
