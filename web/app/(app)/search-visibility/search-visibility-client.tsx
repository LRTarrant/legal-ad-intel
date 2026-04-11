"use client";

import { useMemo, useState, useTransition } from "react";
import type { SerpVisibilityRow } from "@/lib/queries/serp-visibility";
import type { Tort } from "@/lib/queries/ad-saturation";

function fmt(n: number | null): string {
  if (n == null) return "\u2014";
  return n.toLocaleString();
}

function fmtScore(n: number | null): string {
  if (n == null) return "\u2014";
  return n.toFixed(2);
}

function scoreCls(s: number | null): string {
  if (s == null) return "text-zinc-400";
  if (s >= 10) return "text-emerald-400";
  if (s >= 5) return "text-blue-400";
  if (s >= 2) return "text-amber-400";
  return "text-zinc-300";
}

function posCls(p: number | null): string {
  if (p == null) return "text-zinc-400";
  if (p <= 3) return "text-emerald-400";
  if (p <= 10) return "text-blue-400";
  if (p <= 20) return "text-amber-400";
  return "text-zinc-400";
}

export function SearchVisibilityClient({
  data,
  torts,
}: {
  data: SerpVisibilityRow[];
  torts: Tort[];
}) {
  const [selectedTort, setSelectedTort] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      data.filter(
        (d) => !selectedTort || d.tort_slug === selectedTort
      ),
    [data, selectedTort]
  );

  const totals = useMemo(() => {
    return {
      domains: new Set(filtered.map((d) => d.domain)).size,
      organic: filtered.reduce((s, d) => s + d.organic_appearances, 0),
      paid: filtered.reduce((s, d) => s + d.paid_appearances, 0),
      snippets: filtered.reduce((s, d) => s + d.featured_snippet_count, 0),
    };
  }, [filtered]);

  return (
    <div className="space-y-8">
      {/* Tort filter */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase text-zinc-500">
            Tort
          </span>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => startTransition(() => setSelectedTort(null))}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                !selectedTort
                  ? "border-blue-500 bg-blue-500/20 text-blue-300"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              All
            </button>
            {torts.map((t) => (
              <button
                key={t.slug}
                type="button"
                onClick={() =>
                  startTransition(() => setSelectedTort(t.slug))
                }
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  selectedTort === t.slug
                    ? "border-blue-500 bg-blue-500/20 text-blue-300"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isPending && (
        <div className="h-1 w-full animate-pulse rounded-full bg-zinc-700" />
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs font-medium uppercase text-zinc-500">
            Domains Tracked
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {fmt(totals.domains)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs font-medium uppercase text-zinc-500">
            Organic Hits
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-400">
            {fmt(totals.organic)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs font-medium uppercase text-zinc-500">
            Paid Hits
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-amber-400">
            {fmt(totals.paid)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs font-medium uppercase text-zinc-500">
            Featured Snippets
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-blue-400">
            {fmt(totals.snippets)}
          </p>
        </div>
      </div>

      {/* Visibility rankings table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="text-lg font-semibold">
            Domain Visibility Rankings
          </h2>
          <p className="text-sm text-zinc-400">
            {filtered.length} domain/tort combinations
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-100">
            <thead className="border-b border-zinc-800 text-xs uppercase text-zinc-300">
              <tr>
                <th className="w-12 px-4 py-3 text-right">#</th>
                <th className="px-4 py-3">Domain</th>
                <th className="px-4 py-3">Advertiser</th>
                <th className="px-4 py-3">Tort</th>
                <th className="px-4 py-3 text-right">Score</th>
                <th className="px-4 py-3 text-right">Avg Pos</th>
                <th className="px-4 py-3 text-right">Organic</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Top 3</th>
                <th className="px-4 py-3 text-right">Top 10</th>
                <th className="px-4 py-3 text-right">Queries</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700/50">
              {filtered.map((row, i) => (
                <tr
                  key={`${row.domain}-${row.tort_slug}`}
                  className="hover:bg-zinc-800/50"
                >
                  <td className="px-4 py-3 text-right text-zinc-400">
                    {i + 1}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-50">
                    {row.domain}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {row.advertiser_name ?? "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {row.tort_slug}
                  </td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums font-semibold ${scoreCls(
                      row.visibility_score
                    )}`}
                  >
                    {fmtScore(row.visibility_score)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums ${posCls(
                      row.avg_position
                    )}`}
                  >
                    {row.avg_position != null
                      ? row.avg_position.toFixed(1)
                      : "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
                    {fmt(row.organic_appearances)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
                    {fmt(row.paid_appearances)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
                    {fmt(row.top_3_count)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
                    {fmt(row.top_10_count)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
                    {fmt(row.queries_tracked)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-zinc-400"
                    colSpan={11}
                  >
                    No SERP visibility data for this selection. Run the
                    serp_intel_daily pipeline to populate data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
