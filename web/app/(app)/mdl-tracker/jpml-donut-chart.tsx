"use client";

import { useMemo, useState } from "react";
import type { JpmlTypeSummary } from "@/lib/queries";

const TYPE_COLORS: Record<string, string> = {
  "Products Liability": "#1A8C96",
  Antitrust: "#0B1D3A",
  "Data Breach": "#2E5077",
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

interface DonutSegment {
  type: string;
  count: number;
  pct: number;
  color: string;
  startAngle: number;
  endAngle: number;
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  const sweep = endAngle - startAngle;
  if (sweep >= 359.99) {
    // Full circle — use two arcs
    const mid = startAngle + 180;
    const s1 = polarToCartesian(cx, cy, r, startAngle);
    const m = polarToCartesian(cx, cy, r, mid);
    const e1 = polarToCartesian(cx, cy, r, endAngle - 0.01);
    return [
      `M ${s1.x} ${s1.y}`,
      `A ${r} ${r} 0 0 1 ${m.x} ${m.y}`,
      `A ${r} ${r} 0 0 1 ${e1.x} ${e1.y}`,
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

export function JpmlDonutChart({
  summaries,
  selectedType,
  onSelectType,
}: {
  summaries: JpmlTypeSummary[];
  selectedType: string | null;
  onSelectType: (type: string | null) => void;
}) {
  const [hoveredType, setHoveredType] = useState<string | null>(null);

  const totalActive = summaries[0]?.total_active_mdls ?? 0;

  const segments: DonutSegment[] = useMemo(() => {
    const total = summaries.reduce((sum, s) => sum + s.mdl_count, 0);
    if (total === 0) return [];

    let currentAngle = 0;
    return summaries.map((s, i) => {
      const pct = (s.mdl_count / total) * 100;
      const sweep = (s.mdl_count / total) * 360;
      const segment: DonutSegment = {
        type: s.mdl_type,
        count: s.mdl_count,
        pct,
        color: getColor(s.mdl_type, i),
        startAngle: currentAngle,
        endAngle: currentAngle + sweep,
      };
      currentAngle += sweep;
      return segment;
    });
  }, [summaries]);

  const cx = 150;
  const cy = 150;
  const outerR = 130;
  const innerR = 85;
  const midR = (outerR + innerR) / 2;
  const strokeWidth = outerR - innerR;

  if (summaries.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* SVG Donut */}
      <div className="relative" style={{ width: 300, height: 300 }}>
        <svg viewBox="0 0 300 300" className="h-full w-full">
          {segments.map((seg) => {
            const isSelected = selectedType === seg.type;
            const isHovered = hoveredType === seg.type;
            const isDimmed =
              (selectedType != null && !isSelected) ||
              (hoveredType != null && !isHovered && selectedType == null);

            return (
              <path
                key={seg.type}
                d={describeArc(cx, cy, midR, seg.startAngle, seg.endAngle)}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                opacity={isDimmed ? 0.35 : 1}
                className="cursor-pointer transition-opacity duration-150"
                onClick={() =>
                  onSelectType(selectedType === seg.type ? null : seg.type)
                }
                onMouseEnter={() => setHoveredType(seg.type)}
                onMouseLeave={() => setHoveredType(null)}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-3xl font-bold text-midnight-navy">
            {totalActive}
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-slate-gray">
            Active MDLs
          </span>
        </div>

        {/* Tooltip */}
        {hoveredType != null && (
          <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 rounded-lg bg-midnight-navy px-3 py-2 text-center text-xs text-white shadow-lg">
            <p className="font-semibold">
              {segments.find((s) => s.type === hoveredType)?.type}
            </p>
            <p>
              {segments.find((s) => s.type === hoveredType)?.count} MDLs (
              {segments.find((s) => s.type === hoveredType)?.pct.toFixed(1)}%)
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5">
        {segments.map((seg) => {
          const isSelected = selectedType === seg.type;
          return (
            <button
              key={seg.type}
              type="button"
              className={`flex items-center gap-2 rounded px-1.5 py-1 text-left text-xs transition-opacity duration-150 hover:bg-cloud ${
                selectedType != null && !isSelected ? "opacity-40" : ""
              }`}
              onClick={() =>
                onSelectType(selectedType === seg.type ? null : seg.type)
              }
            >
              <span
                className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                style={{ backgroundColor: seg.color }}
              />
              <span className="truncate font-medium text-midnight-navy">
                {seg.type}
              </span>
              <span className="ml-auto font-mono text-slate-gray">
                {seg.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
