"use client";

import { useState } from "react";
import {
  resolveTimeframe,
  validateRange,
  type ResolvedTimeframe,
  type TimeframePreset,
} from "@/lib/analytics-timeframe";

const PRESETS: { key: TimeframePreset; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
];

/**
 * Presets + custom start/end date control shared by the GA4 dashboard and the
 * user-activity views. Emits a resolved absolute range to the parent.
 */
export function TimeframeSelector({
  value,
  onChange,
  accentColor = "#1A8C96",
  disabled,
}: {
  value: ResolvedTimeframe;
  onChange: (tf: ResolvedTimeframe) => void;
  accentColor?: string;
  disabled?: boolean;
}) {
  const [customFrom, setCustomFrom] = useState(value.startDate);
  const [customTo, setCustomTo] = useState(value.endDate);

  const isCustom = value.preset === "custom";

  function pickPreset(key: TimeframePreset) {
    onChange(resolveTimeframe(key));
  }

  function applyCustom(from: string, to: string) {
    const v = validateRange(from, to);
    if (v) onChange({ ...v, preset: "custom" });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex flex-wrap gap-1 rounded-lg border border-slate-300 bg-white p-1">
        {PRESETS.map((p) => {
          const active = value.preset === p.key;
          return (
            <button
              key={p.key}
              type="button"
              disabled={disabled}
              onClick={() => pickPreset(p.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
                active
                  ? "text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
              style={active ? { backgroundColor: accentColor } : undefined}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div
        className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 ${
          isCustom ? "border-slate-400 bg-white" : "border-slate-200 bg-slate-50"
        }`}
      >
        <input
          type="date"
          value={customFrom}
          max={customTo || undefined}
          disabled={disabled}
          onChange={(e) => {
            setCustomFrom(e.target.value);
            applyCustom(e.target.value, customTo);
          }}
          className="bg-transparent text-sm text-slate-700 outline-none disabled:opacity-50"
          aria-label="Start date"
        />
        <span className="text-slate-400">–</span>
        <input
          type="date"
          value={customTo}
          min={customFrom || undefined}
          disabled={disabled}
          onChange={(e) => {
            setCustomTo(e.target.value);
            applyCustom(customFrom, e.target.value);
          }}
          className="bg-transparent text-sm text-slate-700 outline-none disabled:opacity-50"
          aria-label="End date"
        />
      </div>
    </div>
  );
}
