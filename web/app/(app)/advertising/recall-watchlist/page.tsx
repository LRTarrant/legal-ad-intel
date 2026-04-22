import nextDynamic from "next/dynamic";
import { getSupabase } from "@/lib/supabase";
import type {
  RecallWatchlistPageData,
  ManufacturerRow,
  RecentEscalation,
  StageCounts,
} from "./recall-watchlist-client";

const RecallWatchlistClient = nextDynamic(() =>
  import("./recall-watchlist-client").then((m) => m.RecallWatchlistClient)
);

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return {
    title: "Recall Watchlist | Legal Marketing Intelligence",
    description:
      "Pre-MDL early-warning board tracking FDA device recalls, CourtListener filings, and Five-Stage Thermometer heat scoring for plaintiff firms.",
  };
}

/* ------------------------------------------------------------------ */
/*  Types (internal)                                                    */
/* ------------------------------------------------------------------ */

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

interface ManufacturerRaw {
  id: string;
  canonical_name: string;
  slug: string | null;
  domicile_state: string | null;
  country: string | null;
  parent_name: string | null;
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

/* ------------------------------------------------------------------ */
/*  Data fetchers                                                       */
/* ------------------------------------------------------------------ */

async function fetchAllRecalls(): Promise<RecallRaw[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  // Use paginated range to bypass the default 1000-row PostgREST cap.
  const pageSize = 1000;
  const all: RecallRaw[] = [];
  let from = 0;
  // Safety cap: 20k rows (current prod ~3.9k).
  while (from < 20000) {
    const { data, error } = await sb
      .from("recalls")
      .select(
        "id,manufacturer_id,product_description,product_code,recall_class,reason_for_recall,event_date_initiated,event_date_posted,status,stage,stage_label,case_count,state_count,specialty_firm_count,mdl_petition_filed,mdl_formed,first_case_filed_at,last_case_filed_at,last_scored_at"
      )
      .order("event_date_initiated", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const batch = (data ?? []) as unknown as RecallRaw[];
    all.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function fetchManufacturers(ids: string[]): Promise<ManufacturerRaw[]> {
  if (ids.length === 0) return [];
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  // Chunk to avoid URL length issues on .in()
  const chunkSize = 200;
  const all: ManufacturerRaw[] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { data, error } = await sb
      .from("recall_manufacturers")
      .select("id,canonical_name,slug,domicile_state,country,parent_name")
      .in("id", chunk);
    if (error) throw error;
    all.push(...((data ?? []) as unknown as ManufacturerRaw[]));
  }
  return all;
}

async function fetchRecentStageHistory(limit = 25): Promise<StageHistoryRaw[]> {
  const supabase = getSupabase();
  const sb = supabase as unknown as {
    from: (table: string) => ReturnType<typeof supabase.from>;
  };
  const { data, error } = await sb
    .from("recall_stage_history")
    .select(
      "id,recall_id,from_stage,to_stage,from_label,to_label,case_count_at_transition,trigger_reason,transitioned_at"
    )
    .order("transitioned_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as StageHistoryRaw[];
}

/* ------------------------------------------------------------------ */
/*  Aggregation                                                         */
/* ------------------------------------------------------------------ */

function buildPageData(
  recalls: RecallRaw[],
  mfrs: ManufacturerRaw[],
  history: StageHistoryRaw[]
): RecallWatchlistPageData {
  const mfrById = new Map(mfrs.map((m) => [m.id, m]));
  const recallById = new Map(recalls.map((r) => [r.id, r]));

  // Group recalls by manufacturer
  const byMfr = new Map<string, RecallRaw[]>();
  for (const r of recalls) {
    if (!r.manufacturer_id) continue;
    const list = byMfr.get(r.manufacturer_id) ?? [];
    list.push(r);
    byMfr.set(r.manufacturer_id, list);
  }

  const manufacturers: ManufacturerRow[] = [];
  let cold = 0;
  let warming = 0;
  let warm = 0;
  let hot = 0;
  let boiling = 0;

  for (const [mfrId, list] of byMfr.entries()) {
    const mfr = mfrById.get(mfrId);
    if (!mfr) continue;

    let maxStage = 1;
    let maxStageLabel = "Cold";
    let totalCases = 0;
    let maxStateCount = 0;
    let maxSpecialty = 0;
    let mdlPetition = false;
    let mdlFormed = false;
    let classI = 0;
    let firstCase: string | null = null;
    let lastCase: string | null = null;
    let lastScored: string | null = null;

    for (const r of list) {
      const s = r.stage ?? 1;
      if (s > maxStage) {
        maxStage = s;
        maxStageLabel = r.stage_label ?? labelForStage(s);
      }
      totalCases += r.case_count ?? 0;
      if ((r.state_count ?? 0) > maxStateCount) maxStateCount = r.state_count ?? 0;
      if ((r.specialty_firm_count ?? 0) > maxSpecialty)
        maxSpecialty = r.specialty_firm_count ?? 0;
      if (r.mdl_petition_filed) mdlPetition = true;
      if (r.mdl_formed) mdlFormed = true;
      if (r.recall_class === "Class I") classI += 1;
      if (r.first_case_filed_at) {
        if (!firstCase || r.first_case_filed_at < firstCase)
          firstCase = r.first_case_filed_at;
      }
      if (r.last_case_filed_at) {
        if (!lastCase || r.last_case_filed_at > lastCase)
          lastCase = r.last_case_filed_at;
      }
      if (r.last_scored_at) {
        if (!lastScored || r.last_scored_at > lastScored)
          lastScored = r.last_scored_at;
      }
    }

    switch (maxStage) {
      case 5:
        boiling += 1;
        break;
      case 4:
        hot += 1;
        break;
      case 3:
        warm += 1;
        break;
      case 2:
        warming += 1;
        break;
      default:
        cold += 1;
    }

    manufacturers.push({
      id: mfr.id,
      canonical_name: mfr.canonical_name,
      slug: mfr.slug,
      domicile_state: mfr.domicile_state,
      parent_name: mfr.parent_name,
      max_stage: maxStage,
      max_stage_label: maxStageLabel,
      recall_count: list.length,
      class_i_recall_count: classI,
      total_cases: totalCases,
      state_count: maxStateCount,
      specialty_firm_count: maxSpecialty,
      mdl_petition_filed: mdlPetition,
      mdl_formed: mdlFormed,
      first_case_filed_at: firstCase,
      last_case_filed_at: lastCase,
      last_scored_at: lastScored,
      recalls: list
        .slice()
        .sort((a, b) => {
          const aStage = a.stage ?? 1;
          const bStage = b.stage ?? 1;
          if (aStage !== bStage) return bStage - aStage;
          const aDate = a.event_date_initiated ?? "";
          const bDate = b.event_date_initiated ?? "";
          return bDate.localeCompare(aDate);
        })
        .slice(0, 50)
        .map((r) => ({
          id: r.id,
          product_description: r.product_description ?? "",
          product_code: r.product_code,
          recall_class: r.recall_class,
          reason_for_recall: r.reason_for_recall,
          event_date_initiated: r.event_date_initiated,
          status: r.status,
          stage: r.stage ?? 1,
          stage_label: r.stage_label ?? labelForStage(r.stage ?? 1),
          case_count: r.case_count ?? 0,
          state_count: r.state_count ?? 0,
          specialty_firm_count: r.specialty_firm_count ?? 0,
          mdl_petition_filed: r.mdl_petition_filed ?? false,
          mdl_formed: r.mdl_formed ?? false,
        })),
    });
  }

  // Sort manufacturers: stage desc, cases desc, recall count desc, name asc
  manufacturers.sort((a, b) => {
    if (b.max_stage !== a.max_stage) return b.max_stage - a.max_stage;
    if (b.total_cases !== a.total_cases) return b.total_cases - a.total_cases;
    if (b.recall_count !== a.recall_count) return b.recall_count - a.recall_count;
    return a.canonical_name.localeCompare(b.canonical_name);
  });

  const stageCounts: StageCounts = {
    total: manufacturers.length,
    cold,
    warming,
    warm,
    hot,
    boiling,
  };

  const recentEscalations: RecentEscalation[] = history
    .filter(
      (h) =>
        h.to_stage !== null &&
        h.from_stage !== null &&
        h.to_stage > h.from_stage
    )
    .map((h) => {
      const recall = recallById.get(h.recall_id);
      const mfr = recall?.manufacturer_id
        ? mfrById.get(recall.manufacturer_id)
        : null;
      return {
        id: h.id,
        recall_id: h.recall_id,
        manufacturer_id: recall?.manufacturer_id ?? null,
        manufacturer_name: mfr?.canonical_name ?? "Unknown manufacturer",
        product_description: recall?.product_description ?? "",
        recall_class: recall?.recall_class ?? null,
        from_stage: h.from_stage ?? 1,
        to_stage: h.to_stage ?? 1,
        to_label: h.to_label ?? labelForStage(h.to_stage ?? 1),
        case_count_at_transition: h.case_count_at_transition ?? 0,
        trigger_reason: h.trigger_reason,
        transitioned_at: h.transitioned_at,
      };
    });

  return {
    stageCounts,
    manufacturers,
    recentEscalations,
    totalRecalls: recalls.length,
    classIRecalls: recalls.filter((r) => r.recall_class === "Class I").length,
    generatedAt: new Date().toISOString(),
  };
}

function labelForStage(s: number): string {
  return ["Cold", "Cold", "Warming", "Warm", "Hot", "Boiling"][s] ?? "Cold";
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default async function RecallWatchlistPage() {
  const recalls = await fetchAllRecalls();
  const mfrIds = Array.from(
    new Set(recalls.map((r) => r.manufacturer_id).filter((v): v is string => !!v))
  );
  const [mfrs, history] = await Promise.all([
    fetchManufacturers(mfrIds),
    fetchRecentStageHistory(25),
  ]);

  const data = buildPageData(recalls, mfrs, history);

  return <RecallWatchlistClient data={data} />;
}
