"use client";

import { useMemo, useState } from "react";
import type { JudicialProfileRow } from "@/lib/queries";

type SortKey = "county_name" | "state" | "judicial_profile";
type SortDirection = "asc" | "desc";

const profilePillStyles: Record<string, string> = {
  Conservative: "bg-rose-50 text-rose-600 ring-rose-200",
  Moderate: "bg-amber-50 text-amber-700 ring-amber-200",
  Liberal: "bg-blue-50 text-blue-600 ring-blue-200",
};

function compareValues(
  a: JudicialProfileRow,
  b: JudicialProfileRow,
  sortKey: SortKey,
  direction: SortDirection
) {
  const left = a[sortKey].toString().toLowerCase();
  const right = b[sortKey].toString().toLowerCase();
  const base = left.localeCompare(right);
  return direction === "asc" ? base : -base;
}

export function JudicialTable({ rows }: { rows: JudicialProfileRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("county_name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => compareValues(a, b, sortKey, sortDirection));
  }, [rows, sortDirection, sortKey]);

  function toggleSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection("asc");
  }

  function sortLabel(label: string, key: SortKey) {
    if (sortKey !== key) {
      return label;
    }

    return `${label} ${sortDirection === "asc" ? "↑" : "↓"}`;
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-midnight-navy/5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-midnight-navy">
            County Profiles
          </h2>
          <p className="mt-1 text-sm text-slate-gray">
            Sort by county, state, or judicial leaning.
          </p>
        </div>
        <div className="rounded-full bg-cloud px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-intelligence-teal">
          {rows.length.toLocaleString()} counties
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-cloud text-xs uppercase text-slate-gray">
              <th className="py-2 pr-4">
                <button
                  type="button"
                  onClick={() => toggleSort("county_name")}
                  className="font-semibold tracking-[0.18em]"
                >
                  {sortLabel("County", "county_name")}
                </button>
              </th>
              <th className="py-2 pr-4">
                <button
                  type="button"
                  onClick={() => toggleSort("state")}
                  className="font-semibold tracking-[0.18em]"
                >
                  {sortLabel("State", "state")}
                </button>
              </th>
              <th className="py-2">
                <button
                  type="button"
                  onClick={() => toggleSort("judicial_profile")}
                  className="font-semibold tracking-[0.18em]"
                >
                  {sortLabel("Judicial Profile", "judicial_profile")}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-8 text-center text-sm text-slate-gray">
                  No counties match the current filter.
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => (
                <tr key={row.fips} className="border-b border-cloud last:border-0">
                  <td className="py-3 pr-4 font-semibold text-midnight-navy">
                    {row.county_name}
                  </td>
                  <td className="py-3 pr-4 font-mono text-slate-gray">
                    {row.state}
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                        profilePillStyles[row.judicial_profile] ??
                        "bg-slate-100 text-slate-700 ring-slate-200"
                      }`}
                    >
                      {row.judicial_profile}
                    </span>
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
