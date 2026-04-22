import nextDynamic from "next/dynamic";
import { getSupabase } from "@/lib/supabase";
import type { UberSexualAssaultPageData } from "./uber-sexual-assault-client";

const UberSexualAssaultClient = nextDynamic(() => import("./uber-sexual-assault-client").then((m) => m.UberSexualAssaultClient));
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
      "Uber Sexual Assault (MDL 3084) Tort Intelligence | Legal Marketing Intelligence",
    description:
      "Uber passenger sexual assault litigation intelligence — MDL 3084 case data, rideshare penetration signals, safety reporting gaps, regulatory stringency, and advertising landscape.",
  };
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const TORT_SLUG = "uber_sexual_assault";

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

interface UberSafetyGapRow {
  report_period: string;
  public_disclosed_incidents: number;
  internal_reports_estimated: number;
}

interface RideshareRegulatoryRow {
  state: string;
  background_check_type: string;
  fingerprint_required: boolean;
  independent_review: boolean;
  sol_adult_sexual_assault_years: number;
  sol_notes: string | null;
}

interface MdlFilingConcentrationRow {
  state: string;
  estimated_plaintiff_count: number;
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

async function fetchUberSafetyGap(): Promise<UberSafetyGapRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("uber_safety_gap")
    .select("report_period,public_disclosed_incidents,internal_reports_estimated")
    .order("report_period", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    report_period: String(d.report_period),
    public_disclosed_incidents: Number(d.public_disclosed_incidents) || 0,
    internal_reports_estimated: Number(d.internal_reports_estimated) || 0,
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

async function fetchMdlFilingConcentration(): Promise<MdlFilingConcentrationRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("uber_mdl_filing_concentration")
    .select("state,estimated_plaintiff_count")
    .order("estimated_plaintiff_count", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    state: String(d.state),
    estimated_plaintiff_count: Number(d.estimated_plaintiff_count) || 0,
  }));
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                      */
/* ------------------------------------------------------------------ */

export default async function UberSexualAssaultPage() {
  let sexualAssaultRates: SexualAssaultRateRow[] = [];
  let ridesharePenetration: RidesharePenetrationRow[] = [];
  let uberSafetyGap: UberSafetyGapRow[] = [];
  let rideshareRegulatory: RideshareRegulatoryRow[] = [];
  let mdlFilingConcentration: MdlFilingConcentrationRow[] = [];
  let judicialRows: JudicialProfileRow[] = [];

  /* -- Supabase data (Promise.allSettled -- resilient) --------------- */
  const results = await Promise.allSettled([
    fetchSexualAssaultRates(),
    fetchRidesharePenetration(),
    fetchUberSafetyGap(),
    fetchRideshareRegulatory(),
    fetchMdlFilingConcentration(),
    getJudicialProfiles(),
  ]);

  if (results[0].status === "fulfilled") sexualAssaultRates = results[0].value;
  else console.error("[Uber] fetchSexualAssaultRates failed:", results[0].reason);

  if (results[1].status === "fulfilled") ridesharePenetration = results[1].value;
  else console.error("[Uber] fetchRidesharePenetration failed:", results[1].reason);

  if (results[2].status === "fulfilled") uberSafetyGap = results[2].value;
  else console.error("[Uber] fetchUberSafetyGap failed:", results[2].reason);

  if (results[3].status === "fulfilled") rideshareRegulatory = results[3].value;
  else console.error("[Uber] fetchRideshareRegulatory failed:", results[3].reason);

  if (results[4].status === "fulfilled") mdlFilingConcentration = results[4].value;
  else console.error("[Uber] fetchMdlFilingConcentration failed:", results[4].reason);

  if (results[5].status === "fulfilled") judicialRows = results[5].value;
  else console.error("[Uber] fetchJudicialProfiles failed:", results[5].reason);

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

  const tortLabel = "Uber Sexual Assault";
  const tortLabelLower = tortLabel.toLowerCase();
  const benchmark = benchmarks
    .sort((a, b) => b.observed_date.localeCompare(a.observed_date))
    .find((b) => {
      const bName = b.tort_name.toLowerCase();
      if (bName === tortLabelLower) return true;
      if (bName.includes("uber") || bName.includes("rideshare")) return true;
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
  const pageData: UberSexualAssaultPageData = {
    sexualAssaultRates,
    ridesharePenetrationTop15: ridesharePenetration,
    uberSafetyGap,
    rideshareRegulatory,
    mdlFilingConcentration,
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
      <UberSexualAssaultClient data={pageData} />
      <AskAIPanel
        tortContext={{
          tortName: "Uber Sexual Assault (MDL 3084)",
          injury: "Sexual assault, rape, and sexual misconduct by Uber drivers against passengers",
          mdlNumber: "MDL 3084, N.D. Cal. (Judge Charles Breyer)",
          pendingCases: "~3,391 plaintiffs in 30 states plus 500+ in California state court (April 2026)",
          settlementRange: "$50,000 - $1,000,000 per case. First bellwether verdict: $8.5M to Jaylynn Dean (Feb 2026)",
          estimatedCPA: "TBD — active MDL with growing case count and significant settlement pressure",
          bellwetherDate: "First bellwether verdict: February 5, 2026 ($8.5M)",
          caseSummary: "Plaintiffs allege Uber's inadequate background checks (name-based, not fingerprint), concealed safety data (400,181 internal reports vs 12,522 publicly disclosed), and failure to implement safety features enabled driver-on-passenger sexual assaults. The 'common carrier' classification is being litigated to establish elevated duty of care.",
          qualification: "Uber or rideshare passenger who was sexually assaulted, raped, or subjected to sexual misconduct by a driver. Documented police report or medical records strengthen the claim. Both past and recent incidents may qualify depending on state statute of limitations.",
          advertisingLandscape: `Active advertisers: ${totalAdvertisers}. Estimated spend: $${totalSpend > 0 ? (totalSpend / 1000).toFixed(0) + "K" : "N/A"}. Platforms: ${allPlatforms.size > 0 ? Array.from(allPlatforms).join(", ") : "data collection in progress"}.`,
          targetingInsights: `Top sexual assault rate states: ${topAssaultStates}. Top rideshare penetration states: ${topPenetrationStates}. Key signals: sexual assault rates, rideshare market penetration, Uber safety reporting gaps, regulatory stringency, statute of limitations windows.`,
        }}
      />
    </>
  );
}
