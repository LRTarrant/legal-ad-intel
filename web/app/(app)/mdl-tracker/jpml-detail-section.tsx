"use client";

import { useState } from "react";
import type { JpmlTypeSummary, JpmlSnapshot } from "@/lib/queries/jpml";
import { JpmlDonutChart } from "./jpml-donut-chart";
import { JpmlSnapshotTable } from "./jpml-snapshot-table";

const TYPE_COLORS: Record<string, string> = {
  "Products Liability": "#1A8C96",
  Antitrust: "#0B1D3A",
  "Data Breach and Consumer Privacy": "#2E5077",
  Miscellaneous: "#4FB8C4",
  "Intellectual Property": "#F59E0B",
  "Sales Practices": "#10B981",
  Securities: "#EF4444",
  "Common Disaster": "#8B5CF6",
  "Air Disaster": "#EC4899",
  "Employment Practices": "#6B7280",
};

function getTypeColor(type: string): string {
  return TYPE_COLORS[type] ?? "#6B7280";
}

export interface JpmlDetailSectionProps {
  summaries: JpmlTypeSummary[];
  snapshots: JpmlSnapshot[];
  reportDate: string | null;
}

export function JpmlDetailSection({
  summaries,
  snapshots,
  reportDate,
}: JpmlDetailSectionProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  if (summaries.length === 0 && snapshots.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          JPML Pending MDLs
        </h2>
        <p className="mt-4 text-center text-sm text-slate-gray">
          No JPML report data available yet.
        </p>
      </div>
    );
  }

  const total = summaries.reduce((sum, s) => sum + s.mdl_count, 0);
  const maxCount = summaries[0]?.mdl_count ?? 1;

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      {/* A. Header row */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          JPML Pending MDLs
        </h2>
        <span className="text-sm text-slate-gray">
          Source:{" "}
          <a
            href="https://www.jpml.uscourts.gov/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="U.S. Judicial Panel on Multidistrict Litigation website"
            className="text-intelligence-teal hover:underline"
          >
            U.S. Judicial Panel on Multidistrict Litigation (JPML) ↗
          </a>
        </span>
      </div>

      {reportDate && (
        <p className="mt-1 text-sm text-slate-gray">
          Report:{" "}
          {new Date(reportDate + "T00:00:00").toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      )}

      {/* B. Donut + Type cards */}
      <div className="mt-6 flex flex-col lg:flex-row gap-6">
        {/* Left: Donut chart */}
        <div className="flex-shrink-0 lg:w-[300px]">
          <JpmlDonutChart
            summaries={summaries}
            selectedType={selectedType}
            onSelectType={setSelectedType}
          />
        </div>

        {/* Right: Type cards grid */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {summaries.map((row) => {
            const isSelected = selectedType === row.mdl_type;
            const barWidth =
              maxCount > 0 ? (row.mdl_count / maxCount) * 100 : 0;
            const pct =
              row.pct_of_total ??
              (total > 0 ? Math.round((row.mdl_count / total) * 100) : 0);
            const color = getTypeColor(row.mdl_type);

            return (
              <button
                key={row.mdl_type}
                type="button"
                onClick={() =>
                  setSelectedType(
                    selectedType === row.mdl_type ? null : row.mdl_type
                  )
                }
                className={`rounded-lg bg-white p-3 shadow-sm text-left transition-all ${
                  isSelected
                    ? "ring-2 ring-intelligence-teal"
                    : "ring-1 ring-midnight-navy/5 hover:ring-intelligence-teal/40"
                }`}
              >
                <p className="font-heading text-sm font-semibold text-midnight-navy">
                  {row.mdl_type}
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span
                    className="font-mono text-2xl font-bold"
                    style={{ color }}
                  >
                    {row.mdl_count}
                  </span>
                  <span className="text-sm text-slate-gray">{pct}%</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-cloud">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${Math.max(barWidth, 3)}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* C. Snapshot detail table */}
      <JpmlSnapshotTable
        snapshots={snapshots}
        selectedType={selectedType}
        onClearFilter={() => setSelectedType(null)}
      />
    </div>
  );
}
