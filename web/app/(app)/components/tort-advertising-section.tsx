"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Eye,
  MapPin,
  Database,
  Monitor,
  Users,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { extractDomain } from "@/lib/queries";
import type { BenchmarkScorecardData } from "./cost-benchmark-scorecard";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SegmentRow {
  segment: string;
  advertiser_count: number;
  total_spend: number;
  total_creatives: number;
}

interface AdvertiserRow {
  advertiser_name: string;
  segment: string;
  total_spend: number;
  total_creatives: number;
  market_count: number;
}

interface MarketRow {
  geo_name: string;
  state_abbr: string | null;
  saturation_score: number | null;
  total_advertisers: number;
  estimated_spend: number;
}

interface SerpVisRow {
  domain: string;
  visibility_score: number;
  avg_position: number | null;
  organic_appearances: number;
  paid_appearances: number;
  top_3_count: number;
  top_10_count: number;
}

interface SerpResultRow {
  domain: string;
  title: string;
  link: string | null;
  snippet: string | null;
  position: number;
}

interface SampleAdRow {
  id: string;
  advertiser_raw: string;
  creative_text: string | null;
  creative_url: string | null;
  source: string;
  ad_format: string | null;
  first_seen: string;
  last_seen: string;
}

export interface TortAdvertisingData {
  tortSlug: string;
  segments: SegmentRow[];
  topAdvertisers: AdvertiserRow[];
  platformMap: Record<string, string[]>;
  totalAdvertisers: number;
  totalSpend: number;
  totalCreatives: number;
  allPlatforms: string[];
  topMarkets: MarketRow[];
  benchmark: BenchmarkScorecardData | null;
  hasLiveData: boolean;
  serpVisibility: SerpVisRow[];
  serpResults: SerpResultRow[];
  sampleAds: SampleAdRow[];
}

interface Props {
  data: TortAdvertisingData;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtCur(n: number | null): string {
  if (n == null) return "\u2014";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtNum(n: number | null): string {
  if (n == null) return "\u2014";
  return n.toLocaleString();
}

const SEGMENT_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  on_docket: { label: "On-Docket Firms", color: "#10B981", bg: "#ECFDF5" },
  off_docket: { label: "Off-Docket Firms", color: "#F59E0B", bg: "#FFFBEB" },
  aggregator: { label: "Aggregators", color: "#7C3AED", bg: "#FAF5FF" },
  unknown: { label: "Unknown", color: "#6B7280", bg: "#F9FAFB" },
};

function segMeta(seg: string) {
  return SEGMENT_META[seg] ?? SEGMENT_META.unknown;
}

const PLATFORM_COLORS: Record<string, string> = {
  meta: "#3B82F6",
  google: "#10B981",
  tiktok: "#EC4899",
  youtube: "#EF4444",
  ispot: "#8B5CF6",
  mediaradar: "#F59E0B",
  tv: "#6366F1",
  google_ads: "#10B981",
  tiktok_ads: "#EC4899",
  meta_ad_library: "#3B82F6",
};

function sourceBadge(source: string) {
  const map: Record<string, { label: string; color: string }> = {
    google_ads: { label: "Google Ads", color: "#10B981" },
    meta_ad_library: { label: "Meta", color: "#3B82F6" },
    ispot: { label: "TV", color: "#6366F1" },
    tiktok_ads: { label: "TikTok", color: "#EC4899" },
  };
  return map[source] ?? { label: source, color: "#6B7280" };
}

/* ------------------------------------------------------------------ */
/*  Empty state wrapper                                                */
/* ------------------------------------------------------------------ */

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
      <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
      <p className="text-sm font-medium text-midnight-navy/60">{title}</p>
      <p className="mt-1 text-xs text-slate-gray max-w-md mx-auto">
        {description}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TortAdvertisingSection({ data }: Props) {
  const liveBadge = (
    <span className="rounded-full bg-emerald-50 border border-success/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success flex items-center gap-1">
      <Database className="w-3 h-3" /> Live Data
    </span>
  );

  return (
    <div className="space-y-6">
      {/* ── Module 1: Top Advertisers ─────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Top Advertisers
          </h2>
          {data.topAdvertisers.length > 0 && liveBadge}
        </div>

        {data.topAdvertisers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cloud">
                  <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                    Advertiser
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                    Segment
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                    Platforms
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                    Est. Spend
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                    Creatives
                  </th>
                  <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                    Markets
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.topAdvertisers.map((adv, i) => {
                  const meta = segMeta(adv.segment);
                  const advPlatforms =
                    data.platformMap[adv.advertiser_name] ?? [];
                  return (
                    <tr
                      key={`${adv.advertiser_name}-${i}`}
                      className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium text-midnight-navy">
                        {adv.advertiser_name}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: meta.bg,
                            color: meta.color,
                          }}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {advPlatforms.length > 0 ? (
                            advPlatforms.map((p) => (
                              <span
                                key={p}
                                className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                                style={{
                                  backgroundColor:
                                    PLATFORM_COLORS[p] ?? "#6B7280",
                                }}
                              >
                                {p}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-gray">
                              &mdash;
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-sm text-midnight-navy">
                        {fmtCur(adv.total_spend)}
                      </td>
                      <td className="py-3 px-3 text-right text-sm text-midnight-navy">
                        {fmtNum(adv.total_creatives)}
                      </td>
                      <td className="py-3 pl-3 text-right text-sm text-midnight-navy">
                        {fmtNum(adv.market_count)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Advertiser data collection in progress"
            description="Top advertisers will appear here once data is collected from ad platforms. This is an emerging tort — first-mover opportunity is wide."
          />
        )}
      </div>

      {/* ── Module 2: Competitive Landscape — Platform Breakdown ──── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Monitor className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Competitive Landscape &mdash; Platform Breakdown
          </h2>
          {data.allPlatforms.length > 0 && liveBadge}
        </div>

        {data.topAdvertisers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cloud">
                  <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                    Advertiser
                  </th>
                  {data.allPlatforms.map((p) => (
                    <th
                      key={p}
                      className="py-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center"
                    >
                      {p}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                    Total Spend
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.topAdvertisers.slice(0, 20).map((adv, i) => {
                  const advPlatforms = new Set(
                    data.platformMap[adv.advertiser_name] ?? []
                  );
                  return (
                    <tr
                      key={`plat-${adv.advertiser_name}-${i}`}
                      className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium text-midnight-navy">
                        {adv.advertiser_name}
                      </td>
                      {data.allPlatforms.map((p) => (
                        <td key={p} className="py-3 px-2 text-center">
                          {advPlatforms.has(p) ? (
                            <span
                              className="inline-block w-3 h-3 rounded-full"
                              style={{
                                backgroundColor:
                                  PLATFORM_COLORS[p] ?? "#6B7280",
                              }}
                            />
                          ) : (
                            <span className="text-xs text-slate-gray/30">
                              &mdash;
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="py-3 px-3 text-right font-mono text-sm text-midnight-navy">
                        {fmtCur(adv.total_spend)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Platform data collection in progress"
            description="Platform presence indicators will appear here once advertising data is collected across Meta, Google, TikTok, and other channels."
          />
        )}
      </div>

      {/* ── Module 3: Top Markets by Ad Concentration ────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Top Markets by Ad Concentration
          </h2>
          {data.topMarkets.length > 0 && liveBadge}
        </div>
        <p className="mb-4 text-xs text-slate-gray">
          Where competitors are concentrating their advertising for this tort.
          High concentration often signals strong claim volume, favorable venue,
          or known demand in these markets.
        </p>

        {data.topMarkets.length > 0 ? (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cloud">
                    <th className="py-3 pr-2 text-xs font-semibold uppercase tracking-wider text-slate-gray w-10">
                      #
                    </th>
                    <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                      Market
                    </th>
                    <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                      Advertisers
                    </th>
                    <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                      Est. Spend
                    </th>
                    <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right w-32">
                      Saturation
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.topMarkets.map((m, i) => {
                    const score = m.saturation_score ?? 0;
                    const scoreColor =
                      score >= 75
                        ? "#EF4444"
                        : score >= 50
                          ? "#F59E0B"
                          : score >= 25
                            ? "#F59E0B"
                            : "#10B981";
                    return (
                      <tr
                        key={`${m.geo_name}-${i}`}
                        className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                      >
                        <td className="py-3 pr-2 text-sm font-medium text-slate-gray">
                          {i + 1}
                        </td>
                        <td className="py-3 px-3 font-medium text-midnight-navy">
                          {m.geo_name}
                          {m.state_abbr && (
                            <span className="ml-1.5 text-xs text-slate-gray">
                              {m.state_abbr}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-sm text-midnight-navy">
                          {fmtNum(m.total_advertisers)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-sm text-midnight-navy">
                          {fmtCur(m.estimated_spend)}
                        </td>
                        <td className="py-3 pl-3">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-2 rounded-full bg-cloud">
                              <div
                                className="h-2 rounded-full transition-all"
                                style={{
                                  width: `${Math.min(score, 100)}%`,
                                  backgroundColor: scoreColor,
                                }}
                              />
                            </div>
                            <span
                              className="text-sm font-bold w-8 text-right"
                              style={{ color: scoreColor }}
                            >
                              {score.toFixed(0)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyState
            title="Market concentration data collection in progress"
            description="Market-level advertising saturation data will appear here once available. Emerging torts often show concentration in early-filing jurisdictions."
          />
        )}
      </div>

      {/* ── Module 4: Sample Ads ──────────────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Sample Ads
          </h2>
          {data.sampleAds.length > 0 && liveBadge}
        </div>
        <p className="mb-4 text-xs text-slate-gray">
          Recent advertisements observed across platforms
        </p>

        {data.sampleAds.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.sampleAds.map((ad) => {
              const domain = ad.creative_url
                ? extractDomain(ad.creative_url)
                : null;
              const badge = sourceBadge(ad.source);
              return (
                <div
                  key={ad.id}
                  className="rounded-lg border border-cloud bg-cloud/40 p-4 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                      style={{ backgroundColor: badge.color }}
                    >
                      {badge.label}
                    </span>
                    <span className="text-[10px] text-slate-gray">
                      {ad.ad_format ?? "\u2014"}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-midnight-navy leading-snug line-clamp-2">
                    {ad.advertiser_raw}
                  </p>
                  {ad.creative_text && (
                    <p className="text-xs text-midnight-navy/60 line-clamp-2">
                      {ad.creative_text}
                    </p>
                  )}
                  {ad.source === "google_ads" && domain && (
                    <p className="text-xs text-intelligence-teal truncate">
                      {domain}
                    </p>
                  )}
                  {ad.source === "meta_ad_library" && ad.creative_url && (
                    <a
                      href={ad.creative_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-intelligence-teal hover:underline"
                    >
                      View in Ad Library &rarr;
                    </a>
                  )}
                  <p className="mt-auto text-[10px] text-slate-gray">
                    {ad.first_seen === ad.last_seen
                      ? ad.last_seen
                      : `${ad.first_seen} \u2014 ${ad.last_seen}`}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Sample ad collection in progress"
            description="Ad creatives will appear here once collected from Meta Ad Library, Google Ads, and TikTok. Early torts often have few ads — this is a first-mover opportunity."
          />
        )}
      </div>

      {/* ── Module 5: Organic Search Landscape ────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Organic Search Landscape
          </h2>
          {data.serpVisibility.length > 0 && liveBadge}
        </div>

        {data.serpVisibility.length > 0 ? (
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cloud">
                  <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                    Domain
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                    Visibility
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                    Avg Pos
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                    Organic
                  </th>
                  <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                    Top 10
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...data.serpVisibility]
                  .sort((a, b) => b.visibility_score - a.visibility_score)
                  .slice(0, 15)
                  .map((row) => (
                    <tr
                      key={row.domain}
                      className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium text-midnight-navy">
                        {row.domain}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-midnight-navy">
                        {row.visibility_score.toFixed(1)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-midnight-navy/80">
                        {row.avg_position != null
                          ? row.avg_position.toFixed(1)
                          : "\u2014"}
                      </td>
                      <td className="py-3 px-3 text-right text-midnight-navy/80">
                        {row.organic_appearances}
                      </td>
                      <td className="py-3 pl-3 text-right text-midnight-navy/80">
                        {row.top_10_count}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="SERP visibility data collection in progress"
            description="Organic search visibility rankings will appear here once data is collected. This shows which firms dominate organic search for this tort."
          />
        )}

        {data.serpResults.length > 0 && (
          <>
            <h3 className="mb-3 text-sm font-semibold text-midnight-navy">
              SERP Preview
            </h3>
            <div className="space-y-0 divide-y divide-cloud">
              {data.serpResults.map((r, i) => (
                <div
                  key={`${r.domain}-${i}`}
                  className="relative py-3 first:pt-0 last:pb-0"
                >
                  <span className="absolute top-3 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-intelligence-teal/10 text-[10px] font-bold text-intelligence-teal">
                    {r.position}
                  </span>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-gray/20 text-[8px] font-bold text-slate-gray">
                      {r.domain.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-xs text-success">{r.domain}</span>
                  </div>
                  {r.link ? (
                    <a
                      href={r.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-intelligence-teal hover:underline"
                    >
                      {r.title}
                    </a>
                  ) : (
                    <p className="text-sm font-medium text-intelligence-teal">
                      {r.title}
                    </p>
                  )}
                  {r.snippet && (
                    <p className="mt-0.5 text-sm text-midnight-navy/60 pr-8">
                      {r.snippet}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
