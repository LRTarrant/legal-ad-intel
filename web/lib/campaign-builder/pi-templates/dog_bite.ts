import type { PITemplate } from "./types";

/**
 * Dog Bite PI Template
 *
 * Hook angle: "Most dog bite cases are paid by homeowner's insurance
 * — not the dog's owner personally."
 *
 * Why this category needs its own template:
 *   - The single biggest emotional barrier to filing is "I don't
 *     want to ruin my friendship with the owner." Most people don't
 *     realize homeowner's insurance is what actually pays.
 *   - Once that misconception is cleared, the case is often easy
 *     to sign — strict liability or one-bite rule applies in most
 *     states for typical bite scenarios
 *   - Average case values are reasonable but not enormous; volume
 *     play more than premium play
 *   - State law variations matter (strict liability vs. one-bite),
 *     but the headline framing works in any state
 */
export const dogBiteTemplate: PITemplate = {
  category: "dog_bite",
  displayName: "Dog Bite",

  hook: "Most dog bite cases are paid by homeowner's insurance — not the dog's owner personally.",

  problem:
    "If you were bitten in the {market_display_name} area, you might be hesitating because you know the owner. Most people don't realize homeowner's insurance is what actually pays these claims. The owner doesn't write a check from their own pocket. You can get medical bills, lost wages, and pain and suffering covered without putting a friend in financial hardship.",

  authority:
    "{firm_name} handles {state} dog bite cases with discretion. We know how these claims work in your state — strict liability, one-bite rule, the specific factors a jury considers — and we walk you through the process without drama.",

  cta: "You can get covered without ruining a friendship. Free, confidential review.",

  baseDisclaimer:
    "Attorney advertising. Prior results do not guarantee a similar outcome.",

  toneHint:
    "Warm and reassuring. The hook works because it removes guilt; the tone needs to reinforce that. Avoid aggressive defense-language (\"hold them accountable\", \"go after\"). Speak about the owner as a person, not a defendant. Confidentiality is a feature here — say it explicitly.",
};
