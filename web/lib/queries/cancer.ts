import { getSupabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type CancerRow = Database["public"]["Tables"]["cancer_incidence"]["Row"];

export interface CancerFilters {
  cancerSite?: string | null;
  state?: string | null;
}

export interface CancerTotals {
  average_incidence_rate: number;
  counties_reporting: number;
  total_annual_cases: number;
}

export interface CancerStateSummary {
  state: string;
  average_incidence_rate: number;
  total_annual_cases: number;
  counties_reporting: number;
  highest_rate_county: string;
  trend_direction: string;
}

export interface CancerSiteSummary {
  cancer_site: string;
  average_incidence_rate: number;
  total_annual_cases: number;
  trend_direction: string;
}

export interface CancerCountyRow {
  fips: string;
  county_name: string;
  state: string;
  cancer_site: string;
  incidence_rate: number;
  average_annual_count: number;
  recent_trend: number | null;
  trend_direction: string;
  rural_urban: string | null;
}

export interface CancerOption {
  value: string;
}

export interface CancerHeatmapPoint {
  latitude: number;
  longitude: number;
  intensity: number;
}

async function fetchCancerRows(filters?: CancerFilters): Promise<CancerRow[]> {
  const pageSize = 1000;
  const rows: CancerRow[] = [];
  let from = 0;

  while (true) {
    let query = getSupabase()
      .from("cancer_incidence")
      .select("*")
      .order("state", { ascending: true })
      .order("county_name", { ascending: true })
      .range(from, from + pageSize - 1);

    if (filters?.state) {
      query = query.eq("state", filters.state.toUpperCase());
    }

    if (filters?.cancerSite) {
      query = query.eq("cancer_site", filters.cancerSite);
    }

    const { data, error } = await query;
    if (error) throw error;

    const batch = (data ?? []) as CancerRow[];
    rows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  // Filter out aggregate rows (e.g. "US (SEER+NPCR)(1)") — only keep valid 2-letter state codes
  return rows.filter((row) => /^[A-Z]{2}$/.test(row.state));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function trendDirection(value: number | null): string {
  if (value == null || value === 0) return "Stable";
  return value > 0 ? "Rising" : "Falling";
}

function weightedTrendDirection(rows: CancerRow[]): string {
  const values = rows
    .map((row) => row.recent_trend)
    .filter((value): value is number => value != null);
  return trendDirection(values.length ? average(values) : null);
}

export async function getCancerTotals(
  filters?: CancerFilters
): Promise<CancerTotals> {
  const rows = await fetchCancerRows(filters);
  return {
    counties_reporting: rows.length,
    average_incidence_rate: average(rows.map((row) => row.incidence_rate)),
    total_annual_cases: rows.reduce(
      (sum, row) => sum + Number(row.average_annual_count ?? 0),
      0
    ),
  };
}

export async function getCancerByState(
  filters?: CancerFilters
): Promise<CancerStateSummary[]> {
  const rows = await fetchCancerRows(filters);
  const byState = new Map<string, CancerRow[]>();

  for (const row of rows) {
    const existing = byState.get(row.state) ?? [];
    existing.push(row);
    byState.set(row.state, existing);
  }

  return Array.from(byState.entries())
    .map(([state, stateRows]) => {
      const highest = [...stateRows].sort(
        (a, b) => b.incidence_rate - a.incidence_rate
      )[0];
      return {
        state,
        average_incidence_rate: average(
          stateRows.map((row) => row.incidence_rate)
        ),
        total_annual_cases: stateRows.reduce(
          (sum, row) => sum + Number(row.average_annual_count ?? 0),
          0
        ),
        counties_reporting: stateRows.length,
        highest_rate_county: highest
          ? `${highest.county_name} (${highest.incidence_rate.toFixed(1)})`
          : "n/a",
        trend_direction: weightedTrendDirection(stateRows),
      };
    })
    .sort((a, b) => b.average_incidence_rate - a.average_incidence_rate);
}

export async function getCancerBySite(
  filters?: CancerFilters
): Promise<CancerSiteSummary[]> {
  const rows = await fetchCancerRows(filters);
  const bySite = new Map<string, CancerRow[]>();

  for (const row of rows) {
    const existing = bySite.get(row.cancer_site) ?? [];
    existing.push(row);
    bySite.set(row.cancer_site, existing);
  }

  return Array.from(bySite.entries())
    .map(([cancer_site, siteRows]) => ({
      cancer_site,
      average_incidence_rate: average(siteRows.map((row) => row.incidence_rate)),
      total_annual_cases: siteRows.reduce(
        (sum, row) => sum + Number(row.average_annual_count ?? 0),
        0
      ),
      trend_direction: weightedTrendDirection(siteRows),
    }))
    .sort((a, b) => b.total_annual_cases - a.total_annual_cases);
}

export async function getCancerCountiesByState(
  state: string,
  filters?: CancerFilters
): Promise<CancerCountyRow[]> {
  const rows = await fetchCancerRows({
    ...filters,
    state,
  });

  return rows
    .map((row) => ({
      fips: row.fips,
      county_name: row.county_name,
      state: row.state,
      cancer_site: row.cancer_site,
      incidence_rate: row.incidence_rate,
      average_annual_count: Number(row.average_annual_count ?? 0),
      recent_trend: row.recent_trend,
      trend_direction: row.trend_direction,
      rural_urban: row.rural_urban,
    }))
    .sort((a, b) => b.incidence_rate - a.incidence_rate);
}

export async function getCancerDistinctStates(): Promise<CancerOption[]> {
  const rows = await fetchCancerRows();
  return Array.from(new Set(rows.map((row) => row.state)))
    .sort()
    .map((value) => ({ value }));
}

export async function getCancerDistinctSites(): Promise<CancerOption[]> {
  const rows = await fetchCancerRows();
  return Array.from(new Set(rows.map((row) => row.cancer_site)))
    .sort()
    .map((value) => ({ value }));
}

export async function getCancerTrendingSites(
  filters?: CancerFilters
): Promise<CancerSiteSummary[]> {
  const rows = await fetchCancerRows(filters);
  const bySite = new Map<string, CancerRow[]>();

  for (const row of rows) {
    const existing = bySite.get(row.cancer_site) ?? [];
    existing.push(row);
    bySite.set(row.cancer_site, existing);
  }

  return Array.from(bySite.entries())
    .map(([cancer_site, siteRows]) => {
      const trendValues = siteRows
        .map((row) => row.recent_trend)
        .filter((value): value is number => value != null);
      const averageTrend = trendValues.length ? average(trendValues) : 0;
      return {
        cancer_site,
        average_incidence_rate: average(
          siteRows.map((row) => row.incidence_rate)
        ),
        total_annual_cases: siteRows.reduce(
          (sum, row) => sum + Number(row.average_annual_count ?? 0),
          0
        ),
        trend_direction: trendDirection(averageTrend),
      };
    })
    .sort((a, b) => {
      const order = { Rising: 2, Stable: 1, Falling: 0 };
      return order[b.trend_direction as keyof typeof order] - order[a.trend_direction as keyof typeof order];
    });
}

export async function getCancerHeatmapPoints(
  filters?: CancerFilters
): Promise<CancerHeatmapPoint[]> {
  const rows = await fetchCancerRows(filters);
  return rows
    .filter((row) => row.latitude != null && row.longitude != null)
    .map((row) => ({
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      intensity: Math.max(Number(row.incidence_rate), 1),
    }));
}
