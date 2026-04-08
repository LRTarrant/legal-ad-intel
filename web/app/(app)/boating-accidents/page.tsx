import {
  getBoatingTotals,
  getBoatingTrendByYear,
  getBoatingDistinctStates,
  getBoatingCountiesByState,
  getBoatingHeatmapPoints,
  type BoatingFilters,
} from "@/lib/queries";
import { BoatingFilterBar } from "./boating-filter-bar";
import { FatalitiesHeatmapPanel } from "../fatalities/fatalities-heatmap-panel";
import { AdvertisingInsight } from "../components/advertising-insight";
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
  const countyNumber = rawCounty ? Number.parseInt(rawCounty, 10) : null;
  const county =
    state && countyNumber != null && Number.isFinite(countyNumber) ? countyNumber : null;
  return { state, county };
}

function getFilterSummary(state: string | null, countyName: string | null): string {
  if (state && countyName) return `${countyName}, ${state}`;
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

  let counties: { county_fips: number; county_name: string }[] = [];
  if (filters.state) {
    try {
      counties = await getBoatingCountiesByState(filters.state);
    } catch {
      // Data may not exist yet
    }
  }

  const selectedCounty =
    filters.county != null
      ? counties.find((c) => c.county_fips === filters.county) ?? null
      : null;

  let totals = { total_deaths: 0, total_injuries: 0, total_accidents: 0 };
  let trend: { year: number; total_deaths: number; total_injuries: number; total_accidents: number }[] = [];
  let heatmapPoints: { latitude: number; longitude: number; intensity: number }[] = [];

  try {
    [totals, trend, heatmapPoints] = await Promise.all([
      getBoatingTotals(filters),
      getBoatingTrendByYear(filters),
      getBoatingHeatmapPoints(filters),
    ]);
  } catch {
    // Data may not exist yet — gracefully show zeros
  }

  const maxDeaths = trend.length
    ? Math.max(...trend.map((row) => row.total_deaths))
    : 0;
  const filterSummary = getFilterSummary(
    filters.state ?? null,
    selectedCounty?.county_name ?? null
  );

  return (
    <div className="space-y-8">
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

      <BoatingFilterBar
        states={states}
        counties={counties}
        selectedState={filters.state ?? null}
        selectedCounty={filters.county ?? null}
      />

      <AdvertisingInsight>
        <p>
          <strong>Reach boating injury victims in waterway-heavy markets.</strong> Boating accident
          data highlights coastal counties and inland waterways with the highest incident rates. Use
          this to time seasonal campaigns — boating injuries peak in summer months — and geo-target
          advertising in lake and coastal communities.
        </p>
      </AdvertisingInsight>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      </div>

      <FatalitiesHeatmapPanel
        points={heatmapPoints}
        title={`Boating accident density for ${filterSummary}`}
      />

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
