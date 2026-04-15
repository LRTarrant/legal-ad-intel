import {
  getStormEventTotals,
  getStormEventsByState,
  getStormEventsByType,
  getStormEventTrendByYear,
  getStormDistinctStates,
  getStormDistinctEventTypes,
  getStormCountiesByState,
  getStormHeatmapPoints,
  getRecentStormEvents,
  type StormFilters,
  type StormEventByState,
  type StormEventByType,
  type StormEventTrendByYear,
  type StormCounty,
  type HeatmapPoint,
  type RecentStormEvent,
} from "@/lib/queries";
import { StormFilterBar, TIME_PERIOD_OPTIONS } from "./storm-filter-bar";
import { RecentEventsPanel } from "./recent-events-panel";
import { FatalitiesHeatmapPanel } from "../fatalities/fatalities-heatmap-panel";
import { AdvertisingInsight } from "../components/advertising-insight";
import { CloudLightning } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Storm Events | Legal Marketing Intelligence",
};

type SearchParams = Promise<{
  state?: string | string[];
  period?: string | string[];
  event_type?: string | string[];
}>;

function getSingleValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

const PERIOD_TO_DAYS: Record<string, number> = {
  "30d": 30,
  "90d": 90,
  "6m": 180,
  "12m": 365,
};

function parsePeriod(raw: string | null): { year: number | null; days: number | null } {
  if (!raw) return { year: null, days: null };
  const trimmed = raw.trim();
  if (PERIOD_TO_DAYS[trimmed] != null) {
    return { year: null, days: PERIOD_TO_DAYS[trimmed] };
  }
  const asYear = Number.parseInt(trimmed, 10);
  if (Number.isFinite(asYear) && asYear >= 2000 && asYear <= 2100) {
    return { year: asYear, days: null };
  }
  return { year: null, days: null };
}

function parseFilters(
  rawState: string | null,
  rawPeriod: string | null,
  rawEventType: string | null
): StormFilters {
  const state = rawState?.trim() || null;
  const eventType = rawEventType?.trim() || null;
  const { year, days } = parsePeriod(rawPeriod);
  return { state, year, eventType, days };
}

function formatDamage(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

function getPeriodLabel(filters: StormFilters): string {
  if (filters.year) return String(filters.year);
  if (filters.days) {
    const match = TIME_PERIOD_OPTIONS.find(
      (opt) => PERIOD_TO_DAYS[opt.value] === filters.days
    );
    return match?.label ?? `Last ${filters.days} days`;
  }
  return "All time";
}

function getFilterSummary(filters: StormFilters): string {
  const parts: string[] = [];
  parts.push(getPeriodLabel(filters));
  if (filters.state) parts.push(filters.state);
  if (filters.eventType) parts.push(filters.eventType);
  return parts.length > 0 ? parts.join(" · ") : "Nationwide · All time";
}

function getRecentSubtitle(filters: StormFilters): string {
  const parts: string[] = [getPeriodLabel(filters)];
  if (filters.state) {
    parts.push(filters.state);
  } else {
    parts.push("Nationwide");
  }
  if (filters.eventType) parts.push(filters.eventType);
  return parts.join(" · ");
}

export default async function StormEventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = parseFilters(
    getSingleValue(params.state),
    getSingleValue(params.period),
    getSingleValue(params.event_type)
  );

  const [totals, byState, byType, trend, states, eventTypes, rawHeatmapPoints, recentEvents] =
    await Promise.all([
      getStormEventTotals(filters),
      getStormEventsByState(filters),
      getStormEventsByType(filters),
      getStormEventTrendByYear(filters),
      getStormDistinctStates(),
      getStormDistinctEventTypes(),
      getStormHeatmapPoints(filters),
      getRecentStormEvents(filters),
    ]);

  const heatmapPoints: HeatmapPoint[] = rawHeatmapPoints.map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
    intensity: 1,
  }));

  let counties: StormCounty[] = [];
  if (filters.state) {
    counties = await getStormCountiesByState(filters.state, filters);
  }

  const filterSummary = getFilterSummary(filters);
  const recentSubtitle = getRecentSubtitle(filters);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <CloudLightning
          className="w-7 h-7 shrink-0"
          style={{ color: "#1A8C96" }}
        />
        <div>
          <h1 className="font-heading text-2xl font-bold text-midnight-navy">
            Storm Events
          </h1>
          <p className="text-sm text-slate-gray">
            NOAA Storm Events data &middot; 2019&ndash;2025 &middot; Source:
            NOAA NCEI
          </p>
        </div>
      </div>

      <StormFilterBar states={states} eventTypes={eventTypes} />

      <AdvertisingInsight>
        <p>
          <strong>
            Storm damage creates immediate demand for legal services.
          </strong>{" "}
          States with high storm frequency and significant property damage
          represent prime markets for property damage, insurance dispute, and
          personal injury legal advertising. Use storm event data to time
          campaigns around peak storm seasons and identify counties with the
          highest incident concentration.
        </p>
      </AdvertisingInsight>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total Events"
          value={totals.total_events.toLocaleString()}
          sub={filterSummary}
        />
        <SummaryCard
          label="Total Property Damage"
          value={formatDamage(totals.total_property_damage)}
          sub={filterSummary}
        />
        <SummaryCard
          label="Total Injuries"
          value={totals.total_injuries.toLocaleString()}
          sub={filterSummary}
        />
        <SummaryCard
          label="Total Deaths"
          value={totals.total_deaths.toLocaleString()}
          sub={filterSummary}
        />
      </div>

      <RecentEventsPanel events={recentEvents} subtitle={recentSubtitle} />

      <StateTable rows={byState} />

      <EventTypePanel rows={byType} />

      <TrendChart data={trend} />

      <FatalitiesHeatmapPanel
        points={heatmapPoints}
        title="Storm event locations · 2019–2025"
      />

      {filters.state && counties.length > 0 && (
        <CountyTable rows={counties} state={filters.state} />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase text-slate-gray">{label}</p>
      <p className="mt-1 font-heading text-2xl font-bold text-midnight-navy">
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-slate-gray">{sub}</p> : null}
    </div>
  );
}

function StateTable({ rows }: { rows: StormEventByState[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          Events by State
        </h2>
        <p className="mt-4 text-sm text-slate-gray">
          No storm event records match the current filter.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm overflow-x-auto">
      <h2 className="font-heading text-xl font-semibold text-midnight-navy mb-4">
        Events by State
      </h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-cloud text-left">
            <th className="pb-3 pr-4 font-semibold text-slate-gray">State</th>
            <th className="pb-3 pr-4 text-right font-semibold text-slate-gray">
              Events
            </th>
            <th className="pb-3 pr-4 text-right font-semibold text-slate-gray">
              Property Damage
            </th>
            <th className="pb-3 pr-4 text-right font-semibold text-slate-gray">
              Crop Damage
            </th>
            <th className="pb-3 pr-4 text-right font-semibold text-slate-gray">
              Injuries
            </th>
            <th className="pb-3 text-right font-semibold text-slate-gray">
              Deaths
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.state}
              className="border-b border-cloud/50 hover:bg-cloud/30 transition-colors"
            >
              <td className="py-2.5 pr-4 font-medium text-midnight-navy">
                {row.state}
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums">
                {row.total_events.toLocaleString()}
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums">
                {formatDamage(row.total_property_damage)}
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums">
                {formatDamage(row.total_crop_damage)}
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums">
                {row.total_injuries.toLocaleString()}
              </td>
              <td className="py-2.5 text-right tabular-nums">
                {row.total_deaths.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventTypePanel({ rows }: { rows: StormEventByType[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          Top Event Types
        </h2>
        <p className="mt-4 text-sm text-slate-gray">
          No event type data available for the current filter.
        </p>
      </div>
    );
  }

  const maxEvents = Math.max(...rows.map((r) => r.total_events));

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="font-heading text-xl font-semibold text-midnight-navy mb-4">
        Top Event Types
      </h2>
      <div className="space-y-3">
        {rows.map((row, i) => {
          const pct = maxEvents > 0 ? (row.total_events / maxEvents) * 100 : 0;
          return (
            <div key={row.event_type} className="flex items-center gap-3">
              <span
                className="w-6 text-right text-xs font-bold"
                style={{ color: "#1A8C96" }}
              >
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-midnight-navy">
                    {row.event_type}
                  </span>
                  <span className="text-xs text-slate-gray">
                    {row.total_events.toLocaleString()} events &middot;{" "}
                    {formatDamage(row.total_property_damage)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-cloud">
                  <div
                    className="h-2 rounded-full bg-intelligence-teal"
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrendChart({ data }: { data: StormEventTrendByYear[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          Event Trend by Year
        </h2>
        <p className="mt-4 text-sm text-slate-gray">
          No trend data available for the current filter.
        </p>
      </div>
    );
  }

  const maxEvents = Math.max(...data.map((d) => d.total_events));
  const minEvents = Math.min(...data.map((d) => d.total_events));
  const chartW = 600;
  const chartH = 200;
  const padL = 60;
  const padR = 20;
  const padT = 20;
  const padB = 40;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const yMax = maxEvents + Math.ceil(maxEvents * 0.1);
  const yMin = Math.max(0, minEvents - Math.ceil(minEvents * 0.1));
  const yRange = yMax - yMin || 1;

  const points = data.map((d, i) => {
    const x = padL + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
    const y = padT + plotH - ((d.total_events - yMin) / yRange) * plotH;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round(yMin + (yRange / yTicks) * i)
  );

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="font-heading text-xl font-semibold text-midnight-navy mb-4">
        Event Trend by Year
      </h2>
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto">
        {/* Grid lines and Y labels */}
        {yTickValues.map((val) => {
          const y = padT + plotH - ((val - yMin) / yRange) * plotH;
          return (
            <g key={val}>
              <line
                x1={padL}
                y1={y}
                x2={chartW - padR}
                y2={y}
                stroke="#E2E8F0"
                strokeWidth={1}
              />
              <text
                x={padL - 8}
                y={y + 4}
                textAnchor="end"
                className="text-[10px]"
                fill="#6B7280"
              >
                {val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val}
              </text>
            </g>
          );
        })}

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#1A8C96"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots and X labels */}
        {points.map((p) => (
          <g key={p.year}>
            <circle cx={p.x} cy={p.y} r={4} fill="#1A8C96" />
            <text
              x={p.x}
              y={chartH - 8}
              textAnchor="middle"
              className="text-[10px]"
              fill="#6B7280"
            >
              {p.year}
            </text>
            <text
              x={p.x}
              y={p.y - 10}
              textAnchor="middle"
              className="text-[9px]"
              fill="#0B1D3A"
              fontWeight={600}
            >
              {p.total_events.toLocaleString()}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function CountyTable({
  rows,
  state,
}: {
  rows: StormCounty[];
  state: string;
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm overflow-x-auto">
      <h2 className="font-heading text-xl font-semibold text-midnight-navy mb-4">
        Counties in {state}
      </h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-cloud text-left">
            <th className="pb-3 pr-4 font-semibold text-slate-gray">County</th>
            <th className="pb-3 pr-4 text-right font-semibold text-slate-gray">
              Events
            </th>
            <th className="pb-3 text-right font-semibold text-slate-gray">
              Property Damage
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.county_name}-${row.county_fips}`}
              className="border-b border-cloud/50 hover:bg-cloud/30 transition-colors"
            >
              <td className="py-2.5 pr-4 font-medium text-midnight-navy">
                {row.county_name}
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums">
                {row.total_events.toLocaleString()}
              </td>
              <td className="py-2.5 text-right tabular-nums">
                {formatDamage(row.total_property_damage)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
