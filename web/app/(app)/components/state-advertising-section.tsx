"use client";

import { useState, useEffect } from "react";
import {
  Monitor,
  TrendingUp,
  MapPin,
  Eye,
  Database,
  Search,
  BarChart3,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { extractDomain } from "@/lib/queries";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PlatformBreakdownRow {
  advertiser_name: string;
  platforms: string[];
  total_spend: number;
}

interface TopAdvertiserRow {
  advertiser_name: string;
  segment: string;
  total_spend: number;
  total_creatives: number;
  tort_count: number;
}

interface TortConcentrationRow {
  tort_slug: string;
  tort_label: string;
  total_advertisers: number;
  total_spend: number;
  total_creatives: number;
  saturation_score: number | null;
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

interface Props {
  stateAbbr: string;
  stateName: string;
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

const SEGMENT_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  on_docket: { label: "On-Docket", color: "#10B981", bg: "#ECFDF5" },
  off_docket: { label: "Off-Docket", color: "#F59E0B", bg: "#FFFBEB" },
  aggregator: { label: "Aggregator", color: "#7C3AED", bg: "#FAF5FF" },
  unknown: { label: "Unknown", color: "#6B7280", bg: "#F9FAFB" },
};

function segBadge(seg: string) {
  const meta = SEGMENT_META[seg] ?? SEGMENT_META.unknown;
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: meta.bg, color: meta.color }}
    >
      {meta.label}
    </span>
  );
}

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
/*  Empty state                                                        */
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

export function StateAdvertisingSection({ stateAbbr, stateName }: Props) {
  const [platformData, setPlatformData] = useState<PlatformBreakdownRow[]>([]);
  const [topAdvertisers, setTopAdvertisers] = useState<TopAdvertiserRow[]>([]);
  const [tortConcentration, setTortConcentration] = useState<
    TortConcentrationRow[]
  >([]);
  const [sampleAds, setSampleAds] = useState<SampleAdRow[]>([]);
  const [allPlatforms, setAllPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = getSupabase() as any;

      const results = await Promise.allSettled([
        sb.rpc("get_advertiser_platforms", {
          p_tort_slug: null,
          p_state_abbr: stateAbbr,
          p_source: null,
        }),
        sb.rpc("get_advertiser_competitive_summary", {
          p_tort_slug: null,
          p_state_abbr: stateAbbr,
          p_source: null,
        }),
        sb.rpc("get_ad_saturation_windowed", {
          p_window_start: new Date(
            Date.now() - 90 * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .slice(0, 10),
          p_window_end: new Date().toISOString().slice(0, 10),
          p_tort_slug: null,
          p_state: stateAbbr,
          p_source: null,
        }),
        sb
          .from("ad_observations_raw")
          .select(
            "id, source, advertiser_raw, creative_url, creative_text, ad_format, first_seen, last_seen, geo_target_id, geo_targets!inner(state_abbr)"
          )
          .eq("geo_targets.state_abbr", stateAbbr)
          .or("creative_url.neq.null,creative_text.neq.null")
          .order("last_seen", { ascending: false })
          .limit(12),
      ]);

      if (cancelled) return;

      // Platform breakdown
      if (results[0].status === "fulfilled") {
        const res = results[0].value as { data: unknown; error: unknown };
        if (!res.error && Array.isArray(res.data)) {
          const rows = res.data as PlatformBreakdownRow[];
          setPlatformData(rows);
          const platforms = new Set<string>();
          for (const r of rows) {
            for (const p of r.platforms ?? []) platforms.add(p);
          }
          setAllPlatforms(Array.from(platforms).sort());
        }
      }

      // Top advertisers in state
      if (results[1].status === "fulfilled") {
        const res = results[1].value as { data: unknown; error: unknown };
        if (!res.error && Array.isArray(res.data)) {
          const rows = (res.data as TopAdvertiserRow[])
            .sort((a, b) => (b.total_spend ?? 0) - (a.total_spend ?? 0))
            .slice(0, 20);
          setTopAdvertisers(rows);
        }
      }

      // Tort concentration in this state
      if (results[2].status === "fulfilled") {
        const res = results[2].value as { data: unknown; error: unknown };
        if (!res.error && Array.isArray(res.data)) {
          // Group by tort
          const tortMap = new Map<
            string,
            {
              tort_slug: string;
              tort_label: string;
              total_advertisers: number;
              total_spend: number;
              total_creatives: number;
              saturation_score: number | null;
            }
          >();
          for (const row of res.data as Array<{
            tort_slug: string;
            tort_label: string;
            total_advertisers: number;
            estimated_spend: number;
            total_creatives: number;
            saturation_score: number | null;
          }>) {
            const existing = tortMap.get(row.tort_slug);
            if (existing) {
              existing.total_advertisers += row.total_advertisers;
              existing.total_spend += row.estimated_spend ?? 0;
              existing.total_creatives += row.total_creatives;
              if (
                row.saturation_score != null &&
                (existing.saturation_score == null ||
                  row.saturation_score > existing.saturation_score)
              ) {
                existing.saturation_score = row.saturation_score;
              }
            } else {
              tortMap.set(row.tort_slug, {
                tort_slug: row.tort_slug,
                tort_label: row.tort_label,
                total_advertisers: row.total_advertisers,
                total_spend: row.estimated_spend ?? 0,
                total_creatives: row.total_creatives,
                saturation_score: row.saturation_score,
              });
            }
          }
          const sorted = Array.from(tortMap.values())
            .sort((a, b) => b.total_spend - a.total_spend)
            .slice(0, 15);
          setTortConcentration(sorted);
        }
      }

      // Sample ads — geo-filtered via inner join on geo_targets.state_abbr
      if (results[3].status === "fulfilled") {
        const res = results[3].value as { data: unknown; error: unknown };
        if (!res.error && Array.isArray(res.data)) {
          setSampleAds((res.data as SampleAdRow[]).slice(0, 12));
        }
      }

      setLoading(false);
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [stateAbbr]);

  const liveBadge = (
    <span className="rounded-full bg-emerald-50 border border-success/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success flex items-center gap-1">
      <Database className="w-3 h-3" /> Live Data
    </span>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg bg-white p-6 shadow-sm border">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4.5 h-4.5 text-intelligence-teal" />
            <h2 className="font-heading text-2xl font-bold text-midnight-navy">
              Advertising Intelligence
            </h2>
          </div>
          <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
            <div className="w-8 h-8 mx-auto mb-3 animate-spin rounded-full border-2 border-intelligence-teal border-t-transparent" />
            <p className="text-sm font-medium text-midnight-navy/60">
              Loading advertising data for {stateName}...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Module 1: Platform Breakdown ──────────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Monitor className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Platform Breakdown
          </h2>
          {platformData.length > 0 && liveBadge}
        </div>

        {platformData.length > 0 && allPlatforms.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cloud">
                  <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                    Advertiser
                  </th>
                  {allPlatforms.map((p) => (
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
                {platformData.slice(0, 20).map((row, i) => {
                  const pSet = new Set(row.platforms ?? []);
                  return (
                    <tr
                      key={`${row.advertiser_name}-${i}`}
                      className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                    >
                      <td className="py-3 pr-4 font-medium text-midnight-navy">
                        {row.advertiser_name}
                      </td>
                      {allPlatforms.map((p) => (
                        <td key={p} className="py-3 px-2 text-center">
                          {pSet.has(p) ? (
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
                        {fmtCur(row.total_spend)}
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
            description={`Platform presence data for ${stateName} will appear here once advertising data is collected.`}
          />
        )}
      </div>

      {/* ── Module 2: Top Advertisers in State ────────────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Top Advertisers in {stateName}
          </h2>
          {topAdvertisers.length > 0 && liveBadge}
        </div>

        {topAdvertisers.length > 0 ? (
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
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                    Est. Spend
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                    Creatives
                  </th>
                  <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                    Torts
                  </th>
                </tr>
              </thead>
              <tbody>
                {topAdvertisers.map((adv, i) => (
                  <tr
                    key={`${adv.advertiser_name}-${i}`}
                    className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                  >
                    <td className="py-3 pr-4 font-medium text-midnight-navy">
                      {adv.advertiser_name}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {segBadge(adv.segment)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sm text-midnight-navy">
                      {fmtCur(adv.total_spend)}
                    </td>
                    <td className="py-3 px-3 text-right text-sm text-midnight-navy">
                      {fmtNum(adv.total_creatives)}
                    </td>
                    <td className="py-3 pl-3 text-right text-sm text-midnight-navy">
                      {fmtNum(adv.tort_count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Advertiser data collection in progress"
            description={`Top advertisers in ${stateName} will appear here once advertising data is collected.`}
          />
        )}
      </div>

      {/* ── Module 3: Top Torts by Ad Concentration ───────────────── */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-4.5 h-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Top Torts by Ad Concentration
          </h2>
          {tortConcentration.length > 0 && liveBadge}
        </div>
        <p className="mb-4 text-xs text-slate-gray">
          Which torts are getting the most advertising spend in {stateName}.
          High concentration signals established demand and active case
          acquisition.
        </p>

        {tortConcentration.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cloud">
                  <th className="py-3 pr-2 text-xs font-semibold uppercase tracking-wider text-slate-gray w-10">
                    #
                  </th>
                  <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                    Tort
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
                {tortConcentration.map((t, i) => {
                  const score = t.saturation_score ?? 0;
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
                      key={t.tort_slug}
                      className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                    >
                      <td className="py-3 pr-2 text-sm font-medium text-slate-gray">
                        {i + 1}
                      </td>
                      <td className="py-3 px-3 font-medium text-midnight-navy">
                        {t.tort_label}
                      </td>
                      <td className="py-3 px-3 text-right text-sm text-midnight-navy">
                        {fmtNum(t.total_advertisers)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-sm text-midnight-navy">
                        {fmtCur(t.total_spend)}
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
        ) : (
          <EmptyState
            title="Tort concentration data collection in progress"
            description={`Tort-level advertising concentration data for ${stateName} will appear here once available.`}
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
          {sampleAds.length > 0 && liveBadge}
        </div>
        <p className="mb-4 text-xs text-slate-gray">
          Recent advertisements observed in {stateName}
        </p>

        {sampleAds.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sampleAds.map((ad) => {
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
                  {domain && (
                    <p className="text-xs text-intelligence-teal truncate">
                      {domain}
                    </p>
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
            title={`Ad ingestion is in progress for ${stateName}`}
            description={`${stateName} was added recently \u2014 sample ads will populate after the next daily ingestion run. No action is needed.`}
          />
        )}
      </div>
    </div>
  );
}
