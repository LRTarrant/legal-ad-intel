import {
  getRecentAdEvents,
  getAdEventCount,
  getTotalSpend,
  getFirmCount,
  getMarketCount,
  getTopFirmsByAdSpend,
  getTopMarketsByAdSpend,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export default async function DashboardPage() {
  const [adEventCount, totalSpend, firmCount, marketCount, recentEvents, topFirms, topMarkets] =
    await Promise.all([
      getAdEventCount(),
      getTotalSpend(),
      getFirmCount(),
      getMarketCount(),
      getRecentAdEvents(10),
      getTopFirmsByAdSpend(5),
      getTopMarketsByAdSpend(5),
    ]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Legal Ad Intelligence Dashboard
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard title="Total Ad Events" value={formatNumber(adEventCount)} />
          <SummaryCard title="Total Spend" value={formatCurrency(totalSpend)} />
          <SummaryCard title="Firms Tracked" value={formatNumber(firmCount)} />
          <SummaryCard title="Markets Covered" value={formatNumber(marketCount)} />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Top Firms by Spend */}
          <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Top Firms by Ad Spend
            </h2>
            {topFirms.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">No firm data available.</p>
            ) : (
              <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
                {topFirms.map((firm) => (
                  <li key={firm.firm_id} className="flex items-center justify-between py-3">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {firm.firm_name}
                    </span>
                    <span className="text-sm text-zinc-500">
                      {formatCurrency(firm.total_spend)} ({firm.event_count} events)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Top Markets by Spend */}
          <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Top Markets by Ad Spend
            </h2>
            {topMarkets.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">No market data available.</p>
            ) : (
              <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
                {topMarkets.map((market) => (
                  <li key={market.market_id} className="flex items-center justify-between py-3">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {market.market_name}
                    </span>
                    <span className="text-sm text-zinc-500">
                      {formatCurrency(market.total_spend)} ({market.event_count} events)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Recent Ad Events */}
        <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Recent Ad Events
          </h2>
          {recentEvents.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">No ad events found.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-700">
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 pr-4 font-medium">Source</th>
                    <th className="pb-2 pr-4 font-medium">Channel</th>
                    <th className="pb-2 pr-4 font-medium">Campaign</th>
                    <th className="pb-2 pr-4 text-right font-medium">Spend</th>
                    <th className="pb-2 text-right font-medium">Impressions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {recentEvents.map((event) => (
                    <tr key={event.id} className="text-zinc-700 dark:text-zinc-300">
                      <td className="py-2 pr-4">{event.event_date}</td>
                      <td className="py-2 pr-4">{event.source}</td>
                      <td className="py-2 pr-4">{event.channel ?? "—"}</td>
                      <td className="py-2 pr-4">{event.campaign_name ?? "—"}</td>
                      <td className="py-2 pr-4 text-right">
                        {event.spend_estimate != null
                          ? formatCurrency(Number(event.spend_estimate))
                          : "—"}
                      </td>
                      <td className="py-2 text-right">
                        {event.impressions_estimate != null
                          ? formatNumber(Number(event.impressions_estimate))
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm font-medium text-zinc-500">{title}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
    </div>
  );
}
