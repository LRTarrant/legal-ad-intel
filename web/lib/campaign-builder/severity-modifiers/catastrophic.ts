import type { PITemplate, PITemplateVars } from "../pi-templates/types";
import { renderTemplate } from "../pi-templates/types";
import type { SeverityModifierFn } from "./types";

/**
 * Catastrophic Severity Modifier
 *
 * Transforms a base PI template for catastrophic injuries — TBI,
 * paralysis, amputation, severe burns. Used when severity_modifiers
 * includes 'catastrophic'.
 *
 * What changes:
 *   - HOOK: keeps urgency but adds gravity. "This isn't a regular claim."
 *   - PROBLEM: pivots to lifetime cost framing (medical care, lost
 *     earning capacity, life care plans, future surgeries). This is the
 *     biggest behavioral lever on settlement value.
 *   - AUTHORITY: adds catastrophic case experience.
 *   - CTA: emphasizes case value vs. insurance offer ("before you accept").
 *
 * What is preserved:
 *   - Category-specific anchors (motorcycle bias, boating maritime law, etc.)
 *   - Localization vars (firm, market, state)
 *   - Base disclaimer
 *
 * Why this matters for case selection:
 *   - Catastrophic cases are 5-10x average claim value
 *   - Insurance adjusters routinely undervalue them by hundreds of thousands
 *   - Plaintiffs and families often accept early offers because they're
 *     desperate for medical bill coverage now — and miss the bigger picture
 *   - The right ad copy frames "now vs. lifetime" so callers understand
 *     why a real evaluation matters before signing anything
 */
export const catastrophicModifier: SeverityModifierFn = (
  template: PITemplate,
  vars: PITemplateVars,
): PITemplate => {
  return {
    ...template,
    displayName: `${template.displayName} — Catastrophic`,

    hook: renderTemplate(buildCatastrophicHook(template), vars),
    problem: renderTemplate(buildCatastrophicProblem(template), vars),
    authority: buildCatastrophicAuthority(template),
    // Keep socialProof if the base template has it; the catastrophic
    // tone supports results language more than the fatal tone does.
    socialProof: template.socialProof,
    cta: CATASTROPHIC_CTA,
    baseDisclaimer: template.baseDisclaimer,

    toneHint:
      "Authoritative and grave. Keep the urgency of the base template, but slow the pacing — these " +
      "callers are processing a life-changing event. Lean on lifetime cost framing rather than " +
      "shock-value injury descriptions. Voice direction: confident, measured, never breathless. " +
      "Avoid words like \"tragic\" or \"devastating\" — they're cliché and patronizing. Use specific " +
      "framing instead: \"lifetime medical care\", \"future earning capacity\", \"what your future " +
      "actually costs\".",
  };
};

/* ── Section builders ──────────────────────────────────────────────────────
   Each builder takes the rendered base template and returns catastrophic-
   appropriate copy. Preserves category-specific anchors so the differentiation
   between motorcycle, boating, car, etc. survives the modifier layer.
   ────────────────────────────────────────────────────────────────────────── */

function buildCatastrophicHook(template: PITemplate): string {
  switch (template.category) {
    case "motorcycle_accident":
      return "A motorcycle wreck that changes your life forever isn't a standard insurance claim. Don't let them treat it like one.";
    case "boating_accident":
      return "A serious injury on the water has lifetime consequences. The insurance company will treat it like a typical claim. It isn't.";
    case "car_accident":
      return "A crash that changes your life isn't a regular insurance claim. The other side will try to settle it like one anyway.";
    default:
      return "An injury that changes your life isn't a regular insurance claim. Don't let them treat it like one.";
  }
}

function buildCatastrophicProblem(template: PITemplate): string {
  // Universal lifetime-cost framing with category-specific texture.
  // {market_display_name} placeholders re-rendered by the caller.
  switch (template.category) {
    case "motorcycle_accident":
      return (
        "A catastrophic motorcycle injury in the {market_display_name} area — traumatic brain injury, " +
        "spinal damage, amputation — means lifetime medical care, lost earning capacity, and future " +
        "losses that insurance adjusters routinely undervalue by hundreds of thousands. The first " +
        "offer is almost never what your future actually costs."
      );
    case "boating_accident":
      return (
        "A serious injury on the water near {market_display_name} means lifetime medical care, lost " +
        "earning capacity, and future losses that insurance adjusters routinely undervalue. Maritime " +
        "claims add another layer of complexity — the wrong filing, the wrong jurisdiction, and you " +
        "can lose the case before it starts."
      );
    case "car_accident":
      return (
        "A catastrophic crash in the {market_display_name} area — traumatic brain injury, spinal " +
        "damage, severe burns — means lifetime medical care, lost earning capacity, and future losses " +
        "that insurance adjusters routinely undervalue by hundreds of thousands. The adjuster's first " +
        "offer is almost never what your future actually costs."
      );
    default:
      return (
        "A catastrophic injury means lifetime medical care, lost earning capacity, and future losses " +
        "that insurance adjusters routinely undervalue. The first offer is almost never what your " +
        "future actually costs."
      );
  }
}

function buildCatastrophicAuthority(template: PITemplate): string {
  // Add catastrophic experience callout to the firm's base authority
  // claim. Pattern same as fatal modifier — splice before the period.
  switch (template.category) {
    case "motorcycle_accident":
      return template.authority.replace(
        /\.$/,
        ". We've handled catastrophic motorcycle cases and know what your future actually costs.",
      );
    case "boating_accident":
      return template.authority.replace(
        /\.$/,
        ". We've handled catastrophic maritime injury cases and know what these claims are really worth.",
      );
    case "car_accident":
      return template.authority.replace(
        /\.$/,
        ". We've handled catastrophic injury cases and know what your future actually costs.",
      );
    default:
      return template.authority.replace(
        /\.$/,
        ". We've handled catastrophic injury cases and know what these claims are really worth.",
      );
  }
}

/**
 * Universal CTA for catastrophic modifier. Frames around evaluating
 * the offer before accepting — the most actionable behavior change
 * for catastrophic claimants who often settle too early.
 */
const CATASTROPHIC_CTA =
  "Before you accept any offer, get a real case evaluation. Free, no obligation, no fee unless we win.";
