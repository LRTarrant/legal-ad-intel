"use client";

import { startTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type StormFilterBarProps = {
  states: string[];
  eventTypes: string[];
};

export function StormFilterBar({ states, eventTypes }: StormFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    // Clear year and event_type when state changes
    if ("state" in updates && !updates.state) {
      params.delete("year");
      params.delete("event_type");
    }

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  const selectedState = searchParams.get("state") ?? "";
  const selectedYear = searchParams.get("year") ?? "";
  const selectedEventType = searchParams.get("event_type") ?? "";

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-midnight-navy/5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-intelligence-teal">
            Filter View
          </p>
          <h2 className="mt-1 font-heading text-xl font-semibold text-midnight-navy">
            Narrow the storm signal
          </h2>
          <p className="mt-1 text-sm text-slate-gray">
            Slice by state, year, and event type to focus the summaries and trend data.
          </p>
        </div>

        <button
          type="button"
          onClick={() => updateParams({ state: "", year: "", event_type: "" })}
          className="rounded-full border border-midnight-navy/10 px-4 py-2 text-sm font-medium text-slate-gray transition hover:border-intelligence-teal hover:text-intelligence-teal"
        >
          Clear filters
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-gray">
            State
          </span>
          <select
            value={selectedState}
            onChange={(e) => updateParams({ state: e.target.value, year: selectedYear, event_type: selectedEventType })}
            className="w-full rounded-xl border border-midnight-navy/10 bg-cloud px-4 py-3 text-sm font-medium text-midnight-navy outline-none transition focus:border-intelligence-teal"
          >
            <option value="">All states</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-gray">
            Year
          </span>
          <select
            value={selectedYear}
            onChange={(e) => updateParams({ state: selectedState, year: e.target.value, event_type: selectedEventType })}
            className="w-full rounded-xl border border-midnight-navy/10 bg-cloud px-4 py-3 text-sm font-medium text-midnight-navy outline-none transition focus:border-intelligence-teal"
          >
            <option value="">All years</option>
            {[2019, 2020, 2021, 2022, 2023, 2024].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-gray">
            Event Type
          </span>
          <select
            value={selectedEventType}
            onChange={(e) => updateParams({ state: selectedState, year: selectedYear, event_type: e.target.value })}
            className="w-full rounded-xl border border-midnight-navy/10 bg-cloud px-4 py-3 text-sm font-medium text-midnight-navy outline-none transition focus:border-intelligence-teal"
          >
            <option value="">All event types</option>
            {eventTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
