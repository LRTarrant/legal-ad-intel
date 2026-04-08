"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface JpmlTypeFilterProps {
  availableTypes: string[];
  totalCount: number;
  filteredCount: number;
}

export function JpmlTypeFilter({
  availableTypes,
  totalCount,
  filteredCount,
}: JpmlTypeFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const selectedType = searchParams.get("jpml_type") ?? "";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("jpml_type", value);
    } else {
      params.delete("jpml_type");
    }
    startTransition(() => {
      router.replace(`?${params.toString()}`);
    });
  }

  return (
    <div className="flex items-center gap-3">
      <select
        value={selectedType}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-md border border-cloud bg-white px-3 py-1.5 text-sm text-midnight-navy"
      >
        <option value="">All Types</option>
        {availableTypes.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
      {selectedType && (
        <span className="flex items-center gap-1.5 text-xs text-slate-gray">
          Showing {filteredCount} of {totalCount} MDLs
          <button
            type="button"
            onClick={() => handleChange("")}
            className="text-slate-gray hover:text-midnight-navy"
            aria-label="Clear JPML type filter"
          >
            &times;
          </button>
        </span>
      )}
    </div>
  );
}
