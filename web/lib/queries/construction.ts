import { getSupabase } from "@/lib/supabase";

// ── Types ────────────────────────────────────────────────────────────────

export interface ConstructionNationalSummary {
  year: number;
  total_fatalities: number;
  falls: number;
  transportation: number;
  exposure: number;
  contact: number;
  violence: number;
  fires: number;
  fatality_rate: number;
  yoy_change: number | null;
}

export interface ConstructionEventBreakdown {
  event_type: string;
  fatality_count: number;
  pct: number;
}

export interface ConstructionTrend {
  year: number;
  total_fatalities: number;
  fatality_rate: number;
}

export interface ConstructionSubsector {
  naics_code: string;
  industry_name: string;
  total_fatalities: number;
  falls: number;
  transportation: number;
  exposure: number;
  contact: number;
}

export interface ConstructionIndustryDetail {
  naics_code: string;
  industry_name: string;
  industry_level: number;
  total_fatalities: number;
  falls: number;
  transportation: number;
  exposure: number;
  contact: number;
  violence: number;
  fires: number;
}

export interface ConstructionStatePriority {
  state_abbr: string;
  state_name: string;
  all_industry_fatalities_2024: number;
  construction_fatality_rate_2024: number | null;
  overall_fatality_rate_2024: number | null;
  priority_tier: string;
  rate_vs_national: number | null;
}

export interface ConstructionStatePriorityV2 {
  state_abbr: string;
  state_name: string;
  all_industry_fatalities_2024: number;
  construction_fatality_rate_2024: number | null;
  overall_fatality_rate_2024: number | null;
  construction_fatalities_est: number | null;
  construction_employment_est: number | null;
  small_sample_flag: boolean;
  priority_tier: string;
  volume_tier: string;
  rate_vs_national: number | null;
}

export interface ConstructionDemographic {
  year: number;
  dimension: string;
  category: string;
  fatalities: number;
  pct_of_total: number;
  fatality_rate: number | null;
  data_source: string;
  data_note: string | null;
}

// ── Query functions ──────────────────────────────────────────────────────

export async function getConstructionNationalSummary(
  year: number = 2024
): Promise<ConstructionNationalSummary> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc(
    "get_construction_national_summary" as never,
    { p_year: year } as never
  );
  if (error) throw error;
  const rows = (data ?? []) as ConstructionNationalSummary[];
  const row = rows[0];
  return {
    year: Number(row?.year ?? year),
    total_fatalities: Number(row?.total_fatalities ?? 0),
    falls: Number(row?.falls ?? 0),
    transportation: Number(row?.transportation ?? 0),
    exposure: Number(row?.exposure ?? 0),
    contact: Number(row?.contact ?? 0),
    violence: Number(row?.violence ?? 0),
    fires: Number(row?.fires ?? 0),
    fatality_rate: Number(row?.fatality_rate ?? 0),
    yoy_change: row?.yoy_change != null ? Number(row.yoy_change) : null,
  };
}

export async function getConstructionEventBreakdown(
  year: number = 2024
): Promise<ConstructionEventBreakdown[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc(
    "get_construction_event_breakdown" as never,
    { p_year: year } as never
  );
  if (error) throw error;
  return ((data ?? []) as ConstructionEventBreakdown[]).map((row) => ({
    event_type: String(row.event_type ?? ""),
    fatality_count: Number(row.fatality_count ?? 0),
    pct: Number(row.pct ?? 0),
  }));
}

export async function getConstructionTrend(
  state: string = "US"
): Promise<ConstructionTrend[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc(
    "get_construction_trend" as never,
    { p_state: state } as never
  );
  if (error) throw error;
  return ((data ?? []) as ConstructionTrend[]).map((row) => ({
    year: Number(row.year),
    total_fatalities: Number(row.total_fatalities ?? 0),
    fatality_rate: Number(row.fatality_rate ?? 0),
  }));
}

export async function getConstructionSubsectorBreakdown(
  year: number = 2024
): Promise<ConstructionSubsector[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc(
    "get_construction_subsector_breakdown" as never,
    { p_year: year } as never
  );
  if (error) throw error;
  return ((data ?? []) as ConstructionSubsector[]).map((row) => ({
    naics_code: String(row.naics_code ?? ""),
    industry_name: String(row.industry_name ?? ""),
    total_fatalities: Number(row.total_fatalities ?? 0),
    falls: Number(row.falls ?? 0),
    transportation: Number(row.transportation ?? 0),
    exposure: Number(row.exposure ?? 0),
    contact: Number(row.contact ?? 0),
  }));
}

export async function getConstructionIndustryDetail(
  year: number = 2024,
  minLevel: number = 3,
  maxLevel: number = 5
): Promise<ConstructionIndustryDetail[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc(
    "get_construction_industry_detail" as never,
    { p_year: year, p_min_level: minLevel, p_max_level: maxLevel } as never
  );
  if (error) throw error;
  return ((data ?? []) as ConstructionIndustryDetail[]).map((row) => ({
    naics_code: String(row.naics_code ?? ""),
    industry_name: String(row.industry_name ?? ""),
    industry_level: Number(row.industry_level ?? 0),
    total_fatalities: Number(row.total_fatalities ?? 0),
    falls: Number(row.falls ?? 0),
    transportation: Number(row.transportation ?? 0),
    exposure: Number(row.exposure ?? 0),
    contact: Number(row.contact ?? 0),
    violence: Number(row.violence ?? 0),
    fires: Number(row.fires ?? 0),
  }));
}

export async function getConstructionStatePriority(): Promise<
  ConstructionStatePriority[]
> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc(
    "get_construction_state_priority" as never
  );
  if (error) throw error;
  return ((data ?? []) as ConstructionStatePriority[]).map((row) => ({
    state_abbr: String(row.state_abbr ?? ""),
    state_name: String(row.state_name ?? ""),
    all_industry_fatalities_2024: Number(row.all_industry_fatalities_2024 ?? 0),
    construction_fatality_rate_2024:
      row.construction_fatality_rate_2024 != null
        ? Number(row.construction_fatality_rate_2024)
        : null,
    overall_fatality_rate_2024:
      row.overall_fatality_rate_2024 != null
        ? Number(row.overall_fatality_rate_2024)
        : null,
    priority_tier: String(row.priority_tier ?? "Unknown"),
    rate_vs_national:
      row.rate_vs_national != null ? Number(row.rate_vs_national) : null,
  }));
}

export async function getConstructionStatePriorityV2(): Promise<
  ConstructionStatePriorityV2[]
> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc(
    "get_construction_state_priority_v2" as never
  );
  if (error) throw error;
  return ((data ?? []) as ConstructionStatePriorityV2[]).map((row) => ({
    state_abbr: String(row.state_abbr ?? ""),
    state_name: String(row.state_name ?? ""),
    all_industry_fatalities_2024: Number(row.all_industry_fatalities_2024 ?? 0),
    construction_fatality_rate_2024:
      row.construction_fatality_rate_2024 != null
        ? Number(row.construction_fatality_rate_2024)
        : null,
    overall_fatality_rate_2024:
      row.overall_fatality_rate_2024 != null
        ? Number(row.overall_fatality_rate_2024)
        : null,
    construction_fatalities_est:
      row.construction_fatalities_est != null
        ? Number(row.construction_fatalities_est)
        : null,
    construction_employment_est:
      row.construction_employment_est != null
        ? Number(row.construction_employment_est)
        : null,
    small_sample_flag: Boolean(row.small_sample_flag),
    priority_tier: String(row.priority_tier ?? "Unknown"),
    volume_tier: String(row.volume_tier ?? "Low-Volume"),
    rate_vs_national:
      row.rate_vs_national != null ? Number(row.rate_vs_national) : null,
  }));
}

export async function getConstructionDemographics(
  year: number = 2024,
  dimension: string | null = null
): Promise<ConstructionDemographic[]> {
  const supabase = getSupabase();
  const params: Record<string, unknown> = { p_year: year };
  if (dimension) params.p_dimension = dimension;
  const { data, error } = await supabase.rpc(
    "get_construction_demographics" as never,
    params as never
  );
  if (error) throw error;
  return ((data ?? []) as ConstructionDemographic[]).map((row) => ({
    year: Number(row.year ?? year),
    dimension: String(row.dimension ?? ""),
    category: String(row.category ?? ""),
    fatalities: Number(row.fatalities ?? 0),
    pct_of_total: Number(row.pct_of_total ?? 0),
    fatality_rate: row.fatality_rate != null ? Number(row.fatality_rate) : null,
    data_source: String(row.data_source ?? ""),
    data_note: row.data_note != null ? String(row.data_note) : null,
  }));
}
