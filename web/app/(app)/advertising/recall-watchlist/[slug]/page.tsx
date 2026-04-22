import nextDynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import type { ManufacturerDetailData } from "./manufacturer-detail-client";

const ManufacturerDetailClient = nextDynamic(() =>
  import("./manufacturer-detail-client").then((m) => m.ManufacturerDetailClient)
);

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return {
    title: `${slug.replace(/-/g, " ")} | Recall Watchlist`,
    description: `Manufacturer deep-dive for ${slug} — recall activity, stage history, and plaintiff-firm advertising signals.`,
  };
}

/* ------------------------------------------------------------------ */
/*  Internal types                                                      */
/* ------------------------------------------------------------------ */

interface ManufacturerRaw {
  id: string;
  canonical_name: string;
  slug: string | null;
  parent_name: string | null;
  domicile_state: string | null;
  country: string | null;
  website: string | null;
  aliases: string[] | null;
  notes: string | null;
}

interface RecallRaw {
  id: string;
  manufacturer_id: string | null;
  product_description: string | null;
  product_code: string | null;
  recall_class: string | null;
  reason_for_recall: string | null;
  event_date_initiated: string | null;
  event_date_posted: string | null;
  status: string | null;
  stage: number | null;
  stage_label: string | null;
  case_count: number | null;
  state_count: number | null;
  specialty_firm_count: number | null;
  mdl_petition_filed: boolean | null;
  mdl_formed: boolean | null;
  first_case_filed_at: string | null;
  last_case_filed_at: string | null;
  last_scored_at: string | null;
}

interface RecallCaseRaw {
  id: string;
  recall_id: string | null;
  case_name: string | null;
  court_id: string | null;
  court_name: string | null;
  state_code: string | null;
  case_filed_date: string | null;
  plaintiff_firm_name: string | null;
  is_specialty_firm: boolean | null;
  docket_url: string | null;
}

interface StageHistoryRaw {
  id: string;
  recall_id: string;
  from_stage: number | null;
  to_stage: number | null;
  from_label: string | null;
  to_label: string | null;
  case_count_at_transition: number | null;
  trigger_reason: string | null;
  transitioned_at: string | null;
}

interface TortMapRaw {
  tort_id: string;
  tort_slug: string;
  confidence: "high" | "medium" | "low";
  alt_slugs: string[] | null;
  notes: string | null;
}

interface MassTortRaw {
  id: string;
  slug: string;
  name: string;
  status: string | null;
  category: string | null;
}

interface SerpAggRow {
  tort_slug: string;
  result_type: string;
  count: number;
}

interface AdEventAggRow {
  mass_tort_id: string;
  platform: string | null;
  count: number;
  total_spend: number;
}

/* ------------------------------------------------------------------ */
/*  Data fetchers                                                       */
/* ------------------------------------------------------------------ */

async function fetchManufacturerBySlug(slug: string): Promise<ManufacturerRaw | null> {
  const sb = getSupabase() as unknown as {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from: (table: string) => any;
  };
  const { data, error } = await sb
    .from("recall_manufacturers")
    .select("id,canonical_name,slug,parent_name,domicile_state,country,website,aliases,notes")
    .eq("slug", slug)
    .limit(1);
  if (error) throw error;
  const rows = (data ?? []) as unknown as ManufacturerRaw[];
  return rows[0] ?? null;
}

async function fetchRecallsForMfr(mfrId: string): Promise<RecallRaw[]> {
  const sb = getSupabase() as unknown as {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from: (table: string) => any;
  };
  const { data, error } = await sb
    .from("recalls")
    .select(
      "id,manufacturer_id,product_description,product_code,recall_class,reason_for_recall,event_date_initiated,event_date_posted,status,stage,stage_label,case_count,state_count,specialty_firm_count,mdl_petition_filed,mdl_formed,first_case_filed_at,last_case_filed_at,last_scored_at"
    )
    .eq("manufacturer_id", mfrId)
    .order("event_date_initiated", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as RecallRaw[];
}

async function fetchCasesForRecalls(recallIds: string[]): Promise<RecallCaseRaw[]> {
  if (recallIds.length === 0) return [];
  const sb = getSupabase() as unknown as {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from: (table: string) => any;
  };
  const { data, error } = await sb
    .from("recall_cases")
    .select(
      "id,recall_id,case_name,court_id,court_name,state_code,case_filed_date,plaintiff_firm_name,is_specialty_firm,docket_url"
    )
    .in("recall_id", recallIds)
    .order("case_filed_date", { ascending: false, nullsFirst: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as RecallCaseRaw[];
}

async function fetchStageHistoryForRecalls(recallIds: string[]): Promise<StageHistoryRaw[]> {
  if (recallIds.length === 0) return [];
  const sb = getSupabase() as unknown as {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from: (table: string) => any;
  };
  const { data, error } = await sb
    .from("recall_stage_history")
    .select(
      "id,recall_id,from_stage,to_stage,from_label,to_label,case_count_at_transition,trigger_reason,transitioned_at"
    )
    .in("recall_id", recallIds)
    .order("transitioned_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as StageHistoryRaw[];
}

async function fetchTortMapForMfr(mfrId: string): Promise<TortMapRaw[]> {
  const sb = getSupabase() as unknown as {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from: (table: string) => any;
  };
  const { data, error } = await sb
    .from("manufacturer_tort_map")
    .select("tort_id,tort_slug,confidence,alt_slugs,notes")
    .eq("manufacturer_id", mfrId);
  if (error) throw error;
  return (data ?? []) as unknown as TortMapRaw[];
}

async function fetchMassTortsByIds(ids: string[]): Promise<MassTortRaw[]> {
  if (ids.length === 0) return [];
  const sb = getSupabase() as unknown as {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from: (table: string) => any;
  };
  const { data, error } = await sb
    .from("mass_torts")
    .select("id,slug,name,status,category")
    .in("id", ids);
  if (error) throw error;
  return (data ?? []) as unknown as MassTortRaw[];
}

async function fetchSerpAgg(slugs: string[]): Promise<SerpAggRow[]> {
  if (slugs.length === 0) return [];
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  // Fetch raw rows and aggregate client-side (PostgREST has no GROUP BY)
  const { data, error } = await sb
    .from("serp_results_normalized")
    .select("tort_slug,result_type")
    .in("tort_slug", slugs)
    .limit(10000);
  if (error) throw error;
  const rows = (data ?? []) as unknown as { tort_slug: string; result_type: string }[];
  const agg = new Map<string, number>();
  for (const r of rows) {
    const key = `${r.tort_slug}::${r.result_type}`;
    agg.set(key, (agg.get(key) ?? 0) + 1);
  }
  return Array.from(agg.entries()).map(([k, count]) => {
    const [tort_slug, result_type] = k.split("::");
    return { tort_slug, result_type, count };
  });
}

async function fetchAdEventsAgg(tortIds: string[]): Promise<AdEventAggRow[]> {
  if (tortIds.length === 0) return [];
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("ad_events")
    .select("mass_tort_id,platform,spend_estimate")
    .in("mass_tort_id", tortIds)
    .limit(10000);
  if (error) throw error;
  const rows = (data ?? []) as unknown as {
    mass_tort_id: string;
    platform: string | null;
    spend_estimate: number | null;
  }[];
  const agg = new Map<string, { count: number; spend: number }>();
  for (const r of rows) {
    const key = `${r.mass_tort_id}::${r.platform ?? "unknown"}`;
    const cur = agg.get(key) ?? { count: 0, spend: 0 };
    cur.count += 1;
    cur.spend += Number(r.spend_estimate ?? 0);
    agg.set(key, cur);
  }
  return Array.from(agg.entries()).map(([k, v]) => {
    const [mass_tort_id, platform] = k.split("::");
    return {
      mass_tort_id,
      platform,
      count: v.count,
      total_spend: v.spend,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Build page data                                                     */
/* ------------------------------------------------------------------ */

function stageLabelFor(s: number): string {
  return ["Cold", "Cold", "Warming", "Warm", "Hot", "Boiling"][s] ?? "Cold";
}

function buildDetailData(params: {
  mfr: ManufacturerRaw;
  recalls: RecallRaw[];
  cases: RecallCaseRaw[];
  history: StageHistoryRaw[];
  tortMap: TortMapRaw[];
  masstorts: MassTortRaw[];
  serpAgg: SerpAggRow[];
  adEventsAgg: AdEventAggRow[];
}): ManufacturerDetailData {
  const { mfr, recalls, cases, history, tortMap, masstorts, serpAgg, adEventsAgg } = params;

  // Aggregate across all recalls
  let maxStage = 1;
  let maxStageLabel = "Cold";
  let totalCases = cases.length;
  let statesSet = new Set<string>();
  let specialtyCount = 0;
  let mdlPetition = false;
  let mdlFormed = false;
  let firstCase: string | null = null;
  let lastCase: string | null = null;

  for (const r of recalls) {
    const s = r.stage ?? 1;
    if (s > maxStage) {
      maxStage = s;
      maxStageLabel = r.stage_label ?? stageLabelFor(s);
    }
    if (r.mdl_petition_filed) mdlPetition = true;
    if (r.mdl_formed) mdlFormed = true;
  }
  for (const c of cases) {
    if (c.state_code) statesSet.add(c.state_code);
    if (c.is_specialty_firm) specialtyCount += 1;
    if (c.case_filed_date) {
      if (!firstCase || c.case_filed_date < firstCase) firstCase = c.case_filed_date;
      if (!lastCase || c.case_filed_date > lastCase) lastCase = c.case_filed_date;
    }
  }

  const mtById = new Map(masstorts.map((t) => [t.id, t]));

  // Build linked-tort rows (high/medium primary, low related)
  const linkedTorts = tortMap
    .map((m) => {
      const t = mtById.get(m.tort_id);
      if (!t) return null;

      // SERP metrics (try canonical slug + all alt_slugs)
      const serpSlugs = [t.slug, ...(m.alt_slugs ?? [])];
      let serpOrganic = 0;
      let serpPaid = 0;
      for (const row of serpAgg) {
        if (!serpSlugs.includes(row.tort_slug)) continue;
        if (row.result_type === "organic") serpOrganic += row.count;
        else if (row.result_type === "paid") serpPaid += row.count;
      }

      // Ad events metrics (by tort_id)
      let adEventCount = 0;
      let adEventSpend = 0;
      const platforms = new Map<string, number>();
      for (const row of adEventsAgg) {
        if (row.mass_tort_id !== m.tort_id) continue;
        adEventCount += row.count;
        adEventSpend += row.total_spend;
        if (row.platform) {
          platforms.set(row.platform, (platforms.get(row.platform) ?? 0) + row.count);
        }
      }

      return {
        tort_id: t.id,
        tort_slug: t.slug,
        tort_name: t.name,
        tort_status: t.status,
        confidence: m.confidence,
        notes: m.notes,
        serp_organic: serpOrganic,
        serp_paid: serpPaid,
        ad_event_count: adEventCount,
        ad_event_spend: adEventSpend,
        platforms: Array.from(platforms.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => {
      const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return order[a.confidence] - order[b.confidence];
    });

  // Recalls sorted by stage desc then date desc
  const sortedRecalls = recalls
    .slice()
    .sort((a, b) => {
      const aStage = a.stage ?? 1;
      const bStage = b.stage ?? 1;
      if (aStage !== bStage) return bStage - aStage;
      return (b.event_date_initiated ?? "").localeCompare(a.event_date_initiated ?? "");
    })
    .map((r) => ({
      id: r.id,
      product_description: r.product_description ?? "",
      product_code: r.product_code,
      recall_class: r.recall_class,
      reason_for_recall: r.reason_for_recall,
      event_date_initiated: r.event_date_initiated,
      status: r.status,
      stage: r.stage ?? 1,
      stage_label: r.stage_label ?? stageLabelFor(r.stage ?? 1),
      case_count: r.case_count ?? 0,
      state_count: r.state_count ?? 0,
      specialty_firm_count: r.specialty_firm_count ?? 0,
      mdl_petition_filed: r.mdl_petition_filed ?? false,
      mdl_formed: r.mdl_formed ?? false,
    }));

  const sortedCases = cases.slice(0, 100).map((c) => ({
    id: c.id,
    case_name: c.case_name,
    court_name: c.court_name,
    state_code: c.state_code,
    case_filed_date: c.case_filed_date,
    plaintiff_firm_name: c.plaintiff_firm_name,
    is_specialty_firm: c.is_specialty_firm ?? false,
    docket_url: c.docket_url,
  }));

  const sortedHistory = history
    .slice()
    .sort((a, b) => (b.transitioned_at ?? "").localeCompare(a.transitioned_at ?? ""))
    .map((h) => ({
      id: h.id,
      recall_id: h.recall_id,
      from_stage: h.from_stage ?? 1,
      to_stage: h.to_stage ?? 1,
      from_label: h.from_label ?? stageLabelFor(h.from_stage ?? 1),
      to_label: h.to_label ?? stageLabelFor(h.to_stage ?? 1),
      trigger_reason: h.trigger_reason,
      transitioned_at: h.transitioned_at,
      case_count_at_transition: h.case_count_at_transition ?? 0,
    }));

  return {
    mfr: {
      id: mfr.id,
      canonical_name: mfr.canonical_name,
      slug: mfr.slug,
      parent_name: mfr.parent_name,
      domicile_state: mfr.domicile_state,
      country: mfr.country,
      website: mfr.website,
      aliases: mfr.aliases ?? [],
      notes: mfr.notes,
    },
    kpis: {
      max_stage: maxStage,
      max_stage_label: maxStageLabel,
      total_recalls: recalls.length,
      class_i_recalls: recalls.filter((r) => r.recall_class === "Class I").length,
      total_cases: totalCases,
      state_count: statesSet.size,
      specialty_firm_count: specialtyCount,
      mdl_petition_filed: mdlPetition,
      mdl_formed: mdlFormed,
      first_case_filed_at: firstCase,
      last_case_filed_at: lastCase,
    },
    linked_torts: linkedTorts,
    recalls: sortedRecalls,
    cases: sortedCases,
    stage_history: sortedHistory,
    generated_at: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default async function ManufacturerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mfr = await fetchManufacturerBySlug(slug);
  if (!mfr) notFound();

  const recalls = await fetchRecallsForMfr(mfr.id);
  const recallIds = recalls.map((r) => r.id);

  const [cases, history, tortMap] = await Promise.all([
    fetchCasesForRecalls(recallIds),
    fetchStageHistoryForRecalls(recallIds),
    fetchTortMapForMfr(mfr.id),
  ]);

  const tortIds = tortMap.map((m) => m.tort_id);
  const [masstorts] = await Promise.all([fetchMassTortsByIds(tortIds)]);

  // Gather all slugs (canonical + alt) for SERP query
  const allSlugs = new Set<string>();
  for (const t of masstorts) allSlugs.add(t.slug);
  for (const m of tortMap) for (const s of m.alt_slugs ?? []) allSlugs.add(s);

  const [serpAgg, adEventsAgg] = await Promise.all([
    fetchSerpAgg(Array.from(allSlugs)),
    fetchAdEventsAgg(tortIds),
  ]);

  const data = buildDetailData({
    mfr,
    recalls,
    cases,
    history,
    tortMap,
    masstorts,
    serpAgg,
    adEventsAgg,
  });

  return <ManufacturerDetailClient data={data} />;
}
