"use client";

import { useState, useMemo, useEffect } from "react";
import {
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
} from "lucide-react";
import type { JudicialProfileRow } from "@/lib/queries/judicial";
import { AskAIPanel } from "../../../components/ask-ai-panel";
import { trackStateViewed } from "@/lib/analytics";
import { CompetitiveAnalysis } from "../../../components/competitive/competitive-analysis-section";
import { StateCrashEmbed } from "@/components/state-intelligence/StateCrashEmbed";
import { StateInjuryTable } from "@/components/state-intelligence/StateInjuryTable";
import type { StateConfig } from "@/lib/state-config";
import {
  CountyIntelligenceMap,
  FARS_DATA_YEARS,
  BOATING_DATA_YEARS,
} from "../../../components/county-intelligence-map";
import {
  GEOMETRY_LOADERS,
  type GeometryModule,
} from "@/lib/data/state-geometry/registry";
import { LegalNewsSection } from "../../../components/legal-news/legal-news-section";
import {
  StateStickyBar,
  StateHero,
  PipelineStrip,
  VerdictRow,
  StrategyCloserCTA,
} from "@/components/state-intelligence/state-top-of-page";
import {
  deriveStateVerdictCards,
  negligenceMeta,
} from "@/components/state-intelligence/state-verdict";
import { viabilityBand } from "@/components/state-intelligence/viability";
import { StateLegalViability } from "@/components/state-intelligence/state-legal-viability";

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

export interface StateIntelligenceData {
  accidentSummary: AccidentSummaryRow[];
  ruralUrban: RuralUrbanRow[];
  stormSummary: StormSummaryRow[];
  boatingSummary: BoatingSummaryRow[];
  piViability: PIViabilityRow | null;
  censusDemographics: CensusDemographicsRow[];
  msaDemographics: MSADemographicsRow[];
  judicialProfiles: JudicialProfileRow[];
  stormCount: number;
  competition: { count: number };
}

/* Section anchors, shared by the sticky desktop nav and the mobile jump menu.
   Activity (the lifted live carousel) leads, above Overview. */
const SECTION_NAV: [string, string][] = [
  ["#activity", "Activity"],
  ["#overview", "Overview"],
  ["#legal", "Legal"],
  ["#competition", "Competition"],
  ["#strategy", "Strategy"],
  ["#signals", "Signals"],
  ["#sources", "Sources"],
];

// State-specific stats blocks (TDOSHS / BLS / COMMUTE) and crash-embed iframes
// now come from `config` per state. See lib/state-config/_types.ts.

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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function StateIntelligenceClient({
  config,
  data,
}: {
  config: StateConfig;
  data: StateIntelligenceData;
}) {
  const TDOSHS = config.trafficStats;
  const BLS = config.workplaceStats;
  const COMMUTE = config.commuteStats;
  const ruralFatalSharePct =
    TDOSHS.ruralFatalities != null && TDOSHS.totalFatalities > 0
      ? Math.round((TDOSHS.ruralFatalities / TDOSHS.totalFatalities) * 100)
      : null;
  const content = config.content ?? {};
  const features = config.features ?? {};
  const showInjuryTable =
    features.showInjuryTable ??
    (config.injuryData != null && config.injuryData.rows.length > 0);
  const showCrashEmbeds =
    features.showCrashEmbeds ??
    (config.crashEmbeds != null && config.crashEmbeds.length > 0);

  useEffect(() => {
    trackStateViewed({
      state_code: config.stateCode,
      state_name: config.stateName,
    });
  }, [config.stateCode, config.stateName]);

  /* -- Lazy-load this state's county geometry (code-split per state) -- */
  const [geo, setGeo] = useState<{ slug: string; mod: GeometryModule } | null>(
    null
  );
  useEffect(() => {
    let active = true;
    const loader = GEOMETRY_LOADERS[config.slug];
    if (!loader) return;
    loader()
      .then((m) => {
        if (active) setGeo({ slug: config.slug, mod: m });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [config.slug]);
  // Derived so a slug change shows the loader until new geometry resolves,
  // without a synchronous setState inside the effect.
  const geometry = geo && geo.slug === config.slug ? geo.mod : null;


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

  /* -- PI viability bar chart data -- */
  const piData = data.piViability;

  /* -- Design-D top-of-page derivations -- */
  const composite = piData ? Number(piData.composite_score) || 0 : 0;
  const band = viabilityBand(composite);
  const neg = negligenceMeta(piData?.negligence_rule ?? null);

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

  const verdictCards = deriveStateVerdictCards({
    composite,
    negligenceRule: piData?.negligence_rule ?? null,
    componentScores,
    caseTypes: [
      { label: "Motor Vehicle", noun: "MVA", value: mvaDeaths, topCounties: top5MVA.map((r) => r.county) },
      { label: "Large Truck", noun: "truck", value: totalTruckDeaths, topCounties: top5Truck.map((r) => r.county) },
      { label: "Motorcycle", noun: "motorcycle", value: totalMotoDeaths, topCounties: top5Moto.map((r) => r.county) },
    ],
    competitorNames: [],
    competitorCount: data.competition?.count ?? 0,
    overrides: {
      viabilityNote: content.viabilityNote,
      topOpportunityNote: content.topOpportunityNote,
      competitionNote: content.competitionNote,
    },
  });

  return (
    <div className="space-y-8">
      {/* ============================================================ */}
      {/* STICKY CONTEXT BAR                                           */}
      {/* ============================================================ */}
      <StateStickyBar
        stateName={config.stateName}
        negligenceShort={neg.short}
        negligenceTone={neg.tone}
        composite={composite || "—"}
        viabilityTone={band.tone}
        nav={SECTION_NAV}
      />

      {/* ============================================================ */}
      {/* HERO (Design D — strategy-primary CTAs)                     */}
      {/* ============================================================ */}
      <StateHero
        stateName={config.stateName}
        stateCode={config.stateCode}
        negligenceLabel={piData?.negligence_rule ? neg.full : undefined}
        negligenceTone={neg.tone}
        tagline={content.heroTagline}
        subtitle={content.heroSubtitle}
      />

      {/* ============================================================ */}
      {/* LIVE CAROUSEL — dark "live feed" hero. Empty-honest for      */}
      {/* sparse states (static dot + "Recent legal activity").       */}
      {/* ============================================================ */}
      <LegalNewsSection stateName={config.stateName} stateCode={config.stateCode} hero />

      {/* ============================================================ */}
      {/* PIPELINE STRIP — process map (CTAs live in the hero)        */}
      {/* ============================================================ */}
      <PipelineStrip />

      {/* ============================================================ */}
      {/* THE VERDICT — auto-derived 4-card row                       */}
      {/* ============================================================ */}
      <VerdictRow cards={verdictCards} />

      {/* ============================================================ */}
      {/* GROUP HEADER                                                */}
      {/* ============================================================ */}
      <div id="overview" className="flex items-center gap-3 pt-2 scroll-mt-20">
        <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-gray">
          Overview
        </h2>
        <div className="h-px flex-1 bg-cloud" />
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
            {TDOSHS.fatalitiesSourceLabel ?? TDOSHS.sourceLabel}
          </p>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm border">
          <div className="flex items-center gap-1.5 mb-2">
            <MapPin className="w-3.5 h-3.5 text-intelligence-teal" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Rural Fatal Share
            </p>
          </div>
          <p className="text-3xl font-bold text-midnight-navy">
            {ruralFatalSharePct != null ? `${ruralFatalSharePct}%` : "—"}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-gray">
            {ruralFatalSharePct != null
              ? `of ${TDOSHS.fatalitiesSourceLabel ?? TDOSHS.sourceLabel} fatalities`
              : "rural share not reported"}
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
            {piData?.negligence_rule
              ? formatNegligenceRule(piData.negligence_rule)
              : "—"}
          </p>
        </div>

        {features.showWorkplaceSection !== false && (
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
              {BLS.constructionFatalities} construction &middot; BLS CFOI {BLS.reportYear}
            </p>
          </div>
        )}

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
      {showInjuryTable && config.injuryData && (
        <StateInjuryTable
          stateName={config.stateName}
          data={config.injuryData.rows}
          years={config.injuryData.years}
          latestCompleteYear={config.injuryData.latestYear}
          partialYearLabels={{ 2025: "(Jan\u2013Sept)" }}
          sourceLabel={config.injuryData.sourceName}
          sourceUrl={config.injuryData.sourceUrl}
        />
      )}

      {/* ============================================================ */}
      {/* 3. STATE CRASH INTELLIGENCE (reusable component)             */}
      {/* ============================================================ */}
      {showCrashEmbeds && config.crashEmbeds && config.crashEmbeds.length > 0 && (
        <StateCrashEmbed
          stateName={config.stateName}
          sourceLabel={`${config.stateName} traffic safety dashboards`}
          sourceUrl={config.injuryData?.sourceUrl ?? "#"}
          embeds={config.crashEmbeds}
        />
      )}

      {/* ============================================================ */}
      {/* 6. COUNTY INTELLIGENCE (map + merged accident/judicial table) */}
      {/* ============================================================ */}
      {data.accidentSummary.length > 0 && geometry ? (
        <CountyIntelligenceMap
          rows={data.accidentSummary}
          geometry={geometry.COUNTY_GEOMETRY}
          viewBox={geometry.VIEWBOX}
          stateName={config.stateName}
          stateCode={config.stateCode}
          csvFileName={`${config.slug}-county-intelligence.csv`}
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
            <p className="text-sm font-medium text-midnight-navy/60">
              County intelligence data loading...
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* GROUP HEADER                                                */}
      {/* ============================================================ */}
      <div id="legal" className="flex items-center gap-3 pt-2 scroll-mt-20">
        <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-gray">
          Legal Landscape &amp; PI Viability
        </h2>
        <div className="h-px flex-1 bg-cloud" />
      </div>

      {/* ============================================================ */}
      {/* 4. LEGAL LANDSCAPE & PI VIABILITY (shared Design-D card)    */}
      {/* ============================================================ */}
      <StateLegalViability
        stateName={config.stateName}
        piData={piData}
        judicial={{
          conservative: profileCounts["Conservative"] ?? 0,
          liberal: profileCounts["Liberal"] ?? 0,
          moderate: profileCounts["Moderate"] ?? 0,
        }}
        legalNote={content.legalLandscape}
      />

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
              {TDOSHS.speedRelatedFatalities != null && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-gray">Speed-Related Fatalities ({TDOSHS.reportYear})</span>
                  <span className="font-semibold text-midnight-navy">
                    {TDOSHS.speedRelatedFatalities} ({TDOSHS.speedRelatedPct}%)
                  </span>
                </div>
              )}
              {TDOSHS.alcoholRelatedFatalities != null && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-gray">Alcohol-Related Fatalities ({TDOSHS.fatalitiesReportYear ?? TDOSHS.reportYear})</span>
                  <span className="font-semibold text-midnight-navy">
                    {TDOSHS.alcoholRelatedFatalities} ({TDOSHS.alcoholRelatedPct}%)
                  </span>
                </div>
              )}
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3 mb-2">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">
                  Audience:
                </span>{" "}
                {content.autoAudience ??
                  `${config.stateName} drivers see high crash exposure on the state's major interstate corridors and metro arterials. Drive-alone commuting rates stand at ${COMMUTE.driveAlone}% (national avg: ${COMMUTE.nationalAvg}%), and rural counties generate disproportionate fatalities relative to population.`}
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                {content.autoMedia ??
                  `Digital + CTV in the state's primary metros. Billboard and radio along the highest-fatality interstate corridors. Geo-fenced mobile near top-county hot spots.`}
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
              {BLS.truckTransportFatalities != null && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-gray">Truck Transport Workplace Fatalities</span>
                  <span className="font-medium text-midnight-navy">
                    {BLS.truckTransportFatalities} (BLS CFOI)
                  </span>
                </div>
              )}
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3 mb-2">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">
                  Audience:
                </span>{" "}
                {content.truckAudience ??
                  `${config.stateName} sits on major freight corridors moving goods across the country. Long rural interstate stretches and metro logistics hubs concentrate truck-involved crashes. Target families of CDL holders as well as passenger-vehicle occupants involved in truck crashes.`}
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                {content.truckMedia ??
                  `Geo-fenced digital along major freight corridors. Truck-stop billboards at high-traffic rest areas. CDL family targeting via social. Spillover into adjacent state markets where regional metros span borders.`}
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
              {TDOSHS.motorcycleFatalities != null && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">
                  {TDOSHS.sourceLabel} Motorcycle Fatalities
                </span>
                <span className="font-semibold text-midnight-navy">
                  {TDOSHS.motorcycleFatalities}
                </span>
              </div>
              )}
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
                {content.motorcycleAudience ??
                  `Motorcycle riders in ${config.stateName} face elevated crash severity, especially during peak spring/summer riding season. Touring routes and scenic byways draw out-of-state riders. Helmet law specifics affect both crash outcomes and out-of-state visitor risk.`}
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                {content.motorcycleMedia ??
                  `Seasonal spring/summer campaigns during peak riding season. Social and streaming targeting motorcycle interest segments. Event sponsorships at rallies. Geo-fencing near popular riding routes.`}
              </p>
            </div>
          </div>

          {/* Construction Card */}
          {features.showWorkplaceSection !== false && (
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <HardHat className="w-5 h-5 text-intelligence-teal" />
              <h3 className="text-sm font-bold text-midnight-navy">
                Construction Accidents
              </h3>
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-gray">Construction Fatalities ({BLS.reportYear})</span>
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
                  {BLS.totalWorkplaceFatalities} (BLS CFOI {BLS.reportYear})
                </span>
              </div>
            </div>
            <div className="rounded-md bg-intelligence-teal/5 border border-intelligence-teal/20 p-3 mb-2">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">
                  Audience:
                </span>{" "}
                {content.constructionAudience ??
                  `${config.stateName}'s construction workforce concentrates in growing metros. Workers and families of injured workers represent a sizable, under-represented segment. Workers' comp + third-party liability is the wedge.`}
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                {content.constructionMedia ??
                  `Mobile job-site proximity targeting in major metros. Workers' comp and construction-injury keywords. Spanish-language digital and radio for the Hispanic share of the construction workforce.`}
              </p>
            </div>
          </div>
          )}

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
                {content.boatingAudience ??
                  `${config.stateName} has notable boating recreation and seasonal peak periods. Summer weekends drive most accident volume. Target boat owners and vacation/lakehouse demographics.`}
              </p>
            </div>
            <div className="rounded-md bg-cloud/60 p-3">
              <p className="text-[11px] text-midnight-navy/70">
                <span className="font-semibold text-midnight-navy">Media:</span>{" "}
                {content.boatingMedia ??
                  `Seasonal spring/summer campaigns. Geo-targeted digital around top boating counties. Local radio in lakeside / coastal markets. Marina partnerships.`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* GROUP HEADER                                                */}
      {/* ============================================================ */}
      <div className="flex items-center gap-3 pt-2">
        <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-gray">
          Competitive Analysis
        </h2>
        <div className="h-px flex-1 bg-cloud" />
      </div>

      {/* ============================================================ */}
      {/* COMPETITIVE ANALYSIS (PI-firm competition, DMA-filtered)    */}
      {/* ============================================================ */}
      <CompetitiveAnalysis
        stateName={config.stateName}
        stateCode={config.stateCode}
        embedded
      />

      {/* ============================================================ */}
      {/* GROUP HEADER                                                */}
      {/* ============================================================ */}
      <div id="strategy" className="flex items-center gap-3 pt-2 scroll-mt-20">
        <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-gray">
          Strategy
        </h2>
        <div className="h-px flex-1 bg-cloud" />
      </div>

      {/* ============================================================ */}
      {/* STRATEGY CLOSER — "Ready to act on this?" → Strategy Engine  */}
      {/* ============================================================ */}
      <StrategyCloserCTA stateName={config.stateName} stateCode={config.stateCode} />

      {/* ============================================================ */}
      {/* GROUP HEADER                                                */}
      {/* ============================================================ */}
      <div id="signals" className="flex items-center gap-3 pt-2 scroll-mt-20">
        <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-slate-gray">
          Signals
        </h2>
        <div className="h-px flex-1 bg-cloud" />
      </div>

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
              <span className="text-lg">🎯</span>
              <h3 className="text-sm font-bold text-midnight-navy">
                {content.marketSaturationTitle ?? "Market Saturation"}
              </h3>
            </div>
            <p className="text-[11px] text-midnight-navy/70">
              {content.marketSaturationTip ??
                `${config.stateName}'s top metros tend to attract national PI advertisers, increasing competitive density and driving up cost-per-acquired-case. Surrounding satellite counties often offer better economics with similar case volume per dollar.`}
            </p>
          </div>

          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🚛</span>
              <h3 className="text-sm font-bold text-midnight-navy">
                {content.freightCorridorTitle ?? "Freight Corridor Exposure"}
              </h3>
            </div>
            <p className="text-[11px] text-midnight-navy/70">
              {content.freightCorridorTip ??
                `${config.stateName}'s major interstate corridors carry significant truck and freight traffic. Counties along these routes see disproportionate truck-involved crash exposure relative to their population, opening targeting opportunities for trucking-PI campaigns.`}
            </p>
          </div>

          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⏰</span>
              <h3 className="text-sm font-bold text-midnight-navy">
                {content.solUrgencyTitle ?? "Statute-of-Limitations Urgency"}
              </h3>
            </div>
            <p className="text-[11px] text-midnight-navy/70">
              {content.solUrgencyTip ??
                `${config.stateName}'s statute of limitations for personal injury defines how aggressive your intake pipeline needs to be. Firms with fast digital response and clear time-sensitive messaging capture cases that slower competitors miss.`}
            </p>
          </div>

          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🏔️</span>
              <h3 className="text-sm font-bold text-midnight-navy">
                {content.internetAccessTitle ?? "Rural Connectivity Gap"}
              </h3>
            </div>
            <p className="text-[11px] text-midnight-navy/70">
              {content.internetAccessTip ??
                `Rural counties in ${config.stateName} typically have lower internet access and higher uninsured populations. Digital-only advertising cannot reach these communities effectively. Radio, community health centers, and local TV are necessary channels for plaintiff firm outreach in connectivity-gap areas.`}
            </p>
          </div>

          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🏍️</span>
              <h3 className="text-sm font-bold text-midnight-navy">
                {content.outOfStateTitle ?? "Out-of-State Visitor Opportunity"}
              </h3>
            </div>
            <p className="text-[11px] text-midnight-navy/70">
              {content.outOfStateTip ??
                `Out-of-state riders or visitors injured in ${config.stateName} may not know local attorneys. Geo-fenced digital ads at popular tourism routes plus partnerships with adjacent businesses (hotels, gear shops, marinas) can capture cases from this segment that slip through traditional channels.`}
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ASK AI PANEL                                                 */}
      {/* ============================================================ */}
      <AskAIPanel
        pageContext={{
          pageName: content.askAiPageName ?? `${config.stateName} State Intelligence`,
          pageDescription:
            content.askAiPageContext ??
            `State-level intelligence for plaintiff firm advertising and case acquisition in ${config.stateName} — combining FARS accident data, census demographics, judicial profiles, PI viability scores, storm events, state crash dashboards, and market opportunity signals across MVA, trucking, motorcycle, construction, and boating.`,
          dataSummary: `State: ${config.stateName}. Negligence: ${formatNegligenceRule(piData?.negligence_rule ?? 'modified_49')}. PI Viability: ${piData?.composite_score ?? 'N/A'} composite. Fatal Crashes (FARS): ${totalFatalCrashes.toLocaleString()}. Total Deaths: ${totalDeaths.toLocaleString()}. Counties: ${data.accidentSummary.length}. Top counties by deaths: ${[...data.accidentSummary].sort((a, b) => b.total_deaths - a.total_deaths).slice(0, 5).map(r => r.county).join(', ')}. Judicial profile mix: ${Object.entries(profileCounts).map(([p, c]) => `${c} ${p}`).join(', ')}. Storm events: ${data.stormCount.toLocaleString()}. Truck deaths: ${totalTruckDeaths.toLocaleString()}. Motorcycle deaths: ${totalMotoDeaths.toLocaleString()}. Boating accidents: ${totalBoatingAccidents.toLocaleString()}. Workplace fatalities: ${BLS.totalWorkplaceFatalities} (${BLS.constructionFatalities} construction).`,
        }}
      />

      {/* ============================================================ */}
      {/* 14. SOURCES & METHODOLOGY                                    */}
      {/* ============================================================ */}
      <div id="sources" className="rounded-lg bg-white p-6 shadow-sm border scroll-mt-20">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-2xl font-bold text-midnight-navy">
            Sources &amp; Methodology
          </h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            "FARS (NHTSA) \u2014 Fatal crash data 2019\u20132024",
            content.footerSourcesLabel ??
              `${config.stateName} state crash dashboards`,
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
          Data sources: FARS (NHTSA), {config.stateName} state agencies
          Dashboards, ACS 5-Year Estimates, BLS OES/CFOI, NOAA Storm Events,
          USCG Boating Accidents, Judicial Profile Data.
        </p>
      </div>
    </div>
  );
}
