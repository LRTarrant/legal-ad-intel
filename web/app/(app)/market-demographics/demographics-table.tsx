"use client";

import { useState, useMemo } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Download,
  Filter,
} from "lucide-react";
import type { MsaDemographic } from "@/lib/queries";

/* ─── column definition ───────────────────────────────────── */

type ColumnDef = {
  key: keyof MsaDemographic | "__rank";
  label: string;
  short: string;
  group: "identity" | "race" | "economic" | "education" | "housing";
  align: "left" | "right";
  format: (v: unknown, row?: MsaDemographic) => string;
  sortable: boolean;
  heatmap?: { low: string; high: string; min: number; max: number };
};

const fmt = (n: unknown) => (n == null ? "—" : (n as number).toLocaleString());
const fmtPct = (n: unknown) =>
  n == null ? "—" : `${(n as number).toFixed(1)}%`;
const fmtCur = (n: unknown) =>
  n == null ? "—" : `$${(n as number).toLocaleString()}`;
const fmtAge = (n: unknown) =>
  n == null ? "—" : (n as number).toFixed(1);

const COLUMNS: ColumnDef[] = [
  {
    key: "__rank",
    label: "#",
    short: "#",
    group: "identity",
    align: "right",
    format: () => "",
    sortable: false,
  },
  {
    key: "cbsa_title",
    label: "Market",
    short: "Market",
    group: "identity",
    align: "left",
    format: (v) => (v as string) ?? "—",
    sortable: true,
  },
  {
    key: "cbsa_type",
    label: "Type",
    short: "Type",
    group: "identity",
    align: "left",
    format: (v) =>
      (v as string)?.includes("Metropolitan") ? "Metro" : "Micro",
    sortable: true,
  },
  {
    key: "total_population",
    label: "Population",
    short: "Pop",
    group: "identity",
    align: "right",
    format: fmt,
    sortable: true,
  },
  {
    key: "median_age",
    label: "Median Age",
    short: "Med. Age",
    group: "identity",
    align: "right",
    format: fmtAge,
    sortable: true,
  },
  {
    key: "pct_white",
    label: "White %",
    short: "White",
    group: "race",
    align: "right",
    format: fmtPct,
    sortable: true,
    heatmap: { low: "#f1f5f9", high: "#1A8C96", min: 0, max: 100 },
  },
  {
    key: "pct_black",
    label: "Black %",
    short: "Black",
    group: "race",
    align: "right",
    format: fmtPct,
    sortable: true,
    heatmap: { low: "#f1f5f9", high: "#1A8C96", min: 0, max: 100 },
  },
  {
    key: "pct_hispanic",
    label: "Hispanic %",
    short: "Hispanic",
    group: "race",
    align: "right",
    format: fmtPct,
    sortable: true,
    heatmap: { low: "#f1f5f9", high: "#1A8C96", min: 0, max: 100 },
  },
  {
    key: "pct_asian",
    label: "Asian %",
    short: "Asian",
    group: "race",
    align: "right",
    format: fmtPct,
    sortable: true,
    heatmap: { low: "#f1f5f9", high: "#1A8C96", min: 0, max: 100 },
  },
  {
    key: "median_household_income",
    label: "Median Income",
    short: "Income",
    group: "economic",
    align: "right",
    format: fmtCur,
    sortable: true,
    heatmap: { low: "#fef2f2", high: "#10B981", min: 20000, max: 120000 },
  },
  {
    key: "pct_poverty",
    label: "Poverty %",
    short: "Poverty",
    group: "economic",
    align: "right",
    format: fmtPct,
    sortable: true,
    heatmap: { low: "#f0fdf4", high: "#EF4444", min: 0, max: 40 },
  },
  {
    key: "pct_employed",
    label: "Employed %",
    short: "Employ",
    group: "economic",
    align: "right",
    format: fmtPct,
    sortable: true,
  },
  {
    key: "pct_uninsured",
    label: "Uninsured %",
    short: "Unins.",
    group: "economic",
    align: "right",
    format: fmtPct,
    sortable: true,
    heatmap: { low: "#f0fdf4", high: "#EF4444", min: 0, max: 30 },
  },
  {
    key: "pct_high_school_or_higher",
    label: "HS+ %",
    short: "HS+",
    group: "education",
    align: "right",
    format: fmtPct,
    sortable: true,
  },
  {
    key: "pct_bachelors_or_higher",
    label: "BA+ %",
    short: "BA+",
    group: "education",
    align: "right",
    format: fmtPct,
    sortable: true,
  },
  {
    key: "pct_owner_occupied",
    label: "Owner Occ %",
    short: "Owner",
    group: "housing",
    align: "right",
    format: fmtPct,
    sortable: true,
  },
];

/* ─── column groups ───────────────────────────────────────── */

type ColumnGroup = {
  key: string;
  label: string;
  groups: ColumnDef["group"][];
};

const COLUMN_GROUPS: ColumnGroup[] = [
  { key: "all", label: "All Columns", groups: ["identity", "race", "economic", "education", "housing"] },
  { key: "race", label: "Race & Ethnicity", groups: ["identity", "race"] },
  { key: "economic", label: "Economic", groups: ["identity", "economic"] },
  { key: "education", label: "Education & Housing", groups: ["identity", "education", "housing"] },
];

/* ─── heatmap helper ──────────────────────────────────────── */

function heatmapBg(col: ColumnDef, value: unknown): string | undefined {
  if (!col.heatmap || value == null) return undefined;
  const { low, high, min, max } = col.heatmap;
  const v = value as number;
  const t = Math.max(0, Math.min(1, (v - min) / (max - min)));

  // Parse hex colors
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [lr, lg, lb] = parse(low);
  const [hr, hg, hb] = parse(high);
  const r = Math.round(lr + (hr - lr) * t);
  const g = Math.round(lg + (hg - lg) * t);
  const b = Math.round(lb + (hb - lb) * t);

  return `rgb(${r}, ${g}, ${b}, 0.18)`;
}

/* ─── CSV export ──────────────────────────────────────────── */

function exportCsv(data: MsaDemographic[], visibleCols: ColumnDef[]) {
  const cols = visibleCols.filter((c) => c.key !== "__rank");
  const header = cols.map((c) => c.label).join(",");
  const rows = data.map((row) =>
    cols
      .map((c) => {
        const raw = row[c.key as keyof MsaDemographic];
        if (raw == null) return "";
        if (typeof raw === "string") return `"${raw.replace(/"/g, '""')}"`;
        return raw;
      })
      .join(",")
  );
  const blob = new Blob([header + "\n" + rows.join("\n")], {
    type: "text/csv",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "market-demographics.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── main component ──────────────────────────────────────── */

type SortDir = "asc" | "desc";

type Props = {
  data: MsaDemographic[];
  totalCount: number;
};

export function DemographicsTable({ data, totalCount }: Props) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof MsaDemographic>("total_population");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [activeGroup, setActiveGroup] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "metro" | "micro">("all");

  const visibleColumns = useMemo(() => {
    const group = COLUMN_GROUPS.find((g) => g.key === activeGroup)!;
    return COLUMNS.filter((c) => group.groups.includes(c.group));
  }, [activeGroup]);

  const filtered = useMemo(() => {
    let rows = data;

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => r.cbsa_title?.toLowerCase().includes(q));
    }

    // Type filter
    if (typeFilter !== "all") {
      rows = rows.filter((r) =>
        typeFilter === "metro"
          ? r.cbsa_type?.includes("Metropolitan")
          : r.cbsa_type === "Micropolitan"
      );
    }

    return rows;
  }, [data, search, typeFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  function handleSort(key: keyof MsaDemographic) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortIcon({ colKey }: { colKey: keyof MsaDemographic }) {
    if (sortKey !== colKey)
      return <ArrowUpDown className="ml-1 inline h-3 w-3 text-slate-gray/50" />;
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3 w-3 text-intelligence-teal" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3 text-intelligence-teal" />
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Toolbar */}
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold text-midnight-navy">
              MSA Demographics Overview
            </h2>
            <p className="text-sm text-slate-gray">
              Showing {sorted.length} of {totalCount} markets.
              Click any column header to sort.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-gray/60" />
              <input
                type="text"
                placeholder="Search markets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-cloud pl-9 pr-3 text-sm text-midnight-navy placeholder:text-slate-gray/60 focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal/30"
              />
            </div>

            {/* Type filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-gray/60" />
              <select
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value as "all" | "metro" | "micro")
                }
                className="h-9 rounded-lg border border-slate-200 bg-cloud px-2.5 text-sm text-midnight-navy focus:border-intelligence-teal focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="metro">Metro Only</option>
                <option value="micro">Micro Only</option>
              </select>
            </div>

            {/* CSV Export */}
            <button
              onClick={() => exportCsv(sorted, visibleColumns)}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-cloud px-3 text-sm font-medium text-midnight-navy transition hover:border-intelligence-teal hover:text-intelligence-teal"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </button>
          </div>
        </div>

        {/* Column group pills */}
        <div className="mt-3 flex flex-wrap gap-2">
          {COLUMN_GROUPS.map((g) => (
            <button
              key={g.key}
              onClick={() => setActiveGroup(g.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                activeGroup === g.key
                  ? "bg-intelligence-teal text-white"
                  : "bg-cloud text-slate-gray hover:bg-slate-200 hover:text-midnight-navy"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-gray">
              {visibleColumns.map((col) => {
                const isRank = col.key === "__rank";
                const isSortable = col.sortable;
                return (
                  <th
                    key={col.key}
                    className={`whitespace-nowrap px-4 py-3 ${
                      col.align === "right" ? "text-right" : "text-left"
                    } ${isSortable ? "cursor-pointer select-none hover:text-intelligence-teal" : ""}`}
                    onClick={
                      isSortable
                        ? () => handleSort(col.key as keyof MsaDemographic)
                        : undefined
                    }
                    title={
                      isSortable
                        ? `Sort by ${col.label}`
                        : isRank
                          ? "Row number"
                          : undefined
                    }
                  >
                    {col.short}
                    {isSortable && (
                      <SortIcon colKey={col.key as keyof MsaDemographic} />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length}
                  className="px-4 py-10 text-center text-sm text-slate-gray"
                >
                  No markets match your search.
                </td>
              </tr>
            ) : (
              sorted.map((row, idx) => (
                <tr
                  key={row.cbsa_code}
                  className="transition-colors hover:bg-cloud/60"
                >
                  {visibleColumns.map((col) => {
                    const isRank = col.key === "__rank";
                    const value = isRank
                      ? idx + 1
                      : row[col.key as keyof MsaDemographic];
                    const display = isRank
                      ? String(idx + 1)
                      : col.format(value, row);
                    const bg = !isRank ? heatmapBg(col, value) : undefined;
                    const isType = col.key === "cbsa_type";

                    return (
                      <td
                        key={col.key}
                        className={`whitespace-nowrap px-4 py-3 ${
                          col.align === "right"
                            ? "text-right tabular-nums"
                            : ""
                        } ${
                          col.key === "cbsa_title"
                            ? "font-medium text-midnight-navy"
                            : isRank
                              ? "font-mono text-xs text-slate-gray"
                              : "text-midnight-navy"
                        }`}
                        style={bg ? { backgroundColor: bg } : undefined}
                      >
                        {isType ? (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              (value as string)?.includes("Metropolitan")
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {display}
                          </span>
                        ) : (
                          display
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {sorted.length > 0 && (
        <div className="border-t border-slate-200 px-6 py-3">
          <p className="text-xs text-slate-gray">
            Sorted by{" "}
            <span className="font-medium text-midnight-navy">
              {COLUMNS.find((c) => c.key === sortKey)?.label ?? sortKey}
            </span>{" "}
            ({sortDir === "asc" ? "ascending" : "descending"})
            {search && (
              <>
                {" "}
                · filtered by &ldquo;
                <span className="font-medium text-midnight-navy">{search}</span>
                &rdquo;
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
