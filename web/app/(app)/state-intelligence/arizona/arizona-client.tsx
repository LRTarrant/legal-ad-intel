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
import { arizonaCompetitiveData } from "@/lib/data/competitive-landscape/arizona";
import { CountyIntelligenceMap } from "../../components/county-intelligence-map";
import {
  COUNTY_GEOMETRY as AZ_COUNTY_GEOMETRY,
  VIEWBOX as AZ_VIEWBOX,
} from "@/lib/data/state-geometry/arizona";

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

export interface ArizonaPageData {
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
/*  Hardcoded Constants (ADOT, BLS, ACS)                               */
/* ------------------------------------------------------------------ */

const ADOT = {
  totalCrashes: 122_247,
  totalFatalities: 1_307,
  motorcycleFatalities: 258,
  motorcycleRegistrations: 279_569,
  speedRelatedFatalities: 446,
  speedRelatedPct: 34.1,
  alcoholRelatedFatalities: 332,
  alcoholRelatedPct: 25.4,
  unrestrainedFatalities: 361,
  distractedDrivingFatalCrashes: 62,
  urbanFatalities: 853,
  ruralFatalities: 454,
  localRoadFatalities: 828,
  stateHighwayFatalities: 479,
};

const BLS = {
  totalEmployment: 3_129_720,
  constructionManagers: 8_040,
  qcewCoveredEmployment: 3_143_100,
  qcewYoY: 2.7,
  avgWeeklyWage: 1_330,
  totalWorkplaceFatalities: 103,
  constructionFatalities: 26,
  constructionPctTotal: 25,
  transportWarehouseFatalities: 30,
  truckTransportFatalities: 24,
  fallsSlipsTrips: 19,
  transportationIncidents: 42,
  hispanicWorkerFatalities: 48,
  hispanicWorkerPct: 47,
  workers25to54Pct: 68,
};

const COMMUTE = {
  driveAlone: 67.5,
  nationalAvg: 68.7,
  avgCommuteMinutes: 26,
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ArizonaClient({ data }: { data: ArizonaPageData }) {
  const [msaSortKey, setMsaSortKey] = useState<"pop" | "income" | "poverty">("pop");
  const [msaSortAsc, setMsaSortAsc] = useState(false);
  const [piAdData, setPiAdData] = useState<PIAdvertisingData | null>(null);
  const handlePIAdDataLoaded = useCallback((d: PIAdvertisingData) => setPiAdData(d), []);

  useEffect(() => {
    trackStateViewed({ state_code: "AZ", state_name: "Arizona" });
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

  /* -- Top storm chart data -- */
  const topStorms = data.stormSummary.slice(0, 10);

  /* -- PI viability bar chart data -- */
  const piData = data.piViability;

  /* -- Major AZ metros -- */
  const MAJOR_METROS = ["Phoenix", "Tucson", "Prescott", "Flagstaff"];

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
            Arizona
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
          acquisition in Arizona &mdash; combining accident data, demographics,
          judicial profiles, and market opportunity signals across MVA, trucking,
          motorcycle, construction, and boating.
        </p>
        <div className="mt-4">
          <BuildCampaignLink
            variant={{ kind: "personal_injury", stateCode: "AZ", stateName: "Arizona" }}
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
            {fmtNum(ADOT.totalFatalities)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-gray">
            Second-highest on record &middot; ADOT 2023
          </p>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm border">
          <div className="flex items-center gap-1.5 mb-2">
            <MapPin className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Rural Fatal Share
            </p>
          </div>
          <p className="text-3xl font-bold text-midnight-navy">68%</p>
          <p className="mt-0.5 text-[11px] text-slate-gray">
            of FARS fatal crashes
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
            Pure comparative negligence
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
            2,519 deaths &middot; NOAA
          </p>
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
                Arizona follows pure comparative negligence &mdash; plaintiffs
                can recover damages even if they are 99% at fault (reduced by
                their percentage of fault). Combined with no caps on
                non-economic or medical malpractice damages, Arizona is one of
                the more plaintiff-friendly states in the Southwest. The 2-year
                statute of limitations is standard but requires timely case
                acquisition.
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
                <span className="text-slate-gray">Speed-Related Fatalities (2023)</span>
                <span className="font-semibold text-midnight-navy">
                  {ADOT.speedRelatedFatalities} ({ADOT.speedRelatedPct}%)
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Alcohol-Related Fatalities (2023)</span>
                <span className="font-semibold text-midnight-navy">
                  {ADOT.alcoholRelatedFatalities} ({ADOT.alcoholRelatedPct}%)
                </span>
              </div>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3 mb-2">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">
                  Audience:
                </span>{" "}
                Phoenix metro dominates volume (Maricopa = 51% of all fatal
                crashes). Target ages 25-44. Speed is the #1 contributing factor
                at 34.1% &mdash; messaging around speed-related accidents
                resonates. Rural corridors on I-10, I-17, and I-40 have
                disproportionate fatality rates.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Digital + CTV in Phoenix/Tucson metros. Billboard and radio along
                I-10 (Phoenix-Tucson corridor), I-17 (Phoenix-Flagstaff), and
                I-40 (Flagstaff-Kingman). Spanish-language media critical &mdash;
                31% Hispanic population statewide, 65% in Yuma County.
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
                <span className="text-slate-gray">La Paz County Truck Deaths</span>
                <span className="font-semibold text-midnight-navy">
                  46 (pop 16,664)
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
                Arizona is a major freight corridor connecting California ports
                to the rest of the Southwest. I-10 (Phoenix-Tucson-CA border),
                I-40 (Flagstaff-Kingman-CA border), and I-17 (Phoenix-Flagstaff)
                are primary trucking routes. La Paz County&apos;s extreme truck
                death rate (46 deaths, pop 16,664) reflects I-10 through-traffic.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Geo-fenced digital ads along I-10 and I-40 corridors. Truck stop
                billboards at major rest areas. Target CDL holder families and
                passenger vehicle occupants struck by trucks.
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
                  ADOT 2023 Motorcycle Fatalities
                </span>
                <span className="font-semibold text-midnight-navy">
                  {ADOT.motorcycleFatalities} (highest in 20+ years)
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Motorcycle Registrations</span>
                <span className="font-medium text-midnight-navy">
                  {fmtNum(ADOT.motorcycleRegistrations)} (up 33% since 2019)
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
                Arizona is a premier motorcycle state &mdash; near year-round
                riding weather, {fmtNum(ADOT.motorcycleRegistrations)}{" "}
                registrations (up 33% since 2019), and the highest motorcycle
                fatality count in 20 years. Target males 35-64, motorcycle
                enthusiast interests, and Maricopa/Pima counties for volume.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Seasonal campaigns less critical than other states &mdash;
                Arizona has year-round riding. Social media + streaming targeting
                motorcycle interests. Events sponsorship (Arizona Bike Week).
                Digital geo-fencing near popular riding routes (Carefree Highway,
                Apache Trail, Route 66).
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
                <span className="text-slate-gray">Hispanic Worker Fatalities</span>
                <span className="font-semibold text-midnight-navy">
                  {BLS.hispanicWorkerFatalities} ({BLS.hispanicWorkerPct}% of total)
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
                Arizona&apos;s construction boom (driven by semiconductor fabs,
                housing, and infrastructure) creates a large at-risk workforce.
                47% of all workplace fatalities are Hispanic workers &mdash;
                Spanish-language legal advertising is underserved and
                high-opportunity. Target construction workers, their families,
                and workers&apos; comp attorneys.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Spanish-language radio and digital are essential &mdash; target
                Univision, Telemundo, and Spanish-language social media. Job site
                proximity targeting via mobile. Workers&apos; comp and
                construction injury keywords in Phoenix, Tucson, and Chandler
                (semiconductor corridor).
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
                Mohave County dominates with 51% of all boating accidents
                &mdash; the Lake Havasu / Colorado River recreation corridor is
                one of the busiest waterway systems in the Southwest. Spring
                break and summer holidays drive peak accident periods. Target
                boating enthusiasts, lake house vacation demographics, and
                Havasu/Parker visitors.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Seasonal spring/summer campaigns. Geo-targeted digital around
                Lake Havasu City, Parker, and Lake Pleasant. Local radio in
                Mohave and Maricopa counties. Marina signage and outfitter
                partnerships.
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
          geometry={AZ_COUNTY_GEOMETRY}
          viewBox={AZ_VIEWBOX}
          stateName="Arizona"
          csvFileName="arizona-county-intelligence.csv"
          judicialProfiles={data.judicialProfiles}
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

            <div className="rounded-md border-l-4 border-intelligence-teal bg-intelligence-teal/5 px-4 py-3">
              <p className="text-sm text-midnight-navy/80">
                Arizona&apos;s fatal crash pattern reveals a stark rural-urban
                divide: 68% of FARS fatal crashes occur in rural areas, yet the
                Phoenix metro alone holds 62% of the state&apos;s population.
                Long-distance desert highways (I-10, I-40, I-17) with high speed
                limits and limited emergency response create deadly corridors.
                Plaintiff firms should target both the urban volume market
                (Phoenix/Tucson digital campaigns) and the underserved rural
                corridor opportunity (billboard, radio, and geo-fenced digital
                along interstates).
              </p>
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
          Arizona&apos;s {data.msaDemographics.length} Metropolitan Statistical
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
                Yuma (14% uninsured, 65% Hispanic) and Show Low/Navajo County
                (20% poverty, 16% uninsured) are underserved markets with high
                uninsured rates &mdash; potential for large medical debt cases.
                Phoenix-Mesa-Chandler (5M pop) dominates and aligns with
                Arizona&apos;s primary media market. Digital campaigns should
                prioritize Phoenix and Tucson for reach, while supplementing with
                radio/billboard in smaller MSAs.
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
                Arizona ranks significantly higher than Alabama (which scored
                lower due to contributory negligence). The pure comparative
                negligence rule and absence of non-economic damage caps make
                Arizona one of the more favorable PI states in the country.
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
      <PIAdvertisingSection stateAbbr="AZ" onDataLoaded={handlePIAdDataLoaded} />

      {/* ============================================================ */}
      {/* 11. COMPETITIVE LANDSCAPE                                    */}
      {/* ============================================================ */}
      <CompetitiveLandscapeTable data={arizonaCompetitiveData} />

      {/* ============================================================ */}
      {/* 11b. ADVERTISING INTELLIGENCE (Platform, Advertisers, etc.)  */}
      {/* ============================================================ */}
      <StateAdvertisingSection stateAbbr="AZ" stateName="Arizona" />

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
          {/* Insight 1: Heat Deaths */}
          <div className="rounded-lg border border-red-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-bold text-midnight-navy">
                Heat Is Arizona&apos;s Silent Killer &mdash; And a Legal
                Opportunity
              </h3>
            </div>
            <div className="space-y-1.5 mb-3">
              <p className="text-xs text-midnight-navy/70">
                Storm events: <strong>{fmtNum(data.stormCount)}</strong> with{" "}
                <strong>2,519 deaths</strong> (overwhelmingly heat-related)
              </p>
              <p className="text-xs text-midnight-navy/70">
                Arizona leads the nation in heat-related deaths
              </p>
            </div>
            <div className="rounded-md bg-red-50 border border-red-100 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                Extreme heat deaths create wrongful death and premises liability
                opportunities &mdash; outdoor workers, nursing home residents,
                and homeless individuals are at highest risk. Heat-related
                workplace deaths (construction, agriculture, landscaping) are a
                growing litigation area. Time campaigns to May-September when
                temperatures exceed 110&deg;F in Phoenix.
              </p>
            </div>
          </div>

          {/* Insight 2: La Paz I-10 Corridor */}
          <div className="rounded-lg border border-intelligence-teal/30 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4 text-intelligence-teal" />
              <h3 className="text-sm font-bold text-midnight-navy">
                La Paz County: The I-10 Death Corridor
              </h3>
            </div>
            <div className="space-y-1.5 mb-3">
              <p className="text-xs text-midnight-navy/70">
                Population: <strong>16,664</strong> &mdash; yet{" "}
                <strong>90 fatal crashes</strong> and{" "}
                <strong>111 deaths</strong>
              </p>
              <p className="text-xs text-midnight-navy/70">
                <strong>46</strong> of those deaths involve large trucks
              </p>
              <p className="text-xs text-midnight-navy/70">
                Per-capita fatality rate: <strong>~666 per 100K</strong>{" "}
                (astronomical)
              </p>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                La Paz County&apos;s extreme fatality rate is driven entirely by
                I-10 through-traffic between Phoenix and Los Angeles. This is not
                a local population issue &mdash; it&apos;s a corridor issue. Truck
                accident firms should geo-target this stretch of I-10 with
                billboard and digital. The cases involve out-of-state defendants
                and complex multi-jurisdiction litigation.
              </p>
            </div>
          </div>

          {/* Insight 3: Hispanic Workforce */}
          <div className="rounded-lg border border-amber-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <HardHat className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-midnight-navy">
                Hispanic Workforce: Underserved Legal Market
              </h3>
            </div>
            <div className="space-y-1.5 mb-3">
              <p className="text-xs text-midnight-navy/70">
                31.1% of Arizona is Hispanic (Yuma: 64.9%, Santa Cruz: 82.5%)
              </p>
              <p className="text-xs text-midnight-navy/70">
                <strong>47%</strong> of all workplace fatalities are Hispanic
                workers
              </p>
              <p className="text-xs text-midnight-navy/70">
                Construction is the deadliest industry ({BLS.constructionFatalities}{" "}
                deaths, {BLS.constructionPctTotal}%)
              </p>
            </div>
            <div className="rounded-md bg-amber-50 border border-amber-100 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                Nearly half of Arizona&apos;s workplace fatalities are Hispanic
                workers, heavily concentrated in construction. Spanish-language
                legal advertising for workers&apos; comp and construction injury
                is dramatically underserved relative to the need. Firms
                investing in Spanish-language intake, community outreach, and
                culturally relevant advertising will capture a disproportionate
                share of this market.
              </p>
            </div>
          </div>

          {/* Insight 4: Motorcycle Boom */}
          <div className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Bike className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-midnight-navy">
                The Motorcycle Boom: 33% More Registrations, Record Deaths
              </h3>
            </div>
            <div className="space-y-1.5 mb-3">
              <p className="text-xs text-midnight-navy/70">
                Registrations up 33% since 2019 (
                <strong>{fmtNum(ADOT.motorcycleRegistrations)}</strong>)
              </p>
              <p className="text-xs text-midnight-navy/70">
                <strong>{ADOT.motorcycleFatalities}</strong> motorcycle
                fatalities in 2023 &mdash; highest in 20+ years
              </p>
              <p className="text-xs text-midnight-navy/70">
                Maricopa County: 57% of all motorcycle deaths
              </p>
            </div>
            <div className="rounded-md bg-emerald-50 border border-emerald-100 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                Arizona&apos;s year-round riding weather and rapid population
                growth have fueled a motorcycle boom. But infrastructure and
                driver awareness haven&apos;t kept pace &mdash; motorcycle deaths
                hit a 20-year high. This is a growing and sustained opportunity,
                not a seasonal one. Target motorcycle injury with always-on
                digital campaigns in the Phoenix metro, not just spring/summer
                bursts.
              </p>
            </div>
          </div>

          {/* Insight 5: Navajo/Apache Connectivity Gap */}
          <div className="rounded-lg border border-red-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-bold text-midnight-navy">
                Navajo and Apache Counties: The Connectivity Gap
              </h3>
            </div>
            <div className="space-y-1.5 mb-3">
              <p className="text-xs text-midnight-navy/70">
                Navajo: 20% poverty, 15.9% uninsured, 74.2% internet
              </p>
              <p className="text-xs text-midnight-navy/70">
                Apache: 25.1% poverty, 18.2% uninsured, 60% internet
              </p>
              <p className="text-xs text-midnight-navy/70">
                Both have significant Navajo Nation population
              </p>
            </div>
            <div className="rounded-md bg-red-50 border border-red-100 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                Arizona&apos;s northeastern counties &mdash; overlapping with
                Navajo Nation &mdash; have the lowest internet access and highest
                uninsured rates in the state. Digital advertising alone cannot
                reach these communities. Radio, community health centers, and
                tribal outreach are necessary channels. Legal services are
                severely underrepresented in these areas despite high accident
                rates (191 fatal crashes in Navajo County, 144 in Apache).
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
          pageName: "Arizona State Intelligence",
          pageDescription:
            "State-level intelligence for plaintiff firm advertising and case acquisition in Arizona — combining FARS accident data, census demographics, judicial profiles, PI viability scores, storm events, cancer incidence, and market opportunity signals across MVA, trucking, motorcycle, construction, and boating.",
          dataSummary: `State: Arizona. Negligence: ${formatNegligenceRule(piData?.negligence_rule ?? 'pure_comparative')} (plaintiff can recover even at 99% fault). PI Viability: ${piData?.composite_score ?? 'N/A'} composite. Fatal Crashes (FARS): ${totalFatalCrashes.toLocaleString()}. Total Deaths: ${totalDeaths.toLocaleString()}. Counties: 15. Top counties by deaths: ${[...data.accidentSummary].sort((a, b) => b.total_deaths - a.total_deaths).slice(0, 5).map(r => r.county).join(', ')}. Judicial profile mix: ${Object.entries(profileCounts).map(([p, c]) => `${c} ${p}`).join(', ')}. Storm events: ${data.stormCount.toLocaleString()}. Truck deaths: ${totalTruckDeaths.toLocaleString()}. Motorcycle deaths: ${totalMotoDeaths.toLocaleString()}. Boating accidents: ${totalBoatingAccidents.toLocaleString()}. Workplace fatalities: ${BLS.totalWorkplaceFatalities} (${BLS.constructionFatalities} construction). Key corridors: I-10, I-17, I-40. Hispanic population: 31.1%.${piAdData ? ` ${buildPIAdSummary(piAdData)}` : ''}`,
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
            "ADOT Motor Vehicle Crash Facts 2023",
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
          Data sources: FARS (NHTSA), ADOT Motor Vehicle Crash Facts 2023, ACS
          5-Year Estimates, BLS OES/CFOI, NOAA Storm Events, USCG Boating
          Accidents, Judicial Profile Data.
        </p>
      </div>
    </div>
  );
}
