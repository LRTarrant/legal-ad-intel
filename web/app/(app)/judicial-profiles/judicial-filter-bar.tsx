"use client";

import { startTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { JudicialStateOption } from "@/lib/queries";

export function JudicialFilterBar({
  states,
  selectedState,
}: {
  states: JudicialStateOption[];
  selectedState: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateState(nextState: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextState) {
      params.set("state", nextState);
    } else {
      params.delete("state");
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
            Focus by state
          </h2>
          <p className="mt-1 text-sm text-slate-gray">
            Narrow the county-level judicial profile map and rankings to a single state.
          </p>
        </div>

        <button
          type="button"
          onClick={() => updateState("")}
          className="rounded-full border border-midnight-navy/10 px-4 py-2 text-sm font-medium text-slate-gray transition hover:border-intelligence-teal hover:text-intelligence-teal"
        >
          Clear filter
        </button>
      </div>

      <div className="mt-5 max-w-sm">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-gray">
            State
          </span>
          <select
            value={selectedState ?? ""}
            onChange={(event) => updateState(event.target.value)}
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
      </div>
    </div>
  );
}
