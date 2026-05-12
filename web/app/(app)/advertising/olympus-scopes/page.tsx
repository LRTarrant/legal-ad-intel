import nextDynamic from "next/dynamic";
import { getSupabase } from "@/lib/supabase";
import type { OlympusScopesPageData } from "./olympus-scopes-client";

const OlympusScopesClient = nextDynamic(() => import("./olympus-scopes-client").then((m) => m.OlympusScopesClient));
import { AskAIPanel } from "../../components/ask-ai-panel";
import { NewLandingPagesCard } from "../../components/new-landing-pages-card";
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
      "Olympus Scopes (Pre-MDL) Tort Intelligence | Legal Marketing Intelligence",
    description:
      "Advertising intelligence brief for the emerging Olympus duodenoscope, bronchoscope, and endoscope-accessory infection litigation — FDA recall history, Urgent Field Safety Notice timeline, ERCP/bronchoscopy volume signals, hospital-outbreak geography, and qualification criteria for plaintiff firms.",
  };
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const TORT_SLUG = "olympus_scopes";

/* ------------------------------------------------------------------ */
/*  Data-fetching helpers                                               */
/* ------------------------------------------------------------------ */

interface OlympusAdverseEventRow {
  id: number;
  category: string;
  detail: string;
  severity: string;
  source: string;
  year: number;
}

interface OlympusDeviceFailureTimelineRow {
  id: number;
  event_date: string;
  event: string;
  significance: string;
  is_future: boolean;
}

interface OlympusQualifyingTierRow {
  id: number;
  tier: string;
  label: string;
  criteria: string;
  intake_signal: string;
  estimated_cpl_band: string;
  notes: string;
}

interface OlympusSettlementProjectionRow {
  id: number;
  injury_tier: string;
  low_estimate: number;
  high_estimate: number;
  comparable_litigation: string;
  rationale: string;
}

interface ErcpVolumeRow {
  state: string;
  annual_ercp_estimate: number;
  rank: number;
}

async function fetchOlympusAdverseEvents(): Promise<OlympusAdverseEventRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("olympus_adverse_events")
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

async function fetchOlympusDeviceFailureTimeline(): Promise<OlympusDeviceFailureTimelineRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("olympus_device_failure_timeline")
    .select("id,event_date,event,significance,is_future")
    .order("id", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    id: Number(d.id),
    event_date: String(d.event_date),
    event: String(d.event),
    significance: String(d.significance),
    is_future: Boolean(d.is_future),
  }));
}

async function fetchOlympusQualifyingTiers(): Promise<OlympusQualifyingTierRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("olympus_qualifying_criteria_tiers")
    .select("id,tier,label,criteria,intake_signal,estimated_cpl_band,notes")
    .order("id", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    id: Number(d.id),
    tier: String(d.tier),
    label: String(d.label),
    criteria: String(d.criteria),
    intake_signal: String(d.intake_signal),
    estimated_cpl_band: String(d.estimated_cpl_band),
    notes: String(d.notes ?? ""),
  }));
}

async function fetchOlympusSettlementProjections(): Promise<OlympusSettlementProjectionRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("olympus_settlement_projections")
    .select("id,injury_tier,low_estimate,high_estimate,comparable_litigation,rationale")
    .order("id", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    id: Number(d.id),
    injury_tier: String(d.injury_tier),
    low_estimate: Number(d.low_estimate) || 0,
    high_estimate: Number(d.high_estimate) || 0,
    comparable_litigation: String(d.comparable_litigation),
    rationale: String(d.rationale),
  }));
}

async function fetchErcpVolumeByState(): Promise<ErcpVolumeRow[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("olympus_ercp_volume_by_state")
    .select("state,annual_ercp_estimate,rank")
    .order("rank", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((d) => ({
    state: String(d.state),
    annual_ercp_estimate: Number(d.annual_ercp_estimate) || 0,
    rank: Number(d.rank) || 0,
  }));
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                      */
/* ------------------------------------------------------------------ */

export default async function OlympusScopesPage() {
  let adverseEvents: OlympusAdverseEventRow[] = [];
  let deviceFailureTimeline: OlympusDeviceFailureTimelineRow[] = [];
  let qualifyingTiers: OlympusQualifyingTierRow[] = [];
  let settlementProjections: OlympusSettlementProjectionRow[] = [];
  let ercpVolume: ErcpVolumeRow[] = [];
  let judicialRows: JudicialProfileRow[] = [];

  /* -- Supabase data (Promise.allSettled -- resilient) --------------- */
  const results = await Promise.allSettled([
    fetchOlympusAdverseEvents(),
    fetchOlympusDeviceFailureTimeline(),
    fetchOlympusQualifyingTiers(),
    fetchOlympusSettlementProjections(),
    fetchErcpVolumeByState(),
    getJudicialProfiles(),
  ]);

  if (results[0].status === "fulfilled") adverseEvents = results[0].value;
  else console.error("[OlympusScopes] fetchOlympusAdverseEvents failed:", results[0].reason);

  if (results[1].status === "fulfilled") deviceFailureTimeline = results[1].value;
  else console.error("[OlympusScopes] fetchOlympusDeviceFailureTimeline failed:", results[1].reason);

  if (results[2].status === "fulfilled") qualifyingTiers = results[2].value;
  else console.error("[OlympusScopes] fetchOlympusQualifyingTiers failed:", results[2].reason);

  if (results[3].status === "fulfilled") settlementProjections = results[3].value;
  else console.error("[OlympusScopes] fetchOlympusSettlementProjections failed:", results[3].reason);

  if (results[4].status === "fulfilled") ercpVolume = results[4].value;
  else console.error("[OlympusScopes] fetchErcpVolumeByState failed:", results[4].reason);

  if (results[5].status === "fulfilled") judicialRows = results[5].value;
  else console.error("[OlympusScopes] fetchJudicialProfiles failed:", results[5].reason);

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

  const tortLabel = "Olympus Scopes";
  const tortLabelLower = tortLabel.toLowerCase();
  const benchmark = benchmarks
    .sort((a, b) => b.observed_date.localeCompare(a.observed_date))
    .find((b) => {
      const bName = b.tort_name.toLowerCase();
      if (bName === tortLabelLower) return true;
      if (bName.includes("olympus") || bName.includes("duodenoscope") || bName.includes("endoscope")) return true;
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
  const pageData: OlympusScopesPageData = {
    adverseEvents,
    deviceFailureTimeline,
    qualifyingTiers,
    settlementProjections,
    ercpVolumeTop15: ercpVolume.slice(0, 15),
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

  const topErcpStates = ercpVolume
    .slice(0, 5)
    .map((s) => `${s.state} (~${s.annual_ercp_estimate.toLocaleString()} ERCPs/yr)`)
    .join(", ");

  return (
    <>
      <OlympusScopesClient data={pageData} />
      <NewLandingPagesCard tortSlug="olympus-scopes" tortLabel="Olympus Scopes" />
      <AskAIPanel
        tortContext={{
          tortName: "Olympus Scopes (pre-MDL)",
          injury:
            "CRE and other drug-resistant bacterial infections, sepsis, organ failure, prolonged hospitalization with IV antibiotics, airway burns from bronchoscope-laser fires, fragment injuries from ViziShot 2 FLEX needle breakage, death. Some filings also cite HIV and TB exposure.",
          mdlNumber: "No MDL yet — cases being filed individually in federal and state courts as of April 2026",
          pendingCases:
            "Unknown/low hundreds publicly reported. 2018 Japan Times figure (~50 duodenoscope cases) is outdated; momentum has accelerated materially after the June 2025 FDA import alert on 58 Olympus devices and the October 2025 Urgent Field Safety Notice.",
          settlementRange:
            "Pre-MDL — no benchmark settlements in this round. Early 2017 Virginia Mason verdict: $6.6M (with hospital comparative fault). Historical confidential Olympus settlements reported (Shawver, Bigler, Warner). Analogous duodenoscope/hospital-infection cases have ranged $50K–$2M+ depending on injury severity, with death and CRE-sepsis cases at the top.",
          estimatedCPA:
            "No reliable benchmark yet — very early tort. Early-mover firms should expect wide CPL variance. Notice-of-exposure intakes (patients who received a hospital letter) are the cleanest, cheapest signal; generic 'scope infection' queries will produce heavy unqualified volume.",
          bellwetherDate:
            "None scheduled. No MDL consolidation. Watch JPML filings and MTMP Spring 2026 Olympus session (March 2026) for law-firm coordination signals.",
          caseSummary:
            "Plaintiffs allege Olympus duodenoscopes (TJF-Q180V, TJF-Q190V, TJF-Q290V, TJF-Q170V), the MAJ-891 forceps/irrigation plug, the ViziShot 2 FLEX aspiration needle, and certain laser-compatible bronchoscopes have design and warning defects that allow bacterial contamination to persist between patients even when manufacturer reprocessing instructions are followed. Core theories: defective design of the elevator mechanism, failure to warn, fraudulent concealment (reinforced by the 2018 $85M DOJ plea), and negligence. Renewed momentum from the June 2025 FDA import alert on 58 Olympus devices, the October 2025 Urgent Field Safety Notice acknowledging two deaths and five serious injuries on TJF models between 2024 and 2025, and the September 2025 Class I recall of ViziShot 2 FLEX.",
          qualification:
            "Patient who had an endoscopic procedure (ERCP, bronchoscopy, EUS, enteroscopy, gastroscopy, colonoscopy) involving an Olympus scope or accessory since 2015, AND: (a) developed a drug-resistant bacterial infection (CRE, Pseudomonas, Klebsiella, E. coli) within 30 days, (b) was hospitalized with IV antibiotics for sepsis/organ failure within 30 days, (c) received a notice of exposure from a hospital or (d) suffered physical injury from device breakage (ViziShot fragment, bronchoscope airway burn, distal-cover detachment). Required documentation: procedure record identifying the Olympus device or hospital, culture/pathology results identifying the infectious organism, hospital discharge summary, death certificate if applicable.",
          advertisingLandscape: `Active advertisers: ${totalAdvertisers}. Estimated spend: $${totalSpend > 0 ? (totalSpend / 1000).toFixed(0) + "K" : "N/A"}. Platforms: ${allPlatforms.size > 0 ? Array.from(allPlatforms).join(", ") : "data collection in progress"}. Field is still thin — TorHoerman, Motley Rice, Levin Papantonio, Anapol Weiss, Robert King Law publicly investigating. Opportunity window is wide.`,
          targetingInsights: `Top ERCP-volume states (duodenoscope patient pools): ${topErcpStates}. Hospital-outbreak geography (historical CRE clusters tied to Olympus scopes): Seattle WA (Virginia Mason), Los Angeles CA (UCLA, Cedars-Sinai), Hartford CT, Pittsburgh PA (UPMC), Chicago IL, Boston MA. Primary demographic: adults 45+ who underwent ERCP, EUS, or bronchoscopy at an academic medical center since 2015, especially post-procedure sepsis hospitalizations. Secondary: families of deceased hospital-infection patients (wrongful death). High-value signal: patients who received an 'exposure notification letter' from their hospital — these convert cleanest.`,
        }}
      />
    </>
  );
}
