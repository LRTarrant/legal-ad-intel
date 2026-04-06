"use client";

import { startTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  FatalityCountyOption,
  FatalityStateOption,
} from "@/lib/queries";

type FatalitiesFilterBarProps = {
  states: FatalityStateOption[];
  counties: FatalityCountyOption[];
  selectedState: string | null;
  selectedCounty: number | null;
};

export function FatalitiesFilterBar({
  states,
  counties,
  selectedState,
  selectedCounty,
}: FatalitiesFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParams(nextState: string, nextCounty: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextState) {
      params.set("state", nextState);
    } else {
      params.delete("state");
    }

    if (nextCounty && nextState) {
      params.set("county", nextCounty);
    } else {
      params.delete("county");
    }

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-midnight-navy/5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-intelligence-teal">
            Filter View
          </p>
          <h2 className="mt-1 font-heading text-xl font-semibold text-midnight-navy">
            Narrow the fatality signal
          </h2>
          <p className="mt-1 text-sm text-slate-gray">
            Slice by state and county to focus the summaries, heatmap, and recent crashes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => updateParams("", "")}
          className="rounded-full border border-midnight-navy/10 px-4 py-2 text-sm font-medium text-slate-gray transition hover:border-intelligence-teal hover:text-intelligence-teal"
        >
          Clear filters
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-gray">
            State
          </span>
          <select
            value={selectedState ?? ""}
            onChange={(event) => updateParams(event.target.value, "")}
            className="w-full rounded-xl border border-midnight-navy/10 bg-cloud px-4 py-3 text-sm font-medium text-midnight-navy outline-none transition focus:border-intelligence-teal"
          >
            <option value="">All states</option>
            {states.map((option) => (
              <option key={option.state} value={option.state}>
                {option.state}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-gray">
            County
          </span>
          <select
            value={selectedCounty?.toString() ?? ""}
            onChange={(event) => updateParams(selectedState ?? "", event.target.value)}
            disabled={!selectedState}
            className="w-full rounded-xl border border-midnight-navy/10 bg-cloud px-4 py-3 text-sm font-medium text-midnight-navy outline-none transition enabled:focus:border-intelligence-teal disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">
              {selectedState ? "All counties" : "Select a state first"}
            </option>
            {counties.map((option) => (
              <option key={option.county_fips} value={option.county_fips}>
                {option.county_name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
