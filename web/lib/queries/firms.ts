/**
 * Queries against the COMPETITIVE-INTELLIGENCE advertiser firms table.
 * (The law firms whose ads we track, joined to ad_events.) Originally
 * called `firms`; renamed to `advertiser_firms` in Phase 0a to free up
 * the `firms` name for MCC-style client firm management.
 */

import { getSupabase, type Tables } from "@/lib/supabase";

// `advertiser_firms` is not yet in the generated Tables<...> map until
// the next types regen; cast through the legacy 'firms' alias to keep
// type safety with the underlying row shape (which is unchanged).
export type Firm = Tables<"firms">;

export async function getFirms(limit = 100): Promise<Firm[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data, error } = await sb
    .from("advertiser_firms")
    .select("*")
    .order("name", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch firms: ${error.message}`);
  return data as Firm[];
}

export async function getFirmById(id: string): Promise<Firm> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data, error } = await sb
    .from("advertiser_firms")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(`Failed to fetch firm: ${error.message}`);
  return data as Firm;
}

export async function getFirmCount(): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { count, error } = await sb
    .from("advertiser_firms")
    .select("*", { count: "exact", head: true });

  if (error) throw new Error(`Failed to count firms: ${error.message}`);
  return count ?? 0;
}

async function fetchAllFirms(): Promise<Firm[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  const { data, error } = await sb.from("advertiser_firms").select("*");
  if (error) throw new Error(`Failed to fetch firms: ${error.message}`);
  return data as Firm[];
}

async function fetchAdEventsWithFirm(): Promise<Tables<"ad_events">[]> {
  const { data, error } = await getSupabase()
    .from("ad_events")
    .select("*")
    .not("firm_id", "is", null);
  if (error) throw new Error(`Failed to fetch ad events: ${error.message}`);
  return data;
}

export async function getTopFirmsByAdSpend(limit = 10): Promise<
  Array<{ firm_id: string; firm_name: string; total_spend: number; event_count: number }>
> {
  const [events, firms] = await Promise.all([fetchAdEventsWithFirm(), fetchAllFirms()]);

  const firmMap = new Map(firms.map((f) => [f.id, f.name]));

  const grouped = new Map<string, { firm_id: string; firm_name: string; total_spend: number; event_count: number }>();
  for (const event of events) {
    if (!event.firm_id) continue;
    const key = event.firm_id;
    const existing = grouped.get(key) ?? {
      firm_id: event.firm_id,
      firm_name: firmMap.get(event.firm_id) ?? "Unknown",
      total_spend: 0,
      event_count: 0,
    };
    existing.total_spend += Number(event.spend_estimate ?? 0);
    existing.event_count += 1;
    grouped.set(key, existing);
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.total_spend - a.total_spend)
    .slice(0, limit);
}
