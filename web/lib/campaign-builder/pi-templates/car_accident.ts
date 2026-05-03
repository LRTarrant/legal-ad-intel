import type { PITemplate } from "./types";

/**
 * Car Accident PI Template
 *
 * Hook angle: insurance company is already working against you. The most
 * universal PI category — broad audience, high volume, well-understood
 * dynamics on both sides. Differentiation is in execution, not concept.
 *
 * Why this category needs its own template:
 *   - Volume: this is the bread and butter of most PI firms
 *   - Specific friction points consumers know: adjusters, recorded statements,
 *     quick lowball offers
 *   - "Don't talk to the adjuster" is a strong, recognized hook
 *   - Localization matters — copy should feel rooted in the user's market
 */
export const carAccidentTemplate: PITemplate = {
  category: "car_accident",
  displayName: "Car Accident",

  hook: "If you were hit by another driver in the {market_display_name} area, the insurance company is already working against you.",

  problem:
    "The other driver's adjuster will call within hours. They'll ask for a recorded statement. They'll offer a quick settlement before you even know how badly you're hurt. That offer is almost never what your case is actually worth.",

  authority:
    "{firm_name} has handled thousands of {state} car accident cases. We know what these claims are actually worth — and what insurance companies will try to pay you to make them go away.",

  cta: "Don't talk to the adjuster until you talk to us. Free case review, no fee unless we win.",

  baseDisclaimer:
    "Attorney advertising. Prior results do not guarantee a similar outcome.",

  toneHint:
    "Authoritative but approachable. Speak to a broad audience without legalese. Lean on the universal experience of dealing with insurance adjusters — that's the resonance point. Avoid the word \"lawsuit\"; use \"claim\" or \"case\" instead.",
};
