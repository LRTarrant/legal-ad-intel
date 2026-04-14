"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type DataPoint = {
  period_label: string | null;
  interest_value: number | null;
  keyword: string;
};

interface TrendLineChartProps {
  data: DataPoint[];
}

export function TrendLineChart({ data }: TrendLineChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">
        No timeseries data available.
      </div>
    );
  }

  // Format data for recharts — use period_label as x-axis
  const chartData = data.map((d) => ({
    label: d.period_label ?? "",
    value: d.interest_value ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
        <XAxis
          dataKey="label"
          tick={{ fill: "#a1a1aa", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "#3f3f46" }}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "#a1a1aa", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={30}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: "8px",
            color: "#f4f4f5",
            fontSize: 12,
          }}
          formatter={(value) => [Number(value), "Interest"]}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#a855f7"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#a855f7" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
