/**
 * Severity Modifiers — Public API
 *
 * Layer fatal/catastrophic modifiers on top of a base PI template.
 * Modifiers transform the rendered template (they don't replace it),
 * preserving category-specific framing and localization variables.
 *
 * Usage:
 *
 *   import { applySeverityModifiers } from "./severity-modifiers";
 *
 *   const result = routePracticeArea(ctx);
 *   if (result.practice_area === "personal_injury") {
 *     const modified = applySeverityModifiers(
 *       result.template,
 *       result.severity_modifiers,
 *     );
 *     // `modified` is a PITemplate with severity-appropriate tone applied
 *   }
 *
 * Order of operations (per SPEC §2.5):
 *   1. Base PI template rendered with vars (router does this)
 *   2. Severity modifiers applied (THIS LAYER)
 *   3. State compliance pass (Task 8) appends required disclaimers
 *   4. LLM prompt built around the final template by generate-* routes
 */

import type {
  PITemplate,
  PITemplateVars,
  SeverityModifier,
} from "../pi-templates/types";
import { catastrophicModifier } from "./catastrophic";
import { fatalModifier } from "./fatal";
import type { SeverityModifierFn } from "./types";

export type { SeverityModifierFn, SeverityValidationResult } from "./types";
export { validateSeverityModifiers } from "./types";

/**
 * Map from severity modifier enum to its transformer function.
 *
 * fatal and catastrophic are mutually exclusive (DB-enforced + UI-enforced).
 * If both somehow arrive in `applied`, validateSeverityModifiers() above
 * will have rejected the combination — but defensively, applySeverityModifiers
 * picks fatal as the safer fail-mode if both slip through.
 */
const MODIFIER_FNS: Record<SeverityModifier, SeverityModifierFn> = {
  fatal: fatalModifier,
  catastrophic: catastrophicModifier,
};

/**
 * Apply severity modifiers to a base PITemplate.
 *
 * - Empty modifier array → returns the input template unchanged
 * - 'fatal' present → applies the fatal modifier
 * - 'catastrophic' present (and no fatal) → applies the catastrophic modifier
 * - Both present → applies fatal only (defensive fail-mode; should be
 *   caught upstream by validateSeverityModifiers)
 *
 * Always returns a NEW PITemplate object — never mutates the input.
 *
 * `vars` is passed through to modifier functions so they can re-render
 * any localization placeholders (e.g. {market_display_name}) in the
 * modifier-specific text without losing market/state/firm references.
 */
export function applySeverityModifiers(
  template: PITemplate,
  modifiers: readonly SeverityModifier[],
  vars: PITemplateVars,
): PITemplate {
  if (modifiers.length === 0) {
    return template;
  }

  // fatal takes precedence if (somehow) both are present.
  if (modifiers.includes("fatal")) {
    return MODIFIER_FNS.fatal(template, vars);
  }

  if (modifiers.includes("catastrophic")) {
    return MODIFIER_FNS.catastrophic(template, vars);
  }

  return template;
}

/**
 * Convenience: list active severity modifiers for the UI.
 * The UI (Task 7 — severity-modifiers.tsx checkbox component) uses
 * this to render the checkbox state and tooltip copy.
 */
export const SEVERITY_MODIFIER_LABELS: Record<SeverityModifier, { label: string; tooltip: string }> = {
  fatal: {
    label: "Fatal / wrongful death",
    tooltip:
      "Shifts tone to address the family. Removes urgency language and " +
      "uses \"when you're ready\" framing. Adds wrongful death authority callout. " +
      "Mutually exclusive with Catastrophic.",
  },
  catastrophic: {
    label: "Catastrophic injury",
    tooltip:
      "For TBI, paralysis, amputation, severe burns. Pivots problem framing " +
      "to lifetime cost vs. insurance offer. Keeps urgency but adds gravity. " +
      "Mutually exclusive with Fatal.",
  },
};
