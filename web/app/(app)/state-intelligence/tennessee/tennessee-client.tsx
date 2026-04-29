"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  Scale,
  Car,
  Truck,
  Bike,
  HardHat,
  Anchor,
  TrendingUp,
  FileText,
  MapPin,
  ChevronUp,
  ChevronDown,
  Lightbulb,
  CloudLightning,
  Search,
  BarChart3,
  Database,
  Target,
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
import type { JudicialProfileRow } from "@/lib/queries/judicial";
import { AskAIPanel } from "../../components/ask-ai-panel";
import { trackStateViewed } from "@/lib/analytics";
import {
  PIAdvertisingSection,
  buildPIAdSummary,
  type PIAdvertisingData,
} from "../../components/pi-advertising-section";
import { CompetitiveLandscapeTable } from "../../components/competitive-landscape-table";
import { StateAdvertisingSection } from "../../components/state-advertising-section";
import { tennesseeCompetitiveData } from "@/lib/data/competitive-landscape/tennessee";
import {
  TN_COUNTY_INJURY_DATA,
  TN_INJURY_DATA_YEARS,
  TN_INJURY_DATA_LATEST_YEAR,
} from "@/lib/data/tn-injury-stats";
import { StateCrashEmbed } from "@/components/state-intelligence/StateCrashEmbed";
import { StateInjuryTable } from "@/components/state-intelligence/StateInjuryTable";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AccidentSummaryRow {
  county: string;
  total_population: number | null;
  fatal_crashes: number;
  total_deaths: number;
  truck_deaths: number;
  moto_deaths: number;
  drunk_driver_crashes: number;
  deaths_per_100k: number | null;
  rural_pct: number | null;
  judicial_profile: string | null;
}

interface RuralUrbanRow {
  category: string;
  fatal_crashes: number;
  total_deaths: number;
  avg_median_income: number | null;
  avg_poverty_pct: number | null;
  avg_internet_pct: number | null;
  avg_uninsured_pct: number | null;
}

interface StormSummaryRow {
  event_type: string;
  event_count: number;
  total_deaths: number;
  total_injuries: number;
  total_property_damage: string | null;
}

interface BoatingSummaryRow {
  county: string;
  accident_count: number;
  total_deaths: number;
  total_injuries: number;
  top_causes: string | null;
}

interface PIViabilityRow {
  state: string;
  negligence_rule: string;
  statute_of_limitations: string;
  composite_score: number;
  avg_jury_verdict: number | string | null;
  non_economic_cap: string | null;
  punitive_cap: string | null;
  negligence_score: number | null;
  non_economic_score: number | null;
  punitive_score: number | null;
  med_mal_score: number | null;
  sol_score: number | null;
  verdict_score: number | null;
}

interface CensusDemographicsRow {
  fips_full: string;
  state_abbr: string;
  county_name: string;
  total_population: number;
  median_age: number | null;
  pct_white: number | null;
  pct_black: number | null;
  pct_hispanic: number | null;
  median_household_income: number | null;
  per_capita_income: number | null;
  pct_poverty: number | null;
  pct_uninsured: number | null;
  pct_employed: number | null;
  pct_with_internet: number | null;
  pct_disability: number | null;
  pct_veterans: number | null;
}

interface MSADemographicsRow {
  cbsa_code: string;
  cbsa_title: string;
  total_population: number;
  median_household_income: number | null;
  pct_poverty: number | null;
  pct_uninsured: number | null;
  pct_employed: number | null;
}

export interface TennesseePageData {
  accidentSummary: AccidentSummaryRow[];
  ruralUrban: RuralUrbanRow[];
  stormSummary: StormSummaryRow[];
  boatingSummary: BoatingSummaryRow[];
  piViability: PIViabilityRow | null;
  censusDemographics: CensusDemographicsRow[];
  msaDemographics: MSADemographicsRow[];
  judicialProfiles: JudicialProfileRow[];
  stormCount: number;
}

/* ------------------------------------------------------------------ */
/*  Hardcoded Constants (TDOSHS, BLS, ACS)                             */
/* ------------------------------------------------------------------ */

const TDOSHS = {
  totalCrashes: 212_780,
  totalFatalities: 1_299,
  motorcycleFatalities: 186,
  speedRelatedFatalities: 344,
  speedRelatedPct: 26.5,
  alcoholRelatedFatalities: 345,
  alcoholRelatedPct: 26.6,
  unrestrainedFatalities: 397,
  distractedDrivingFatalCrashes: 54,
  urbanFatalities: 706,
  ruralFatalities: 593,
};

const BLS = {
  totalEmployment: 3_064_770,
  qcewCoveredEmployment: 3_082_000,
  totalWorkplaceFatalities: 128,
  constructionFatalities: 24,
  constructionPctTotal: 19,
  transportWarehouseFatalities: 35,
  truckTransportFatalities: 28,
  fallsSlipsTrips: 17,
  transportationIncidents: 55,
};

const COMMUTE = {
  driveAlone: 79.8,
  nationalAvg: 68.7,
  avgCommuteMinutes: 26,
};

/* ------------------------------------------------------------------ */
/*  Tableau Dashboard Config (passed to StateCrashEmbed)               */
/* ------------------------------------------------------------------ */

const TN_CRASH_EMBEDS = [
  {
    name: "Fatal & Serious Injury Crashes",
    iframeSrc: "https://data.tn.gov/t/Public/views/FatalandSeriousInjuryPublic/FSIC_dashboard?iframeSizedToWindow=true&:embed=y&:showAppBanner=false&:display_count=no&:showVizHome=no&:toolbar=no",
    height: 2000,
    description:
      "Statewide fatal and serious injury crashes by county, route, and time period. Updated continuously by the Tennessee Department of Safety & Homeland Security.",
  },
  {
    name: "Recent Crashes",
    iframeSrc: "https://data.tn.gov/t/Public/views/RecentCrashes/RecentCrashes?:showAppBanner=false&:display_count=n&:showVizHome=n&:origin=viz_share_link&:toolbar=no&:embed=yes",
    height: 4500,
    description: "Most recent reported crashes statewide.",
  },
  {
    name: "Traffic Fatality Trends",
    iframeSrc: "https://data.tn.gov/t/Public/views/TN_Traffic_Fatality/TTF_dashboard?iframeSizedToWindow=true&:embed=y&:showAppBanner=false&:display_count=no&:showVizHome=no&:toolbar=no",
    height: 3100,
    description: "Historic and trending traffic fatality data.",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatNegligenceRule(rule: string): string {
  const map: Record<string, string> = {
    'pure_comparative': 'Pure Comparative',
    'modified_51': 'Modified Comparative (51% Bar)',
    'modified_50': 'Modified Comparative (50% Bar)',
    'contributory': 'Contributory Negligence',
  };
  return map[rule] || rule;
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "\u2014";
  return n.toLocaleString();
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return "\u2014";
  return `${n.toFixed(1)}%`;
}

function fmtCur(n: number | null | undefined): string {
  if (n == null) return "\u2014";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function getProfileColor(profile: string | null): string {
  if (!profile) return "bg-slate-100 text-slate-600";
  const p = profile.toLowerCase();
  if (p.includes("liberal") || p.includes("plaintiff"))
    return "bg-emerald-100 text-emerald-700";
  if (p.includes("conservative") || p.includes("defense"))
    return "bg-red-100 text-red-700";
  if (p.includes("moderate"))
    return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function getProfileBorderColor(profile: string | null): string {
  if (!profile) return "border-l-slate-300";
  const p = profile.toLowerCase();
  if (p.includes("liberal") || p.includes("plaintiff"))
    return "border-l-emerald-500";
  if (p.includes("conservative") || p.includes("defense"))
    return "border-l-red-500";
  if (p.includes("moderate"))
    return "border-l-amber-500";
  return "border-l-slate-300";
}

type SortKey =
  | "county"
  | "population"
  | "fatal_crashes"
  | "total_deaths"
  | "truck_deaths"
  | "moto_deaths"
  | "deaths_per_100k"
  | "rural_pct"
  | "judicial_profile";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TennesseeClient({ data }: { data: TennesseePageData }) {
  const [sortKey, setSortKey] = useState<SortKey>("deaths_per_100k");
  const [sortAsc, setSortAsc] = useState(false);
  const [countyFilter, setCountyFilter] = useState("");
  const [msaSortKey, setMsaSortKey] = useState<"pop" | "income" | "poverty">("pop");
  const [msaSortAsc, setMsaSortAsc] = useState(false);
  const [piAdData, setPiAdData] = useState<PIAdvertisingData | null>(null);
  const handlePIAdDataLoaded = useCallback((d: PIAdvertisingData) => setPiAdData(d), []);

  useEffect(() => {
    trackStateViewed({ state_code: "TN", state_name: "Tennessee" });
  }, []);

  /* -- Sorted / filtered accident table data -- */
  const filteredAccidentData = useMemo(() => {
    let rows = [...data.accidentSummary];
    if (countyFilter.trim()) {
      const f = countyFilter.toLowerCase();
      rows = rows.filter((r) => r.county.toLowerCase().includes(f));
    }
    rows.sort((a, b) => {
      let aVal: number | string | null = null;
      let bVal: number | string | null = null;
      switch (sortKey) {
        case "county":
          aVal = a.county;
          bVal = b.county;
          break;
        case "population":
          aVal = a.total_population;
          bVal = b.total_population;
          break;
        case "fatal_crashes":
          aVal = a.fatal_crashes;
          bVal = b.fatal_crashes;
          break;
        case "total_deaths":
          aVal = a.total_deaths;
          bVal = b.total_deaths;
          break;
        case "truck_deaths":
          aVal = a.truck_deaths;
          bVal = b.truck_deaths;
          break;
        case "moto_deaths":
          aVal = a.moto_deaths;
          bVal = b.moto_deaths;
          break;
        case "deaths_per_100k":
          aVal = a.deaths_per_100k;
          bVal = b.deaths_per_100k;
          break;
        case "rural_pct":
          aVal = a.rural_pct;
          bVal = b.rural_pct;
          break;
        case "judicial_profile":
          aVal = a.judicial_profile;
          bVal = b.judicial_profile;
          break;
      }
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortAsc
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortAsc
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return rows;
  }, [data.accidentSummary, countyFilter, sortKey, sortAsc]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "county");
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return null;
    return sortAsc ? (
      <ChevronUp className="w-3 h-3 inline ml-0.5" />
    ) : (
      <ChevronDown className="w-3 h-3 inline ml-0.5" />
    );
  }

  /* -- MSA sorted data -- */
  const sortedMSA = useMemo(() => {
    const rows = [...data.msaDemographics];
    rows.sort((a, b) => {
      switch (msaSortKey) {
        case "pop":
          return msaSortAsc
            ? a.total_population - b.total_population
            : b.total_population - a.total_population;
        case "income":
          return msaSortAsc
            ? (a.median_household_income ?? 0) - (b.median_household_income ?? 0)
            : (b.median_household_income ?? 0) - (a.median_household_income ?? 0);
        case "poverty":
          return msaSortAsc
            ? (a.pct_poverty ?? 0) - (b.pct_poverty ?? 0)
            : (b.pct_poverty ?? 0) - (a.pct_poverty ?? 0);
        default:
          return 0;
      }
    });
    return rows;
  }, [data.msaDemographics, msaSortKey, msaSortAsc]);

  /* -- Aggregate stats -- */
  const totalFatalCrashes = data.accidentSummary.reduce(
    (s, r) => s + r.fatal_crashes,
    0
  );
  const totalDeaths = data.accidentSummary.reduce(
    (s, r) => s + r.total_deaths,
    0
  );
  const totalTruckDeaths = data.accidentSummary.reduce(
    (s, r) => s + r.truck_deaths,
    0
  );
  const totalMotoDeaths = data.accidentSummary.reduce(
    (s, r) => s + r.moto_deaths,
    0
  );
  const totalBoatingAccidents = data.boatingSummary.reduce(
    (s, r) => s + r.accident_count,
    0
  );
  const totalBoatingDeaths = data.boatingSummary.reduce(
    (s, r) => s + r.total_deaths,
    0
  );
  const totalBoatingInjuries = data.boatingSummary.reduce(
    (s, r) => s + r.total_injuries,
    0
  );
  const mvaDeaths = totalDeaths - totalTruckDeaths - totalMotoDeaths;

  /* -- Top 5 counties for each case type -- */
  const top5MVA = [...data.accidentSummary]
    .map((r) => ({
      county: r.county,
      count: r.total_deaths - r.truck_deaths - r.moto_deaths,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const top5Truck = [...data.accidentSummary]
    .filter((r) => r.truck_deaths > 0)
    .sort((a, b) => b.truck_deaths - a.truck_deaths)
    .slice(0, 5);

  const top5Moto = [...data.accidentSummary]
    .filter((r) => r.moto_deaths > 0)
    .sort((a, b) => b.moto_deaths - a.moto_deaths)
    .slice(0, 5);

  /* -- Rural/Urban aggregates -- */
  const ruralRow = data.ruralUrban.find((r) => r.category === "Rural");
  const urbanRow = data.ruralUrban.find((r) => r.category === "Urban");

  /* -- Judicial profile counts -- */
  const profileCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const j of data.judicialProfiles) {
      const p = j.judicial_profile || "Unknown";
      counts[p] = (counts[p] || 0) + 1;
    }
    return counts;
  }, [data.judicialProfiles]);

  /* -- Judicial + fatality merged -- */
  const judicialWithFatalities = useMemo(() => {
    const accidentMap = new Map<string, AccidentSummaryRow>();
    for (const r of data.accidentSummary) {
      accidentMap.set(r.county.toLowerCase(), r);
    }
    return data.judicialProfiles.map((j) => {
      const countyKey = j.county_name
        .replace(/ County$/i, "")
        .toLowerCase();
      const acc = accidentMap.get(countyKey);
      return {
        county: j.county_name.replace(/ County$/i, ""),
        profile: j.judicial_profile,
        population: acc?.total_population ?? null,
        deathsPer100k: acc?.deaths_per_100k ?? null,
      };
    });
  }, [data.judicialProfiles, data.accidentSummary]);

  /* -- Top storm chart data -- */
  const topStorms = data.stormSummary.slice(0, 10);

  /* -- PI viability bar chart data -- */
  const piData = data.piViability;

  /* -- Major TN metros -- */
  const MAJOR_METROS = ["Nashville", "Memphis", "Knoxville", "Chattanooga"];

  return (
    <div className="space-y-8">
      {/* ============================================================ */}
      {/* 1. STATE HEADER                                              */}
      {/* ============================================================ */}
      <div>
        <Link
          href="/overview"
          className="text-sm text-slate-gray hover:text-midnight-navy"
        >
          <span className="flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Overview
          </span>
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl font-bold text-midnight-navy">
            Tennessee
          </h1>
          <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-600">
            Modified Comparative (49% Bar)
          </span>
        </div>
        <p className="mt-1 text-lg text-slate-gray">
          State Intelligence Report
        </p>
        <p className="mt-1 text-sm text-slate-gray max-w-3xl">
          Cross-signal intelligence for plaintiff firm advertising and case
          acquisition in Tennessee &mdash; combining accident data, demographics,
          judicial profiles, TN Safety crash dashboards, and market opportunity
          signals across MVA, trucking, motorcycle, construction, and boating.
          Major metros: Nashville, Memphis, Knoxville, and Chattanooga.
          Population ~7.1M.
        </p>
      </div>

      {/* ============================================================ */}
      {/* 2. STATE SNAPSHOT                                            */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-lg bg-white p-4 shadow-sm border">
          <div className="flex items-center gap-1.5 mb-2">
            <Car className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Fatal Crashes
            </p>
          </div>
          <p className="text-3xl font-bold text-midnight-navy">
            {fmtNum(totalFatalCrashes)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-gray">
            2019&ndash;2024 &middot; FARS
          </p>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm border">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Annual Fatalities
            </p>
          </div>
          <p className="text-3xl font-bold text-midnight-navy">
            {fmtNum(TDOSHS.totalFatalities)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-gray">
            TDOSHS 2023
          </p>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm border">
          <div className="flex items-center gap-1.5 mb-2">
            <MapPin className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Rural Fatal Share
            </p>
          </div>
          <p className="text-3xl font-bold text-midnight-navy">46%</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">
            of TDOSHS fatalities
          </p>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm border">
          <div className="flex items-center gap-1.5 mb-2">
            <Scale className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              PI Viability
            </p>
          </div>
          <p className="text-3xl font-bold text-midnight-navy">
            {piData?.composite_score ?? "\u2014"}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-gray">
            Modified comparative (49%)
          </p>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm border">
          <div className="flex items-center gap-1.5 mb-2">
            <HardHat className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Workplace Fatalities
            </p>
          </div>
          <p className="text-3xl font-bold text-midnight-navy">
            {BLS.totalWorkplaceFatalities}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-gray">
            {BLS.constructionFatalities} construction &middot; BLS CFOI 2023
          </p>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm border">
          <div className="flex items-center gap-1.5 mb-2">
            <CloudLightning className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Storm Events
            </p>
          </div>
          <p className="text-3xl font-bold text-midnight-navy">
            {fmtNum(data.stormCount)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-gray">
            NOAA Storm Events
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2b. COUNTY-LEVEL INJURY RANKINGS (reusable component)        */}
      {/* ============================================================ */}
      <StateInjuryTable
        stateName="Tennessee"
        data={TN_COUNTY_INJURY_DATA}
        years={TN_INJURY_DATA_YEARS}
        latestCompleteYear={TN_INJURY_DATA_LATEST_YEAR}
        partialYearLabels={{ 2025: "(Jan\u2013Sept)" }}
        sourceLabel="Tennessee Traffic Crash Injuries by Severity 2010\u20132025"
        sourceUrl="https://www.tn.gov/content/dam/tn/safety/documents/crash_stats/Injuries.pdf"
      />

      {/* ============================================================ */}
      {/* 3. TENNESSEE CRASH INTELLIGENCE (reusable component)         */}
      {/* ============================================================ */}
      <StateCrashEmbed
        stateName="Tennessee"
        sourceLabel="Tennessee Department of Safety & Homeland Security"
        sourceUrl="https://www.tn.gov/safety/stats/dashboards.html"
        embeds={TN_CRASH_EMBEDS}
      />

      {/* ============================================================ */}
      {/* 4. LEGAL LANDSCAPE                                           */}
      {/* ============================================================ */}
      <div className="rounded-lg bg-white p-6 shadow-sm border">
        <div className="flex items-center gap-2 mb-4">
          <Scale className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-2xl font-bold text-midnight-navy">
            Legal Landscape
          </h2>
        </div>

        {piData ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-4">
              <div className="rounded-md bg-cloud/60 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
                  Negligence Rule
                </p>
                <p className="text-sm font-bold text-amber-600">
                  {formatNegligenceRule(piData.negligence_rule)}
                </p>
              </div>
              <div className="rounded-md bg-cloud/60 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
                  Statute of Limitations
                </p>
                <p className="text-sm font-semibold text-midnight-navy">
                  {piData.statute_of_limitations}
                </p>
              </div>
              <div className="rounded-md bg-cloud/60 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
                  Non-Economic Damage Caps
                </p>
                <p className="text-sm text-midnight-navy">
                  {piData.non_economic_cap ?? "None"}
                </p>
              </div>
              <div className="rounded-md bg-cloud/60 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
                  Punitive Damage Caps
                </p>
                <p className="text-sm text-midnight-navy">
                  {piData.punitive_cap ?? "None"}
                </p>
              </div>
              <div className="rounded-md bg-cloud/60 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
                  Average Jury Verdict
                </p>
                <p className="text-sm font-semibold text-midnight-navy">
                  {piData.avg_jury_verdict != null
                    ? typeof piData.avg_jury_verdict === "string" &&
                      /^[a-zA-Z]/.test(piData.avg_jury_verdict)
                      ? piData.avg_jury_verdict
                      : fmtCur(Number(piData.avg_jury_verdict))
                    : "\u2014"}
                </p>
              </div>
              <div className="rounded-md bg-cloud/60 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
                  Composite Score
                </p>
                <p className="text-sm font-bold text-intelligence-teal">
                  {piData.composite_score}
                </p>
              </div>
            </div>

            <div className="rounded-md border-l-4 border-amber-500 bg-amber-50 px-4 py-3">
              <p className="text-sm text-midnight-navy/80">
                Tennessee follows modified comparative negligence with a 49%
                bar &mdash; plaintiffs who are 50% or more at fault are barred
                from recovery. Tennessee caps non-economic damages in most PI
                cases and has specific caps on punitive damages. The 1-year
                statute of limitations is among the shortest in the nation and
                requires aggressive, timely case acquisition.
              </p>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
            <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
            <p className="text-sm font-medium text-midnight-navy/60">
              PI viability data loading...
            </p>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 5. CASE TYPE OPPORTUNITIES                                   */}
      {/* ============================================================ */}
      <div className="rounded-lg border border-intelligence-teal/20 bg-gradient-to-br from-intelligence-teal/[0.04] to-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-2xl font-bold text-midnight-navy">
            Case Type Opportunities
          </h2>
        </div>
        <p className="mb-6 text-sm text-slate-gray">
          Data-driven targeting recommendations by case type
        </p>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {/* MVA Card */}
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Car className="w-5 h-5 text-intelligence-teal" />
              <h3 className="text-sm font-bold text-midnight-navy">
                Motor Vehicle Accidents
              </h3>
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">MVA Fatal Deaths (FARS)</span>
                <span className="font-semibold text-midnight-navy">
                  {fmtNum(mvaDeaths)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Top Counties</span>
                <span className="font-medium text-midnight-navy text-right">
                  {top5MVA.map((r) => r.county).join(", ")}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Speed-Related Fatalities (2023)</span>
                <span className="font-semibold text-midnight-navy">
                  {TDOSHS.speedRelatedFatalities} ({TDOSHS.speedRelatedPct}%)
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Alcohol-Related Fatalities (2023)</span>
                <span className="font-semibold text-midnight-navy">
                  {TDOSHS.alcoholRelatedFatalities} ({TDOSHS.alcoholRelatedPct}%)
                </span>
              </div>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3 mb-2">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">
                  Audience:
                </span>{" "}
                Nashville metro (Davidson, Williamson, Rutherford) dominates
                volume. Memphis (Shelby County) is the second largest market.
                I-40 corridor across the state and I-24 (Nashville-Chattanooga)
                are high-fatality routes. Tennessee&apos;s 79.8% drive-alone
                commute rate exceeds the national average, generating high
                exposure.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Digital + CTV in Nashville and Memphis metros. Billboard and
                radio along I-40 (Memphis-Nashville-Knoxville), I-24
                (Nashville-Chattanooga), and I-65 (Nashville-Alabama border).
                Country music radio is an efficient reach vehicle in Middle
                Tennessee.
              </p>
            </div>
          </div>

          {/* Large Truck Card */}
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-5 h-5 text-intelligence-teal" />
              <h3 className="text-sm font-bold text-midnight-navy">
                Large Truck Accidents
              </h3>
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">
                  Truck Fatal Deaths (FARS)
                </span>
                <span className="font-semibold text-midnight-navy">
                  {fmtNum(totalTruckDeaths)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Top Counties</span>
                <span className="font-medium text-midnight-navy text-right">
                  {top5Truck.map((r) => r.county).join(", ")}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Truck Transport Workplace Fatalities</span>
                <span className="font-medium text-midnight-navy">
                  {BLS.truckTransportFatalities} (BLS CFOI)
                </span>
              </div>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3 mb-2">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">
                  Audience:
                </span>{" "}
                Tennessee is a major freight hub &mdash; Nashville, Memphis
                (FedEx), and Chattanooga sit at the intersection of I-40, I-65,
                I-24, and I-75. Memphis is one of the largest logistics centers
                in the country. Rural stretches of I-40 between Nashville and
                Knoxville see heavy truck traffic and disproportionate fatalities.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Geo-fenced digital ads along I-40 and I-65 corridors. Truck stop
                billboards at major rest areas. Target CDL holder families and
                passenger vehicle occupants struck by trucks. Memphis market
                reaches into Mississippi and Arkansas.
              </p>
            </div>
          </div>

          {/* Motorcycle Card */}
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Bike className="w-5 h-5 text-intelligence-teal" />
              <h3 className="text-sm font-bold text-midnight-navy">
                Motorcycle Accidents
              </h3>
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">
                  Motorcycle Fatal Deaths (FARS)
                </span>
                <span className="font-semibold text-midnight-navy">
                  {fmtNum(totalMotoDeaths)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">
                  TDOSHS 2023 Motorcycle Fatalities
                </span>
                <span className="font-semibold text-midnight-navy">
                  {TDOSHS.motorcycleFatalities}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Top Counties</span>
                <span className="font-medium text-midnight-navy text-right">
                  {top5Moto.map((r) => r.county).join(", ")}
                </span>
              </div>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3 mb-2">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">
                  Audience:
                </span>{" "}
                Tennessee is a top motorcycle tourism state &mdash; the Tail of
                the Dragon (US-129) and Natchez Trace Parkway draw riders
                nationally. Davidson and Shelby counties lead in volume, while
                East Tennessee mountain roads see higher severity crashes.
                Tennessee has no helmet law for riders over 21.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Seasonal spring/summer campaigns during peak riding season.
                Social media + streaming targeting motorcycle interests. Events
                sponsorship (motorcycle rallies). Digital geo-fencing near
                popular riding routes in the Smoky Mountains and along the
                Natchez Trace.
              </p>
            </div>
          </div>

          {/* Construction Card */}
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <HardHat className="w-5 h-5 text-intelligence-teal" />
              <h3 className="text-sm font-bold text-midnight-navy">
                Construction Accidents
              </h3>
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Construction Fatalities (2023)</span>
                <span className="font-semibold text-midnight-navy">
                  {BLS.constructionFatalities} ({BLS.constructionPctTotal}% of all workplace deaths)
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">
                  Falls/Slips/Trips Fatalities
                </span>
                <span className="font-semibold text-midnight-navy">
                  {BLS.fallsSlipsTrips}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Total Workplace Fatalities</span>
                <span className="font-medium text-midnight-navy">
                  {BLS.totalWorkplaceFatalities} (BLS CFOI 2023)
                </span>
              </div>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3 mb-2">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">
                  Audience:
                </span>{" "}
                Nashville&apos;s construction boom (driven by healthcare,
                hospitality, and residential growth) creates a large at-risk
                workforce. Chattanooga and Knoxville are also experiencing
                significant development. Target construction workers, their
                families, and workers&apos; comp attorneys.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Job site proximity targeting via mobile in Nashville, Knoxville,
                and Chattanooga. Workers&apos; comp and construction injury
                keywords. Spanish-language digital and radio for growing
                Hispanic workforce in Middle Tennessee construction.
              </p>
            </div>
          </div>

          {/* Boating Card */}
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Anchor className="w-5 h-5 text-intelligence-teal" />
              <h3 className="text-sm font-bold text-midnight-navy">
                Boating Accidents
              </h3>
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Total Boating Accidents</span>
                <span className="font-semibold text-midnight-navy">
                  {fmtNum(totalBoatingAccidents)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Deaths / Injuries</span>
                <span className="font-semibold text-midnight-navy">
                  {fmtNum(totalBoatingDeaths)} / {fmtNum(totalBoatingInjuries)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Top Counties</span>
                <span className="font-medium text-midnight-navy text-right">
                  {data.boatingSummary
                    .slice(0, 5)
                    .map((r) => r.county)
                    .join(", ")}
                </span>
              </div>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3 mb-2">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">
                  Audience:
                </span>{" "}
                Tennessee has extensive lake and river recreation &mdash;
                including Kentucky Lake, Norris Lake, Center Hill Lake, and the
                Tennessee River system. Summer weekends drive peak accident
                periods. Target boating enthusiasts and lake house vacation
                demographics.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Seasonal spring/summer campaigns. Geo-targeted digital around
                major lake communities. Local radio in lakeside counties. Marina
                signage and outfitter partnerships.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 6. ACCIDENT DATA BY COUNTY (Interactive Table)               */}
      {/* ============================================================ */}
      <div className="rounded-lg bg-white p-6 shadow-sm border">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-2xl font-bold text-midnight-navy">
            Accident Data by County
          </h2>
        </div>
        <p className="mb-4 text-sm text-slate-gray">
          95 Tennessee counties &mdash; sortable by any column. Click headers to
          sort.
        </p>

        <div className="mb-4 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-gray" />
          <input
            type="text"
            placeholder="Filter by county name..."
            value={countyFilter}
            onChange={(e) => setCountyFilter(e.target.value)}
            className="rounded-md border border-cloud bg-cloud/40 px-3 py-1.5 text-sm text-midnight-navy placeholder:text-slate-gray/60 focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
          />
        </div>

        {data.accidentSummary.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-cloud">
                  {[
                    { key: "county" as SortKey, label: "County" },
                    { key: "population" as SortKey, label: "Population" },
                    { key: "fatal_crashes" as SortKey, label: "Fatal Crashes" },
                    { key: "total_deaths" as SortKey, label: "Total Deaths" },
                    { key: "truck_deaths" as SortKey, label: "Truck Deaths" },
                    { key: "moto_deaths" as SortKey, label: "Moto Deaths" },
                    {
                      key: "deaths_per_100k" as SortKey,
                      label: "Deaths/100K",
                    },
                    { key: "rural_pct" as SortKey, label: "Rural %" },
                    {
                      key: "judicial_profile" as SortKey,
                      label: "Judicial Profile",
                    },
                  ].map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="cursor-pointer whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-gray hover:text-midnight-navy"
                    >
                      {col.label}
                      <SortIcon col={col.key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAccidentData.map((row) => (
                  <tr
                    key={row.county}
                    className="border-b border-cloud/60 hover:bg-cloud/30 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-medium text-midnight-navy">
                      {row.county}
                    </td>
                    <td className="py-2.5 px-3 text-midnight-navy/80">
                      {fmtNum(row.total_population)}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-midnight-navy">
                      {fmtNum(row.fatal_crashes)}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-red-600">
                      {fmtNum(row.total_deaths)}
                    </td>
                    <td className="py-2.5 px-3 text-midnight-navy/80">
                      {fmtNum(row.truck_deaths)}
                    </td>
                    <td className="py-2.5 px-3 text-midnight-navy/80">
                      {fmtNum(row.moto_deaths)}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-midnight-navy">
                      {row.deaths_per_100k != null
                        ? row.deaths_per_100k.toFixed(1)
                        : "\u2014"}
                    </td>
                    <td className="py-2.5 px-3 text-midnight-navy/80">
                      {fmtPct(row.rural_pct)}
                    </td>
                    <td className="py-2.5 px-3">
                      {row.judicial_profile ? (
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${getProfileColor(
                            row.judicial_profile
                          )}`}
                        >
                          {row.judicial_profile}
                        </span>
                      ) : (
                        <span className="text-slate-gray/50">&mdash;</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
            <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
            <p className="text-sm font-medium text-midnight-navy/60">
              Accident data loading...
            </p>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 7. RURAL vs. URBAN ANALYSIS                                  */}
      {/* ============================================================ */}
      <div className="rounded-lg bg-white p-6 shadow-sm border">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-2xl font-bold text-midnight-navy">
            Rural vs. Urban Analysis
          </h2>
        </div>

        {ruralRow && urbanRow ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-cloud">
                    <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-gray">
                      Metric
                    </th>
                    <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-gray">
                      Rural
                    </th>
                    <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-gray">
                      Urban
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-cloud/60">
                    <td className="py-2.5 px-3 font-medium text-midnight-navy">
                      Fatal Crashes
                    </td>
                    <td className="py-2.5 px-3 text-midnight-navy/80">
                      {fmtNum(ruralRow.fatal_crashes)}
                    </td>
                    <td className="py-2.5 px-3 text-midnight-navy/80">
                      {fmtNum(urbanRow.fatal_crashes)}
                    </td>
                  </tr>
                  <tr className="border-b border-cloud/60">
                    <td className="py-2.5 px-3 font-medium text-midnight-navy">
                      Total Deaths
                    </td>
                    <td className="py-2.5 px-3 text-midnight-navy/80">
                      {fmtNum(ruralRow.total_deaths)}
                    </td>
                    <td className="py-2.5 px-3 text-midnight-navy/80">
                      {fmtNum(urbanRow.total_deaths)}
                    </td>
                  </tr>
                  <tr className="border-b border-cloud/60">
                    <td className="py-2.5 px-3 font-medium text-midnight-navy">
                      Avg Median Income
                    </td>
                    <td className="py-2.5 px-3 text-midnight-navy/80">
                      {fmtCur(ruralRow.avg_median_income)}
                    </td>
                    <td className="py-2.5 px-3 text-midnight-navy/80">
                      {fmtCur(urbanRow.avg_median_income)}
                    </td>
                  </tr>
                  <tr className="border-b border-cloud/60">
                    <td className="py-2.5 px-3 font-medium text-midnight-navy">
                      Avg Poverty Rate
                    </td>
                    <td className="py-2.5 px-3 text-midnight-navy/80">
                      {fmtPct(ruralRow.avg_poverty_pct)}
                    </td>
                    <td className="py-2.5 px-3 text-midnight-navy/80">
                      {fmtPct(urbanRow.avg_poverty_pct)}
                    </td>
                  </tr>
                  <tr className="border-b border-cloud/60">
                    <td className="py-2.5 px-3 font-medium text-midnight-navy">
                      Avg Internet Access
                    </td>
                    <td className="py-2.5 px-3 text-midnight-navy/80">
                      {fmtPct(ruralRow.avg_internet_pct)}
                    </td>
                    <td className="py-2.5 px-3 text-midnight-navy/80">
                      {fmtPct(urbanRow.avg_internet_pct)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-midnight-navy">
                      Avg Uninsured Rate
                    </td>
                    <td className="py-2.5 px-3 text-midnight-navy/80">
                      {fmtPct(ruralRow.avg_uninsured_pct)}
                    </td>
                    <td className="py-2.5 px-3 text-midnight-navy/80">
                      {fmtPct(urbanRow.avg_uninsured_pct)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-md border-l-4 border-intelligence-teal bg-intelligence-teal/5 px-4 py-3">
              <p className="text-sm text-midnight-navy/80">
                Tennessee&apos;s rural counties have disproportionately high
                fatality rates despite lower total crash counts. Rural
                areas &mdash; especially in Appalachian East Tennessee &mdash;
                have lower internet access and higher uninsured rates, limiting
                digital-only advertising reach and increasing the severity of
                untreated injuries.
              </p>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
            <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
            <p className="text-sm font-medium text-midnight-navy/60">
              Rural/urban data loading...
            </p>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 8. MARKET DEMOGRAPHICS BY METRO                              */}
      {/* ============================================================ */}
      <div className="rounded-lg bg-white p-6 shadow-sm border">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-2xl font-bold text-midnight-navy">
            Market Demographics by Metro
          </h2>
        </div>

        {data.msaDemographics.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-cloud">
                  <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-gray">
                    Metro Area
                  </th>
                  <th
                    onClick={() => {
                      if (msaSortKey === "pop") setMsaSortAsc(!msaSortAsc);
                      else {
                        setMsaSortKey("pop");
                        setMsaSortAsc(false);
                      }
                    }}
                    className="cursor-pointer whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-gray hover:text-midnight-navy"
                  >
                    Population
                    {msaSortKey === "pop" &&
                      (msaSortAsc ? (
                        <ChevronUp className="w-3 h-3 inline ml-0.5" />
                      ) : (
                        <ChevronDown className="w-3 h-3 inline ml-0.5" />
                      ))}
                  </th>
                  <th
                    onClick={() => {
                      if (msaSortKey === "income") setMsaSortAsc(!msaSortAsc);
                      else {
                        setMsaSortKey("income");
                        setMsaSortAsc(false);
                      }
                    }}
                    className="cursor-pointer whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-gray hover:text-midnight-navy"
                  >
                    Median Income
                    {msaSortKey === "income" &&
                      (msaSortAsc ? (
                        <ChevronUp className="w-3 h-3 inline ml-0.5" />
                      ) : (
                        <ChevronDown className="w-3 h-3 inline ml-0.5" />
                      ))}
                  </th>
                  <th
                    onClick={() => {
                      if (msaSortKey === "poverty") setMsaSortAsc(!msaSortAsc);
                      else {
                        setMsaSortKey("poverty");
                        setMsaSortAsc(false);
                      }
                    }}
                    className="cursor-pointer whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-gray hover:text-midnight-navy"
                  >
                    Poverty %
                    {msaSortKey === "poverty" &&
                      (msaSortAsc ? (
                        <ChevronUp className="w-3 h-3 inline ml-0.5" />
                      ) : (
                        <ChevronDown className="w-3 h-3 inline ml-0.5" />
                      ))}
                  </th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-gray">
                    Uninsured %
                  </th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-gray">
                    Employed %
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedMSA.map((row) => (
                  <tr
                    key={row.cbsa_code}
                    className="border-b border-cloud/60 hover:bg-cloud/30 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-medium text-midnight-navy">
                      {row.cbsa_title}
                    </td>
                    <td className="py-2.5 px-3 text-midnight-navy/80">
                      {fmtNum(row.total_population)}
                    </td>
                    <td className="py-2.5 px-3 text-midnight-navy/80">
                      {fmtCur(row.median_household_income)}
                    </td>
                    <td className="py-2.5 px-3 text-midnight-navy/80">
                      {fmtPct(row.pct_poverty)}
                    </td>
                    <td className="py-2.5 px-3 text-midnight-navy/80">
                      {fmtPct(row.pct_uninsured)}
                    </td>
                    <td className="py-2.5 px-3 text-midnight-navy/80">
                      {fmtPct(row.pct_employed)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
            <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
            <p className="text-sm font-medium text-midnight-navy/60">
              MSA demographic data loading...
            </p>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 9. JUDICIAL PROFILES BY COUNTY                               */}
      {/* ============================================================ */}
      <div className="rounded-lg bg-white p-6 shadow-sm border">
        <div className="flex items-center gap-2 mb-4">
          <Scale className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-2xl font-bold text-midnight-navy">
            Judicial Profiles by County
          </h2>
        </div>

        {judicialWithFatalities.length > 0 ? (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              {Object.entries(profileCounts).map(([profile, count]) => (
                <span
                  key={profile}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${getProfileColor(
                    profile
                  )}`}
                >
                  {profile}: {count}
                </span>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-cloud">
                    <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-gray">
                      County
                    </th>
                    <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-gray">
                      Judicial Profile
                    </th>
                    <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-gray text-right">
                      Population
                    </th>
                    <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-gray text-right">
                      Deaths/100K
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {judicialWithFatalities
                    .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
                    .map((row) => (
                      <tr
                        key={row.county}
                        className={`border-b border-cloud/60 hover:bg-cloud/30 transition-colors border-l-4 ${getProfileBorderColor(
                          row.profile
                        )}`}
                      >
                        <td className="py-2.5 px-3 font-medium text-midnight-navy">
                          {row.county}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${getProfileColor(
                              row.profile
                            )}`}
                          >
                            {row.profile}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-midnight-navy/80">
                          {fmtNum(row.population)}
                        </td>
                        <td className="py-2.5 pl-3 text-right font-semibold text-midnight-navy">
                          {row.deathsPer100k != null
                            ? row.deathsPer100k.toFixed(1)
                            : "\u2014"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-md border-l-4 border-intelligence-teal bg-intelligence-teal/5 px-4 py-3">
              <p className="text-sm text-midnight-navy/80">
                Davidson County (Nashville) and Shelby County (Memphis) are the
                two largest population centers. Filing venue selection in
                Tennessee matters &mdash; judicial leanings can vary
                significantly between urban and rural counties.
              </p>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
            <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
            <p className="text-sm font-medium text-midnight-navy/60">
              Judicial profile data loading...
            </p>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 10. PI VIABILITY DEEP DIVE                                   */}
      {/* ============================================================ */}
      <div className="rounded-lg bg-white p-6 shadow-sm border">
        <div className="flex items-center gap-2 mb-4">
          <Scale className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-2xl font-bold text-midnight-navy">
            PI Viability Deep Dive
          </h2>
        </div>

        {piData ? (
          <>
            <div className="rounded-lg bg-white p-4 mb-4">
              <p className="mb-3 text-xs font-semibold text-midnight-navy">
                Component Scores
              </p>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={[
                    { name: "Negligence", score: piData.negligence_score ?? 0, fill: (piData.negligence_score ?? 0) <= 25 ? "#EF4444" : (piData.negligence_score ?? 0) <= 74 ? "#F59E0B" : "#22C55E" },
                    { name: "Non-Economic Caps", score: piData.non_economic_score ?? 0, fill: (piData.non_economic_score ?? 0) <= 25 ? "#EF4444" : (piData.non_economic_score ?? 0) <= 74 ? "#F59E0B" : "#22C55E" },
                    { name: "Punitive Caps", score: piData.punitive_score ?? 0, fill: (piData.punitive_score ?? 0) <= 25 ? "#EF4444" : (piData.punitive_score ?? 0) <= 74 ? "#F59E0B" : "#22C55E" },
                    { name: "Med-Mal Caps", score: piData.med_mal_score ?? 0, fill: (piData.med_mal_score ?? 0) <= 25 ? "#EF4444" : (piData.med_mal_score ?? 0) <= 74 ? "#F59E0B" : "#22C55E" },
                    { name: "Statute of Limitations", score: piData.sol_score ?? 0, fill: (piData.sol_score ?? 0) <= 25 ? "#EF4444" : (piData.sol_score ?? 0) <= 74 ? "#F59E0B" : "#22C55E" },
                    { name: "Jury Verdicts", score: piData.verdict_score ?? 0, fill: (piData.verdict_score ?? 0) <= 25 ? "#EF4444" : (piData.verdict_score ?? 0) <= 74 ? "#F59E0B" : "#22C55E" },
                    { name: "Composite", score: parseFloat(String(piData.composite_score)) || 0, fill: "#14B8A6" },
                  ]}
                  layout="vertical"
                  margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
                >
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={160}
                    tick={{ fontSize: 11, fill: "#1B2A4A" }}
                  />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {[
                      { name: "Negligence", score: piData.negligence_score ?? 0, fill: (piData.negligence_score ?? 0) <= 25 ? "#EF4444" : (piData.negligence_score ?? 0) <= 74 ? "#F59E0B" : "#22C55E" },
                      { name: "Non-Economic Caps", score: piData.non_economic_score ?? 0, fill: (piData.non_economic_score ?? 0) <= 25 ? "#EF4444" : (piData.non_economic_score ?? 0) <= 74 ? "#F59E0B" : "#22C55E" },
                      { name: "Punitive Caps", score: piData.punitive_score ?? 0, fill: (piData.punitive_score ?? 0) <= 25 ? "#EF4444" : (piData.punitive_score ?? 0) <= 74 ? "#F59E0B" : "#22C55E" },
                      { name: "Med-Mal Caps", score: piData.med_mal_score ?? 0, fill: (piData.med_mal_score ?? 0) <= 25 ? "#EF4444" : (piData.med_mal_score ?? 0) <= 74 ? "#F59E0B" : "#22C55E" },
                      { name: "Statute of Limitations", score: piData.sol_score ?? 0, fill: (piData.sol_score ?? 0) <= 25 ? "#EF4444" : (piData.sol_score ?? 0) <= 74 ? "#F59E0B" : "#22C55E" },
                      { name: "Jury Verdicts", score: piData.verdict_score ?? 0, fill: (piData.verdict_score ?? 0) <= 25 ? "#EF4444" : (piData.verdict_score ?? 0) <= 74 ? "#F59E0B" : "#22C55E" },
                      { name: "Composite", score: parseFloat(String(piData.composite_score)) || 0, fill: "#14B8A6" },
                    ].map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-md border-l-4 border-intelligence-teal bg-intelligence-teal/5 px-4 py-3">
              <p className="text-sm text-midnight-navy/80">
                Tennessee&apos;s modified comparative negligence rule (49% bar)
                and non-economic damage caps make it less plaintiff-friendly
                than pure comparative states like Arizona. However, the short
                1-year statute of limitations creates urgency that benefits
                firms with aggressive case acquisition pipelines.
              </p>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
            <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
            <p className="text-sm font-medium text-midnight-navy/60">
              PI viability data loading...
            </p>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 11. SEARCH ADVERTISING LANDSCAPE                             */}
      {/* ============================================================ */}
      <PIAdvertisingSection stateAbbr="TN" onDataLoaded={handlePIAdDataLoaded} />

      {/* ============================================================ */}
      {/* 12. COMPETITIVE LANDSCAPE                                    */}
      {/* ============================================================ */}
      <CompetitiveLandscapeTable data={tennesseeCompetitiveData} />

      {/* ============================================================ */}
      {/* 12b. ADVERTISING INTELLIGENCE (Platform, Advertisers, etc.)  */}
      {/* ============================================================ */}
      <StateAdvertisingSection stateAbbr="TN" stateName="Tennessee" />

      {/* ============================================================ */}
      {/* 13. CROSS-SIGNAL INSIGHT CARDS                               */}
      {/* ============================================================ */}
      <div className="rounded-lg border border-intelligence-teal/20 bg-gradient-to-br from-intelligence-teal/[0.04] to-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-2xl font-bold text-midnight-navy">
            Cross-Signal Insights
          </h2>
        </div>
        <p className="mb-6 text-sm text-slate-gray">
          Non-obvious opportunities surfaced by cross-referencing multiple data
          sources
        </p>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🎵</span>
              <h3 className="text-sm font-bold text-midnight-navy">
                Nashville PI Market Saturation
              </h3>
            </div>
            <p className="text-[11px] text-midnight-navy/70">
              Nashville&apos;s rapid population growth (+21% since 2010) has
              attracted national PI firms (Morgan &amp; Morgan, Cellino),
              creating one of the most competitive advertising markets in the
              Southeast. However, surrounding counties (Williamson, Rutherford,
              Wilson) are growing even faster with less advertising saturation.
              Satellite-metro targeting offers better cost-per-case economics.
            </p>
          </div>

          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🚛</span>
              <h3 className="text-sm font-bold text-midnight-navy">
                Memphis Freight Corridor
              </h3>
            </div>
            <p className="text-[11px] text-midnight-navy/70">
              Memphis is home to FedEx&apos;s global hub, making it one of the
              busiest freight corridors in the U.S. I-40 and I-55 through
              Shelby County see extreme truck traffic volumes. Combined with
              cross-state reach into Mississippi and Arkansas, Memphis-market
              truck accident campaigns have unusually broad geographic impact.
            </p>
          </div>

          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⏰</span>
              <h3 className="text-sm font-bold text-midnight-navy">
                1-Year SOL Urgency
              </h3>
            </div>
            <p className="text-[11px] text-midnight-navy/70">
              Tennessee&apos;s 1-year statute of limitations for personal injury
              is among the shortest in the nation. This creates both a challenge
              and an opportunity: firms with fast intake pipelines and immediate
              digital response capabilities can capture cases that slower
              competitors miss. Time-sensitive messaging (&quot;Act now &mdash;
              Tennessee&apos;s filing deadline is only 1 year&quot;) resonates
              strongly.
            </p>
          </div>

          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🏔️</span>
              <h3 className="text-sm font-bold text-midnight-navy">
                Appalachian Connectivity Gap
              </h3>
            </div>
            <p className="text-[11px] text-midnight-navy/70">
              East Tennessee&apos;s Appalachian counties have lower internet
              access rates and higher uninsured populations. These areas also
              have high fatality rates on mountain roads. Digital-only
              advertising cannot reach these communities effectively. Radio,
              community health centers, and local TV are necessary channels for
              plaintiff firm outreach in the Smokies corridor.
            </p>
          </div>

          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🏍️</span>
              <h3 className="text-sm font-bold text-midnight-navy">
                Motorcycle Tourism Opportunity
              </h3>
            </div>
            <p className="text-[11px] text-midnight-navy/70">
              The Tail of the Dragon (US-129, 318 curves in 11 miles) and the
              Cherohala Skyway draw motorcycle tourists from across the country.
              Out-of-state riders injured in Tennessee may not know local
              attorneys. Geo-fenced digital ads at these routes plus
              partnerships with motorcycle-adjacent businesses (hotels, gear
              shops) can capture cases from this unique tourism segment.
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ASK AI PANEL                                                 */}
      {/* ============================================================ */}
      <AskAIPanel
        pageContext={{
          pageName: "Tennessee State Intelligence",
          pageDescription:
            "State-level intelligence for plaintiff firm advertising and case acquisition in Tennessee — combining FARS accident data, census demographics, judicial profiles, PI viability scores, storm events, TN Safety crash dashboards, and market opportunity signals across MVA, trucking, motorcycle, construction, and boating.",
          dataSummary: `State: Tennessee. Negligence: ${formatNegligenceRule(piData?.negligence_rule ?? 'modified_49')} (49% bar). PI Viability: ${piData?.composite_score ?? 'N/A'} composite. Fatal Crashes (FARS): ${totalFatalCrashes.toLocaleString()}. Total Deaths: ${totalDeaths.toLocaleString()}. Counties: 95. Top counties by deaths: ${[...data.accidentSummary].sort((a, b) => b.total_deaths - a.total_deaths).slice(0, 5).map(r => r.county).join(', ')}. Judicial profile mix: ${Object.entries(profileCounts).map(([p, c]) => `${c} ${p}`).join(', ')}. Storm events: ${data.stormCount.toLocaleString()}. Truck deaths: ${totalTruckDeaths.toLocaleString()}. Motorcycle deaths: ${totalMotoDeaths.toLocaleString()}. Boating accidents: ${totalBoatingAccidents.toLocaleString()}. Workplace fatalities: ${BLS.totalWorkplaceFatalities} (${BLS.constructionFatalities} construction). Key corridors: I-40, I-65, I-24, I-75.${piAdData ? ` ${buildPIAdSummary(piAdData)}` : ''}`,
        }}
      />

      {/* ============================================================ */}
      {/* 14. SOURCES & METHODOLOGY                                    */}
      {/* ============================================================ */}
      <div className="rounded-lg bg-white p-6 shadow-sm border">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-2xl font-bold text-midnight-navy">
            Sources &amp; Methodology
          </h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            "FARS (NHTSA) \u2014 Fatal crash data 2019\u20132024",
            "TN Dept. of Safety & Homeland Security Crash Dashboards",
            "ACS 5-Year Estimates 2023 (Census Bureau)",
            "BLS OES (Occupational Employment Statistics) May 2023",
            "BLS CFOI (Census of Fatal Occupational Injuries) 2023",
            "NOAA Storm Events Database",
            "USCG Boating Accident Report Database",
            "CDC/USCS Cancer Incidence Data",
            "Court records / judicial profile data",
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
          This page is refreshed periodically. Content reflects research and
          publicly available data as of the date shown. This page does not
          constitute legal advice.
        </p>
        <p className="mt-3 text-[11px] text-slate-gray/80">
          Data sources: FARS (NHTSA), TN Dept. of Safety &amp; Homeland Security
          Dashboards, ACS 5-Year Estimates, BLS OES/CFOI, NOAA Storm Events,
          USCG Boating Accidents, Judicial Profile Data.
        </p>
      </div>
    </div>
  );
}
