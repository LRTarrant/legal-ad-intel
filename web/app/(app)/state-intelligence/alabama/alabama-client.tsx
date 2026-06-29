"use client";

import { useMemo, useEffect } from "react";
import { BuildCampaignLink } from "../../components/build-campaign-link";
import { SectionHeading } from "@/components/state-intelligence/SectionHeading";
import { SnapshotCard } from "@/components/state-intelligence/SnapshotCard";
import { VerdictCard, ScoreChip } from "@/components/state-intelligence/VerdictCard";
import {
  DataHealthBanner,
  RetryButton,
} from "@/components/state-intelligence/DataHealthBanner";
import { viabilityBand, scoreColor } from "@/components/state-intelligence/viability";
import {
  Car,
  Truck,
  Bike,
  HardHat,
  Anchor,
  TrendingUp,
  FileText,
  MapPin,
  CloudLightning,
  Database,
  Compass,
  ArrowRight,
  Check,
  CalendarClock,
} from "lucide-react";
import Link from "next/link";
import type { JudicialProfileRow } from "@/lib/queries/judicial";
import { AskAIPanel } from "../../components/ask-ai-panel";
import { trackStateViewed } from "@/lib/analytics";
import {
  CountyIntelligenceMap,
  FARS_DATA_YEARS,
  BOATING_DATA_YEARS,
} from "../../components/county-intelligence-map";
import {
  COUNTY_GEOMETRY as AL_COUNTY_GEOMETRY,
  VIEWBOX as AL_VIEWBOX,
} from "@/lib/data/state-geometry/alabama";
import { CompetitiveAnalysis } from "../../components/competitive/competitive-analysis-section";
import { LegalNewsSection } from "../../components/legal-news/legal-news-section";

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

/** Per-dataset fetch-failure flags. `true` = that dataset's fetch rejected,
 *  so the UI must show an explicit "unavailable" state instead of a misleading zero. */
export interface AlabamaDataErrors {
  accidentSummary: boolean;
  ruralUrban: boolean;
  stormSummary: boolean;
  boatingSummary: boolean;
  piViability: boolean;
  censusDemographics: boolean;
  msaDemographics: boolean;
  judicialProfiles: boolean;
  stormCount: boolean;
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
  errors: AlabamaDataErrors;
}

const DATASET_LABELS: Record<keyof AlabamaDataErrors, string> = {
  accidentSummary: "Accident & crash data",
  ruralUrban: "Rural/urban comparison",
  stormSummary: "Storm events",
  boatingSummary: "Boating accidents",
  piViability: "PI viability scores",
  censusDemographics: "Census demographics",
  msaDemographics: "Metro demographics",
  judicialProfiles: "Judicial profiles",
  stormCount: "Storm count",
};

/* ------------------------------------------------------------------ */
/*  Hardcoded Constants (ALDOT, BLS)                                   */
/* ------------------------------------------------------------------ */

const ALDOT = {
  largeTruckFatalities: 134,
  motorcycleFatalities: 92,
  impairedDrivingDeaths: 196,
};

const BLS = {
  constructionWorkers: 101_300,
  constructionYoY: 2.2,
  truckingWorkers: 26_934,
  workplaceFatalityRate: 3.6,
  constructionFatalities: 15,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatNegligenceRule(rule: string): string {
  const map: Record<string, string> = {
    pure_comparative: "Pure Comparative",
    modified_51: "Modified Comparative (51% Bar)",
    modified_50: "Modified Comparative (50% Bar)",
    contributory: "Contributory",
  };
  return map[rule] || rule;
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

function fmtCur(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtMillions(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toLocaleString();
}

/* Section anchors, shared by the desktop nav and the mobile jump menu.
   Activity (the lifted live carousel) now sits at the top of the page,
   above Overview, so it leads the nav. */
const SECTION_NAV: [string, string][] = [
  ["#activity", "Activity"],
  ["#overview", "Overview"],
  ["#legal", "Legal"],
  ["#competition", "Competition"],
  ["#strategy", "Strategy"],
  ["#signals", "Signals"],
  ["#sources", "Sources"],
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AlabamaClient({ data }: { data: AlabamaPageData }) {
  useEffect(() => {
    trackStateViewed({ state_code: "AL", state_name: "Alabama" });
  }, []);

  const piData = data.piViability;

  /* -- Aggregate stats -- */
  const totalFatalCrashes = data.accidentSummary.reduce((s, r) => s + r.fatal_crashes, 0);
  const totalDeaths = data.accidentSummary.reduce((s, r) => s + r.total_deaths, 0);
  const totalTruckDeaths = data.accidentSummary.reduce((s, r) => s + r.truck_deaths, 0);
  const totalMotoDeaths = data.accidentSummary.reduce((s, r) => s + r.moto_deaths, 0);
  const totalBoatingAccidents = data.boatingSummary.reduce((s, r) => s + r.accident_count, 0);
  const mvaDeaths = totalDeaths - totalTruckDeaths - totalMotoDeaths;

  const statePopulation = data.censusDemographics.reduce(
    (s, d) => s + (d.total_population || 0),
    0,
  );

  /* -- Top 5 counties per case type -- */
  const top5MVA = [...data.accidentSummary]
    .map((r) => ({ county: r.county, count: r.total_deaths - r.truck_deaths - r.moto_deaths }))
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

  const judConservative = profileCounts["Conservative"] ?? 0;
  const judLiberal = profileCounts["Liberal"] ?? 0;
  const judModerate = profileCounts["Moderate"] ?? 0;
  const judTotal = judConservative + judLiberal + judModerate || 1;

  const composite = piData?.composite_score ?? 0;
  const band = viabilityBand(Number(composite));

  const componentScores = piData
    ? [
        { name: "Negligence rule", score: piData.negligence_score ?? 0 },
        { name: "Non-economic caps", score: piData.non_economic_score ?? 0 },
        { name: "Punitive caps", score: piData.punitive_score ?? 0 },
        { name: "Med-mal caps", score: piData.med_mal_score ?? 0 },
        { name: "Statute of limitations", score: piData.sol_score ?? 0 },
        { name: "Jury verdicts", score: piData.verdict_score ?? 0 },
      ]
    : [];

  const failedDatasets = (Object.keys(data.errors) as (keyof AlabamaDataErrors)[])
    .filter((k) => data.errors[k])
    .map((k) => DATASET_LABELS[k]);

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* DATA-HEALTH BANNER (only when a fetch actually failed)       */}
      {/* ============================================================ */}
      {failedDatasets.length > 0 && (
        <DataHealthBanner stateName="Alabama" failed={failedDatasets} />
      )}

      {/* ============================================================ */}
      {/* STICKY CONTEXT BAR                                           */}
      {/* ============================================================ */}
      <div className="sticky top-0 z-30 -mx-4 border-b border-cloud bg-white/90 px-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex h-13 items-center gap-3 py-2.5">
          <span className="text-base font-bold text-midnight-navy">Alabama</span>
          <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-red-600">
            Contributory
          </span>
          <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10.5px] font-bold text-amber-600">
            Viability {composite || "—"}
          </span>
          <nav className="ml-auto hidden items-center gap-4 md:flex">
            {SECTION_NAV.map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="text-[13px] font-semibold text-slate-gray hover:text-midnight-navy"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Mobile: the desktop anchor bar is hidden, so give a compact jump
              menu (the page is 7 long sections). */}
          <select
            aria-label="Jump to section"
            defaultValue=""
            onChange={(e) => {
              const id = e.target.value;
              if (id) document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
              e.target.selectedIndex = 0;
            }}
            className="ml-auto rounded-lg border border-cloud bg-white px-2.5 py-1 text-[13px] font-semibold text-slate-gray md:hidden"
          >
            <option value="" disabled>
              Jump to&hellip;
            </option>
            {SECTION_NAV.map(([href, label]) => (
              <option key={href} value={href.slice(1)}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ============================================================ */}
      {/* HERO (Design D — A's structure + B's copy)                  */}
      {/* ============================================================ */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-intelligence-teal">
              Alabama · State Intelligence
            </span>
            <span className="rounded-full border border-red-300 bg-red-50 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-red-600">
              Contributory Negligence
            </span>
          </div>
          <h1 className="mt-3 font-heading text-3xl font-bold leading-[1.15] text-midnight-navy sm:text-[2.1rem]">
            We turn{" "}
            <span className="text-intelligence-teal">where accidents actually happen</span>{" "}
            into a strategy built for your budget &mdash; and a campaign you can launch.
          </h1>
          <p className="mt-3.5 max-w-2xl text-base leading-relaxed text-slate-gray">
            Real accident, boating &amp; construction data, matched to local demographics
            and live competition. No guesswork &mdash; every number carries its source.
          </p>
        </div>

        {/* CTAs anchored right; caption underneath. */}
        <div className="flex flex-none flex-col gap-2.5 lg:items-end">
          {/* Strategy is the primary path (filled); campaign is the quieter
              secondary — matching the "strategy first" caption below. */}
          <div className="flex flex-col gap-2.5 sm:flex-row lg:justify-end">
            <Link
              href="/strategy?state=AL"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-intelligence-teal px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-intelligence-teal/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-intelligence-teal focus-visible:ring-offset-2"
            >
              <Compass className="h-4 w-4" />
              Build Media Strategy
            </Link>
            <BuildCampaignLink
              variant={{ kind: "personal_injury", stateCode: "AL", stateName: "Alabama" }}
              tone="ghost"
            />
          </div>
          <p className="text-[11.5px] text-slate-gray lg:text-right">
            Strategy first &mdash; the campaign builds from it.
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* LIVE CAROUSEL — lifted to the top as a dark "live feed"      */}
      {/* hero block (id="activity" lives inside the component).       */}
      {/* ============================================================ */}
      <LegalNewsSection stateName="Alabama" stateCode="AL" hero />

      {/* ============================================================ */}
      {/* PIPELINE STRIP — process map only (CTAs live in the hero)    */}
      {/* ============================================================ */}
      <div className="rounded-2xl border border-cloud bg-white px-5 py-4 shadow-sm">
        <ol className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2">
          <PipelineStep n={1} label="Read the data" state="done" />
          <PipelineArrow />
          <PipelineStep n={2} label="Build strategy" state="active" />
          <PipelineArrow />
          <PipelineStep n={3} label="Launch campaign" state="todo" />
        </ol>
      </div>

      {/* ============================================================ */}
      {/* THE VERDICT                                                  */}
      {/* ============================================================ */}
      <div>
        <div className="mb-3 flex items-center gap-2.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-gray">
            The verdict
          </span>
          <span className="h-px flex-1 bg-cloud" />
          <span className="text-[11.5px] text-slate-gray">
            Should a firm advertise here &mdash; and where?
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <VerdictCard
            top="#E0A030"
            label="PI viability"
            value={composite ? String(composite) : "—"}
            valueSuffix="/100"
            chip={band.label}
            chipTone={band.tone}
            note="Strong caps & verdicts, dragged down by the negligence rule."
          />
          <VerdictCard
            top="#DC2626"
            label="Negligence rule"
            value="Contributory"
            chip="High bar"
            chipTone="bad"
            note="1 of 4 states (+DC). Any plaintiff fault bars recovery."
          />
          <VerdictCard
            top="#16A34A"
            label="Top opportunity"
            value="Motor Vehicle"
            chip="High demand"
            chipTone="good"
            note={`${fmtNum(mvaDeaths)} MVA deaths · concentrated in the Birmingham DMA.`}
          />
          <VerdictCard
            top="#2E5077"
            label="Competition"
            value="Moderate"
            chip="Metros crowded"
            chipTone="info"
            note="Shunnarah & Morgan dominate; the metros are crowded."
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 1 — ALABAMA OVERVIEW                                 */}
      {/* ============================================================ */}
      <div id="overview" className="scroll-mt-20">
        <SectionHeading n={1} title="Alabama Overview" />

        {/* snapshot stat row */}
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <SnapshotCard
            label="Population"
            value={statePopulation ? fmtMillions(statePopulation) : "—"}
            sub="2024 Census (county sum)"
          />
          <SnapshotCard
            label="Fatal Crashes"
            value={fmtNum(totalFatalCrashes)}
            sub="2019–2024 · FARS"
          />
          <SnapshotCard
            label="Counties"
            value={String(data.judicialProfiles.length || 67)}
            sub={`${judConservative} Cons · ${judLiberal} Lib · ${judModerate} Mod`}
          />
          <SnapshotCard label="Top DMA" value="Birmingham" sub="1.18M · DMA 630" valueText />
        </div>

        {/* County Intelligence (live component — ship as-is, moved to top) */}
        <div className="mt-4">
          {data.accidentSummary.length > 0 ? (
            <CountyIntelligenceMap
              rows={data.accidentSummary}
              geometry={AL_COUNTY_GEOMETRY}
              viewBox={AL_VIEWBOX}
              stateName="Alabama"
              stateCode="AL"
              csvFileName="alabama-county-intelligence.csv"
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
            <div className="rounded-lg border border-cloud bg-white p-6 shadow-sm">
              <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
                <Database className="mx-auto mb-3 h-8 w-8 text-slate-gray/40" />
                <p className="text-sm font-medium text-slate-gray">
                  {data.errors.accidentSummary
                    ? "County intelligence couldn't be loaded right now."
                    : "No county intelligence is available for Alabama yet."}
                </p>
                {data.errors.accidentSummary && (
                  <div className="mt-3 flex justify-center">
                    <RetryButton />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 2 — LEGAL LANDSCAPE & PI VIABILITY                   */}
      {/* ============================================================ */}
      <div id="legal" className="scroll-mt-20">
        <SectionHeading n={2} title="Legal Landscape & PI Viability" />

        <div className="rounded-xl border border-cloud bg-white p-6 shadow-sm">
          <h3 className="font-heading text-xl font-bold text-midnight-navy">
            Should a firm bring PI cases in Alabama?
          </h3>
          <p className="mt-1.5 text-sm text-slate-gray">
            Negligence rule, statute, damage caps, judicial mix and case-type
            demand &mdash; one combined read on PI viability.
          </p>

          {piData ? (
            <>
              {/* viability + facts */}
              <div className="mt-5 grid gap-5 lg:grid-cols-[300px_1fr]">
                {/* composite panel */}
                <div className="flex flex-col rounded-xl bg-cloud/40 p-5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
                    Composite PI viability
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-mono text-5xl font-semibold text-midnight-navy">
                      {composite}
                    </span>
                    <span className="font-mono text-base text-slate-gray">/ 100</span>
                  </div>
                  <ScoreChip band={band} />
                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-cloud">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${composite}%`,
                        background: scoreColor(Number(composite)),
                      }}
                    />
                  </div>
                  <p className="mt-3.5 text-[12.5px] leading-relaxed text-slate-gray">
                    Strong damage-cap and jury-verdict signals are pulled down by
                    Alabama&apos;s{" "}
                    <span className="font-semibold text-red-600">
                      pure contributory negligence
                    </span>{" "}
                    rule &mdash; the single biggest drag on viability.
                  </p>
                </div>

                {/* facts grid */}
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-cloud sm:grid-cols-3">
                  <Fact
                    label="Negligence rule"
                    value={formatNegligenceRule(piData.negligence_rule)}
                    valueClass="text-red-600"
                    note="Any plaintiff fault bars recovery. 1 of 4 states (+DC)."
                  />
                  <Fact
                    label="Statute of limitations"
                    value={piData.statute_of_limitations}
                    note="From date of injury."
                  />
                  <Fact
                    label="Non-econ caps"
                    value={piData.non_economic_cap ?? "None"}
                    note="Personal injury."
                  />
                  <Fact
                    label="Punitive caps"
                    value={piData.punitive_cap ?? "None"}
                    note="Statutory limit."
                  />
                  <Fact
                    label="Avg. jury verdict"
                    value={
                      piData.avg_jury_verdict != null
                        ? typeof piData.avg_jury_verdict === "string" &&
                          /^[a-zA-Z]/.test(piData.avg_jury_verdict)
                          ? piData.avg_jury_verdict
                          : fmtCur(Number(piData.avg_jury_verdict))
                        : "—"
                    }
                    note="Median PI award."
                  />
                  <Fact label="Composite score" value={String(composite)} note="0–100 scale." />
                </div>
              </div>

              {/* component scores + judicial mix */}
              <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
                <div>
                  <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
                    Component scores
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {componentScores.map((c) => (
                      <div key={c.name} className="flex items-center gap-3">
                        <span className="w-[150px] flex-none text-[12.5px] text-slate-gray">
                          {c.name}
                        </span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-cloud">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${c.score}%`,
                              background: scoreColor(c.score),
                            }}
                          />
                        </div>
                        <span className="w-9 flex-none text-right font-mono text-[12.5px] font-semibold text-midnight-navy">
                          {c.score}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
                    Judicial profile mix
                  </div>
                  <div className="flex h-2.5 overflow-hidden rounded-full border border-cloud">
                    <div
                      style={{ width: `${(judConservative / judTotal) * 100}%`, background: "#D64550" }}
                    />
                    <div
                      style={{ width: `${(judLiberal / judTotal) * 100}%`, background: "#2F6FED" }}
                    />
                    <div
                      style={{ width: `${(judModerate / judTotal) * 100}%`, background: "#E0A030" }}
                    />
                  </div>
                  <div className="mt-3.5 flex flex-col gap-2">
                    <JudRow color="#D64550" label="Conservative" count={judConservative} />
                    <JudRow color="#2F6FED" label="Liberal" count={judLiberal} />
                    <JudRow color="#E0A030" label="Moderate" count={judModerate} />
                  </div>
                </div>
              </div>

              {/* case-type opportunities */}
              <div id="case-types" className="mt-7 scroll-mt-20">
                <div className="mb-4 flex flex-wrap items-baseline gap-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
                    Case-type opportunities
                  </div>
                  <div className="text-xs text-slate-gray">
                    Data-driven audience &amp; media recommendations by case type
                  </div>
                </div>
                <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
                  <CaseCard
                    icon={<Car className="h-4 w-4 text-midnight-navy" />}
                    title="Motor Vehicle"
                    demand="High demand"
                    demandTone="good"
                    stat={fmtNum(mvaDeaths)}
                    statLabel="MVA fatal deaths · 2019–24"
                    counties={top5MVA.slice(0, 3).map((r) => r.county).join(" · ")}
                    audience="Adults 25–44 in high-fatality rural counties — carpool corridors like Winston, DeKalb & Franklin skew blue-collar with heavy road exposure. Impaired driving drives ~20% of fatalities."
                    media="Radio + digital in rural markets; CTV in Birmingham, Huntsville & Mobile metros. Lean into holiday-weekend and DUI-enforcement windows."
                  />
                  <CaseCard
                    icon={<Truck className="h-4 w-4 text-midnight-navy" />}
                    title="Large Truck"
                    demand="High demand"
                    demandTone="good"
                    stat={fmtNum(totalTruckDeaths)}
                    statLabel="Truck fatal deaths · 2019–24"
                    counties={top5Truck.slice(0, 3).map((r) => r.county).join(" · ")}
                    audience="Families of CDL holders and occupants of passenger vehicles struck along commercial corridors — I-65, I-20 & I-59 carry the heaviest freight traffic."
                    media="Billboard corridors plus digital geo-fencing along the major interstates where collisions concentrate."
                  />
                  <CaseCard
                    icon={<Bike className="h-4 w-4 text-midnight-navy" />}
                    title="Motorcycle"
                    demand="Moderate"
                    demandTone="mid"
                    stat={fmtNum(totalMotoDeaths)}
                    statLabel="Motorcycle deaths · 2019–24"
                    counties={top5Moto.slice(0, 3).map((r) => r.county).join(" · ")}
                    audience="Males 35–64 in suburban/exurban counties; Baldwin, Mobile & Jefferson carry the highest rider volume."
                    media="Seasonal spring/summer flights — social plus streaming audio against motorcycle-enthusiast interests."
                  />
                  <CaseCard
                    icon={<HardHat className="h-4 w-4 text-midnight-navy" />}
                    title="Construction"
                    demand="Moderate"
                    demandTone="mid"
                    stat={fmtNum(BLS.constructionFatalities)}
                    statLabel="On-site fatalities · 2023"
                    counties="Franklin · DeKalb · Cullman"
                    audience="Construction-boom counties with rising employment — reach workers' families, union halls and safety-equipment retailers."
                    media="Spanish-language media in Franklin/DeKalb (high Hispanic workforce); radio across rural construction corridors."
                  />
                  <CaseCard
                    icon={<Anchor className="h-4 w-4 text-midnight-navy" />}
                    title="Boating"
                    demand="Seasonal"
                    demandTone="info"
                    stat={fmtNum(totalBoatingAccidents)}
                    statLabel="Boating accidents · USCG 2019–23"
                    counties={data.boatingSummary.slice(0, 3).map((r) => r.county).join(" · ")}
                    audience="Lakefront and Gulf Coast counties — boating-enthusiast and marina-adjacent demographics around Baldwin & Mobile."
                    media="Seasonal spring/summer; local radio + geo-targeted digital around major waterways and launch points."
                  />
                </div>
              </div>

              {/* insight callout */}
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3.5">
                <p className="text-[13px] leading-relaxed text-midnight-navy/80">
                  Because any plaintiff fault bars recovery here,{" "}
                  <strong>case selection and clear-liability evidence</strong> are
                  the deciding factor for advertising ROI. Target cases with
                  unambiguous defendant fault.
                </p>
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
              <Database className="mx-auto mb-3 h-8 w-8 text-slate-gray/40" />
              <p className="text-sm font-medium text-slate-gray">
                {data.errors.piViability
                  ? "PI viability scores couldn't be loaded right now."
                  : "PI viability scores are not available for Alabama yet."}
              </p>
              {data.errors.piViability && (
                <div className="mt-3 flex justify-center">
                  <RetryButton />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 3 — COMPETITIVE ANALYSIS                             */}
      {/* ============================================================ */}
      <CompetitiveAnalysis stateName="Alabama" stateCode="AL" sectionNumber={3} />

      {/* ============================================================ */}
      {/* SECTION 4 — STRATEGY ENGINE (CTA → standalone Strategy Engine) */}
      {/* ============================================================ */}
      <div id="strategy" className="scroll-mt-20">
        <SectionHeading n={4} title="Put It Into Action" />
        <div className="rounded-xl border border-intelligence-teal/20 bg-gradient-to-br from-intelligence-teal/[0.04] to-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-intelligence-teal/10">
                <Compass className="h-5 w-5 text-intelligence-teal" />
              </span>
              <div>
                <h3 className="mb-1 font-heading text-xl font-bold text-midnight-navy">
                  Ready to act on this?
                </h3>
                <p className="max-w-2xl text-sm text-slate-gray">
                  You&apos;ve seen the exposure, the legal landscape, and who you&apos;re up
                  against. Turn it into a defensible, data-traced strategy &mdash; every number
                  carries its source &mdash; then hand it to the Campaign Builder to produce
                  the ads.
                </p>
              </div>
            </div>
            <Link
              href="/strategy?state=AL"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-intelligence-teal px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-intelligence-teal/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-intelligence-teal focus-visible:ring-offset-2"
            >
              Build the Alabama strategy
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 5 — PROPRIETARY SIGNALS                              */}
      {/* ============================================================ */}
      <div id="signals" className="scroll-mt-20">
        <SectionHeading n={5} title="Proprietary Signals" />
        <div className="rounded-xl border border-intelligence-teal/20 bg-gradient-to-br from-intelligence-teal/[0.04] to-white p-6 shadow-sm">
          <h3 className="mb-1 font-heading text-xl font-bold text-midnight-navy">
            Cross-signal insights
          </h3>
          <p className="mb-6 text-sm text-slate-gray">
            Non-obvious opportunities surfaced by cross-referencing multiple data
            sources — what the raw numbers alone won&apos;t tell you.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <SignalCard
              icon={<MapPin className="h-4 w-4 text-amber-500" />}
              tone="amber"
              title="Greene County is a media desert"
              facts={[
                "Highest fatality rate in the state — 552 per 100K",
                "High poverty and low home-internet penetration",
              ]}
              body="Radio and community outreach are the only channels that reliably reach this high-fatality county. A digital-first plan misses it entirely."
            />
            <SignalCard
              icon={<CalendarClock className="h-4 w-4 text-red-500" />}
              tone="red"
              title="DUI deaths spike on a calendar"
              facts={[
                `~1 in 5 Alabama traffic deaths are impaired (≈${fmtNum(ALDOT.impairedDrivingDeaths)}/yr)`,
                "Clustered on holiday weekends",
              ]}
              body="Time-triggered campaigns around holiday-weekend and DUI-enforcement windows catch victims while they're actively searching."
            />
            <SignalCard
              icon={<HardHat className="h-4 w-4 text-steel-blue" />}
              tone="steel"
              title="Construction Boom + High Road Fatalities"
              facts={[
                `Construction employment up ${BLS.constructionYoY}% YoY (${fmtNum(BLS.constructionWorkers)} workers)`,
                `${BLS.constructionFatalities} construction fatalities in 2023`,
                "High-carpool counties (Winston, DeKalb) overlap with construction workforce",
              ]}
              body="Growing construction activity creates both workplace injury cases and increased road exposure for commuters. Target construction accident AND MVA cases in these corridors simultaneously."
            />
            <SignalCard
              icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
              tone="emerald"
              title="Huntsville-Madison: Tech Growth Creates New PI Market"
              facts={[
                "Madison County WFH rate: 13.6% (among highest)",
                "Huntsville MSA population: 517K (fastest-growing metro)",
              ]}
              body="Rapid population growth + infrastructure lag = rising accident rates. Digital-first advertising strategy viable here given high internet penetration. Early mover advantage for plaintiff firms establishing market presence."
            />
            <SignalCard
              icon={<CloudLightning className="h-4 w-4 text-amber-500" />}
              tone="amber"
              title="Tornado Alley Overlap with High-Fatality Counties"
              facts={[
                `Storm events: ${fmtNum(data.stormCount)} NOAA records`,
                "Multiple high-fatality counties also in tornado-prone areas",
              ]}
              body="Property damage and injury from severe weather can compound with traffic incidents during evacuations and storm response. Consider weather-triggered advertising campaigns in storm season."
            />
            <SignalCard
              icon={<Truck className="h-4 w-4 text-steel-blue" />}
              tone="steel"
              title="Interstate Corridors: Trucking + MVA Convergence"
              facts={[
                "I-65 (Birmingham to Mobile), I-20 (Birmingham to Atlanta), I-59 (Birmingham to Chattanooga)",
                `${ALDOT.largeTruckFatalities} truck fatalities (2023), ${fmtNum(BLS.truckingWorkers)} trucking workers`,
              ]}
              body="Alabama's position as a Southeast logistics hub means heavy commercial truck traffic on interstates. Geo-fence digital ads along I-65/I-20/I-59 corridors targeting truck accident victims. Billboards at major truck stops reach CDL drivers for workplace injury cases."
            />
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
            "State-level intelligence for plaintiff firm advertising and case acquisition in Alabama — FARS accident data, census demographics, judicial profiles, PI viability scores, storm events, and PI-firm competition by market across MVA, trucking, motorcycle, construction, and boating.",
          dataSummary: `State: Alabama. Negligence: ${formatNegligenceRule(piData?.negligence_rule ?? "contributory")} (plaintiff barred if any fault). PI Viability: ${composite || "N/A"} composite. Fatal Crashes (FARS): ${totalFatalCrashes.toLocaleString()}. Total Deaths: ${totalDeaths.toLocaleString()}. Counties: ${data.judicialProfiles.length || 67}. Top counties by deaths: ${[...data.accidentSummary].sort((a, b) => b.total_deaths - a.total_deaths).slice(0, 5).map((r) => r.county).join(", ")}. Judicial profile mix: ${judConservative} Conservative, ${judLiberal} Liberal, ${judModerate} Moderate. Storm events: ${data.stormCount.toLocaleString()}. Truck deaths: ${totalTruckDeaths.toLocaleString()}. Motorcycle deaths: ${totalMotoDeaths.toLocaleString()}. Boating accidents: ${totalBoatingAccidents.toLocaleString()}. Construction workers: ${BLS.constructionWorkers.toLocaleString()}. Key corridors: I-65, I-20, I-10, US-280.`,
        }}
      />

      {/* ============================================================ */}
      {/* SECTION 6 — SOURCES & METHODOLOGY                            */}
      {/* ============================================================ */}
      <div id="sources" className="scroll-mt-20">
        <SectionHeading n={6} title="Sources & Methodology" />
        <div className="rounded-xl border border-cloud bg-white p-6 shadow-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              "FARS (NHTSA) — Fatal crash data 2019–2024",
              "ALDOT Crash Facts 2023",
              "ACS 5-Year Estimates 2023 (Census Bureau)",
              "BLS QCEW (Quarterly Census of Employment and Wages) 2023",
              "BLS CFOI (Census of Fatal Occupational Injuries) 2021–2024",
              "NOAA Storm Events Database",
              "USCG Boating Accident Report Database",
              "Google / Meta / YouTube ad observations (LMI pipelines)",
              "Google News / OSHA / CourtListener — single-incident legal news feed",
              "Court records / judicial profile data",
            ].map((source) => (
              <div
                key={source}
                className="flex items-start gap-2 rounded-md bg-cloud/60 px-3 py-2"
              >
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-gray" />
                <p className="text-xs text-midnight-navy/80">{source}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-cloud bg-cloud/40 p-5">
          <p className="text-xs leading-relaxed text-slate-gray">
            This page is refreshed periodically. Content reflects research and
            publicly available data as of the date shown. This page does not
            constitute legal advice.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Presentational subcomponents                                       */
/* ------------------------------------------------------------------ */

/* Pipeline strip — Read the data → Build strategy → Launch campaign. */
function PipelineStep({
  n,
  label,
  state,
}: {
  n: number;
  label: string;
  state: "done" | "active" | "todo";
}) {
  const dot =
    state === "done"
      ? "bg-intelligence-teal text-white"
      : state === "active"
        ? "bg-intelligence-teal text-white ring-2 ring-intelligence-teal/25 ring-offset-2"
        : "bg-cloud text-slate-gray";
  const text =
    state === "todo"
      ? "text-slate-gray"
      : state === "active"
        ? "font-bold text-midnight-navy"
        : "font-semibold text-midnight-navy";
  return (
    <li className="flex items-center gap-2" aria-current={state === "active" ? "step" : undefined}>
      <span
        className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11px] font-bold ${dot}`}
      >
        {state === "done" ? <Check className="h-3.5 w-3.5" aria-hidden /> : n}
      </span>
      <span className={`text-[13px] ${text}`}>
        {state === "done" && <span className="sr-only">Completed: </span>}
        {label}
      </span>
    </li>
  );
}

function PipelineArrow() {
  return <ArrowRight className="h-4 w-4 flex-none text-slate-gray/35" aria-hidden />;
}

function Fact({
  label,
  value,
  note,
  valueClass,
}: {
  label: string;
  value: string;
  note: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
        {label}
      </div>
      <div className={`mt-1.5 text-[17px] font-bold ${valueClass ?? "text-midnight-navy"}`}>
        {value}
      </div>
      <div className="mt-1 text-[11.5px] leading-snug text-slate-gray">{note}</div>
    </div>
  );
}

function JudRow({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="h-3 w-3 flex-none rounded"
        style={{ background: color }}
      />
      <span className="text-[13px] font-medium text-midnight-navy">{label}</span>
      <span className="ml-auto font-mono text-[12.5px] text-slate-gray">
        {count} counties
      </span>
    </div>
  );
}

const DEMAND_TONES: Record<string, string> = {
  good: "bg-emerald-50 text-emerald-700",
  mid: "bg-amber-50 text-amber-600",
  info: "bg-blue-50 text-blue-700",
};

function CaseCard({
  icon,
  title,
  demand,
  demandTone,
  stat,
  statLabel,
  counties,
  audience,
  media,
}: {
  icon: React.ReactNode;
  title: string;
  demand: string;
  demandTone: "good" | "mid" | "info";
  stat: string;
  statLabel: string;
  counties: string;
  audience: string;
  media: string;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-cloud border-t-[3px] border-t-midnight-navy bg-white p-4">
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-[15px] font-bold text-midnight-navy">{title}</span>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${DEMAND_TONES[demandTone]}`}
        >
          {demand}
        </span>
      </div>
      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="font-mono text-2xl font-semibold text-midnight-navy">{stat}</span>
        <span className="text-[11.5px] text-slate-gray">{statLabel}</span>
      </div>
      {counties && (
        <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-slate-gray">
          <MapPin className="h-3 w-3 flex-none text-slate-gray" />
          {counties}
        </div>
      )}
      <div className="mt-3 rounded-lg border border-cloud bg-cloud/40 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
          Audience
        </div>
        <p className="mt-1 text-xs leading-relaxed text-midnight-navy/75">{audience}</p>
      </div>
      <div className="mt-2 rounded-lg border border-cloud bg-cloud/40 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
          Media
        </div>
        <p className="mt-1 text-xs leading-relaxed text-midnight-navy/75">{media}</p>
      </div>
    </div>
  );
}

const SIGNAL_TONES: Record<string, { border: string; chip: string }> = {
  red: { border: "border-red-200", chip: "bg-red-50 border-red-100" },
  steel: { border: "border-steel-blue/30", chip: "bg-steel-blue/5 border-steel-blue/20" },
  emerald: { border: "border-emerald-200", chip: "bg-emerald-50 border-emerald-100" },
  amber: { border: "border-amber-200", chip: "bg-amber-50 border-amber-100" },
};

function SignalCard({
  icon,
  tone,
  title,
  facts,
  body,
}: {
  icon: React.ReactNode;
  tone: "red" | "steel" | "emerald" | "amber";
  title: string;
  facts: string[];
  body: string;
}) {
  const t = SIGNAL_TONES[tone];
  return (
    <div className={`rounded-xl border bg-white p-5 shadow-sm ${t.border}`}>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h4 className="text-sm font-bold text-midnight-navy">{title}</h4>
      </div>
      <div className="mb-3 space-y-1.5">
        {facts.map((f, i) => (
          <p key={i} className="text-xs text-midnight-navy/70">
            {f}
          </p>
        ))}
      </div>
      <div className={`rounded-md border p-3 ${t.chip}`}>
        <p className="text-[11px] leading-relaxed text-midnight-navy/70">{body}</p>
      </div>
    </div>
  );
}
