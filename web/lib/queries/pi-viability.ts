import { getSupabase } from "@/lib/supabase";

export interface PiViabilityScore {
  id: number;
  state: string;
  negligence_rule: string | null;
  negligence_score: number | null;
  non_economic_cap: string | null;
  non_economic_score: number | null;
  punitive_cap: string | null;
  punitive_score: number | null;
  med_mal_cap: string | null;
  med_mal_score: number | null;
  statute_of_limitations: string | null;
  sol_score: number | null;
  avg_jury_verdict: string | null;
  verdict_score: number | null;
  composite_score: number | null;
  updated_at: string | null;
}

export async function getPiViabilityScores(filterState?: string): Promise<PiViabilityScore[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('get_pi_viability_scores', {
      filter_state: filterState ?? null,
    } as never);
    if (error) throw error;
    return (data ?? []) as PiViabilityScore[];
  } catch {
    return [];
  }
}
