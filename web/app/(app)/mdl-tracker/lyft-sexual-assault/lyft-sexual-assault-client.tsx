"use client";

import { useState, useMemo } from "react";
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
  ChevronDown,
  ChevronUp,
  Eye,
  Monitor,
  Database,
  Crosshair,
  CarFront,
  Landmark,
  BarChart3,
  UserX,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  LabelList,
} from "recharts";
import { CostBenchmarkScorecard } from "../../components/cost-benchmark-scorecard";
import type { BenchmarkScorecardData } from "../../components/cost-benchmark-scorecard";
import { extractDomain } from "@/lib/queries";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SexualAssaultRateRow {
  state: string;
  rape_rate_per_100k: number;
  total_rapes_2024: number;
}

interface RidesharePenetrationRow {
  state: string;
  rideshare_market_share_pct: number;
  top_metros: string;
}

interface LyftSafetyGapRow {
  report_period: string;
  total_rides_billions: number;
  total_sexual_assaults: number;
  non_consensual_penetration: number;
  categories_reported: number;
  total_raliance_categories: number;
  assault_rate_per_million_rides: number;
}

interface LyftAccountSharingRow {
  category: string;
  detail: string;
  severity: string;
  source: string;
  year: number;
}

interface RideshareRegulatoryRow {
  state: string;
  background_check_type: string;
  fingerprint_required: boolean;
  independent_review: boolean;
  sol_adult_sexual_assault_years: number;
  sol_notes: string | null;
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

export interface LyftSexualAssaultPageData {
  sexualAssaultRates: SexualAssaultRateRow[];
  ridesharePenetrationTop15: RidesharePenetrationRow[];
  lyftSafetyGap: LyftSafetyGapRow[];
  lyftAccountSharing: LyftAccountSharingRow[];
  rideshareRegulatory: RideshareRegulatoryRow[];
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

function fmtK(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
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

const STATE_ABBR: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
  Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO",
  Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH",
  Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT",
  Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY",
  "District of Columbia": "DC",
};

function getColorForRate(rate: number, min: number, max: number): string {
  const t = max > min ? (rate - min) / (max - min) : 0.5;
  const r = Math.round(255 - t * 75);
  const g = Math.round(228 - t * 208);
  const b = Math.round(225 - t * 195);
  return `rgb(${r},${g},${b})`;
}

function getScreeningTierColor(row: RideshareRegulatoryRow): { bg: string; label: string } {
  if (row.fingerprint_required) return { bg: "#134e4a", label: "Fingerprint Required" };
  if (row.independent_review) return { bg: "#0d9488", label: "Independent Review" };
  return { bg: "#cbd5e1", label: "Name-Based Only" };
}

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
/*  Static Data                                                        */
/* ------------------------------------------------------------------ */

const LITIGATION_TIMELINE = [
  { date: "Oct 2019", event: "Alison Turkos sues Lyft after alleged kidnapping and rape at gunpoint by driver", future: false },
  { date: "Dec 2019", event: "19 women file joint lawsuit alleging Lyft failed to screen drivers or respond to assault complaints", future: false },
  { date: "Jan 2020", event: "California JCCP No. 5061 consolidates state Lyft sexual assault cases in SF Superior Court", future: false },
  { date: "Oct 2021", event: "Lyft publishes first Community Safety Report \u2014 3 years late \u2014 disclosing 4,158 sexual assaults (2017\u20132019)", future: false },
  { date: "Jul 2024", event: "Lyft publishes second safety report (2020\u20132022): 2,651 assaults, but penetrations increase 360 \u2192 365", future: false },
  { date: "Jan 2025", event: "Colorado State Rep. Jenny Willford publicly discloses assault by unauthorized Lyft driver using shared account", future: false },
  { date: "Feb 5, 2026", event: "JPML creates MDL 3171 \u2014 centralizes 17 federal lawsuits in N.D. Cal. (same day as Uber $8.5M verdict)", future: false },
  { date: "Mar 2026", event: "Plaintiff leadership committee formation; settlement master Fouad Kurdi nominated", future: false },
  { date: "Apr 2, 2026", event: "Judge Lin signs Pretrial Order No. 8 \u2014 appoints co-lead counsel and Plaintiffs\u2019 Steering Committee", future: false },
  { date: "TBD", event: "Master complaint and bellwether selection (future)", future: true },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function LyftSexualAssaultClient({ data }: { data: LyftSexualAssaultPageData }) {
  const [solSortKey, setSolSortKey] = useState<"state" | "sol">("sol");
  const [solSortAsc, setSolSortAsc] = useState(true);

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

  // Sexual assault rate stats for choropleth
  const rateMin = data.sexualAssaultRates.length > 0
    ? Math.min(...data.sexualAssaultRates.map((r) => r.rape_rate_per_100k))
    : 0;
  const rateMax = data.sexualAssaultRates.length > 0
    ? Math.max(...data.sexualAssaultRates.map((r) => r.rape_rate_per_100k))
    : 100;

  // Sorted SOL table
  const sortedSolData = useMemo(() => {
    const sorted = [...data.rideshareRegulatory];
    if (solSortKey === "state") {
      sorted.sort((a, b) => solSortAsc ? a.state.localeCompare(b.state) : b.state.localeCompare(a.state));
    } else {
      sorted.sort((a, b) => solSortAsc
        ? a.sol_adult_sexual_assault_years - b.sol_adult_sexual_assault_years
        : b.sol_adult_sexual_assault_years - a.sol_adult_sexual_assault_years
      );
    }
    return sorted;
  }, [data.rideshareRegulatory, solSortKey, solSortAsc]);

  function handleSolSort(key: "state" | "sol") {
    if (solSortKey === key) {
      setSolSortAsc(!solSortAsc);
    } else {
      setSolSortKey(key);
      setSolSortAsc(true);
    }
  }

  function getSolDisplay(years: number): string {
    if (years === -1) return "No Limit";
    return `${years} year${years !== 1 ? "s" : ""}`;
  }

  function getSolRowColor(years: number): string {
    if (years === -1) return "bg-emerald-50";
    if (years <= 2) return "bg-red-50";
    if (years <= 5) return "bg-amber-50";
    return "bg-white";
  }

  // Lyft safety gap totals
  const totalAssaults = data.lyftSafetyGap.reduce((s, r) => s + r.total_sexual_assaults, 0);

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
            Lyft Passenger Sexual Assault
          </h1>
          <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-600">
            NEW MDL &mdash; Feb 2026
          </span>
        </div>
        <p className="mt-1 text-lg text-slate-gray">
          MDL No. 3171 &middot; N.D. Cal. &middot; Judge Rita F. Lin
        </p>
        <p className="mt-1 text-sm text-slate-gray">
          Advertising intelligence brief for Lyft passenger sexual assault litigation &mdash;
          safety reporting data, account sharing vulnerabilities, regulatory analysis, and geographic targeting.
        </p>
        <p className="mt-0.5 text-xs text-slate-gray">
          Last Updated: April 17, 2026
        </p>
        <Link
          href="/advertising/lyft-sexual-assault"
          className="mt-3 inline-flex items-center gap-2 rounded-lg border-2 border-intelligence-teal px-5 py-2.5 text-sm font-semibold text-intelligence-teal transition hover:bg-intelligence-teal hover:text-white"
        >
          <TrendingUp className="w-4 h-4" />
          View Advertising Intelligence
          <ChevronRight className="w-4 h-4" />
        </Link>
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
          <p className="text-2xl font-bold text-midnight-navy">35+</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">as of April 2026</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Reported Assaults
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">6,809</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">2017&ndash;2022 (5 of 21 categories)</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Penetrations Increased
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">360 &rarr; 365</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">worst category got worse during pandemic</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Landmark className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Uber Bellwether Verdict
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">$8.5M</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Feb 2026 &mdash; sets precedent for Lyft</p>
        </div>
      </div>

      {/* -- 3. Case Summary ----------------------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-4">
          Case Summary
        </h2>
        <div className="space-y-4 text-sm leading-relaxed text-midnight-navy/80">
          <p>
            <span className="font-semibold text-midnight-navy">MDL 3171</span> &mdash;{" "}
            <em>In Re: Lyft, Inc., Passenger Sexual Assault Litigation</em>.
            U.S. District Court, Northern District of California before Judge Rita F. Lin.
            MDL created February 5, 2026. 35 federal cases as of April 2026 (growing rapidly &mdash; started with 17).
            State parallel: JCCP No. 5061, San Francisco Superior Court (consolidated January 2020).
          </p>
          <p>
            <span className="font-semibold text-midnight-navy">Core Allegations:</span>{" "}
            Plaintiffs allege Lyft failed to adequately screen drivers, allowed account sharing
            that enabled unvetted individuals to drive, failed to respond to complaints of sexual
            misconduct, refused to implement safety design changes, and misrepresented the safety
            of its platform. Claims include negligence, breach of contract, and strict product liability.
          </p>
          <p>
            <span className="font-semibold text-midnight-navy">Key Evidence:</span>{" "}
            Lyft&apos;s own Community Safety Reports disclosed 6,809 sexual assaults across two
            reporting periods (2017&ndash;2022), but reported only 5 of 21 RALIANCE categories &mdash;
            the true number is substantially higher. Non-consensual penetrations actually
            <em> increased</em> from 360 to 365 between report periods despite overall lower ride volume during the pandemic.
          </p>
          <p>
            <span className="font-semibold text-midnight-navy">Settlement Landscape:</span>{" "}
            No Lyft-specific settlements yet. The Uber $8.5M bellwether verdict (Feb 2026) sets the benchmark.
            Settlement master Fouad Kurdi has been nominated (previously worked on Lyft state court settlements).
            Individual case values expected $500K&ndash;$5M+ depending on severity.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Court &amp; Judge
            </p>
            <p className="text-sm text-midnight-navy">
              N.D. Cal. &mdash; Hon. Rita F. Lin
            </p>
          </div>
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Settlement Master
            </p>
            <p className="text-sm text-midnight-navy">
              Fouad Kurdi, Resolutions LLC (submitted Mar 2026)
            </p>
          </div>
        </div>
      </div>

      {/* -- 4. Account Sharing (LYFT-SPECIFIC) ----------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <UserX className="w-4.5 h-4.5 text-red-500" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Key Allegation: Account Sharing Vulnerability
          </h2>
        </div>
        <p className="mb-4 text-sm text-midnight-navy/70">
          Lyft&apos;s unique failure mode &mdash; unvetted individuals driving under another
          driver&apos;s account. This is a differentiator from the Uber litigation.
        </p>

        {data.lyftAccountSharing.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.lyftAccountSharing.map((item, i) => {
              const badge = getSeverityBadge(item.severity);
              return (
                <div
                  key={i}
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
              Account sharing data loading...
            </p>
          </div>
        )}
      </div>

      {/* -- 5. Litigation Timeline ---------------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Litigation Timeline
          </h2>
        </div>
        <div className="overflow-x-auto pb-2">
          <div className="relative flex items-start" style={{ minWidth: `${LITIGATION_TIMELINE.length * 195}px` }}>
            <div className="absolute left-[97px] right-[97px] top-[52px] h-px bg-intelligence-teal/30" />
            {LITIGATION_TIMELINE.map((e, i) => (
              <div
                key={i}
                className={`flex min-w-[195px] flex-1 flex-col items-center text-center ${e.future ? "opacity-60" : ""}`}
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
                  className={`mt-2 max-w-[180px] text-[10px] leading-tight ${
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

      {/* -- 6. Research & Qualification Criteria --------------------------- */}
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
              Passenger who was sexually assaulted or harassed during a Lyft ride. Assault must have
              been committed by a Lyft driver. Includes non-consensual touching, kissing, attempted
              or completed sexual penetration, kidnapping, and trafficking. Both current and past
              Lyft riders qualify.
            </p>
          </div>
          <div className="rounded-md border border-cloud bg-cloud/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
              Required Documentation
            </p>
            <p className="text-sm text-midnight-navy/80 leading-relaxed">
              Medical records, police reports, or documented psychological injury strengthen the
              claim. Lyft ride history showing the trip in question is important. Therapy and
              counseling records documenting ongoing trauma are also relevant.
            </p>
          </div>
          <div className="rounded-md border border-cloud bg-cloud/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
              Statute of Limitations
            </p>
            <p className="text-sm text-midnight-navy/80 leading-relaxed">
              Varies by state &mdash; see Signal 5 below for the full reference table.
              Several states have urgent 2-year windows. Discovery rules and tolling provisions
              may extend deadlines in some jurisdictions.
            </p>
          </div>
          <div className="rounded-md border border-cloud bg-cloud/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
              Estimated Case Values
            </p>
            <p className="text-sm text-midnight-navy/80 leading-relaxed">
              $500K&ndash;$5M+ per case depending on severity and jurisdiction. The Uber $8.5M
              bellwether verdict sets a benchmark. Cases involving non-consensual penetration,
              kidnapping, or trafficking will command the highest values.
            </p>
          </div>
        </div>
      </div>

      {/* -- 7. Market Opportunity Signals --------------------------------- */}
      <div className="rounded-lg border border-intelligence-teal/20 bg-gradient-to-br from-intelligence-teal/[0.04] to-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Crosshair className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Market Opportunity Signals
          </h2>
        </div>
        <p className="mb-6 text-sm text-slate-gray">
          Six intelligence layers for identifying high-opportunity Lyft markets
        </p>

        {/* -- Signal 1: Sexual Assault Rates by State (Choropleth) -------- */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 1: Sexual Assault Rates by State
            </h3>
          </div>
          <p className="mb-2 text-xs text-slate-gray">
            Source: FBI UCR / CDC NISVS 2024 estimates
          </p>

          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              States with the highest sexual assault rates represent the deepest plaintiff pools
              for Lyft cases. Cross-reference with rideshare penetration (Signal 2) to identify
              top opportunity markets.
            </p>
          </div>

          {data.sexualAssaultRates.length > 0 ? (
            <div className="rounded-lg bg-white p-4">
              <p className="mb-3 text-xs font-semibold text-midnight-navy">
                Sexual Assault Rate per 100K by State
              </p>
              <div className="grid grid-cols-5 gap-1 sm:grid-cols-8 md:grid-cols-10">
                {[...data.sexualAssaultRates]
                  .sort((a, b) => a.state.localeCompare(b.state))
                  .map((row) => (
                    <div
                      key={row.state}
                      className="group relative rounded-md p-2 text-center transition-transform hover:scale-105"
                      style={{ backgroundColor: getColorForRate(row.rape_rate_per_100k, rateMin, rateMax) }}
                    >
                      <p className="text-[10px] font-bold text-midnight-navy">
                        {STATE_ABBR[row.state] ?? row.state}
                      </p>
                      <p className="text-[9px] text-midnight-navy/70">
                        {row.rape_rate_per_100k}
                      </p>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                        <div className="rounded-md bg-midnight-navy px-3 py-2 text-xs text-white shadow-lg whitespace-nowrap">
                          <p className="font-semibold">{row.state}</p>
                          <p>Rate: {row.rape_rate_per_100k}/100K</p>
                          <p>Total: {row.total_rapes_2024.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-gray">
                <span>Low</span>
                <div className="flex h-3 flex-1 max-w-[200px] rounded overflow-hidden">
                  <div className="flex-1" style={{ backgroundColor: getColorForRate(rateMin, rateMin, rateMax) }} />
                  <div className="flex-1" style={{ backgroundColor: getColorForRate((rateMin + rateMax) * 0.25, rateMin, rateMax) }} />
                  <div className="flex-1" style={{ backgroundColor: getColorForRate((rateMin + rateMax) * 0.5, rateMin, rateMax) }} />
                  <div className="flex-1" style={{ backgroundColor: getColorForRate((rateMin + rateMax) * 0.75, rateMin, rateMax) }} />
                  <div className="flex-1" style={{ backgroundColor: getColorForRate(rateMax, rateMin, rateMax) }} />
                </div>
                <span>High</span>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
              <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
              <p className="text-sm font-medium text-midnight-navy/60">
                Sexual assault rate data loading...
              </p>
            </div>
          )}
        </div>

        {/* -- Signal 2: Rideshare Market Penetration (Horizontal Bar) ----- */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <CarFront className="w-4 h-4 text-intelligence-teal" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 2: Rideshare Market Penetration (Top 15 States)
            </h3>
          </div>
          <p className="mb-2 text-xs text-slate-gray">
            Source: Bureau of Transportation Statistics / industry estimates 2024
          </p>

          <div className="mb-4 rounded-md border border-intelligence-teal/30 bg-intelligence-teal/5 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              Lyft holds ~24% of the U.S. rideshare market. Higher-penetration states = more
              Lyft rides = more exposure. States with high market share are priority targets
              for plaintiff acquisition.
            </p>
          </div>

          {data.ridesharePenetrationTop15.length > 0 ? (
            <div className="rounded-lg bg-white p-4">
              <p className="mb-3 text-xs font-semibold text-midnight-navy">
                Top 15 States by Rideshare Market Share (%)
              </p>
              <ResponsiveContainer width="100%" height={data.ridesharePenetrationTop15.length * 32 + 20}>
                <BarChart
                  data={data.ridesharePenetrationTop15}
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
                    formatter={(value: number, _name: string, props: { payload: RidesharePenetrationRow }) => [
                      `${value}% (Top metros: ${props.payload.top_metros})`,
                      "Market Share",
                    ]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="rideshare_market_share_pct" radius={[0, 4, 4, 0]}>
                    {data.ridesharePenetrationTop15.map((_, i) => (
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
                Rideshare penetration data loading...
              </p>
            </div>
          )}
        </div>

        {/* -- Signal 3: Lyft Safety Reporting Gap (LYFT-SPECIFIC) --------- */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 3: Lyft Safety Reporting Gap
            </h3>
          </div>
          <p className="mb-2 text-xs text-slate-gray">
            Source: Lyft Community Safety Report (2021) and Safety Transparency Report (2024)
          </p>

          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              <span className="font-bold text-midnight-navy">Critical underreporting:</span>{" "}
              Lyft reports only 5 of 21 RALIANCE sexual misconduct categories &mdash;
              the true incident count is substantially higher than {totalAssaults > 0 ? totalAssaults.toLocaleString() : "6,809"}.
            </p>
          </div>

          {data.lyftSafetyGap.length > 0 ? (
            <div className="rounded-lg bg-white p-4">
              <p className="mb-3 text-xs font-semibold text-midnight-navy">
                Lyft Safety Report Comparison
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {data.lyftSafetyGap.map((row) => (
                  <div key={row.report_period} className="rounded-lg border border-cloud p-4">
                    <p className="text-sm font-bold text-midnight-navy mb-3">{row.report_period}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-gray">Total Rides</span>
                        <span className="font-semibold text-midnight-navy">{row.total_rides_billions}B</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-gray">Sexual Assaults Reported</span>
                        <span className="font-bold text-red-600">{row.total_sexual_assaults.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-gray">Non-Consensual Penetrations</span>
                        <span className="font-bold text-red-700">{row.non_consensual_penetration}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-gray">Categories Reported</span>
                        <span className="font-semibold text-midnight-navy">
                          {row.categories_reported} of {row.total_raliance_categories}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-gray">Assault Rate per M Rides</span>
                        <span className="font-semibold text-midnight-navy">{row.assault_rate_per_million_rides}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {data.lyftSafetyGap.length === 2 && (
                <div className="mt-4 flex flex-wrap gap-3 justify-center">
                  <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                    Penetrations increased: {data.lyftSafetyGap[0].non_consensual_penetration} &rarr; {data.lyftSafetyGap[1].non_consensual_penetration}
                  </span>
                  <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                    Only {data.lyftSafetyGap[0].categories_reported}/{data.lyftSafetyGap[0].total_raliance_categories} RALIANCE categories reported
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
              <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
              <p className="text-sm font-medium text-midnight-navy/60">
                Lyft safety gap data loading...
              </p>
            </div>
          )}
        </div>

        {/* -- Signal 4: Regulatory Stringency (Choropleth - Categorical) -- */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-intelligence-teal" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 4: Regulatory Stringency by State
            </h3>
          </div>
          <p className="mb-2 text-xs text-slate-gray">
            Background check requirements and screening tier by state
          </p>

          <div className="mb-4 rounded-md border border-intelligence-teal/30 bg-intelligence-teal/5 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              States with weaker regulatory oversight (name-based checks only) have the weakest
              safeguards against unscreened Lyft drivers &mdash; strengthening negligence arguments.
            </p>
          </div>

          {data.rideshareRegulatory.length > 0 ? (
            <div className="rounded-lg bg-white p-4">
              <p className="mb-3 text-xs font-semibold text-midnight-navy">
                Screening Tier by State
              </p>
              <div className="mb-4 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: "#134e4a" }}>
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[9px]">1</span>
                  Tier 1: Fingerprint Required
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: "#0d9488" }}>
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[9px]">2</span>
                  Tier 2: Independent Review
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600" style={{ backgroundColor: "#cbd5e1" }}>
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-500/20 text-[9px]">3</span>
                  Tier 3: Name-Based Only
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1 sm:grid-cols-8 md:grid-cols-10">
                {[...data.rideshareRegulatory]
                  .sort((a, b) => a.state.localeCompare(b.state))
                  .map((row) => {
                    const tier = getScreeningTierColor(row);
                    const isLight = !row.fingerprint_required && !row.independent_review;
                    return (
                      <div
                        key={row.state}
                        className="group relative rounded-md p-2 text-center transition-transform hover:scale-105"
                        style={{ backgroundColor: tier.bg }}
                      >
                        <p className={`text-[10px] font-bold ${isLight ? "text-slate-700" : "text-white"}`}>
                          {STATE_ABBR[row.state] ?? row.state}
                        </p>
                        <p className={`text-[8px] ${isLight ? "text-slate-500" : "text-white/70"}`}>
                          {row.fingerprint_required ? "Tier 1" : row.independent_review ? "Tier 2" : "Tier 3"}
                        </p>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                          <div className="rounded-md bg-midnight-navy px-3 py-2 text-xs text-white shadow-lg whitespace-nowrap">
                            <p className="font-semibold">{row.state}</p>
                            <p>Check: {row.background_check_type.replace(/_/g, " ")}</p>
                            <p>Fingerprint: {row.fingerprint_required ? "Yes" : "No"}</p>
                            <p>SOL: {getSolDisplay(row.sol_adult_sexual_assault_years)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
              <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
              <p className="text-sm font-medium text-midnight-navy/60">
                Regulatory data loading...
              </p>
            </div>
          )}
        </div>

        {/* -- Signal 5: Statute of Limitations Reference Table ------------ */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Scale className="w-4 h-4 text-intelligence-teal" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 5: Statute of Limitations Reference
            </h3>
          </div>
          <p className="mb-3 text-xs text-slate-gray">
            SOL for adult sexual assault by state &mdash; click headers to sort
          </p>

          {data.rideshareRegulatory.length > 0 ? (
            <div className="rounded-lg bg-white p-4">
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-cloud">
                      <th
                        className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray cursor-pointer hover:text-midnight-navy select-none"
                        onClick={() => handleSolSort("state")}
                      >
                        <span className="flex items-center gap-1">
                          State
                          {solSortKey === "state" ? (
                            solSortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                          ) : null}
                        </span>
                      </th>
                      <th
                        className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray cursor-pointer hover:text-midnight-navy select-none"
                        onClick={() => handleSolSort("sol")}
                      >
                        <span className="flex items-center gap-1">
                          SOL (Years)
                          {solSortKey === "sol" ? (
                            solSortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                          ) : null}
                        </span>
                      </th>
                      <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                        Notes
                      </th>
                      <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                        Background Check
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSolData.map((row) => (
                      <tr
                        key={row.state}
                        className={`border-b border-cloud/50 transition-colors ${getSolRowColor(row.sol_adult_sexual_assault_years)}`}
                      >
                        <td className="py-3 pr-4 font-medium text-midnight-navy whitespace-nowrap">
                          {row.state}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                              row.sol_adult_sexual_assault_years === -1
                                ? "bg-emerald-100 text-emerald-700"
                                : row.sol_adult_sexual_assault_years <= 2
                                ? "bg-red-100 text-red-700"
                                : row.sol_adult_sexual_assault_years <= 5
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {getSolDisplay(row.sol_adult_sexual_assault_years)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-xs text-midnight-navy/70 max-w-[300px]">
                          {row.sol_notes ?? "\u2014"}
                        </td>
                        <td className="py-3 pl-3 text-xs text-midnight-navy/70 whitespace-nowrap">
                          {row.background_check_type.replace(/_/g, " ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-slate-gray">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-100 border border-red-300" /> 1-2 years (urgent)
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-100 border border-amber-300" /> 3-5 years
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-100 border border-emerald-300" /> No limit (open window)
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
              <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
              <p className="text-sm font-medium text-midnight-navy/60">
                Statute of limitations data loading...
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

      {/* -- Cross-Signal Analysis Callout ------------------------------- */}
      <div className="rounded-lg border-l-4 border-intelligence-teal bg-intelligence-teal/[0.04] p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Cross-Signal Analysis
          </h2>
        </div>
        <p className="mb-4 text-sm text-midnight-navy/80">
          The highest-opportunity states combine high rideshare penetration with high sexual
          assault rates AND weak regulatory screening &mdash; creating both plaintiff volume
          and strong negligence arguments:
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-intelligence-teal/20 bg-white px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-bold text-midnight-navy">Texas</p>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">5-yr SOL</span>
            </div>
            <p className="text-xs text-midnight-navy/70">8.2% rideshare share &middot; 51.3/100K assault rate &middot; Name-based checks only</p>
          </div>
          <div className="rounded-md border border-intelligence-teal/20 bg-white px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-bold text-midnight-navy">Florida</p>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">4-yr SOL</span>
            </div>
            <p className="text-xs text-midnight-navy/70">7.5% rideshare share &middot; 28.9/100K assault rate &middot; Name-based checks</p>
          </div>
          <div className="rounded-md border border-intelligence-teal/20 bg-white px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-bold text-midnight-navy">Arizona</p>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">2-yr SOL (urgent)</span>
            </div>
            <p className="text-xs text-midnight-navy/70">2.8% rideshare share &middot; 40.8/100K assault rate &middot; Name-based checks</p>
          </div>
          <div className="rounded-md border border-intelligence-teal/20 bg-white px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-bold text-midnight-navy">Illinois</p>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">2-yr SOL (urgent)</span>
            </div>
            <p className="text-xs text-midnight-navy/70">5.1% rideshare share &middot; 47.5/100K assault rate &middot; Name-based checks</p>
          </div>
        </div>
      </div>

      {/* -- Geographic & Demographic Targeting ----------------------------- */}
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
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-cloud/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
                Primary Demographic
              </p>
              <p className="text-sm text-midnight-navy">
                Women aged 18&ndash;35 who used Lyft, particularly late-night riders, bar/restaurant pickups, and college-town riders
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
                Age Range
              </p>
              <p className="text-sm text-midnight-navy">
                18&ndash;45 (peak rideshare usage demographic; overwhelming majority of victims are women)
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
                Regional Focus
              </p>
              <p className="text-sm text-midnight-navy">
                States with highest rideshare penetration + weak screening: CA, TX, FL, NY, IL, AZ, GA
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
            "San Francisco, CA (MDL venue + Lyft HQ)",
            "Los Angeles, CA",
            "New York City, NY",
            "Chicago, IL",
            "Miami, FL",
            "Houston, TX",
            "Phoenix/Tempe, AZ",
            "Atlanta, GA",
            "Denver, CO",
            "Austin, TX",
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
              title: "Early-Mover Advantage",
              detail: "Only 35 cases in the MDL vs. Uber\u2019s 3,000+. Advertising competition is minimal. Firms that establish presence now will capture the first wave of awareness as the litigation matures and media coverage increases",
            },
            {
              title: "Uber Verdict Spillover",
              detail: "The $8.5M Uber bellwether verdict is generating massive awareness for rideshare sexual assault claims broadly. Lyft-specific campaigns can ride this wave \u2014 many potential Lyft claimants will be activated by Uber news coverage",
            },
            {
              title: "Account Sharing Messaging",
              detail: "Lyft\u2019s unique account-sharing vulnerability is a powerful creative angle: \u2018Your Lyft driver may not have been who you thought.\u2019 This resonates emotionally and legally \u2014 it\u2019s a failure mode that doesn\u2019t exist in the same way for Uber",
            },
            {
              title: "Cross-Reference Uber Intelligence",
              detail: "Firms already advertising for Uber sexual assault should run parallel Lyft campaigns. Same demographics, same metros, same platforms \u2014 but distinct messaging. Reference the Uber Sexual Assault page for complementary signal data",
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

      {/* -- Judicial Profiles ------------------------------------------ */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Scale className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Judicial Profiles
          </h2>
        </div>
        <p className="mb-3 text-xs text-slate-gray">
          Plaintiff vs. defense-leaning counties across states
        </p>

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

      {/* -- Advertising Landscape (LIVE DATA) -------------------------- */}
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
          Competitive landscape &mdash; firms with the highest advertising presence for Lyft sexual assault litigation.
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
            "Lyft Community Safety Report (2021)",
            "Lyft Safety Transparency Report (2024)",
            "RALIANCE sexual misconduct taxonomy",
            "FBI Uniform Crime Reporting (UCR) / CDC NISVS 2024",
            "Bureau of Transportation Statistics / Industry Estimates 2024",
            "CNN (2021), NPR (2021), Axios (2024)",
            "King Law (2026), AboutLawsuits.com (2026)",
            "JPML Transfer Order — MDL 3171",
            "Court filings, Pretrial Order No. 8",
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
          Data sources: Lyft Community Safety Report (2021), Lyft Safety Transparency Report (2024),
          RALIANCE taxonomy, FBI UCR / CDC NISVS (2024), Bureau of Transportation Statistics (2024),
          State Regulatory Databases, JPML MDL Statistics, State SOL Databases.
        </p>
      </div>
    </div>
  );
}
