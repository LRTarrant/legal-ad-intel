import { getSupabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type JpmlSnapshotRow = Database["public"]["Tables"]["jpml_snapshots"]["Row"];

export interface JpmlSnapshot {
  id: string;
  report_date: string;
  mdl_number: number;
  case_name: string;
  jpml_type: string;
  transferee_judge: string | null;
  district: string | null;
  master_docket: string | null;
  date_filed: string | null;
  date_transferred: string | null;
  date_closed: string | null;
}

export interface JpmlTypeSummary {
  report_date: string;
  mdl_type: string;
  mdl_count: number;
  pct_of_total: number | null;
  total_active_mdls: number;
}

/**
 * Fetch distinct JPML report dates from summaries, newest first.
 */
export async function getJpmlReportDates(): Promise<string[]> {
  const supabase = getSupabase();

  const { data } = await supabase
    .from("jpml_type_summaries")
    .select("report_date")
    .order("report_date", { ascending: false })
    .throwOnError();

  const uniqueDates = new Set<string>();
  for (const row of data ?? []) {
    const date = (row as { report_date: string | null }).report_date;
    if (date) uniqueDates.add(date);
  }

  return Array.from(uniqueDates);
}

/**
 * Get the most recent report_date available in jpml_snapshots.
 */
export async function getLatestReportDate(): Promise<string | null> {
  const supabase = getSupabase();

  const { data } = await supabase
    .from("jpml_snapshots")
    .select("report_date")
    .order("report_date", { ascending: false })
    .limit(1)
    .throwOnError();

  const rows = (data ?? []) as Pick<JpmlSnapshotRow, "report_date">[];
  return rows[0]?.report_date ?? null;
}

/**
 * Fetch all JPML snapshots for a given report date.
 * Defaults to the latest report date if none is provided.
 */
export async function getJpmlSnapshots(
  reportDate?: string
): Promise<JpmlSnapshot[]> {
  const supabase = getSupabase();
  const date = reportDate ?? (await getLatestReportDate());
  if (!date) return [];

  const { data } = await supabase
    .from("jpml_snapshots")
    .select(
      "id, report_date, mdl_number, case_name, jpml_type, transferee_judge, district, master_docket, date_filed, date_transferred, date_closed"
    )
    .eq("report_date", date)
    .order("mdl_number", { ascending: true })
    .throwOnError();

  return (data ?? []) as JpmlSnapshot[];
}

/**
 * Fetch JPML snapshots filtered by type for a given report date.
 */
export async function getJpmlSnapshotsByType(
  jpmlType: string,
  reportDate?: string
): Promise<JpmlSnapshot[]> {
  const supabase = getSupabase();
  const date = reportDate ?? (await getLatestReportDate());
  if (!date) return [];

  const { data } = await supabase
    .from("jpml_snapshots")
    .select(
      "id, report_date, mdl_number, case_name, jpml_type, transferee_judge, district, master_docket, date_filed, date_transferred, date_closed"
    )
    .eq("report_date", date)
    .eq("jpml_type", jpmlType)
    .order("mdl_number", { ascending: true })
    .throwOnError();

  return (data ?? []) as JpmlSnapshot[];
}

/**
 * Fetch type summaries for a given report date.
 */
export async function getJpmlTypeSummaries(
  reportDate?: string | null
): Promise<JpmlTypeSummary[]> {
  const supabase = getSupabase();
  const date = reportDate ?? (await getLatestReportDate());
  if (!date) return [];

  const { data } = await supabase
    .from("jpml_type_summaries")
    .select("report_date, mdl_type, mdl_count, pct_of_total, total_active_mdls")
    .eq("report_date", date)
    .order("mdl_count", { ascending: false })
    .throwOnError();

  return (data ?? []) as JpmlTypeSummary[];
}

/**
 * Look up the JPML type for a specific MDL number.
 * Uses the most recent report date by default.
 * Returns the jpml_type string or null if not found.
 */
export async function getJpmlTypeForMdl(
  mdlNumber: number,
  reportDate?: string
): Promise<string | null> {
  const supabase = getSupabase();
  const date = reportDate ?? (await getLatestReportDate());
  if (!date) return null;

  const { data } = await supabase
    .from("jpml_snapshots")
    .select("jpml_type")
    .eq("mdl_number", mdlNumber)
    .eq("report_date", date)
    .maybeSingle()
    .throwOnError();

  const row = data as Pick<JpmlSnapshotRow, "jpml_type"> | null;
  return row?.jpml_type ?? null;
}

/**
 * Bulk-fetch JPML types for multiple MDL numbers (for joining into MDL tracker).
 * Returns a Map of mdl_number -> jpml_type.
 */
export async function getJpmlTypesForMdls(
  mdlNumbers: number[],
  reportDate?: string
): Promise<Map<number, string>> {
  const supabase = getSupabase();
  if (mdlNumbers.length === 0) return new Map();

  const date = reportDate ?? (await getLatestReportDate());
  if (!date) return new Map();

  const { data } = await supabase
    .from("jpml_snapshots")
    .select("mdl_number, jpml_type")
    .eq("report_date", date)
    .in("mdl_number", mdlNumbers)
    .throwOnError();

  const rows = (data ?? []) as Pick<
    JpmlSnapshotRow,
    "mdl_number" | "jpml_type"
  >[];
  const map = new Map<number, string>();
  for (const row of rows) {
    map.set(row.mdl_number, row.jpml_type);
  }
  return map;
}
