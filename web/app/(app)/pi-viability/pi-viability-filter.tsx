"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function PiViabilityFilter({ states }: { states: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedState = searchParams.get("state") ?? "";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("state", value);
    } else {
      params.delete("state");
    }
    router.push(`/pi-viability?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="state-filter" className="text-sm font-medium text-slate-gray">
        Filter by state
      </label>
      <select
        id="state-filter"
        value={selectedState}
        onChange={handleChange}
        className="rounded-md border border-cloud bg-white px-3 py-2 text-sm text-midnight-navy shadow-sm focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
      >
        <option value="">All States</option>
        {states.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
