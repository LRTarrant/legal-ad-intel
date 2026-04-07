import {
  getMdlReportDates,
  getMdlSummary,
  getMdlTotals,
  getMdlTrend,
  getJpmlTypeSummaries,
  getLatestReportDate,
  getJpmlReportDates,
} from "@/lib/queries";
import { JpmlTypePanel } from "./jpml-type-panel";
import { MdlContent } from "./mdl-content";
import { MdlFilterBar } from "./mdl-filter-bar";

export const metadata = {
  title: "MDL Tracker | Legal Marketing Intelligence",
};

type SearchParams = Promise<{
  date?: string | string[];
  mdl?: string | string[];
  search?: string | string[];
  jpml_date?: string | string[];
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
  const jpmlDate = getSingleValue(params.jpml_date);

  const [reportDates, summaryRows, totals, jpmlSummaries, jpmlReportDate, jpmlDates] =
    await Promise.all([
      getMdlReportDates(),
      getMdlSummary(selectedDate),
      getMdlTotals(selectedDate),
      getJpmlTypeSummaries(jpmlDate).catch(() => []),
      jpmlDate
        ? Promise.resolve(jpmlDate)
        : getLatestReportDate().catch(() => null),
      getJpmlReportDates().catch(() => [] as string[]),
    ]);

  const trendEntries = await Promise.all(
    summaryRows.map(async (row) => [row.mdl_number, await getMdlTrend(row.mdl_number)] as const)
  );

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

      <JpmlTypePanel
        summaries={jpmlSummaries}
        reportDate={jpmlReportDate}
        reportDates={jpmlDates}
        selectedDate={jpmlDate}
      />

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
