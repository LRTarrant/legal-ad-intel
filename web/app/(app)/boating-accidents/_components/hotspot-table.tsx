"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition } from "react";
import type { BoatingHotspotCounty } from "@/lib/queries";

type HotspotTableProps = {
  hotspots: BoatingHotspotCounty[];
  selectedState: string | null;
};

export function HotspotTable({ hotspots, selectedState }: HotspotTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigateToCounty(state: string, county: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("state", state);
    params.set("county", county);
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  if (hotspots.length === 0) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          Boating Accident Hotspots
        </h2>
        <p className="mt-3 text-sm text-slate-gray">
          No hotspot data available for the current filter.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          Boating Accident Hotspots
        </h2>
        <p className="mt-1 text-sm text-slate-gray">
          Top counties by total accidents{selectedState ? ` in ${selectedState}` : " nationwide"}. Click a row to filter.
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
                County
              </th>
              {!selectedState && (
                <th className="py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  State
                </th>
              )}
              <th className="py-2 pr-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
                Accidents
              </th>
              <th className="py-2 pr-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
                Deaths
              </th>
              <th className="py-2 pr-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
                Injuries
              </th>
              <th className="py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
                Fatality Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {hotspots.map((row, index) => {
              const fatalityRate =
                row.total_accidents > 0
                  ? (row.total_deaths / row.total_accidents) * 100
                  : 0;
              const isHighRisk = fatalityRate > 3;

              return (
                <tr
                  key={`${row.state}-${row.county_name}`}
                  onClick={() => navigateToCounty(row.state, row.county_name)}
                  className="cursor-pointer border-b border-midnight-navy/5 transition hover:bg-cloud"
                >
                  <td className="py-2.5 pr-3 font-mono text-xs text-slate-gray">
                    {index + 1}
                  </td>
                  <td className="py-2.5 pr-3 font-medium text-midnight-navy">
                    {row.county_name}
                  </td>
                  {!selectedState && (
                    <td className="py-2.5 pr-3 text-slate-gray">
                      {row.state}
                    </td>
                  )}
                  <td className="py-2.5 pr-3 text-right font-mono font-semibold text-midnight-navy">
                    {row.total_accidents.toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono text-midnight-navy">
                    {row.total_deaths.toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono text-midnight-navy">
                    {row.total_injuries.toLocaleString()}
                  </td>
                  <td
                    className={`py-2.5 text-right font-mono font-semibold ${
                      isHighRisk ? "text-alert" : "text-midnight-navy"
                    }`}
                  >
                    {fatalityRate.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
