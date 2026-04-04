import { supabase } from "../supabase";

export async function getMassTorts() {
  const { data, error } = await supabase
    .from("mass_torts")
    .select("*")
    .order("name");
  if (error) throw error;
  return data;
}
