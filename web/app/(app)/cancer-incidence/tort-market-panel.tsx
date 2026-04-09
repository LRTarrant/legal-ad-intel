import { AdvertisingInsight } from "../components/advertising-insight";
import { NATIONAL_AVERAGES, type TortConfig } from "./tort-data";
import type { CancerStateSummary } from "@/lib/queries";

interface TortMarketPanelProps {
  tort: TortConfig;
  stateData: CancerStateSummary[];
}

interface RankedState {
  rank: number;
  state: string;
  cancerSite: string;
  rate: number;
  vsNationalAvg: number;
  exposureSignal: string;
}

export function TortMarketPanel({ tort, stateData }: TortMarketPanelProps) {
  // For multi-site torts, we need per-site state data.
  // stateData is already aggregated by state across all tort sites.
  // We compute vs_national_avg using the first (or only) cancer site's national avg.
  // For multi-site torts, use the average of national averages as baseline.
  const nationalAvg =
    tort.cancerSites.length === 1
      ? NATIONAL_AVERAGES[tort.cancerSites[0]] ?? 0
      : tort.cancerSites.reduce(
          (sum, site) => sum + (NATIONAL_AVERAGES[site] ?? 0),
          0
        ) / tort.cancerSites.length;

  const ranked: RankedState[] = [...stateData]
    .sort((a, b) => b.average_incidence_rate - a.average_incidence_rate)
    .slice(0, 10)
    .map((row, i) => {
      const pctDiff =
        nationalAvg > 0
          ? ((row.average_incidence_rate - nationalAvg) / nationalAvg) * 100
          : 0;
      return {
        rank: i + 1,
        state: row.state,
        cancerSite: tort.cancerSites.join(", "),
        rate: row.average_incidence_rate,
        vsNationalAvg: Math.round(pctDiff * 10) / 10,
        exposureSignal:
          tort.stateExposureSignals[row.state] ?? tort.defaultExposureSignal,
      };
    });

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2
          className="font-heading text-lg font-bold text-midnight-navy"
        >
          <span className="mr-1">&#127919;</span>
          {tort.shortLabel} — Top Markets by Cancer Incidence
        </h2>
        <p className="mt-1 text-sm text-slate-gray">
          Ranked by incidence rate above national average ({nationalAvg.toFixed(1)} per 100K)
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-cloud text-xs uppercase text-slate-gray">
              <th className="py-2 pr-3">#</th>
              <th className="py-2 pr-4">State</th>
              <th className="py-2 pr-4">Cancer Site</th>
              <th className="py-2 pr-4 text-right">Rate per 100K</th>
              <th className="py-2 pr-4 text-right">vs National Avg</th>
              <th className="py-2">Exposure Signal</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((row) => (
              <tr
                key={row.state}
                className="border-b border-cloud last:border-0"
              >
                <td className="py-3 pr-3 font-mono text-slate-gray">
                  {row.rank}
                </td>
                <td className="py-3 pr-4 font-mono font-semibold text-intelligence-teal">
                  {row.state}
                </td>
                <td className="py-3 pr-4">
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{
                      background: tort.color + "15",
                      color: tort.color,
                    }}
                  >
                    {row.cancerSite.length > 30
                      ? row.cancerSite.slice(0, 28) + "..."
                      : row.cancerSite}
                  </span>
                </td>
                <td className="py-3 pr-4 text-right font-mono">
                  {row.rate.toFixed(1)}
                </td>
                <td
                  className="py-3 pr-4 text-right font-mono font-semibold"
                  style={{
                    color: row.vsNationalAvg >= 0 ? "#10B981" : "#EF4444",
                  }}
                >
                  {row.vsNationalAvg >= 0 ? "+" : ""}
                  {row.vsNationalAvg.toFixed(1)}%
                </td>
                <td
                  className="py-3 text-xs text-slate-gray max-w-[280px]"
                  title={row.exposureSignal}
                >
                  {row.exposureSignal.length > 80
                    ? row.exposureSignal.slice(0, 77) + "..."
                    : row.exposureSignal}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5">
        <AdvertisingInsight>
          <p>{tort.marketInsight}</p>
        </AdvertisingInsight>
      </div>
    </div>
  );
}
