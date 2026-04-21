"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  Scale,
  Car,
  Truck,
  Bike,
  HardHat,
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
  Footprints,
  HeartPulse,
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
import {
  PIAdvertisingSection,
  buildPIAdSummary,
  type PIAdvertisingData,
} from "../../components/pi-advertising-section";
import { CompetitiveLandscapeTable } from "../../components/competitive-landscape-table";
import { californiaCompetitiveData } from "@/lib/data/competitive-landscape/california";

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

export interface CaliforniaPageData {
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
/*  Hardcoded Constants (OTS, BLS, ACS)                                */
/* ------------------------------------------------------------------ */

const OTS = {
  totalFatalities2023: 4_061,
  ratePerVMT: 1.26,
  nationalRate: 1.26,
  ruralFatalShare: 0.73,
  motorcycleFatalities: 583,
  pedestrianFatalities: 1_106,
  bicycleFatalities: 145,
  alcoholImpairedFatalities: 1_355,
  unrestrainedFatalities: 780,
  teenDriverFatalCrashes: 428,
  seatBeltUse: 96.2,
  hitAndRunFatalCrashes: 447,
  registeredMotorcycles: 848_332,
  motorcycleFatalityRate: 66.57,
  helmetUse: 94,
};

const BLS = {
  constructionWorkers: 911_333,
  constructionAvgPay: 85_786,
  constructionYoY: -0.1,
  constructionEstablishments: 92_976,
  truckingWorkers: 150_687,
  truckingAvgPay: 64_459,
  transportWarehouseTotal: 756_554,
  totalWorkplaceFatalities2024: 419,
  constructionFatalities2024: 81,
  constructionFallDeaths: 43,
  workplaceFatalityRate: 2.4,
  nationalWorkplaceRate: 3.3,
  hispanicWorkplaceFatalityShare: 51,
  specialtyTradeContractors: 69_210,
};

const COMMUTE = {
  driveAlone: 67.1,
  carpool: 9.5,
  transit: 3.2,
  wfh: 15.5,
  highWfhCounties: [
    { county: "Marin", pct: 27.9 },
    { county: "San Francisco", pct: 27.5 },
    { county: "Trinity", pct: 25.9 },
  ],
  highTransitCounties: [
    { county: "San Francisco", pct: 21.4 },
    { county: "Alameda", pct: 9.2 },
    { county: "Contra Costa", pct: 6.5 },
  ],
};

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

export function CaliforniaClient({ data }: { data: CaliforniaPageData }) {
  const [sortKey, setSortKey] = useState<SortKey>("deaths_per_100k");
  const [sortAsc, setSortAsc] = useState(false);
  const [countyFilter, setCountyFilter] = useState("");
  const [msaSortKey, setMsaSortKey] = useState<"pop" | "income" | "poverty">("pop");
  const [msaSortAsc, setMsaSortAsc] = useState(false);
  const [piAdData, setPiAdData] = useState<PIAdvertisingData | null>(null);
  const handlePIAdDataLoaded = useCallback((d: PIAdvertisingData) => setPiAdData(d), []);

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
  const totalDrunkDriverCrashes = data.accidentSummary.reduce(
    (s, r) => s + r.drunk_driver_crashes,
    0
  );
  const mvaDeaths = totalDeaths - totalTruckDeaths - totalMotoDeaths;

  /* -- Top 5 counties for each case type -- */
  const top5MVA = [...data.accidentSummary]
    .sort((a, b) => b.total_deaths - a.total_deaths)
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

  /* -- Judicial + fatality merged for section 8 -- */
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

  /* -- Major metros -- */
  const MAJOR_METROS = ["Los Angeles", "San Francisco", "San Diego", "Sacramento", "San Jose", "Riverside"];

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
            California
          </h1>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-600">
            Pure Comparative Negligence
          </span>
        </div>
        <p className="mt-1 text-lg text-slate-gray">
          State Intelligence Report
        </p>
        <p className="mt-1 text-sm text-slate-gray max-w-3xl">
          Cross-signal intelligence for plaintiff firm advertising and case
          acquisition in California &mdash; combining accident data, demographics,
          judicial profiles, and market opportunity signals across MVA, trucking,
          motorcycle, construction, and pedestrian/bicycle cases.
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
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Fatality Rate
            </p>
          </div>
          <p className="text-3xl font-bold text-midnight-navy">
            {OTS.ratePerVMT}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-gray">
            per 100M VMT &middot; equal to national avg &middot; 2023 OTS
          </p>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm border">
          <div className="flex items-center gap-1.5 mb-2">
            <MapPin className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Rural Road Share
            </p>
          </div>
          <p className="text-3xl font-bold text-midnight-navy">73%</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">
            of fatal crashes on rural-class roads
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
            composite score &middot; highest tier
          </p>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm border">
          <div className="flex items-center gap-1.5 mb-2">
            <HardHat className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Workplace Fatality
            </p>
          </div>
          <p className="text-3xl font-bold text-midnight-navy">
            {BLS.workplaceFatalityRate}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-gray">
            per 100K FTE &middot; vs {BLS.nationalWorkplaceRate} national &middot; below avg
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
          <p className="mt-0.5 text-[11px] text-slate-gray">NOAA records</p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. LEGAL LANDSCAPE                                           */}
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
                <p className="text-sm font-bold text-emerald-600">
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

            <div className="rounded-md border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3">
              <p className="text-sm text-midnight-navy/80">
                California is the most plaintiff-friendly major state in the U.S.
                for personal injury. Pure comparative negligence allows recovery at
                any fault level, there are no caps on non-economic or punitive
                damages for PI cases, and jury verdicts regularly exceed $1M. The
                only moderate factor is the 2-year statute of limitations. Combined
                with 39M+ population and massive vehicle miles traveled, California
                represents the single largest PI advertising market in the country.
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
      {/* 4. CASE TYPE OPPORTUNITIES                                   */}
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
                <span className="text-slate-gray">Total FARS Fatal Crashes</span>
                <span className="font-semibold text-midnight-navy">
                  {fmtNum(totalFatalCrashes)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Total Deaths</span>
                <span className="font-semibold text-midnight-navy">
                  {fmtNum(totalDeaths)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Drunk-Driver Crashes</span>
                <span className="font-semibold text-midnight-navy">
                  {fmtNum(totalDrunkDriverCrashes)} ({totalFatalCrashes > 0 ? ((totalDrunkDriverCrashes / totalFatalCrashes) * 100).toFixed(1) : 0}%)
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Top Counties</span>
                <span className="font-medium text-midnight-navy text-right">
                  {top5MVA.map((r) => r.county).join(", ")}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Rural Road Share</span>
                <span className="font-medium text-midnight-navy">73%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Alcohol-Impaired (2023)</span>
                <span className="font-semibold text-midnight-navy">
                  {fmtNum(OTS.alcoholImpairedFatalities)} (33% of total)
                </span>
              </div>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3 mb-2">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">
                  Audience:
                </span>{" "}
                Los Angeles metro dominates with 4,800+ FARS deaths. Inland Empire
                (San Bernardino + Riverside combined: 4,200+ deaths) is the #2
                market. Target ages 25-44, heavy Spanish-language in LA (45%
                Hispanic), Inland Empire (53% Hispanic), and Central Valley (55%+
                Hispanic). WFH at 15.5% statewide reduces commute exposure but
                freeway corridors remain high-fatality zones.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                CTV/digital across LA, SF Bay Area, San Diego, Sacramento metros.
                Spanish-language campaigns critical across Southern CA and Central
                Valley. Radio in Inland Empire and Central Valley commute corridors.
                Digital geo-targeting on I-5, I-10, I-15, US-101 corridors.
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
                  Truck-Involved Fatal Crashes
                </span>
                <span className="font-semibold text-midnight-navy">
                  {fmtNum(totalTruckDeaths)} ({totalFatalCrashes > 0 ? ((totalTruckDeaths / totalFatalCrashes) * 100).toFixed(0) : 0}%)
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Top Counties</span>
                <span className="font-medium text-midnight-navy text-right">
                  {top5Truck.map((r) => r.county).join(", ")}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Trucking Workers</span>
                <span className="font-medium text-midnight-navy">
                  {fmtNum(BLS.truckingWorkers)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Avg Trucking Pay</span>
                <span className="font-medium text-midnight-navy">
                  {fmtCur(BLS.truckingAvgPay)}
                </span>
              </div>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3 mb-2">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">
                  Audience:
                </span>{" "}
                Target trucking corridors: I-5 Central Valley, I-10 east of LA,
                I-15 to Nevada, and the ports of LA/Long Beach which generate
                massive commercial vehicle traffic. Kern and San Joaquin counties
                have disproportionately high truck crash rates relative to
                population.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Digital geo-fencing along freight corridors. Trucker-specific
                platforms and rest stops along I-5 and CA-99. Radio on Central
                Valley routes. Bilingual campaigns for Hispanic trucking workforce.
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
                  OTS 2023 Motorcycle Fatalities
                </span>
                <span className="font-semibold text-midnight-navy">
                  {OTS.motorcycleFatalities}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Registered Motorcycles</span>
                <span className="font-medium text-midnight-navy">
                  {fmtNum(OTS.registeredMotorcycles)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Helmet Use (Fatal)</span>
                <span className="font-medium text-midnight-navy">
                  {OTS.helmetUse}%
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Top Counties</span>
                <span className="font-medium text-midnight-navy text-right">
                  {top5Moto.map((r) => r.county).join(", ")}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Lane Splitting</span>
                <span className="font-bold text-emerald-600">
                  Legal (only state)
                </span>
              </div>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3 mb-2">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">
                  Audience:
                </span>{" "}
                California has more registered motorcycles than any other state.
                Lane-splitting legality creates unique liability dynamics. Target
                riders 25-54 in Southern CA and Bay Area. LA County alone has 715
                motorcycle fatal crashes in the FARS dataset.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Digital targeting on motorcycle enthusiast platforms. CTV in LA,
                San Diego, Bay Area. Events and rally sponsorships. Lane-splitting
                awareness campaigns create natural entry points.
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
                <span className="text-slate-gray">Construction Workers</span>
                <span className="font-semibold text-midnight-navy">
                  {fmtNum(BLS.constructionWorkers)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">
                  Construction Fatalities (2024)
                </span>
                <span className="font-semibold text-midnight-navy">
                  {BLS.constructionFatalities2024}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Falls (Top Cause)</span>
                <span className="font-semibold text-midnight-navy">
                  {BLS.constructionFallDeaths} (53%)
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Fatality Rate</span>
                <span className="font-semibold text-midnight-navy">
                  {BLS.workplaceFatalityRate}/100K FTE
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Hispanic Worker Share</span>
                <span className="font-medium text-midnight-navy">
                  {BLS.hispanicWorkplaceFatalityShare}% of fatalities
                </span>
              </div>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3 mb-2">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">
                  Audience:
                </span>{" "}
                California&apos;s 911K construction workers represent the largest
                state construction workforce. Hispanic workers are
                disproportionately affected (51% of fatalities). Target construction
                zones in high-growth areas: Inland Empire, Sacramento, Bay Area
                suburbs, and Central Valley.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Spanish-language digital and radio in construction-heavy metros.
                Geo-targeted mobile ads near major construction sites and
                developments. Unions and trade organizations as distribution
                channels.
              </p>
            </div>
          </div>

          {/* Pedestrian/Bicycle Card (REPLACING BOATING) */}
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Footprints className="w-5 h-5 text-intelligence-teal" />
              <h3 className="text-sm font-bold text-midnight-navy">
                Pedestrian &amp; Bicycle Accidents
              </h3>
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Pedestrian Fatalities (2023)</span>
                <span className="font-semibold text-midnight-navy">
                  {fmtNum(OTS.pedestrianFatalities)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Bicycle Fatalities (2023)</span>
                <span className="font-semibold text-midnight-navy">
                  {fmtNum(OTS.bicycleFatalities)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Combined (% of Traffic Deaths)</span>
                <span className="font-bold text-red-600">
                  {fmtNum(OTS.pedestrianFatalities + OTS.bicycleFatalities)} (31%)
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Hit-and-Run Fatal Crashes</span>
                <span className="font-semibold text-midnight-navy">
                  {fmtNum(OTS.hitAndRunFatalCrashes)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">SF Transit Commute</span>
                <span className="font-medium text-midnight-navy">
                  21.4% transit, 10% walking
                </span>
              </div>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3 mb-2">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">
                  Audience:
                </span>{" "}
                California&apos;s pedestrian/bicycle fatality share (31%) is one of
                the highest nationally. Los Angeles, San Francisco, and San Diego
                are the primary markets. Hit-and-run crashes are a unique California
                issue with 447 fatal hit-and-runs in 2021. Target urban cores with
                high walking/transit commute rates.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Digital geo-targeting in downtown LA, SF, San Diego, Oakland.
                Transit-adjacent OOH advertising. Community safety organization
                partnerships. Bicycle advocacy group channels.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. ACCIDENT DATA BY COUNTY (Interactive Table)               */}
      {/* ============================================================ */}
      <div className="rounded-lg bg-white p-6 shadow-sm border">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-2xl font-bold text-midnight-navy">
            Accident Data by County
          </h2>
        </div>
        <p className="mb-4 text-sm text-slate-gray">
          58 California counties &mdash; sortable by any column. Click headers to
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
                      className="py-3 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-gray cursor-pointer hover:text-midnight-navy select-none whitespace-nowrap"
                    >
                      {col.label}
                      <SortIcon col={col.key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAccidentData.map((row, i) => {
                  const isTop10 =
                    row.deaths_per_100k != null &&
                    data.accidentSummary
                      .filter((r) => r.deaths_per_100k != null)
                      .sort(
                        (a, b) =>
                          (b.deaths_per_100k ?? 0) - (a.deaths_per_100k ?? 0)
                      )
                      .slice(0, 10)
                      .some((r) => r.county === row.county);
                  const isBottom10 =
                    row.deaths_per_100k != null &&
                    data.accidentSummary
                      .filter((r) => r.deaths_per_100k != null)
                      .sort(
                        (a, b) =>
                          (a.deaths_per_100k ?? 0) - (b.deaths_per_100k ?? 0)
                      )
                      .slice(0, 10)
                      .some((r) => r.county === row.county);

                  return (
                    <tr
                      key={row.county}
                      className={`border-b border-cloud/50 transition-colors ${
                        isTop10
                          ? "bg-red-50/50"
                          : isBottom10
                          ? "bg-emerald-50/50"
                          : i % 2 === 0
                          ? "bg-white"
                          : "bg-cloud/20"
                      }`}
                    >
                      <td className="py-2.5 px-2 font-medium text-midnight-navy whitespace-nowrap">
                        {row.county}
                      </td>
                      <td className="py-2.5 px-2 text-right text-midnight-navy/80">
                        {fmtNum(row.total_population)}
                      </td>
                      <td className="py-2.5 px-2 text-right text-midnight-navy/80">
                        {fmtNum(row.fatal_crashes)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-semibold text-midnight-navy">
                        {fmtNum(row.total_deaths)}
                      </td>
                      <td className="py-2.5 px-2 text-right text-midnight-navy/80">
                        {fmtNum(row.truck_deaths)}
                      </td>
                      <td className="py-2.5 px-2 text-right text-midnight-navy/80">
                        {fmtNum(row.moto_deaths)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-midnight-navy">
                        {row.deaths_per_100k != null
                          ? row.deaths_per_100k.toFixed(1)
                          : "\u2014"}
                      </td>
                      <td className="py-2.5 px-2 text-right text-midnight-navy/80">
                        {row.rural_pct != null
                          ? `${row.rural_pct.toFixed(1)}%`
                          : "\u2014"}
                      </td>
                      <td className="py-2.5 px-2">
                        {row.judicial_profile ? (
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${getProfileColor(
                              row.judicial_profile
                            )}`}
                          >
                            {row.judicial_profile}
                          </span>
                        ) : (
                          <span className="text-slate-gray">&mdash;</span>
                        )}
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
              Accident summary data loading...
            </p>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-slate-gray">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-red-100 border border-red-300" />{" "}
            Top 10 most dangerous
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-100 border border-emerald-300" />{" "}
            Bottom 10 safest
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 6. RURAL VS URBAN ANALYSIS                                   */}
      {/* ============================================================ */}
      <div className="rounded-lg bg-white p-6 shadow-sm border">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-2xl font-bold text-midnight-navy">
            Rural vs. Urban Analysis
          </h2>
        </div>

        {ruralRow && urbanRow ? (
          <>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cloud">
                    <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-gray">
                      Metric
                    </th>
                    <th className="py-3 px-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
                      Rural
                    </th>
                    <th className="py-3 pl-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
                      Urban
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-cloud/50">
                    <td className="py-3 pr-4 text-midnight-navy">
                      Fatal Crashes
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-midnight-navy">
                      {fmtNum(ruralRow.fatal_crashes)}
                    </td>
                    <td className="py-3 pl-3 text-right font-semibold text-midnight-navy">
                      {fmtNum(urbanRow.fatal_crashes)}
                    </td>
                  </tr>
                  <tr className="border-b border-cloud/50">
                    <td className="py-3 pr-4 text-midnight-navy">
                      Total Deaths
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-midnight-navy">
                      {fmtNum(ruralRow.total_deaths)}
                    </td>
                    <td className="py-3 pl-3 text-right font-semibold text-midnight-navy">
                      {fmtNum(urbanRow.total_deaths)}
                    </td>
                  </tr>
                  <tr className="border-b border-cloud/50">
                    <td className="py-3 pr-4 text-midnight-navy">
                      Avg Median Income
                    </td>
                    <td className="py-3 px-3 text-right text-midnight-navy">
                      {fmtCur(ruralRow.avg_median_income)}
                    </td>
                    <td className="py-3 pl-3 text-right text-midnight-navy">
                      {fmtCur(urbanRow.avg_median_income)}
                    </td>
                  </tr>
                  <tr className="border-b border-cloud/50">
                    <td className="py-3 pr-4 text-midnight-navy">
                      Avg Poverty Rate
                    </td>
                    <td className="py-3 px-3 text-right text-midnight-navy">
                      {fmtPct(ruralRow.avg_poverty_pct)}
                    </td>
                    <td className="py-3 pl-3 text-right text-midnight-navy">
                      {fmtPct(urbanRow.avg_poverty_pct)}
                    </td>
                  </tr>
                  <tr className="border-b border-cloud/50">
                    <td className="py-3 pr-4 text-midnight-navy">
                      Avg Internet Access
                    </td>
                    <td className="py-3 px-3 text-right text-midnight-navy">
                      {fmtPct(ruralRow.avg_internet_pct)}
                    </td>
                    <td className="py-3 pl-3 text-right text-midnight-navy">
                      {fmtPct(urbanRow.avg_internet_pct)}
                    </td>
                  </tr>
                  <tr className="border-b border-cloud/50">
                    <td className="py-3 pr-4 text-midnight-navy">
                      Avg Uninsured Rate
                    </td>
                    <td className="py-3 px-3 text-right text-midnight-navy">
                      {fmtPct(ruralRow.avg_uninsured_pct)}
                    </td>
                    <td className="py-3 pl-3 text-right text-midnight-navy">
                      {fmtPct(urbanRow.avg_uninsured_pct)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-3">
              <div className="rounded-md border-l-4 border-intelligence-teal bg-intelligence-teal/5 px-4 py-3">
                <p className="text-sm text-midnight-navy/80">
                  California&apos;s FARS data classifies 73% of fatal crashes on
                  rural-class roads. Note that FARS rur_urb classifies road
                  functional type, not geographic location &mdash; many
                  &quot;rural&quot; crashes happen in suburban areas along
                  high-speed arterials. This distinction matters for advertising
                  strategy: target the road corridors, not just rural communities.
                </p>
              </div>

              <div className="rounded-md border-l-4 border-intelligence-teal bg-intelligence-teal/5 px-4 py-3">
                <p className="text-sm text-midnight-navy/80">
                  California&apos;s massive income disparity &mdash; Bay Area
                  ($136-162K median HH income) vs Central Valley ($70-74K) &mdash;
                  creates very different advertising and case economics. High-income
                  areas support digital-first strategies, while Central Valley
                  markets need radio and Spanish-language media.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
            <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
            <p className="text-sm font-medium text-midnight-navy/60">
              Rural/urban comparison data loading...
            </p>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 7. MARKET DEMOGRAPHICS BY METRO                              */}
      {/* ============================================================ */}
      <div className="rounded-lg bg-white p-6 shadow-sm border">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-2xl font-bold text-midnight-navy">
            Market Demographics by Metro
          </h2>
        </div>
        <p className="mb-4 text-sm text-slate-gray">
          California&apos;s {data.msaDemographics.length} Metropolitan Statistical
          Areas
        </p>

        {data.msaDemographics.length > 0 ? (
          <>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-cloud">
                    <th className="py-3 pr-4 text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
                      MSA Name
                    </th>
                    <th
                      className="py-3 px-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-gray cursor-pointer hover:text-midnight-navy"
                      onClick={() => {
                        if (msaSortKey === "pop") setMsaSortAsc(!msaSortAsc);
                        else {
                          setMsaSortKey("pop");
                          setMsaSortAsc(false);
                        }
                      }}
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
                      className="py-3 px-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-gray cursor-pointer hover:text-midnight-navy"
                      onClick={() => {
                        if (msaSortKey === "income")
                          setMsaSortAsc(!msaSortAsc);
                        else {
                          setMsaSortKey("income");
                          setMsaSortAsc(false);
                        }
                      }}
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
                      className="py-3 px-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-gray cursor-pointer hover:text-midnight-navy"
                      onClick={() => {
                        if (msaSortKey === "poverty")
                          setMsaSortAsc(!msaSortAsc);
                        else {
                          setMsaSortKey("poverty");
                          setMsaSortAsc(false);
                        }
                      }}
                    >
                      Poverty %
                      {msaSortKey === "poverty" &&
                        (msaSortAsc ? (
                          <ChevronUp className="w-3 h-3 inline ml-0.5" />
                        ) : (
                          <ChevronDown className="w-3 h-3 inline ml-0.5" />
                        ))}
                    </th>
                    <th className="py-3 px-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
                      Uninsured %
                    </th>
                    <th className="py-3 pl-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
                      Employment %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMSA.map((row) => {
                    const isMajor = MAJOR_METROS.some((m) =>
                      row.cbsa_title.startsWith(m)
                    );
                    return (
                      <tr
                        key={row.cbsa_code}
                        className={`border-b border-cloud/50 transition-colors ${
                          isMajor ? "bg-intelligence-teal/5" : ""
                        }`}
                      >
                        <td className="py-2.5 pr-4 font-medium text-midnight-navy whitespace-nowrap">
                          {row.cbsa_title}
                          {isMajor && (
                            <span className="ml-1.5 rounded-full bg-intelligence-teal/10 px-1.5 py-0.5 text-[9px] font-bold text-intelligence-teal">
                              Major
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-right text-midnight-navy/80">
                          {fmtNum(row.total_population)}
                        </td>
                        <td className="py-2.5 px-2 text-right text-midnight-navy/80">
                          {fmtCur(row.median_household_income)}
                        </td>
                        <td className="py-2.5 px-2 text-right text-midnight-navy/80">
                          {fmtPct(row.pct_poverty)}
                        </td>
                        <td className="py-2.5 px-2 text-right text-midnight-navy/80">
                          {fmtPct(row.pct_uninsured)}
                        </td>
                        <td className="py-2.5 pl-2 text-right text-midnight-navy/80">
                          {fmtPct(row.pct_employed)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="rounded-md border-l-4 border-intelligence-teal bg-intelligence-teal/5 px-4 py-3">
              <p className="text-sm text-midnight-navy/80">
                California&apos;s top metros span massive income and demographic
                ranges. LA metro (13M, 44.9% Hispanic) and Inland Empire (4.7M,
                53% Hispanic) require Spanish-language advertising as a primary
                channel. Bay Area metros (SF $137K, San Jose $163K median income)
                support premium digital-first strategies. Central Valley metros
                (Fresno $75K, Bakersfield $70K) are majority-Hispanic with higher
                uninsured rates.
              </p>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
            <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
            <p className="text-sm font-medium text-midnight-navy/60">
              MSA demographics data loading...
            </p>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 8. JUDICIAL PROFILES BY COUNTY                               */}
      {/* ============================================================ */}
      <div className="rounded-lg bg-white p-6 shadow-sm border">
        <div className="flex items-center gap-2 mb-2">
          <Scale className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-2xl font-bold text-midnight-navy">
            Judicial Profiles by County
          </h2>
        </div>
        <p className="mb-4 text-sm text-slate-gray">
          Judicial leanings for California&apos;s 58 counties
        </p>

        {data.judicialProfiles.length > 0 ? (
          <>
            <div className="mb-4 flex flex-wrap gap-3">
              {Object.entries(profileCounts)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([profile, count]) => (
                  <span
                    key={profile}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${getProfileColor(
                      profile
                    )}`}
                  >
                    {count} {profile}
                  </span>
                ))}
            </div>

            <div className="overflow-x-auto mb-4">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-cloud">
                    <th className="py-3 pr-4 text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
                      County
                    </th>
                    <th className="py-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
                      Judicial Profile
                    </th>
                    <th className="py-3 px-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
                      Population
                    </th>
                    <th className="py-3 pl-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
                      Fatality Rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {judicialWithFatalities
                    .sort((a, b) => a.county.localeCompare(b.county))
                    .map((row) => (
                      <tr
                        key={row.county}
                        className={`border-b border-cloud/50 border-l-4 ${getProfileBorderColor(
                          row.profile
                        )}`}
                      >
                        <td className="py-2.5 pr-4 pl-2 font-medium text-midnight-navy whitespace-nowrap">
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

            <div className="rounded-md border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3">
              <p className="text-sm text-midnight-navy/80">
                Los Angeles, Alameda, and San Francisco counties carry
                &quot;Liberal&quot; judicial profiles &mdash; where plaintiffs tend
                to see the highest verdicts. These three counties alone represent
                ~46% of California&apos;s population and a disproportionate share
                of PI filings. Combined with pure comparative negligence and no
                damage caps, these are premium advertising markets.
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
      {/* 9. PI VIABILITY DEEP DIVE                                    */}
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

            <div className="rounded-md border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3">
              <p className="text-sm text-midnight-navy/80">
                California scores 100 on 5 of 6 PI viability sub-scores. Pure
                comparative negligence allows recovery at any fault level, there are
                no caps on non-economic, punitive, or med-mal damages for PI cases,
                and jury verdicts regularly exceed $1M. The only moderate factor is
                the 2-year statute of limitations (score: 50), which means
                speed-to-intake matters &mdash; firms should prioritize rapid case
                acquisition within the first 12 months post-incident.
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
      {/* 10. SEARCH ADVERTISING LANDSCAPE                             */}
      {/* ============================================================ */}
      <PIAdvertisingSection stateAbbr="CA" onDataLoaded={handlePIAdDataLoaded} />

      {/* ============================================================ */}
      {/* 11. COMPETITIVE LANDSCAPE                                    */}
      {/* ============================================================ */}
      <CompetitiveLandscapeTable data={californiaCompetitiveData} />

      {/* ============================================================ */}
      {/* 12. CROSS-SIGNAL INSIGHT CARDS                               */}
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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {/* Insight 1: Cancer Incidence */}
          <div className="rounded-lg border border-intelligence-teal/30 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <HeartPulse className="w-4 h-4 text-intelligence-teal" />
              <h3 className="text-sm font-bold text-midnight-navy">
                Cancer Incidence: Mass Tort Opportunity
              </h3>
            </div>
            <div className="space-y-1.5 mb-3">
              <p className="text-xs text-midnight-navy/70">
                Annual cancer diagnoses: <strong>182,000+</strong>
              </p>
              <p className="text-xs text-midnight-navy/70">
                All sites rate: <strong>404.5/100K</strong>
              </p>
              <p className="text-xs text-midnight-navy/70">
                Prostate cancer: <strong>121.2/100K</strong> (28,874 annual cases)
              </p>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                California&apos;s 182,000+ annual cancer diagnoses create massive
                demand for legal representation in environmental exposure, product
                liability (talc, Roundup, AFFF), and pharmaceutical litigation.
                Cross-reference counties near military bases (San Diego, Sacramento,
                Riverside) for targeted Camp Lejeune and AFFF campaigns.
              </p>
            </div>
          </div>

          {/* Insight 2: Judicial Paradox */}
          <div className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Scale className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-midnight-navy">
                Judicial Paradox: 3 Counties, 46% of Population
              </h3>
            </div>
            <div className="space-y-1.5 mb-3">
              <p className="text-xs text-midnight-navy/70">
                Liberal counties: <strong>3 of 58</strong> (LA, Alameda, SF)
              </p>
              <p className="text-xs text-midnight-navy/70">
                Population share: <strong>~46%</strong> of state
              </p>
              <p className="text-xs text-midnight-navy/70">
                Conservative counties: <strong>29</strong>, Moderate: <strong>26</strong>
              </p>
            </div>
            <div className="rounded-md bg-emerald-50 border border-emerald-100 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                Despite California&apos;s reputation, only 3 of 58 counties have
                &quot;Liberal&quot; judicial profiles. But those 3 contain ~18M+
                people. Even conservative California counties produce higher
                verdicts than plaintiff-friendly counties in contributory negligence
                states. The state legal framework (pure comparative, no caps) is the
                dominant factor.
              </p>
            </div>
          </div>

          {/* Insight 3: PI Viability Leadership */}
          <div className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-midnight-navy">
                PI Viability: Highest Score Tracked
              </h3>
            </div>
            <div className="space-y-1.5 mb-3">
              <p className="text-xs text-midnight-navy/70">
                Composite score: <strong>94.4</strong> (highest we track)
              </p>
              <p className="text-xs text-midnight-navy/70">
                Perfect 100 on <strong>5 of 6</strong> sub-scores
              </p>
              <p className="text-xs text-midnight-navy/70">
                Only constraint: <strong>2-year SOL</strong> (score 50)
              </p>
            </div>
            <div className="rounded-md bg-emerald-50 border border-emerald-100 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                California&apos;s PI viability score of 94.4 is the highest we
                track. The only constraint is the 2-year SOL, which means
                speed-to-intake matters. Firms should prioritize rapid case
                acquisition within the first 12 months post-incident to allow time
                for investigation and filing.
              </p>
            </div>
          </div>

          {/* Insight 4: Pedestrian/Bicycle Crisis */}
          <div className="rounded-lg border border-red-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Footprints className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-bold text-midnight-navy">
                Pedestrian/Bicycle Crisis: 31% of Deaths
              </h3>
            </div>
            <div className="space-y-1.5 mb-3">
              <p className="text-xs text-midnight-navy/70">
                Combined fatalities: <strong>{fmtNum(OTS.pedestrianFatalities + OTS.bicycleFatalities)}</strong> (2023)
              </p>
              <p className="text-xs text-midnight-navy/70">
                Hit-and-run fatal crashes: <strong>{fmtNum(OTS.hitAndRunFatalCrashes)}</strong> (2021)
              </p>
              <p className="text-xs text-midnight-navy/70">
                SF walking commute: <strong>10%</strong>, transit: <strong>21.4%</strong>
              </p>
            </div>
            <div className="rounded-md bg-red-50 border border-red-100 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                California&apos;s pedestrian/bicycle fatality share (31%) is among
                the highest nationally, driven by density, year-round walking/biking
                climate, and transit use. Hit-and-run is a uniquely California
                problem with 447 fatal incidents. Target urban cores in LA, SF, San
                Diego, and Oakland for ped/bike PI campaigns.
              </p>
            </div>
          </div>

          {/* Insight 5: Hispanic Demographics */}
          <div className="rounded-lg border border-intelligence-teal/30 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-intelligence-teal" />
              <h3 className="text-sm font-bold text-midnight-navy">
                Hispanic Demographics: Spanish-Language Imperative
              </h3>
            </div>
            <div className="space-y-1.5 mb-3">
              <p className="text-xs text-midnight-navy/70">
                LA metro: <strong>44.9%</strong> Hispanic (13M pop)
              </p>
              <p className="text-xs text-midnight-navy/70">
                Inland Empire: <strong>53.1%</strong> Hispanic (4.7M pop)
              </p>
              <p className="text-xs text-midnight-navy/70">
                Central Valley: <strong>55-56%</strong> Hispanic (Fresno, Bakersfield)
              </p>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                Spanish-language advertising is not optional in California &mdash;
                it&apos;s the primary channel in many markets. The Inland Empire and
                Central Valley are majority-Hispanic with younger median ages (32-36).
                Hispanic workers also represent 51% of workplace fatalities,
                creating a direct connection between demographic targeting and PI
                case acquisition.
              </p>
            </div>
          </div>

          {/* Insight 6: Lane-Splitting */}
          <div className="rounded-lg border border-amber-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Bike className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-midnight-navy">
                Lane-Splitting: Only-in-California Liability
              </h3>
            </div>
            <div className="space-y-1.5 mb-3">
              <p className="text-xs text-midnight-navy/70">
                Motorcycle FARS deaths: <strong>{fmtNum(totalMotoDeaths)}</strong> (14.9% of fatal crashes)
              </p>
              <p className="text-xs text-midnight-navy/70">
                Registered motorcycles: <strong>{fmtNum(OTS.registeredMotorcycles)}</strong> (highest in nation)
              </p>
              <p className="text-xs text-midnight-navy/70">
                Lane-splitting: <strong>Legal since 2017</strong> (only state)
              </p>
            </div>
            <div className="rounded-md bg-amber-50 border border-amber-100 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                California is the only state where lane-splitting is legal, creating
                unique liability dynamics for motorcycle PI cases. With 848K+
                registered motorcycles (highest nationally) and a fatality rate of
                66.6 per 100K registrations, motorcycle PI is a high-volume practice
                area. Lane-splitting awareness campaigns create natural entry points
                for case acquisition.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ASK AI PANEL                                                 */}
      {/* ============================================================ */}
      <AskAIPanel
        pageContext={{
          pageName: "California State Intelligence",
          pageDescription:
            "State-level intelligence for plaintiff firm advertising and case acquisition in California — combining FARS accident data, census demographics, judicial profiles, PI viability scores, storm events, cancer incidence, and market opportunity signals across MVA, trucking, motorcycle, construction, and pedestrian/bicycle cases.",
          dataSummary: `State: California. Negligence: ${formatNegligenceRule(piData?.negligence_rule ?? 'pure_comparative')}. PI Viability: ${piData?.composite_score ?? 'N/A'} composite (highest tracked). Fatal Crashes (FARS): ${totalFatalCrashes.toLocaleString()}. Total Deaths: ${totalDeaths.toLocaleString()}. Counties: 58. Top counties by deaths: ${[...data.accidentSummary].sort((a, b) => b.total_deaths - a.total_deaths).slice(0, 5).map(r => `${r.county} (${r.total_deaths.toLocaleString()})`).join(', ')}. Judicial profile mix: ${Object.entries(profileCounts).map(([p, c]) => `${c} ${p}`).join(', ')}. Storm events: ${data.stormCount.toLocaleString()}. Truck deaths: ${totalTruckDeaths.toLocaleString()}. Motorcycle deaths: ${totalMotoDeaths.toLocaleString()}. Drunk-driver crashes: ${totalDrunkDriverCrashes.toLocaleString()}. Pedestrian fatalities (2023): ${OTS.pedestrianFatalities.toLocaleString()}. Bicycle fatalities (2023): ${OTS.bicycleFatalities.toLocaleString()}. Construction workers: ${BLS.constructionWorkers.toLocaleString()}. Key corridors: I-5, I-10, I-15, US-101, CA-99.${piAdData ? ` ${buildPIAdSummary(piAdData)}` : ''}`,
        }}
      />

      {/* ============================================================ */}
      {/* 12. SOURCES & METHODOLOGY                                    */}
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
            "California OTS Quick Stats (SWITRS/FARS) 2023",
            "ACS 5-Year Estimates 2023 (Census Bureau)",
            "MSA Demographics \u2014 ACS metro area profiles",
            "BLS QCEW (Quarterly Census of Employment and Wages) 2023",
            "BLS CFOI (Census of Fatal Occupational Injuries) 2023\u20132024",
            "NOAA Storm Events Database",
            "CDC/USCS Cancer Incidence Data",
            "Court records / Judicial profile data",
            "California DMV \u2014 Motorcycle registration data",
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
          Data sources: FARS (NHTSA), California OTS 2023, ACS 5-Year Estimates,
          BLS QCEW/CFOI, NOAA Storm Events, CDC/USCS Cancer Incidence, Judicial
          Profile Data, California DMV.
        </p>
      </div>
    </div>
  );
}
