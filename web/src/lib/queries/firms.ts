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
