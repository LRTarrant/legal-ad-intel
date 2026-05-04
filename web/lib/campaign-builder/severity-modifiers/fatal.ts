import type { PITemplate, PITemplateVars } from "../pi-templates/types";
import { renderTemplate } from "../pi-templates/types";
import type { SeverityModifierFn } from "./types";

/**
 * Fatal Severity Modifier (Wrongful Death)
 *
 * Transforms a base PI template into a wrongful-death-appropriate
 * version. Used when severity_modifiers includes 'fatal'.
 *
 * What changes:
 *   - HOOK: pattern-interrupt language is replaced with somber
 *     acknowledgment. No "act fast" / "call now" energy.
 *   - PROBLEM: reframed to address the family and the loss, not the
 *     injured person.
 *   - AUTHORITY: adds wrongful death case experience.
 *   - CTA: removes urgency ("call now", "time matters") and replaces
 *     with "when you're ready". Families respond to permission, not pressure.
 *   - TONE HINT: adjusts voice direction for the LLM (lower energy,
 *     longer pauses, no enthusiasm markers).
 *
 * What is preserved:
 *   - The legal category framing (a fatal car wreck is still a car
 *     accident case; a fatal boating accident still involves maritime law)
 *   - Firm name, market, state — those localization vars stay intact
 *   - The base disclaimer (the state compliance layer in Task 8 will
 *     add wrongful death-specific text per state)
 *
 * Why this is a function, not 9 hand-written wrongful-death templates:
 *   - Saves combinatorial work as we add the remaining 6 categories
 *   - Single place to tweak fatal-tone choices across all categories
 *   - Hooks built around category-specific wording stay consistent
 *     ("on the water" stays for boating, "while riding" stays for motorcycle)
 */
export const fatalModifier: SeverityModifierFn = (
  template: PITemplate,
  vars: PITemplateVars,
): PITemplate => {
  return {
    ...template,
    displayName: `${template.displayName} — Wrongful Death`,

    hook: renderTemplate(buildFatalHook(template), vars),
    problem: renderTemplate(buildFatalProblem(template), vars),
    authority: renderTemplate(buildFatalAuthority(template), vars),
    // Strip socialProof — results-touting language is inappropriate
    // for wrongful death copy regardless of state bar rules.
    socialProof: undefined,
    cta: FATAL_CTA,
    baseDisclaimer: template.baseDisclaimer,

    toneHint:
      "Somber, respectful, low energy. Speak to the family directly — never to the deceased. " +
      "Acknowledge the loss without dwelling on it. Avoid urgency markers (\"call now\", \"act fast\", " +
      "\"time matters\") — these are inappropriate when speaking to grieving families. Use natural " +
      "pauses. Voice direction: warm female or measured male; never the high-energy radio voice " +
      "used for standard injury copy.",
  };
};

/* ── Section builders ──────────────────────────────────────────────────────
   Each builder takes the rendered base template and returns wrongful-death
   appropriate copy. They preserve category-specific anchors (motorcycle =
   "while riding", boating = "on the water") so the modifier doesn't strip
   the differentiation that makes these categories worth having.
   ────────────────────────────────────────────────────────────────────────── */

function buildFatalHook(template: PITemplate): string {
  switch (template.category) {
    case "motorcycle_accident":
      return "Nothing brings them back. But the driver who took them from you should be held accountable.";
    case "boating_accident":
      return "Losing someone on the water is a different kind of loss. The legal questions are different too.";
    case "car_accident":
      return "Nothing brings them back. But the driver who took them from you should be held accountable.";
    case "truck_accident":
      return "Losing someone to a commercial truck crash isn't a routine claim. The trucking company already has a team working to limit what your family is owed.";
    case "premises_liability":
      return "Nothing brings them back. But the property owner who let this happen should be held accountable.";
    case "pedestrian_accident":
      return "Nothing brings them back. But the driver who hit them should answer for it.";
    case "bicycle_accident":
      return "Nothing brings them back. But the driver who hit them should answer for it.";
    case "slip_and_fall":
      return "Falls become fatal more often than people realize — especially when the property owner knew the hazard was there.";
    case "dog_bite":
      // Dog-bite fatalities are rare but real (typically severe attacks
      // on children or elderly). Tone stays gentle.
      return "Losing a loved one to a dog attack is a tragedy that didn't have to happen.";
    default:
      // Fallback for any category we add later. Generic but still respectful.
      return "Nothing brings them back. But the people responsible should be held accountable.";
  }
}

function buildFatalProblem(template: PITemplate): string {
  // Returns text with {market_display_name} placeholders that the caller
  // re-renders via renderTemplate(). Keeps localization intact even though
  // we replace the entire problem section.
  switch (template.category) {
    case "motorcycle_accident":
      return (
        "After a fatal motorcycle crash in the {market_display_name} area, insurance companies move " +
        "fast. They'll lean on rider bias — helmet defense, lane-splitting, \"they shouldn't have been " +
        "there\" — to limit what your family is owed. Your family deserves better than that."
      );
    case "boating_accident":
      return (
        "Maritime law adds complexity to wrongful death claims that most lawyers near {market_display_name} " +
        "aren't prepared for. Federal jurisdiction. Tighter deadlines than land-based cases. Evidence on " +
        "the water that disappears within days. Your family shouldn't have to navigate that alone."
      );
    case "car_accident":
      return (
        "Insurance companies move fast after a fatal crash in the {market_display_name} area to limit " +
        "payouts before families know what they're entitled to. They'll offer a quick settlement that " +
        "won't begin to cover what your family has lost — and what you'll need going forward."
      );
    case "truck_accident":
      return (
        "After a fatal commercial truck crash near {market_display_name}, the trucking company's legal " +
        "team is already working. Driver logs get overwritten, ECM data resets, dashcam footage gets " +
        "deleted within days. Federal trucking regulations create real liability — if you can preserve " +
        "the evidence in time. Your family shouldn't have to handle that alone."
      );
    case "premises_liability":
      return (
        "When a fatal injury happens on someone else's property in the {market_display_name} area, the " +
        "owner's insurer immediately works to argue your loved one was at fault for being there. The " +
        "case turns on whether the owner knew the danger existed and didn't address it — and that " +
        "evidence disappears quickly."
      );
    case "pedestrian_accident":
      return (
        "After a fatal pedestrian crash in the {market_display_name} area, the driver's insurer " +
        "immediately starts shifting fault to the person who was hit. \"They came out of nowhere.\" " +
        "\"They weren't in the crosswalk.\" None of that changes who was driving the vehicle. {state} " +
        "law has specific protections for pedestrians, including in fatal cases."
      );
    case "bicycle_accident":
      return (
        "After a fatal bicycle crash in the {market_display_name} area, the driver's insurer leans " +
        "on cyclist bias to limit what your family is owed. {state} law has specific protections for " +
        "cyclists — doored cyclists, right-hook crashes, intersection right-of-way — but you have to " +
        "know how to use them."
      );
    case "slip_and_fall":
      return (
        "Fatal falls happen more often than people realize, especially with elderly family members. " +
        "The property owner's insurer will argue the hazard was open and obvious — the only thing that " +
        "beats that defense is evidence the owner knew about the hazard. That evidence disappears fast."
      );
    case "dog_bite":
      return (
        "Most fatal dog attacks involve children or elderly family members. The owner's homeowner's " +
        "insurance is what covers these claims, and your family is entitled to compensation that " +
        "helps you move forward. Most lawyers won't take fatal dog attack cases. We do."
      );
    default:
      return (
        "Insurance companies move fast after a fatal accident to limit payouts before families know " +
        "what they're entitled to. Your family deserves a real answer, not a quick offer."
      );
  }
}

function buildFatalAuthority(template: PITemplate): string {
  // Splice wrongful-death experience callout into the firm's existing
  // authority claim. We keep the firm name and state references intact
  // since renderPITemplate() has already substituted them.
  const callout = ((): string => {
    switch (template.category) {
      case "motorcycle_accident":
        return " We also handle wrongful death cases involving motorcycle riders — and we know what your family is owed.";
      case "boating_accident":
        return " We also handle maritime wrongful death claims with the care your family deserves.";
      case "car_accident":
        return " We also handle wrongful death claims arising from car crashes — and we know what your family is owed.";
      case "truck_accident":
        return " We also handle commercial trucking wrongful death claims and know how to preserve the federal-regulation evidence these cases turn on.";
      case "premises_liability":
        return " We also handle wrongful death cases arising from unsafe premises — and we know what evidence wins them.";
      case "pedestrian_accident":
        return " We also handle pedestrian wrongful death claims and the specific {state} laws that apply.";
      case "bicycle_accident":
        return " We also handle cyclist wrongful death claims with the {state}-specific framework these cases require.";
      case "slip_and_fall":
        return " We also handle wrongful death claims arising from fatal falls and know what evidence makes the case.";
      case "dog_bite":
        return " We handle the rare wrongful death cases arising from fatal dog attacks with the care your family deserves.";
      default:
        return " We also handle wrongful death cases with the care your family deserves.";
    }
  })();

  // Splice the callout in before the trailing period.
  return template.authority.replace(/\.$/, "." + callout);
}

/**
 * Universal CTA for fatal modifier. The "when you're ready" framing
 * is intentional — families respond to permission, not pressure.
 * Same across categories because the relational shift is the point.
 */
const FATAL_CTA =
  "When you're ready, we're here. No pressure, no fee unless we win.";
