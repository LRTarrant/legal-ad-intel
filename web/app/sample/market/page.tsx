import { getMarketHeatmapData } from "@/lib/queries";
import { MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sample: Markets | Legal Marketing Intelligence",
};

type MarketRow = {
  market_name: string;
  state_code: string;
  region: string;
  observation_count: number;
  total_spend: number;
  distinct_advertisers: number;
  distinct_torts: number;
  channel_list: string[];
};

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

function channelLabel(ch: string): string {
  const upper = ch.toUpperCase();
  if (upper === "CTV" || upper === "TV") return upper;
  return ch.charAt(0).toUpperCase() + ch.slice(1);
}

function competitionBadge(advertisers: number) {
  if (advertisers >= 8) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 ring-1 ring-red-200">
        High
      </span>
    );
  }
  if (advertisers >= 4) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
        Medium
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
      Low
    </span>
  );
}

const channelColors: Record<string, string> = {
  tv: "bg-blue-100 text-blue-700 ring-1 ring-blue-200",
  ctv: "bg-purple-100 text-purple-700 ring-1 ring-purple-200",
  digital: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
  radio: "bg-orange-100 text-orange-700 ring-1 ring-orange-200",
  search: "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200",
  social: "bg-pink-100 text-pink-700 ring-1 ring-pink-200",
};

export default async function SampleMarketPage() {
  const [events] = await Promise.all([
    getMarketHeatmapData(),
  ]);

  // Aggregate events by market
  const map = new Map<
    string,
    {
      state_code: string;
      region: string;
      spend: number;
      count: number;
      advertisers: Set<string>;
      torts: Set<string>;
      channels: Set<string>;
    }
  >();

  for (const e of events) {
    let agg = map.get(e.market_name);
    if (!agg) {
      agg = {
        state_code: e.state_code,
        region: e.region,
        spend: 0,
        count: 0,
        advertisers: new Set(),
        torts: new Set(),
        channels: new Set(),
      };
      map.set(e.market_name, agg);
    }
    agg.spend += e.spend_estimate;
    agg.count += 1;
    agg.advertisers.add(e.firm_name);
    agg.torts.add(e.tort_name);
    agg.channels.add(e.channel);
  }

  const markets: MarketRow[] = [];
  for (const [market_name, agg] of map) {
    markets.push({
      market_name,
      state_code: agg.state_code,
      region: agg.region,
      observation_count: agg.count,
      total_spend: agg.spend,
      distinct_advertisers: agg.advertisers.size,
      distinct_torts: agg.torts.size,
      channel_list: Array.from(agg.channels).sort(),
    });
  }

  markets.sort((a, b) => b.total_spend - a.total_spend);
  const topMarkets = markets.slice(0, 10);
  const maxSpend = Math.max(...topMarkets.map((m) => m.total_spend), 1);

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-intelligence-teal/10">
          <MapPin className="h-5 w-5 text-intelligence-teal" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-midnight-navy">
            Markets — Sample View
          </h1>
          <p className="text-sm text-slate-gray">
            Compare markets by demand, competition, and advertising intensity.
            Showing top 10 markets.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
            Markets Shown
          </p>
          <p className="mt-1 text-2xl font-bold text-midnight-navy">
            {topMarkets.length}
          </p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
            Total Observations
          </p>
          <p className="mt-1 text-2xl font-bold text-midnight-navy">
            {formatNumber(topMarkets.reduce((s, m) => s + m.observation_count, 0))}
          </p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
            Total Est. Spend
          </p>
          <p className="mt-1 text-2xl font-bold text-intelligence-teal">
            {formatCurrency(topMarkets.reduce((s, m) => s + m.total_spend, 0))}
          </p>
        </div>
      </div>

      {/* Table */}
      <section className="mt-6 rounded-lg bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-cloud text-left text-xs font-semibold uppercase tracking-wider text-slate-gray">
                <th className="px-4 py-3 w-12 text-center">#</th>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3 text-center">Competition</th>
                <th className="px-4 py-3 text-right min-w-[160px]">Est. Spend</th>
                <th className="px-4 py-3 text-center">Advertisers</th>
                <th className="px-5 py-3">Channels</th>
              </tr>
            </thead>
            <tbody>
              {topMarkets.map((m, idx) => {
                const spendPct = (m.total_spend / maxSpend) * 100;
                return (
                  <tr
                    key={m.market_name}
                    className="border-b border-cloud last:border-0 hover:bg-cloud/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-center text-sm text-slate-gray tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-charcoal">
                        {m.market_name}
                      </div>
                      <div className="text-xs text-slate-gray">{m.state_code}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-steel-blue/10 px-2.5 py-0.5 text-[11px] font-semibold text-steel-blue ring-1 ring-steel-blue/20">
                        {m.region}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {competitionBadge(m.distinct_advertisers)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative">
                        <div
                          className="absolute inset-y-0 left-0 rounded"
                          style={{
                            width: `${spendPct}%`,
                            background:
                              "linear-gradient(90deg, rgba(26,140,150,0.10) 0%, rgba(26,140,150,0.25) 100%)",
                          }}
                        />
                        <span className="relative text-sm font-semibold text-midnight-navy tabular-nums">
                          {formatCurrency(m.total_spend)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-charcoal tabular-nums">
                      {m.distinct_advertisers}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {m.channel_list.map((ch) => (
                          <span
                            key={ch}
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              channelColors[ch] ??
                              "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                            }`}
                          >
                            {channelLabel(ch)}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
