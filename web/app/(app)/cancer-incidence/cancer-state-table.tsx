"use client";

import { useMemo, useState } from "react";
import type { CancerStateSummary } from "@/lib/queries";

type SortKey =
  | "state"
  | "average_incidence_rate"
  | "total_annual_cases"
  | "counties_reporting"
  | "highest_rate_county"
  | "trend_direction";
type SortDirection = "asc" | "desc";

function compareValues(
  a: CancerStateSummary,
  b: CancerStateSummary,
  key: SortKey,
  direction: SortDirection
) {
  const left = a[key];
  const right = b[key];
  const base =
    typeof left === "number" && typeof right === "number"
      ? left - right
      : String(left).localeCompare(String(right));
  return direction === "asc" ? base : -base;
}

function trendIcon(direction: string) {
  if (direction === "Rising") return "↑";
  if (direction === "Falling") return "↓";
  return "→";
}

export function CancerStateTable({ rows }: { rows: CancerStateSummary[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("average_incidence_rate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => compareValues(a, b, sortKey, sortDirection));
  }, [rows, sortDirection, sortKey]);

  function toggleSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(
      nextKey === "average_incidence_rate" ||
        nextKey === "total_annual_cases" ||
        nextKey === "counties_reporting"
        ? "desc"
        : "asc"
    );
  }

  function label(text: string, key: SortKey) {
    if (sortKey !== key) return text;
    return `${text} ${sortDirection === "asc" ? "↑" : "↓"}`;
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-midnight-navy/5">
      <h2 className="font-heading text-xl font-semibold text-midnight-navy">
        State-Level Incidence
      </h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-cloud text-xs uppercase text-slate-gray">
              <th className="py-2 pr-4">
                <button type="button" onClick={() => toggleSort("state")}>
                  {label("State", "state")}
                </button>
              </th>
              <th className="py-2 pr-4 text-right">
                <button type="button" onClick={() => toggleSort("average_incidence_rate")}>
                  {label("Avg Incidence Rate", "average_incidence_rate")}
                </button>
              </th>
              <th className="py-2 pr-4 text-right">
                <button type="button" onClick={() => toggleSort("total_annual_cases")}>
                  {label("Total Annual Cases", "total_annual_cases")}
                </button>
              </th>
              <th className="py-2 pr-4 text-right">
                <button type="button" onClick={() => toggleSort("counties_reporting")}>
                  {label("Counties Reporting", "counties_reporting")}
                </button>
              </th>
              <th className="py-2 pr-4">
                <button type="button" onClick={() => toggleSort("highest_rate_county")}>
                  {label("Highest-Rate County", "highest_rate_county")}
                </button>
              </th>
              <th className="py-2 text-right">
                <button type="button" onClick={() => toggleSort("trend_direction")}>
                  {label("Trend", "trend_direction")}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-slate-gray">
                  No cancer incidence rows match the current filter.
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => (
                <tr key={row.state} className="border-b border-cloud last:border-0">
                  <td className="py-3 pr-4 font-mono font-semibold text-intelligence-teal">
                    {row.state}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono">
                    {row.average_incidence_rate.toFixed(1)}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono">
                    {Math.round(row.total_annual_cases).toLocaleString()}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono">
                    {row.counties_reporting.toLocaleString()}
                  </td>
                  <td className="py-3 pr-4 text-slate-gray">
                    {row.highest_rate_county}
                  </td>
                  <td className="py-3 text-right font-mono text-intelligence-teal">
                    {trendIcon(row.trend_direction)} {row.trend_direction}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
