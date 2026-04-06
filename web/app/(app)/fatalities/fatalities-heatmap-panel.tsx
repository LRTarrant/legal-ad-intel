"use client";

import dynamic from "next/dynamic";
import type { HeatmapPoint } from "@/lib/queries";

const FatalitiesHeatmap = dynamic(
  () =>
    import("./fatalities-heatmap").then((module) => module.FatalitiesHeatmap),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-midnight-navy/5">
        <div className="flex h-[420px] items-center justify-center rounded-2xl bg-cloud text-sm text-slate-gray">
          Loading map…
        </div>
      </div>
    ),
  }
);

export function FatalitiesHeatmapPanel({
  points,
  title,
}: {
  points: HeatmapPoint[];
  title: string;
}) {
  return <FatalitiesHeatmap points={points} title={title} />;
}
