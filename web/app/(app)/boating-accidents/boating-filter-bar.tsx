"use client";

import { startTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { BoatingStateOption, BoatingCountyNameOption, BoatingWaterbodyOption } from "@/lib/queries";

type BoatingFilterBarProps = {
  states: BoatingStateOption[];
  counties: BoatingCountyNameOption[];
  waterbodies: BoatingWaterbodyOption[];
  selectedState: string | null;
  selectedCounty: string | null;
  selectedWaterbody: string | null;
};

export function BoatingFilterBar({
  states,
  counties,
  waterbodies,
  selectedState,
  selectedCounty,
  selectedWaterbody,
}: BoatingFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParams(updates: { state?: string; county?: string; waterbody?: string }) {
    const params = new URLSearchParams(searchParams.toString());

    if (updates.state !== undefined) {
      if (updates.state) {
        params.set("state", updates.state);
      } else {
        params.delete("state");
      }
      // Clear county and waterbody when state changes
      params.delete("county");
      params.delete("waterbody");
    }

    if (updates.county !== undefined) {
      if (updates.county) {
        params.set("county", updates.county);
      } else {
        params.delete("county");
      }
    }

    if (updates.waterbody !== undefined) {
      if (updates.waterbody) {
        params.set("waterbody", updates.waterbody);
      } else {
        params.delete("waterbody");
      }
    }

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  function clearAll() {
    startTransition(() => {
      router.push(pathname);
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
            Narrow the boating signal
          </h2>
          <p className="mt-1 text-sm text-slate-gray">
            Slice by state, county, and body of water to focus the summaries, heatmap, and trend data.
          </p>
        </div>

        <button
          type="button"
          onClick={clearAll}
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
            value={selectedState ?? ""}
            onChange={(event) => updateParams({ state: event.target.value })}
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
            value={selectedCounty ?? ""}
            onChange={(event) => updateParams({ county: event.target.value })}
            disabled={!selectedState}
            className="w-full rounded-xl border border-midnight-navy/10 bg-cloud px-4 py-3 text-sm font-medium text-midnight-navy outline-none transition enabled:focus:border-intelligence-teal disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">
              {selectedState ? "All counties" : "Select a state first"}
            </option>
            {counties.map((option) => (
              <option key={option.county_name} value={option.county_name}>
                {option.county_name} ({option.total_accidents})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-gray">
            Body of Water
          </span>
          <select
            value={selectedWaterbody ?? ""}
            onChange={(event) => updateParams({ waterbody: event.target.value })}
            disabled={!selectedState}
            className="w-full rounded-xl border border-midnight-navy/10 bg-cloud px-4 py-3 text-sm font-medium text-midnight-navy outline-none transition enabled:focus:border-intelligence-teal disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">
              {selectedState ? "All waterbodies" : "Select a state first"}
            </option>
            {waterbodies.map((option) => (
              <option key={option.waterbody_id} value={String(option.waterbody_id)}>
                {option.waterbody_name} ({option.total_accidents})
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
