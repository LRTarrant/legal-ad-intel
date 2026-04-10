import {
  getAdSaturationSummary,
  getAdSaturationKpis,
  getTorts,
  type AdSaturationRow,
} from "@/lib/queries";
import { Radio } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ad Saturation | Legal Marketing Intelligence",
};

function formatNumber(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString();
}

function formatCurrency(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString()}`;
}

function formatScore(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return n.toFixed(1);
}

function scoreColor(score: number | null): string {
  if (score === null || score === undefined) return "text-zinc-400";
  if (score >= 75) return "text-red-400";
  if (score >= 50) return "text-amber-400";
  if (score >= 25) return "text-yellow-400";
  return "text-emerald-400";
}

export default async function AdSaturationPage() {
  const [data, kpis, torts] = await Promise.all([
    getAdSaturationSummary({ limit: 500 }),
    getAdSaturationKpis(),
    getTorts(),
  ]);

  const uniqueGeos = new Set(data.map((d) => d.geo_code)).size;
  const uniqueTorts = new Set(data.map((d) => d.tort_slug)).size;
  const totalObs = data.reduce((s, d) => s + (d.total_observations ?? 0), 0);
  const avgScore =
    data.filter((d) => d.saturation_score != null).length > 0
      ? data
          .filter((d) => d.saturation_score != null)
          .reduce((s, d) => s + d.saturation_score!, 0) /
        data.filter((d) => d.saturation_score != null).length
      : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Radio className="h-6 w-6 text-purple-400" />
          Ad Saturation
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Competitive ad saturation analysis across tort categories and
          geographic markets. Measures advertiser density, creative volume,
          estimated spend, and overall market saturation scores.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            TORT CATEGORIES
          </p>
          <p className="mt-2 text-2xl font-bold">{uniqueTorts || kpis.totalTorts}</p>
          <p className="text-xs text-zinc-500">Tracked torts</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            GEOGRAPHIC MARKETS
          </p>
          <p className="mt-2 text-2xl font-bold">{uniqueGeos || kpis.totalGeos}</p>
          <p className="text-xs text-zinc-500">DMAs & states</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            TOTAL OBSERVATIONS
          </p>
          <p className="mt-2 text-2xl font-bold">
            {formatNumber(totalObs || kpis.totalObservations)}
          </p>
          <p className="text-xs text-zinc-500">Ad placements tracked</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            AVG SATURATION SCORE
          </p>
          <p className={`mt-2 text-2xl font-bold ${scoreColor(avgScore ?? kpis.avgScore)}`}>
            {formatScore(avgScore ?? kpis.avgScore)}
          </p>
          <p className="text-xs text-zinc-500">0 = open, 100 = saturated</p>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="text-lg font-semibold">Ad Saturation Overview</h2>
          <p className="text-sm text-zinc-400">
            Sorted by saturation score. Showing {data.length} records.
          </p>
        </div>

        {data.length === 0 ? (
          <div className="px-5 py-12 text-center text-zinc-500">
            <Radio className="mx-auto mb-3 h-10 w-10 text-zinc-700" />
            <p className="text-lg font-medium">No saturation data yet</p>
            <p className="mt-1 text-sm">
              Ad saturation scores will appear here once the data pipeline
              populates the ad_saturation_scores table.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Tort</th>
                  <th className="px-4 py-3">Market</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3 text-right">Population</th>
                  <th className="px-4 py-3 text-right">Advertisers</th>
                  <th className="px-4 py-3 text-right">Creatives</th>
                  <th className="px-4 py-3 text-right">Est. Spend</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3 text-right">Rank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {data.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-800/50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium">
                      {row.tort_label}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {row.geo_name}
                    </td>
                    <td className="px-4 py-3">{row.state_abbr ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {formatNumber(row.geo_population)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.total_advertisers}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.total_creatives}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(row.estimated_spend)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${scoreColor(
                        row.saturation_score
                      )}`}
                    >
                      {formatScore(row.saturation_score)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.spend_rank ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
