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
  Calendar,
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

interface BardAdverseEventRow {
  id: number;
  category: string;
  detail: string;
  severity: string;
  source: string;
  year: number;
}

interface BardBellwetherRow {
  id: number;
  trial_number: number;
  case_name: string;
  injury_type: string;
  trial_date: string;
  status: string;
}

interface BardDeviceFailureTimelineRow {
  id: number;
  event_date: string;
  event: string;
  significance: string;
  is_future: boolean;
}

interface CancerIncidenceAggregated {
  state: string;
  avg_incidence_rate: number;
  total_annual_cases: number;
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

export interface BardPowerPortPageData {
  adverseEvents: BardAdverseEventRow[];
  bellwetherSchedule: BardBellwetherRow[];
  deviceFailureTimeline: BardDeviceFailureTimelineRow[];
  cancerIncidenceTop15: CancerIncidenceAggregated[];
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BardPowerPortClient({ data }: { data: BardPowerPortPageData }) {
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

  // Sort timeline by event_date
  const sortedTimeline = useMemo(() => {
    return [...data.deviceFailureTimeline].sort((a, b) => {
      // Simple text sort works since dates are like "1999", "March 2020", etc.
      return a.id - b.id;
    });
  }, [data.deviceFailureTimeline]);

  return (
    <div className="space-y-8">
      {/* -- 1. Page Header ------------------------------------------------ */}
      <div>
        <Link
          href="/advertising/torts/afff-firefighting-foam"
          className="text-sm text-slate-gray hover:text-midnight-navy"
        >
          <span className="flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Tort Profiles
          </span>
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl font-bold text-midnight-navy">
            Bard PowerPort Catheter
          </h1>
          <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-600">
            BELLWETHERS BEGINNING &mdash; April 2026
          </span>
        </div>
        <p className="mt-1 text-lg text-slate-gray">
          MDL 3081 &middot; D. Ariz. &middot; Judge David G. Campbell
        </p>
        <p className="mt-1 text-sm text-slate-gray">
          Advertising intelligence brief for Bard PowerPort catheter litigation &mdash;
          FDA adverse event data, Chronoflex material failure timeline, bellwether schedule,
          cancer incidence signals, and geographic targeting for plaintiff firms.
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
          <p className="text-2xl font-bold text-midnight-navy">3,044</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">as of April 2026</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Activity className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Device on Market
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">27 years</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">since 1999 &mdash; no clinical trials (510(k))</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Landmark className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Key Ruling
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">Expert blocked</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">FDA expert cannot call device &ldquo;safe&rdquo;</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              First Bellwether
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">April 21, 2026</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Cook v. BD &mdash; infection case</p>
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
            Becton Dickinson (BD) / Bard Access Systems / C.R. Bard.{" "}
            <span className="font-semibold text-midnight-navy">Court:</span>{" "}
            U.S. District Court, District of Arizona.{" "}
            <span className="font-semibold text-midnight-navy">Judge:</span>{" "}
            Hon. David G. Campbell. MDL created 2020. Pending cases: 3,044 (as of April 11, 2026).
            No settlements yet.
          </p>
          <p>
            <span className="font-semibold text-midnight-navy">Core Allegations:</span>{" "}
            Chronoflex polyurethane tubing becomes brittle over time, causing catheter fractures
            under normal physiological stress. Fractured catheter fragments migrate to heart, lungs,
            and other organs &mdash; requiring emergency surgical extraction or causing death.
            Bard knew of material degradation risks but continued marketing the device.
            Device entered market via FDA 510(k) clearance &mdash; never tested for long-term
            durability in human patients. Barium sulfate additive (for radiopacity) accelerates
            material degradation. Failure to warn physicians and patients of known fracture risks.
            Fraudulent concealment of internal testing data showing degradation.
          </p>
          <p>
            <span className="font-semibold text-midnight-navy">Settlement Projections:</span>{" "}
            No settlements yet. The first bellwether trial (Cook v. BD, April 21, 2026) will
            establish case values. Legal analysts compare to other defective device MDLs: IVC filter
            litigation settled individual cases for $50K&ndash;$500K; hip implant cases settled for
            $200K&ndash;$600K per plaintiff. PowerPort cases with cardiac migration and emergency
            surgery could command higher individual values. The blocking of Bard&apos;s FDA expert
            is a significant plaintiff victory heading into trials.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Court &amp; Judge
            </p>
            <p className="text-sm text-midnight-navy">
              D. Ariz. &mdash; Hon. David G. Campbell
            </p>
          </div>
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Legal Theories
            </p>
            <p className="text-sm text-midnight-navy">
              Negligence, strict product liability, breach of warranty, failure to recall, fraudulent concealment
            </p>
          </div>
        </div>
      </div>

      {/* -- 4. Key Adverse Events (BARD-SPECIFIC) ------------------------- */}
      <div id="adverse-events" className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4.5 h-4.5 text-red-500" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Key Adverse Events
          </h2>
        </div>
        <p className="mb-4 text-sm text-midnight-navy/70">
          FDA and litigation evidence documenting device failures and safety concerns.
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
            Device Failure &amp; Litigation Timeline
          </h2>
        </div>

        {sortedTimeline.length > 0 ? (
          <div className="relative pl-8">
            {/* Vertical line */}
            <div className="absolute left-3 top-2 bottom-2 w-px bg-intelligence-teal/20" />
            {sortedTimeline.map((entry) => (
              <div
                key={entry.id}
                className={`relative mb-4 last:mb-0 ${entry.is_future ? "opacity-60" : ""}`}
              >
                {/* Dot */}
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
                          Upcoming
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

      {/* -- 6. Bellwether Trial Schedule ----------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Scale className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Bellwether Trial Schedule
          </h2>
        </div>

        {/* Callout box */}
        <div className="mb-4 rounded-md border border-intelligence-teal/30 bg-intelligence-teal/5 px-4 py-3">
          <p className="text-sm text-midnight-navy/80">
            The first bellwether &mdash; <span className="font-semibold">Cook v. BD</span> (infection case) &mdash;
            begins <span className="font-semibold">April 21, 2026</span>. Six bellwether trials scheduled through
            February 2027, each testing a different injury type: infection, catheter fracture, migration,
            thrombosis, fracture + migration combination, and multiple injuries.
          </p>
        </div>

        {data.bellwetherSchedule.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.bellwetherSchedule.map((trial) => {
              const isUpcoming = trial.status === "upcoming";
              return (
                <div
                  key={trial.id}
                  className={`rounded-lg border p-4 ${
                    isUpcoming
                      ? "border-intelligence-teal/40 bg-intelligence-teal/5"
                      : "border-cloud bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-gray">
                      Trial {trial.trial_number}
                    </p>
                    {isUpcoming ? (
                      <span className="rounded-full bg-intelligence-teal/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-intelligence-teal">
                        NEXT
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Scheduled
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-midnight-navy mb-1">
                    {trial.case_name}
                  </p>
                  <p className="text-xs text-midnight-navy/70 mb-2">
                    Injury: {trial.injury_type}
                  </p>
                  <p className="text-xs font-medium text-intelligence-teal">
                    {trial.trial_date}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
            <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
            <p className="text-sm font-medium text-midnight-navy/60">
              Bellwether schedule data loading...
            </p>
          </div>
        )}
      </div>

      {/* -- 7. Research & Qualification Criteria --------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Research &amp; Qualification Criteria
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-cloud bg-cloud/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
              Who Qualifies
            </p>
            <p className="text-sm text-midnight-navy/80 leading-relaxed">
              Any patient who had a Bard PowerPort (or Bard PowerPort MRI) implanted and
              experienced catheter fracture, fragment migration, blood clots (thrombosis),
              infection at the port site, device malfunction requiring surgical removal, or
              injury/death from fragment embolization. Both current and past PowerPort patients qualify.
            </p>
          </div>
          <div className="rounded-md border border-cloud bg-cloud/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
              Required Documentation
            </p>
            <p className="text-sm text-midnight-navy/80 leading-relaxed">
              Medical records documenting the device implantation and injury. Surgical
              records if the device was removed. Imaging (X-ray, CT) showing catheter fracture
              or fragment migration. Hospital records for emergency interventions.
            </p>
          </div>
          <div className="rounded-md border border-cloud bg-cloud/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
              Statute of Limitations
            </p>
            <p className="text-sm text-midnight-navy/80 leading-relaxed">
              Varies by state. Many states apply a &ldquo;discovery rule&rdquo; &mdash; the SOL
              begins when the patient knew or should have known the injury was caused by the device.
              Given the recent surge in awareness, many patients may still be within their SOL.
            </p>
          </div>
          <div className="rounded-md border border-cloud bg-cloud/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
              Estimated Case Values
            </p>
            <p className="text-sm text-midnight-navy/80 leading-relaxed">
              $50K&ndash;$500K+ depending on injury severity. Cases involving cardiac migration,
              emergency surgery, or death at the higher end. IVC filter and hip implant MDLs
              provide comparable benchmarks.
            </p>
          </div>
        </div>

        {/* Common Injuries */}
        <h3 className="mt-6 mb-3 text-sm font-semibold text-midnight-navy">
          Common Injuries
        </h3>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {[
            "Catheter fracture (most common)",
            "Fragment migration to heart or lungs",
            "Pulmonary embolism",
            "Cardiac perforation",
            "Infection requiring additional surgery",
            "Deep vein thrombosis",
            "Device malfunction requiring premature removal",
            "Death (in severe migration/embolism cases)",
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

      {/* -- 8. Market Opportunity Signals --------------------------------- */}
      <div className="rounded-lg border border-intelligence-teal/20 bg-gradient-to-br from-intelligence-teal/[0.04] to-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Crosshair className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Market Opportunity Signals
          </h2>
        </div>
        <p className="mb-6 text-sm text-slate-gray">
          Intelligence layers for identifying high-opportunity PowerPort markets
        </p>

        {/* -- Signal 8a: Cancer Incidence by State (Horizontal Bar) ----- */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-intelligence-teal" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 1: Cancer Incidence by State (Top 15)
            </h3>
          </div>
          <p className="mb-2 text-xs text-slate-gray">
            Source: CDC/NCI USCS Cancer Statistics &mdash; All Cancer Sites, county-level aggregated by state
          </p>

          <div className="mb-4 rounded-md border border-intelligence-teal/30 bg-intelligence-teal/5 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              PowerPort catheters are primarily used in cancer patients for chemotherapy delivery.
              States with the highest cancer incidence rates have the largest populations of patients
              who may have been implanted with a PowerPort &mdash; making them the deepest plaintiff
              pools for this litigation.
            </p>
          </div>

          {data.cancerIncidenceTop15.length > 0 ? (
            <div className="rounded-lg bg-white p-4">
              <p className="mb-3 text-xs font-semibold text-midnight-navy">
                Average Cancer Incidence Rate by State (per 100K)
              </p>
              <ResponsiveContainer width="100%" height={data.cancerIncidenceTop15.length * 32 + 20}>
                <BarChart
                  data={data.cancerIncidenceTop15}
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
                    formatter={(value: number, _name: string, props: { payload: CancerIncidenceAggregated }) => [
                      `${value} per 100K (${props.payload.total_annual_cases.toLocaleString()} annual cases)`,
                      "Avg Incidence Rate",
                    ]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="avg_incidence_rate" radius={[0, 4, 4, 0]}>
                    {data.cancerIncidenceTop15.map((_, i) => (
                      <Cell key={i} fill={i < 5 ? "#0d9488" : "#5EEAD4"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
              <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
              <p className="text-sm font-medium text-midnight-navy/60">
                Cancer incidence data loading...
              </p>
            </div>
          )}
        </div>

        {/* -- Signal 8b: FDA Adverse Events Reference ------------------- */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 2: FDA Adverse Events
            </h3>
          </div>
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              See{" "}
              <a href="#adverse-events" className="font-semibold text-intelligence-teal hover:underline">
                Key Adverse Events
              </a>{" "}
              above &mdash; {data.adverseEvents.length} documented categories of FDA and litigation evidence,
              including {data.adverseEvents.filter((e) => e.severity === "critical").length} critical-severity findings.
            </p>
          </div>
        </div>

        {/* -- Signal 8c: Judicial Profiles ------------------------------ */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Scale className="w-4 h-4 text-intelligence-teal" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 3: Judicial Profiles
            </h3>
          </div>
          <p className="mb-2 text-xs text-slate-gray">
            Plaintiff vs. defense-leaning counties across states
          </p>

          <div className="mb-4 rounded-md border border-intelligence-teal/30 bg-intelligence-teal/5 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              Judge Campbell in D. Arizona has been favorable to plaintiffs &mdash; blocked
              BD&apos;s FDA expert from telling jurors the device was &ldquo;safe&rdquo; based
              on 510(k) clearance.
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
              <p className="text-sm font-medium text-midnight-navy/60">
                Judicial profile data loading...
              </p>
            </div>
          )}
        </div>

        {/* -- Signal 8d: PI Viability Scores ---------------------------- */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-intelligence-teal" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 4: PI Viability Scores
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
          <Link
            href="/cancer-incidence"
            className="inline-flex items-center gap-1 text-xs font-semibold text-intelligence-teal hover:underline"
          >
            View Cancer Incidence Data <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* -- Cross-Signal Analysis Callout ------------------------------- */}
      <div className="rounded-lg border-l-4 border-intelligence-teal bg-intelligence-teal/[0.04] p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Cross-Signal Analysis
          </h2>
        </div>
        <p className="text-sm text-midnight-navy/80">
          The highest-opportunity states combine high cancer incidence (large PowerPort patient pools)
          with favorable judicial environments and strong PI viability scores. States like Kentucky,
          Louisiana, and Florida have both high cancer rates and large populations &mdash; representing
          the deepest advertising opportunities for plaintiff firms.
        </p>
      </div>

      {/* -- 9. Geographic & Demographic Targeting ------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Geographic &amp; Demographic Targeting
          </h2>
        </div>

        {/* Target Demographics */}
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
                Cancer patients and survivors aged 40&ndash;75 who underwent chemotherapy with an implanted port catheter
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
                Secondary Demographic
              </p>
              <p className="text-sm text-midnight-navy">
                Family members of deceased cancer patients who had a PowerPort (wrongful death claims)
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
                Age Range
              </p>
              <p className="text-sm text-midnight-navy">
                40&ndash;75 (peak cancer treatment demographic; though younger patients also receive ports)
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
                Regional Focus
              </p>
              <p className="text-sm text-midnight-navy">
                States with highest cancer incidence rates: KY, LA, IA, WV, MN, NY, IL, FL
              </p>
            </div>
          </div>
        </div>

        {/* Key Metro Areas */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Key Metro Areas
        </h3>
        <div className="grid gap-1.5 sm:grid-cols-2 mb-6">
          {[
            "Phoenix, AZ (MDL venue — D. Arizona)",
            "New York City, NY (high cancer treatment volume)",
            "Houston, TX (MD Anderson Cancer Center)",
            "Chicago, IL (major oncology hub)",
            "Los Angeles, CA (large population + cancer centers)",
            "Miami / Fort Lauderdale, FL (high cancer incidence + elderly population)",
            "Philadelphia, PA (multiple major cancer centers)",
            "Louisville / Lexington, KY (highest cancer incidence state)",
            "New Orleans, LA (second highest cancer incidence)",
            "Minneapolis, MN (high cancer incidence state)",
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

        {/* Targeting Implications */}
        <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
          Targeting Implications
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              title: "Cancer Community Targeting",
              detail:
                "Unlike most tort litigation, PowerPort cases have a clearly defined patient population: cancer patients and survivors. This enables highly targeted advertising through oncology-related digital properties, cancer support forums, survivorship organizations, and health-condition-based audience segments that general PI firms miss.",
            },
            {
              title: "Bellwether Timing Advantage",
              detail:
                "With the first trial starting April 21, 2026 and six bellwethers scheduled through February 2027, there is a 10-month window of sustained media coverage. Firms that establish advertising presence before the first verdict will capture awareness as each subsequent trial generates news. Early mover advantage is significant \u2014 the MDL has 3,044 cases but plaintiff pools for medical devices often expand 5\u201310x during bellwether phases.",
            },
            {
              title: "PowerPICC Recall Momentum",
              detail:
                "The March 2025 FDA Class I recall of BD\u2019s PowerPICC catheters for the same material fatigue issue is a powerful creative angle: \u2018BD already recalled one catheter for the exact defect at the heart of 3,000+ PowerPort lawsuits.\u2019 This validates plaintiff claims and drives urgency for patients who haven\u2019t yet filed.",
            },
            {
              title: "Expert Ruling Advantage",
              detail:
                "Judge Campbell\u2019s March 2026 order blocking Bard\u2019s FDA expert from telling jurors the device was \u2018safe\u2019 based on 510(k) clearance removes a key defense argument. This is worth highlighting in advertising \u2014 it signals the court takes the safety concerns seriously and shifts the narrative toward plaintiff strength.",
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

      {/* -- 10. Advertising Landscape (LIVE DATA) ------------------------- */}
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

      {/* -- Cost Benchmark Scorecard ---------------------------------- */}
      <CostBenchmarkScorecard data={data.benchmark} />

      {/* -- Top Advertisers (LIVE DATA) -------------------------------- */}
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
          Competitive landscape &mdash; firms with the highest advertising presence for Bard PowerPort litigation.
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

      {/* -- Sample Ads (LIVE DATA) ------------------------------------ */}
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

      {/* -- Top Markets by Saturation (LIVE DATA) --------------------- */}
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

      {/* -- SERP Visibility (LIVE DATA) ------------------------------- */}
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

      {/* -- Sources & Methodology ------------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Sources &amp; Methodology
          </h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            "FDA MAUDE Database",
            "FDA 510(k) Database",
            "FDA Recall Database",
            "MDL 3081 Court Filings",
            "JPML Transfer Orders",
            "BD Urgent Medical Device Product Recall Notice (March 2025)",
            "CDC/NCI USCS Cancer Statistics",
            "ConsumerNotice.org",
            "AboutLawsuits.com",
            "TorHoerman Law",
            "Lawsuit Legal News",
            "Plaintiff Expert Reports",
            "Meta Ad Library, Google Ads transparency data",
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

      {/* -- Footer / Disclaimer --------------------------------------- */}
      <div className="rounded-lg border border-cloud bg-cloud/40 p-5">
        <p className="text-xs leading-relaxed text-slate-gray">
          This page is refreshed monthly. Content reflects research and publicly
          available data as of the date shown. Settlement projections are attorney
          estimates and industry benchmarks &mdash; not guarantees. This page does not
          constitute legal advice.
        </p>
        <p className="mt-3 text-[11px] text-slate-gray/80">
          Data sources: FDA MAUDE Database, FDA 510(k) Database, FDA Recall Database,
          MDL 3081 court filings, JPML, CDC/NCI USCS Cancer Statistics, BD Recall Notice (2025),
          Meta Ad Library, Google Ads transparency data.
        </p>
      </div>
    </div>
  );
}
