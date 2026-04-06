"use client";

import dynamic from "next/dynamic";
import type { JudicialProfileRow } from "@/lib/queries";

const JudicialMap = dynamic(
  () => import("./judicial-map").then((module) => module.JudicialMap),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-midnight-navy/5">
        <div className="flex h-[520px] items-center justify-center rounded-2xl bg-cloud text-sm text-slate-gray">
          Loading county boundaries…
        </div>
      </div>
    ),
  }
);

export function JudicialMapPanel({
  rows,
  selectedState,
}: {
  rows: JudicialProfileRow[];
  selectedState: string | null;
}) {
  return <JudicialMap rows={rows} selectedState={selectedState} />;
}
