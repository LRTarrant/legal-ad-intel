"use client";

import { useState } from "react";
import type { ConstructionIndustryDetail } from "@/lib/queries";

type SortKey =
  | "industry_name"
  | "total_fatalities"
  | "falls"
  | "transportation"
  | "exposure"
  | "contact";

type IndustryDetailTableProps = {
  rows: ConstructionIndustryDetail[];
};

export function IndustryDetailTable({ rows }: IndustryDetailTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("total_fatalities");
  const [sortAsc, setSortAsc] = useState(false);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === "string" && typeof bv === "string") {
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return sortAsc
      ? (av as number) - (bv as number)
      : (bv as number) - (av as number);
  });

  const FALL_HEAVY = ["roofing", "framing", "masonry", "structural steel"];

  function isHighlighted(name: string): boolean {
    const lower = name.toLowerCase();
    return FALL_HEAVY.some((kw) => lower.includes(kw));
  }

  function sortIndicator(key: SortKey) {
    if (key !== sortKey) return null;
    return sortAsc ? " ▲" : " ▼";
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          Industry Detail
        </h2>
        <p className="mt-3 text-sm text-slate-gray">
          No industry detail data available.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          Industry Detail — Top Sub-Industries by Fatalities
        </h2>
        <p className="mt-1 text-sm text-slate-gray">
          Click a column header to sort. Highlighted rows indicate fall-heavy
          trades.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-midnight-navy/10">
              <th
                onClick={() => handleSort("industry_name")}
                className="cursor-pointer py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-gray hover:text-midnight-navy"
              >
                Industry{sortIndicator("industry_name")}
              </th>
              <th className="py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-gray">
                NAICS
              </th>
              <th
                onClick={() => handleSort("total_fatalities")}
                className="cursor-pointer py-2 pr-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray hover:text-midnight-navy"
              >
                Total{sortIndicator("total_fatalities")}
              </th>
              <th
                onClick={() => handleSort("falls")}
                className="cursor-pointer py-2 pr-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray hover:text-midnight-navy"
              >
                Falls{sortIndicator("falls")}
              </th>
              <th
                onClick={() => handleSort("transportation")}
                className="cursor-pointer py-2 pr-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray hover:text-midnight-navy"
              >
                Transport{sortIndicator("transportation")}
              </th>
              <th
                onClick={() => handleSort("exposure")}
                className="cursor-pointer py-2 pr-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray hover:text-midnight-navy"
              >
                Exposure{sortIndicator("exposure")}
              </th>
              <th
                onClick={() => handleSort("contact")}
                className="cursor-pointer py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray hover:text-midnight-navy"
              >
                Contact{sortIndicator("contact")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const highlighted = isHighlighted(row.industry_name);
              return (
                <tr
                  key={`${row.naics_code}-${row.industry_name}`}
                  className={`border-b border-midnight-navy/5 ${
                    highlighted ? "bg-amber-50" : ""
                  }`}
                >
                  <td className="py-2.5 pr-3 font-medium text-midnight-navy">
                    {row.industry_name}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-xs text-slate-gray">
                    {row.naics_code}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono font-semibold text-midnight-navy">
                    {row.total_fatalities.toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono text-midnight-navy">
                    {row.falls > 0 ? row.falls.toLocaleString() : "—"}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono text-midnight-navy">
                    {row.transportation > 0
                      ? row.transportation.toLocaleString()
                      : "—"}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono text-midnight-navy">
                    {row.exposure > 0 ? row.exposure.toLocaleString() : "—"}
                  </td>
                  <td className="py-2.5 text-right font-mono text-midnight-navy">
                    {row.contact > 0 ? row.contact.toLocaleString() : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
