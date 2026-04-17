import { getSupabase } from "@/lib/supabase";
import { LyftSexualAssaultClient, type LyftSexualAssaultPageData } from "./lyft-sexual-assault-client";
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
      "Lyft Sexual Assault (MDL 3171) Tort Intelligence | Legal Marketing Intelligence",
    description:
      "Lyft passenger sexual assault litigation intelligence — MDL 3171 case data, safety reporting gaps, account sharing vulnerabilities, regulatory analysis, and advertising landscape.",
  };
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const TORT_SLUG = "lyft_sexual_assault";

/* ------------------------------------------------------------------ */
/*  Data-fetching helpers                                               */
/* ------------------------------------------------------------------ */

interface SexualAssaultRateRow {
  state: string;
  rape_rate_per_100k: number;
  total_rapes_2024: number;
}

interface RidesharePenetrationRow {
  state: string;
  rideshare_market_share_pct: number;
  top_metros: string;
}

interface LyftSafetyGapRow {
  report_period: string;
  total_rides_billions: number;
  total_sexual_assaults: number;
  non_consensual_penetration: number;
  categories_reported: number;
  total_raliance_categories: number;
  assault_rate_per_million_rides: number;
}

interface LyftAccountSharingRow {
  category: string;
  detail: string;
  severity: string;
  source: string;
  year: number;
}

interface RideshareRegulatoryRow {
  state: string;
  background_check_type: string;
  fingerprint_required: boolean;
  independent_review: boolean;
  sol_adult_sexual_assault_years: number;
  sol_notes: string | null;
}

async function fetchSexualAssaultRates(): Promise<SexualAssaultRateRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("sexual_assault_rates")
    .select("state,rape_rate_per_100k,total_rapes_2024");

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    state: String(d.state),
    rape_rate_per_100k: Number(d.rape_rate_per_100k) || 0,
    total_rapes_2024: Number(d.total_rapes_2024) || 0,
  }));
}

async function fetchRidesharePenetration(): Promise<RidesharePenetrationRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("rideshare_penetration")
    .select("state,rideshare_market_share_pct,top_metros")
    .order("rideshare_market_share_pct", { ascending: false })
    .limit(15);

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    state: String(d.state),
    rideshare_market_share_pct: Number(d.rideshare_market_share_pct) || 0,
    top_metros: String(d.top_metros ?? ""),
  }));
}

async function fetchLyftSafetyGap(): Promise<LyftSafetyGapRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("lyft_safety_gap")
    .select("report_period,total_rides_billions,total_sexual_assaults,non_consensual_penetration,categories_reported,total_raliance_categories,assault_rate_per_million_rides")
    .order("report_period", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    report_period: String(d.report_period),
    total_rides_billions: Number(d.total_rides_billions) || 0,
    total_sexual_assaults: Number(d.total_sexual_assaults) || 0,
    non_consensual_penetration: Number(d.non_consensual_penetration) || 0,
    categories_reported: Number(d.categories_reported) || 0,
    total_raliance_categories: Number(d.total_raliance_categories) || 0,
    assault_rate_per_million_rides: Number(d.assault_rate_per_million_rides) || 0,
  }));
}

async function fetchLyftAccountSharing(): Promise<LyftAccountSharingRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("lyft_account_sharing")
    .select("category,detail,severity,source,year");

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    category: String(d.category),
    detail: String(d.detail),
    severity: String(d.severity),
    source: String(d.source),
    year: Number(d.year) || 0,
  }));
}

async function fetchRideshareRegulatory(): Promise<RideshareRegulatoryRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("rideshare_regulatory")
    .select("state,background_check_type,fingerprint_required,independent_review,sol_adult_sexual_assault_years,sol_notes");

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    state: String(d.state),
    background_check_type: String(d.background_check_type),
    fingerprint_required: Boolean(d.fingerprint_required),
    independent_review: Boolean(d.independent_review),
    sol_adult_sexual_assault_years: Number(d.sol_adult_sexual_assault_years),
    sol_notes: d.sol_notes != null ? String(d.sol_notes) : null,
  }));
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                      */
/* ------------------------------------------------------------------ */

export default async function LyftSexualAssaultPage() {
  let sexualAssaultRates: SexualAssaultRateRow[] = [];
  let ridesharePenetration: RidesharePenetrationRow[] = [];
  let lyftSafetyGap: LyftSafetyGapRow[] = [];
  let lyftAccountSharing: LyftAccountSharingRow[] = [];
  let rideshareRegulatory: RideshareRegulatoryRow[] = [];
  let judicialRows: JudicialProfileRow[] = [];

  /* -- Supabase data (Promise.allSettled -- resilient) --------------- */
  const results = await Promise.allSettled([
    fetchSexualAssaultRates(),
    fetchRidesharePenetration(),
    fetchLyftSafetyGap(),
    fetchLyftAccountSharing(),
    fetchRideshareRegulatory(),
    getJudicialProfiles(),
  ]);

  if (results[0].status === "fulfilled") sexualAssaultRates = results[0].value;
  else console.error("[Lyft] fetchSexualAssaultRates failed:", results[0].reason);

  if (results[1].status === "fulfilled") ridesharePenetration = results[1].value;
  else console.error("[Lyft] fetchRidesharePenetration failed:", results[1].reason);

  if (results[2].status === "fulfilled") lyftSafetyGap = results[2].value;
  else console.error("[Lyft] fetchLyftSafetyGap failed:", results[2].reason);

  if (results[3].status === "fulfilled") lyftAccountSharing = results[3].value;
  else console.error("[Lyft] fetchLyftAccountSharing failed:", results[3].reason);

  if (results[4].status === "fulfilled") rideshareRegulatory = results[4].value;
  else console.error("[Lyft] fetchRideshareRegulatory failed:", results[4].reason);

  if (results[5].status === "fulfilled") judicialRows = results[5].value;
  else console.error("[Lyft] fetchJudicialProfiles failed:", results[5].reason);

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

  const tortLabel = "Lyft Sexual Assault";
  const tortLabelLower = tortLabel.toLowerCase();
  const benchmark = benchmarks
    .sort((a, b) => b.observed_date.localeCompare(a.observed_date))
    .find((b) => {
      const bName = b.tort_name.toLowerCase();
      if (bName === tortLabelLower) return true;
      if (bName.includes("lyft") || bName.includes("rideshare")) return true;
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
  const pageData: LyftSexualAssaultPageData = {
    sexualAssaultRates,
    ridesharePenetrationTop15: ridesharePenetration,
    lyftSafetyGap,
    lyftAccountSharing,
    rideshareRegulatory,
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

  const topAssaultStates = [...sexualAssaultRates]
    .sort((a, b) => b.rape_rate_per_100k - a.rape_rate_per_100k)
    .slice(0, 5)
    .map((s) => `${s.state} (${s.rape_rate_per_100k}/100K)`)
    .join(", ");
  const topPenetrationStates = ridesharePenetration
    .slice(0, 5)
    .map((s) => `${s.state} (${s.rideshare_market_share_pct}%)`)
    .join(", ");

  return (
    <>
      <LyftSexualAssaultClient data={pageData} />
      <AskAIPanel
        tortContext={{
          tortName: "Lyft Passenger Sexual Assault (MDL 3171)",
          injury: "Sexual assault, rape, and sexual misconduct by Lyft drivers against passengers",
          mdlNumber: "MDL 3171, N.D. Cal. (Judge Rita F. Lin)",
          pendingCases: "35+ federal MDL cases as of April 2026 (growing rapidly — started with 17)",
          settlementRange: "$500,000 - $5,000,000+ per case. No Lyft-specific settlements yet; Uber $8.5M bellwether sets benchmark",
          estimatedCPA: "TBD — new MDL with minimal advertising competition",
          bellwetherDate: "TBD — plaintiff leadership committee appointed April 2, 2026",
          caseSummary: "Plaintiffs allege Lyft's inadequate background checks, failure to prevent account sharing/driver impersonation, failure to respond to complaints, and refusal to implement safety features enabled driver-on-passenger sexual assaults. Lyft reported only 5 of 21 RALIANCE categories, masking the true scope of incidents.",
          qualification: "Lyft passenger who was sexually assaulted, raped, or subjected to sexual misconduct by a driver. Documented police report or medical records strengthen the claim. Both past and recent incidents may qualify depending on state statute of limitations.",
          advertisingLandscape: `Active advertisers: ${totalAdvertisers}. Estimated spend: $${totalSpend > 0 ? (totalSpend / 1000).toFixed(0) + "K" : "N/A"}. Platforms: ${allPlatforms.size > 0 ? Array.from(allPlatforms).join(", ") : "data collection in progress"}.`,
          targetingInsights: `Top sexual assault rate states: ${topAssaultStates}. Top rideshare penetration states: ${topPenetrationStates}. Key signals: sexual assault rates, rideshare market penetration, Lyft safety reporting gaps, account sharing vulnerabilities, regulatory stringency, statute of limitations windows.`,
        }}
      />
    </>
  );
}
