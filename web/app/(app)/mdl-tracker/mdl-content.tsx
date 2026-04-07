"use client";

import { useMemo } from "react";
import type { MdlSummaryRow, MdlTrendPoint } from "@/lib/queries";
import { MdlTable } from "./mdl-table";

export function MdlContent({
  rows,
  trendByMdl,
  search,
  mdl,
  sort,
  dir,
}: {
  rows: MdlSummaryRow[];
  trendByMdl: Record<number, MdlTrendPoint[]>;
  search: string;
  mdl: string;
  sort: string;
  dir: string;
}) {
  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const parsedMdl = mdl.trim() ? Number.parseInt(mdl.trim(), 10) : null;

    return rows.filter((row) => {
      const matchesSearch =
        !normalizedSearch ||
        row.title.toLowerCase().includes(normalizedSearch);
      const matchesMdl =
        parsedMdl == null || Number.isNaN(parsedMdl)
          ? true
          : row.mdl_number === parsedMdl;

      return matchesSearch && matchesMdl;
    });
  }, [mdl, rows, search]);

  const topMovers = useMemo(() => {
    return [...filteredRows]
      .filter((row) => row.mom_change > 0)
      .sort((a, b) => Math.abs(b.mom_change) - Math.abs(a.mom_change))
      .slice(0, 10);
  }, [filteredRows]);

  return (
    <>
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-midnight-navy/5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-semibold text-midnight-navy">
              Top Movers
            </h2>
            <p className="mt-1 text-sm text-slate-gray">
              MDLs with the largest month-over-month increase in pending actions.
            </p>
          </div>
          <div className="rounded-full bg-cloud px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-intelligence-teal">
            10 fastest-growing dockets
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud text-xs uppercase text-slate-gray">
                <th className="py-2 pr-4">MDL #</th>
                <th className="py-2 pr-4">Case Name</th>
                <th className="py-2 pr-4">District</th>
                <th className="py-2 text-right">MoM Change</th>
              </tr>
            </thead>
            <tbody>
              {topMovers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-slate-gray">
                    No positive month-over-month movers match the current filters.
                  </td>
                </tr>
              ) : (
                topMovers.map((row) => (
                  <tr key={row.mdl_number} className="border-b border-cloud last:border-0">
                    <td className="py-3 pr-4 font-mono font-semibold text-intelligence-teal">
                      {row.mdl_number}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-midnight-navy">
                      {row.title}
                    </td>
                    <td className="py-3 pr-4 text-slate-gray">
                      {row.district ?? "n/a"}
                    </td>
                    <td className="py-3 text-right font-mono text-success">
                      +{row.mom_change.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MdlTable rows={filteredRows} trendByMdl={trendByMdl} sort={sort} dir={dir} />
    </>
  );
}
