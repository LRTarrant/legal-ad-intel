import {
  getAdSaturationSummary,
  getTorts,
  type AdSaturationRow,
  type Tort,
} from "@/lib/queries";
import { Radio } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ad Saturation | Legal Marketing Intelligence",
};

function fmt(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

function fmtCur(n: number | null): string {
  if (n == null) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtScore(n: number | null): string {
  if (n == null) return "—";
  return n.toFixed(1);
}

function scoreCls(s: number | null): string {
  if (s == null) return "text-zinc-400";
  if (s >= 75) return "text-red-400";
  if (s >= 50) return "text-amber-400";
  if (s >= 25) return "text-yellow-400";
  return "text-emerald-400";
}

function scoreBg(s: number | null): string {
  if (s == null) return "bg-zinc-700";
  if (s >= 75) return "bg-red-500/60";
  if (s >= 50) return "bg-amber-500/60";
  if (s >= 25) return "bg-yellow-500/60";
  return "bg-emerald-500/60";
}

export default async function AdSaturationPage({
  searchParams,
}: {
  searchParams: Promise<{ tort?: string; state?: string }>;
}) {
  const params = await searchParams;
  const tortFilter = params.tort || undefined;
  const stateFilter = params.state || undefined;

  const [allData, torts] = await Promise.all([
    getAdSaturationSummary({ tortSlug: tortFilter, limit: 500 }),
    getTorts(),
  ]);

  const data = stateFilter
    ? allData.filter((d) => d.state_abbr === stateFilter)
    : allData;

  const uniqueGeos = new Set(data.map((d) => d.geo_code)).size;
  const uniqueTorts = new Set(data.map((d) => d.tort_slug)).size;
  const totalObs = data.reduce((s, d) => s + (d.total_observations ?? 0), 0);
  const totalSpend = data.reduce((s, d) => s + (d.estimated_spend ?? 0), 0);
  const avgScore =
    data.filter((d) => d.saturation_score != null).length > 0
      ? data
          .filter((d) => d.saturation_score != null)
          .reduce((s, d) => s + d.saturation_score!, 0) /
        data.filter((d) => d.saturation_score != null).length
      : null;

  const states = Array.from(new Set(allData.map((d) => d.state_abbr).filter(Boolean) as string[])).sort();

  function filterUrl(key: string, val: string | undefined) {
    const p = new URLSearchParams();
    if (key === "tort" && val) p.set("tort", val);
    else if (tortFilter) p.set("tort", tortFilter);
    if (key === "state" && val) p.set("state", val);
    else if (stateFilter) p.set("state", stateFilter);
    const qs = p.toString();
    return `/ad-saturation${qs ? `?${qs}` : ""}`;
  }

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
          geographic markets. Sorted by saturation score (0 = open market,
          100 = highly saturated).
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase text-zinc-500">Tort</span>
          <div className="flex flex-wrap gap-1">
            <Link
              href={filterUrl("tort", undefined)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                !tortFilter
                  ? "border-purple-500 bg-purple-500/20 text-purple-300"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              All
            </Link>
            {torts.map((t) => (
              <Link
                key={t.slug}
                href={filterUrl("tort", t.slug)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  tortFilter === t.slug
                    ? "border-purple-500 bg-purple-500/20 text-purple-300"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase text-zinc-500">State</span>
          <div className="flex flex-wrap gap-1">
            <Link
              href={filterUrl("state", undefined)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                !stateFilter
                  ? "border-purple-500 bg-purple-500/20 text-purple-300"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              All
            </Link>
            {states.map((st) => (
              <Link
                key={st}
                href={filterUrl("state", st)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  stateFilter === st
                    ? "border-purple-500 bg-purple-500/20 text-purple-300"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                {st}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            TORT CATEGORIES
          </p>
          <p className="mt-2 text-2xl font-bold">{uniqueTorts}</p>
          <p className="text-xs text-zinc-500">Active torts</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            MARKETS
          </p>
          <p className="mt-2 text-2xl font-bold">{uniqueGeos}</p>
          <p className="text-xs text-zinc-500">DMAs tracked</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            AD OBSERVATIONS
          </p>
          <p className="mt-2 text-2xl font-bold">{fmt(totalObs)}</p>
          <p className="text-xs text-zinc-500">Placements tracked</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            EST. TOTAL SPEND
          </p>
          <p className="mt-2 text-2xl font-bold">{fmtCur(totalSpend)}</p>
          <p className="text-xs text-zinc-500">Across all markets</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            AVG SATURATION
          </p>
          <p className={`mt-2 text-2xl font-bold ${scoreCls(avgScore)}`}>
            {fmtScore(avgScore)}
          </p>
          <p className="text-xs text-zinc-500">0 = open · 100 = saturated</p>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="text-lg font-semibold">Saturation Rankings</h2>
          <p className="text-sm text-zinc-400">
            {data.length} records
            {tortFilter ? ` · Filtered to ${tortFilter}` : ""}
            {stateFilter ? ` · ${stateFilter}` : ""}
          </p>
        </div>

        {data.length === 0 ? (
          <div className="px-5 py-12 text-center text-zinc-500">
            <Radio className="mx-auto mb-3 h-10 w-10 text-zinc-700" />
            <p className="text-lg font-medium">No data matches current filters</p>
            <p className="mt-1 text-sm">
              Try adjusting the tort or state filters above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3 text-right w-12">#</th>
                  <th className="px-4 py-3">Tort</th>
                  <th className="px-4 py-3">Market</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3 text-right">Advertisers</th>
                  <th className="px-4 py-3 text-right">Creatives</th>
                  <th className="px-4 py-3 text-right">Observations</th>
                  <th className="px-4 py-3 text-right">Est. Spend</th>
                  <th className="px-4 py-3 text-right">Population</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {data.map((row, i) => (
                  <tr key={row.id} className="hover:bg-zinc-800/50">
                    <td className="px-4 py-3 text-right text-zinc-500">
                      {i + 1}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium">
                      {row.tort_label}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {row.geo_name}
                    </td>
                    <td className="px-4 py-3">{row.state_abbr ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className={`h-full rounded-full ${scoreBg(row.saturation_score)}`}
                            style={{ width: `${Math.min(row.saturation_score ?? 0, 100)}%` }}
                          />
                        </div>
                        <span className={`font-semibold tabular-nums ${scoreCls(row.saturation_score)}`}>
                          {fmtScore(row.saturation_score)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.total_advertisers}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.total_creatives}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {fmt(row.total_observations)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {fmtCur(row.estimated_spend)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {fmt(row.geo_population)}
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
