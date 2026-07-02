/**
 * Read the PI qualification/intake criteria for a case type.
 *
 * Calls get_pi_qualification_criteria (returns the universal intake block + the
 * case-type delta), then MERGES them into one resolved object: universal
 * screening questions + disqualifiers first, then the case-type deltas. Case-
 * type-specific factors + SOL note come from the delta row.
 *
 * Mirrors lib/queries/pi-economics.ts (RPC + cast-based row mapping) so it does
 * not depend on a regenerated database.types.ts. Takes the caller's Supabase
 * client so it reads under the same auth context as the rest of the route.
 */
import type { EconomicsCaseType } from "@/lib/strategy-engine/economics";
import type {
  CriteriaItem,
  CriteriaScreeningQuestion,
  StrategyQualificationCriteria,
} from "@/lib/strategy-engine/standalone";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Evidence = "observed" | "inferred" | null;

const str = (v: unknown): string | null => (v == null ? null : String(v));

function mapQuestion(q: any): CriteriaScreeningQuestion {
  return {
    id: String(q?.id ?? ""),
    question: String(q?.question ?? ""),
    purpose: str(q?.purpose),
    type: str(q?.type),
    evidence: (q?.evidence as Evidence) ?? null,
    scope: (q?.scope as "universal" | "specific" | null) ?? null,
    source: str(q?.source),
    theory: str(q?.theory),
  };
}

/** Disqualifiers carry `item`; case-type factors carry `factor` — both → `label`. */
function mapItem(raw: any): CriteriaItem {
  return {
    label: String(raw?.item ?? raw?.factor ?? ""),
    evidence: (raw?.evidence as Evidence) ?? null,
    theory: str(raw?.theory),
  };
}

const asArray = (v: unknown): any[] => (Array.isArray(v) ? v : []);

/** Fetch + merge the universal block with the case-type delta, or null when the
 *  case type has no criteria coverage (the route omits the section). */
export async function fetchPiQualificationCriteria(
  sb: { rpc: (...args: any[]) => PromiseLike<{ data: unknown; error: unknown }> },
  caseType: EconomicsCaseType,
): Promise<StrategyQualificationCriteria | null> {
  const { data, error } = await sb.rpc("get_pi_qualification_criteria", {
    p_case_type: caseType,
  });

  if (error) {
    console.error(
      "PI qualification criteria fetch failed:",
      (error as { message?: string })?.message ?? error,
    );
    return null;
  }

  const rows = (data as any[]) ?? [];
  if (rows.length === 0) return null;

  const universal = rows.find((r) => r?.scope === "universal") ?? null;
  const specific = rows.find((r) => r?.scope === "specific") ?? null;
  // Nothing usable if neither row came back.
  if (!universal && !specific) return null;

  // Universal-first, then the case-type delta (order matters for the flat render).
  const screening_questions: CriteriaScreeningQuestion[] = [
    ...asArray(universal?.screening_questions).map(mapQuestion),
    ...asArray(specific?.screening_questions).map(mapQuestion),
  ];
  const disqualifiers: CriteriaItem[] = [
    ...asArray(universal?.disqualifiers).map(mapItem),
    ...asArray(specific?.disqualifiers).map(mapItem),
  ];
  const case_type_specific_factors: CriteriaItem[] = [
    ...asArray(specific?.case_type_specific_factors).map(mapItem),
    ...asArray(universal?.case_type_specific_factors).map(mapItem),
  ];

  return {
    case_type: String(specific?.case_type ?? universal?.case_type ?? caseType),
    screening_questions,
    disqualifiers,
    case_type_specific_factors,
    disqualify_message: str(specific?.disqualify_message ?? universal?.disqualify_message),
    qualify_message: str(specific?.qualify_message ?? universal?.qualify_message),
    sol_note: str(specific?.sol_note ?? universal?.sol_note),
    confidence: str(specific?.confidence ?? universal?.confidence),
    source_notes: str(specific?.source_notes ?? universal?.source_notes),
  };
}
