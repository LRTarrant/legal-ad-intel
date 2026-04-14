"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState } from "react";

const PRESETS = [
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
  { label: "YTD", value: "ytd" },
  { label: "Custom", value: "custom" },
] as const;

type PresetValue = (typeof PRESETS)[number]["value"];

export function TimeWindowSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentWindow = (searchParams.get("window") ?? "30d") as PresetValue;
  const currentFrom = searchParams.get("from") ?? "";
  const currentTo = searchParams.get("to") ?? "";

  const [fromDate, setFromDate] = useState(currentFrom);
  const [toDate, setToDate] = useState(currentTo);

  const buildUrl = useCallback(
    (window: PresetValue, from?: string, to?: string) => {
      const params = new URLSearchParams(searchParams.toString());
      // Remove time-window params to rebuild
      params.delete("window");
      params.delete("from");
      params.delete("to");

      if (window !== "30d") {
        params.set("window", window);
      }
      if (window === "custom" && from) params.set("from", from);
      if (window === "custom" && to) params.set("to", to);

      const qs = params.toString();
      return `${pathname}${qs ? `?${qs}` : ""}`;
    },
    [pathname, searchParams]
  );

  const selectPreset = useCallback(
    (preset: PresetValue) => {
      if (preset === "custom") {
        // Navigate with current custom dates if available, otherwise today
        const today = new Date().toISOString().slice(0, 10);
        const f = fromDate || today;
        const t = toDate || today;
        setFromDate(f);
        setToDate(t);
        router.push(buildUrl("custom", f, t));
      } else {
        router.push(buildUrl(preset));
      }
    },
    [router, buildUrl, fromDate, toDate]
  );

  const applyCustomRange = useCallback(() => {
    if (fromDate && toDate) {
      router.push(buildUrl("custom", fromDate, toDate));
    }
  }, [router, buildUrl, fromDate, toDate]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs font-medium uppercase text-zinc-500">
        Time Window
      </span>
      <div className="flex gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => selectPreset(p.value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              currentWindow === p.value
                ? "border-purple-500 bg-purple-500/20 text-purple-300"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {currentWindow === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 focus:border-purple-500 focus:outline-none"
          />
          <span className="text-xs text-zinc-500">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 focus:border-purple-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={applyCustomRange}
            className="rounded-full border border-purple-500 bg-purple-500/20 px-3 py-1 text-xs font-medium text-purple-300 transition hover:bg-purple-500/30"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
