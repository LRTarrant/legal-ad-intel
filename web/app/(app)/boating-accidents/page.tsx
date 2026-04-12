import {
  getBoatingTotals,
  getBoatingTrendByYear,
  getBoatingDistinctStates,
  getBoatingCountiesByStateName,
  getBoatingHeatmapPoints,
  getBoatingHotspotCounties,
  getBoatingSeverityStats,
  type BoatingFilters,
} from "@/lib/queries";
import { BoatingFilterBar } from "./boating-filter-bar";
import { FatalitiesHeatmapPanel } from "../fatalities/fatalities-heatmap-panel";
import { HotspotTable } from "./_components/hotspot-table";
import { SeverityCards } from "./_components/severity-cards";
import { AIRecommendations } from "./_components/ai-recommendations";
import { POIPlaceholder } from "./_components/poi-placeholder";
import { Ship } from "lucide-react";

export const metadata = {
  title: "Boating Accidents | Legal Marketing Intelligence",
};

type SearchParams = Promise<{
  county?: string | string[];
  state?: string | string[];
}>;

function getSingleValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function parseFilters(rawState: string | null, rawCounty: string | null): BoatingFilters {
  const state = rawState?.trim().toUpperCase() || null;
  const county = state && rawCounty?.trim() ? rawCounty.trim() : null;
  return { state, county };
}

function getFilterSummary(state: string | null, county: string | null): string {
  if (state && county) return `${county}, ${state}`;
  if (state) return `${state} statewide`;
  return "Nationwide";
}

export default async function BoatingAccidentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = parseFilters(
    getSingleValue(params.state),
    getSingleValue(params.county)
  );

  let states: { state: string }[] = [];
  try {
    states = await getBoatingDistinctStates();
  } catch {
    // Data may not exist yet
  }

  let counties: { county_name: string; total_accidents: number }[] = [];
  if (filters.state) {
    try {
      counties = await getBoatingCountiesByStateName(filters.state);
    } catch {
      // Data may not exist yet
    }
  }

  let totals = { total_deaths: 0, total_injuries: 0, total_accidents: 0 };
  let trend: { year: number; total_deaths: number; total_injuries: number; total_accidents: number }[] = [];
  let heatmapPoints: { latitude: number; longitude: number; intensity: number }[] = [];
  let hotspots: Awaited<ReturnType<typeof getBoatingHotspotCounties>> = [];
  let severity = {
    total_accidents: 0,
    total_deaths: 0,
    total_injuries: 0,
    fatality_rate: 0,
    avg_deaths_per_accident: 0,
    avg_injuries_per_accident: 0,
    pct_fatal: 0,
  };

  // Fetch national total for AI recommendations (always needed)
  let nationalTotal = 0;
  try {
    const nt = await getBoatingTotals();
    nationalTotal = nt.total_accidents;
  } catch {
    // Gracefully fallback
  }

  try {
    [totals, trend, heatmapPoints, hotspots, severity] = await Promise.all([
      getBoatingTotals(filters),
      getBoatingTrendByYear(filters),
      getBoatingHeatmapPoints(filters),
      getBoatingHotspotCounties(filters.state),
      getBoatingSeverityStats(filters.state, filters.county),
    ]);
  } catch {
    // Data may not exist yet — gracefully show zeros
  }

  const maxDeaths = trend.length
    ? Math.max(...trend.map((row) => row.total_deaths))
    : 0;
  const filterSummary = getFilterSummary(
    filters.state ?? null,
    filters.county ?? null
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Ship className="w-7 h-7 shrink-0" style={{ color: "#1A8C96" }} />
        <div>
          <h1 className="font-heading text-2xl font-bold text-midnight-navy">
            Boating Accidents
          </h1>
          <p className="text-sm text-slate-gray">
            USCG BARD data &middot; 2019&ndash;2023 &middot; Source: U.S. Coast Guard
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <BoatingFilterBar
        states={states}
        counties={counties}
        selectedState={filters.state ?? null}
        selectedCounty={filters.county ?? null}
      />

      {/* Summary scorecards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          label="Total Deaths"
          value={totals.total_deaths.toLocaleString()}
          sub={filterSummary}
        />
        <SummaryCard
          label="Total Injuries"
          value={totals.total_injuries.toLocaleString()}
          sub={filterSummary}
        />
        <SummaryCard
          label="Total Accidents"
          value={totals.total_accidents.toLocaleString()}
          sub={filterSummary}
        />
        <SeverityCards severity={severity} filterSummary={filterSummary} />
      </div>

      {/* Hotspot table */}
      <HotspotTable
        hotspots={hotspots}
        selectedState={filters.state ?? null}
      />

      {/* Heatmap */}
      <div>
        <FatalitiesHeatmapPanel
          points={heatmapPoints}
          title={`Boating accident density for ${filterSummary}`}
        />
        <p className="mt-2 text-xs text-slate-gray">
          Note: Only 14.7% of records include coordinates. Map shows
          geo-coded incidents only &mdash; actual hotspot volumes may be higher.
        </p>
      </div>

      {/* Year-over-year trend */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          Boating Deaths by Year
        </h2>
        <div className="mt-4 space-y-3">
          {trend.length === 0 ? (
            <p className="text-sm text-slate-gray">
              No boating accident records match the current filter.
            </p>
          ) : (
            trend.map((row) => {
              const pct =
                maxDeaths > 0
                  ? (row.total_deaths / maxDeaths) * 100
                  : 0;
              return (
                <div key={row.year} className="flex items-center gap-4">
                  <span className="w-12 font-mono text-sm text-slate-gray">
                    {row.year}
                  </span>
                  <div className="flex-1">
                    <div className="h-7 rounded bg-cloud">
                      <div
                        className="flex h-7 items-center rounded bg-intelligence-teal px-3 text-xs font-semibold text-white"
                        style={{ width: `${Math.max(pct, 8)}%` }}
                      >
                        {row.total_deaths.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <span className="w-24 text-right font-mono text-xs text-slate-gray">
                    {row.total_accidents.toLocaleString()} accidents
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* AI recommendation cards */}
      <AIRecommendations
        hotspots={hotspots}
        severity={severity}
        selectedState={filters.state ?? null}
        nationalTotal={nationalTotal}
        stateTotal={totals.total_accidents}
      />

      {/* POI placeholder */}
      <POIPlaceholder />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase text-slate-gray">{label}</p>
      <p className="mt-1 font-heading text-2xl font-bold text-midnight-navy">
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-slate-gray">{sub}</p> : null}
    </div>
  );
}
