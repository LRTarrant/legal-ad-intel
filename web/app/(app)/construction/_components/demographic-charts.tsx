"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ConstructionDemographic } from "@/lib/queries";

const RACE_COLORS: Record<string, string> = {
  "White non-Hispanic": "#3B82F6",
  "Hispanic or Latino": "#F59E0B",
  "Black or African American": "#8B5CF6",
  Asian: "#10B981",
  "Other/Not reported": "#6B7280",
};

const AGE_COLORS: Record<string, string> = {
  "16-34": "#3B82F6",
  "35-54": "#1A8C96",
  "55+": "#F59E0B",
};

function getRaceColor(category: string): string {
  for (const [key, color] of Object.entries(RACE_COLORS)) {
    if (category.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return "#94A3B8";
}

function getAgeColor(category: string): string {
  for (const [key, color] of Object.entries(AGE_COLORS)) {
    if (category.includes(key)) return color;
  }
  return "#94A3B8";
}

type DemographicChartsSectionProps = {
  raceData: ConstructionDemographic[];
  ageData: ConstructionDemographic[];
  genderData: ConstructionDemographic[];
  year: number;
  stateSelected: boolean;
};

export function DemographicChartsSection({
  raceData,
  ageData,
  genderData,
  year,
  stateSelected,
}: DemographicChartsSectionProps) {
  const hispanicRow = raceData.find(
    (r) => r.category.toLowerCase().includes("hispanic") && !r.category.toLowerCase().includes("non-hispanic")
  );
  const olderRow = ageData.find((r) => r.category.includes("55"));
  const youngerRow = ageData.find((r) => r.category.includes("16") || r.category.includes("34"));
  const maleRow = genderData.find((r) => r.category.toLowerCase() === "male");
  const malePct =
    maleRow && genderData.reduce((sum, r) => sum + r.fatalities, 0) > 0
      ? maleRow.pct_of_total
      : 99;

  const olderMultiplier =
    olderRow?.fatality_rate && youngerRow?.fatality_rate && youngerRow.fatality_rate > 0
      ? (olderRow.fatality_rate / youngerRow.fatality_rate).toFixed(1)
      : "1.8";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          Workforce Demographics
        </h2>
        <p className="mt-1 text-sm text-slate-gray">
          Fatal injury breakdown by worker characteristics (construction sector)
        </p>
      </div>

      {stateSelected && (
        <p className="text-sm italic text-slate-gray">
          Demographics — National data (state-level not available)
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Race/Ethnicity horizontal bar chart */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="font-heading text-sm font-semibold text-midnight-navy">
            Race / Ethnicity
          </h3>
          <p className="mt-1 text-xs text-slate-gray">
            {year} construction fatalities by race/ethnicity
          </p>
          {raceData.length > 0 ? (
            <>
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={raceData.map((d) => ({
                      name:
                        d.category.length > 22
                          ? d.category.slice(0, 20) + "…"
                          : d.category,
                      fullName: d.category,
                      fatalities: d.fatalities,
                      pct: d.pct_of_total,
                    }))}
                    layout="vertical"
                    margin={{ top: 0, right: 40, bottom: 0, left: 10 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={130}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip
                      formatter={(value: number, _name: string, props: { payload: { fullName: string; pct: number } }) => [
                        `${value.toLocaleString()} (${props.payload.pct.toFixed(1)}%)`,
                        props.payload.fullName,
                      ]}
                      contentStyle={{
                        borderRadius: "0.75rem",
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="fatalities" radius={[0, 4, 4, 0]}>
                      {raceData.map((entry) => (
                        <Cell
                          key={entry.category}
                          fill={getRaceColor(entry.category)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {hispanicRow && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Hispanic/Latino workers account for{" "}
                  {hispanicRow.pct_of_total.toFixed(0)}% of construction
                  fatalities despite being ~34% of the workforce
                </p>
              )}
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-gray">
              No race/ethnicity data available.
            </p>
          )}
        </div>

        {/* Age Distribution horizontal bar chart */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="font-heading text-sm font-semibold text-midnight-navy">
            Age Distribution
          </h3>
          <p className="mt-1 text-xs text-slate-gray">
            {year} construction fatalities by age group
          </p>
          {ageData.length > 0 ? (
            <>
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={ageData.map((d) => ({
                      name: d.category,
                      fatalities: d.fatalities,
                      rate: d.fatality_rate,
                      pct: d.pct_of_total,
                    }))}
                    layout="vertical"
                    margin={{ top: 0, right: 40, bottom: 0, left: 10 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={60}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: number, _name: string, props: { payload: { pct: number; rate: number | null } }) => [
                        `${value.toLocaleString()} (${props.payload.pct.toFixed(1)}%)${props.payload.rate != null ? ` — ${props.payload.rate.toFixed(1)}/100K` : ""}`,
                        "Fatalities",
                      ]}
                      contentStyle={{
                        borderRadius: "0.75rem",
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="fatalities" radius={[0, 4, 4, 0]}>
                      {ageData.map((entry) => (
                        <Cell
                          key={entry.category}
                          fill={getAgeColor(entry.category)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Rate labels below chart */}
              <div className="mt-2 flex flex-wrap gap-2">
                {ageData
                  .filter((d) => d.fatality_rate != null)
                  .map((d) => (
                    <span
                      key={d.category}
                      className="rounded-md bg-cloud px-2 py-1 text-[10px] font-medium text-midnight-navy"
                    >
                      {d.category}: {d.fatality_rate?.toFixed(1)}/100K
                    </span>
                  ))}
              </div>
              {olderRow && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Workers 55+ have a fatality rate of{" "}
                  {olderRow.fatality_rate?.toFixed(1) ?? "13.6"}/100K —{" "}
                  {olderMultiplier}&times; higher than younger workers
                </p>
              )}
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-gray">
              No age data available.
            </p>
          )}
        </div>

        {/* Gender stat card */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="font-heading text-sm font-semibold text-midnight-navy">
            Gender
          </h3>
          <p className="mt-1 text-xs text-slate-gray">
            {year} construction fatalities by gender
          </p>
          {genderData.length > 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center">
              <p className="font-heading text-5xl font-bold text-midnight-navy">
                {malePct.toFixed(0)}%
              </p>
              <p className="mt-1 text-lg font-semibold text-midnight-navy">
                Male
              </p>
              {maleRow && (
                <p className="mt-1 text-sm text-slate-gray">
                  {maleRow.fatalities.toLocaleString()} of{" "}
                  {genderData
                    .reduce((sum, r) => sum + r.fatalities, 0)
                    .toLocaleString()}{" "}
                  fatalities
                </p>
              )}
              <p className="mt-4 rounded-lg bg-cloud px-3 py-2 text-center text-xs text-slate-gray">
                Construction fatalities are overwhelmingly male
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-gray">
              No gender data available.
            </p>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-gray">
        Demographics: BLS CFOI national data supplemented with CPWR construction
        workforce estimates. Some breakdowns are estimated from published
        proportions. State-level demographics not available.
      </p>
    </div>
  );
}
