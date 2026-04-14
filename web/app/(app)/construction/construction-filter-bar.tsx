"use client";

import { startTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const YEARS = [2024, 2023, 2022, 2021, 2020, 2019];

const US_STATES = [
  { abbr: "AL", name: "Alabama" }, { abbr: "AK", name: "Alaska" },
  { abbr: "AZ", name: "Arizona" }, { abbr: "AR", name: "Arkansas" },
  { abbr: "CA", name: "California" }, { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" }, { abbr: "DE", name: "Delaware" },
  { abbr: "DC", name: "District of Columbia" }, { abbr: "FL", name: "Florida" },
  { abbr: "GA", name: "Georgia" }, { abbr: "HI", name: "Hawaii" },
  { abbr: "ID", name: "Idaho" }, { abbr: "IL", name: "Illinois" },
  { abbr: "IN", name: "Indiana" }, { abbr: "IA", name: "Iowa" },
  { abbr: "KS", name: "Kansas" }, { abbr: "KY", name: "Kentucky" },
  { abbr: "LA", name: "Louisiana" }, { abbr: "ME", name: "Maine" },
  { abbr: "MD", name: "Maryland" }, { abbr: "MA", name: "Massachusetts" },
  { abbr: "MI", name: "Michigan" }, { abbr: "MN", name: "Minnesota" },
  { abbr: "MS", name: "Mississippi" }, { abbr: "MO", name: "Missouri" },
  { abbr: "MT", name: "Montana" }, { abbr: "NE", name: "Nebraska" },
  { abbr: "NV", name: "Nevada" }, { abbr: "NH", name: "New Hampshire" },
  { abbr: "NJ", name: "New Jersey" }, { abbr: "NM", name: "New Mexico" },
  { abbr: "NY", name: "New York" }, { abbr: "NC", name: "North Carolina" },
  { abbr: "ND", name: "North Dakota" }, { abbr: "OH", name: "Ohio" },
  { abbr: "OK", name: "Oklahoma" }, { abbr: "OR", name: "Oregon" },
  { abbr: "PA", name: "Pennsylvania" }, { abbr: "RI", name: "Rhode Island" },
  { abbr: "SC", name: "South Carolina" }, { abbr: "SD", name: "South Dakota" },
  { abbr: "TN", name: "Tennessee" }, { abbr: "TX", name: "Texas" },
  { abbr: "UT", name: "Utah" }, { abbr: "VT", name: "Vermont" },
  { abbr: "VA", name: "Virginia" }, { abbr: "WA", name: "Washington" },
  { abbr: "WV", name: "West Virginia" }, { abbr: "WI", name: "Wisconsin" },
  { abbr: "WY", name: "Wyoming" },
];

type ConstructionFilterBarProps = {
  selectedYear: number;
  selectedState: string;
};

export function ConstructionFilterBar({
  selectedYear,
  selectedState,
}: ConstructionFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParams(updates: { year?: string; state?: string }) {
    const params = new URLSearchParams(searchParams.toString());

    if (updates.year !== undefined) {
      if (updates.year && updates.year !== "2024") {
        params.set("year", updates.year);
      } else {
        params.delete("year");
      }
    }

    if (updates.state !== undefined) {
      if (updates.state && updates.state !== "US") {
        params.set("state", updates.state);
      } else {
        params.delete("state");
      }
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
            Construction fatality data
          </h2>
          <p className="mt-1 text-sm text-slate-gray">
            BLS Census of Fatal Occupational Injuries &middot; NAICS 23
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-gray">
            Year
          </span>
          <select
            value={selectedYear}
            onChange={(e) => updateParams({ year: e.target.value })}
            className="w-full rounded-xl border border-midnight-navy/10 bg-cloud px-4 py-3 text-sm font-medium text-midnight-navy outline-none transition focus:border-intelligence-teal"
          >
            {YEARS.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-gray">
            State
          </span>
          <select
            value={selectedState}
            onChange={(e) => updateParams({ state: e.target.value })}
            className="w-full rounded-xl border border-midnight-navy/10 bg-cloud px-4 py-3 text-sm font-medium text-midnight-navy outline-none transition focus:border-intelligence-teal"
          >
            <option value="US">All States / National</option>
            {US_STATES.map((s) => (
              <option key={s.abbr} value={s.abbr}>
                {s.name} ({s.abbr})
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
