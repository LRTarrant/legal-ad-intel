"use client";

import { useState } from "react";
import type { JpmlSnapshot, JpmlTypeSummary } from "@/lib/queries";
import { JpmlDonutChart } from "./jpml-donut-chart";
import { JpmlSnapshotTable } from "./jpml-snapshot-table";

export function JpmlDetailSection({
  snapshots,
  summaries,
}: {
  snapshots: JpmlSnapshot[];
  summaries: JpmlTypeSummary[];
}) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);

  if (snapshots.length === 0) return null;

  return (
    <div id="jpml-snapshot" className="scroll-mt-16 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-midnight-navy/5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold text-midnight-navy">
            JPML Snapshot Detail
          </h2>
          <p className="mt-1 text-sm text-slate-gray">
            Click a donut segment to filter the table by JPML type.
          </p>
        </div>
        <button
          onClick={() => setIsSnapshotOpen(!isSnapshotOpen)}
          className="text-sm font-medium"
          style={{ color: "#1A8C96" }}
        >
          {isSnapshotOpen ? "Hide Detail \u25B2" : "Show Detail \u25BC"}
        </button>
      </div>

      {isSnapshotOpen && (
        <div className="mt-6">
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="flex-shrink-0 lg:w-[320px]">
              <JpmlDonutChart
                summaries={summaries}
                selectedType={selectedType}
                onSelectType={setSelectedType}
              />
            </div>
            <JpmlSnapshotTable
              snapshots={snapshots}
              selectedType={selectedType}
              onClearFilter={() => setSelectedType(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
