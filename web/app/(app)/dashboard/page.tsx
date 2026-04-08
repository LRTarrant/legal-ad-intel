import {
  getRecentAdEvents,
  getAdEventCount,
  getTotalSpend,
  getFirmCount,
  getMarketCount,
  getTopFirmsByAdSpend,
  getTopMarketsByAdSpend,
  getSpendByChannel,
} from "@/lib/queries";
import Link from "next/link";
import { AdvertisingInsight } from "../components/advertising-insight";

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
  const [adEventCount, totalSpend, firmCount, marketCount, recentEvents, topFirms, topMarkets, spendByChannel] =
    await Promise.all([
      getAdEventCount(),
      getTotalSpend(),
      getFirmCount(),
      getMarketCount(),
      getRecentAdEvents(10),
      getTopFirmsByAdSpend(5),
      getTopMarketsByAdSpend(5),
      getSpendByChannel(),
    ]);

  const maxChannelSpend = Math.max(...spendByChannel.map((c) => c.total_spend), 1);

  return (
    <>
      <h1 className="text-3xl font-bold text-midnight-navy">Dashboard</h1>

      <AdvertisingInsight>
        <p>
          <strong>Your legal marketing command center.</strong> This dashboard aggregates litigation
          intelligence, accident data, and market demographics to help injury attorneys and mass tort
          firms make data-driven advertising decisions. Each module below surfaces actionable signals —
          from MDL growth trends to county-level fatality hotspots — designed to help you maximize lead
          generation while optimizing your media spend.
        </p>
      </AdvertisingInsight>

      {/* Summary Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Total Ad Events" value={formatNumber(adEventCount)} />
        <SummaryCard title="Total Spend" value={formatCurrency(totalSpend)} />
        <SummaryCard title="Firms Tracked" value={formatNumber(firmCount)} />
        <SummaryCard title="Markets Covered" value={formatNumber(marketCount)} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Top Firms by Spend */}
        <section className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-midnight-navy">
            Top Firms by Ad Spend
          </h2>
          {topFirms.length === 0 ? (
            <p className="mt-4 text-sm text-slate-gray">No firm data available.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {topFirms.map((firm, i) => (
                <li key={firm.firm_id} className="flex items-center justify-between">
                  <span className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-intelligence-teal/10 text-xs font-semibold text-intelligence-teal">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-charcoal">
                      {firm.firm_name}
                    </span>
                  </span>
                  <span className="text-sm font-[family-name:var(--font-mono)] text-slate-gray">
                    {formatCurrency(firm.total_spend)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Top Markets by Spend */}
        <section className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-midnight-navy">
            Top Markets by Ad Spend
          </h2>
          {topMarkets.length === 0 ? (
            <p className="mt-4 text-sm text-slate-gray">No market data available.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {topMarkets.map((market, i) => (
                <li key={market.market_id} className="flex items-center justify-between">
                  <span className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-intelligence-teal/10 text-xs font-semibold text-intelligence-teal">
                      {i + 1}
                    </span>
                    <Link
                      href={`/markets/${market.market_id}`}
                      className="text-sm font-medium text-charcoal hover:text-intelligence-teal transition-colors"
                    >
                      {market.market_name}
                    </Link>
                  </span>
                  <span className="text-sm font-[family-name:var(--font-mono)] text-slate-gray">
                    {formatCurrency(market.total_spend)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* Spend by Channel */}
      <section className="mt-8 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-midnight-navy">
          Spend by Channel
        </h2>
        {spendByChannel.length === 0 ? (
          <p className="mt-4 text-sm text-slate-gray">No channel data available.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {spendByChannel
              .sort((a, b) => b.total_spend - a.total_spend)
              .map((ch) => (
                <div key={ch.channel ?? "unknown"} className="flex items-center gap-4">
                  <span className="w-28 shrink-0 text-sm font-medium text-charcoal">
                    {ch.channel ?? "Unknown"}
                  </span>
                  <div className="flex-1 h-5 rounded-full bg-cloud overflow-hidden">
                    <div
                      className="h-full rounded-full bg-intelligence-teal transition-all"
                      style={{ width: `${(ch.total_spend / maxChannelSpend) * 100}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-sm font-[family-name:var(--font-mono)] text-slate-gray">
                    {formatCurrency(ch.total_spend)}
                  </span>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Recent Ad Events */}
      <section className="mt-8 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-midnight-navy">
          Recent Ad Events
        </h2>
        {recentEvents.length === 0 ? (
          <p className="mt-4 text-sm text-slate-gray">No ad events found.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-cloud text-left text-slate-gray">
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 font-medium">Source</th>
                  <th className="pb-2 pr-4 font-medium">Channel</th>
                  <th className="pb-2 pr-4 font-medium">Campaign</th>
                  <th className="pb-2 pr-4 text-right font-medium">Spend</th>
                  <th className="pb-2 text-right font-medium">Impressions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cloud">
                {recentEvents.map((event) => (
                  <tr key={event.id} className="text-charcoal">
                    <td className="py-2.5 pr-4">{event.event_date}</td>
                    <td className="py-2.5 pr-4">{event.source}</td>
                    <td className="py-2.5 pr-4">{event.channel ?? "—"}</td>
                    <td className="py-2.5 pr-4">{event.campaign_name ?? "—"}</td>
                    <td className="py-2.5 pr-4 text-right font-[family-name:var(--font-mono)]">
                      {event.spend_estimate != null
                        ? formatCurrency(Number(event.spend_estimate))
                        : "—"}
                    </td>
                    <td className="py-2.5 text-right font-[family-name:var(--font-mono)]">
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
    </>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-gray">{title}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-midnight-navy">
        {value}
      </p>
    </div>
  );
}
