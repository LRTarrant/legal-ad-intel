import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type AdEvent = Database["public"]["Tables"]["ad_events"]["Row"];
type Firm = Database["public"]["Tables"]["firms"]["Row"];
type Market = Database["public"]["Tables"]["markets"]["Row"];
type MassTort = Database["public"]["Tables"]["mass_torts"]["Row"];

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getDashboardData() {
  const countsRes = await supabase
    .from("ad_events")
    .select("*", { count: "exact", head: true });
  const adEventCount = countsRes.count ?? 0;

  const firmCountRes = await supabase
    .from("firms")
    .select("*", { count: "exact", head: true });
  const firmCount = firmCountRes.count ?? 0;

  const marketCountRes = await supabase
    .from("markets")
    .select("*", { count: "exact", head: true });
  const marketCount = marketCountRes.count ?? 0;

  const { data: recentEventsRaw } = await supabase
    .from("ad_events")
    .select("*")
    .order("event_date", { ascending: false })
    .limit(20);
  const recentEvents: AdEvent[] = recentEventsRaw ?? [];

  const { data: allEventsRaw } = await supabase
    .from("ad_events")
    .select("*");
  const allEvents: AdEvent[] = allEventsRaw ?? [];

  const { data: firmsRaw } = await supabase.from("firms").select("*");
  const firms: Firm[] = firmsRaw ?? [];

  const { data: marketsRaw } = await supabase.from("markets").select("*");
  const mkts: Market[] = marketsRaw ?? [];

  const { data: tortsRaw } = await supabase.from("mass_torts").select("*");
  const torts: MassTort[] = tortsRaw ?? [];

  const totalSpend = allEvents.reduce(
    (sum, r) => sum + (r.spend_estimate ?? 0),
    0,
  );

  // Build lookup maps
  const firmMap = new Map(firms.map((f) => [f.id, f.name]));
  const marketMap = new Map(mkts.map((m) => [m.id, m.market_name]));
  const tortMap = new Map(torts.map((t) => [t.id, t.name]));

  // Top firms by spend
  const spendByFirm = new Map<string, number>();
  for (const row of allEvents) {
    if (!row.firm_id) continue;
    spendByFirm.set(
      row.firm_id,
      (spendByFirm.get(row.firm_id) ?? 0) + (row.spend_estimate ?? 0),
    );
  }
  const topFirms = Array.from(spendByFirm.entries())
    .map(([id, total]) => ({ name: firmMap.get(id) ?? "Unknown", total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Top markets by spend
  const spendByMarket = new Map<string, number>();
  for (const row of allEvents) {
    if (!row.market_id) continue;
    spendByMarket.set(
      row.market_id,
      (spendByMarket.get(row.market_id) ?? 0) + (row.spend_estimate ?? 0),
    );
  }
  const topMarkets = Array.from(spendByMarket.entries())
    .map(([id, total]) => ({
      name: marketMap.get(id) ?? "Unknown",
      total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Spend by channel
  const spendByChannel = new Map<string, number>();
  for (const row of allEvents) {
    const ch = row.channel ?? "Unknown";
    spendByChannel.set(
      ch,
      (spendByChannel.get(ch) ?? 0) + (row.spend_estimate ?? 0),
    );
  }
  const channelBreakdown = Array.from(spendByChannel.entries())
    .map(([channel, total]) => ({ channel, total }))
    .sort((a, b) => b.total - a.total);

  // Enrich recent events
  const enrichedRecent = recentEvents.map((e) => ({
    id: e.id,
    event_date: e.event_date,
    channel: e.channel,
    spend_estimate: e.spend_estimate,
    firmName: e.firm_id ? (firmMap.get(e.firm_id) ?? "Unknown") : "\u2014",
    marketName: e.market_id
      ? (marketMap.get(e.market_id) ?? "Unknown")
      : "\u2014",
    tortName: e.mass_tort_id
      ? (tortMap.get(e.mass_tort_id) ?? "\u2014")
      : "\u2014",
  }));

  return {
    adEventCount,
    totalSpend,
    firmCount,
    marketCount,
    recentEvents: enrichedRecent,
    topFirms,
    topMarkets,
    channelBreakdown,
  };
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <main className="min-h-screen bg-gray-50 p-6 lg:p-10">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">
        Legal Ad Intelligence Dashboard
      </h1>

      {/* Summary cards */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total Ad Events"
          value={data.adEventCount.toLocaleString()}
        />
        <SummaryCard
          label="Total Spend"
          value={formatCurrency(data.totalSpend)}
        />
        <SummaryCard
          label="Active Firms"
          value={data.firmCount.toLocaleString()}
        />
        <SummaryCard
          label="Active Markets"
          value={data.marketCount.toLocaleString()}
        />
      </div>

      {/* Recent ad events */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">
          Recent Ad Events
        </h2>
        {data.recentEvents.length === 0 ? (
          <p className="text-sm text-gray-500">No ad events found.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Firm</th>
                  <th className="px-4 py-3">Market</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Tort / Topic</th>
                  <th className="px-4 py-3 text-right">Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.recentEvents.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                      {formatDate(e.event_date)}
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {e.firmName}
                    </td>
                    <td className="px-4 py-2 text-gray-700">{e.marketName}</td>
                    <td className="px-4 py-2">
                      <span className="inline-block rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {e.channel ?? "\u2014"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600">{e.tortName}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-right font-medium text-gray-900">
                      {e.spend_estimate != null
                        ? formatCurrency(e.spend_estimate)
                        : "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Bottom grid: Top Firms, Top Markets, Channel breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top Firms */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Top Firms by Spend
          </h2>
          {data.topFirms.length === 0 ? (
            <p className="text-sm text-gray-500">No data available.</p>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Firm</th>
                    <th className="px-4 py-3 text-right">Total Spend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.topFirms.map((f, i) => (
                    <tr key={f.name} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-2 font-medium text-gray-900">
                        {f.name}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-900">
                        {formatCurrency(f.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Top Markets */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Top Markets by Spend
          </h2>
          {data.topMarkets.length === 0 ? (
            <p className="text-sm text-gray-500">No data available.</p>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Market</th>
                    <th className="px-4 py-3 text-right">Total Spend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.topMarkets.map((m, i) => (
                    <tr key={m.name} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-2 font-medium text-gray-900">
                        {m.name}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-900">
                        {formatCurrency(m.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Spend by Channel */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Spend by Channel
          </h2>
          {data.channelBreakdown.length === 0 ? (
            <p className="text-sm text-gray-500">No data available.</p>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3 text-right">Total Spend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.channelBreakdown.map((c) => (
                    <tr key={c.channel} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <span className="inline-block rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {c.channel}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900">
                        {formatCurrency(c.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Summary card component
// ---------------------------------------------------------------------------

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
