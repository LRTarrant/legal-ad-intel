import { getSupabase } from "@/lib/supabase";

export interface StateOpportunityScore {
  state: string;
  opportunity_score: number;
  pi_viability_score: number;
  total_incidents: number;
  incident_trend_pct: number;
  negligence_rule: string | null;
  composite_rank: number;
}

export async function getStateOpportunityScores(): Promise<StateOpportunityScore[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('get_state_opportunity_scores');
    if (error) throw error;
    return (data ?? []) as StateOpportunityScore[];
  } catch {
    return [];
  }
}
