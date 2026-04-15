"use client";

import { Fragment, useState, useMemo, useCallback } from "react";
import type {
  SaturationScore,
  SaturationFilters,
  AdvertiserEntity,
  ChannelMixRow,
} from "@/lib/queries";
import { MethodologySources } from "../../components/methodology-sources";
import { TortQuickStart } from "../../components/tort-quick-start";
import { getChannelMix } from "@/lib/queries/saturation-scores";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(value: number): string {
  if (value >= 1_000_000)
    return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)
    return `$${(value / 1_000).toFixed(1)}K`;
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type SeverityLevel = "Severe" | "High" | "Moderate" | "Light";

function getSeverity(score: number): SeverityLevel {
  if (score >= 75) return "Severe";
  if (score >= 50) return "High";
  if (score >= 25) return "Moderate";
  return "Light";
}

function severityBadge(score: number) {
  const severity = getSeverity(score);
  const styles: Record<SeverityLevel, string> = {
    Severe: "bg-red-50 text-red-700 ring-1 ring-red-200",
    High: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    Moderate: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
    Light: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${styles[severity]}`}
    >
      {severity} ({score.toFixed(1)})
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SaturationClient({
  scores,
  filters,
  advertisers,
}: {
  scores: SaturationScore[];
  filters: SaturationFilters;
  advertisers: AdvertiserEntity[];
}) {
  const [tortFilter, setTortFilter] = useState("");
  const [marketFilter, setMarketFilter] = useState("");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [channelMix, setChannelMix] = useState<ChannelMixRow[]>([]);
  const [channelMixLoading, setChannelMixLoading] = useState(false);

  // Build advertiser UUID → name lookup
  const advertiserMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of advertisers) {
      map.set(a.id, a.canonical_name);
    }
    return map;
  }, [advertisers]);

  // Filter scores
  const filteredScores = useMemo(() => {
    return scores.filter((s) => {
      if (tortFilter && s.tort_id !== tortFilter) return false;
      if (marketFilter && s.geo_target_id !== marketFilter) return false;
      return true;
    });
  }, [scores, tortFilter, marketFilter]);

  // Compute headline metrics from filtered data
  const totalCombos = filteredScores.length;
  const highestScore =
    filteredScores.length > 0
      ? Math.max(...filteredScores.map((s) => s.saturation_score))
      : 0;
  const severeHighCount = filteredScores.filter(
    (s) => s.saturation_score >= 50
  ).length;
  const totalSpend = filteredScores.reduce(
    (sum, s) => sum + s.estimated_spend,
    0
  );

  // Date range from first row (all rows share the same period)
  const periodStart = scores.length > 0 ? scores[0].period_start : "";
  const periodEnd = scores.length > 0 ? scores[0].period_end : "";

  const handleRowClick = useCallback(
    async (row: SaturationScore) => {
      if (selectedRowId === row.id) {
        setSelectedRowId(null);
        setChannelMix([]);
        return;
      }
      setSelectedRowId(row.id);
      setChannelMixLoading(true);
      try {
        const mix = await getChannelMix(row.tort_id, row.geo_target_id);
        setChannelMix(mix);
      } catch {
        setChannelMix([]);
      } finally {
        setChannelMixLoading(false);
      }
    },
    [selectedRowId]
  );

  const QUICK_START_PRESETS = [
    { label: "Social Media Addiction", value: "9f733040-6666-428d-a763-f78beb419228" },
    { label: "Hair Relaxer", value: "c5d329b5-1e31-4927-bcf2-58836bea25e7" },
  ];

  return (
    <>
      {/* Quick Start */}
      <TortQuickStart
        presets={QUICK_START_PRESETS}
        activeTort={tortFilter}
        onSelect={(value) => {
          setTortFilter(value);
          setMarketFilter("");
          setSelectedRowId(null);
          setChannelMix([]);
        }}
      />

      {/* Headline Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
            Tort-Market Combos
          </p>
          <p className="mt-1 text-2xl font-bold text-midnight-navy tabular-nums">
            {totalCombos}
          </p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
            Highest Score
          </p>
          <p className="mt-1 text-2xl font-bold text-midnight-navy tabular-nums">
            {highestScore.toFixed(1)}
          </p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
            Severe / High Combos
          </p>
          <p className="mt-1 text-2xl font-bold text-red-600 tabular-nums">
            {severeHighCount}
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

      {/* Period indicator */}
      {periodStart && periodEnd && (
        <p className="text-xs text-slate-gray">
          Period: {formatDate(periodStart)} &ndash; {formatDate(periodEnd)}
        </p>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={tortFilter}
          onChange={(e) => {
            setTortFilter(e.target.value);
            setSelectedRowId(null);
            setChannelMix([]);
          }}
          className="rounded-lg border border-cloud bg-white px-3 py-2 text-sm text-charcoal shadow-sm focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
        >
          <option value="">All Torts</option>
          {filters.torts.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>

        <select
          value={marketFilter}
          onChange={(e) => {
            setMarketFilter(e.target.value);
            setSelectedRowId(null);
            setChannelMix([]);
          }}
          className="rounded-lg border border-cloud bg-white px-3 py-2 text-sm text-charcoal shadow-sm focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
        >
          <option value="">All Markets</option>
          {filters.markets.map((m) => (
            <option key={m.id} value={m.id}>
              {m.geo_name}
            </option>
          ))}
        </select>

        {(tortFilter || marketFilter) && (
          <button
            onClick={() => {
              setTortFilter("");
              setMarketFilter("");
              setSelectedRowId(null);
              setChannelMix([]);
            }}
            className="rounded-lg border border-cloud bg-white px-3 py-2 text-sm text-slate-gray hover:text-charcoal shadow-sm transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Primary Ranked Table */}
      <section className="rounded-lg bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-cloud text-left text-xs font-semibold uppercase tracking-wider text-slate-gray">
                <th className="px-5 py-3 w-12">#</th>
                <th className="px-4 py-3">Tort</th>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3 text-right">Advertisers</th>
                <th className="px-4 py-3 text-right">Est. Spend</th>
                <th className="px-5 py-3 text-right">Impressions</th>
              </tr>
            </thead>
            <tbody>
              {filteredScores.map((row, i) => {
                const isSelected = selectedRowId === row.id;
                return (
                  <Fragment key={row.id}>
                    <tr
                      onClick={() => handleRowClick(row)}
                      className={`border-b border-cloud last:border-0 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-intelligence-teal/5"
                          : "hover:bg-cloud/30"
                      }`}
                    >
                      <td className="px-5 py-3 text-sm text-slate-gray tabular-nums">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-charcoal">
                          {row.tort_label}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-charcoal">
                        {row.geo_name}
                      </td>
                      <td className="px-4 py-3">
                        {severityBadge(row.saturation_score)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-charcoal tabular-nums">
                        {row.total_advertisers}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-midnight-navy tabular-nums">
                        {formatCurrency(row.estimated_spend)}
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-charcoal tabular-nums">
                        {formatNumber(row.estimated_impressions)}
                      </td>
                    </tr>
                    {isSelected && (
                      <tr>
                        <td colSpan={7} className="bg-intelligence-teal/[0.03] px-5 py-5 border-b border-cloud">
                          <div className="space-y-5">
                            <div className="flex items-center justify-between">
                              <h3 className="text-base font-bold text-midnight-navy">
                                {row.tort_label} &times; {row.geo_name}
                              </h3>
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedRowId(null); setChannelMix([]); }}
                                className="text-xs text-slate-gray hover:text-charcoal transition-colors"
                              >
                                Close
                              </button>
                            </div>

                            {/* Summary stats */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">Saturation Score</p>
                                <p className="mt-1 text-lg font-bold text-midnight-navy">{row.saturation_score.toFixed(1)}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">Advertisers</p>
                                <p className="mt-1 text-lg font-bold text-midnight-navy">{row.total_advertisers}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">Est. Spend</p>
                                <p className="mt-1 text-lg font-bold text-intelligence-teal">{formatCurrency(row.estimated_spend)}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray">Creatives</p>
                                <p className="mt-1 text-lg font-bold text-midnight-navy">{formatNumber(row.total_creatives)}</p>
                              </div>
                            </div>

                            {/* Top Advertisers */}
                            {row.top_advertisers.length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">Top Advertisers</h4>
                                <div className="flex flex-wrap gap-2">
                                  {row.top_advertisers.map((uuid) => {
                                    const name = advertiserMap.get(uuid) ?? uuid.slice(0, 8);
                                    return (
                                      <span key={uuid} className="inline-flex items-center rounded-full bg-intelligence-teal/10 px-3 py-1 text-xs font-medium text-intelligence-teal ring-1 ring-intelligence-teal/30">
                                        {name}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Channel Mix */}
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">Channel Mix</h4>
                              {channelMixLoading ? (
                                <p className="text-sm text-slate-gray">Loading channel mix...</p>
                              ) : channelMix.length === 0 ? (
                                <p className="text-sm text-slate-gray">No channel mix data available for this combination.</p>
                              ) : (
                                <div className="overflow-x-auto rounded-lg border border-cloud">
                                  <table className="w-full">
                                    <thead>
                                      <tr className="border-b border-cloud text-left text-xs font-semibold uppercase tracking-wider text-slate-gray">
                                        <th className="px-4 py-2">Channel</th>
                                        <th className="px-4 py-2 text-right">Est. Spend</th>
                                        <th className="px-4 py-2 text-right">Observations</th>
                                        <th className="px-4 py-2 text-right">Creatives</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {channelMix.map((ch) => (
                                        <tr key={ch.ad_format} className="border-b border-cloud last:border-0">
                                          <td className="px-4 py-2 text-sm font-medium text-charcoal capitalize">{ch.ad_format}</td>
                                          <td className="px-4 py-2 text-right text-sm tabular-nums text-midnight-navy font-semibold">{formatCurrency(ch.total_spend)}</td>
                                          <td className="px-4 py-2 text-right text-sm tabular-nums text-charcoal">{formatNumber(ch.total_observations)}</td>
                                          <td className="px-4 py-2 text-right text-sm tabular-nums text-charcoal">{formatNumber(ch.total_creatives)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {filteredScores.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-8 text-center text-sm text-slate-gray"
                  >
                    No data matches the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Methodology & Sources */}
      <MethodologySources
        sections={[
          {
            title: "Saturation Score Formula",
            content:
              "The saturation score is a weighted composite of three normalized components, scaled to 0–100:",
            bullets: [
              "<strong>Advertiser Density (40%)</strong>: Proportion of tracked advertisers active in this tort-market combination.",
              "<strong>Spend Concentration (35%)</strong>: Share of total estimated spend allocated to this combination.",
              "<strong>Creative Volume (25%)</strong>: Share of unique creatives observed in this combination.",
            ],
          },
          {
            title: "Data Sources",
            content:
              "Observations are aggregated from Meta Ad Library, Google Ads Transparency Center, iSpot.tv (television), MediaRadar (print/digital), and Vivvix (multi-channel). Coverage and update frequency vary by source.",
          },
          {
            title: "Update Frequency",
            content:
              "Saturation scores are recomputed daily via automated pipeline (pg_cron). The current dataset covers the period shown in the metrics row above.",
          },
        ]}
        limitations={[
          "Monitoring coverage varies by channel — TV and social have broader coverage than radio or local print.",
          "Spend figures are algorithmic estimates based on observation frequency and market-rate benchmarks, not verified billing data.",
          "Not all advertisers in a market may be captured — scores reflect observed activity, not total market activity.",
          "Score comparisons across torts with very different advertiser populations should be interpreted cautiously.",
        ]}
        dataNotice="Saturation scores are derived from observed advertising activity across monitored channels. Treat as directional competition intelligence, not audited market research. Scores update daily as new observations are ingested."
      />
    </>
  );
}
