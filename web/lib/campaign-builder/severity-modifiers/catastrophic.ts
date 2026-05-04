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
    authority: renderTemplate(buildCatastrophicAuthority(template), vars),
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
    case "truck_accident":
      return "A catastrophic injury from a commercial truck crash isn't an ordinary insurance claim. The trucking company's lawyers already know that. The first offer never reflects what your future actually costs.";
    case "premises_liability":
      return "A catastrophic injury on someone else's property has lifetime consequences. The owner's insurer will try to settle it like a routine slip claim. It isn't one.";
    case "pedestrian_accident":
      return "Being struck by a vehicle while walking almost always means catastrophic injuries. The driver's insurer will offer a settlement that doesn't begin to cover what your future actually costs.";
    case "bicycle_accident":
      return "Catastrophic cycling injuries — traumatic brain injury, spinal damage — have lifetime consequences. The driver's insurer will treat it like a routine fender-bender. It isn't one.";
    case "slip_and_fall":
      return "Catastrophic falls — head injuries, spinal damage, hip fractures with complications — mean lifetime medical care. The property owner's insurer will offer a settlement that doesn't reflect that.";
    case "dog_bite":
      return "Severe dog attacks cause lasting damage — disfiguring scars, nerve damage, PTSD. The first insurance offer rarely covers what you'll actually need.";
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
    case "truck_accident":
      return (
        "A catastrophic commercial truck crash near {market_display_name} means lifetime medical " +
        "care, lost earning capacity, and future losses on a scale most adjusters undervalue by " +
        "hundreds of thousands. Federal trucking regulations create real liability — if the evidence " +
        "can be preserved before it disappears."
      );
    case "premises_liability":
      return (
        "A catastrophic injury on someone else's property in the {market_display_name} area means " +
        "lifetime medical care, lost earning capacity, and future losses that insurance adjusters " +
        "routinely undervalue. The case still turns on whether the owner knew about the danger — " +
        "and that evidence disappears fast."
      );
    case "pedestrian_accident":
      return (
        "Catastrophic pedestrian injuries near {market_display_name} — traumatic brain injury, spinal " +
        "damage, multiple fractures — mean lifetime medical care and lost earning capacity. The " +
        "driver's insurer will offer a settlement that doesn't reflect that. {state} law has specific " +
        "protections, but you have to know how to use them."
      );
    case "bicycle_accident":
      return (
        "A catastrophic cycling injury near {market_display_name} — traumatic brain injury, spinal " +
        "damage — means lifetime medical care, lost earning capacity, and future losses adjusters " +
        "routinely undervalue. {state} cycling laws have specific protections worth understanding " +
        "before you accept anything."
      );
    case "slip_and_fall":
      return (
        "A catastrophic fall in the {market_display_name} area — traumatic brain injury, hip fracture " +
        "with complications, spinal damage — means lifetime medical care and lost income. The " +
        "property owner's insurer will fight the case on notice (did they know about the hazard?) " +
        "while undervaluing the lifetime cost. Both fronts matter."
      );
    case "dog_bite":
      return (
        "Severe dog attacks near {market_display_name} cause lasting damage — disfiguring scars, " +
        "nerve damage, PTSD that often requires years of therapy. Homeowner's insurance is what " +
        "covers these claims, and the first offer rarely accounts for what long-term recovery " +
        "actually costs."
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
  const callout = ((): string => {
    switch (template.category) {
      case "motorcycle_accident":
        return " We've handled catastrophic motorcycle cases and know what your future actually costs.";
      case "boating_accident":
        return " We've handled catastrophic maritime injury cases and know what these claims are really worth.";
      case "car_accident":
        return " We've handled catastrophic injury cases and know what your future actually costs.";
      case "truck_accident":
        return " We've handled catastrophic commercial trucking cases and know what your future actually costs.";
      case "premises_liability":
        return " We've handled catastrophic premises cases and know what these claims are really worth.";
      case "pedestrian_accident":
        return " We've handled catastrophic pedestrian injury cases and know how to use {state}'s pedestrian protections.";
      case "bicycle_accident":
        return " We've handled catastrophic cycling cases and know the {state}-specific rules that apply.";
      case "slip_and_fall":
        return " We've handled catastrophic fall cases and know what evidence wins them.";
      case "dog_bite":
        return " We've handled severe dog attack cases and know what long-term recovery actually costs.";
      default:
        return " We've handled catastrophic injury cases and know what these claims are really worth.";
    }
  })();

  return template.authority.replace(/\.$/, "." + callout);
}

/**
 * Universal CTA for catastrophic modifier. Frames around evaluating
 * the offer before accepting — the most actionable behavior change
 * for catastrophic claimants who often settle too early.
 */
const CATASTROPHIC_CTA =
  "Before you accept any offer, get a real case evaluation. Free, no obligation, no fee unless we win.";
