import { supabase } from "../supabase";

export async function getMarkets() {
  const { data, error } = await supabase
    .from("markets")
    .select("*")
    .order("market_name");

  if (error) throw error;
  return data;
}

export async function getMarketCount() {
  const { count, error } = await supabase
    .from("markets")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}
