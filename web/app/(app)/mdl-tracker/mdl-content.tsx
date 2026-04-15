"use client";

import { useMemo } from "react";
import type { MdlSummaryRow, MdlTrendPoint } from "@/lib/queries";
import { MdlTable } from "./mdl-table";
import { AdvertisingInsight } from "../components/advertising-insight";
import { TopMoversChart } from "./top-movers-chart";

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
          <div className="rounded-full bg-cloud px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-intelligence-teal">
            Top 10 fastest-growing dockets
          </div>
        </div>

        <div className="mt-4">
          <TopMoversChart rows={filteredRows} />
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
