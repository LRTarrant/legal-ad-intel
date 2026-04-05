import { getMarketById } from "@/lib/queries/markets";
import { getAdEvents } from "@/lib/queries/ad-events";
import Link from "next/link";

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

export default async function MarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [market, events] = await Promise.all([
    getMarketById(id),
    getAdEvents({ marketId: id }, 20),
  ]);

  const totalSpend = events.reduce(
    (sum, e) => sum + Number(e.spend_estimate ?? 0),
    0
  );
  const totalImpressions = events.reduce(
    (sum, e) => sum + Number(e.impressions_estimate ?? 0),
    0
  );

  return (
    <>
      <div className="flex items-center gap-2 text-sm text-slate-gray">
        <Link href="/dashboard" className="hover:text-intelligence-teal transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-charcoal">{market.market_name}</span>
      </div>

      <h1 className="mt-2 text-3xl font-bold text-midnight-navy">
        {market.market_name}
      </h1>
      {market.state_code && (
        <p className="mt-1 text-sm text-slate-gray">{market.state_code}</p>
      )}

      {/* Summary Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-gray">Ad Events</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-midnight-navy">
            {formatNumber(events.length)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-gray">Total Spend</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-midnight-navy">
            {formatCurrency(totalSpend)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-gray">Impressions</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-midnight-navy">
            {formatNumber(totalImpressions)}
          </p>
        </div>
      </div>

      {/* Recent Events Table */}
      <section className="mt-8 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-midnight-navy">
          Recent Ad Events
        </h2>
        {events.length === 0 ? (
          <p className="mt-4 text-sm text-slate-gray">No ad events found for this market.</p>
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
                {events.map((event) => (
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
