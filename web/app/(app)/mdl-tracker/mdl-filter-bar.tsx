"use client";

import { startTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { MdlReportDateOption } from "@/lib/queries";

export function MdlFilterBar({
  reportDates,
  selectedDate,
  search,
  mdl,
}: {
  reportDates: MdlReportDateOption[];
  selectedDate: string | null;
  search: string;
  mdl: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParams(next: { date?: string; search?: string; mdl?: string }) {
    const params = new URLSearchParams(searchParams.toString());

    if (next.date && next.date.trim()) {
      params.set("date", next.date.trim());
    } else {
      params.delete("date");
    }

    if (next.search && next.search.trim()) {
      params.set("search", next.search.trim());
    } else {
      params.delete("search");
    }

    if (next.mdl && next.mdl.trim()) {
      params.set("mdl", next.mdl.trim());
    } else {
      params.delete("mdl");
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
            Narrow the MDL snapshot
          </h2>
          <p className="mt-1 text-sm text-slate-gray">
            Pin the reporting month, then search by case name or specific MDL number.
          </p>
        </div>

        <button
          type="button"
          onClick={() => updateParams({ date: "", search: "", mdl: "" })}
          className="rounded-full border border-midnight-navy/10 px-4 py-2 text-sm font-medium text-slate-gray transition hover:border-intelligence-teal hover:text-intelligence-teal"
        >
          Clear filters
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-gray">
            Report Date
          </span>
          <select
            value={selectedDate ?? ""}
            onChange={(event) =>
              updateParams({ date: event.target.value, search, mdl })
            }
            className="w-full rounded-xl border border-midnight-navy/10 bg-cloud px-4 py-3 text-sm font-medium text-midnight-navy outline-none transition focus:border-intelligence-teal"
          >
            <option value="">Latest available</option>
            {reportDates.map((option) => (
              <option key={option.stats_month} value={option.stats_month}>
                {option.stats_month}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-gray">
            Case Name Search
          </span>
          <input
            type="text"
            defaultValue={search}
            placeholder="e.g. talcum"
            onBlur={(event) =>
              updateParams({
                date: selectedDate ?? "",
                search: event.target.value,
                mdl,
              })
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                updateParams({
                  date: selectedDate ?? "",
                  search: event.currentTarget.value,
                  mdl,
                });
              }
            }}
            className="w-full rounded-xl border border-midnight-navy/10 bg-cloud px-4 py-3 text-sm font-medium text-midnight-navy outline-none transition focus:border-intelligence-teal"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-gray">
            MDL Number
          </span>
          <input
            type="text"
            inputMode="numeric"
            defaultValue={mdl}
            placeholder="e.g. 2738"
            onBlur={(event) =>
              updateParams({
                date: selectedDate ?? "",
                search,
                mdl: event.target.value,
              })
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                updateParams({
                  date: selectedDate ?? "",
                  search,
                  mdl: event.currentTarget.value,
                });
              }
            }}
            className="w-full rounded-xl border border-midnight-navy/10 bg-cloud px-4 py-3 text-sm font-medium text-midnight-navy outline-none transition focus:border-intelligence-teal"
          />
        </label>
      </div>
    </div>
  );
}
