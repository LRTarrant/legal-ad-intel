import { getSupabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { getJpmlTypesForMdls } from "./jpml";

export type MdlRow = Database["public"]["Tables"]["mdls"]["Row"];
type MdlStatsRow = Database["public"]["Tables"]["mdl_stats_monthly"]["Row"];

export interface MdlTrendPoint {
  stats_month: string;
  pending_actions: number;
  pending_actions_change: number | null;
}

export interface MdlSummaryRow {
  id: string;
  mdl_number: number;
  title: string;
  district: string | null;
  judge_name: string | null;
  court: string | null;
  status: string | null;
  pending_actions: number;
  mom_change: number;
  trend: "up" | "down" | "flat";
  latest_report_date: string | null;
  source_url: string | null;
  jpml_type?: string | null;
}

export interface MdlTotals {
  total_active_mdls: number;
  total_pending_actions: number;
  latest_report_date: string | null;
}

export interface MdlReportDateOption {
  stats_month: string;
}

function isActiveStatus(status: string | null): boolean {
  return status == null || status.trim().toLowerCase() !== "closed";
}

function deriveLatestAndPrevious(
  snapshots: MdlStatsRow[]
): { latest: MdlStatsRow | null; previous: MdlStatsRow | null } {
  const sorted = [...snapshots].sort((a, b) =>
    b.stats_month.localeCompare(a.stats_month)
  );

  return {
    latest: sorted[0] ?? null,
    previous: sorted[1] ?? null,
  };
}

async function loadMdlData() {
  const supabase = getSupabase();

  const [{ data: mdls }, { data: stats }] = await Promise.all([
    supabase
      .from("mdls")
      .select("id, mdl_number, title, district, judge_name, court, status")
      .throwOnError(),
    supabase
      .from("mdl_stats_monthly")
      .select(
        "id, mdl_id, stats_month, pending_actions, pending_actions_change, source_url"
      )
      .order("stats_month", { ascending: false })
      .throwOnError(),
  ]);

  return {
    mdls: (mdls ?? []) as Pick<
      MdlRow,
      "id" | "mdl_number" | "title" | "district" | "judge_name" | "court" | "status"
    >[],
    stats: (stats ?? []) as Pick<
      MdlStatsRow,
      | "id"
      | "mdl_id"
      | "stats_month"
      | "pending_actions"
      | "pending_actions_change"
      | "source_url"
    >[],
  };
}

function normalizeReportDate(reportDate?: string | null): string | null {
  return reportDate?.trim() || null;
}

export async function getMdlSummary(
  reportDate?: string | null
): Promise<MdlSummaryRow[]> {
  const { mdls, stats } = await loadMdlData();
  const statsByMdlId = new Map<string, MdlStatsRow[]>();
  const normalizedReportDate = normalizeReportDate(reportDate);

  for (const snapshot of stats) {
    const existing = statsByMdlId.get(snapshot.mdl_id) ?? [];
    existing.push(snapshot as MdlStatsRow);
    statsByMdlId.set(snapshot.mdl_id, existing);
  }

  return mdls
    .map((mdl) => {
      const mdlSnapshots = statsByMdlId.get(mdl.id) ?? [];
      const filteredSnapshots = normalizedReportDate
        ? mdlSnapshots.filter((snapshot) => snapshot.stats_month <= normalizedReportDate)
        : mdlSnapshots;
      const { latest, previous } = deriveLatestAndPrevious(
        filteredSnapshots as MdlStatsRow[]
      );
      const latestPending = latest?.pending_actions ?? 0;
      const previousPending = previous?.pending_actions;
      const momChange =
        previousPending != null
          ? latestPending - previousPending
          : (latest?.pending_actions_change ?? 0);
      const trend: MdlSummaryRow["trend"] =
        (momChange ?? 0) > 0
          ? "up"
          : (momChange ?? 0) < 0
            ? "down"
            : "flat";

      return {
        id: mdl.id,
        mdl_number: mdl.mdl_number,
        title: mdl.title,
        district: mdl.district,
        judge_name: mdl.judge_name,
        court: mdl.court,
        status: mdl.status,
        pending_actions: latestPending ?? 0,
        mom_change: momChange ?? 0,
        trend,
        latest_report_date: latest?.stats_month ?? null,
        source_url: latest?.source_url ?? null,
      };
    })
    .filter((row) => row.latest_report_date != null)
    .sort((a, b) => b.pending_actions - a.pending_actions);
}

export async function getMdlTrend(mdlNumber: number): Promise<MdlTrendPoint[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("mdls")
    .select("id")
    .eq("mdl_number", mdlNumber)
    .maybeSingle()
    .throwOnError();
  const mdl = data as Pick<MdlRow, "id"> | null;

  if (!mdl) {
    return [];
  }

  const { data: stats } = await supabase
    .from("mdl_stats_monthly")
    .select("stats_month, pending_actions, pending_actions_change")
    .eq("mdl_id", mdl.id)
    .order("stats_month", { ascending: true })
    .throwOnError();

  return ((stats ?? []) as Pick<
    MdlStatsRow,
    "stats_month" | "pending_actions" | "pending_actions_change"
  >[]).map((row) => ({
    stats_month: row.stats_month,
    pending_actions: row.pending_actions ?? 0,
    pending_actions_change: row.pending_actions_change ?? null,
  }));
}

export async function getMdlTotals(
  reportDate?: string | null
): Promise<MdlTotals> {
  const summary = await getMdlSummary(reportDate);

  return {
    total_active_mdls: summary.filter((row) => isActiveStatus(row.status)).length,
    total_pending_actions: summary.reduce(
      (sum, row) => sum + row.pending_actions,
      0
    ),
    latest_report_date: summary.reduce<string | null>((latest, row) => {
      if (!row.latest_report_date) {
        return latest;
      }

      if (!latest || row.latest_report_date > latest) {
        return row.latest_report_date;
      }

      return latest;
    }, null),
  };
}

export async function getMdlReportDates(): Promise<MdlReportDateOption[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("mdl_stats_monthly")
    .select("stats_month")
    .order("stats_month", { ascending: false })
    .throwOnError();

  const seen = new Set<string>();
  const dates: MdlReportDateOption[] = [];

  for (const row of (data ?? []) as Pick<MdlStatsRow, "stats_month">[]) {
    if (!seen.has(row.stats_month)) {
      seen.add(row.stats_month);
      dates.push({ stats_month: row.stats_month });
    }
  }

  return dates;
}

/**
 * Enrich an array of MdlSummaryRows with jpml_type from the JPML snapshots table.
 * Returns new array with jpml_type populated where a match exists.
 */
export async function enrichMdlSummaryWithJpmlType(
  rows: MdlSummaryRow[]
): Promise<MdlSummaryRow[]> {
  const mdlNumbers = rows.map((r) => r.mdl_number);
  const jpmlTypes = await getJpmlTypesForMdls(mdlNumbers);

  return rows.map((row) => ({
    ...row,
    jpml_type: jpmlTypes.get(row.mdl_number) ?? null,
  }));
}

/**
 * Fetch a single MDL row by its mdl_number.
 * Returns null if not found.
 */
export async function getMdlByNumber(mdlNumber: number): Promise<MdlRow | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("mdls")
    .select("*")
    .eq("mdl_number", mdlNumber)
    .maybeSingle()
    .throwOnError();

  return (data as MdlRow | null) ?? null;
}

/**
 * Resolve the tort advertising page slug for a given MDL.
 * Joins mdls → mass_torts to get the tort name, then fuzzy-matches
 * against the `torts` table (which drives advertising pages).
 * Returns the slug or null if no match is found.
 */
export async function getTortSlugForMdl(
  massTortId: string | null
): Promise<string | null> {
  if (!massTortId) return null;

  const supabase = getSupabase();

  // Get the mass tort name/slug
  const { data: massTort } = await supabase
    .from("mass_torts")
    .select("slug, name")
    .eq("id", massTortId)
    .maybeSingle()
    .throwOnError();

  if (!massTort) return null;

  const mt = massTort as { slug: string; name: string };

  // Get all torts and find the best match
  const { data: torts } = await supabase
    .from("torts")
    .select("slug, label")
    .throwOnError();

  if (!torts || torts.length === 0) return null;

  const mtNameLower = mt.name.toLowerCase();
  const mtSlugNorm = mt.slug.replace(/-/g, "_");
  // Extract significant words (4+ chars) from the mass tort name
  const mtWords = mtNameLower.split(/[\s\/,]+/).filter((w) => w.length > 3);

  for (const t of torts as { slug: string; label: string }[]) {
    const tLabelLower = t.label.toLowerCase();
    // Exact slug match (normalize hyphens to underscores)
    if (t.slug === mtSlugNorm) return t.slug;
    // Name/label containment
    if (tLabelLower.includes(mtNameLower) || mtNameLower.includes(tLabelLower)) return t.slug;
    // Significant word overlap
    const tWords = tLabelLower.split(/[\s\/,]+/).filter((w) => w.length > 3);
    const overlap = mtWords.some((w) => tWords.includes(w));
    if (overlap) return t.slug;
  }

  return null;
}
