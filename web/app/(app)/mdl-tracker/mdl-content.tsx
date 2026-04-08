"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { MdlSummaryRow, MdlTrendPoint } from "@/lib/queries";
import { getTypeColor, getTypeShortLabel } from "./jpml-colors";
import { JpmlTypeFilter } from "./jpml-type-filter";
import { MdlTable } from "./mdl-table";
import { AdvertisingInsight } from "../components/advertising-insight";

export function MdlContent({
  rows,
  trendByMdl,
  search,
  mdl,
}: {
  rows: MdlSummaryRow[];
  trendByMdl: Record<number, MdlTrendPoint[]>;
  search: string;
  mdl: string;
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

  const searchParams = useSearchParams();
  const selectedJpmlType = searchParams.get("jpml_type") ?? "";

  const allTopMovers = useMemo(() => {
    return [...filteredRows]
      .filter((row) => row.mom_change > 0)
      .sort((a, b) => Math.abs(b.mom_change) - Math.abs(a.mom_change))
      .slice(0, 10);
  }, [filteredRows]);

  const availableJpmlTypes = useMemo(() => {
    const types = new Set<string>();
    for (const row of allTopMovers) {
      if (row.jpml_type) types.add(row.jpml_type);
    }
    return [...types].sort();
  }, [allTopMovers]);

  const topMovers = useMemo(() => {
    if (!selectedJpmlType) return allTopMovers;
    return allTopMovers.filter((row) => row.jpml_type === selectedJpmlType);
  }, [allTopMovers, selectedJpmlType]);

  return (
    <>
      <AdvertisingInsight>
        <p>
          <strong>Track MDL momentum to time your campaigns.</strong> Rapidly growing MDLs (Top Movers)
          signal rising plaintiff awareness — the ideal window to launch targeted advertising before market
          saturation drives up cost-per-lead. Use MDL pending action counts to estimate total addressable
          market size by litigation, and monitor JPML classifications to identify which practice areas are
          consolidating fastest.
        </p>
      </AdvertisingInsight>

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
          <div className="flex items-center gap-4">
            <JpmlTypeFilter
              availableTypes={availableJpmlTypes}
              totalCount={allTopMovers.length}
              filteredCount={topMovers.length}
            />
            <div className="rounded-full bg-cloud px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-intelligence-teal">
              10 fastest-growing dockets
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud text-xs uppercase text-slate-gray">
                <th className="py-2 pr-4">MDL #</th>
                <th className="py-2 pr-4">Case Name</th>
                <th className="py-2 pr-4">JPML Type</th>
                <th className="py-2 pr-4">District</th>
                <th className="py-2 text-right">MoM Change</th>
              </tr>
            </thead>
            <tbody>
              {topMovers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-slate-gray">
                    No positive month-over-month movers match the current filters.
                  </td>
                </tr>
              ) : (
                topMovers.map((row) => (
                  <tr key={row.mdl_number} className="border-b border-cloud last:border-0">
                    <td className="py-3 pr-4 font-mono font-medium">
                      <Link
                        href={`/mdl-tracker/${row.mdl_number}`}
                        className="text-intelligence-teal hover:underline"
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
                          className="text-xs font-medium rounded-full px-2 py-0.5"
                          style={{
                            backgroundColor: getTypeColor(row.jpml_type) + "22",
                            color: getTypeColor(row.jpml_type),
                          }}
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

      <div id="mdl-table" className="scroll-mt-16">
        <MdlTable rows={filteredRows} trendByMdl={trendByMdl} />
      </div>

      <div className="flex justify-center py-8">
        <a
          href="#filters"
          className="group flex items-center gap-2 text-sm font-medium rounded-full px-5 py-2 transition-colors"
          style={{
            color: "#1A8C96",
            border: "1px solid #1A8C96",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#1A8C96";
            e.currentTarget.style.color = "#ffffff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#1A8C96";
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 15l-6-6-6 6" />
          </svg>
          Back to Top
        </a>
      </div>
    </>
  );
}
