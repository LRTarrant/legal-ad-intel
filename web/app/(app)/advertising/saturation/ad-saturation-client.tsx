"use client";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { StateDropdown } from "./_components/StateDropdown";
import {
  getAdvertiserPlatforms,
  getAdvertiserCompetitiveSummary,
  getTortMarketAdvertisers,
  type AdSaturationRow,
  type AdvertiserPlatforms,
  type AdvertiserCompetitiveSummary,
  type SegmentSummary,
  type TopAdvertiserBySegment,
  type Tort,
  type TortMarketAdvertiser,
} from "@/lib/queries";
import { PlatformPills } from "./_components/platform-pills";

function fmt(n: number | null): string {
  if (n == null) return "\u2014";
  return n.toLocaleString();
}

function fmtCur(n: number | null): string {
  if (n == null) return "\u2014";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtScore(n: number | null): string {
  if (n == null) return "\u2014";
  return n.toFixed(1);
}

function scoreCls(s: number | null): string {
  if (s == null) return "text-zinc-400";
  if (s >= 75) return "text-red-400";
  if (s >= 50) return "text-amber-400";
  if (s >= 25) return "text-yellow-400";
  return "text-emerald-400";
}

function scoreBg(s: number | null): string {
  if (s == null) return "bg-zinc-700";
  if (s >= 75) return "bg-red-500/60";
  if (s >= 50) return "bg-amber-500/60";
  if (s >= 25) return "bg-yellow-500/60";
  return "bg-emerald-500/60";
}

const SEGMENT_META: Record<string, { label: string; color: string }> = {
  on_docket: { label: "On-Docket Firms", color: "text-emerald-300" },
  off_docket: { label: "Off-Docket Firms", color: "text-amber-300" },
  aggregator: { label: "Aggregators", color: "text-purple-300" },
};

function segmentColor(seg: string): string {
  return SEGMENT_META[seg]?.color ?? "text-zinc-100";
}

function segmentLabel(seg: string): string {
  return SEGMENT_META[seg]?.label ?? seg;
}

function segmentBg(seg: string): string {
  if (seg === "on_docket") return "bg-emerald-500/20 border-emerald-500/40";
  if (seg === "off_docket") return "bg-amber-500/20 border-amber-500/40";
  if (seg === "aggregator") return "bg-purple-500/20 border-purple-500/40";
  return "bg-zinc-800 border-zinc-700";
}

const PLATFORM_META: Record<string, { label: string; className: string }> = {
  google_ads: { label: "Google Ads", className: "bg-blue-500/20 border-blue-500/40 text-blue-200" },
  google_ads_transparency: {
    label: "Google Transparency",
    className: "bg-sky-500/20 border-sky-500/40 text-sky-200",
  },
  tiktok_ads: { label: "TikTok Ads", className: "bg-zinc-700 border-zinc-500 text-zinc-100" },
  meta_ad_library: { label: "Meta Ads", className: "bg-indigo-500/20 border-indigo-500/40 text-indigo-200" },
  mediaradar: { label: "MediaRadar", className: "bg-emerald-500/20 border-emerald-500/40 text-emerald-200" },
  ispot: { label: "iSpot", className: "bg-orange-500/20 border-orange-500/40 text-orange-200" },
  vivvix: { label: "Vivvix", className: "bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-200" },
  manual: { label: "Manual", className: "bg-zinc-500/20 border-zinc-500/40 text-zinc-200" },
};

function normalizePlatform(platform: string): string {
  return platform?.toLowerCase().trim();
}

function platformLabel(platform: string): string {
  return PLATFORM_META[platform]?.label ?? platform.replaceAll("_", " ");
}

function platformBadgeClass(platform: string): string {
  return PLATFORM_META[platform]?.className ?? "bg-zinc-600/20 border-zinc-600/40 text-zinc-200";
}

export function AdSaturationClient({
  allData,
  torts,
  segmentSummaryByTort,
  topAdvertisersByTort,
  initialCompetitiveSummary,
  advertiserPlatforms,
  selectedStates,
  activePlatform,
}: {
  allData: AdSaturationRow[];
  torts: Tort[];
  segmentSummaryByTort: Record<string, SegmentSummary[]>;
  topAdvertisersByTort: Record<string, TopAdvertiserBySegment[]>;
  initialCompetitiveSummary: AdvertiserCompetitiveSummary[];
  advertiserPlatforms: Record<string, string[]>;
  selectedStates: string[];
  activePlatform: string;
}) {
  const [selectedTort, setSelectedTort] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [competitiveAdvertisers, setCompetitiveAdvertisers] = useState(initialCompetitiveSummary);
  const [competitiveLoading, setCompetitiveLoading] = useState(false);
  const [advertiserPlatformRows, setAdvertiserPlatformRows] = useState<AdvertiserPlatforms[]>([]);
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);
  const [drilldownLoadingKey, setDrilldownLoadingKey] = useState<string | null>(null);
  const [drilldownByRowKey, setDrilldownByRowKey] = useState<Record<string, TortMarketAdvertiser[]>>({});

  const stateSet = useMemo(
    () => (selectedStates.length > 0 ? new Set(selectedStates) : null),
    [selectedStates]
  );

  const data = useMemo(
    () =>
      allData.filter(
        (d) =>
          (!selectedTort || d.tort_slug === selectedTort) &&
          (!stateSet || (d.state_abbr != null && stateSet.has(d.state_abbr)))
      ),
    [allData, selectedTort, stateSet]
  );

  const segments = useMemo(
    () => segmentSummaryByTort[selectedTort ?? "__all__"] ?? [],
    [segmentSummaryByTort, selectedTort]
  );
  const topAdvertisers = useMemo(
    () => topAdvertisersByTort[selectedTort ?? "__all__"] ?? [],
    [topAdvertisersByTort, selectedTort]
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setCompetitiveLoading(true);
      const rows = await getAdvertiserCompetitiveSummary(
        selectedTort ?? undefined,
        selectedState ?? undefined,
        activePlatform === "all" ? undefined : activePlatform
      );
      if (!cancelled) {
        setCompetitiveAdvertisers(rows);
        setCompetitiveLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [selectedState, selectedTort, activePlatform]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const rows = await getAdvertiserPlatforms(
        selectedTort ?? undefined,
        selectedState ?? undefined,
        activePlatform === "all" ? undefined : activePlatform
      );
      if (!cancelled) {
        setAdvertiserPlatformRows(rows);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [selectedState, selectedTort, activePlatform]);

  function renderPlatformBadges(advertiserId?: string | null, advertiserName?: string | null) {
    const byId = advertiserId ? platformsByAdvertiser.byId.get(advertiserId) : undefined;
    const byName = advertiserName
      ? platformsByAdvertiser.byName.get(advertiserName.trim().toLowerCase())
      : undefined;
    const platforms = byId ?? byName ?? [];
    if (!platforms.length) return <span className="text-xs text-zinc-500">\u2014</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {platforms.map((platform) => (
          <span
            key={`${advertiserName}-${platform}`}
            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${platformBadgeClass(platform)}`}
          >
            {platformLabel(platform)}
          </span>
        ))}
      </div>
    );
  }



  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2"><span className="text-xs font-medium uppercase text-zinc-500">Tort</span><div className="flex flex-wrap gap-1"><button type="button" onClick={() => startTransition(() => setSelectedTort(null))} className={`rounded-full border px-3 py-1 text-xs font-medium transition ${!selectedTort ? "border-purple-500 bg-purple-500/20 text-purple-300" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>All</button>{torts.map((t) => (<button key={t.slug} type="button" onClick={() => startTransition(() => setSelectedTort(t.slug))} className={`rounded-full border px-3 py-1 text-xs font-medium transition ${selectedTort === t.slug ? "border-purple-500 bg-purple-500/20 text-purple-300" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>{t.label}</button>))}</div></div>
      </div>

      {isPending && <div className="h-1 w-full animate-pulse rounded-full bg-zinc-700" />}

      <div className="space-y-6">
        {segments.length > 0 && data.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900">
            <div className="border-b border-zinc-800 px-5 py-4"><h3 className="text-base font-semibold">Top Advertisers by Segment</h3></div>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm text-zinc-100"><thead className="border-b border-zinc-800 text-xs uppercase text-zinc-300"><tr><th className="px-4 py-3">Advertiser</th><th className="px-4 py-3">Segment</th><th className="px-4 py-3">Platforms</th><th className="px-4 py-3">Type</th><th className="px-4 py-3 text-right">Est. Spend</th><th className="px-4 py-3 text-right">Creatives</th><th className="px-4 py-3 text-right">Markets</th></tr></thead><tbody className="divide-y divide-zinc-700/50">{topAdvertisers.map((adv, i) => (<tr key={`${adv.advertiser_name}-${i}`} className="hover:bg-zinc-800/50"><td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-50">{adv.advertiser_name}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${segmentBg(adv.segment)} ${segmentColor(adv.segment)}`}>{segmentLabel(adv.segment)}</span></td><td className="px-4 py-3"><PlatformPills platforms={advertiserPlatforms[adv.advertiser_name] ?? []} /></td><td className="px-4 py-3 text-zinc-300">{adv.entity_type}</td><td className="px-4 py-3 text-right tabular-nums text-zinc-300">{fmtCur(adv.total_spend)}</td><td className="px-4 py-3 text-right tabular-nums text-zinc-300">{fmt(adv.total_creatives)}</td><td className="px-4 py-3 text-right tabular-nums text-zinc-300">{adv.market_count}</td></tr>))}</tbody></table></div>
          </div>
        )}

        <div className="rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="border-b border-zinc-800 px-5 py-4">
            <h3 className="text-base font-semibold">Advertiser Leaderboard</h3>
            <p className="text-sm text-zinc-400">{competitiveLoading ? "Loading..." : `${competitiveAdvertisers.length} advertisers`}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-100">
              <thead className="border-b border-zinc-800 text-xs uppercase text-zinc-300"><tr><th className="w-12 px-4 py-3 text-right">#</th><th className="px-4 py-3">Advertiser</th><th className="px-4 py-3">Segment</th><th className="px-4 py-3">Platforms</th><th className="px-4 py-3 text-right">Est. Spend</th><th className="px-4 py-3 text-right">Creatives</th><th className="px-4 py-3 text-right">Torts</th><th className="px-4 py-3 text-right">Markets</th></tr></thead>
              <tbody className="divide-y divide-zinc-700/50">{competitiveAdvertisers.map((adv, i) => (<tr key={`${adv.advertiser_name}-${i}`} className="hover:bg-zinc-800/50"><td className="px-4 py-3 text-right text-zinc-400">{i + 1}</td><td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-50">{adv.advertiser_name}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${segmentBg(adv.segment)} ${segmentColor(adv.segment)}`}>{segmentLabel(adv.segment)}</span></td><td className="px-4 py-3"><PlatformPills platforms={advertiserPlatforms[adv.advertiser_name] ?? []} /></td><td className="px-4 py-3 text-right tabular-nums text-zinc-300">{fmtCur(adv.total_spend)}</td><td className="px-4 py-3 text-right tabular-nums text-zinc-300">{fmt(adv.total_creatives)}</td><td className="px-4 py-3 text-right tabular-nums text-zinc-300">{adv.tort_count}</td><td className="px-4 py-3 text-right tabular-nums text-zinc-300">{adv.market_count}</td></tr>))}{!competitiveLoading && competitiveAdvertisers.length === 0 && (<tr><td className="px-4 py-4 text-center text-zinc-400" colSpan={8}>No advertiser leaderboard data for this selection.</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900">
        <div className="border-b border-zinc-800 px-5 py-4"><h2 className="text-lg font-semibold">Saturation Rankings</h2><p className="text-sm text-zinc-400">{data.length} records</p></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-100">
            <thead className="border-b border-zinc-800 text-xs uppercase text-zinc-300"><tr><th className="w-12 px-4 py-3 text-right">#</th><th className="px-4 py-3">Tort</th><th className="px-4 py-3">Market</th><th className="px-4 py-3">State</th><th className="px-4 py-3 text-right">Score</th><th className="px-4 py-3 text-right">Advertisers</th><th className="px-4 py-3 text-right">Creatives</th><th className="px-4 py-3 text-right">Observations</th><th className="px-4 py-3 text-right">Est. Spend</th><th className="px-2 py-3 text-right">Details</th></tr></thead>
            <tbody className="divide-y divide-zinc-700/50">
              {data.map((row, i) => {
                const rowKey = `${row.tort_id ?? row.tort_slug}:${row.geo_target_id ?? row.geo_code}`;
                const isExpanded = expandedRowKey === rowKey;
                const drilldownRows = drilldownByRowKey[rowKey] ?? [];

                return (
                  <Fragment key={row.id}>
                    <tr className="hover:bg-zinc-800/50">
                      <td className="px-4 py-3 text-right text-zinc-400">{i + 1}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-50"><Link href={`/advertising/saturation/${row.tort_slug}`} className="transition hover:text-purple-400">{row.tort_label}</Link></td>
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-300">{row.geo_name}</td>
                      <td className="px-4 py-3">{row.state_abbr ?? "\u2014"}</td>
                      <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-2"><div className="h-2 w-16 overflow-hidden rounded-full bg-zinc-800"><div className={`h-full rounded-full ${scoreBg(row.saturation_score)}`} style={{ width: `${Math.min(row.saturation_score ?? 0, 100)}%` }} /></div><span className={`tabular-nums font-semibold ${scoreCls(row.saturation_score)}`}>{fmtScore(row.saturation_score)}</span></div></td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{row.total_advertisers}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{row.total_creatives}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{fmt(row.total_observations)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-300">{fmtCur(row.estimated_spend)}</td>
                      <td className="px-2 py-3 text-right"><button type="button" className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-500 hover:text-white" onClick={async () => { if (isExpanded) { setExpandedRowKey(null); return; } setExpandedRowKey(rowKey); if (!row.tort_id || !row.geo_target_id || drilldownByRowKey[rowKey]) return; setDrilldownLoadingKey(rowKey); const rows = await getTortMarketAdvertisers(row.tort_id, row.geo_target_id); setDrilldownByRowKey((prev) => ({ ...prev, [rowKey]: rows })); setDrilldownLoadingKey(null); }}>{isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}Drill-down</button></td>
                    </tr>
                    {isExpanded && <tr className="bg-zinc-950/70"><td colSpan={10} className="px-4 py-4">{drilldownLoadingKey === rowKey ? <p className="text-sm text-zinc-400">Loading competitive details...</p> : !row.tort_id || !row.geo_target_id ? <p className="text-sm text-zinc-400">Drill-down unavailable for this row.</p> : drilldownRows.length === 0 ? <p className="text-sm text-zinc-400">No advertiser-level competition data for this tort/market.</p> : <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/70"><table className="w-full text-left text-sm text-zinc-100"><thead className="border-b border-zinc-800 text-xs uppercase text-zinc-300"><tr><th className="px-4 py-2.5">Advertiser</th><th className="px-4 py-2.5">Segment</th><th className="px-4 py-2.5 text-right">Spend Share</th><th className="px-4 py-2.5 text-right">Creatives</th></tr></thead><tbody className="divide-y divide-zinc-700/50">{drilldownRows.map((adv) => (<tr key={`${rowKey}:${adv.advertiser_id}`} className="hover:bg-zinc-800/60"><td className="px-4 py-2.5 font-medium text-zinc-50">{adv.advertiser_name}</td><td className="px-4 py-2.5"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${segmentBg(adv.segment)} ${segmentColor(adv.segment)}`}>{segmentLabel(adv.segment)}</span></td><td className="px-4 py-2.5 text-right tabular-nums text-zinc-300">{adv.spend_share_pct.toFixed(1)}%</td><td className="px-4 py-2.5 text-right tabular-nums text-zinc-300">{fmt(adv.total_creatives)}</td></tr>))}</tbody></table></div>}</td></tr>}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
