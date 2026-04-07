import { getSupabase } from "@/lib/supabase";

export interface JpmlTypeSummary {
  report_date: string;
  mdl_type: string;
  mdl_count: number;
  pct_of_total: number;
  total_active_mdls: number;
}

export async function getLatestReportDate(): Promise<string | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("jpml_type_summaries")
    .select("report_date")
    .order("report_date", { ascending: false })
    .limit(1)
    .throwOnError();

  const rows = (data ?? []) as { report_date: string }[];
  return rows[0]?.report_date ?? null;
}

export async function getJpmlTypeSummaries(
  reportDate?: string | null
): Promise<JpmlTypeSummary[]> {
  const supabase = getSupabase();
  const date = reportDate ?? (await getLatestReportDate());

  if (!date) {
    return [];
  }

  const { data } = await supabase
    .from("jpml_type_summaries")
    .select("report_date, mdl_type, mdl_count, pct_of_total, total_active_mdls")
    .eq("report_date", date)
    .order("mdl_count", { ascending: false })
    .throwOnError();

  return (data ?? []) as JpmlTypeSummary[];
}
