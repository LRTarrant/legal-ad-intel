import {
  getCountiesByState,
  getCrashHeatmapPoints,
  getDistinctStates,
  getDrunkDrivingStats,
  getFatalityTrendByYear,
  getRecentCrashes,
  getTopStatesByFatalities,
  getTotalCrashes,
  getTotalFatalities,
  type FatalitiesFilters,
} from "@/lib/queries";
import { FatalitiesFilterBar } from "./fatalities-filter-bar";
import { FatalitiesHeatmapPanel } from "./fatalities-heatmap-panel";

export const metadata = {
  title: "Motor Vehicle Fatalities | Legal Marketing Intelligence",
};

type SearchParams = Promise<{
  county?: string | string[];
  state?: string | string[];
}>;

function getSingleValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function parseFilters(rawState: string | null, rawCounty: string | null): FatalitiesFilters {
  const state = rawState?.trim().toUpperCase() || null;
  const countyNumber = rawCounty ? Number.parseInt(rawCounty, 10) : null;
  const county =
    state && countyNumber != null && Number.isFinite(countyNumber) ? countyNumber : null;

  return {
    state,
    county,
  };
}

function getFilterSummary(
  state: string | null,
  countyName: string | null
): string {
  if (state && countyName) {
    return `${countyName}, ${state}`;
  }

  if (state) {
    return `${state} statewide`;
  }

  return "Nationwide";
}

export default async function FatalitiesPage({
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
      ? counties.find((county) => county.county_fips === filters.county) ?? null
      : null;

  const [totalFatalities, totalCrashes, trend, topStates, drunkStats, recent, heatmapPoints] =
    await Promise.all([
      getTotalFatalities(filters),
      getTotalCrashes(filters),
      getFatalityTrendByYear(filters),
      getTopStatesByFatalities(15, filters),
      getDrunkDrivingStats(filters),
      getRecentCrashes(20, filters),
      getCrashHeatmapPoints(filters),
    ]);

  const avgFatalitiesPerCrash =
    totalCrashes > 0
      ? (totalFatalities / totalCrashes).toFixed(2)
      : "0";

  const maxFatalities = trend.length
    ? Math.max(...trend.map((row) => row.total_fatalities))
    : 0;
  const filterSummary = getFilterSummary(filters.state ?? null, selectedCounty?.county_name ?? null);
  const topStatesTitle = filters.state
    ? `Filtered view · ${filterSummary}`
    : "Top States by Fatalities (2019–2023)";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-midnight-navy">
          Motor Vehicle Fatalities
        </h1>
        <p className="mt-1 text-slate-gray">
          FARS data · 2019–2023 · Source: NHTSA
        </p>
      </div>

      <FatalitiesFilterBar
        states={states}
        counties={counties}
        selectedState={filters.state ?? null}
        selectedCounty={filters.county ?? null}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total Fatalities"
          value={totalFatalities.toLocaleString()}
          sub={filterSummary}
        />
        <SummaryCard
          label="Total Crashes"
          value={totalCrashes.toLocaleString()}
          sub={filterSummary}
        />
        <SummaryCard
          label="Avg Fatalities / Crash"
          value={avgFatalitiesPerCrash}
          sub="Across the filtered crash set"
        />
        <SummaryCard
          label="Drunk Driving %"
          value={`${drunkStats.percentage}%`}
          sub={`${drunkStats.drunk_crashes.toLocaleString()} of ${drunkStats.total_crashes.toLocaleString()} crashes`}
        />
      </div>

      <FatalitiesHeatmapPanel
        points={heatmapPoints}
        title={`Crash density for ${filterSummary}`}
      />

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          Fatalities by Year
        </h2>
        <div className="mt-4 space-y-3">
          {trend.length === 0 ? (
            <p className="text-sm text-slate-gray">
              No fatality records match the current filter.
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

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          {topStatesTitle}
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud text-xs uppercase text-slate-gray">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">State</th>
                <th className="py-2 pr-4 text-right">Fatalities</th>
                <th className="py-2 pr-4 text-right">Crashes</th>
                <th className="py-2 pr-4 text-right">Drunk Driving</th>
                <th className="py-2 text-right">Drunk %</th>
              </tr>
            </thead>
            <tbody>
              {topStates.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-sm text-slate-gray"
                  >
                    No state-level summary rows match the current filter.
                  </td>
                </tr>
              ) : (
                topStates.map((row, index) => {
                  const drunkPct =
                    row.total_crashes > 0
                      ? ((row.drunk_driving_crashes / row.total_crashes) * 100).toFixed(1)
                      : "0";

                  return (
                    <tr
                      key={`${row.state}-${index}`}
                      className="border-b border-cloud last:border-0"
                    >
                      <td className="py-2.5 pr-4 font-mono font-semibold text-intelligence-teal">
                        {index + 1}
                      </td>
                      <td className="py-2.5 pr-4 font-semibold text-midnight-navy">
                        {row.state}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono">
                        {row.total_fatalities.toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono">
                        {row.total_crashes.toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono">
                        {row.drunk_driving_crashes.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right font-mono text-warning-amber">
                        {drunkPct}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          Recent Fatal Crashes
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud text-xs uppercase text-slate-gray">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Location</th>
                <th className="py-2 pr-4 text-right">Fatalities</th>
                <th className="py-2 pr-4 text-right">Vehicles</th>
                <th className="py-2 pr-4 text-right">Persons</th>
                <th className="py-2 text-right">Drunk</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-sm text-slate-gray"
                  >
                    No recent crashes match the current filter.
                  </td>
                </tr>
              ) : (
                recent.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-cloud last:border-0"
                  >
                    <td className="py-2.5 pr-4 font-mono text-xs">
                      {row.crash_date}
                    </td>
                    <td className="py-2.5 pr-4 font-semibold text-midnight-navy">
                      {row.county_name
                        ? `${row.county_name}, ${row.state}`
                        : row.state}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono">
                      {row.fatalities}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono">
                      {row.vehicles}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono">
                      {row.persons}
                    </td>
                    <td className="py-2.5 text-right font-mono">
                      {row.drunk_drivers > 0 ? (
                        <span className="text-alert-red">Yes</span>
                      ) : (
                        <span className="text-slate-gray">No</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
