import { notFound } from "next/navigation";
import Link from "next/link";
import { getMdlByNumber, getMdlTrend } from "@/lib/queries/mdl";
import { getJpmlSnapshots } from "@/lib/queries/jpml";
import { getMdlDevelopments } from "@/lib/queries/mdl-developments";
import { getTypeColor, getTypeShortLabel } from "../jpml-colors";
import type { MdlTrendPoint } from "@/lib/queries";
import OnDocketFirms from "./on-docket-firms";

export const dynamic = "force-dynamic";

const EVENT_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  ruling: { bg: "#EFF6FF", text: "#2563EB", label: "Ruling" },
  verdict: { bg: "#F0FDF4", text: "#16A34A", label: "Verdict" },
  settlement: { bg: "#FFFBEB", text: "#D97706", label: "Settlement" },
  "bellwether trial": { bg: "#FAF5FF", text: "#7C3AED", label: "Bellwether Trial" },
  filing: { bg: "#F9FAFB", text: "#6B7280", label: "Filing" },
  regulatory: { bg: "#FFF1F2", text: "#E11D48", label: "Regulatory" },
};
const DEFAULT_EVENT_COLOR = { bg: "#F1F5F9", text: "#6B7280", label: "Event" };

function getEventColor(eventType: string) {
  return EVENT_TYPE_COLORS[eventType] ?? DEFAULT_EVENT_COLOR;
}

function formatEventDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  return `${monthNames[m - 1]} ${d}, ${year}`;
}

function formatMonth(dateStr: string): string {
  const [year, month] = dateStr.split("-");
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const m = parseInt(month, 10);
  return `${monthNames[m - 1]} '${year.slice(2)}`;
}

function TrendChart({ data }: { data: MdlTrendPoint[] }) {
  if (data.length < 2) {
    return (
      <p className="py-12 text-center text-sm text-slate-gray">
        Insufficient data to render a trend chart.
      </p>
    );
  }

  const svgWidth = 600;
  const svgHeight = 200;
  const padLeft = 55;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;

  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  const maxVal = Math.max(...data.map((d) => d.pending_actions)) * 1.1;
  const minVal = 0;

  const xStep = data.length > 1 ? chartWidth / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = padLeft + i * xStep;
    const y =
      padTop +
      chartHeight -
      ((d.pending_actions - minVal) / (maxVal - minVal)) * chartHeight;
    return { x, y, ...d };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  const gridLineCount = 4;
  const gridLines = Array.from({ length: gridLineCount + 1 }, (_, i) => {
    const value = minVal + ((maxVal - minVal) / gridLineCount) * i;
    const y = padTop + chartHeight - (i / gridLineCount) * chartHeight;
    return { value, y };
  });

  const labelInterval = Math.max(1, Math.ceil(data.length / 8));

  return (
    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full">
      {gridLines.map((gl) => (
        <g key={gl.y}>
          <line
            x1={padLeft}
            y1={gl.y}
            x2={svgWidth - padRight}
            y2={gl.y}
            stroke="#F1F5F9"
            strokeWidth="1"
            strokeDasharray="4 2"
          />
          <text
            x={padLeft - 8}
            y={gl.y + 4}
            textAnchor="end"
            fill="#6B7280"
            fontSize="10"
          >
            {Math.round(gl.value).toLocaleString()}
          </text>
        </g>
      ))}

      <polyline
        points={polyline}
        fill="none"
        stroke="#1A8C96"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {points.map((p) => (
        <circle
          key={p.stats_month}
          cx={p.x}
          cy={p.y}
          r="3"
          fill="#1A8C96"
        />
      ))}

      {points.map(
        (p, i) =>
          i % labelInterval === 0 && (
            <text
              key={p.stats_month}
              x={p.x}
              y={svgHeight - 6}
              textAnchor="middle"
              fill="#6B7280"
              fontSize="10"
            >
              {formatMonth(p.stats_month)}
            </text>
          )
      )}
    </svg>
  );
}

export default async function MdlDetailPage({
  params,
}: {
  params: Promise<{ mdl_number: string }>;
}) {
  const { mdl_number } = await params;
  const mdlNumber = parseInt(mdl_number, 10);
  if (isNaN(mdlNumber)) notFound();

  const [mdlRow, trendData, jpmlSnapshots, developments] = await Promise.all([
    getMdlByNumber(mdlNumber),
    getMdlTrend(mdlNumber),
    getJpmlSnapshots(),
    getMdlDevelopments(mdlNumber),
  ]);

  if (!mdlRow) notFound();

  const jpmlSnapshot =
    jpmlSnapshots.find((s) => s.mdl_number === mdlNumber) ?? null;
  const jpmlType = jpmlSnapshot?.jpml_type ?? null;

  const cleanTitle = mdlRow.title.replace(/^IN RE:\s*/i, "");

  // Derive MoM change from last two trend rows
  const momChange =
    trendData.length >= 2
      ? trendData[trendData.length - 1].pending_actions -
        trendData[trendData.length - 2].pending_actions
      : null;

  const latestPending =
    trendData.length > 0
      ? trendData[trendData.length - 1].pending_actions
      : 0;

  const status =
    mdlRow.status ??
    (mdlRow.closed_date ? "Closed" : "Active");

  return (
    <div className="space-y-8">
      {/* Back link + header */}
      <div>
        <Link
          href="/mdl-tracker"
          className="text-sm text-slate-gray hover:text-midnight-navy"
        >
          ← Back to MDL Tracker
        </Link>
        <h1 className="mt-2 font-heading text-3xl font-bold text-midnight-navy">
          MDL {mdlNumber}
        </h1>
        <p className="mt-1 text-lg text-slate-gray">{cleanTitle}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {/* JPML Type */}
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-slate-gray">
            JPML Classification
          </p>
          <div className="mt-2">
            {jpmlType ? (
              <span
                className="inline-block rounded-full px-3 py-1 text-sm font-medium"
                style={{
                  backgroundColor: `${getTypeColor(jpmlType)}26`,
                  color: getTypeColor(jpmlType),
                }}
              >
                {getTypeShortLabel(jpmlType)}
              </span>
            ) : (
              <span className="text-lg font-semibold text-midnight-navy">
                —
              </span>
            )}
          </div>
        </div>

        {/* Transferee Judge */}
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-slate-gray">
            Transferee Judge
          </p>
          <p className="mt-2 text-lg font-semibold text-midnight-navy">
            {mdlRow.judge_name ?? "—"}
          </p>
        </div>

        {/* District */}
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-slate-gray">
            District
          </p>
          <p className="mt-2 text-lg font-semibold text-midnight-navy">
            {mdlRow.district ?? "—"}
          </p>
        </div>

        {/* Pending Actions */}
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-slate-gray">
            Pending Actions
          </p>
          <p className="mt-2 text-lg font-semibold text-midnight-navy">
            {latestPending.toLocaleString()}
          </p>
        </div>

        {/* MoM Change */}
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-slate-gray">
            Month-over-Month
          </p>
          <p
            className={`mt-2 text-lg font-semibold ${
              momChange === null
                ? "text-slate-gray"
                : momChange > 0
                  ? "text-success"
                  : momChange < 0
                    ? "text-alert"
                    : "text-slate-gray"
            }`}
          >
            {momChange === null
              ? "—"
              : momChange > 0
                ? `+${momChange.toLocaleString()}`
                : momChange.toLocaleString()}
          </p>
        </div>

        {/* Status */}
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-slate-gray">
            Status
          </p>
          <p className="mt-2 text-lg font-semibold text-midnight-navy">
            {status}
          </p>
        </div>

        {jpmlSnapshot && (
          <>
            {/* JPML Case Name */}
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-slate-gray">
                JPML Case Name
              </p>
              <p className="mt-2 text-sm font-medium text-midnight-navy">
                {jpmlSnapshot.case_name.replace(/^IN RE:\s*/i, "")}
              </p>
            </div>

            {/* Master Docket */}
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-slate-gray">
                Master Docket
              </p>
              <p className="mt-2 font-mono text-sm text-midnight-navy">
                {jpmlSnapshot.master_docket ?? "—"}
              </p>
            </div>

            {/* Date Filed */}
            {jpmlSnapshot.date_filed && (
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase text-slate-gray">
                  Date Filed
                </p>
                <p className="mt-2 font-mono text-sm text-midnight-navy">
                  {new Date(
                    jpmlSnapshot.date_filed + "T12:00:00"
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}

            {/* Date Transferred */}
            {jpmlSnapshot.date_transferred && (
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase text-slate-gray">
                  Date Transferred
                </p>
                <p className="mt-2 font-mono text-sm text-midnight-navy">
                  {new Date(
                    jpmlSnapshot.date_transferred + "T12:00:00"
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}

            {/* Date Closed */}
            {jpmlSnapshot.date_closed && (
              <div className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase text-slate-gray">
                  Date Closed
                </p>
                <p className="mt-2 font-mono text-sm text-midnight-navy">
                  {new Date(
                    jpmlSnapshot.date_closed + "T12:00:00"
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Trend Chart */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-midnight-navy">
          Pending Actions Over Time
        </h2>
        <div className="mt-4">
          <TrendChart data={trendData} />
        </div>
      </div>

      {/* CourtListener link */}
      <div>
        <a
          href={`https://www.courtlistener.com/?q=%22MDL+${mdlNumber}%22&type=r`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Search CourtListener RECAP for MDL ${mdlNumber}`}
          className="inline-block rounded-lg border-2 border-intelligence-teal px-6 py-2.5 text-sm font-semibold text-intelligence-teal transition hover:bg-intelligence-teal hover:text-white"
        >
          View on CourtListener ↗
        </a>
      </div>


              {/* On-Docket Firms */}
        <OnDocketFirms mdlNumber={mdlNumber} />
      
      {/* Recent Developments */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-midnight-navy">
          Recent Developments
        </h2>
        {developments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-gray">
            No developments tracked yet for this MDL.
          </p>
        ) : (
          <div className="mt-4">
            {developments.map((dev, i) => {
              const color = getEventColor(dev.event_type);
              const isLast = i === developments.length - 1;
              return (
                <div
                  key={dev.id}
                  className={`relative pl-4 ${isLast ? "" : "pb-4"} border-l-2 border-cloud`}
                >
                  <span
                    className="absolute left-[-5px] top-1 h-2 w-2 rounded-full"
                    style={{ backgroundColor: color.text }}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-gray">
                      {formatEventDate(dev.event_date)}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: color.bg, color: color.text }}
                    >
                      {color.label}
                    </span>
                  </div>
                  <p className="mt-1 font-semibold text-midnight-navy">
                    {dev.title}
                  </p>
                  {dev.summary && (
                    <p className="mt-0.5 text-sm text-slate-gray">
                      {dev.summary}
                    </p>
                  )}
                  {dev.source_url && dev.source_name && (
                    <a
                      href={dev.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Read source: ${dev.source_name}`}
                      className="mt-1 inline-block text-xs font-medium text-intelligence-teal hover:underline"
                    >
                      {dev.source_name} ↗
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
