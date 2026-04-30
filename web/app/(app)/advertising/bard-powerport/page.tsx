import nextDynamic from "next/dynamic";
import { getSupabase } from "@/lib/supabase";
import type { BardPowerPortPageData } from "./bard-powerport-client";

const BardPowerPortClient = nextDynamic(() => import("./bard-powerport-client").then((m) => m.BardPowerPortClient));
import { AskAIPanel } from "../../components/ask-ai-panel";
import {
  getSegmentSummary,
  getTopAdvertisersBySegment,
  getAdvertiserPlatforms,
  getAdSaturationWindowed,
  getTortCostBenchmarks,
  getSerpVisibilityWindowed,
  getSerpTopResults,
  getSampleAds,
} from "@/lib/queries";
import { getJudicialProfiles, type JudicialProfileRow } from "@/lib/queries/judicial";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return {
    title:
      "Bard PowerPort Catheter (MDL 3081) Tort Intelligence | Legal Marketing Intelligence",
    description:
      "Advertising intelligence brief for Bard PowerPort catheter litigation — FDA adverse event data, Chronoflex material failure timeline, bellwether schedule, cancer incidence signals, and geographic targeting for plaintiff firms.",
  };
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const TORT_SLUG = "bard_powerport";

/* ------------------------------------------------------------------ */
/*  Data-fetching helpers                                               */
/* ------------------------------------------------------------------ */

interface BardAdverseEventRow {
  id: number;
  category: string;
  detail: string;
  severity: string;
  source: string;
  year: number;
}

interface BardBellwetherRow {
  id: number;
  trial_number: number;
  case_name: string;
  injury_type: string;
  trial_date: string;
  status: string;
}

interface BardDeviceFailureTimelineRow {
  id: number;
  event_date: string;
  event: string;
  significance: string;
  is_future: boolean;
}

interface CancerIncidenceRow {
  state: string;
  incidence_rate: string;
  average_annual_count: string;
  cancer_site: string;
}

interface CancerIncidenceAggregated {
  state: string;
  avg_incidence_rate: number;
  total_annual_cases: number;
}

async function fetchBardAdverseEvents(): Promise<BardAdverseEventRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("bard_adverse_events")
    .select("id,category,detail,severity,source,year");

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    id: Number(d.id),
    category: String(d.category),
    detail: String(d.detail),
    severity: String(d.severity),
    source: String(d.source),
    year: Number(d.year) || 0,
  }));
}

async function fetchBardBellwetherSchedule(): Promise<BardBellwetherRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("bard_bellwether_schedule")
    .select("id,trial_number,case_name,injury_type,trial_date,status")
    .order("trial_number", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    id: Number(d.id),
    trial_number: Number(d.trial_number),
    case_name: String(d.case_name),
    injury_type: String(d.injury_type),
    trial_date: String(d.trial_date),
    status: String(d.status),
  }));
}

async function fetchBardDeviceFailureTimeline(): Promise<BardDeviceFailureTimelineRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("bard_device_failure_timeline")
    .select("id,event_date,event,significance,is_future");

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    id: Number(d.id),
    event_date: String(d.event_date),
    event: String(d.event),
    significance: String(d.significance),
    is_future: Boolean(d.is_future),
  }));
}

async function fetchCancerIncidenceByState(): Promise<CancerIncidenceAggregated[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          range: (from: number, to: number) => Promise<{ data: unknown[] | null; error: unknown }>;
        };
      };
    };
  };

  // Fetch all rows where cancer_site = 'All Cancer Sites'
  // Table has 22,617 rows total, so we need to paginate
  const allRows: Record<string, unknown>[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await sb
      .from("cancer_incidence")
      .select("state,incidence_rate,average_annual_count,cancer_site")
      .eq("cancer_site", "All Cancer Sites")
      .range(from, from + pageSize - 1);

    if (error) throw error;
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    allRows.push(...rows);
    hasMore = rows.length === pageSize;
    from += pageSize;
  }

  // Aggregate by state in JavaScript
  const stateMap: Record<string, { rates: number[]; cases: number[] }> = {};
  for (const row of allRows) {
    const state = String(row.state ?? "");
    if (!state) continue;
    const rate = Number(row.incidence_rate) || 0;
    const count = Number(row.average_annual_count) || 0;
    if (!stateMap[state]) stateMap[state] = { rates: [], cases: [] };
    if (rate > 0) stateMap[state].rates.push(rate);
    stateMap[state].cases.push(count);
  }

  const aggregated: CancerIncidenceAggregated[] = [];
  for (const [state, vals] of Object.entries(stateMap)) {
    if (vals.rates.length === 0) continue;
    const avgRate = vals.rates.reduce((a, b) => a + b, 0) / vals.rates.length;
    const totalCases = vals.cases.reduce((a, b) => a + b, 0);
    aggregated.push({
      state,
      avg_incidence_rate: Math.round(avgRate * 10) / 10,
      total_annual_cases: Math.round(totalCases),
    });
  }

  return aggregated.sort((a, b) => b.avg_incidence_rate - a.avg_incidence_rate);
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                      */
/* ------------------------------------------------------------------ */

export default async function BardPowerPortPage() {
  let adverseEvents: BardAdverseEventRow[] = [];
  let bellwetherSchedule: BardBellwetherRow[] = [];
  let deviceFailureTimeline: BardDeviceFailureTimelineRow[] = [];
  let cancerIncidence: CancerIncidenceAggregated[] = [];
  let judicialRows: JudicialProfileRow[] = [];

  /* -- Supabase data (Promise.allSettled -- resilient) --------------- */
  const results = await Promise.allSettled([
    fetchBardAdverseEvents(),
    fetchBardBellwetherSchedule(),
    fetchBardDeviceFailureTimeline(),
    fetchCancerIncidenceByState(),
    getJudicialProfiles(),
  ]);

  if (results[0].status === "fulfilled") adverseEvents = results[0].value;
  else console.error("[BardPowerPort] fetchBardAdverseEvents failed:", results[0].reason);

  if (results[1].status === "fulfilled") bellwetherSchedule = results[1].value;
  else console.error("[BardPowerPort] fetchBardBellwetherSchedule failed:", results[1].reason);

  if (results[2].status === "fulfilled") deviceFailureTimeline = results[2].value;
  else console.error("[BardPowerPort] fetchBardDeviceFailureTimeline failed:", results[2].reason);

  if (results[3].status === "fulfilled") cancerIncidence = results[3].value;
  else console.error("[BardPowerPort] fetchCancerIncidenceByState failed:", results[3].reason);

  if (results[4].status === "fulfilled") judicialRows = results[4].value;
  else console.error("[BardPowerPort] fetchJudicialProfiles failed:", results[4].reason);

  /* -- Advertising data (standard query helpers) --------------------- */
  const now = new Date();
  const windowEnd = now.toISOString().slice(0, 10);
  const windowStartDate = new Date(now);
  windowStartDate.setDate(windowStartDate.getDate() - 90);
  const windowStart = windowStartDate.toISOString().slice(0, 10);

  const [segments, topAdvertisers, platforms, saturation, benchmarks, serpVisibility, serpResults, sampleAds] =
    await Promise.all([
      getSegmentSummary(TORT_SLUG),
      getTopAdvertisersBySegment(TORT_SLUG, 25),
      getAdvertiserPlatforms(TORT_SLUG),
      getAdSaturationWindowed(windowStart, windowEnd, TORT_SLUG),
      getTortCostBenchmarks(),
      getSerpVisibilityWindowed(windowStart, windowEnd, TORT_SLUG),
      getSerpTopResults(TORT_SLUG, 5),
      getSampleAds(TORT_SLUG, 12),
    ]);

  /* -- Aggregate advertising stats ---------------------------------- */
  const platformMap = new Map<string, string[]>();
  for (const p of platforms) {
    if (p.advertiser_name) {
      platformMap.set(p.advertiser_name, p.platforms);
    }
  }
  const totalAdvertisers = segments.reduce((s, r) => s + r.advertiser_count, 0);
  const totalSpend = segments.reduce((s, r) => s + r.total_spend, 0);
  const totalCreatives = segments.reduce((s, r) => s + r.total_creatives, 0);
  const allPlatforms = new Set<string>();
  for (const p of platforms) {
    for (const plat of p.platforms) allPlatforms.add(plat);
  }
  const topMarkets = [...saturation]
    .sort((a, b) => (b.saturation_score ?? 0) - (a.saturation_score ?? 0))
    .slice(0, 10);

  const tortLabel = "Bard PowerPort";
  const tortLabelLower = tortLabel.toLowerCase();
  const benchmark = benchmarks
    .sort((a, b) => b.observed_date.localeCompare(a.observed_date))
    .find((b) => {
      const bName = b.tort_name.toLowerCase();
      if (bName === tortLabelLower) return true;
      if (bName.includes("bard") || bName.includes("powerport")) return true;
      return false;
    }) ?? null;

  const hasLiveData = totalAdvertisers > 0 || totalSpend > 0 || totalCreatives > 0;

  /* -- Judicial aggregation by state -------------------------------- */
  const judicialByState: Record<string, { counties: number; profiles: Record<string, number> }> = {};
  for (const j of judicialRows) {
    if (!judicialByState[j.state]) {
      judicialByState[j.state] = { counties: 0, profiles: {} };
    }
    judicialByState[j.state].counties++;
    judicialByState[j.state].profiles[j.judicial_profile] =
      (judicialByState[j.state].profiles[j.judicial_profile] || 0) + 1;
  }

  /* -- Build page data for client ----------------------------------- */
  const pageData: BardPowerPortPageData = {
    adverseEvents,
    bellwetherSchedule,
    deviceFailureTimeline,
    cancerIncidenceTop15: cancerIncidence.slice(0, 15),
    judicialByState,
    // advertising data
    segments,
    topAdvertisers,
    platformMap: Object.fromEntries(platformMap),
    totalAdvertisers,
    totalSpend,
    totalCreatives,
    allPlatforms: Array.from(allPlatforms).sort(),
    topMarkets,
    benchmark,
    hasLiveData,
    serpVisibility,
    serpResults,
    sampleAds,
  };

  const topCancerStates = cancerIncidence
    .slice(0, 5)
    .map((s) => `${s.state} (${s.avg_incidence_rate})`)
    .join(", ");

  return (
    <>
      <BardPowerPortClient data={pageData} />
      <AskAIPanel
        tortContext={{
          tortName: "Bard PowerPort Catheter (MDL 3081)",
          injury: "Catheter fracture, fragment migration to heart/lungs, pulmonary embolism, cardiac perforation, infection, deep vein thrombosis, death",
          mdlNumber: "MDL 3081, D. Ariz. (Judge David G. Campbell)",
          pendingCases: "3,044 as of April 2026",
          settlementRange: "$50K–$500K+ per plaintiff depending on injury severity. No settlements yet — first bellwether April 21, 2026",
          estimatedCPA: "TBD — bellwether phase beginning",
          bellwetherDate: "April 21, 2026 (Cook v. BD — infection case). Six bellwethers through February 2027.",
          caseSummary: "Plaintiffs allege Bard PowerPort catheters made with Chronoflex polyurethane tubing become brittle over time, causing catheter fractures. Fractured fragments migrate to heart, lungs, and other organs requiring emergency surgical extraction or causing death. Device entered market via 510(k) clearance with no clinical trials. Barium sulfate additive accelerates material degradation. BD knew of risks but continued marketing.",
          qualification: "Patient who had a Bard PowerPort (or Bard PowerPort MRI) implanted and experienced catheter fracture, migration, blood clots, infection, device malfunction requiring surgical removal, or injury/death from fragment embolization. Must have medical records documenting device implantation and injury.",
          advertisingLandscape: `Active advertisers: ${totalAdvertisers}. Estimated spend: $${totalSpend > 0 ? (totalSpend / 1000).toFixed(0) + "K" : "N/A"}. Platforms: ${allPlatforms.size > 0 ? Array.from(allPlatforms).join(", ") : "data collection in progress"}.`,
          targetingInsights: `Top cancer incidence states (PowerPort patient pools): ${topCancerStates}. Key metros: Phoenix AZ (MDL venue), NYC, Houston (MD Anderson), Chicago, LA, Miami, Philadelphia. Primary demographic: cancer patients/survivors aged 40–75 who underwent chemotherapy with an implanted port catheter.`,
        }}
      />
    </>
  );
}
