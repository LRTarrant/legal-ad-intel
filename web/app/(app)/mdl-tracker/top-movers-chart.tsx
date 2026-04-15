"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { MdlSummaryRow } from "@/lib/queries";

type ViewMode = "absolute" | "percentage";

interface ChartEntry {
  label: string;
  mdl_number: number;
  value: number;
  displayValue: string;
  title: string;
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

const BAR_COLOR = "#1A8C96";
const BAR_COLOR_ALT = "#4FB8C4";

export function TopMoversChart({ rows }: { rows: MdlSummaryRow[] }) {
  const [view, setView] = useState<ViewMode>("absolute");

  const absoluteData: ChartEntry[] = useMemo(() => {
    return [...rows]
      .filter((r) => r.mom_change > 0)
      .sort((a, b) => b.mom_change - a.mom_change)
      .slice(0, 10)
      .map((r) => ({
        label: truncate(r.title, 35),
        mdl_number: r.mdl_number,
        value: r.mom_change,
        displayValue: `+${r.mom_change.toLocaleString()}`,
        title: r.title,
      }));
  }, [rows]);

  const percentageData: ChartEntry[] = useMemo(() => {
    return [...rows]
      .filter((r) => r.mom_change > 0)
      .map((r) => {
        const previousCount = r.pending_actions - r.mom_change;
        const pct = previousCount > 0 ? (r.mom_change / previousCount) * 100 : 0;
        return { ...r, pct };
      })
      .filter((r) => r.pct > 0)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 10)
      .map((r) => ({
        label: truncate(r.title, 35),
        mdl_number: r.mdl_number,
        value: Math.round(r.pct * 10) / 10,
        displayValue: `+${(Math.round(r.pct * 10) / 10).toFixed(1)}%`,
        title: r.title,
      }));
  }, [rows]);

  const chartData = view === "absolute" ? absoluteData : percentageData;

  if (chartData.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-gray">
        No positive month-over-month movers match the current filters.
      </p>
    );
  }

  const yAxisWidth = 200;

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-lg bg-cloud p-1 w-fit">
        <button
          type="button"
          onClick={() => setView("absolute")}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            view === "absolute"
              ? "bg-white text-midnight-navy shadow-sm"
              : "text-slate-gray hover:text-midnight-navy"
          }`}
        >
          Absolute Change
        </button>
        <button
          type="button"
          onClick={() => setView("percentage")}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            view === "percentage"
              ? "bg-white text-midnight-navy shadow-sm"
              : "text-slate-gray hover:text-midnight-navy"
          }`}
        >
          % Change
        </button>
      </div>

      <ResponsiveContainer width="100%" height={chartData.length * 44 + 24}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 60, bottom: 4, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="#E2E8F0"
          />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#6B7280" }}
            tickFormatter={(v: number) =>
              view === "percentage" ? `${v}%` : v.toLocaleString()
            }
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 11, fill: "#0B1D3A", fontWeight: 500 }}
            width={yAxisWidth}
          />
          <Tooltip
            cursor={{ fill: "rgba(26,140,150,0.06)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const entry = payload[0].payload as ChartEntry;
              return (
                <div className="rounded-lg bg-midnight-navy px-3 py-2 text-xs text-white shadow-lg max-w-xs">
                  <p className="font-semibold">{entry.title}</p>
                  <p className="text-gray-300">MDL {entry.mdl_number}</p>
                  <p>
                    {view === "absolute" ? "MoM Change" : "MoM % Change"}:{" "}
                    {entry.displayValue}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={28}>
            {chartData.map((entry, index) => (
              <Cell
                key={entry.mdl_number}
                fill={index % 2 === 0 ? BAR_COLOR : BAR_COLOR_ALT}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
