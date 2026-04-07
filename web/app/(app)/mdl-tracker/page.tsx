import {
  getJpmlSnapshots,
  getJpmlTypeSummaries,
} from "@/lib/queries/mdl";

import {
  getMdlReportDates,
  getMdlSummary,
  getMdlTotals,
  getMdlTrend,
} from "@/lib/queries";
import { MdlContent } from "./mdl-content";
import { MdlFilterBar } from "./mdl-filter-bar";

export const metadata = {
  title: "MDL Tracker | Legal Marketing Intelligence",
};

type SearchParams = Promise<{
  date?: string | string[];
  mdl?: string | string[];
  search?: string | string[];
}>;

function getSingleValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function MdlTrackerPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const selectedDate = getSingleValue(params.date);
  const search = getSingleValue(params.search) ?? "";
  const mdl = getSingleValue(params.mdl) ?? "";

  const [reportDates, summaryRows, totals] = await Promise.all([
    getMdlReportDates(),
    getMdlSummary(selectedDate),
    getMdlTotals(selectedDate),
  ]);

  const trendEntries = await Promise.all(
    summaryRows.map(async (row) => [row.mdl_number, await getMdlTrend(row.mdl_number)] as const)
  );

  // NEW: JPML snapshot + type summaries
  const [
    { reportDate: jpmlReportDate, rows: jpmlSnapshots },
    { rows: jpmlTypeSummaries },
  ] = await Promise.all([
    getJpmlSnapshots(),          // defaults to latest JPML report
    getJpmlTypeSummaries(),      // same date as above
  ]);

  const trendByMdl = Object.fromEntries(trendEntries);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-midnight-navy">
          MDL Tracker
        </h1>
        <p className="mt-1 text-slate-gray">
          Monthly MDL docket counts with trend and momentum tracking
        </p>
      </div>

      <MdlFilterBar
        reportDates={reportDates}
        selectedDate={selectedDate}
        search={search}
        mdl={mdl}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          label="Total Active MDLs"
          value={totals.total_active_mdls.toLocaleString()}
        />
        <SummaryCard
          label="Total Pending Actions"
          value={totals.total_pending_actions.toLocaleString()}
        />
        <SummaryCard
          label="Latest Report Date"
          value={totals.latest_report_date ?? "n/a"}
        />
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="font-heading text-xl font-semibold text-midnight-navy">
              JPML by Type
            </h2>
            <p className="mt-1 text-sm text-slate-gray">
              Pending MDLs by JPML category as of {jpmlReportDate ?? "n/a"}
            </p>
          </div>
          <span className="rounded-full bg-cloud px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-teal">
            {jpmlSnapshots.length.toLocaleString()} active MDLs
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {jpmlTypeSummaries.map((row) => (
            <div
              key={`${row.report_date}-${row.mdl_type}`}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-midnight-navy">
                    {row.mdl_type}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-gray">
                    {row.pct_of_total}% of total
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-heading font-bold text-midnight-navy">
                    {row.mdl_count}
                  </p>
                  <p className="text-xs text-slate-gray">MDLs</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <MdlContent
        rows={summaryRows}
        trendByMdl={trendByMdl}
        search={search}
        mdl={mdl}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase text-slate-gray">{label}</p>
      <p className="mt-1 font-heading text-2xl font-bold text-midnight-navy">
        {value}
      </p>
    </div>
  );
}
