// Reused by PR C (budget alerts). Keep functions pure and exportable.
//
// Server-side query helpers for the admin/api-costs dashboard. Each
// function takes a Supabase server client (RLS-authenticated) and
// returns a typed shape ready to hand to the client component. All
// aggregation is done in JS after a bounded date-window SELECT; this
// is sized for a single-tenant deployment with thousands of rows per
// month and is covered by the indexes added in PR #372.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type Provider = Database["public"]["Enums"]["api_provider"];

export const PROVIDERS: Provider[] = ["openai", "searchapi", "apify"];

export const PROVIDER_LABELS: Record<Provider, string> = {
  openai: "OpenAI",
  searchapi: "Searchapi",
  apify: "Apify",
};

export const PROVIDER_COLORS: Record<Provider, string> = {
  openai: "#1A8C96",
  searchapi: "#4FB8C4",
  apify: "#F4A261",
};

export interface ProviderSpend {
  provider: Provider;
  cost_usd: number;
}

export interface OperationSpend {
  called_from: string;
  display_label: string;
  cost_usd: number;
  call_count: number;
}

export interface TenantSpend {
  tenant_id: string | null;
  display_label: string;
  cost_usd: number;
}

export interface QuotaBurn {
  searches_used: number;
  monthly_quota: number | null;
  rate_per_unit_usd: number;
  plan_name: string | null;
  percent_used: number | null;
  days_into_month: number;
}

export interface DailyTrendPoint {
  date: string; // YYYY-MM-DD (UTC)
  openai: number;
  searchapi: number;
  apify: number;
}

type SupabaseServer = SupabaseClient<Database>;

function startOfCurrentMonthUTC(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function daysIntoMonthUTC(now = new Date()): number {
  return now.getUTCDate();
}

function daysAgoUTC(days: number, now = new Date()): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Month-to-date spend by provider.
 */
export async function getMonthlySpendByProvider(
  supabase: SupabaseServer
): Promise<ProviderSpend[]> {
  const since = startOfCurrentMonthUTC();
  const { data, error } = await supabase
    .from("api_usage_log")
    .select("provider, cost_usd")
    .gte("created_at", since);

  if (error) throw error;
  const totals: Record<Provider, number> = { openai: 0, searchapi: 0, apify: 0 };
  for (const row of data ?? []) {
    totals[row.provider as Provider] += Number(row.cost_usd) || 0;
  }
  return PROVIDERS.map((p) => ({ provider: p, cost_usd: totals[p] }));
}

/**
 * Top N operations by month-to-date cost.
 */
export async function getTopOperationsByCost(
  supabase: SupabaseServer,
  limit = 10
): Promise<OperationSpend[]> {
  const since = startOfCurrentMonthUTC();
  const { data, error } = await supabase
    .from("api_usage_log")
    .select("called_from, cost_usd")
    .gte("created_at", since);

  if (error) throw error;
  const byOp = new Map<string, { cost: number; count: number }>();
  for (const row of data ?? []) {
    const cur = byOp.get(row.called_from) ?? { cost: 0, count: 0 };
    cur.cost += Number(row.cost_usd) || 0;
    cur.count += 1;
    byOp.set(row.called_from, cur);
  }
  return Array.from(byOp.entries())
    .map(([called_from, { cost, count }]) => ({
      called_from,
      display_label: formatCalledFrom(called_from),
      cost_usd: cost,
      call_count: count,
    }))
    .sort((a, b) => b.cost_usd - a.cost_usd)
    .slice(0, limit);
}

/**
 * Month-to-date cost grouped by tenant. Null tenant_id (pipelines,
 * untagged routes) bucketed as "Platform / infra".
 */
export async function getTenantAttributedCost(
  supabase: SupabaseServer
): Promise<TenantSpend[]> {
  const since = startOfCurrentMonthUTC();
  const { data, error } = await supabase
    .from("api_usage_log")
    .select("tenant_id, cost_usd, firms:firms(name)")
    .gte("created_at", since);

  if (error) throw error;

  const byTenant = new Map<string | null, { name: string | null; cost: number }>();
  type Row = {
    tenant_id: string | null;
    cost_usd: number;
    firms: { name: string | null } | { name: string | null }[] | null;
  };
  for (const row of (data ?? []) as Row[]) {
    const cur = byTenant.get(row.tenant_id) ?? {
      name: extractFirmName(row.firms),
      cost: 0,
    };
    cur.cost += Number(row.cost_usd) || 0;
    byTenant.set(row.tenant_id, cur);
  }

  const results: TenantSpend[] = [];
  for (const [tenant_id, { name, cost }] of byTenant.entries()) {
    results.push({
      tenant_id,
      display_label: formatTenantLabel(tenant_id, name),
      cost_usd: cost,
    });
  }
  return results.sort((a, b) => b.cost_usd - a.cost_usd);
}

function extractFirmName(
  firms: { name: string | null } | { name: string | null }[] | null
): string | null {
  if (!firms) return null;
  if (Array.isArray(firms)) return firms[0]?.name ?? null;
  return firms.name ?? null;
}

/**
 * Searchapi monthly quota burn-down. Reads the most-recent-effective
 * pricing row for ('searchapi','searches'). Returns counts even when
 * usage is zero so the panel always renders.
 */
export async function getSearchapiQuotaBurn(
  supabase: SupabaseServer
): Promise<QuotaBurn> {
  const since = startOfCurrentMonthUTC();

  const [{ count, error: countError }, { data: pricing, error: pricingError }] =
    await Promise.all([
      supabase
        .from("api_usage_log")
        .select("id", { count: "exact", head: true })
        .eq("provider", "searchapi")
        .gte("created_at", since),
      supabase
        .from("api_pricing_config")
        .select("rate_per_unit_usd, monthly_quota_units, plan_name, effective_from")
        .eq("provider", "searchapi")
        .eq("unit_type", "searches")
        .lte("effective_from", new Date().toISOString().slice(0, 10))
        .order("effective_from", { ascending: false })
        .limit(1),
    ]);

  if (countError) throw countError;
  if (pricingError) throw pricingError;

  const row = pricing?.[0];
  const searchesUsed = count ?? 0;
  const monthlyQuota = row?.monthly_quota_units ?? null;

  return {
    searches_used: searchesUsed,
    monthly_quota: monthlyQuota,
    rate_per_unit_usd: row?.rate_per_unit_usd ?? 0,
    plan_name: row?.plan_name ?? null,
    percent_used:
      monthlyQuota && monthlyQuota > 0
        ? Math.min(100, (searchesUsed / monthlyQuota) * 100)
        : null,
    days_into_month: daysIntoMonthUTC(),
  };
}

/**
 * Daily cost per provider over the last 30 days (UTC). Zero-filled
 * across the window so the Recharts line never has gaps.
 */
export async function getDailyTrendByProvider(
  supabase: SupabaseServer,
  days = 30
): Promise<DailyTrendPoint[]> {
  const since = daysAgoUTC(days - 1);
  const { data, error } = await supabase
    .from("api_usage_log")
    .select("created_at, provider, cost_usd")
    .gte("created_at", since);

  if (error) throw error;

  const window: DailyTrendPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    window.push({
      date: d.toISOString().slice(0, 10),
      openai: 0,
      searchapi: 0,
      apify: 0,
    });
  }
  const byDate = new Map(window.map((p) => [p.date, p]));
  for (const row of data ?? []) {
    const day = row.created_at.slice(0, 10);
    const point = byDate.get(day);
    if (!point) continue;
    point[row.provider as Provider] += Number(row.cost_usd) || 0;
  }
  return window;
}

/**
 * Render `called_from` as a human label.
 *   "api/campaigns/generate-pi-meta-ad" → "Campaign · PI Meta Ad"
 *   "pipelines.serp_intel_daily"        → "Pipeline · SERP Intel Daily"
 *   anything else                       → passthrough, title-cased.
 */
export function formatCalledFrom(value: string): string {
  if (!value) return "";
  if (value.startsWith("pipelines.")) {
    const slug = value.slice("pipelines.".length);
    return `Pipeline · ${titleCase(slug.replace(/_/g, " "))}`;
  }
  if (value.startsWith("api/campaigns/")) {
    const slug = value.slice("api/campaigns/".length);
    const cleaned = slug.replace(/^generate-/, "").replace(/-/g, " ");
    return `Campaign · ${titleCase(cleaned)}`;
  }
  if (value.startsWith("api/")) {
    const slug = value.slice("api/".length).replace(/\//g, " ").replace(/-/g, " ");
    return `API · ${titleCase(slug)}`;
  }
  return value;
}

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const upper = word.toUpperCase();
      // Preserve well-known acronyms so we get "PI Meta Ad" not "Pi Meta Ad".
      if (["PI", "RSA", "MDL", "GLP1", "SERP", "AI", "TTS"].includes(upper)) {
        return upper;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function formatTenantLabel(tenantId: string | null, name: string | null): string {
  if (!tenantId) return "Platform / infra (pipelines, untagged routes)";
  if (name) return name;
  return `Unnamed firm #${tenantId.slice(0, 8)}`;
}
