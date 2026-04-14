"use client";

import { useState, useMemo } from "react";
import type { CreativeObservation, CreativeFilters } from "@/lib/queries";

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

function channelBadge(channel: string, platform: string) {
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide bg-intelligence-teal/10 text-intelligence-teal ring-1 ring-intelligence-teal/30">
      {channel} · {platform}
    </span>
  );
}

export function CreativesClient({
  observations,
  filters,
}: {
  observations: CreativeObservation[];
  filters: CreativeFilters;
}) {
  const [firmFilter, setFirmFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [tortFilter, setTortFilter] = useState("");
  const [marketFilter, setMarketFilter] = useState("");

  const filteredObservations = useMemo(() => {
    return observations.filter((o) => {
      if (firmFilter && o.firm_name !== firmFilter) return false;
      if (channelFilter && o.channel !== channelFilter) return false;
      if (tortFilter && o.tort_name !== tortFilter) return false;
      if (marketFilter && o.market_name !== marketFilter) return false;
      return true;
    });
  }, [observations, firmFilter, channelFilter, tortFilter, marketFilter]);

  const totalObservations = filteredObservations.length;
  const totalSpend = filteredObservations.reduce(
    (s, o) => s + o.spend_estimate,
    0
  );
  const distinctAdvertisers = new Set(filteredObservations.map((o) => o.firm_name)).size;
  const distinctTorts = new Set(filteredObservations.map((o) => o.tort_name)).size;

  const hasActiveFilter = firmFilter || channelFilter || tortFilter || marketFilter;

  return (
    <>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            Distinct Advertisers
          </p>
          <p className="mt-1 text-2xl font-bold text-midnight-navy tabular-nums">
            {distinctAdvertisers}
          </p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
            Distinct Torts
          </p>
          <p className="mt-1 text-2xl font-bold text-midnight-navy tabular-nums">
            {distinctTorts}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3">
        <select
          value={firmFilter}
          onChange={(e) => setFirmFilter(e.target.value)}
          className="rounded-lg border border-cloud bg-white px-3 py-2 text-sm text-charcoal shadow-sm focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
        >
          <option value="">All Advertisers</option>
          {filters.firms.map((f) => (
            <option key={f} value={f}>
              {f}
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
              {ch}
            </option>
          ))}
        </select>

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
          value={marketFilter}
          onChange={(e) => setMarketFilter(e.target.value)}
          className="rounded-lg border border-cloud bg-white px-3 py-2 text-sm text-charcoal shadow-sm focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
        >
          <option value="">All Markets</option>
          {filters.markets.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        {hasActiveFilter && (
          <button
            onClick={() => {
              setFirmFilter("");
              setChannelFilter("");
              setTortFilter("");
              setMarketFilter("");
            }}
            className="rounded-lg border border-cloud bg-white px-3 py-2 text-sm text-slate-gray hover:text-charcoal shadow-sm transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Table */}
      <section className="rounded-lg bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-cloud text-left text-xs font-semibold uppercase tracking-wider text-slate-gray">
                <th className="px-5 py-3">Campaign</th>
                <th className="px-4 py-3">Advertiser</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Tort</th>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Est. Spend</th>
                <th className="px-4 py-3 text-right">Impressions</th>
                <th className="px-4 py-3 text-right">Est. Reach</th>
                <th className="px-5 py-3 text-right">Airings</th>
              </tr>
            </thead>
            <tbody>
              {filteredObservations.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-cloud last:border-0 hover:bg-cloud/30 transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="text-sm font-medium text-charcoal max-w-[260px]">
                      {o.campaign_name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-charcoal whitespace-nowrap">
                    {o.firm_name}
                  </td>
                  <td className="px-4 py-3">
                    {channelBadge(o.channel, o.platform)}
                  </td>
                  <td className="px-4 py-3 text-sm text-charcoal whitespace-nowrap">
                    {o.tort_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-charcoal whitespace-nowrap">
                    {o.market_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-gray whitespace-nowrap tabular-nums">
                    {o.event_date}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-midnight-navy tabular-nums whitespace-nowrap">
                    {formatCurrency(o.spend_estimate)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-charcoal tabular-nums whitespace-nowrap">
                    {formatNumber(o.impressions_estimate)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-charcoal tabular-nums whitespace-nowrap">
                    {formatNumber(o.estimated_reach)}
                  </td>
                  <td className="px-5 py-3 text-right text-sm text-charcoal tabular-nums">
                    {o.airings_count != null
                      ? formatNumber(o.airings_count)
                      : "—"}
                  </td>
                </tr>
              ))}
              {filteredObservations.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-5 py-8 text-center text-sm text-slate-gray"
                  >
                    No observations match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
