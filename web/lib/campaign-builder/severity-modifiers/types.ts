/**
 * Severity Modifier Types
 *
 * Severity modifiers layer on top of a base PI template (motorcycle,
 * boating, car, etc.) to shift tone and emotional register. They do
 * NOT change the legal category — a fatal motorcycle case is still a
 * motorcycle case, just spoken to differently.
 *
 * v1 modifiers: 'fatal', 'catastrophic'. Mutually exclusive (DB-enforced
 * by the campaigns table CHECK constraint).
 *
 * Future modifiers (deferred to v2 per SPEC §8):
 *   - liability modifiers (hit_and_run, uninsured, commercial_vehicle)
 *   - audience modifiers (acute, chronic, family)
 */

import type { PITemplate, PITemplateVars, SeverityModifier } from "../pi-templates/types";

/**
 * A severity modifier is a function that transforms a rendered PITemplate
 * into a new PITemplate with adjusted tone, audience, and CTA.
 *
 * Receives both the rendered template (with vars already substituted)
 * AND the original vars, so modifier text can reference {market_display_name},
 * {state}, and {firm_name} naturally without losing localization.
 *
 * Why a function (not a static template):
 *   - We want category-specific text preserved ("motorcycle wreck",
 *     "boating accident") rather than replaced with generic copy
 *   - The transformation depends on the category being modified
 *   - Easier to add new modifiers later without combinatorial template
 *     explosion (3 categories × 2 modifiers = 6 hand-written variants
 *     today; 9 categories × 5 modifiers = 45 variants without functions)
 */
export type SeverityModifierFn = (
  template: PITemplate,
  vars: PITemplateVars,
) => PITemplate;

/**
 * Result of validating a list of severity modifiers from the DB.
 * Used to surface UI/copy errors for forbidden combinations even though
 * the DB constraint should already prevent them.
 */
export interface SeverityValidationResult {
  ok: boolean;
  /** Modifiers that survived validation. */
  applied: SeverityModifier[];
  /** Human-readable reasons something was rejected. */
  errors: string[];
}

/**
 * Validate a raw list of severity modifier strings. Filters to known
 * values, enforces mutual exclusion of 'fatal' and 'catastrophic',
 * surfaces clear errors.
 *
 * The DB CHECK constraint already enforces mutual exclusion at write
 * time, but we re-check here so:
 *   1. Bad inputs in API requests get rejected with a clear error
 *      before hitting the DB
 *   2. Tests can exercise the validation logic without round-tripping
 *      through Postgres
 */
export function validateSeverityModifiers(
  raw: readonly string[],
): SeverityValidationResult {
  const errors: string[] = [];
  const known = new Set<SeverityModifier>(["fatal", "catastrophic"]);
  const filtered: SeverityModifier[] = [];

  for (const value of raw) {
    if (known.has(value as SeverityModifier)) {
      filtered.push(value as SeverityModifier);
    } else {
      errors.push(
        `Unknown severity modifier: "${value}". Allowed: ${[...known].join(", ")}`,
      );
    }
  }

  // Dedupe (defensive — DB array column shouldn't have dupes, but cheap to enforce)
  const unique = Array.from(new Set(filtered));

  // Mutual exclusion
  const hasFatal = unique.includes("fatal");
  const hasCatastrophic = unique.includes("catastrophic");
  if (hasFatal && hasCatastrophic) {
    errors.push(
      "Severity modifiers 'fatal' and 'catastrophic' are mutually exclusive. " +
        "A campaign can have one or the other, not both.",
    );
    // Prefer 'fatal' when both are accidentally present (more drastic
    // tone shift, safer fail-mode for ad copy).
    return { ok: false, applied: ["fatal"], errors };
  }

  return { ok: errors.length === 0, applied: unique, errors };
}
