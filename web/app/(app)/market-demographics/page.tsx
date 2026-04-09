import {
  getMsaDemographics,
  getMsaDemographicCount,
  type MsaDemographic,
} from "@/lib/queries";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Market Demographics | Legal Marketing Intelligence",
};

function formatNumber(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString();
}

function formatPct(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return `${n.toFixed(1)}%`;
}

function formatCurrency(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString()}`;
}

export default async function MarketDemographicsPage() {
  const [data, totalCount] = await Promise.all([
    getMsaDemographics(500),
    getMsaDemographicCount(),
  ]);

  const metroCount = data.filter((d) => d.cbsa_type .includes("Metropolitan")).length;
  const microCount = data.filter((d) => d.cbsa_type === "Micropolitan").length;
  const totalPop = data.reduce((s, d) => s + (d.total_population ?? 0), 0);
  const avgMedianIncome =
    data.filter((d) => d.median_household_income != null).length > 0
      ? Math.round(
          data
            .filter((d) => d.median_household_income != null)
            .reduce((s, d) => s + d.median_household_income!, 0) /
            data.filter((d) => d.median_household_income != null).length
        )
      : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-teal-100 p-3">
          <Users className="h-6 w-6 text-teal-700" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Market Demographics
          </h1>
          <p className="mt-1 text-slate-500">
            ACS 2024 5-Year demographic profiles aggregated to MSA/μSA level
            from the Census Bureau, covering population, race/ethnicity, income,
            education, housing, and health insurance.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            TOTAL MARKETS
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {formatNumber(totalCount)}
          </p>
          <p className="text-sm text-slate-500">MSA & μSA areas</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            METROPOLITAN
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {formatNumber(metroCount)}
          </p>
          <p className="text-sm text-slate-500">Metro statistical areas</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            COMBINED POPULATION
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {formatNumber(totalPop)}
          </p>
          <p className="text-sm text-slate-500">Across all markets</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            AVG MEDIAN INCOME
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {formatCurrency(avgMedianIncome)}
          </p>
          <p className="text-sm text-slate-500">Across all markets</p>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            MSA Demographics Overview
          </h2>
          <p className="text-sm text-slate-500">
            Sorted by population. Showing top {data.length} of {totalCount}{" "}
            markets.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="whitespace-nowrap px-4 py-3">Market</th>
                <th className="whitespace-nowrap px-4 py-3">Type</th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  Population
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  Median Age
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  White %
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  Black %
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  Hispanic %
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  Asian %
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  Median Income
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  Poverty %
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  Employed %
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  Uninsured %
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  HS+ %
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  BA+ %
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  Owner Occ %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row) => (
                <tr
                  key={row.cbsa_code}
                  className="transition-colors hover:bg-slate-50"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                    {row.cbsa_title}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.cbsa_type .includes("Metropolitan")
                          ? "bg-blue-50 text-blue-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {row.cbsa_type .includes("Metropolitan") ? "Metro" : "Micro"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {formatNumber(row.total_population)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {row.median_age != null ? row.median_age.toFixed(1) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {formatPct(row.pct_white)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {formatPct(row.pct_black)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {formatPct(row.pct_hispanic)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {formatPct(row.pct_asian)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {formatCurrency(row.median_household_income)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {formatPct(row.pct_poverty)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {formatPct(row.pct_employed)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {formatPct(row.pct_uninsured)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {formatPct(row.pct_high_school_or_higher)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {formatPct(row.pct_bachelors_or_higher)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {formatPct(row.pct_owner_occupied)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
