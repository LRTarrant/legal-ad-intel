import { supabase } from "../supabase";

export async function getFirms() {
  const { data, error } = await supabase
    .from("firms")
    .select("*")
    .order("name");
  if (error) throw error;
  return data;
}

export async function getFirmCount() {
  const { count, error } = await supabase
    .from("firms")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function getTopFirmsBySpend(limit = 10) {
  const { data, error } = await supabase.from("ad_events").select("*");
  if (error) throw error;

  const firmSpend = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.firm_id || !row.spend_estimate) continue;
    firmSpend.set(
      row.firm_id,
      (firmSpend.get(row.firm_id) ?? 0) + Number(row.spend_estimate)
    );
  }

  const firmIds = [...firmSpend.keys()];
  if (firmIds.length === 0) return [];

  const { data: firms } = await supabase
    .from("firms")
    .select("*")
    .in("id", firmIds);

  const firmMap = new Map((firms ?? []).map((f) => [f.id, f.name]));

  return Array.from(firmSpend.entries())
    .map(([id, total]) => ({ name: firmMap.get(id) ?? "Unknown", total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}
