import { getSupabase } from "@/lib/supabase";

export type JudicialProfileValue = "Conservative" | "Moderate" | "Liberal";

export interface JudicialProfileRow {
  fips: number;
  county_name: string;
  state: string;
  judicial_profile: string;
}

export interface JudicialSummary {
  conservative: number;
  moderate: number;
  liberal: number;
  total_counties: number;
}

export interface JudicialStateOption {
  state: string;
}

type UnknownRow = Record<string, unknown>;

function normalizeProfile(value: unknown): JudicialProfileValue | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "conservative") {
    return "Conservative";
  }

  if (normalized === "moderate") {
    return "Moderate";
  }

  if (normalized === "liberal") {
    return "Liberal";
  }

  return null;
}

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export async function getJudicialProfiles(
  filterState?: string | null
): Promise<JudicialProfileRow[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .rpc("get_judicial_profiles", {
      filter_state: filterState ?? null,
    } as never)
    .range(0, 3999)
    .throwOnError();

  return ((data ?? []) as UnknownRow[]).map((row) => ({
    fips: toNumber(row.fips),
    county_name: String(row.county_name ?? ""),
    state: String(row.state ?? ""),
    judicial_profile: String(row.judicial_profile ?? ""),
  }));
}

export async function getJudicialProfileSummary(
  filterState?: string | null
): Promise<JudicialSummary> {
  const supabase = getSupabase();
  const { data } = await supabase
    .rpc("get_judicial_profile_summary", {
      filter_state: filterState ?? null,
    } as never)
    .throwOnError();

  const rows = (data ?? []) as UnknownRow[];

  if (rows.length === 0) {
    return {
      conservative: 0,
      moderate: 0,
      liberal: 0,
      total_counties: 0,
    };
  }

  const first = rows[0];
  const hasWideSummary =
    "conservative" in first ||
    "moderate" in first ||
    "liberal" in first ||
    "total_counties" in first;

  if (hasWideSummary) {
    return {
      conservative: toNumber(first.conservative),
      moderate: toNumber(first.moderate),
      liberal: toNumber(first.liberal),
      total_counties: toNumber(first.total_counties),
    };
  }

  const summary: JudicialSummary = {
    conservative: 0,
    moderate: 0,
    liberal: 0,
    total_counties: 0,
  };

  for (const row of rows) {
    const profile =
      normalizeProfile(row.judicial_profile) ??
      normalizeProfile(row.profile) ??
      normalizeProfile(row.category);
    const count =
      toNumber(row.county_count) ||
      toNumber(row.count) ||
      toNumber(row.total);

    if (profile === "Conservative") {
      summary.conservative += count;
    }

    if (profile === "Moderate") {
      summary.moderate += count;
    }

    if (profile === "Liberal") {
      summary.liberal += count;
    }
  }

  summary.total_counties =
    summary.conservative + summary.moderate + summary.liberal;

  return summary;
}

export async function getJudicialStates(): Promise<JudicialStateOption[]> {
  const supabase = getSupabase();
  const { data } = await supabase.rpc("get_judicial_states").throwOnError();

  return ((data ?? []) as UnknownRow[])
    .map((row) => ({
      state: String(row.state ?? row.filter_state ?? ""),
    }))
    .filter((row) => row.state);
}
