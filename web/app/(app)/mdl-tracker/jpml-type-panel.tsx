import type { JpmlTypeSummary } from "@/lib/queries";
import { JpmlDateSelect } from "./jpml-date-select";

function formatReportDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function JpmlTypePanel({
  summaries,
  reportDate,
  reportDates,
  selectedDate,
}: {
  summaries: JpmlTypeSummary[];
  reportDate: string | null;
  reportDates: string[];
  selectedDate: string | null;
}) {
  if (summaries.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-midnight-navy/5">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          JPML by Type
        </h2>
        <p className="mt-4 text-center text-sm text-slate-gray">
          No JPML report data available yet.
        </p>
      </div>
    );
  }

  const totalActive = summaries[0]?.total_active_mdls ?? 0;
  const maxCount = summaries[0]?.mdl_count ?? 1;

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-midnight-navy/5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-heading text-xl font-semibold text-midnight-navy">
              JPML by Type
            </h2>
            <JpmlDateSelect
              reportDates={reportDates}
              selectedDate={selectedDate}
            />
          </div>
          <div className="mt-1 flex items-center gap-3">
            {reportDate && (
              <p className="text-sm text-slate-gray">
                Report: {formatReportDate(reportDate)}
              </p>
            )}
            <span className="text-sm text-slate-gray">·</span>
            <a
              href="https://www.jpml.uscourts.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-slate-gray transition hover:text-intelligence-teal"
            >
              Source: U.S. Judicial Panel on Multidistrict Litigation
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-3 w-3"
              >
                <path d="M6.22 8.72a.75.75 0 0 0 1.06 1.06l5.22-5.22v1.69a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69L6.22 8.72Z" />
                <path d="M3.5 6.75c0-.69.56-1.25 1.25-1.25H7A.75.75 0 0 0 7 4H4.75A2.75 2.75 0 0 0 2 6.75v4.5A2.75 2.75 0 0 0 4.75 14h4.5A2.75 2.75 0 0 0 12 11.25V9a.75.75 0 0 0-1.5 0v2.25c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25v-4.5Z" />
              </svg>
            </a>
          </div>
        </div>
        <div className="rounded-full bg-cloud px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-intelligence-teal">
          {totalActive} Active MDLs
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {summaries.map((row) => {
          const barWidth = maxCount > 0 ? (row.mdl_count / maxCount) * 100 : 0;

          return (
            <div
              key={row.mdl_type}
              className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-midnight-navy/5"
            >
              <p className="font-heading text-sm font-semibold text-midnight-navy">
                {row.mdl_type}
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold text-intelligence-teal">
                  {row.mdl_count}
                </span>
                <span className="text-sm text-slate-gray">
                  {row.pct_of_total ?? 0}%
                </span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-cloud">
                <div
                  className="h-2 rounded-full bg-intelligence-teal"
                  style={{ width: `${Math.max(barWidth, 3)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
