"use client";

import { useState, useMemo } from "react";
import type { AdvertiserProfile, AdvertiserFilters } from "@/lib/queries";
import { MethodologySources } from "../../components/methodology-sources";

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

function entityTypeBadge(type: string) {
  const isAggregator = type === "aggregator";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
        isAggregator
          ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
          : "bg-intelligence-teal/10 text-intelligence-teal ring-1 ring-intelligence-teal/30"
      }`}
    >
      {type === "law_firm" ? "Law Firm" : "Aggregator"}
    </span>
  );
}

function segmentBadge(segment: string) {
  const colorMap: Record<string, string> = {
    on_docket: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    off_docket: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    aggregator: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  };
  const label = segment.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
        colorMap[segment] ?? "bg-slate-50 text-slate-600 ring-1 ring-slate-200"
      }`}
    >
      {label}
    </span>
  );
}

export function AdvertisersClient({
  profiles,
  filters,
}: {
  profiles: AdvertiserProfile[];
  filters: AdvertiserFilters;
}) {
  const [channelFilter, setChannelFilter] = useState("");
  const [tortFilter, setTortFilter] = useState("");

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      if (channelFilter && !p.channels.includes(channelFilter)) return false;
      if (tortFilter) {
        // tortFilter is a slug; p.tort_ids are UUIDs — resolve via tortIdToSlug
        const hasTort = p.tort_ids.some(
          (id) => filters.tortIdToSlug[id] === tortFilter
        );
        if (!hasTort) return false;
      }
      return true;
    });
  }, [profiles, channelFilter, tortFilter, filters.tortIdToSlug]);

  const totalAdvertisers = filteredProfiles.length;
  const totalObservations = filteredProfiles.reduce((s, p) => s + p.total_observations, 0);
  const totalSpend = filteredProfiles.reduce((s, p) => s + p.total_spend, 0);

  return (
    <>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
            Total Advertisers
          </p>
          <p className="mt-1 text-2xl font-bold text-midnight-navy tabular-nums">
            {totalAdvertisers}
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
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3">
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

        {(channelFilter || tortFilter) && (
          <button
            onClick={() => {
              setChannelFilter("");
              setTortFilter("");
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
                <th className="px-5 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Segment</th>
                <th className="px-4 py-3 text-center">Channels</th>
                <th className="px-4 py-3 text-center">Torts</th>
                <th className="px-4 py-3 text-center">Markets</th>
                <th className="px-4 py-3 text-right">Observations</th>
                <th className="px-5 py-3 text-right">Est. Spend</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-cloud last:border-0 hover:bg-cloud/30 transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="text-sm font-medium text-charcoal">
                      {p.canonical_name}
                    </div>
                    {p.website && (
                      <div className="text-xs text-slate-gray truncate max-w-[200px]">
                        {p.website}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">{entityTypeBadge(p.entity_type)}</td>
                  <td className="px-4 py-3">{segmentBadge(p.segment)}</td>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-charcoal tabular-nums">
                    {p.format_count}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-charcoal tabular-nums">
                    {p.tort_count}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-charcoal tabular-nums">
                    {p.market_count}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-charcoal tabular-nums">
                    {formatNumber(p.total_observations)}
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-semibold text-midnight-navy tabular-nums">
                    {formatCurrency(p.total_spend)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <MethodologySources
        sections={[
          {
            title: "Data Sources",
            content:
              "Aggregated from advertiser_entities (30 canonical advertisers) joined with ad_observations_normalized (126 observation records). Advertiser entities are manually curated and classified by entity type (law firm vs aggregator) and segment (on-docket, off-docket, aggregator).",
          },
          {
            title: "Key Metrics",
            content:
              "Core metrics displayed for each advertiser profile:",
            bullets: [
              "<strong>Channels</strong>: Count of distinct ad formats (e.g. TV, CTV, digital, radio, search, social) observed for each advertiser.",
              "<strong>Torts</strong>: Count of distinct tort/practice areas where the advertiser has been observed advertising.",
              "<strong>Markets</strong>: Count of distinct geographic markets with observed activity.",
              "<strong>Observations</strong>: Total observation records across all formats, torts, and markets.",
              "<strong>Est. Spend</strong>: Sum of modeled spend estimates across all observations. These are algorithmic estimates, not actual invoice amounts.",
            ],
          },
          {
            title: "Entity Classification",
            content:
              "Advertisers are classified as law firms or aggregators. Segment labels (on-docket, off-docket, aggregator) reflect whether the firm typically appears as counsel of record on MDL dockets. These classifications are editorial and may not reflect current filing status.",
          },
        ]}
        limitations={[
          "Spend estimates are modeled from observation frequency and market benchmarks \u2014 not verified billing data.",
          "Observation coverage is partial; not all channels or markets are monitored equally.",
          "Entity type and segment classifications are manually assigned and may lag behind firm changes.",
          "earliest_seen and latest_seen dates are not yet populated in the current dataset.",
        ]}
        dataNotice="Advertiser data is aggregated from normalized observation records. Spend figures are algorithmic estimates based on observation frequency and market-rate benchmarks. Entity classifications are editorial. Treat as directional intelligence, not audited financials."
      />
    </>
  );
}
