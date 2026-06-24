"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { BuildCampaignLink } from "../../components/build-campaign-link";
import {
  ArrowLeft,
  AlertTriangle,
  Scale,
  Car,
  Truck,
  Bike,
  HardHat,
  Anchor,
  FileText,
  MapPin,
  Lightbulb,
  CloudLightning,
  Database,
  Target,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { JudicialProfileRow } from "@/lib/queries/judicial";
import type { FARSYearlyTrendRow, FARSTopCountyRow } from "./page";
import { AskAIPanel } from "../../components/ask-ai-panel";
import { trackStateViewed } from "@/lib/analytics";
import { CompetitiveAnalysis } from "../../components/competitive/competitive-analysis-section";
import { gaInjuryData } from "@/lib/data/ga-injury-stats";
import type { InjuryRow } from "@/components/state-intelligence/StateInjuryTable";
import { StateInjuryTable } from "@/components/state-intelligence/StateInjuryTable";
import {
  CountyIntelligenceMap,
  FARS_DATA_YEARS,
  BOATING_DATA_YEARS,
} from "../../components/county-intelligence-map";
import {
  COUNTY_GEOMETRY as GA_COUNTY_GEOMETRY,
  VIEWBOX as GA_VIEWBOX,
} from "@/lib/data/state-geometry/georgia";

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
  pct_asian: number | null;
  pct_native: number | null;
  median_household_income: number | null;
  per_capita_income: number | null;
  pct_poverty: number | null;
  pct_uninsured: number | null;
  pct_employed: number | null;
  pct_with_internet: number | null;
  pct_disability: number | null;
  pct_veterans: number | null;
  mean_commute_minutes: number | null;
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

export interface GeorgiaPageData {
  accidentSummary: AccidentSummaryRow[];
  ruralUrban: RuralUrbanRow[];
  stormSummary: StormSummaryRow[];
  boatingSummary: BoatingSummaryRow[];
  piViability: PIViabilityRow | null;
  censusDemographics: CensusDemographicsRow[];
  msaDemographics: MSADemographicsRow[];
  judicialProfiles: JudicialProfileRow[];
  stormCount: number;
  farsYearlyTrend: FARSYearlyTrendRow[];
  farsTopCounties: FARSTopCountyRow[];
}

/* ------------------------------------------------------------------ */
/*  Hardcoded Constants (GOHS, BLS, ACS)                               */
/*  Stats verified against primary sources — see Sources & Methodology */
/* ------------------------------------------------------------------ */

const GOHS = {
  totalCrashes: 373_135, // 2023 GOHS Overview of Motor Vehicle Crashes, p. 5
  totalFatalities: 1_615, // 2023 GOHS Overview of Motor Vehicle Crashes, p. 1/8
  motorcycleFatalities: 196, // 2023 GOHS Overview of Motor Vehicle Crashes, p. 7/8
  speedRelatedFatalities: 349, // 2023 GOHS Overview of Motor Vehicle Crashes, p. 8
  speedRelatedPct: 21.6, // Derived: 349 ÷ 1,615 (both from GOHS 2023 Overview, p. 8)
  alcoholRelatedFatalities: 433, // 2023 GOHS Overview of Motor Vehicle Crashes, p. 8
  alcoholRelatedPct: 27, // 2023 GOHS Overview of Motor Vehicle Crashes, p. 7 (stated directly)
  unrestrainedFatalities: 464, // 2023 GOHS Overview of Motor Vehicle Crashes, p. 8
  distractedDrivingFatalCrashes: 41, // 2023 GOHS Distracted Driving Traffic Safety Facts
  ruralFatalShare: 34.6, // 2023 GOHS Overview, p. 8 (559 rural roadway fatalities ÷ 1,615 total)
};

const BLS_GA = {
  totalEmployment: 4_802_800, // 2023 Q2 BLS QCEW covered employment
  totalWorkplaceFatalities: 192, // 2023 BLS CFOI Georgia state table
  constructionFatalities: 37, // 2023 BLS CFOI Georgia state table (NAICS 23)
  constructionPctTotal: 19.3, // Derived: 37 ÷ 192 (both from BLS CFOI 2023)
  transportWarehouseFatalities: 36, // 2023 BLS CFOI Georgia state table (NAICS 48-49)
  truckTransportFatalities: 26, // BLS Fatal Work Injuries in Georgia — 2024 news release, Table 2
  fallsSlipsTrips: 35, // 2023 BLS CFOI Georgia state table
  transportationIncidents: 69, // 2023 BLS CFOI Georgia state table
};

const COMMUTE_GA = {
  driveAlone: 72.3, // ACS 5-Year 2019–2023, Table S0801
  nationalAvg: 68.7,
  avgCommuteMinutes: 28.3, // ACS 5-Year 2019–2023, Table S0801
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

function fmtCur(n: number | null | undefined): string {
  if (n == null) return "\u2014";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function GeorgiaClient({ data }: { data: GeorgiaPageData }) {
  const [crashTab, setCrashTab] = useState(0);

  useEffect(() => {
    trackStateViewed({ state_code: "GA", state_name: "Georgia" });
  }, []);

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

  /* -- Judicial profile counts -- */
  const profileCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const j of data.judicialProfiles) {
      const p = j.judicial_profile || "Unknown";
      counts[p] = (counts[p] || 0) + 1;
    }
    return counts;
  }, [data.judicialProfiles]);

  /* -- PI viability data -- */
  const piData = data.piViability;

  /* -- GA injury data mapped to InjuryRow shape for StateInjuryTable -- */
  const gaInjuryRows: InjuryRow[] = useMemo(
    () =>
      gaInjuryData
        .filter((r) => r.county !== "None")
        .map((r) => ({
          county: r.county,
          year: r.year,
          fatal: r.fatalities,
          seriousInjury: r.seriousInjuries,
          minorInjury: r.visibleInjuries,
          possibleInjury: 0,
          noInjury: 0,
          unknown: 0,
          total: r.totalCrashes,
        })),
    []
  );

  /* -- Major GA metros -- */
  const MAJOR_METROS = ["Atlanta", "Augusta", "Savannah", "Columbus", "Macon"];

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
            Georgia
          </h1>
          <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-600">
            Modified Comparative (50% Bar)
          </span>
        </div>
        <p className="mt-1 text-lg text-slate-gray">
          State Intelligence Report
        </p>
        <p className="mt-1 text-sm text-slate-gray max-w-3xl">
          Cross-signal intelligence for plaintiff firm advertising and case
          acquisition in Georgia &mdash; combining accident data, demographics,
          judicial profiles, GDOT crash dashboards, and market opportunity
          signals across MVA, trucking, motorcycle, construction, and boating.
          Major metros: Atlanta, Augusta, Savannah, Columbus, and Macon.
          Population ~10.9M.
        </p>
        <div className="mt-4">
          <BuildCampaignLink
            variant={{ kind: "personal_injury", stateCode: "GA", stateName: "Georgia" }}
          />
        </div>
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
            {fmtNum(GOHS.totalFatalities)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-gray">
            GOHS 2023
          </p>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm border">
          <div className="flex items-center gap-1.5 mb-2">
            <MapPin className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Rural Fatal Share
            </p>
          </div>
          <p className="text-3xl font-bold text-midnight-navy">{GOHS.ruralFatalShare}%</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">
            of GOHS fatalities
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
            Modified comparative (50%)
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
            {fmtNum(BLS_GA.totalWorkplaceFatalities)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-gray">
            {BLS_GA.constructionFatalities}{" "}construction &middot; BLS CFOI 2023
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
      {/* 3. GEORGIA CRASH INTELLIGENCE (Native FARS Charts)           */}
      {/* ============================================================ */}
      <div className="rounded-lg border-2 border-intelligence-teal/30 bg-gradient-to-br from-intelligence-teal/[0.06] to-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-2xl font-bold text-midnight-navy">
            Georgia Crash Intelligence
          </h2>
        </div>
        <p className="mb-4 text-sm text-slate-gray max-w-3xl">
          Fatal crash trends and breakdowns from NHTSA FARS data, 2019&ndash;2024.
        </p>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {["Statewide Fatality Trend", "Top 10 Counties", "Fatalities by Crash Type"].map((label, i) => (
            <button
              key={label}
              onClick={() => setCrashTab(i)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                crashTab === i
                  ? "bg-intelligence-teal text-white shadow-sm"
                  : "bg-white text-midnight-navy/70 border border-cloud hover:bg-cloud/60"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab 1: Statewide Fatality Trend */}
        {crashTab === 0 && (
          <div>
            <p className="mb-3 text-xs text-midnight-navy/60">
              Annual fatal crashes and fatalities in Georgia, 2019&ndash;2024. Source: NHTSA FARS.
            </p>
            {data.farsYearlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={data.farsYearlyTrend} margin={{ top: 5, right: 30, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#1B2A4A" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#1B2A4A" }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="total_fatalities" name="Fatalities" stroke="#14B8A6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="fatal_crashes" name="Fatal Crashes" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
                <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
                <p className="text-sm font-medium text-midnight-navy/60">FARS trend data unavailable</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Top 10 Counties */}
        {crashTab === 1 && (
          <div>
            <p className="mb-3 text-xs text-midnight-navy/60">
              Top 10 Georgia counties by cumulative fatalities, 2020&ndash;2024. Source: NHTSA FARS.
            </p>
            {data.farsTopCounties.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.farsTopCounties} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#1B2A4A" }} />
                  <YAxis type="category" dataKey="county_name" width={120} tick={{ fontSize: 11, fill: "#1B2A4A" }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="fatalities" name="Fatalities" radius={[0, 4, 4, 0]}>
                    {data.farsTopCounties.map((_, index) => (
                      <Cell key={index} fill={index === 0 ? "#14B8A6" : index < 3 ? "#2DD4BF" : "#5EEAD4"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
                <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
                <p className="text-sm font-medium text-midnight-navy/60">County fatality data unavailable</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Fatalities by Crash Type */}
        {crashTab === 2 && (
          <div>
            <p className="mb-3 text-xs text-midnight-navy/60">
              Annual fatalities by crash type &mdash; motorcycle, large truck, and DUI-involved crashes, 2019&ndash;2024. Source: NHTSA FARS.
            </p>
            {data.farsYearlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={data.farsYearlyTrend} margin={{ top: 5, right: 30, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#1B2A4A" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#1B2A4A" }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="motorcycle_fatalities" name="Motorcycle" fill="#F59E0B" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="truck_fatalities" name="Large Truck" fill="#EF4444" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="dui_fatalities" name="DUI-Involved" fill="#8B5CF6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
                <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
                <p className="text-sm font-medium text-midnight-navy/60">Crash type data unavailable</p>
              </div>
            )}
          </div>
        )}

        {/* Source citation */}
        <p className="mt-4 text-[11px] text-slate-gray">
          Source:{" "}
          <a
            href="https://www.nhtsa.gov/research-data/fatality-analysis-reporting-system-fars"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-intelligence-teal"
          >
            NHTSA Fatality Analysis Reporting System (FARS)
          </a>
        </p>
      </div>

      {/* ============================================================ */}
      {/* 3b. COUNTIES RANKED BY SERIOUS INJURIES (GDOT)               */}
      {/* ============================================================ */}
      <StateInjuryTable
        stateName="Georgia"
        data={gaInjuryRows}
        years={[2020, 2021, 2022]}
        latestCompleteYear={2021}
        partialYearLabels={{ 2022: "(through Nov 2022)" }}
        sourceLabel="GDOT AASHTOWare Crash Data Portal"
        sourceUrl="https://gdot.aashtowaresafety.net/crash-data#/"
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
                Georgia follows modified comparative negligence with a 50%
                bar &mdash; plaintiffs who are 50% or more at fault are barred
                from recovery. Georgia has a 2-year statute of limitations for
                personal injury, which provides a reasonable window for case
                acquisition compared to shorter-SOL states. Georgia does not cap
                non-economic damages in most PI cases, though punitive damages
                are generally capped at $250,000 (O.C.G.A. &sect; 51-12-5.1)
                with exceptions for intentional torts and product liability.
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
                  {fmtNum(GOHS.speedRelatedFatalities)}{" "}({GOHS.speedRelatedPct}%)
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Alcohol-Related Fatalities (2023)</span>
                <span className="font-semibold text-midnight-navy">
                  {fmtNum(GOHS.alcoholRelatedFatalities)}{" "}({GOHS.alcoholRelatedPct}%)
                </span>
              </div>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3 mb-2">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">
                  Audience:
                </span>{" "}
                Atlanta metro (Fulton, DeKalb, Gwinnett, Cobb) dominates
                volume, with I-75, I-85, and the I-285 perimeter ranking
                among the highest-fatality corridors in the Southeast.
                Georgia recorded {fmtNum(GOHS.totalCrashes)}{" "}police-reported
                crashes and {fmtNum(GOHS.totalFatalities)}{" "}fatalities in 2023,
                with {GOHS.alcoholRelatedPct}% alcohol-related and {GOHS.speedRelatedPct}% speed-related.
                The 2-year statute of limitations (O.C.G.A. &sect; 9-3-33)
                provides a reasonable acquisition window. Savannah and Augusta
                are secondary markets with meaningful crash volume.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Digital + CTV in Atlanta metro, where {COMMUTE_GA.driveAlone}% of
                workers drive alone (ACS 2019&ndash;2023) with a {COMMUTE_GA.avgCommuteMinutes}-minute
                average commute. Billboard and radio along I-75
                (Atlanta&ndash;Macon&ndash;Valdosta), I-85 (Atlanta&ndash;Gainesville), I-95
                (Savannah coast corridor), and I-16 (Macon&ndash;Savannah).
                Geo-fenced mobile and streaming ads around the I-285 perimeter
                capture high-exposure commuter audiences.
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
                  {fmtNum(BLS_GA.truckTransportFatalities)}{" "}(BLS CFOI)
                </span>
              </div>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3 mb-2">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">
                  Audience:
                </span>{" "}
                Georgia is a major freight hub &mdash; the Port of Savannah is
                the 3rd busiest container port in the U.S. and generates heavy
                truck traffic along I-16 and I-95. BLS CFOI data show {fmtNum(BLS_GA.transportWarehouseFatalities)}{" "}transportation/warehousing
                workplace fatalities and {fmtNum(BLS_GA.truckTransportFatalities)}{" "}in
                truck transportation alone in 2023. Atlanta sits at the
                intersection of I-75, I-85, and I-20, creating one of the
                busiest freight corridors in the Southeast. FMCSA federal
                preemption considerations apply to interstate carrier claims.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Geo-fenced digital ads along I-75, I-85, I-16, and I-95
                corridors targeting passenger vehicle occupants involved in
                truck collisions. Truck stop billboards at major rest areas
                and weigh stations between Savannah and Atlanta. The Savannah
                DMA reaches into South Carolina, extending campaign coverage
                across state lines for multi-jurisdiction trucking claims.
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
                  GOHS 2023 Motorcycle Fatalities
                </span>
                <span className="font-semibold text-midnight-navy">
                  {fmtNum(GOHS.motorcycleFatalities)}
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
                GOHS reported {fmtNum(GOHS.motorcycleFatalities)}{" "}motorcycle
                fatalities in 2023, representing roughly 12% of all Georgia
                traffic deaths. North Georgia mountains (Blue Ridge, Dahlonega)
                and coastal routes draw motorcycle tourism. Fulton and Gwinnett
                counties lead in volume. Georgia requires helmets for all
                riders (O.C.G.A. &sect; 40-6-315), which affects severity
                distributions compared to states without universal helmet laws.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Seasonal spring/summer campaigns aligned with peak riding
                months (March&ndash;October). Social media and streaming ads
                targeting motorcycle-interest audiences. Digital geo-fencing
                near popular riding routes in the North Georgia mountains
                and along coastal GA-17. Atlanta metro digital for urban
                motorcycle commuters on surface streets and I-285.
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
                  {fmtNum(BLS_GA.constructionFatalities)}{" "}({BLS_GA.constructionPctTotal}% of all workplace deaths)
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">
                  Falls/Slips/Trips Fatalities
                </span>
                <span className="font-semibold text-midnight-navy">
                  {fmtNum(BLS_GA.fallsSlipsTrips)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Total Workplace Fatalities</span>
                <span className="font-medium text-midnight-navy">
                  {fmtNum(BLS_GA.totalWorkplaceFatalities)}{" "}(BLS CFOI 2023)
                </span>
              </div>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3 mb-2">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">
                  Audience:
                </span>{" "}
                BLS CFOI recorded {fmtNum(BLS_GA.constructionFatalities)}{" "}construction
                fatalities in Georgia in 2023 ({BLS_GA.constructionPctTotal}% of
                all {fmtNum(BLS_GA.totalWorkplaceFatalities)}{" "}workplace deaths),
                with falls/slips/trips accounting for {fmtNum(BLS_GA.fallsSlipsTrips)}{" "}fatalities
                statewide. Atlanta&apos;s construction boom, Savannah&apos;s port
                expansion, and Augusta&apos;s growth corridors sustain a large
                at-risk workforce. Third-party negligence claims may exist
                alongside workers&apos; compensation where a non-employer
                party contributed to the injury.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Job site proximity targeting via mobile geo-fencing in
                Atlanta, Savannah, and Augusta metro areas. Construction
                injury and workers&apos; comp keyword campaigns. Spanish-language
                digital and radio for the growing Hispanic workforce in metro
                Atlanta construction. Target both injured workers and family
                members searching on their behalf.
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
                Georgia has extensive lake and coastal recreation &mdash;
                Lake Lanier, Lake Oconee, Lake Hartwell, the Intracoastal
                Waterway, and barrier islands (Tybee, Jekyll, St. Simons).
                The county data above shows {fmtNum(totalBoatingAccidents)}{" "}boating
                accidents with {fmtNum(totalBoatingDeaths)}{" "}deaths
                and {fmtNum(totalBoatingInjuries)}{" "}injuries. Summer weekends
                drive peak accident volume. Target boating enthusiasts and
                coastal vacation demographics in the Savannah and
                Brunswick DMAs.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Seasonal spring/summer campaigns (May&ndash;September peak).
                Geo-targeted digital around Lake Lanier, Lake Oconee, and
                coastal communities. Local radio in lakeside and coastal
                counties. Marina signage, boat ramp postings, and outfitter
                partnerships reach boaters at the point of activity.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 6. COUNTY INTELLIGENCE (map + merged accident/judicial table) */}
      {/* ============================================================ */}
      {data.accidentSummary.length > 0 ? (
        <CountyIntelligenceMap
          rows={data.accidentSummary}
          geometry={GA_COUNTY_GEOMETRY}
          viewBox={GA_VIEWBOX}
          stateName="Georgia"
          stateCode="GA"
          csvFileName="georgia-county-intelligence.csv"
          judicialProfiles={data.judicialProfiles}
          boating={data.boatingSummary.map((b) => ({
            county: b.county,
            accident_count: b.accident_count,
            total_deaths: b.total_deaths,
            total_injuries: b.total_injuries,
          }))}
          farsYears={FARS_DATA_YEARS}
          boatingYears={BOATING_DATA_YEARS}
          demographics={data.censusDemographics.map((d) => ({
            county_name: d.county_name,
            median_age: d.median_age,
            pct_white: d.pct_white,
            pct_black: d.pct_black,
            pct_hispanic: d.pct_hispanic,
            pct_asian: d.pct_asian,
            pct_native: d.pct_native,
            median_household_income: d.median_household_income,
            pct_poverty: d.pct_poverty,
            mean_commute_minutes: d.mean_commute_minutes,
          }))}
        />
      ) : (
        <div className="rounded-lg bg-white p-6 shadow-sm border">
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
            <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
            <p className="text-sm font-medium text-midnight-navy/60">County intelligence data loading...</p>
          </div>
        </div>
      )}

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
                Georgia&apos;s modified comparative negligence rule (50% bar)
                bars plaintiffs who are 50% or more at fault. The 2-year statute
                of limitations provides a reasonable acquisition window. Georgia
                does not cap non-economic damages in most PI cases, making it
                more plaintiff-friendly than states with strict caps. Punitive
                damages are generally capped at $250,000 but with significant
                exceptions for product liability and intentional torts.
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
      {/* 11. COMPETITIVE ANALYSIS                                     */}
      {/* ============================================================ */}
      <CompetitiveAnalysis stateName="Georgia" stateCode="GA" numbered={false} />

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
          {/* Cross-Signal Card 1: Top accident counties × judicial profile */}
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🍑</span>
              <h3 className="text-sm font-bold text-midnight-navy">
                High-Volume Counties &amp; Judicial Profile
              </h3>
            </div>
            <p className="text-[11px] text-midnight-navy/70">
              The top accident counties by total deaths (shown in the county
              table above) overlap with some of the state&apos;s most
              plaintiff-friendly judicial profiles. Cross-referencing crash
              volume with judicial leanings reveals which counties combine
              high case supply with favorable venue dynamics. Satellite
              counties around Atlanta (Gwinnett, Forsyth, Henry, Cherokee) are
              growing rapidly with less advertising saturation, offering
              better cost-per-case economics than Fulton County proper.
            </p>
          </div>

          {/* Cross-Signal Card 2: MSA growth × case type opportunity */}
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🚢</span>
              <h3 className="text-sm font-bold text-midnight-navy">
                Savannah MSA Growth &amp; Trucking Opportunity
              </h3>
            </div>
            <p className="text-[11px] text-midnight-navy/70">
              The Port of Savannah is the 3rd busiest container port in the
              U.S. and continues to expand capacity. The Savannah MSA (see
              demographics table above) is one of Georgia&apos;s fastest-growing
              metros, driving both construction and freight activity. I-16
              from Savannah to Macon and I-95 along the coast see extreme
              truck traffic, while BLS data show {fmtNum(BLS_GA.transportWarehouseFatalities)}{" "}transportation/warehousing
              workplace fatalities statewide. Savannah-market trucking
              campaigns reach into South Carolina for cross-border coverage.
            </p>
          </div>

          {/* Cross-Signal Card 3: Rural fatal share × ad strategy implications */}
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🛣️</span>
              <h3 className="text-sm font-bold text-midnight-navy">
                Rural Fatal Share &amp; Ad Strategy
              </h3>
            </div>
            <p className="text-[11px] text-midnight-navy/70">
              {GOHS.ruralFatalShare}% of Georgia&apos;s 2023 traffic fatalities
              occurred on rural roadways, yet the rural/urban table shows these
              counties have lower internet access and higher uninsured rates.
              Digital-only campaigns miss a significant share of potential
              claimants. Firms investing in radio, local TV, and community
              health partnerships in South Georgia&apos;s I-75 corridor and the
              rural Black Belt can reach underserved markets with less
              advertising competition.
            </p>
          </div>

          {/* Cross-Signal Card 4: Workplace fatalities × industry concentration */}
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🏗️</span>
              <h3 className="text-sm font-bold text-midnight-navy">
                Workplace Fatalities &amp; Industry Hotspots
              </h3>
            </div>
            <p className="text-[11px] text-midnight-navy/70">
              Georgia recorded {fmtNum(BLS_GA.totalWorkplaceFatalities)}{" "}workplace
              fatalities in 2023, with construction ({fmtNum(BLS_GA.constructionFatalities)})
              and transportation/warehousing ({fmtNum(BLS_GA.transportWarehouseFatalities)})
              as the top industry sectors. Transportation incidents
              ({fmtNum(BLS_GA.transportationIncidents)}) were the leading event type.
              Atlanta&apos;s construction growth and Savannah&apos;s logistics
              expansion concentrate workplace injury risk in these two metros,
              creating dual-market opportunities for firms handling both
              workers&apos; comp and third-party negligence claims.
            </p>
          </div>

          {/* Cross-Signal Card 5: Demographic shifts × tort exposure */}
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📊</span>
              <h3 className="text-sm font-bold text-midnight-navy">
                Demographic Growth &amp; Tort Exposure
              </h3>
            </div>
            <p className="text-[11px] text-midnight-navy/70">
              Georgia&apos;s MSA demographics (above) show rapid population
              growth in suburban Atlanta metros and along the Savannah
              corridor. Growing populations drive more vehicle-miles traveled,
              more construction activity, and more tort exposure. Combined
              with {COMMUTE_GA.driveAlone}% drive-alone commute rates and
              a {COMMUTE_GA.avgCommuteMinutes}-minute average commute, Georgia&apos;s
              expanding suburban ring creates rising case volume in counties
              that are not yet saturated by national PI advertisers.
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ASK AI PANEL                                                 */}
      {/* ============================================================ */}
      <AskAIPanel
        pageContext={{
          pageName: "Georgia State Intelligence",
          pageDescription:
            "State-level intelligence for plaintiff firm advertising and case acquisition in Georgia — combining FARS accident data, census demographics, judicial profiles, PI viability scores, storm events, GDOT crash dashboards, and market opportunity signals across MVA, trucking, motorcycle, construction, and boating.",
          dataSummary: `State: Georgia. Negligence: ${formatNegligenceRule(piData?.negligence_rule ?? 'modified_50')} (50% bar). PI Viability: ${piData?.composite_score ?? 'N/A'} composite. Fatal Crashes (FARS): ${totalFatalCrashes.toLocaleString()}. Total Deaths: ${totalDeaths.toLocaleString()}. Counties: 159. Top counties by deaths: ${[...data.accidentSummary].sort((a, b) => b.total_deaths - a.total_deaths).slice(0, 5).map(r => r.county).join(', ')}. Judicial profile mix: ${Object.entries(profileCounts).map(([p, c]) => `${c} ${p}`).join(', ')}. Storm events: ${data.stormCount.toLocaleString()}. Truck deaths: ${totalTruckDeaths.toLocaleString()}. Motorcycle deaths: ${totalMotoDeaths.toLocaleString()}. Boating accidents: ${totalBoatingAccidents.toLocaleString()}. Key corridors: I-75, I-85, I-20, I-16, I-95.`,
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
            "GDOT AASHTOWare Safety Portal \u2014 Crash Dashboards",
            "GDOT AASHTOWare Crash Data Portal \u2014 County-level injury & severity data, 2020\u2013Nov 8, 2022",
            "GOHS 2023 Overview of Motor Vehicle Crashes \u2014 Georgia Traffic Safety Facts (Oct 2025)",
            "GOHS 2023 Distracted Driving \u2014 Georgia Traffic Safety Facts (Apr 2025)",
            "BLS CFOI Georgia 2023 \u2014 Fatal Occupational Injuries state table (Dec 2024)",
            "BLS Fatal Work Injuries in Georgia \u2014 2024 news release (Mar 2026)",
            "ACS 5-Year Estimates 2019\u20132023, Table S0801 (Census Bureau)",
            "BLS QCEW \u2014 Covered Employment Q2 2023",
            "NOAA Storm Events Database",
            "USCG Boating Accident Report Database",
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
          Data sources: FARS (NHTSA), GDOT AASHTOWare Safety Portal, GOHS
          2023 Traffic Safety Facts, BLS CFOI 2023, BLS QCEW, ACS 5-Year
          Estimates 2019&ndash;2023, NOAA Storm Events, USCG Boating
          Accidents, Judicial Profile Data.
        </p>
      </div>
    </div>
  );
}
