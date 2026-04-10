import {
  getAdSaturationSummary,
  getSegmentSummary,
  getTopAdvertisersBySegment,
  getTorts,
  getAdvertiserCompetitiveSummary,
  type AdvertiserCompetitiveSummary,
  type SegmentSummary,
  type TopAdvertiserBySegment,
} from "@/lib/queries";
import { AdSaturationClient } from "./ad-saturation-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ad Saturation | Legal Marketing Intelligence",
};

const ALL_FILTER_KEY = "__all__";

export default async function AdSaturationPage() {
  const [allData, torts, allSegments, allTopAdvertisers, allCompetitiveSummary] = await Promise.all([
    getAdSaturationSummary({ limit: 500 }),
    getTorts(),
    getSegmentSummary(),
    getTopAdvertisersBySegment(undefined, 25),
    getAdvertiserCompetitiveSummary(),
  ]);

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
      segments: await getSegmentSummary(tort.slug),
      advertisers: await getTopAdvertisersBySegment(tort.slug, 25),
    }))
  );

  byTortResults.forEach((result) => {
    segmentSummaryByTort[result.slug] = result.segments;
    topAdvertisersByTort[result.slug] = result.advertisers;
  });

  return (
    <AdSaturationClient
      allData={allData}
      torts={torts}
      segmentSummaryByTort={segmentSummaryByTort}
      topAdvertisersByTort={topAdvertisersByTort}
      initialCompetitiveSummary={competitiveSummaryByFilter[ALL_FILTER_KEY]}
    />
  );
}
