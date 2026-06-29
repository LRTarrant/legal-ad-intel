/**
 * Strategy Engine — grounding validator.
 *
 * The AI may reason freely but may not fabricate. This rejects (so the
 * orchestrator can retry) any selection that names a tactic outside the menu,
 * cites an outlet not present in the market facts, selects an out-of-budget
 * tactic as a core pick, or emits an absolute-reach figure. An unknown format
 * genre is low-risk, so it's stripped with a warning rather than rejected.
 */
import type { TacticMenu } from "./tactic-scoring";
import { containsAbsoluteReach } from "./prompt";

export interface RawSelectedTactic {
  key: string;
  rationale: string;
  format_call?: string[];
  example_outlets?: string[];
}
export interface RawSelection {
  tactics: RawSelectedTactic[];
  narrative: string;
  readiness_notes?: string;
}
/** Outlet names present in the selected market, lowercased. */
export interface GroundingFacts {
  outletNames: Set<string>;
}
export interface ValidatedSelection {
  tactics: RawSelectedTactic[];
  narrative: string;
  readiness_notes?: string;
  warnings: string[];
}

export function validateSelection(
  raw: RawSelection,
  menu: TacticMenu,
  facts: GroundingFacts,
): { ok: true; value: ValidatedSelection } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const byKey = new Map(menu.tactics.map((s) => [s.tactic.key, s]));

  if (!Array.isArray(raw.tactics) || raw.tactics.length === 0) {
    return { ok: false, errors: ["no tactics selected"] };
  }

  const seenKeys = new Set<string>();
  const cleaned: RawSelectedTactic[] = [];
  for (const t of raw.tactics) {
    if (seenKeys.has(t.key)) {
      errors.push(`duplicate tactic key: ${t.key}`);
      continue;
    }
    seenKeys.add(t.key);
    const scored = byKey.get(t.key);
    if (!scored) {
      errors.push(`unknown tactic key: ${t.key}`);
      continue;
    }
    if (!scored.affordable) errors.push(`out-of-budget tactic selected: ${t.key}`);
    if (typeof t.rationale !== "string" || t.rationale.trim() === "") {
      errors.push(`missing rationale for ${t.key}`);
    } else if (containsAbsoluteReach(t.rationale)) {
      errors.push(`absolute reach in rationale for ${t.key}`);
    }
    for (const name of t.example_outlets ?? []) {
      if (!facts.outletNames.has(name.toLowerCase())) {
        errors.push(`fabricated outlet: ${name}`);
      }
    }
    // Soft-strip unknown format genres (low-risk); reject non-array format_call (hard error).
    let format_call: string[] | undefined = undefined;
    if (t.format_call !== undefined) {
      if (!Array.isArray(t.format_call)) {
        errors.push(`format_call must be an array for ${t.key}`);
      } else {
        const dims = new Set(scored.tactic.format_dimensions ?? []);
        const bad = t.format_call.filter((f) => !dims.has(f));
        if (bad.length) warnings.push(`dropped unknown formats for ${t.key}: ${bad.join(", ")}`);
        format_call = t.format_call.filter((f) => dims.has(f));
      }
    }
    cleaned.push({ ...t, format_call });
  }

  if (containsAbsoluteReach(raw.narrative ?? "")) errors.push("absolute reach in narrative");
  if (raw.readiness_notes && containsAbsoluteReach(raw.readiness_notes)) {
    errors.push("absolute reach in readiness_notes");
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: { tactics: cleaned, narrative: raw.narrative, readiness_notes: raw.readiness_notes, warnings },
  };
}
