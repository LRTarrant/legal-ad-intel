import { getSupabase } from "@/lib/supabase";

export type MsaDemographic = {
  cbsa_code: string;
  cbsa_title: string;
  cbsa_type: string;
  county_count: number;
  total_population: number | null;
  total_housing_units: number | null;
  median_age: number | null;
  pct_white: number | null;
  pct_black: number | null;
  pct_hispanic: number | null;
  pct_asian: number | null;
  median_household_income: number | null;
  per_capita_income: number | null;
  pct_poverty: number | null;
  pct_uninsured: number | null;
  pct_employed: number | null;
  pct_high_school_or_higher: number | null;
  pct_bachelors_or_higher: number | null;
  pct_owner_occupied: number | null;
  median_home_value: number | null;
  pct_with_health_insurance: number | null;
};

export async function getMsaDemographics(
  limit = 500
): Promise<MsaDemographic[]> {
  const { data, error } = await getSupabase()
    .from("msa_demographics")
    .select("*")
    .order("total_population", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch MSA demographics: ${error.message}`);
  return data;
}

export async function getMsaDemographicByCode(
  cbsaCode: string
): Promise<MsaDemographic> {
  const { data, error } = await getSupabase()
    .from("msa_demographics")
    .select("*")
    .eq("cbsa_code", cbsaCode)
    .single();

  if (error) throw new Error(`Failed to fetch MSA demographic: ${error.message}`);
  return data;
}

export async function getMsaDemographicCount(): Promise<number> {
  const { count, error } = await getSupabase()
    .from("msa_demographics")
    .select("*", { count: "exact", head: true });

  if (error) throw new Error(`Failed to count MSA demographics: ${error.message}`);
  return count ?? 0;
}
