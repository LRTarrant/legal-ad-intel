import type { PITemplate } from "./types";

/**
 * Premises Liability PI Template
 *
 * Hook angle: broader than slip and fall. Covers any injury caused
 * by unsafe property conditions — inadequate security at apartment
 * complexes or hotels, falling objects in stores, defective
 * stairs/railings, swimming pool incidents, parking lot assaults
 * with negligent security.
 *
 * Why this category needs its own template (separate from slip_and_fall):
 *   - Slip & fall is one specific premises theory; premises liability
 *     covers a much wider range of fact patterns
 *   - Higher case values, especially for negligent security cases
 *     against apartment complexes, hotels, retail
 *   - Same underlying notice element as slip & fall, but the hook
 *     should signal the broader scope so callers with non-slip
 *     premises injuries don't self-select out
 *   - Common scenarios: third-party assaults at properties with
 *     known security issues, falling merchandise in big-box stores,
 *     inadequate lighting, broken handrails
 */
export const premisesLiabilityTemplate: PITemplate = {
  category: "premises_liability",
  displayName: "Premises Liability",

  hook: "Property owners have a duty to keep their premises reasonably safe. When they don't, the consequences are on them.",

  problem:
    "If you were hurt on someone else's property in the {market_display_name} area — falling merchandise, an assault at a poorly secured building, a broken stair or railing, a pool accident — the owner's insurer will try to argue the hazard was your problem to avoid. The case turns on whether the owner knew or should have known about the danger and didn't address it.",

  authority:
    "{firm_name} handles the full range of {state} premises cases, not just slip and falls. We investigate prior incidents, security failures, maintenance records, and notice — before that evidence is gone.",

  cta: "If you were injured on someone else's property, you may have a case. Free review, no fee unless we win.",

  baseDisclaimer:
    "Attorney advertising. Prior results do not guarantee a similar outcome.",

  toneHint:
    "Authoritative and broad. The point of differentiation from slip-and-fall framing is scope — this category captures negligent security, falling object, pool, and structural cases too. Don't accidentally narrow the framing back to falls. \"Premises\" sounds clinical in voice copy; consider \"on someone else's property\" or \"at a business or building\" as natural alternatives.",
};
