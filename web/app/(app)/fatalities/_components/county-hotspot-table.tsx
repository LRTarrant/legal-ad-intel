import type { FarsCountyHotspot } from "@/lib/queries";

type CountyHotspotTableProps = {
  hotspots: FarsCountyHotspot[];
  selectedState: string;
};

function cleanCountyName(name: string): string {
  return name.replace(/\s*\(\d+\)$/, "");
}

export function CountyHotspotTable({
  hotspots,
  selectedState,
}: CountyHotspotTableProps) {
  if (hotspots.length === 0) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          County Hotspots
        </h2>
        <p className="mt-3 text-sm text-slate-gray">
          No county hotspot data available for {selectedState}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="font-heading text-xl font-semibold text-midnight-navy">
          County Hotspots
        </h2>
        <p className="mt-1 text-sm text-slate-gray">
          Top counties by fatal crashes in {selectedState}
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
              <th className="py-2 pr-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
                Fatal Crashes
              </th>
              <th className="py-2 pr-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
                Fatalities
              </th>
              <th className="py-2 pr-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
                Drunk %
              </th>
              <th className="py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
                Avg Fatalities/Crash
              </th>
            </tr>
          </thead>
          <tbody>
            {hotspots.map((row, index) => (
              <tr
                key={`${row.state}-${row.county_fips}`}
                className="border-b border-midnight-navy/5 transition hover:bg-cloud"
              >
                <td className="py-2.5 pr-3 font-mono text-xs text-slate-gray">
                  {index + 1}
                </td>
                <td className="py-2.5 pr-3 font-medium text-midnight-navy">
                  {cleanCountyName(row.county_name)}
                </td>
                <td className="py-2.5 pr-3 text-right font-mono font-semibold text-midnight-navy">
                  {row.total_crashes.toLocaleString()}
                </td>
                <td className="py-2.5 pr-3 text-right font-mono text-midnight-navy">
                  {row.total_fatalities.toLocaleString()}
                </td>
                <td className="py-2.5 pr-3 text-right font-mono text-warning-amber">
                  {row.pct_drunk.toFixed(1)}%
                </td>
                <td className="py-2.5 text-right font-mono text-midnight-navy">
                  {row.avg_fatalities_per_crash.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
