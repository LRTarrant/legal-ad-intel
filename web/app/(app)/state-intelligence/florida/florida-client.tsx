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
  Users,
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
import { floridaCompetitiveData } from "@/lib/data/competitive-landscape/florida";
import { CountyIntelligenceMap } from "../../components/county-intelligence-map";
import {
  COUNTY_GEOMETRY as FL_COUNTY_GEOMETRY,
  VIEWBOX as FL_VIEWBOX,
} from "@/lib/data/state-geometry/florida";

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

export interface FloridaPageData {
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
/*  Hardcoded Constants (FLHSMV, BLS, ACS)                             */
/* ------------------------------------------------------------------ */

const FLHSMV = {
  totalCrashes2023: 395_175,
  dailyAvgCrashes: 1_083,
  totalInjuries2023: 165_000,
  totalFatalities2023: 3_375,
  ratePerVMT: 1.47,
  nationalRate: 1.26,
  motorcycleFatalities2023: 621,
  pedestrianFatalities2023: 791,
  bicycleFatalities2023: 234,
};

const BLS_FL = {
  constructionWorkers: 628_001,
  constructionPctPrivate: 7.3,
  constructionYoY: 4.5,
  truckingWorkers: 68_239,
  truckingYoY: -0.4,
  transportWarehouseTotal: 399_273,
  constructionAvgPay: 66_905,
  truckingAvgPay: 61_677,
  totalWorkplaceFatalities2024: 284,
  constructionFatalities2024: 88,
  workplaceFatalityRate: 2.9,
  nationalWorkplaceRate: 3.3,
  hispanicSharePct: 42,
  fallsSharePct: 23,
};

const COMMUTE_FL = {
  driveAlone: 72.1,
  carpool: 9.0,
  wfh: 13.9,
  highCarpoolCounties: [
    { county: "Hardee", pct: 21.2 },
    { county: "DeSoto", pct: 19.5 },
    { county: "Glades", pct: 17.2 },
    { county: "Hendry", pct: 17.0 },
    { county: "Gulf", pct: 16.7 },
  ],
  highWfhCounties: [
    { county: "St. Johns", pct: 23.7 },
    { county: "Seminole", pct: 19.2 },
    { county: "Pasco", pct: 18.4 },
    { county: "Hillsborough", pct: 18.3 },
    { county: "Pinellas", pct: 17.6 },
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FloridaClient({ data }: { data: FloridaPageData }) {
  const [msaSortKey, setMsaSortKey] = useState<"pop" | "income" | "poverty">("pop");
  const [msaSortAsc, setMsaSortAsc] = useState(false);
  const [piAdData, setPiAdData] = useState<PIAdvertisingData | null>(null);
  const handlePIAdDataLoaded = useCallback((d: PIAdvertisingData) => setPiAdData(d), []);

  useEffect(() => {
    trackStateViewed({ state_code: "FL", state_name: "Florida" });
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

  /* -- PI viability bar chart data -- */
  const piData = data.piViability;

  /* -- Big 6 MSA prefixes -- */
  const BIG6 = ["Miami", "Tampa", "Orlando", "Jacksonville", "North Port", "Cape Coral"];

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
            Florida
          </h1>
          <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-600">
            Modified Comparative Negligence (51%)
          </span>
        </div>
        <p className="mt-1 text-lg text-slate-gray">
          State Intelligence Report
        </p>
        <p className="mt-1 text-sm text-slate-gray max-w-3xl">
          Cross-signal intelligence for plaintiff firm advertising and case
          acquisition in Florida &mdash; combining accident data, demographics,
          judicial profiles, and market opportunity signals across MVA, trucking,
          motorcycle, construction, and boating.
        </p>
        <div className="mt-4">
          <BuildCampaignLink
            variant={{ kind: "personal_injury", stateCode: "FL", stateName: "Florida" }}
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
            {FLHSMV.ratePerVMT}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-gray">
            per 100M VMT &middot; vs {FLHSMV.nationalRate} national &middot; 17%
            above
          </p>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm border">
          <div className="flex items-center gap-1.5 mb-2">
            <MapPin className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Rural Road Share
            </p>
          </div>
          <p className="text-3xl font-bold text-midnight-navy">78%</p>
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
            {BLS_FL.workplaceFatalityRate}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-gray">
            per 100K FTE &middot; vs {BLS_FL.nationalWorkplaceRate} national &middot; below avg
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
                Florida shifted from pure comparative to modified comparative
                negligence (51% bar) in 2023 via tort reform (HB 837). Plaintiffs
                must now be less than 51% at fault to recover. This change
                narrowed the window for marginal cases but Florida remains a
                strong plaintiff state with high jury verdicts, no non-economic
                caps for PI, and a large population base.
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
                <span className="text-slate-gray">Rural Road Share</span>
                <span className="font-medium text-midnight-navy">78%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">FLHSMV 2023 Total Crashes</span>
                <span className="font-semibold text-midnight-navy">
                  {fmtNum(FLHSMV.totalCrashes2023)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">FLHSMV 2023 Fatalities</span>
                <span className="font-semibold text-midnight-navy">
                  {fmtNum(FLHSMV.totalFatalities2023)}
                </span>
              </div>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3 mb-2">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">
                  Audience:
                </span>{" "}
                Florida&apos;s I-4 corridor (Tampa&ndash;Orlando&ndash;Daytona) and South Florida (Miami&ndash;Fort Lauderdale&ndash;West Palm Beach) are the highest-volume markets. Target ages 25-44, Spanish-language media critical in Miami-Dade (67% Hispanic).
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                CTV/digital in Miami, Tampa, Orlando, Jacksonville metros. Radio in I-4 corridor. Spanish-language campaigns mandatory in South Florida.
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
                <span className="text-slate-gray">Trucking Workers</span>
                <span className="font-medium text-midnight-navy">
                  {fmtNum(BLS_FL.truckingWorkers)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Key Corridors</span>
                <span className="font-medium text-midnight-navy text-right">
                  I-95, I-75, I-4, FL Turnpike
                </span>
              </div>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3 mb-2">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">
                  Audience:
                </span>{" "}
                Florida&apos;s position as a logistics terminus (ports of Miami, Jacksonville, Tampa) drives heavy truck traffic. I-95 and I-75 are primary corridors. Target passenger vehicle occupants in truck-involved crashes.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Billboard corridors along I-95/I-75/I-4. Digital geo-fencing at truck stops and distribution hubs.
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
                  FLHSMV 2023 Motorcycle Fatalities
                </span>
                <span className="font-semibold text-midnight-navy">
                  {FLHSMV.motorcycleFatalities2023}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Top Counties</span>
                <span className="font-medium text-midnight-navy text-right">
                  {top5Moto.map((r) => r.county).join(", ")}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Helmet Law</span>
                <span className="font-medium text-midnight-navy text-right">
                  No requirement over 21 w/ $10K+ ins.
                </span>
              </div>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3 mb-2">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">
                  Audience:
                </span>{" "}
                Year-round riding season makes Florida a top motorcycle fatality state. Daytona Beach (Bike Week), South Florida, and Gulf Coast are hotspots. Target 35-64 males.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Year-round campaigns (no seasonal pause needed). Digital targeting motorcycle interest audiences. CTV during Bike Week, Biketoberfest. Radio in Daytona, Fort Myers, Tampa markets.
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
                  {fmtNum(BLS_FL.constructionWorkers)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">
                  Construction Fatalities (2024)
                </span>
                <span className="font-semibold text-midnight-navy">
                  {BLS_FL.constructionFatalities2024}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Fatality Rate</span>
                <span className="font-semibold text-midnight-navy">
                  {BLS_FL.workplaceFatalityRate}/100K FTE
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Employment Growth</span>
                <span className="font-medium text-emerald-600">
                  +{BLS_FL.constructionYoY}% YoY
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Falls Share of Fatalities</span>
                <span className="font-medium text-midnight-navy">
                  {BLS_FL.fallsSharePct}% (vs 17% national)
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Hispanic Worker Fatality Share</span>
                <span className="font-medium text-midnight-navy">
                  {BLS_FL.hispanicSharePct}%
                </span>
              </div>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3 mb-2">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">
                  Audience:
                </span>{" "}
                Florida&apos;s construction boom (628K workers, +4.5% growth) concentrated in South Florida, Orlando, Tampa, and Jacksonville. Hispanic workers are 42% of fatalities &mdash; Spanish-language outreach critical. Falls are the #1 construction cause.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Spanish-language radio and digital in Miami-Dade, Broward, Orange, Hillsborough. Target construction worker communities, safety supply stores. Geo-fence major development sites.
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
                <span className="text-slate-gray">National Ranking</span>
                <span className="font-semibold text-red-600">#1 in U.S.</span>
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
                #1 boating accident state. Monroe County (Florida Keys) and Miami-Dade lead. Target boat owners, marina communities, fishing charters. Spring break and summer peak seasons.
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                Seasonal digital + local radio around marinas and waterfront communities. Geo-target boat shows (Miami, Fort Lauderdale). CTV in Gulf Coast and Southeast FL markets.
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
          geometry={FL_COUNTY_GEOMETRY}
          viewBox={FL_VIEWBOX}
          stateName="Florida"
          csvFileName="florida-county-intelligence.csv"
          judicialProfiles={data.judicialProfiles}
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
            <p className="text-sm font-medium text-midnight-navy/60">
              County intelligence data loading...
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. RURAL-ROAD VS URBAN-ROAD ANALYSIS                        */}
      {/* ============================================================ */}
      <div className="rounded-lg bg-white p-6 shadow-sm border">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-2xl font-bold text-midnight-navy">
            Rural-Road vs. Urban-Road Analysis
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
                  78% of Florida&apos;s fatal crashes occur on rural-classified
                  roads &mdash; but this reflects road design, not geography.
                  Florida&apos;s high-speed, undivided highways in rapidly growing
                  suburban areas carry rural functional classifications despite
                  serving dense populations. These roads combine high speeds with
                  high traffic volumes, creating lethal conditions. Plaintiff firms
                  should target the I-4 corridor, US-27, US-441, and US-19 &mdash;
                  all classified as rural roads but running through populated areas.
                </p>
              </div>

              <div className="rounded-md border-l-4 border-intelligence-teal bg-intelligence-teal/5 px-4 py-3">
                <p className="text-sm text-midnight-navy/80">
                  Florida&apos;s {COMMUTE_FL.wfh}% WFH rate (vs 7.8% national
                  pre-pandemic) reflects its retiree and remote-worker economy.
                  High-carpool counties (Hardee {COMMUTE_FL.highCarpoolCounties[0].pct}%,
                  DeSoto {COMMUTE_FL.highCarpoolCounties[1].pct}%,
                  Hendry {COMMUTE_FL.highCarpoolCounties[3].pct}%) correlate with
                  agricultural and construction labor. St. Johns ({COMMUTE_FL.highWfhCounties[0].pct}% WFH)
                  represents the affluent suburban professional demographic.
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
          Florida&apos;s {data.msaDemographics.length} Metropolitan Statistical
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
                    const isBig6 = BIG6.some((m) =>
                      row.cbsa_title.startsWith(m)
                    );
                    return (
                      <tr
                        key={row.cbsa_code}
                        className={`border-b border-cloud/50 transition-colors ${
                          isBig6 ? "bg-intelligence-teal/5" : ""
                        }`}
                      >
                        <td className="py-2.5 pr-4 font-medium text-midnight-navy whitespace-nowrap">
                          {row.cbsa_title}
                          {isBig6 && (
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
                Florida&apos;s Big 6 metros &mdash; Miami-Fort Lauderdale (6.1M),
                Tampa-St. Petersburg (3.3M), Orlando-Kissimmee (2.7M),
                Jacksonville (1.7M), North Port-Sarasota (900K), and Cape
                Coral-Fort Myers (800K) &mdash; concentrate the majority of the
                state&apos;s population and PI case volume. Digital campaigns
                should prioritize these metros for reach, while supplementing with
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
                Florida&apos;s 2023 tort reform (HB 837) shifted the state from
                pure comparative to modified comparative negligence with a 51% bar.
                Despite this change, Florida retains strong plaintiff advantages:
                no non-economic damage caps for PI, high jury verdicts, and one of
                the largest population bases in the nation. The composite score of{" "}
                {piData.composite_score} reflects a state that remains highly
                viable for plaintiff firms.
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
      <PIAdvertisingSection stateAbbr="FL" onDataLoaded={handlePIAdDataLoaded} />

      {/* ============================================================ */}
      {/* 11. COMPETITIVE LANDSCAPE                                    */}
      {/* ============================================================ */}
      <CompetitiveLandscapeTable data={floridaCompetitiveData} />

      {/* ============================================================ */}
      {/* 11b. ADVERTISING INTELLIGENCE (Platform, Advertisers, etc.)  */}
      {/* ============================================================ */}
      <StateAdvertisingSection stateAbbr="FL" stateName="Florida" />

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
          {/* Insight 1: South Florida */}
          <div className="rounded-lg border border-intelligence-teal/30 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-intelligence-teal" />
              <h3 className="text-sm font-bold text-midnight-navy">
                South Florida: Nation&apos;s Densest PI Market
              </h3>
            </div>
            <div className="space-y-1.5 mb-3">
              <p className="text-xs text-midnight-navy/70">
                Miami-Dade + Broward + Palm Beach = <strong>6.1M</strong> population
              </p>
              <p className="text-xs text-midnight-navy/70">
                Combined fatal crashes: <strong>3,500+</strong> (FARS)
              </p>
              <p className="text-xs text-midnight-navy/70">
                Spanish-speaking population: <strong>67%</strong> in Miami-Dade
              </p>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                South Florida is the most competitive PI advertising market in the
                U.S. &mdash; saturated with plaintiff firms. Differentiation requires
                Spanish-language creative, community presence, and hyper-local
                targeting in underserved areas of Broward and Palm Beach vs.
                over-served Miami-Dade.
              </p>
            </div>
          </div>

          {/* Insight 2: I-4 Corridor */}
          <div className="rounded-lg border border-red-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-bold text-midnight-navy">
                The I-4 Corridor: Florida&apos;s Deadliest Road
              </h3>
            </div>
            <div className="space-y-1.5 mb-3">
              <p className="text-xs text-midnight-navy/70">
                I-4 connects Tampa to Daytona through Orlando
              </p>
              <p className="text-xs text-midnight-navy/70">
                One of America&apos;s most dangerous interstates
              </p>
              <p className="text-xs text-midnight-navy/70">
                Hillsborough + Orange + Volusia counties along the route
              </p>
            </div>
            <div className="rounded-md bg-red-50 border border-red-100 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                The I-4 corridor through central Florida is consistently ranked
                among the deadliest interstates in the U.S. Construction zones,
                tourist traffic, and high-speed design contribute to fatalities.
                Geo-fenced campaigns along I-4 with accident-triggered ad sequences
                can reach victims in the critical 24-72 hour window.
              </p>
            </div>
          </div>

          {/* Insight 3: Florida Keys Boating */}
          <div className="rounded-lg border border-intelligence-teal/30 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Anchor className="w-4 h-4 text-intelligence-teal" />
              <h3 className="text-sm font-bold text-midnight-navy">
                Florida Keys: Boating Accident Capital
              </h3>
            </div>
            <div className="space-y-1.5 mb-3">
              <p className="text-xs text-midnight-navy/70">
                Monroe County: <strong>425</strong> boating accidents (most in state)
              </p>
              <p className="text-xs text-midnight-navy/70">
                <strong>26</strong> deaths from boating in Monroe alone
              </p>
              <p className="text-xs text-midnight-navy/70">
                Mix of commercial fishing, charter boats, and recreational vessels
              </p>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                Monroe County&apos;s extreme boating accident concentration creates
                a niche PI market most firms overlook. Tourism-driven seasonal
                patterns (winter/spring peak) align with snowbird arrivals.
                Targeted campaigns during high season in Key West, Marathon, and
                Islamorada reach both local and visiting victims.
              </p>
            </div>
          </div>

          {/* Insight 4: Construction + Hispanic Workforce */}
          <div className="rounded-lg border border-amber-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <HardHat className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-midnight-navy">
                Construction Boom + Hispanic Workforce = Underserved Market
              </h3>
            </div>
            <div className="space-y-1.5 mb-3">
              <p className="text-xs text-midnight-navy/70">
                <strong>{fmtNum(BLS_FL.constructionWorkers)}</strong> construction
                workers (+{BLS_FL.constructionYoY}% YoY)
              </p>
              <p className="text-xs text-midnight-navy/70">
                <strong>{BLS_FL.hispanicSharePct}%</strong> of workplace fatalities
                are Hispanic workers
              </p>
              <p className="text-xs text-midnight-navy/70">
                <strong>{BLS_FL.constructionFatalities2024}</strong> construction
                fatalities in 2024
              </p>
            </div>
            <div className="rounded-md bg-amber-50 border border-amber-100 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                Florida&apos;s construction boom employs over 628K workers, with
                Hispanic workers disproportionately represented in both the
                workforce and fatalities. Spanish-language PI advertising for
                workplace injuries is significantly underserved relative to demand.
                Firms offering bilingual intake and culturally competent outreach
                have a structural advantage.
              </p>
            </div>
          </div>

          {/* Insight 5: Hurricane Season */}
          <div className="rounded-lg border border-amber-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <CloudLightning className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-midnight-navy">
                Hurricane Season: Compound Risk Window
              </h3>
            </div>
            <div className="space-y-1.5 mb-3">
              <p className="text-xs text-midnight-navy/70">
                <strong>{fmtNum(data.stormCount)}</strong> storm events in NOAA
                database
              </p>
              <p className="text-xs text-midnight-navy/70">
                73 hurricane events, 99 hurricane deaths
              </p>
              <p className="text-xs text-midnight-navy/70">
                538 tropical storm events
              </p>
            </div>
            <div className="rounded-md bg-amber-50 border border-amber-100 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                Florida&apos;s June&ndash;November hurricane season creates compound
                risk &mdash; traffic accidents during evacuations, property damage,
                workplace injuries during cleanup, and boating incidents.
                Storm-triggered advertising campaigns can be pre-built and activated
                when named storms approach. Post-storm, target cleanup workers and
                displaced residents.
              </p>
            </div>
          </div>

          {/* Insight 6: Pedestrian & Cyclist Fatality Crisis */}
          <div className="rounded-lg border border-red-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-bold text-midnight-navy">
                Pedestrian &amp; Cyclist Fatality Crisis
              </h3>
            </div>
            <div className="space-y-1.5 mb-3">
              <p className="text-xs text-midnight-navy/70">
                <strong>{FLHSMV.pedestrianFatalities2023}</strong> pedestrian
                fatalities (2023)
              </p>
              <p className="text-xs text-midnight-navy/70">
                <strong>{FLHSMV.bicycleFatalities2023}</strong> cyclist fatalities
                (2023)
              </p>
              <p className="text-xs text-midnight-navy/70">
                Florida leads nation in pedestrian fatality rate
              </p>
            </div>
            <div className="rounded-md bg-red-50 border border-red-100 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                Florida has the highest pedestrian fatality rate in the nation,
                concentrated in sprawling suburban areas with inadequate sidewalks.
                Orlando, Tampa, and Jacksonville metros are worst. This is a
                distinct case type from MVA &mdash; target walk-to-work
                demographics, transit users, and cycling communities with separate
                campaigns.
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
          pageName: "Florida State Intelligence",
          pageDescription:
            "State-level intelligence for plaintiff firm advertising and case acquisition in Florida — combining FARS accident data, census demographics, judicial profiles, PI viability scores, storm events, boating accidents, cancer incidence, and market opportunity signals.",
          dataSummary: `State: Florida. Negligence: ${formatNegligenceRule(piData?.negligence_rule ?? 'modified_51')}. PI Viability: ${piData?.composite_score ?? 'N/A'} composite. Fatal Crashes (FARS): ${totalFatalCrashes.toLocaleString()}. Total Deaths: ${totalDeaths.toLocaleString()}. Counties: 67. Top counties by deaths: ${[...data.accidentSummary].sort((a, b) => b.total_deaths - a.total_deaths).slice(0, 5).map(r => r.county).join(', ')}. Judicial profile mix: ${Object.entries(profileCounts).map(([p, c]) => `${c} ${p}`).join(', ')}. Storm events: ${data.stormCount.toLocaleString()}. Truck deaths: ${totalTruckDeaths.toLocaleString()}. Motorcycle deaths: ${totalMotoDeaths.toLocaleString()}. Boating accidents: ${totalBoatingAccidents.toLocaleString()}. Construction workers: ${BLS_FL.constructionWorkers.toLocaleString()}. Key corridors: I-95, I-75, I-4, FL Turnpike.${piAdData ? ` ${buildPIAdSummary(piAdData)}` : ''}`,
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
            "FLHSMV Crash Facts 2023",
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
          Data sources: FARS (NHTSA), FLHSMV Crash Facts 2023, ACS 5-Year
          Estimates, BLS QCEW/CFOI, NOAA Storm Events, USCG Boating Accidents,
          Judicial Profile Data.
        </p>
      </div>
    </div>
  );
}
