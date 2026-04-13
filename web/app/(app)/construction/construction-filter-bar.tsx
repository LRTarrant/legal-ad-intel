"use client";

import { startTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const YEARS = [2024, 2023, 2022, 2021, 2020, 2019];

type ConstructionFilterBarProps = {
  selectedYear: number;
};

export function ConstructionFilterBar({
  selectedYear,
}: ConstructionFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateYear(year: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (year && year !== "2024") {
      params.set("year", year);
    } else {
      params.delete("year");
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
            onChange={(e) => updateYear(e.target.value)}
            className="w-full rounded-xl border border-midnight-navy/10 bg-cloud px-4 py-3 text-sm font-medium text-midnight-navy outline-none transition focus:border-intelligence-teal"
          >
            {YEARS.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
