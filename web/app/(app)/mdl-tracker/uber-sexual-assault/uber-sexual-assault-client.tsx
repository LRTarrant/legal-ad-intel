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
  Activity,
  Crosshair,
  Car,
  Landmark,
  ShieldAlert,
  BarChart3,
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

interface UberSafetyGapRow {
  report_period: string;
  public_disclosed_incidents: number;
  internal_reports_estimated: number;
}

interface RideshareRegulatoryRow {
  state: string;
  background_check_type: string;
  fingerprint_required: boolean;
  independent_review: boolean;
  sol_adult_sexual_assault_years: number;
  sol_notes: string | null;
}

interface MdlFilingConcentrationRow {
  state: string;
  estimated_plaintiff_count: number;
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

export interface UberSexualAssaultPageData {
  sexualAssaultRates: SexualAssaultRateRow[];
  ridesharePenetrationTop15: RidesharePenetrationRow[];
  uberSafetyGap: UberSafetyGapRow[];
  rideshareRegulatory: RideshareRegulatoryRow[];
  mdlFilingConcentration: MdlFilingConcentrationRow[];
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

/* -- US State abbreviation map for choropleth ----------------------- */
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
  // Light pink to dark crimson
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

/* ------------------------------------------------------------------ */
/*  Static Data                                                        */
/* ------------------------------------------------------------------ */

const KEY_ALLEGATIONS = [
  {
    title: "Inadequate Background Checks",
    detail: "Uber uses name-based checks (not fingerprints); ~20% of drivers would fail fingerprint-based screening",
  },
  {
    title: "Concealed Safety Data",
    detail: "400,181 internal reports of sexual assault/misconduct (2017-2022) vs. only 12,522 \"serious\" incidents publicly disclosed \u2014 one report every 8 minutes",
  },
  {
    title: "Pattern Knowledge",
    detail: "Women = 81% of rape victims, 91% rider victims; 4x higher assault risk when women paired with male drivers \u2014 never disclosed",
  },
  {
    title: "Safety Feature Resistance",
    detail: "Refused in-car cameras; built but underutilized \"Safety Risk Assessed Dispatch\" ML tool",
  },
  {
    title: "Common Carrier Argument",
    detail: "Plaintiffs argue Uber controls pricing, driver selection, safety representations \u2014 should face elevated duty of care",
  },
];

const LITIGATION_TIMELINE = [
  { date: "Jun 2017", event: "CNN investigation reveals Uber riders reporting sexual assaults", future: false },
  { date: "Dec 2019", event: "Uber publishes first Safety Report (2017-2018 data)", future: false },
  { date: "Jun 2022", event: "Uber publishes second Safety Report (2019-2020 data)", future: false },
  { date: "Oct 2023", event: "JPML creates MDL 3084, N.D. Cal.", future: false },
  { date: "Jan 2024", event: "Judge Breyer assigned; initial case management", future: false },
  { date: "Jun 2025", event: "Settlement Master Hon. Gail Andler appointed", future: false },
  { date: "Feb 2026", event: "$8.5M bellwether verdict (Jaylynn Dean)", future: false },
  { date: "Apr 2026", event: "~3,391 plaintiffs in 30 states; common carrier litigated", future: false },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function UberSexualAssaultClient({ data }: { data: UberSexualAssaultPageData }) {
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
            Uber Sexual Assault
          </h1>
          <span className="rounded-full bg-intelligence-teal/10 border border-intelligence-teal/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-intelligence-teal">
            Active MDL &mdash; 3,391 Plaintiffs
          </span>
        </div>
        <p className="mt-1 text-lg text-slate-gray">
          Passenger Sexual Assault Litigation &mdash; MDL No. 3084
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
              MDL Plaintiffs
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">~3,391</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">MDL 3084, N.D. Cal.</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <DollarSign className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              First Verdict
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">$8.5M</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Jaylynn Dean (Feb 2026)</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Internal Reports
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">400,181</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">2017-2022 (1 every 8 min)</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Landmark className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Est. Settlement Range
            </p>
          </div>
          <p className="text-2xl font-bold text-midnight-navy">$50K&ndash;$1M</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">Per case</p>
        </div>
      </div>

      {/* -- 3. Case Summary ----------------------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-4">
          Case Summary
        </h2>
        <div className="space-y-4 text-sm leading-relaxed text-midnight-navy/80">
          <p>
            <span className="font-semibold text-midnight-navy">MDL 3084</span> &mdash;{" "}
            <em>In Re: Uber Technologies, Inc., Passenger Sexual Assault Litigation</em>.
            U.S. District Court, Northern District of California before Judge Charles Breyer.
            MDL created October 4, 2023 with approximately 3,391 plaintiffs in 30 states as of April 2026,
            plus 500+ additional cases in California state court.
          </p>
          <p>
            <span className="font-semibold text-midnight-navy">Legal Theory:</span>{" "}
            Plaintiffs allege Uber&apos;s inadequate background check system (name-based, not fingerprint-based),
            concealment of internal safety data showing vastly more incidents than publicly reported,
            and failure to implement available safety features enabled a pattern of driver-on-passenger sexual assaults.
            The &ldquo;common carrier&rdquo; classification is being actively litigated to establish an elevated duty of care.
          </p>
          <p>
            <span className="font-semibold text-midnight-navy">Key Evidence:</span>{" "}
            Uber&apos;s own data reveals 400,181 internal reports of sexual assault and misconduct (2017-2022),
            compared to only 12,522 &ldquo;serious&rdquo; incidents publicly disclosed across two safety reports &mdash;
            one report filed every 8 minutes. Women constitute 81% of rape victims and 91% of rider victims.
            The jury in the first bellwether trial found &ldquo;apparent agency,&rdquo; establishing Uber&apos;s liability.
          </p>
          <p>
            <span className="font-semibold text-midnight-navy">Settlement Landscape:</span>{" "}
            First bellwether verdict of $8.5M awarded to Jaylynn Dean on February 5, 2026.
            Settlement Master Hon. Gail Andler was appointed in June 2025.
            Estimated settlement range is $50,000 &ndash; $1,000,000 per case depending on severity and jurisdiction.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Court &amp; Judge
            </p>
            <p className="text-sm text-midnight-navy">
              N.D. Cal. &mdash; Hon. Charles Breyer
            </p>
          </div>
          <div className="rounded-md bg-cloud/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Settlement Master
            </p>
            <p className="text-sm text-midnight-navy">
              Hon. Gail Andler (appointed June 2025)
            </p>
          </div>
        </div>
      </div>

      {/* -- 4. Key Allegations -------------------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Key Allegations
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {KEY_ALLEGATIONS.map((a) => (
            <div
              key={a.title}
              className="rounded-lg border border-red-200 bg-red-50/50 p-4"
            >
              <p className="text-sm font-semibold text-midnight-navy mb-1">{a.title}</p>
              <p className="text-xs leading-relaxed text-midnight-navy/70">{a.detail}</p>
            </div>
          ))}
        </div>
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

      {/* -- 6. Market Opportunity Signals --------------------------------- */}
      <div className="rounded-lg border border-intelligence-teal/20 bg-gradient-to-br from-intelligence-teal/[0.04] to-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Crosshair className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Market Opportunity Signals
          </h2>
        </div>
        <p className="mb-6 text-sm text-slate-gray">
          Six intelligence layers for identifying high-opportunity markets
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
              States with the highest sexual assault rates represent concentrated risk zones
              where rideshare sexual assault claims are most likely to originate.
              Cross-reference with rideshare penetration (Signal 2) to identify top opportunity markets.
            </p>
          </div>

          {data.sexualAssaultRates.length > 0 ? (
            <div className="rounded-lg bg-white p-4">
              <p className="mb-3 text-xs font-semibold text-midnight-navy">
                Sexual Assault Rate per 100K by State
              </p>
              {/* State grid choropleth */}
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
              {/* Legend */}
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
            <Car className="w-4 h-4 text-intelligence-teal" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 2: Rideshare Market Penetration (Top 15 States)
            </h3>
          </div>
          <p className="mb-2 text-xs text-slate-gray">
            Source: Bureau of Transportation Statistics / industry estimates 2024
          </p>

          <div className="mb-4 rounded-md border border-intelligence-teal/30 bg-intelligence-teal/5 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              Higher rideshare penetration correlates with more driver-passenger interactions
              and greater exposure to the risk of sexual assault incidents.
              States with high market share are priority targets for plaintiff acquisition.
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

        {/* -- Signal 3: Uber Safety Reporting Gap (Grouped Bar) ----------- */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 3: Uber Safety Reporting Gap
            </h3>
          </div>
          <p className="mb-2 text-xs text-slate-gray">
            Source: Uber Safety Reports (2019, 2022) vs. internal data revealed in litigation
          </p>

          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              <span className="font-bold text-midnight-navy">The most impactful visual:</span>{" "}
              The gap between publicly disclosed incidents and internal reports tells the negligence story.
              Uber reported only 5 categories publicly while tracking 21 internally.
            </p>
          </div>

          {data.uberSafetyGap.length > 0 ? (
            <div className="rounded-lg bg-white p-4">
              <p className="mb-3 text-xs font-semibold text-midnight-navy">
                Publicly Disclosed vs. Internal Reports by Period
              </p>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart
                  data={data.uberSafetyGap}
                  margin={{ top: 30, right: 30, bottom: 0, left: 10 }}
                >
                  <XAxis dataKey="report_period" tick={{ fontSize: 11, fill: "#1B2A4A" }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => fmtK(v)}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      value.toLocaleString(),
                      name === "public_disclosed_incidents" ? "Publicly Disclosed" : "Internal Reports (est.)",
                    ]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Legend
                    formatter={(value: string) =>
                      value === "public_disclosed_incidents" ? "Publicly Disclosed" : "Internal Reports (est.)"
                    }
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  <Bar dataKey="public_disclosed_incidents" fill="#DC2626" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="public_disclosed_incidents" position="top" formatter={(v) => fmtK(Number(v))} style={{ fontSize: 10, fill: "#DC2626", fontWeight: 600 }} />
                  </Bar>
                  <Bar dataKey="internal_reports_estimated" fill="#1B2A4A" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="internal_reports_estimated" position="top" formatter={(v) => fmtK(Number(v))} style={{ fontSize: 10, fill: "#1B2A4A", fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Gap multiplier annotations */}
              <div className="mt-2 flex justify-around">
                {data.uberSafetyGap.map((row) => {
                  const gap = row.public_disclosed_incidents > 0
                    ? Math.round(row.internal_reports_estimated / row.public_disclosed_incidents)
                    : 0;
                  return (
                    <div key={row.report_period} className="text-center">
                      <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
                        ~{gap}x gap
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-center text-[10px] text-slate-gray">
                Gap widened over time: the ratio of concealed-to-disclosed reports grew from ~23x to ~52x even as public numbers decreased
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
              <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
              <p className="text-sm font-medium text-midnight-navy/60">
                Uber safety gap data loading...
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
              States with weaker regulatory oversight (name-based checks only) may see more claims
              due to the argument that Uber&apos;s own screening was the only safeguard &mdash;
              and it was inadequate.
            </p>
          </div>

          {data.rideshareRegulatory.length > 0 ? (
            <div className="rounded-lg bg-white p-4">
              <p className="mb-3 text-xs font-semibold text-midnight-navy">
                Screening Tier by State
              </p>
              {/* Legend */}
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
              {/* State grid */}
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

        {/* -- Signal 6: MDL Filing Concentration by State --------------- */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-rose-700" />
            <h3 className="text-sm font-semibold text-midnight-navy">
              Signal 6: MDL Filing Concentration by State
            </h3>
          </div>
          <p className="mb-2 text-xs text-slate-gray">
            Top states by estimated plaintiff count in MDL 3084
          </p>

          <div className="mb-4 rounded-md border border-rose-200 bg-rose-50/50 px-4 py-3">
            <p className="text-sm text-midnight-navy/80">
              Filing concentration reveals where plaintiff attorneys are most active
              and where case acquisition has gained the most traction.
              California leads with additional 500+ state court cases outside the MDL.
            </p>
          </div>

          {data.mdlFilingConcentration.length > 0 ? (
            <div className="rounded-lg bg-white p-4">
              <p className="mb-3 text-xs font-semibold text-midnight-navy">
                Estimated Plaintiff Count by State
              </p>
              <ResponsiveContainer width="100%" height={data.mdlFilingConcentration.length * 32 + 20}>
                <BarChart
                  data={data.mdlFilingConcentration}
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
                    formatter={(value) => [
                      `${Number(value).toLocaleString()} estimated plaintiffs`,
                      "Plaintiff Count",
                    ]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="estimated_plaintiff_count" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="estimated_plaintiff_count" position="right" formatter={(v) => Number(v).toLocaleString()} style={{ fontSize: 10, fill: "#64748b" }} />
                    {data.mdlFilingConcentration.map((row, i) => (
                      <Cell key={i} fill={row.state === "California" ? "#9f1239" : i < 5 ? "#be123c" : "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {data.mdlFilingConcentration.some((r) => r.state === "California") && (
                <p className="mt-2 text-[10px] text-rose-700 font-medium">
                  * California: +500 additional state court cases outside MDL 3084
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
              <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
              <p className="text-sm font-medium text-midnight-navy/60">
                MDL filing concentration data loading...
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
          States combining high rideshare penetration + elevated assault rates + weak screening
          regulations represent the strongest markets for plaintiff acquisition:
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
        <div className="mt-4 rounded-md bg-intelligence-teal/10 px-4 py-3">
          <p className="text-xs font-semibold text-intelligence-teal uppercase tracking-wider mb-1">Regulatory Watch</p>
          <p className="text-sm text-midnight-navy/80">
            California&apos;s 2026 ballot initiative could redefine rideshare companies as common carriers &mdash;
            a ruling here would set precedent nationwide.
          </p>
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
                Women aged 18-35 who use rideshare services, particularly late-night and bar/restaurant pickup riders
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
                Age Range
              </p>
              <p className="text-sm text-midnight-navy">
                18-45 (peak rideshare usage demographic; 81% of victims are women)
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
            "San Francisco, CA",
            "Los Angeles, CA",
            "New York City, NY",
            "Chicago, IL",
            "Miami, FL",
            "Houston, TX",
            "Phoenix/Tempe, AZ",
            "Atlanta, GA",
            "Boston, MA",
            "Seattle, WA",
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
            { title: "Late-Night & Nightlife Targeting", detail: "Uber\u2019s internal data shows assaults peak late at night with pickups near bars. Target women 18-35 in nightlife districts and college towns \u2014 use time-of-day and location-based audiences on Meta and Google" },
            { title: "Weak-Regulation State Focus", detail: "Prioritize states with name-based-only background checks (TX, FL, AZ, IL) where Uber\u2019s own screening was the only safeguard. The regulatory gap strengthens the negligence argument" },
            { title: "Cross-Reference Signal Data", detail: "Layer rideshare penetration with sexual assault rates to identify highest-opportunity DMAs. States like Texas (8.2% market share, 51.3/100K assault rate) and Illinois (5.1%, 47.5/100K) top the combined index" },
            { title: "Creative Messaging Angles", detail: "Lead with the \u20181 report every 8 minutes\u2019 stat and the 400,181 concealed reports. Reference the $8.5M bellwether verdict to establish credibility. Emphasize the statute of limitations window \u2014 several states have 2-year or shorter deadlines" },
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

      {/* -- 7. Judicial Profiles ------------------------------------------ */}
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

      {/* -- 8. Advertising Landscape (LIVE DATA) -------------------------- */}
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

      {/* -- 8b. Cost Benchmark Scorecard ---------------------------------- */}
      <CostBenchmarkScorecard data={data.benchmark} />

      {/* -- 9. Top Advertisers (LIVE DATA) -------------------------------- */}
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
          Competitive landscape &mdash; firms with the highest advertising presence for Uber sexual assault litigation.
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

      {/* -- 10. Sample Ads (LIVE DATA) ------------------------------------ */}
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

      {/* -- 11. Top Markets by Saturation (LIVE DATA) --------------------- */}
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

      {/* -- 12. SERP Visibility (LIVE DATA) ------------------------------- */}
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

      {/* -- 13. Sources & Methodology ------------------------------------- */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Sources &amp; Methodology
          </h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            "FBI Uniform Crime Reporting (UCR) / CDC NISVS 2024",
            "Bureau of Transportation Statistics / Industry Estimates 2024",
            "Uber Safety Reports (2019, 2022) — public disclosures",
            "Litigation discovery documents — internal report counts",
            "State regulatory agency databases — background check requirements",
            "JPML MDL Statistics — MDL 3084",
            "Bellwether trial records — Jaylynn Dean v. Uber (Feb 2026)",
            "State statute of limitations databases",
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

      {/* -- 14. Footer / Disclaimer --------------------------------------- */}
      <div className="rounded-lg border border-cloud bg-cloud/40 p-5">
        <p className="text-xs leading-relaxed text-slate-gray">
          This page is refreshed monthly. Content reflects research and publicly
          available data as of the date shown. Settlement projections are attorney
          estimates and industry benchmarks &mdash; not guarantees. This page does not
          constitute legal advice.
        </p>
        <p className="mt-3 text-[11px] text-slate-gray/80">
          Data sources: FBI UCR / CDC NISVS (2024), Bureau of Transportation Statistics (2024),
          Uber Safety Reports (2019, 2022), State Regulatory Databases, JPML MDL Statistics,
          State SOL Databases.
        </p>
      </div>
    </div>
  );
}
