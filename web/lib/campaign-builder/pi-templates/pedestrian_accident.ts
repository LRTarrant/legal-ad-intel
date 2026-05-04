import type { PITemplate } from "./types";

/**
 * Pedestrian Accident PI Template
 *
 * Hook angle: vulnerability. Pedestrians don't have airbags, frames,
 * or seatbelts. When a vehicle hits a pedestrian, the injuries are
 * almost always serious or catastrophic — and the law in most states
 * favors the pedestrian.
 *
 * Why this category needs its own template:
 *   - Vulnerable road user laws and crosswalk presumptions favor
 *     pedestrians in most jurisdictions
 *   - Insurance companies routinely try to allocate fault to the
 *     pedestrian ("they shouldn't have been there", "they ran out")
 *     to discount the claim
 *   - Injuries are typically severe — these cases pair well with the
 *     catastrophic severity modifier when applicable
 *   - Hit-and-run is more common than in vehicle-on-vehicle crashes;
 *     uninsured/underinsured motorist coverage analysis matters more
 */
export const pedestrianAccidentTemplate: PITemplate = {
  category: "pedestrian_accident",
  displayName: "Pedestrian Accident",

  hook: "Pedestrians don't have airbags, seatbelts, or steel frames. When a vehicle hits one, the injuries are almost always serious — and the insurance company is already building a case against you.",

  problem:
    "If you were hit while walking in the {market_display_name} area, the driver's insurer is going to try to blame you. \"They came out of nowhere.\" \"They weren't in the crosswalk.\" \"They were on their phone.\" None of that changes who hit whom. {state} law has specific protections for pedestrians, but you have to know how to use them.",

  authority:
    "{firm_name} handles {state} pedestrian cases with the right legal framework — vulnerable road user laws, crosswalk presumptions, uninsured motorist analysis when the driver fled the scene.",

  cta: "Don't let the insurance company shift the blame to you. Free consultation, no fee unless we win.",

  baseDisclaimer:
    "Attorney advertising. Prior results do not guarantee a similar outcome.",

  toneHint:
    "Direct and protective. The framing should center on the pedestrian's vulnerability without making the caller feel weak. Avoid the word \"victim\" — it's defense-friendly framing that suggests passivity. \"Hit while walking\" or \"struck while crossing\" works better. Hit-and-run scenarios are common in this category; the script should hold up whether the driver fled or stayed.",
};
