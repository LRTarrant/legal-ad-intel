"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface JpmlDateSelectProps {
  reportDates: string[];
  selectedDate: string | null;
}

export function JpmlDateSelect({ reportDates, selectedDate }: JpmlDateSelectProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

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

  return (
    <label className="flex items-center gap-2 text-sm text-slate-gray">
      <span className="font-medium">Report Date</span>
      <select
        value={selectedDate ?? ""}
        onChange={(event) => handleChange(event.target.value)}
        className="rounded-md border border-midnight-navy/10 bg-white px-3 py-1.5 text-sm font-medium text-midnight-navy"
      >
        <option value="">Latest</option>
        {reportDates.map((date) => (
          <option key={date} value={date}>
            {date}
          </option>
        ))}
      </select>
    </label>
  );
}
