import type { PITemplate } from "./types";

/**
 * Motorcycle Accident PI Template
 *
 * Hook angle: jury bias against riders. Most lawyers don't fight this; we do.
 * Common script angle: "Juries assume motorcycle riders are reckless. We know they're usually not the ones at fault."
 *
 * Why this category needs its own template:
 *   - Motorcycle cases face systemic insurance bias (helmet defense, "risky behavior")
 *   - Higher case values when liability is established but heavily contested
 *   - Riders self-identify; tone should validate their experience, not condescend
 */
export const motorcycleAccidentTemplate: PITemplate = {
  category: "motorcycle_accident",
  displayName: "Motorcycle Accident",

  hook: "Juries assume motorcycle riders are reckless. We know they're usually not the ones at fault.",

  problem:
    "If you were hit while riding in the {market_display_name} area, the insurance company is already building a case against you. Helmet defense. Lane-splitting claims. \"You should've seen them coming.\" None of it changes who actually caused the wreck.",

  authority:
    "{firm_name} has fought this bias in {state} courts and won. We know how to present your case to a jury that may not understand what it's like to ride.",

  cta: "Don't let the insurance company write you off. Free consultation, no fee unless we win.",

  baseDisclaimer:
    "Attorney advertising. Prior results do not guarantee a similar outcome.",

  toneHint:
    "Direct, validating, and confident. Speak to riders like a peer who understands the bias they face. Avoid condescension and avoid framing motorcycling itself as risky behavior. Use \"hit while riding\" framing rather than \"motorcycle accident\" when natural.",
};
