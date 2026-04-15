import type { JpmlTypeSummary } from "@/lib/queries";
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

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
  controls,
  donutChart,
}: {
  summaries: JpmlTypeSummary[];
  reportDate: string | null;
  controls?: ReactNode;
  donutChart?: ReactNode;
}) {
  if (summaries.length === 0) {
    return (
      <div id="jpml-summary" className="scroll-mt-16 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-midnight-navy/5">
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
    <div id="jpml-summary" className="scroll-mt-16 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-midnight-navy/5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-midnight-navy">
            JPML by Type
          </h2>
          {reportDate && (
            <p className="mt-1 text-sm text-slate-gray">
              Report: {formatReportDate(reportDate)}
            </p>
          )}
          <a
            href="https://jpml.uscourts.gov"
            target="_blank"
            rel="noreferrer noopener"
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-intelligence-teal hover:underline"
          >
            Source: jpml.uscourts.gov
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
        <div className="flex items-center gap-3">
          {controls}
          <div className="rounded-full bg-cloud px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-intelligence-teal">
            {totalActive} Active MDLs
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {donutChart && (
          <div className="flex-shrink-0 lg:w-[340px]">
            {donutChart}
          </div>
        )}
        <div className="min-w-0 flex-1 grid grid-cols-1 gap-4 md:grid-cols-2">
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
    </div>
  );
}
