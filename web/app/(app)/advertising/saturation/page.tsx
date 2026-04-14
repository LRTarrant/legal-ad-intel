import {
  getAdSaturationWindowed,
  getSegmentSummary,
  getTopAdvertisersBySegment,
  getTorts,
  getAdvertiserCompetitiveSummary,
  getAdvertiserPlatforms,
  type AdSaturationRow,
  type AdvertiserCompetitiveSummary,
  type SegmentSummary,
  type TopAdvertiserBySegment,
} from "@/lib/queries";
import { AdSaturationClient } from "./ad-saturation-client";
import { TimeWindowSelector } from "./_components/TimeWindowSelector";
import { PlatformFilter } from "./_components/PlatformFilter";
import { StateFilter } from "./_components/StateFilter";
import { computeDateRange } from "./_components/time-window-utils";
import { Suspense } from "react";
import { Radio } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ad Saturation | Legal Marketing Intelligence",
};

const ALL_FILTER_KEY = "__all__";

export default async function AdSaturationPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string; from?: string; to?: string; platform?: string; states?: string }>;
}) {
  const sp = await searchParams;
  const { windowStart, windowEnd } = computeDateRange(sp.window, sp.from, sp.to);
  const activePlatform = sp.platform || "all";
  const sourceFilter = activePlatform === "all" ? undefined : activePlatform;

  // Parse states param: comma-separated abbreviations
  const selectedStates = sp.states
    ? sp.states.split(",").filter(Boolean)
    : [];

  const [windowedData, torts, allSegments, allTopAdvertisers, allCompetitiveSummary, advertiserPlatforms] = await Promise.all([
    getAdSaturationWindowed(windowStart, windowEnd, undefined, undefined, sourceFilter),
    getTorts(),
    getSegmentSummary(undefined, sourceFilter),
    getTopAdvertisersBySegment(undefined, 25, sourceFilter),
    getAdvertiserCompetitiveSummary(undefined, undefined, sourceFilter),
    getAdvertiserPlatforms(),
  ]);

  // Map windowed rows to AdSaturationRow shape for the client component
  const allData: AdSaturationRow[] = windowedData.map((row, i) => ({
    id: `${row.tort_id}:${row.geo_target_id}`,
    tort_id: row.tort_id,
    geo_target_id: row.geo_target_id,
    tort_slug: row.tort_slug,
    tort_label: row.tort_label,
    tort_category: row.tort_category,
    geo_type: row.geo_type ?? "",
    geo_code: row.geo_code ?? "",
    geo_name: row.geo_name,
    state_abbr: row.state_abbr,
    geo_population: row.geo_population,
    period_start: windowStart,
    period_end: windowEnd,
    total_advertisers: row.total_advertisers,
    total_creatives: row.total_creatives,
    total_observations: row.total_observations,
    estimated_spend: row.estimated_spend,
    estimated_impressions: null,
    saturation_score: row.saturation_score,
    spend_rank: i + 1,
    format_breakdown: null,
    top_advertisers: null,
    computed_at: new Date().toISOString(),
  }));

  const segmentSummaryByTort: Record<string, SegmentSummary[]> = {
    [ALL_FILTER_KEY]: allSegments,
  };
  const topAdvertisersByTort: Record<string, TopAdvertiserBySegment[]> = {
    [ALL_FILTER_KEY]: allTopAdvertisers,
  };
  const competitiveSummaryByFilter: Record<string, AdvertiserCompetitiveSummary[]> = {
    [ALL_FILTER_KEY]: allCompetitiveSummary,
  };

  const byTortResults = await Promise.all(
    torts.map(async (tort) => ({
      slug: tort.slug,
      segments: await getSegmentSummary(tort.slug, sourceFilter),
      advertisers: await getTopAdvertisersBySegment(tort.slug, 25, sourceFilter),
    }))
  );
  byTortResults.forEach((result) => {
    segmentSummaryByTort[result.slug] = result.segments;
    topAdvertisersByTort[result.slug] = result.advertisers;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Radio className="h-6 w-6 text-purple-400" />
          Ad Saturation
        </h1>
        <div className="mt-2 flex flex-wrap items-start gap-4">
          <Suspense fallback={null}>
            <PlatformFilter active={activePlatform} />
          </Suspense>
          <Suspense fallback={null}>
            <StateFilter />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={null}>
        <TimeWindowSelector />
      </Suspense>

      <AdSaturationClient
        allData={allData}
        torts={torts}
        segmentSummaryByTort={segmentSummaryByTort}
        topAdvertisersByTort={topAdvertisersByTort}
        initialCompetitiveSummary={competitiveSummaryByFilter[ALL_FILTER_KEY]}
        advertiserPlatforms={advertiserPlatforms}
        selectedStates={selectedStates}
        activePlatform={activePlatform}
      />
    </div>
  );
}
