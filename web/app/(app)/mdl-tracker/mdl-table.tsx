"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import type { MdlSummaryRow, MdlTrendPoint } from "@/lib/queries";
import { getTypeColor, getTypeShortLabel } from "./jpml-colors";

type SortKey =
  | "mdl_number"
  | "title"
  | "district"
  | "judge_name"
  | "pending_actions"
  | "mom_change"
  | "mom_change_pct";
type SortDirection = "asc" | "desc";

function getMomChangePct(row: MdlSummaryRow): number {
  const previous = row.pending_actions - row.mom_change;
  if (previous <= 0) return 0;
  return (row.mom_change / previous) * 100;
}

function compareValues(
  a: MdlSummaryRow,
  b: MdlSummaryRow,
  key: SortKey,
  direction: SortDirection
) {
  if (key === "mom_change_pct") {
    const base = getMomChangePct(a) - getMomChangePct(b);
    return direction === "asc" ? base : -base;
  }
  const left = a[key] ?? "";
  const right = b[key] ?? "";
  const base =
    typeof left === "number" && typeof right === "number"
      ? left - right
      : String(left).localeCompare(String(right));
  return direction === "asc" ? base : -base;
}

function TrendBars({ trend }: { trend: MdlTrendPoint[] }) {
  const maxPending = trend.length
    ? Math.max(...trend.map((point) => point.pending_actions))
    : 0;

  if (trend.length === 0) {
    return (
      <p className="text-sm text-slate-gray">
        No historical snapshots available for this MDL.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {trend.map((point) => {
        const width = maxPending > 0 ? (point.pending_actions / maxPending) * 100 : 0;
        return (
          <div key={point.stats_month} className="flex items-center gap-4">
            <span className="w-28 font-mono text-xs text-slate-gray">
              {point.stats_month}
            </span>
            <div className="flex-1">
              <div className="h-7 rounded bg-cloud">
                <div
                  className="flex h-7 items-center rounded bg-intelligence-teal px-3 text-xs font-semibold text-white"
                  style={{ width: `${Math.max(width, 8)}%` }}
                >
                  {point.pending_actions.toLocaleString()}
                </div>
              </div>
            </div>
            <span className="w-24 text-right font-mono text-xs text-slate-gray">
              {point.pending_actions_change == null
                ? "n/a"
                : `${point.pending_actions_change > 0 ? "+" : ""}${point.pending_actions_change.toLocaleString()}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function trendArrow(trend: MdlSummaryRow["trend"]) {
  if (trend === "up") return "↑";
  if (trend === "down") return "↓";
  return "→";
}

export function MdlTable({
  rows,
  trendByMdl,
}: {
  rows: MdlSummaryRow[];
  trendByMdl: Record<number, MdlTrendPoint[]>;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("pending_actions");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [expandedMdl, setExpandedMdl] = useState<number | null>(
    rows[0]?.mdl_number ?? null
  );

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => compareValues(a, b, sortKey, sortDirection));
  }, [rows, sortDirection, sortKey]);

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "pending_actions" || nextKey === "mom_change" || nextKey === "mom_change_pct" ? "desc" : "asc");
  }

  function label(text: string, key: SortKey) {
    if (sortKey !== key) {
      return text;
    }

    return `${text} ${sortDirection === "asc" ? "↑" : "↓"}`;
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-midnight-navy/5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-midnight-navy">
            MDL Docket Table
          </h2>
          <p className="mt-1 text-sm text-slate-gray">
            Click any row to expand a pending-actions history chart.
          </p>
        </div>
        <div className="rounded-full bg-cloud px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-intelligence-teal">
          {rows.length.toLocaleString()} MDLs
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-cloud text-xs uppercase text-slate-gray">
              <th className="py-2 pr-4">
                <button type="button" onClick={() => toggleSort("mdl_number")}>
                  {label("MDL #", "mdl_number")}
                </button>
              </th>
              <th className="py-2 pr-4">
                <button type="button" onClick={() => toggleSort("title")}>
                  {label("Case Name", "title")}
                </button>
              </th>
              <th className="py-2 pr-4">JPML Type</th>
              <th className="py-2 pr-4">
                <button type="button" onClick={() => toggleSort("district")}>
                  {label("District", "district")}
                </button>
              </th>
              <th className="py-2 pr-4">
                <button type="button" onClick={() => toggleSort("judge_name")}>
                  {label("Judge", "judge_name")}
                </button>
              </th>
              <th className="py-2 pr-4 text-right">
                <button type="button" onClick={() => toggleSort("pending_actions")}>
                  {label("Pending Actions", "pending_actions")}
                </button>
              </th>
              <th className="py-2 pr-4 text-right">
                <button type="button" onClick={() => toggleSort("mom_change")}>
                  {label("MoM Change", "mom_change")}
                </button>
              </th>
              <th className="py-2 pr-4 text-right">
                <button type="button" onClick={() => toggleSort("mom_change_pct")}>
                  {label("MoM Change %", "mom_change_pct")}
                </button>
              </th>
              <th className="py-2 text-right">Trend</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const isExpanded = expandedMdl === row.mdl_number;
              const changeClass =
                row.mom_change > 0
                  ? "text-success"
                  : row.mom_change < 0
                    ? "text-alert"
                    : "text-slate-gray";

              return (
                <Fragment key={row.mdl_number}>
                  <tr
                    className="cursor-pointer border-b border-cloud transition hover:bg-cloud/50"
                    onClick={() =>
                      setExpandedMdl((current) =>
                        current === row.mdl_number ? null : row.mdl_number
                      )
                    }
                  >
                    <td className="py-3 pr-4 font-mono font-medium">
                      <Link
                        href={`/mdl-tracker/${row.mdl_number}`}
                        className="text-intelligence-teal hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.mdl_number}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 font-semibold text-midnight-navy">
                      {row.title}
                    </td>
                    <td className="py-3 pr-4">
                      {row.jpml_type ? (
                        <span
                          className="inline-block max-w-[10rem] truncate rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: `${getTypeColor(row.jpml_type)}26`,
                            color: getTypeColor(row.jpml_type),
                          }}
                          title={row.jpml_type}
                        >
                          {getTypeShortLabel(row.jpml_type)}
                        </span>
                      ) : (
                        <span className="text-slate-gray">&mdash;</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-gray">
                      {row.district ?? "n/a"}
                    </td>
                    <td className="py-3 pr-4 text-slate-gray">
                      {row.judge_name ?? "n/a"}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono">
                      {row.pending_actions.toLocaleString()}
                    </td>
                    <td className={`py-3 pr-4 text-right font-mono ${changeClass}`}>
                      {row.mom_change > 0 ? "+" : ""}
                      {row.mom_change.toLocaleString()}
                    </td>
                    <td className={`py-3 pr-4 text-right font-mono ${changeClass}`}>
                      {(() => {
                        const pct = getMomChangePct(row);
                        if (pct === 0 && row.mom_change === 0) return "0.0%";
                        const sign = pct > 0 ? "+" : "";
                        return `${sign}${pct.toFixed(1)}%`;
                      })()}
                    </td>
                    <td className={`py-3 text-right font-heading text-lg ${changeClass}`}>
                      {trendArrow(row.trend)}
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr className="border-b border-cloud bg-cloud/35">
                      <td colSpan={9} className="px-4 py-5">
                        <div className="mb-3 flex items-end justify-between gap-4">
                          <div>
                            <h3 className="font-heading text-lg font-semibold text-midnight-navy">
                              MDL {row.mdl_number} Trend
                            </h3>
                            <p className="mt-1 text-sm text-slate-gray">
                              Pending actions by reporting month
                            </p>
                          </div>
                        </div>
                        <TrendBars trend={trendByMdl[row.mdl_number] ?? []} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
