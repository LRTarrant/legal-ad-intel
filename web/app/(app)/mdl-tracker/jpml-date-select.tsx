"use client";

import { startTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function JpmlDateSelect({
  reportDates,
  selectedDate,
}: {
  reportDates: string[];
  selectedDate: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set("jpml_date", value);
    } else {
      params.delete("jpml_date");
    }

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  const latestDate = reportDates[0] ?? null;

  return (
    <select
      value={selectedDate ?? ""}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-xl border border-midnight-navy/10 bg-cloud px-3 py-2 text-sm font-medium text-midnight-navy outline-none transition focus:border-intelligence-teal"
    >
      <option value="">
        {latestDate ? `Latest (${latestDate})` : "Latest"}
      </option>
      {reportDates.map((date) => (
        <option key={date} value={date}>
          {date}
        </option>
      ))}
    </select>
  );
}
