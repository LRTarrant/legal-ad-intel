"use client";

import { useState } from "react";
import type { JpmlTypeSummary } from "@/lib/queries";
import { JpmlDonutChart } from "./jpml-donut-chart";

export function JpmlDonutWrapper({
  summaries,
}: {
  summaries: JpmlTypeSummary[];
}) {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  if (summaries.length === 0) return null;

  return (
    <JpmlDonutChart
      summaries={summaries}
      selectedType={selectedType}
      onSelectType={setSelectedType}
    />
  );
}
