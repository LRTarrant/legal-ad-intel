import { getSupabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type MdlDevelopmentRow =
  Database["public"]["Tables"]["mdl_developments"]["Row"];

export type MdlDevelopment = {
  id: string;
  mdl_number: number;
  title: string;
  summary: string | null;
  source_name: string | null;
  source_url: string | null;
  event_date: string;
  event_type: string;
  created_at: string | null;
};

export async function getMdlDevelopments(
  mdlNumber: number
): Promise<MdlDevelopment[]> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("mdl_developments")
      .select(
        "id, mdl_number, title, summary, source_name, source_url, event_date, event_type, created_at"
      )
      .eq("mdl_number", mdlNumber)
      .order("event_date", { ascending: false })
      .throwOnError();

    return (data ?? []) as MdlDevelopmentRow[];
  } catch {
    return [];
  }
}

export async function getAllDevelopments(): Promise<MdlDevelopment[]> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("mdl_developments")
      .select(
        "id, mdl_number, title, summary, source_name, source_url, event_date, event_type, created_at"
      )
      .order("event_date", { ascending: false })
      .throwOnError();

    return (data ?? []) as MdlDevelopmentRow[];
  } catch {
    return [];
  }
}

export async function getLatestDevelopments(
  limit = 5
): Promise<MdlDevelopment[]> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("mdl_developments")
      .select(
        "id, mdl_number, title, summary, source_name, source_url, event_date, event_type, created_at"
      )
      .order("event_date", { ascending: false })
      .limit(limit)
      .throwOnError();

    return (data ?? []) as MdlDevelopmentRow[];
  } catch {
    return [];
  }
}
