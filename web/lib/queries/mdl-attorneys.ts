import { getSupabase } from "@/lib/supabase";

export interface MdlFirmSummary {
  firm_name: string;
  attorney_count: number;
  party_count: number;
  attorneys: string[];
  sample_parties: string[];
  roles: string[];
}

export interface MdlAttorneyScorecard {
  total_firms: number;
  total_attorneys: number;
  total_parties: number;
  plaintiff_firms: number;
}

export async function getMdlFirmSummary(
  mdlNumber: number
): Promise<MdlFirmSummary[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabase() as any;
  const { data, error } = await supabase.rpc("get_mdl_firm_summary", {
    p_mdl_number: mdlNumber,
  });
  if (error) throw new Error(`Failed to fetch firm summary: ${error.message}`);
  return (data ?? []) as MdlFirmSummary[];
}

export async function getMdlAttorneyScorecard(
  mdlNumber: number
): Promise<MdlAttorneyScorecard | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabase() as any;
  const { data, error } = await supabase.rpc("get_mdl_attorney_scorecard", {
    p_mdl_number: mdlNumber,
  });
  if (error)
    throw new Error(`Failed to fetch attorney scorecard: ${error.message}`);
  const rows = data as MdlAttorneyScorecard[] | null;
  return rows && rows.length > 0 ? rows[0] : null;
}

export async function hasMdlAttorneyData(
  mdlNumber: number
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabase() as any;
  const { count, error } = await supabase
    .from("mdl_attorneys")
    .select("id", { count: "exact", head: true })
    .eq("mdl_number", mdlNumber);
  if (error) return false;
  return (count ?? 0) > 0;
}
