import { Suspense } from "react";
import Link from "next/link";
import {
  getAdEventCount,
  getTotalSpend,
  getRecentAdEvents,
  getSpendByChannel,
  getDistinctChannels,
} from "@/lib/queries/ad-events";
import { getActiveFirmCount, getTopFirmsBySpend } from "@/lib/queries/firms";
import {
  getMarkets,
  getActiveMarketCount,
  getTopMarketsBySpend,
} from "@/lib/queries/markets";
import { getMassTorts } from "@/lib/queries/mass-torts";
import type { DashboardFilters } from "@/lib/queries/types";
import FilterBar from "./filter-bar";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const filters: DashboardFilters = {};
  if (typeof params.channel === "string") filters.channel = params.channel;
  if (typeof params.marketId === "string") filters.marketId = params.marketId;
  if (typeof params.massTortId === "string")
    filters.massTortId = params.massTortId;
  if (typeof params.dateFrom === "string") filters.dateFrom = params.dateFrom;
  if (typeof params.dateTo === "string") filters.dateTo = params.dateTo;

  const hasFilters = Object.keys(filters).length > 0;

  const [
    adEventCount,
    totalSpend,
    firmCount,
    marketCount,
    recentEvents,
    topFirms,
    topMarkets,
    spendByChannel,
    channels,
    markets,
    massTorts,
  ] = await Promise.all([
    getAdEventCount(filters),
    getTotalSpend(filters),
    getActiveFirmCount(filters),
    getActiveMarketCount(filters),
    getRecentAdEvents(20, filters),
    getTopFirmsBySpend(10, filters),
    getTopMarketsBySpend(10, filters),
    getSpendByChannel(filters),
    getDistinctChannels(),
    getMarkets(),
    getMassTorts(),
  ]);

  const filterLabels: string[] = [];
  if (filters.channel) filterLabels.push(filters.channel);
  if (filters.marketId) {
    const m = markets.find((mk) => mk.id === filters.marketId);
    if (m) filterLabels.push(m.market_name);
  }
  if (filters.massTortId) {
    const t = massTorts.find((mt) => mt.id === filters.massTortId);
    if (t) filterLabels.push(t.name);
  }
  if (filters.dateFrom) filterLabels.push(`from ${filters.dateFrom}`);
  if (filters.dateTo) filterLabels.push(`to ${filters.dateTo}`);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Legal Ad Intel</h1>
          <p className="text-sm text-gray-500 mt-1">
            Advertising intelligence dashboard
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Filter Bar */}
        <Suspense
          fallback={
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-16 animate-pulse" />
          }
        >
          <FilterBar
            channels={channels}
            markets={markets.map((m) => ({
              id: m.id,
              name: m.market_name,
            }))}
            massTorts={massTorts.map((t) => ({ id: t.id, name: t.name }))}
          />
        </Suspense>

        {/* Active filter context */}
        {hasFilters && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
              Filtered
            </span>
            <span>Showing results for: {filterLabels.join(" \u00b7 ")}</span>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            label="Total Ad Events"
            value={adEventCount.toLocaleString()}
          />
          <SummaryCard label="Total Spend" value={formatCurrency(totalSpend)} />
          <SummaryCard
            label="Active Firms"
            value={firmCount.toLocaleString()}
          />
          <SummaryCard
            label="Active Markets"
            value={marketCount.toLocaleString()}
          />
        </div>

        {/* Middle Row: Top Firms + Top Markets + Spend by Channel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Firms */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Top Firms by Spend
            </h2>
            {topFirms.length === 0 ? (
              <p className="text-gray-500 text-sm">No data available</p>
            ) : (
              <ol className="space-y-3">
                {topFirms.map((firm, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 truncate pr-2">
                      <span className="text-gray-400 font-mono mr-2 w-5 inline-block text-right">
                        {i + 1}.
                      </span>
                      {firm.name}
                    </span>
                    <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                      {formatCurrency(firm.total)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Top Markets */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Top Markets by Spend
            </h2>
            {topMarkets.length === 0 ? (
              <p className="text-gray-500 text-sm">No data available</p>
            ) : (
              <ol className="space-y-3">
                {topMarkets.map((market, i) => (
                  <li
                    key={market.id}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm truncate pr-2">
                      <span className="text-gray-400 font-mono mr-2 w-5 inline-block text-right">
                        {i + 1}.
                      </span>
                      <Link
                        href={`/markets/${market.id}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {market.name}
                      </Link>
                    </span>
                    <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                      {formatCurrency(market.total)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Spend by Channel */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Spend by Channel
            </h2>
            {spendByChannel.length === 0 ? (
              <p className="text-gray-500 text-sm">No data available</p>
            ) : (
              <div className="space-y-3">
                {spendByChannel.map((ch) => {
                  const maxSpend = spendByChannel[0]?.total ?? 1;
                  const pct = Math.round((ch.total / maxSpend) * 100);
                  return (
                    <div key={ch.channel}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 uppercase font-medium">
                          {ch.channel}
                        </span>
                        <span className="text-gray-900 font-medium">
                          {formatCurrency(ch.total)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Ad Events Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Ad Events
            </h2>
          </div>
          {recentEvents.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500 text-sm">
              No ad events found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Firm
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Market
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Channel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tort / Topic
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Spend
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                        {formatDate(evt.event_date)}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {evt.firm_name}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                        {evt.market_name}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 uppercase">
                        {evt.channel ?? "\u2014"}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                        {evt.mass_tort_name ?? "\u2014"}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 font-medium text-right">
                        {evt.spend_estimate
                          ? formatCurrency(Number(evt.spend_estimate))
                          : "\u2014"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
