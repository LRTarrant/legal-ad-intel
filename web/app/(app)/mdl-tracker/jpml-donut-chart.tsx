"use client";

import { useState, useCallback } from "react";
import type { JpmlTypeSummary } from "@/lib/queries/jpml";

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

const FALLBACK_COLORS = [
  "#1A8C96",
  "#0B1D3A",
  "#2E5077",
  "#4FB8C4",
  "#F59E0B",
  "#10B981",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#6B7280",
];

function getColor(type: string, index: number): string {
  return TYPE_COLORS[type] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

interface ArcSegment {
  type: string;
  count: number;
  pct: number;
  color: string;
  startAngle: number;
  endAngle: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const sweep = endAngle - startAngle;
  if (sweep >= 359.99) {
    const mid = startAngle + sweep / 2;
    const s = polarToCartesian(cx, cy, r, startAngle);
    const m = polarToCartesian(cx, cy, r, mid);
    const e = polarToCartesian(cx, cy, r, endAngle - 0.01);
    return [
      `M ${s.x} ${s.y}`,
      `A ${r} ${r} 0 0 1 ${m.x} ${m.y}`,
      `A ${r} ${r} 0 0 1 ${e.x} ${e.y}`,
    ].join(" ");
  }
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = sweep > 180 ? 1 : 0;
  return [
    `M ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`,
  ].join(" ");
}

export interface JpmlDonutChartProps {
  summaries: JpmlTypeSummary[];
  selectedType: string | null;
  onSelectType: (type: string | null) => void;
}

export function JpmlDonutChart({
  summaries,
  selectedType,
  onSelectType,
}: JpmlDonutChartProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    type: string;
    count: number;
    pct: number;
  } | null>(null);

  const total = summaries.reduce((sum, s) => sum + s.mdl_count, 0);

  const segments: ArcSegment[] = [];
  let currentAngle = 0;
  for (let i = 0; i < summaries.length; i++) {
    const s = summaries[i];
    const sweep = total > 0 ? (s.mdl_count / total) * 360 : 0;
    segments.push({
      type: s.mdl_type,
      count: s.mdl_count,
      pct: s.pct_of_total ?? (total > 0 ? Math.round((s.mdl_count / total) * 100) : 0),
      color: getColor(s.mdl_type, i),
      startAngle: currentAngle,
      endAngle: currentAngle + sweep,
    });
    currentAngle += sweep;
  }

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, seg: ArcSegment) => {
      const rect = (e.currentTarget as SVGElement).closest("svg")?.getBoundingClientRect();
      if (!rect) return;
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 10,
        type: seg.type,
        count: seg.count,
        pct: seg.pct,
      });
    },
    []
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  const cx = 100;
  const cy = 100;
  const r = 80;
  const strokeWidth = 30;

  if (summaries.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full max-w-[300px] mx-auto">
      <svg viewBox="0 0 200 200" className="w-full">
        {segments.map((seg) => {
          const isSelected = selectedType === seg.type;
          const hasSelection = selectedType !== null;
          const opacity = hasSelection ? (isSelected ? 1 : 0.4) : 1;
          const sw = isSelected ? strokeWidth + 4 : strokeWidth;
          const gap = 1;
          const actualStart = seg.startAngle + gap / 2;
          const actualEnd = seg.endAngle - gap / 2;
          if (actualEnd <= actualStart) return null;

          return (
            <path
              key={seg.type}
              d={describeArc(cx, cy, r, actualStart, actualEnd)}
              fill="none"
              stroke={seg.color}
              strokeWidth={sw}
              strokeLinecap="butt"
              opacity={opacity}
              className="cursor-pointer transition-opacity duration-200"
              onClick={() =>
                onSelectType(selectedType === seg.type ? null : seg.type)
              }
              onMouseMove={(e) => handleMouseMove(e, seg)}
              onMouseLeave={handleMouseLeave}
            />
          );
        })}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          className="fill-midnight-navy font-heading text-[28px] font-bold"
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          className="fill-slate-gray text-[11px]"
        >
          Active MDLs
        </text>
      </svg>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg bg-charcoal px-3 py-2 text-xs text-white shadow-lg"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="font-semibold">{tooltip.type}</p>
          <p>
            {tooltip.count} MDLs ({tooltip.pct}%)
          </p>
        </div>
      )}
    </div>
  );
}
