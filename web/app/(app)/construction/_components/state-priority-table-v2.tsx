"use client";

import { useState, useEffect, useRef } from "react";
import type { ConstructionStatePriorityV2 } from "@/lib/queries";

type StatePriorityTableV2Props = {
  rows: ConstructionStatePriorityV2[];
  highlightState?: string | null;
};

const RISK_TIER_STYLES: Record<string, { bg: string; text: string }> = {
  Critical: { bg: "bg-red-100", text: "text-red-800" },
  High: { bg: "bg-orange-100", text: "text-orange-800" },
  Medium: { bg: "bg-yellow-100", text: "text-yellow-800" },
  Low: { bg: "bg-green-100", text: "text-green-800" },
  Unknown: { bg: "bg-gray-100", text: "text-gray-600" },
};

const VOLUME_TIER_STYLES: Record<string, { bg: string; text: string }> = {
  "High-Volume": { bg: "bg-blue-100", text: "text-blue-800" },
  "Medium-Volume": { bg: "bg-blue-50", text: "text-blue-600" },
  "Low-Volume": { bg: "bg-gray-100", text: "text-gray-600" },
};

type SortMode = "volume" | "rate";

export function StatePriorityTableV2({
  rows,
  highlightState,
}: StatePriorityTableV2Props) {
  const [sortMode, setSortMode] = useState<SortMode>("volume");
  const highlightRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (highlightState && highlightRef.current) {
      highlightRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightState]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          State Priority Ranking
        </h2>
        <p className="mt-3 text-sm text-slate-gray">
          No state priority data available.
        </p>
      </div>
    );
  }

  const sorted = [...rows].sort((a, b) => {
    if (sortMode === "volume") {
      return (b.construction_fatalities_est ?? 0) - (a.construction_fatalities_est ?? 0);
    }
    // rate sort: nulls last
    const aRate = a.construction_fatality_rate_2024;
    const bRate = b.construction_fatality_rate_2024;
    if (aRate == null && bRate == null) return 0;
    if (aRate == null) return 1;
    if (bRate == null) return -1;
    return bRate - aRate;
  });

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold text-midnight-navy">
            State Priority Ranking
          </h2>
          <p className="mt-1 text-sm text-slate-gray">
            Construction fatality volume and rate by state. 34 states have
            published rates.
          </p>
        </div>

        <div className="flex rounded-lg bg-cloud p-0.5">
          <button
            type="button"
            onClick={() => setSortMode("volume")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              sortMode === "volume"
                ? "bg-white text-midnight-navy shadow-sm"
                : "text-slate-gray hover:text-midnight-navy"
            }`}
          >
            Sort by Market Size
          </button>
          <button
            type="button"
            onClick={() => setSortMode("rate")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              sortMode === "rate"
                ? "bg-white text-midnight-navy shadow-sm"
                : "text-slate-gray hover:text-midnight-navy"
            }`}
          >
            Sort by Risk Rate
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-midnight-navy/10">
              <th className="py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-gray">
                #
              </th>
              <th className="py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-gray">
                State
              </th>
              <th className="py-2 pr-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
                Est. Fatalities
              </th>
              <th className="py-2 pr-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
                Construction Rate /100K
              </th>
              <th className="py-2 pr-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-gray">
                Risk Tier
              </th>
              <th className="py-2 pr-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-gray">
                Volume Tier
              </th>
              <th className="py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
                vs. National
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, index) => {
              const riskStyle =
                RISK_TIER_STYLES[row.priority_tier] ?? RISK_TIER_STYLES.Unknown;
              const volStyle =
                VOLUME_TIER_STYLES[row.volume_tier] ?? VOLUME_TIER_STYLES["Low-Volume"];
              const isHighlighted =
                highlightState && row.state_abbr === highlightState;
              const isSmallSample = row.small_sample_flag;

              return (
                <tr
                  key={row.state_abbr}
                  ref={isHighlighted ? highlightRef : undefined}
                  className={`border-b border-midnight-navy/5 ${
                    isHighlighted
                      ? "bg-intelligence-teal/10 ring-1 ring-intelligence-teal/30"
                      : isSmallSample
                        ? "opacity-75"
                        : ""
                  }`}
                >
                  <td className="py-2.5 pr-3 font-mono text-xs text-slate-gray">
                    {index + 1}
                  </td>
                  <td className="py-2.5 pr-3 font-medium text-midnight-navy">
                    {row.state_name}{" "}
                    <span className="text-xs text-slate-gray">
                      ({row.state_abbr})
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono font-semibold text-midnight-navy">
                    {row.construction_fatalities_est != null
                      ? Math.round(row.construction_fatalities_est).toLocaleString()
                      : "—"}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono font-semibold text-midnight-navy">
                    {row.construction_fatality_rate_2024 != null ? (
                      <>
                        {row.construction_fatality_rate_2024.toFixed(1)}
                        {isSmallSample && (
                          <span
                            className="ml-1 cursor-help"
                            title="Fewer than 10 estimated construction fatalities — rate may reflect small sample size"
                          >
                            ⚠️
                          </span>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-center">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${riskStyle.bg} ${riskStyle.text}`}
                    >
                      {row.priority_tier}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-center">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${volStyle.bg} ${volStyle.text}`}
                    >
                      {row.volume_tier}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono text-xs">
                    {row.rate_vs_national != null ? (
                      <span
                        className={
                          row.rate_vs_national >= 1.5
                            ? "font-semibold text-red-600"
                            : row.rate_vs_national >= 1.0
                              ? "text-orange-600"
                              : "text-green-600"
                        }
                      >
                        {row.rate_vs_national.toFixed(1)}&times; national avg
                      </span>
                    ) : (
                      <span className="text-slate-gray">
                        Rate not published
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
