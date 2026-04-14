import {
  getMdlReportDates,
  getMdlSummary,
  getMdlTotals,
  getMdlTrend,
  getJpmlTypeSummaries,
  getJpmlSnapshots,
  getLatestReportDate,
  getJpmlReportDates,
  enrichMdlSummaryWithJpmlType,
  getLatestDevelopments,
} from "@/lib/queries";
import type { MdlDevelopment } from "@/lib/queries";
import Link from "next/link";
import { JpmlDetailSection } from "./jpml-detail-section";
import { JpmlTypePanel } from "./jpml-type-panel";
import { MdlContent } from "./mdl-content";
import { MdlFilterBar } from "./mdl-filter-bar";
import { MdlTrackerNav } from "./mdl-tracker-nav";
import { JpmlDateSelect } from "./jpml-date-select";

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
  const jpmlDate = getSingleValue(params.jpml_date);
  const search = getSingleValue(params.search) ?? "";
  const mdl = getSingleValue(params.mdl) ?? "";

  const [
    reportDates,
    summaryRows,
    totals,
    jpmlReportDates,
    jpmlSummaries,
    jpmlReportDate,
    jpmlSnapshots,
    latestDevelopments,
  ] = await Promise.all([
    getMdlReportDates(),
    getMdlSummary(selectedDate),
    getMdlTotals(selectedDate),
    getJpmlReportDates().catch(() => [] as string[]),
    getJpmlTypeSummaries(jpmlDate).catch(() => []),
    jpmlDate ? Promise.resolve(jpmlDate) : getLatestReportDate().catch(() => null),
    getJpmlSnapshots(jpmlDate ?? undefined).catch(() => []),
    getLatestDevelopments(5).catch(() => [] as MdlDevelopment[]),
  ]);

  const enrichedRows = await enrichMdlSummaryWithJpmlType(summaryRows).catch(
    () => summaryRows
  );

  const trendEntries = await Promise.all(
    enrichedRows.map(async (row) => [row.mdl_number, await getMdlTrend(row.mdl_number)] as const)
  );

  const trendByMdl = Object.fromEntries(trendEntries);
  return (
    <div className="space-y-8">
      <MdlTrackerNav />

      <div>
        <h1 className="font-heading text-3xl font-bold text-midnight-navy">
          MDL Tracker
        </h1>
        <p className="mt-1 text-slate-gray">
          Monthly MDL docket counts with trend and momentum tracking
        </p>
      </div>

      <div id="filters" className="scroll-mt-16">
        <MdlFilterBar
          reportDates={reportDates}
          selectedDate={selectedDate}
          search={search}
          mdl={mdl}
        />
      </div>

      <div id="overview" className="scroll-mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
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
          value={
          totals.latest_report_date
            ? new Date(totals.latest_report_date + "T00:00:00").toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : "n/a"
            }
        /> 
      </div>

      {latestDevelopments.length > 0 && (
        <div id="developments" className="scroll-mt-16">
          <LatestDevelopmentsCard developments={latestDevelopments} />
        </div>
      )}

      <JpmlTypePanel
        summaries={jpmlSummaries}
        reportDate={jpmlReportDate}
        controls={
          <JpmlDateSelect
            reportDates={jpmlReportDates}
            selectedDate={jpmlDate}
          />
        }
      />

      <JpmlDetailSection
        snapshots={jpmlSnapshots}
        summaries={jpmlSummaries}
      />

      <MdlContent
        rows={enrichedRows}
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

const EVENT_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  ruling: { bg: "#EFF6FF", text: "#2563EB", label: "Ruling" },
  verdict: { bg: "#F0FDF4", text: "#16A34A", label: "Verdict" },
  settlement: { bg: "#FFFBEB", text: "#D97706", label: "Settlement" },
  "bellwether trial": { bg: "#FAF5FF", text: "#7C3AED", label: "Bellwether Trial" },
  filing: { bg: "#F9FAFB", text: "#6B7280", label: "Filing" },
  regulatory: { bg: "#FFF1F2", text: "#E11D48", label: "Regulatory" },
};
const DEFAULT_EVENT_COLOR = { bg: "#F1F5F9", text: "#6B7280", label: "Event" };

function formatShortDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  return `${monthNames[m - 1]} ${d}, ${year}`;
}

function LatestDevelopmentsCard({
  developments,
}: {
  developments: MdlDevelopment[];
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="font-heading text-lg font-semibold text-midnight-navy">
        Latest Developments
      </h2>
      <ul className="mt-3 divide-y divide-cloud">
        {developments.map((dev) => {
          const color = EVENT_TYPE_COLORS[dev.event_type] ?? DEFAULT_EVENT_COLOR;
          return (
            <li
              key={dev.id}
              className="flex items-start gap-3 py-2"
            >
              <span className="shrink-0 text-xs text-slate-gray whitespace-nowrap pt-0.5">
                {formatShortDate(dev.event_date)}
              </span>
              <Link
                href={`/mdl-tracker/${dev.mdl_number}`}
                className="shrink-0 text-xs font-medium text-intelligence-teal hover:underline pt-0.5"
              >
                MDL {dev.mdl_number}
              </Link>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: color.bg, color: color.text }}
              >
                {color.label}
              </span>
              <span className="text-sm font-medium text-midnight-navy">
                {dev.title}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
