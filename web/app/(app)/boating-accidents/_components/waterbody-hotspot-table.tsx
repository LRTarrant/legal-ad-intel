"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition } from "react";
import type { BoatingHotspotWaterbody } from "@/lib/queries";

type WaterbodyHotspotTableProps = {
  hotspots: BoatingHotspotWaterbody[];
  selectedState: string | null;
};

export function WaterbodyHotspotTable({ hotspots, selectedState }: WaterbodyHotspotTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigateToWaterbody(waterbodyId: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("waterbody", String(waterbodyId));
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  if (hotspots.length === 0) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          Waterbody Hotspots
        </h2>
        <p className="mt-3 text-sm text-slate-gray">
          No waterbody hotspot data available for the current filter.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          Waterbody Hotspots
        </h2>
        <p className="mt-1 text-sm text-slate-gray">
          Top waterbodies by total accidents{selectedState ? ` in ${selectedState}` : " nationwide"}. Click a row to filter.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-midnight-navy/10">
              <th className="py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-gray">
                #
              </th>
              <th className="py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-gray">
                Waterbody
              </th>
              <th className="py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-gray">
                Type
              </th>
              <th className="py-2 pr-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
                Accidents
              </th>
              <th className="py-2 pr-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
                Deaths
              </th>
              <th className="py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
                Injuries
              </th>
            </tr>
          </thead>
          <tbody>
            {hotspots.map((row, index) => (
              <tr
                key={row.waterbody_id}
                onClick={() => navigateToWaterbody(row.waterbody_id)}
                className="cursor-pointer border-b border-midnight-navy/5 transition hover:bg-cloud"
              >
                <td className="py-2.5 pr-3 font-mono text-xs text-slate-gray">
                  {index + 1}
                </td>
                <td className="py-2.5 pr-3 font-medium text-midnight-navy">
                  {row.waterbody_name}
                </td>
                <td className="py-2.5 pr-3">
                  <span className="inline-block rounded-full bg-cloud px-2.5 py-0.5 text-xs font-medium text-slate-gray">
                    {row.waterbody_type}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-right font-mono font-semibold text-midnight-navy">
                  {row.total_accidents.toLocaleString()}
                </td>
                <td className="py-2.5 pr-3 text-right font-mono text-midnight-navy">
                  {row.total_deaths.toLocaleString()}
                </td>
                <td className="py-2.5 text-right font-mono text-midnight-navy">
                  {row.total_injuries.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
