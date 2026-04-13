"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Cell,
  Legend,
} from "recharts";
import type {
  ConstructionEventBreakdown,
  ConstructionTrend,
  ConstructionSubsector,
} from "@/lib/queries";

const EVENT_COLORS: Record<string, string> = {
  Falls: "#F59E0B",
  "Falls, slips, trips": "#F59E0B",
  Transportation: "#3B82F6",
  "Transportation incidents": "#3B82F6",
  Exposure: "#8B5CF6",
  "Exposure to harmful substances or environments": "#8B5CF6",
  Contact: "#6B7280",
  "Contact with objects and equipment": "#6B7280",
  Violence: "#EF4444",
  "Violence and other injuries by persons or animals": "#EF4444",
  Fires: "#EAB308",
  "Fires and explosions": "#EAB308",
};

function getEventColor(eventType: string): string {
  for (const [key, color] of Object.entries(EVENT_COLORS)) {
    if (eventType.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return "#94A3B8";
}

// ── Event Breakdown Horizontal Bar ───────────────────────────────────────

type EventBreakdownChartProps = {
  data: ConstructionEventBreakdown[];
};

export function EventBreakdownChart({ data }: EventBreakdownChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-slate-gray">No event data available.</p>
    );
  }

  const chartData = data.map((d) => ({
    name:
      d.event_type.length > 30
        ? d.event_type.slice(0, 28) + "..."
        : d.event_type,
    fullName: d.event_type,
    fatalities: d.fatality_count,
    pct: d.pct,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 0, right: 20, bottom: 0, left: 10 }}
      >
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis
          dataKey="name"
          type="category"
          width={160}
          tick={{ fontSize: 11 }}
        />
        <Tooltip
          formatter={(value: number, _name: string, props: { payload: { fullName: string; pct: number } }) => [
            `${value.toLocaleString()} (${props.payload.pct.toFixed(1)}%)`,
            props.payload.fullName,
          ]}
          contentStyle={{
            borderRadius: "0.75rem",
            border: "1px solid #e2e8f0",
            fontSize: 13,
          }}
        />
        <Bar dataKey="fatalities" radius={[0, 4, 4, 0]}>
          {chartData.map((entry) => (
            <Cell
              key={entry.name}
              fill={getEventColor(entry.fullName)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Annual Trend Line ────────────────────────────────────────────────────

type TrendChartProps = {
  data: ConstructionTrend[];
};

export function TrendChart({ data }: TrendChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-gray">No trend data available.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="year" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: number) => [
            value.toLocaleString(),
            "Fatalities",
          ]}
          contentStyle={{
            borderRadius: "0.75rem",
            border: "1px solid #e2e8f0",
            fontSize: 13,
          }}
        />
        <Line
          type="monotone"
          dataKey="total_fatalities"
          stroke="#1A8C96"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#1A8C96" }}
          activeDot={{ r: 6 }}
          name="Fatalities"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Subsector Comparison Bar ─────────────────────────────────────────────

type SubsectorChartProps = {
  data: ConstructionSubsector[];
};

const SUBSECTOR_COLORS = ["#1A8C96", "#3B82F6", "#F59E0B"];

export function SubsectorChart({ data }: SubsectorChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-slate-gray">No subsector data available.</p>
    );
  }

  const chartData = data.map((d) => ({
    name: d.naics_code,
    label: d.industry_name,
    Falls: d.falls,
    Transportation: d.transportation,
    Exposure: d.exposure,
    Contact: d.contact,
    total: d.total_fatalities,
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            borderRadius: "0.75rem",
            border: "1px solid #e2e8f0",
            fontSize: 13,
          }}
          formatter={(value: number) => value.toLocaleString()}
        />
        <Legend />
        <Bar
          dataKey="Falls"
          stackId="a"
          fill="#F59E0B"
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="Transportation"
          stackId="a"
          fill="#3B82F6"
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="Exposure"
          stackId="a"
          fill="#8B5CF6"
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="Contact"
          stackId="a"
          fill="#6B7280"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
