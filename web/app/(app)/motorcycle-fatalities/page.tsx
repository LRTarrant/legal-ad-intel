import {
  getDistinctStates,
  getCountiesByState,
  getMotorcycleTotals,
  getMotorcycleTrendByYear,
  getMotorcycleHeatmapPoints,
  type FatalitiesFilters,
} from "@/lib/queries";
import { FatalitiesFilterBar } from "../fatalities/fatalities-filter-bar";
import { FatalitiesHeatmapPanel } from "../fatalities/fatalities-heatmap-panel";
import { AdvertisingInsight } from "../components/advertising-insight";
import { Bike } from "lucide-react";

export const metadata = {
  title: "Motorcycle Fatalities | Legal Marketing Intelligence",
};

type SearchParams = Promise<{
  county?: string | string[];
  state?: string | string[];
}>;

function getSingleValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function parseFilters(rawState: string | null, rawCounty: string | null): FatalitiesFilters {
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

export default async function MotorcycleFatalitiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = parseFilters(
    getSingleValue(params.state),
    getSingleValue(params.county)
  );

  const states = await getDistinctStates();
  const counties = filters.state ? await getCountiesByState(filters.state) : [];

  const selectedCounty =
    filters.county != null
      ? counties.find((c) => c.county_fips === filters.county) ?? null
      : null;

  let totals = { total_fatalities: 0, total_crashes: 0 };
  let trend: { year: number; total_fatalities: number; total_crashes: number }[] = [];
  let heatmapPoints: { latitude: number; longitude: number; intensity: number }[] = [];

  try {
    [totals, trend, heatmapPoints] = await Promise.all([
      getMotorcycleTotals(filters),
      getMotorcycleTrendByYear(filters),
      getMotorcycleHeatmapPoints(filters),
    ]);
  } catch {
    // Data may not exist yet — gracefully show zeros
  }

  const maxFatalities = trend.length
    ? Math.max(...trend.map((row) => row.total_fatalities))
    : 0;
  const filterSummary = getFilterSummary(
    filters.state ?? null,
    selectedCounty?.county_name ?? null
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <Bike className="w-7 h-7 shrink-0" style={{ color: "#1A8C96" }} />
        <div>
          <h1 className="font-heading text-2xl font-bold text-midnight-navy">
            Motorcycle Fatalities
          </h1>
          <p className="text-sm text-slate-gray">
            FARS data &middot; 2019&ndash;2023 &middot; Source: NHTSA
          </p>
        </div>
      </div>

      <FatalitiesFilterBar
        states={states}
        counties={counties}
        selectedState={filters.state ?? null}
        selectedCounty={filters.county ?? null}
      />

      <AdvertisingInsight>
        <p>
          <strong>Target motorcycle accident hotspots.</strong> County-level motorcycle crash data
          identifies corridors and regions with elevated rider fatality rates. Use this to geo-target
          PI advertising in high-incident areas where motorcycle accident attorneys can capture demand
          ahead of competitors.
        </p>
      </AdvertisingInsight>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total Fatalities"
          value={totals.total_fatalities.toLocaleString()}
          sub={filterSummary}
        />
        <SummaryCard
          label="Total Crashes"
          value={totals.total_crashes.toLocaleString()}
          sub={filterSummary}
        />
      </div>

      <FatalitiesHeatmapPanel
        points={heatmapPoints}
        title={`Motorcycle crash density for ${filterSummary}`}
      />

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          Motorcycle Fatalities by Year
        </h2>
        <div className="mt-4 space-y-3">
          {trend.length === 0 ? (
            <p className="text-sm text-slate-gray">
              No motorcycle fatality records match the current filter.
            </p>
          ) : (
            trend.map((row) => {
              const pct =
                maxFatalities > 0
                  ? (row.total_fatalities / maxFatalities) * 100
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
                        {row.total_fatalities.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <span className="w-24 text-right font-mono text-xs text-slate-gray">
                    {row.total_crashes.toLocaleString()} crashes
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
