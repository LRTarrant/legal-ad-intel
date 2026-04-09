"use client";

import { useState, useMemo } from "react";
import type { StateOpportunityScore } from "@/lib/queries";

type SortColumn =
  | "composite_rank"
  | "state"
  | "opportunity_score"
  | "pi_viability_score"
  | "total_incidents"
  | "incident_trend_pct"
  | "negligence_rule";

type SortDir = "asc" | "desc";

function getOpportunityBadge(score: number | null) {
  if (score === null) return { label: "N/A", bg: "#F1F5F9", text: "#6B7280" };
  if (score >= 75) return { label: "High Opportunity", bg: "#FFFBEB", text: "#D97706" };
  if (score >= 60) return { label: "Moderate", bg: "#EFF6FF", text: "#2563EB" };
  if (score >= 45) return { label: "Emerging", bg: "#F1F5F9", text: "#6B7280" };
  return { label: "Low Priority", bg: "#FFF1F2", text: "#E11D48" };
}

function getPiViabilityBadge(score: number | null) {
  if (score === null) return { label: "N/A", bg: "#F1F5F9", text: "#6B7280" };
  if (score >= 70) return { label: "Favorable", bg: "#FFFBEB", text: "#D97706" };
  if (score >= 50) return { label: "Competitive", bg: "#EFF6FF", text: "#2563EB" };
  return { label: "Restrictive", bg: "#FFF1F2", text: "#E11D48" };
}

function formatNegligenceRule(rule: string | null): string {
  if (!rule) return "—";
  switch (rule) {
    case "pure_comparative":
      return "Pure Comparative";
    case "modified_50":
      return "Modified 50%";
    case "modified_51":
      return "Modified 51%";
    case "contributory":
      return "Contributory";
    default:
      return rule;
  }
}

function getTierFromScore(score: number): string {
  if (score >= 75) return "high";
  if (score >= 60) return "moderate";
  if (score >= 45) return "emerging";
  return "low";
}

export function OpportunityTable({ scores }: { scores: StateOpportunityScore[] }) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("opportunity_score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterNegligence, setFilterNegligence] = useState("");
  const [filterTier, setFilterTier] = useState("");
  const [showAll, setShowAll] = useState(false);

  function handleSort(col: SortColumn) {
    if (sortColumn === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(col);
      setSortDir(col === "state" ? "asc" : "desc");
    }
  }

  function sortIndicator(col: SortColumn) {
    if (sortColumn !== col) return "";
    return sortDir === "asc" ? " \u25B2" : " \u25BC";
  }

  const filtered = useMemo(() => {
    let result = scores;
    if (filterNegligence) {
      result = result.filter((s) => s.negligence_rule === filterNegligence);
    }
    if (filterTier) {
      result = result.filter((s) => getTierFromScore(s.opportunity_score) === filterTier);
    }
    return result;
  }, [scores, filterNegligence, filterTier]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
  }, [filtered, sortColumn, sortDir]);

  const displayed = showAll ? sorted : sorted.slice(0, 25);

  const thClass =
    "py-2 pr-4 cursor-pointer select-none hover:text-intelligence-teal transition-colors";

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy mr-auto">
          State Rankings
        </h2>

        <select
          value={filterNegligence}
          onChange={(e) => setFilterNegligence(e.target.value)}
          className="rounded-md border border-cloud bg-white px-3 py-1.5 text-sm text-midnight-navy"
        >
          <option value="">All Negligence Rules</option>
          <option value="pure_comparative">Pure Comparative</option>
          <option value="modified_50">Modified 50%</option>
          <option value="modified_51">Modified 51%</option>
          <option value="contributory">Contributory</option>
        </select>

        <select
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value)}
          className="rounded-md border border-cloud bg-white px-3 py-1.5 text-sm text-midnight-navy"
        >
          <option value="">All Tiers</option>
          <option value="high">High Opportunity</option>
          <option value="moderate">Moderate</option>
          <option value="emerging">Emerging</option>
          <option value="low">Low Priority</option>
        </select>

        <button
          onClick={() => setShowAll(!showAll)}
          className="rounded-md border border-cloud px-3 py-1.5 text-sm font-medium text-intelligence-teal hover:bg-cloud transition-colors"
        >
          {showAll ? "Show Top 25" : `Show All ${sorted.length}`}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-cloud text-xs uppercase text-slate-gray">
              <th className={thClass} onClick={() => handleSort("composite_rank")}>
                #{sortIndicator("composite_rank")}
              </th>
              <th className={thClass} onClick={() => handleSort("state")}>
                State{sortIndicator("state")}
              </th>
              <th className={thClass} onClick={() => handleSort("opportunity_score")}>
                Opportunity Score{sortIndicator("opportunity_score")}
              </th>
              <th className={thClass} onClick={() => handleSort("pi_viability_score")}>
                PI Viability{sortIndicator("pi_viability_score")}
              </th>
              <th className={thClass} onClick={() => handleSort("total_incidents")}>
                Incidents (5yr){sortIndicator("total_incidents")}
              </th>
              <th className={thClass} onClick={() => handleSort("incident_trend_pct")}>
                Trend{sortIndicator("incident_trend_pct")}
              </th>
              <th className={thClass} onClick={() => handleSort("negligence_rule")}>
                Negligence Rule{sortIndicator("negligence_rule")}
              </th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-slate-gray">
                  No data available yet — apply the migration and run the opportunity scoring RPC.
                </td>
              </tr>
            ) : (
              displayed.map((row) => {
                const oppBadge = getOpportunityBadge(row.opportunity_score);
                const piBadge = getPiViabilityBadge(row.pi_viability_score);
                const trendPositive = row.incident_trend_pct > 0;
                const trendNegative = row.incident_trend_pct < 0;

                return (
                  <tr key={row.state} className="border-b border-cloud last:border-0">
                    <td className="py-2.5 pr-4 font-mono font-semibold text-intelligence-teal">
                      {row.composite_rank}
                    </td>
                    <td className="py-2.5 pr-4 font-mono font-bold text-midnight-navy">
                      {row.state}
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-bold text-midnight-navy">
                          {row.opportunity_score}
                        </span>
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: oppBadge.bg, color: oppBadge.text }}
                        >
                          {oppBadge.label}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-24 rounded-full" style={{ backgroundColor: "#F1F5F9" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: "#1A8C96",
                            width: `${Math.min(100, Number(row.opportunity_score))}%`,
                          }}
                        />
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-midnight-navy">
                          {row.pi_viability_score}
                        </span>
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: piBadge.bg, color: piBadge.text }}
                        >
                          {piBadge.label}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-midnight-navy">
                      {row.total_incidents.toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className="font-mono font-medium"
                        style={{
                          color: trendPositive ? "#10B981" : trendNegative ? "#EF4444" : "#6B7280",
                        }}
                      >
                        {trendPositive ? "\u2191" : trendNegative ? "\u2193" : "\u2192"}{" "}
                        {Math.abs(Number(row.incident_trend_pct)).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 text-sm text-midnight-navy">
                      {formatNegligenceRule(row.negligence_rule)}
                    </td>
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
