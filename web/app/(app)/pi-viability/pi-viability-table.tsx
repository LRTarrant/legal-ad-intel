"use client";

import { useState } from "react";
import type { PiViabilityScore } from "@/lib/queries";

type SortKey = "composite_score" | "state" | "negligence_score" | "non_economic_score" | "punitive_score" | "med_mal_score" | "sol_score" | "verdict_score";

function getViabilityBadge(score: number | null) {
  if (score === null) return { label: "N/A", bg: "#F1F5F9", text: "#6B7280" };
  if (score >= 70) return { label: "Plaintiff Favorable", bg: "#FFFBEB", text: "#D97706" };
  if (score >= 50) return { label: "Competitive", bg: "#EFF6FF", text: "#2563EB" };
  return { label: "Restrictive", bg: "#FFF1F2", text: "#E11D48" };
}

export function PiViabilityTable({ scores }: { scores: PiViabilityScore[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("composite_score");
  const [sortAsc, setSortAsc] = useState(false);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "state");
    }
  }

  const sorted = [...scores].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (aVal === null && bVal === null) return 0;
    if (aVal === null) return 1;
    if (bVal === null) return -1;
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
  });

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return "";
    return sortAsc ? " \u25B2" : " \u25BC";
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="font-heading text-xl font-semibold text-midnight-navy mb-4">
        State Rankings
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-cloud text-xs uppercase text-slate-gray">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4 cursor-pointer select-none hover:text-intelligence-teal transition-colors" onClick={() => handleSort("state")}>
                State{sortIndicator("state")}
              </th>
              <th className="py-2 pr-4 cursor-pointer select-none hover:text-intelligence-teal transition-colors" onClick={() => handleSort("composite_score")}>
                Composite Score{sortIndicator("composite_score")}
              </th>
              <th className="py-2 pr-4">Negligence Rule</th>
              <th className="py-2 pr-4">Non-Econ Cap</th>
              <th className="py-2 pr-4">Punitive Cap</th>
              <th className="py-2 pr-4">Med-Mal Cap</th>
              <th className="py-2 pr-4">SOL</th>
              <th className="py-2">Avg Verdict</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-sm text-slate-gray">
                  No PI viability data available. Run the seed script to populate scores.
                </td>
              </tr>
            ) : (
              sorted.map((row, index) => {
                const badge = getViabilityBadge(row.composite_score);
                return (
                  <tr
                    key={row.state}
                    className="border-b border-cloud last:border-0"
                  >
                    <td className="py-2.5 pr-4 font-mono font-semibold text-intelligence-teal">
                      {index + 1}
                    </td>
                    <td className="py-2.5 pr-4 font-semibold text-midnight-navy">
                      {row.state}
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-midnight-navy">
                          {row.composite_score !== null ? `${row.composite_score.toFixed(1)}` : "—"}
                        </span>
                        <span className="text-xs text-slate-gray">/ 100</span>
                        <span
                          className="ml-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: badge.bg, color: badge.text }}
                        >
                          {badge.label}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-sm">{row.negligence_rule ?? "—"}</td>
                    <td className="py-2.5 pr-4 text-sm">{row.non_economic_cap ?? "—"}</td>
                    <td className="py-2.5 pr-4 text-sm">{row.punitive_cap ?? "—"}</td>
                    <td className="py-2.5 pr-4 text-sm">{row.med_mal_cap ?? "—"}</td>
                    <td className="py-2.5 pr-4 text-sm">{row.statute_of_limitations ?? "—"}</td>
                    <td className="py-2.5 text-sm">{row.avg_jury_verdict ?? "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
