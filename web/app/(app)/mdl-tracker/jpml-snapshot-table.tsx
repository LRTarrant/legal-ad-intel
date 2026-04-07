"use client";

import { useMemo, useState } from "react";
import type { JpmlSnapshot } from "@/lib/queries";

type SortKey =
  | "mdl_number"
  | "case_name"
  | "jpml_type"
  | "transferee_judge"
  | "district"
  | "master_docket";
type SortDir = "asc" | "desc";

function cleanCaseName(name: string): string {
  return name.replace(/^IN RE:\s*/i, "");
}

function compare(a: JpmlSnapshot, b: JpmlSnapshot, key: SortKey, dir: SortDir) {
  const left = a[key] ?? "";
  const right = b[key] ?? "";
  const base =
    typeof left === "number" && typeof right === "number"
      ? left - right
      : String(left).localeCompare(String(right));
  return dir === "asc" ? base : -base;
}

function ExternalLinkIcon() {
  return (
    <svg
      className="ml-1 inline-block h-3 w-3"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.5 1.5H2a.5.5 0 00-.5.5v8a.5.5 0 00.5.5h8a.5.5 0 00.5-.5V7.5" />
      <path d="M7 1.5h3.5V5" />
      <path d="M10.5 1.5L5.5 6.5" />
    </svg>
  );
}

export function JpmlSnapshotTable({
  snapshots,
  selectedType,
  onClearFilter,
}: {
  snapshots: JpmlSnapshot[];
  selectedType: string | null;
  onClearFilter: () => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("mdl_number");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    if (!selectedType) return snapshots;
    return snapshots.filter((s) => s.jpml_type === selectedType);
  }, [snapshots, selectedType]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => compare(a, b, sortKey, sortDir));
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "mdl_number" ? "desc" : "asc");
    }
  }

  function headerLabel(text: string, key: SortKey) {
    if (sortKey !== key) return text;
    return `${text} ${sortDir === "asc" ? "↑" : "↓"}`;
  }

  function buildSearchUrl(snapshot: JpmlSnapshot): string {
    const query = [snapshot.master_docket, cleanCaseName(snapshot.case_name)]
      .filter(Boolean)
      .join(" ");
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-gray">
          {selectedType ? (
            <>
              Showing{" "}
              <span className="font-semibold text-midnight-navy">
                {filtered.length}
              </span>{" "}
              of {snapshots.length} MDLs — filtered by{" "}
              <span className="font-semibold text-intelligence-teal">
                {selectedType}
              </span>
              <button
                type="button"
                onClick={onClearFilter}
                className="ml-2 rounded bg-cloud px-2 py-0.5 text-xs font-medium text-midnight-navy hover:bg-slate-gray/20"
              >
                Clear filter ✕
              </button>
            </>
          ) : (
            <>
              <span className="font-semibold text-midnight-navy">
                {snapshots.length}
              </span>{" "}
              MDLs
            </>
          )}
        </p>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-cloud text-xs uppercase text-slate-gray">
              <th className="whitespace-nowrap py-2 pr-4">
                <button type="button" onClick={() => toggleSort("mdl_number")}>
                  {headerLabel("MDL #", "mdl_number")}
                </button>
              </th>
              <th className="whitespace-nowrap py-2 pr-4">
                <button type="button" onClick={() => toggleSort("case_name")}>
                  {headerLabel("Case Name", "case_name")}
                </button>
              </th>
              <th className="whitespace-nowrap py-2 pr-4">
                <button type="button" onClick={() => toggleSort("jpml_type")}>
                  {headerLabel("JPML Type", "jpml_type")}
                </button>
              </th>
              <th className="whitespace-nowrap py-2 pr-4">
                <button
                  type="button"
                  onClick={() => toggleSort("transferee_judge")}
                >
                  {headerLabel("Judge", "transferee_judge")}
                </button>
              </th>
              <th className="whitespace-nowrap py-2 pr-4">
                <button type="button" onClick={() => toggleSort("district")}>
                  {headerLabel("District", "district")}
                </button>
              </th>
              <th className="whitespace-nowrap py-2 pr-4">
                <button
                  type="button"
                  onClick={() => toggleSort("master_docket")}
                >
                  {headerLabel("Master Docket", "master_docket")}
                </button>
              </th>
              <th className="whitespace-nowrap py-2">Source</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-8 text-center text-sm text-slate-gray"
                >
                  No snapshots match the current filter.
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-cloud last:border-0"
                >
                  <td className="py-3 pr-4 font-mono font-semibold text-intelligence-teal">
                    {row.mdl_number}
                  </td>
                  <td
                    className="max-w-[260px] truncate py-3 pr-4 font-semibold text-midnight-navy"
                    title={row.case_name}
                  >
                    {cleanCaseName(row.case_name)}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="inline-block rounded-full bg-cloud px-2 py-0.5 text-xs font-medium text-midnight-navy">
                      {row.jpml_type}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-slate-gray">
                    {row.transferee_judge ?? "—"}
                  </td>
                  <td className="py-3 pr-4 font-mono text-slate-gray">
                    {row.district ?? "—"}
                  </td>
                  <td className="py-3 pr-4 font-mono text-slate-gray">
                    {row.master_docket ?? "—"}
                  </td>
                  <td className="whitespace-nowrap py-3">
                    {row.master_docket ? (
                      <a
                        href={buildSearchUrl(row)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Search court records for MDL ${row.mdl_number}`}
                        className="inline-flex items-center text-xs font-medium text-intelligence-teal hover:underline"
                      >
                        Court Docket
                        <ExternalLinkIcon />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-gray">—</span>
                    )}
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
