"use client";

import { useState, useMemo } from "react";
import type { MarketAdEvent, MarketFilters } from "@/lib/queries";
import { MethodologySources } from "../../components/methodology-sources";

type MarketRow = {
  market_name: string;
  state_code: string;
  region: string;
  observation_count: number;
  total_spend: number;
  total_impressions: number;
  total_reach: number;
  distinct_advertisers: number;
  distinct_torts: number;
  distinct_channels: number;
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

const channelColors: Record<string, string> = {
  tv: "bg-blue-100 text-blue-700 ring-1 ring-blue-200",
  ctv: "bg-purple-100 text-purple-700 ring-1 ring-purple-200",
  digital: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
  radio: "bg-orange-100 text-orange-700 ring-1 ring-orange-200",
  search: "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200",
  social: "bg-pink-100 text-pink-700 ring-1 ring-pink-200",
};

function aggregateByMarket(events: MarketAdEvent[]): MarketRow[] {
  const map = new Map<string, {
    state_code: string;
    region: string;
    spend: number;
    impressions: number;
    reach: number;
    count: number;
    advertisers: Set<string>;
    torts: Set<string>;
    channels: Set<string>;
  }>();

  for (const e of events) {
    let agg = map.get(e.market_name);
    if (!agg) {
      agg = {
        state_code: e.state_code,
        region: e.region,
        spend: 0,
        impressions: 0,
        reach: 0,
        count: 0,
        advertisers: new Set(),
        torts: new Set(),
        channels: new Set(),
      };
      map.set(e.market_name, agg);
    }
    agg.spend += e.spend_estimate;
    agg.impressions += e.impressions_estimate;
    agg.reach += e.estimated_reach;
    agg.count += 1;
    agg.advertisers.add(e.firm_name);
    agg.torts.add(e.tort_name);
    agg.channels.add(e.channel);
  }

  const rows: MarketRow[] = [];
  for (const [market_name, agg] of map) {
    rows.push({
      market_name,
      state_code: agg.state_code,
      region: agg.region,
      observation_count: agg.count,
      total_spend: agg.spend,
      total_impressions: agg.impressions,
      total_reach: agg.reach,
      distinct_advertisers: agg.advertisers.size,
      distinct_torts: agg.torts.size,
      distinct_channels: agg.channels.size,
      channel_list: Array.from(agg.channels).sort(),
    });
  }

  rows.sort((a, b) => b.total_spend - a.total_spend);
  return rows;
}

export function MarketsClient({
  events,
  filters,
}: {
  events: MarketAdEvent[];
  filters: MarketFilters;
}) {
  const [tortFilter, setTortFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [advertiserFilter, setAdvertiserFilter] = useState("");

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (tortFilter && e.tort_name !== tortFilter) return false;
      if (channelFilter && e.channel !== channelFilter) return false;
      if (advertiserFilter && e.firm_name !== advertiserFilter) return false;
      return true;
    });
  }, [events, tortFilter, channelFilter, advertiserFilter]);

  const markets = useMemo(() => aggregateByMarket(filteredEvents), [filteredEvents]);

  const maxSpend = useMemo(
    () => Math.max(...markets.map((m) => m.total_spend), 1),
    [markets]
  );

  const totalMarkets = markets.length;
  const totalObservations = markets.reduce((s, m) => s + m.observation_count, 0);
  const totalSpend = markets.reduce((s, m) => s + m.total_spend, 0);
  const avgSpend = totalMarkets > 0 ? totalSpend / totalMarkets : 0;

  const hasFilters = tortFilter || channelFilter || advertiserFilter;

  return (
    <>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
            Total Markets
          </p>
          <p className="mt-1 text-2xl font-bold text-midnight-navy tabular-nums">
            {totalMarkets}
          </p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
            Total Observations
          </p>
          <p className="mt-1 text-2xl font-bold text-midnight-navy tabular-nums">
            {formatNumber(totalObservations)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
            Total Est. Spend
          </p>
          <p className="mt-1 text-2xl font-bold text-intelligence-teal tabular-nums">
            {formatCurrency(totalSpend)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
            Avg Spend / Market
          </p>
          <p className="mt-1 text-2xl font-bold text-midnight-navy tabular-nums">
            {formatCurrency(avgSpend)}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3">
        <select
          value={tortFilter}
          onChange={(e) => setTortFilter(e.target.value)}
          className="rounded-lg border border-cloud bg-white px-3 py-2 text-sm text-charcoal shadow-sm focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
        >
          <option value="">All Torts</option>
          {filters.torts.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="rounded-lg border border-cloud bg-white px-3 py-2 text-sm text-charcoal shadow-sm focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
        >
          <option value="">All Channels</option>
          {filters.channels.map((ch) => (
            <option key={ch} value={ch}>
              {channelLabel(ch)}
            </option>
          ))}
        </select>

        <select
          value={advertiserFilter}
          onChange={(e) => setAdvertiserFilter(e.target.value)}
          className="rounded-lg border border-cloud bg-white px-3 py-2 text-sm text-charcoal shadow-sm focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
        >
          <option value="">All Advertisers</option>
          {filters.advertisers.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={() => {
              setTortFilter("");
              setChannelFilter("");
              setAdvertiserFilter("");
            }}
            className="rounded-lg border border-cloud bg-white px-3 py-2 text-sm text-slate-gray hover:text-charcoal shadow-sm transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Market Table */}
      <section className="rounded-lg bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-cloud text-left text-xs font-semibold uppercase tracking-wider text-slate-gray">
                <th className="px-4 py-3 w-12 text-center">#</th>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3 text-right">Obs.</th>
                <th className="px-4 py-3 text-right min-w-[180px]">Est. Spend</th>
                <th className="px-4 py-3 text-center">Advertisers</th>
                <th className="px-4 py-3 text-center">Torts</th>
                <th className="px-5 py-3">Channels</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((m, idx) => {
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
                    <td className="px-4 py-3 text-right text-sm font-semibold text-charcoal tabular-nums">
                      {formatNumber(m.observation_count)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative">
                        <div
                          className="absolute inset-y-0 left-0 rounded"
                          style={{
                            width: `${spendPct}%`,
                            background: `linear-gradient(90deg, rgba(26,140,150,0.10) 0%, rgba(26,140,150,0.25) 100%)`,
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
                    <td className="px-4 py-3 text-center text-sm font-semibold text-charcoal tabular-nums">
                      {m.distinct_torts}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {m.channel_list.map((ch) => (
                          <span
                            key={ch}
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              channelColors[ch] ?? "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
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
              {markets.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-sm text-slate-gray"
                  >
                    No markets match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <MethodologySources
        sections={[
          {
            title: "Data Sources",
            content:
              "Market-level aggregation computed client-side from individual ad_events records (180 observations across 19 markets), joined with firms, mass_torts, and markets tables. Aggregation recalculates dynamically when filters are applied.",
          },
          {
            title: "Key Metrics",
            content:
              "Core metrics displayed for each market:",
            bullets: [
              "<strong>Observations</strong>: Count of individual ad observation events recorded in each market.",
              "<strong>Est. Spend</strong>: Sum of modeled spend estimates for all observations in the market. Higher spend indicates more detected advertising activity, not necessarily market dominance.",
              "<strong>Advertisers</strong>: Count of distinct firms observed advertising in the market.",
              "<strong>Torts</strong>: Count of distinct tort/practice areas with observed advertising in the market.",
              "<strong>Channels</strong>: List of distinct advertising channels detected (TV, CTV, digital, radio, search, social).",
              "<strong>Heatmap Intensity</strong>: Visual bar width is proportional to the market\u2019s spend relative to the highest-spend market. This shows relative activity levels, not absolute market share.",
            ],
          },
          {
            title: "Market Coverage",
            content:
              "19 DMA-level markets are currently tracked. Markets represent major metropolitan areas where legal advertising activity has been observed. Not all U.S. DMAs are monitored \u2014 coverage is concentrated in high-activity legal advertising markets.",
          },
        ]}
        limitations={[
          "Market-level spend is the sum of modeled observation-level estimates \u2014 not verified media-buy totals.",
          "Heatmap intensity reflects observed activity volume, not true market share or competitive position.",
          "Some markets have sparse observations (as few as 2), which limits statistical reliability of aggregates.",
          "Channel coverage varies significantly by market \u2014 some markets only show 2 channels while others show all 6.",
          "Geographic targeting at the state or DMA level is inferred from the markets table, not from ad-level geo-targeting data.",
        ]}
        dataNotice="Market activity is aggregated from ad observation events across TV, CTV, digital, radio, search, and social channels. Spend figures are algorithmic estimates. Coverage varies by market and channel \u2014 higher-activity markets have more observations and more reliable aggregates. Treat heatmap intensity as a relative activity indicator, not absolute market intelligence."
      />
    </>
  );
}
