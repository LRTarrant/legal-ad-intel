"use client";

import { useMemo, useState } from "react";
import type { JpmlSnapshot } from "@/lib/queries/jpml";

const TYPE_COLORS: Record<string, string> = {
  "Products Liability": "#1A8C96",
  Antitrust: "#0B1D3A",
  "Data Breach and Consumer Privacy": "#2E5077",
  Miscellaneous: "#4FB8C4",
  "Intellectual Property": "#F59E0B",
  "Sales Practices": "#10B981",
  Securities: "#EF4444",
  "Common Disaster": "#8B5CF6",
  "Air Disaster": "#EC4899",
  "Employment Practices": "#6B7280",
};

function getTypeColor(type: string): string {
  return TYPE_COLORS[type] ?? "#6B7280";
}

function stripPrefix(name: string): string {
  return name.replace(/^IN RE:?\s*/i, "");
}

type SortKey =
  | "mdl_number"
  | "case_name"
  | "jpml_type"
  | "transferee_judge"
  | "district"
  | "master_docket";
type SortDirection = "asc" | "desc";

export interface JpmlSnapshotTableProps {
  snapshots: JpmlSnapshot[];
  selectedType: string | null;
  onClearFilter: () => void;
}

export function JpmlSnapshotTable({
  snapshots,
  selectedType,
  onClearFilter,
}: JpmlSnapshotTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("mdl_number");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  const filtered = useMemo(() => {
    if (!selectedType) return snapshots;
    return snapshots.filter((s) => s.jpml_type === selectedType);
  }, [snapshots, selectedType]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey] ?? "";
      const bVal = b[sortKey] ?? "";
      const cmp =
        typeof aVal === "number" && typeof bVal === "number"
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "mdl_number" ? "desc" : "asc");
    }
  }

  function headerLabel(label: string, key: SortKey) {
    if (sortKey !== key) return label;
    return `${label} ${sortDir === "asc" ? "▲" : "▼"}`;
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-midnight-navy">
          {selectedType ? (
            <>
              Showing {filtered.length} of {snapshots.length} MDLs
            </>
          ) : (
            <>{snapshots.length} MDLs</>
          )}
        </p>
        {selectedType && (
          <button
            type="button"
            onClick={onClearFilter}
            className="rounded-full bg-cloud px-3 py-1 text-xs font-medium text-slate-gray hover:bg-slate-gray/20 transition-colors"
          >
            Clear filter &times;
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cloud text-left text-xs font-medium uppercase text-slate-gray">
              <th className="cursor-pointer whitespace-nowrap px-3 py-2" onClick={() => toggleSort("mdl_number")}>
                {headerLabel("MDL #", "mdl_number")}
              </th>
              <th className="cursor-pointer whitespace-nowrap px-3 py-2" onClick={() => toggleSort("case_name")}>
                {headerLabel("Case Name", "case_name")}
              </th>
              <th className="cursor-pointer whitespace-nowrap px-3 py-2" onClick={() => toggleSort("jpml_type")}>
                {headerLabel("JPML Type", "jpml_type")}
              </th>
              <th className="cursor-pointer whitespace-nowrap px-3 py-2" onClick={() => toggleSort("transferee_judge")}>
                {headerLabel("Judge", "transferee_judge")}
              </th>
              <th className="cursor-pointer whitespace-nowrap px-3 py-2 text-center" onClick={() => toggleSort("district")}>
                {headerLabel("District", "district")}
              </th>
              <th className="cursor-pointer whitespace-nowrap px-3 py-2" onClick={() => toggleSort("master_docket")}>
                {headerLabel("Master Docket", "master_docket")}
              </th>
              <th className="whitespace-nowrap px-3 py-2">Source</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-slate-gray">
                  No JPML snapshot data available.
                </td>
              </tr>
            ) : (
              sorted.map((row) => {
                const color = getTypeColor(row.jpml_type);
                const displayName = stripPrefix(row.case_name);
                const searchQuery = encodeURIComponent(
                  `${row.master_docket ?? ""} ${row.case_name}`.trim()
                );

                return (
                  <tr
                    key={row.id}
                    className="border-b border-cloud hover:bg-cloud/50"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-sm">
                      {row.mdl_number}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className="block max-w-[300px] truncate"
                        title={row.case_name}
                      >
                        {displayName}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className="inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: `${color}18`,
                          color: color,
                        }}
                      >
                        {row.jpml_type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm">
                      {row.transferee_judge ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-center font-mono text-sm">
                      {row.district ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-sm">
                      {row.master_docket ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <a
                        href={`https://www.google.com/search?q=${searchQuery}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Search court records for MDL ${row.mdl_number}`}
                        className="text-sm text-intelligence-teal hover:underline"
                      >
                        Court Docket ↗
                      </a>
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
