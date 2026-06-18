"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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
  TrendingUp,
  FileText,
  MapPin,
  ChevronUp,
  ChevronDown,
  Lightbulb,
  CloudLightning,
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
import { alabamaCompetitiveData } from "@/lib/data/competitive-landscape/alabama";
import { CountyIntelligenceMap } from "../../components/county-intelligence-map";
import {
  COUNTY_GEOMETRY as AL_COUNTY_GEOMETRY,
  VIEWBOX as AL_VIEWBOX,
} from "@/lib/data/state-geometry/alabama";

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

export interface AlabamaPageData {
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
/*  Hardcoded Constants (ALDOT, BLS, ACS)                              */
/* ------------------------------------------------------------------ */

const ALDOT = {
  totalCrashes: 143_487,
  totalInjuries: 37_792,
  totalFatalities: 975,
  ratePerVMT: 1.36,
  nationalRate: 1.26,
  ruralFatalShare: 0.58,
  motorcycleFatalities: 92,
  largeTruckFatalities: 134,
  pedestrianFatalities: 120,
  bicycleFatalities: 11,
  workZoneFatalities: 23,
  impairedDrivingDeaths: 196,
};

const BLS = {
  constructionWorkers: 101_300,
  constructionPctPrivate: 6.0,
  constructionYoY: 2.2,
  truckingWorkers: 26_934,
  truckingYoY: -0.7,
  transportWarehouseTotal: 75_529,
  constructionAvgPay: 69_214,
  truckingAvgPay: 63_951,
  totalWorkplaceFatalities: 75,
  constructionFatalities: 15,
  workplaceFatalityRate: 3.6,
  nationalWorkplaceRate: 3.3,
};

const COMMUTE = {
  driveAlone: 81.5,
  carpool: 8.2,
  wfh: 7.8,
  highCarpoolCounties: [
    { county: "Winston", pct: 17.2 },
    { county: "Greene", pct: 14.1 },
    { county: "Crenshaw", pct: 12.9 },
    { county: "DeKalb", pct: 12.9 },
    { county: "Franklin", pct: 12.8 },
  ],
  highWfhCounties: [
    { county: "Shelby", pct: 15.2 },
    { county: "Madison", pct: 13.6 },
    { county: "Baldwin", pct: 10.0 },
  ],
};

const PERCAPITA_TOP = [
  { county: "Greene", rate: 92.0, pop: 7_424 },
  { county: "Lowndes", rate: 67.8, pop: 9_276 },
  { county: "Butler", rate: 61.7, pop: 18_868 },
  { county: "Conecuh", rate: 53.2, pop: 11_597 },
  { county: "Bullock", rate: 53.0, pop: 10_357 },
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AlabamaClient({ data }: { data: AlabamaPageData }) {
  const [msaSortKey, setMsaSortKey] = useState<"pop" | "income" | "poverty">("pop");
  const [msaSortAsc, setMsaSortAsc] = useState(false);
  const [piAdData, setPiAdData] = useState<PIAdvertisingData | null>(null);
  const handlePIAdDataLoaded = useCallback((d: PIAdvertisingData) => setPiAdData(d), []);

  useEffect(() => {
    trackStateViewed({ state_code: "AL", state_name: "Alabama" });
  }, []);

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
  const totalStormEvents = data.stormSummary.reduce(
    (s, r) => s + r.event_count,
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

  /* -- Top storm chart data -- */
  const topStorms = data.stormSummary.slice(0, 10);

  /* -- PI viability bar chart data -- */
  const piData = data.piViability;

  /* -- Big 4 MSA codes -- */
  const BIG4 = ["Birmingham", "Huntsville", "Mobile", "Montgomery"];

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
            Alabama
          </h1>
          <span className="rounded-full bg-red-500/10 border border-red-500/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-red-600">
            Contributory Negligence State
          </span>
        </div>
        <p className="mt-1 text-lg text-slate-gray">
          State Intelligence Report
        </p>
        <p className="mt-1 text-sm text-slate-gray max-w-3xl">
          Cross-signal intelligence for plaintiff firm advertising and case
          acquisition in Alabama &mdash; combining accident data, demographics,
          judicial profiles, and market opportunity signals across MVA, trucking,
          motorcycle, construction, and boating.
        </p>
        <div className="mt-4">
          <BuildCampaignLink
            variant={{ kind: "personal_injury", stateCode: "AL", stateName: "Alabama" }}
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
              Fatality Rate
            </p>
          </div>
          <p className="text-3xl font-bold text-midnight-navy">
            {ALDOT.ratePerVMT}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-gray">
            per 100M VMT &middot; vs {ALDOT.nationalRate} national &middot; 8%
            above
          </p>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm border">
          <div className="flex items-center gap-1.5 mb-2">
            <MapPin className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Rural Fatal Share
            </p>
          </div>
          <p className="text-3xl font-bold text-midnight-navy">58%</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">
            of all traffic fatalities
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
            composite score
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
            per 100K FTE &middot; vs {BLS.nationalWorkplaceRate} national
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
                <p className="text-sm font-bold text-red-600">
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

            <div className="rounded-md border-l-4 border-red-500 bg-red-50 px-4 py-3">
              <p className="text-sm text-midnight-navy/80">
                Alabama is one of only 4 states (plus D.C.) that follows pure
                contributory negligence &mdash; any plaintiff fault bars recovery
                entirely. This makes case selection and liability evidence
                critical for advertising ROI. Target cases with clear defendant
                liability.
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
                <span className="text-slate-gray">Rural Share</span>
                <span className="font-medium text-midnight-navy">58%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Impaired Driving Deaths (2023)</span>
                <span className="font-semibold text-midnight-navy">
                  {ALDOT.impairedDrivingDeaths}
                </span>
              </div>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3 mb-2">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">
                  Audience:
                </span>{" "}
                Target ages 25-44 in high-fatality rural counties. Carpool
                corridors (Winston, DeKalb, Franklin) indicate blue-collar
                commuter populations with high road exposure. Impaired driving accounts for 20% of fatalities &mdash; consider campaigns tied to holiday weekends and enforcement awareness.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Radio + digital in rural markets; CTV in Birmingham, Huntsville,
                Mobile metros
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
                <span className="text-slate-gray">
                  ALDOT 2023 Truck Fatalities
                </span>
                <span className="font-semibold text-midnight-navy">
                  {ALDOT.largeTruckFatalities}
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
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3 mb-2">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">
                  Audience:
                </span>{" "}
                Commercial trucking corridors (I-65, I-20, I-59). Target CDL
                holders&apos; families and occupants of passenger vehicles struck
                by trucks.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Billboard corridors + digital geo-fencing along major interstates
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
                  ALDOT 2023 Motorcycle Fatalities
                </span>
                <span className="font-semibold text-midnight-navy">
                  {ALDOT.motorcycleFatalities}
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
                Target 35-64 males in suburban/exurban counties. Baldwin, Mobile,
                Jefferson highest volume.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Seasonal spring/summer campaigns. Social media + streaming audio
                targeting motorcycle enthusiast interests.
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
                  Construction Fatalities (2023)
                </span>
                <span className="font-semibold text-midnight-navy">
                  {BLS.constructionFatalities}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Fatality Rate</span>
                <span className="font-semibold text-midnight-navy">
                  {BLS.workplaceFatalityRate}/100K FTE
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Employment Growth</span>
                <span className="font-medium text-emerald-600">
                  +{BLS.constructionYoY}% YoY
                </span>
              </div>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3 mb-2">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">
                  Audience:
                </span>{" "}
                Construction boom counties with growing employment. Target
                construction workers&apos; families, union halls, and safety
                equipment retailers.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Spanish-language media in Franklin/DeKalb (high Hispanic
                construction workforce). Radio in rural construction corridors.
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
                Lakefront and Gulf Coast counties. Target boating enthusiast
                demographics, marina-adjacent areas.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Seasonal spring/summer. Local radio + geo-targeted digital around
                major waterways.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. COUNTY INTELLIGENCE (map + merged accident/judicial table) */}
      {/* ============================================================ */}
      {data.accidentSummary.length > 0 ? (
        <CountyIntelligenceMap
          rows={data.accidentSummary}
          geometry={AL_COUNTY_GEOMETRY}
          viewBox={AL_VIEWBOX}
          stateName="Alabama"
          csvFileName="alabama-county-intelligence.csv"
        />
      ) : (
        <div className="rounded-lg bg-white p-6 shadow-sm border">
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
            <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
            <p className="text-sm font-medium text-midnight-navy/60">
              County intelligence data loading...
            </p>
          </div>
        </div>
      )}

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
                  Alabama&apos;s rural counties account for 58% of traffic
                  fatalities despite lower populations. These same counties have
                  higher poverty rates, lower internet access, and higher
                  uninsured rates &mdash; meaning traditional media (radio,
                  billboard, TV) reaches more of the at-risk population than
                  digital alone. Plaintiff firms should consider dual-channel
                  strategies in rural markets.
                </p>
              </div>

              <div className="rounded-md border-l-4 border-intelligence-teal bg-intelligence-teal/5 px-4 py-3">
                <p className="text-sm text-midnight-navy/80">
                  High carpool rates in counties like Winston (17.2%), DeKalb
                  (12.9%), and Franklin (12.8%) correlate with blue-collar
                  workforces in construction and manufacturing. These workers
                  have higher road exposure and are prime PI case demographics.
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
          Alabama&apos;s {data.msaDemographics.length} Metropolitan Statistical
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
                    const isBig4 = BIG4.some((m) =>
                      row.cbsa_title.startsWith(m)
                    );
                    return (
                      <tr
                        key={row.cbsa_code}
                        className={`border-b border-cloud/50 transition-colors ${
                          isBig4 ? "bg-intelligence-teal/5" : ""
                        }`}
                      >
                        <td className="py-2.5 pr-4 font-medium text-midnight-navy whitespace-nowrap">
                          {row.cbsa_title}
                          {isBig4 && (
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
                Alabama&apos;s Big 4 metros &mdash; Birmingham (1.18M),
                Huntsville (517K), Mobile (413K), and Montgomery (386K) &mdash;
                align with the state&apos;s primary media markets. Digital
                campaigns should prioritize these metros for reach, while
                supplementing with radio/billboard in smaller MSAs.
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

            <div className="rounded-md border-l-4 border-intelligence-teal bg-intelligence-teal/5 px-4 py-3">
              <p className="text-sm text-midnight-navy/80">
                Alabama&apos;s contributory negligence rule significantly impacts
                the composite PI viability score. The pure contributory
                negligence standard &mdash; shared by only 4 other states plus
                D.C. &mdash; means any plaintiff fault bars recovery entirely,
                making case selection critical.
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
      <PIAdvertisingSection stateAbbr="AL" onDataLoaded={handlePIAdDataLoaded} />

      {/* ============================================================ */}
      {/* 11. COMPETITIVE LANDSCAPE                                    */}
      {/* ============================================================ */}
      <CompetitiveLandscapeTable data={alabamaCompetitiveData} />

      {/* ============================================================ */}
      {/* 11b. ADVERTISING INTELLIGENCE (Platform, Advertisers, etc.)  */}
      {/* ============================================================ */}
      <StateAdvertisingSection stateAbbr="AL" stateName="Alabama" />

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
          {/* Insight 1 */}
          <div className="rounded-lg border border-red-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-bold text-midnight-navy">
                Greene County: Highest Risk, Lowest Resources
              </h3>
            </div>
            <div className="space-y-1.5 mb-3">
              <p className="text-xs text-midnight-navy/70">
                Fatality rate: <strong>552.3 per 100K</strong> (2019&ndash;2024, highest in state)
              </p>
              <p className="text-xs text-midnight-navy/70">
                Population: <strong>7,424</strong>
              </p>
            </div>
            <div className="rounded-md bg-red-50 border border-red-100 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                Greene County&apos;s extreme fatality rate reflects a pattern
                across Alabama&apos;s Black Belt counties &mdash; high poverty,
                limited infrastructure, low internet access. Radio and community
                outreach are the only viable advertising channels here.
              </p>
            </div>
          </div>

          {/* Insight 2 */}
          <div className="rounded-lg border border-intelligence-teal/30 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <HardHat className="w-4 h-4 text-intelligence-teal" />
              <h3 className="text-sm font-bold text-midnight-navy">
                Construction Boom + High Road Fatalities
              </h3>
            </div>
            <div className="space-y-1.5 mb-3">
              <p className="text-xs text-midnight-navy/70">
                Construction employment up{" "}
                <strong>{BLS.constructionYoY}% YoY</strong> (
                {fmtNum(BLS.constructionWorkers)} workers)
              </p>
              <p className="text-xs text-midnight-navy/70">
                <strong>{BLS.constructionFatalities}</strong> construction
                fatalities in 2023
              </p>
              <p className="text-xs text-midnight-navy/70">
                High-carpool counties (Winston, DeKalb) overlap with
                construction workforce
              </p>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                Growing construction activity creates both workplace injury cases
                and increased road exposure for commuters. Target construction
                accident AND MVA cases in these corridors simultaneously.
              </p>
            </div>
          </div>

          {/* Insight 3 */}
          <div className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-midnight-navy">
                Huntsville-Madison: Tech Growth Creates New PI Market
              </h3>
            </div>
            <div className="space-y-1.5 mb-3">
              <p className="text-xs text-midnight-navy/70">
                Madison County WFH rate: <strong>13.6%</strong> (among highest)
              </p>
              <p className="text-xs text-midnight-navy/70">
                Huntsville MSA population: <strong>517K</strong> (fastest-growing
                metro)
              </p>
            </div>
            <div className="rounded-md bg-emerald-50 border border-emerald-100 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                Rapid population growth + infrastructure lag = rising accident
                rates. Digital-first advertising strategy viable here given high
                internet penetration. Early mover advantage for plaintiff firms
                establishing market presence.
              </p>
            </div>
          </div>

          {/* Insight 4 */}
          <div className="rounded-lg border border-amber-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <CloudLightning className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-midnight-navy">
                Tornado Alley Overlap with High-Fatality Counties
              </h3>
            </div>
            <div className="space-y-1.5 mb-3">
              <p className="text-xs text-midnight-navy/70">
                Storm events: <strong>{fmtNum(data.stormCount)}</strong> NOAA
                records
              </p>
              <p className="text-xs text-midnight-navy/70">
                Multiple high-fatality counties also in tornado-prone areas
              </p>
            </div>
            <div className="rounded-md bg-amber-50 border border-amber-100 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                Property damage and injury from severe weather can compound with
                traffic incidents during evacuations and storm response. Consider
                weather-triggered advertising campaigns in storm season.
              </p>
            </div>
          </div>

          {/* Insight 5 */}
          <div className="rounded-lg border border-intelligence-teal/30 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4 text-intelligence-teal" />
              <h3 className="text-sm font-bold text-midnight-navy">
                Interstate Corridors: Trucking + MVA Convergence
              </h3>
            </div>
            <div className="space-y-1.5 mb-3">
              <p className="text-xs text-midnight-navy/70">
                I-65 (Birmingham to Mobile), I-20 (Birmingham to Atlanta), I-59
                (Birmingham to Chattanooga)
              </p>
              <p className="text-xs text-midnight-navy/70">
                <strong>{ALDOT.largeTruckFatalities}</strong> truck fatalities
                (2023), <strong>{fmtNum(BLS.truckingWorkers)}</strong> trucking
                workers
              </p>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                Alabama&apos;s position as a Southeast logistics hub means heavy
                commercial truck traffic on interstates. Geo-fence digital ads
                along I-65/I-20/I-59 corridors targeting truck accident victims.
                Billboards at major truck stops and weigh stations reach CDL
                drivers for workplace injury cases.
              </p>
            </div>
          </div>

          {/* Insight 6 */}
          <div className="rounded-lg border border-red-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-bold text-midnight-navy">
                Impaired Driving: 1 in 5 Alabama Traffic Deaths
              </h3>
            </div>
            <div className="space-y-1.5 mb-3">
              <p className="text-xs text-midnight-navy/70">
                <strong>{ALDOT.impairedDrivingDeaths}</strong> impaired driving deaths in 2023 (ALDOT)
              </p>
              <p className="text-xs text-midnight-navy/70">
                <strong>20%</strong> of all traffic fatalities
              </p>
              <p className="text-xs text-midnight-navy/70">
                DUI conviction rates vary significantly by county
              </p>
            </div>
            <div className="rounded-md bg-red-50 border border-red-100 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                Alabama&apos;s impaired driving fatality share aligns with the national average, but concentrated in rural counties with limited law enforcement resources. Holiday weekends and local event calendars create predictable spikes &mdash; time-triggered digital campaigns (Memorial Day, Labor Day, July 4th, New Year&apos;s) can reach recent DUI accident victims when they&apos;re actively searching for legal representation.
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
          pageName: "Alabama State Intelligence",
          pageDescription:
            "State-level intelligence for plaintiff firm advertising and case acquisition in Alabama — combining FARS accident data, census demographics, judicial profiles, PI viability scores, storm events, cancer incidence, and market opportunity signals across MVA, trucking, motorcycle, construction, and boating.",
          dataSummary: `State: Alabama. Negligence: ${formatNegligenceRule(piData?.negligence_rule ?? 'contributory')} (plaintiff barred if any fault). PI Viability: ${piData?.composite_score ?? 'N/A'} composite. Fatal Crashes (FARS): ${totalFatalCrashes.toLocaleString()}. Total Deaths: ${totalDeaths.toLocaleString()}. Counties: 67. Top counties by deaths: ${[...data.accidentSummary].sort((a, b) => b.total_deaths - a.total_deaths).slice(0, 5).map(r => r.county).join(', ')}. Judicial profile mix: ${Object.entries(profileCounts).map(([p, c]) => `${c} ${p}`).join(', ')}. Storm events: ${data.stormCount.toLocaleString()}. Truck deaths: ${totalTruckDeaths.toLocaleString()}. Motorcycle deaths: ${totalMotoDeaths.toLocaleString()}. Boating accidents: ${totalBoatingAccidents.toLocaleString()}. Construction workers: ${BLS.constructionWorkers.toLocaleString()}. Key corridors: I-65, I-20, I-10, US-280.${piAdData ? ` ${buildPIAdSummary(piAdData)}` : ''}`,
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
            "ALDOT Crash Facts 2023",
            "ACS 5-Year Estimates 2023 (Census Bureau)",
            "BLS QCEW (Quarterly Census of Employment and Wages) 2023",
            "BLS CFOI (Census of Fatal Occupational Injuries) 2021\u20132024",
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
          Data sources: FARS (NHTSA), ALDOT Crash Facts 2023, ACS 5-Year
          Estimates, BLS QCEW/CFOI, NOAA Storm Events, USCG Boating Accidents,
          Judicial Profile Data.
        </p>
      </div>
    </div>
  );
}
