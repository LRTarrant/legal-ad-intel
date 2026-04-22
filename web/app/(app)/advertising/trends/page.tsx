import nextDynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/server";
import { RelatedQueries } from "./_components/RelatedQueries";
import { TortSelector } from "./_components/TortSelector";

const TrendLineChart = nextDynamic(() => import("./_components/TrendLineChart").then((m) => m.TrendLineChart));

const RegionalMap = nextDynamic(() => import("./_components/RegionalMap").then((m) => m.RegionalMap));

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Google Trends | Legal Marketing Intelligence",
};

async function getTorts() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("torts")
    .select("id, slug, label")
    .order("label");
  return data ?? [];
}

async function getTrendData(tortSlug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("google_trends_observations")
    .select("keyword, data_type, region_code, region_name, period_label, interest_value, observed_at")
    .eq("tort_slug", tortSlug)
    .order("observed_at", { ascending: false })
    .limit(5000);
  return data ?? [];
}

async function getRelatedQueries(tortSlug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("google_trends_related_queries")
    .select("query_type, position, query_text, display_value, extracted_value")
    .eq("tort_slug", tortSlug)
    .order("observed_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export default async function GoogleTrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ tort?: string }>;
}) {
  const sp = await searchParams;
  const torts = await getTorts();
  const activeTort = sp.tort || torts[0]?.slug || "camp_lejeune";

  const [allData, relatedData] = await Promise.all([
    getTrendData(activeTort),
    getRelatedQueries(activeTort),
  ]);

  /**
   * Parse the start date from a period_label like "Apr 6 – 12, 2025".
   * For year-spanning ranges (e.g. "Dec 29 – Jan 4, 2025"), the trailing
   * year belongs to the end date, so the Dec start date is the prior year.
   */
  function parsePeriodStart(label: string): number {
    const m = label.match(/^(\w{3})\s+(\d{1,2})\s*[–-].*?,\s*(\d{4})$/);
    if (!m) return 0;
    const [, mon, day, yearStr] = m;
    let year = parseInt(yearStr, 10);
    // If the label starts with Dec but the year-end belongs to a Jan end-date,
    // the Dec date is actually in the previous year.
    if (mon === "Dec" && label.match(/[–-]\s*Jan/)) {
      year -= 1;
    }
    return new Date(`${mon} ${day}, ${year}`).getTime();
  }

  const timeseriesData = allData
    .filter((r) => r.data_type === "timeseries")
    .sort((a, b) => parsePeriodStart(a.period_label ?? "") - parsePeriodStart(b.period_label ?? ""));

  const geoDataUS = allData.filter((r) => r.data_type === "geo_map_us");

  // Deduplicate related queries — keep only most recent per query_text
  const topQueries = relatedData
    .filter((r: any) => r.query_type === "top")
    .filter((r: any, i: number, arr: any[]) => arr.findIndex((a: any) => a.query_text === r.query_text) === i)
    .slice(0, 25);
  const risingQueries = relatedData
    .filter((r: any) => r.query_type === "rising")
    .filter((r: any, i: number, arr: any[]) => arr.findIndex((a: any) => a.query_text === r.query_text) === i)
    .slice(0, 25);

  const activeTortLabel = torts.find((t) => t.slug === activeTort)?.label ?? activeTort;

  const hasData = allData.length > 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Google Trends</h1>
        <p className="text-sm text-zinc-400">
          Search interest over time and regional breakdown for tort-related keywords.
        </p>
      </div>

      {/* Tort Selector */}
      <TortSelector torts={torts} activeTort={activeTort} />

      {!hasData && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
          <p className="text-zinc-400 text-sm">
            No data yet for <span className="text-zinc-200 font-medium">{activeTortLabel}</span>.
            Run the Google Trends pipeline to populate data.
          </p>
        </div>
      )}

      {hasData && (
        <>
          {/* Trend Line Chart */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <h2 className="text-sm font-medium text-zinc-300 mb-4">
              Interest Over Time &mdash; <span className="text-purple-400">{activeTortLabel}</span>
            </h2>
            <TrendLineChart data={timeseriesData} />
          </div>

          {/* State-Level Regional Interest */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <h2 className="text-sm font-medium text-zinc-300 mb-4">
              State-Level Interest &mdash; <span className="text-purple-400">{activeTortLabel}</span>
            </h2>
            <RegionalMap data={geoDataUS} />
          </div>

          {/* Related Queries */}
          <div>
            <h2 className="text-sm font-medium text-zinc-300 mb-4">
              Related Queries &mdash; <span className="text-purple-400">{activeTortLabel}</span>
            </h2>
            <RelatedQueries topQueries={topQueries} risingQueries={risingQueries} />
          </div>
        </>
      )}
    </div>
  );
}
