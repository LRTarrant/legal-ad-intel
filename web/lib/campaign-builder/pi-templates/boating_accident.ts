import type { PITemplate } from "./types";

/**
 * Boating Accident PI Template
 *
 * Hook angle: maritime law specialty. Most lawyers don't handle these cases;
 * jurisdictional complexity (state vs. federal admiralty) and short filing
 * deadlines (often 3 years for general maritime, but shorter for specific claims)
 * make boating cases a niche.
 *
 * Why this category needs its own template:
 *   - Maritime / admiralty jurisdiction is unfamiliar territory for most PI lawyers
 *   - Evidence deteriorates fast (boats move, witnesses scatter, water removes evidence)
 *   - Higher average case value, lower volume — the urgency is real
 *   - Seasonal demand (summer is peak); copy should leverage timing
 */
export const boatingAccidentTemplate: PITemplate = {
  category: "boating_accident",
  displayName: "Boating Accident",

  hook: "Boating accidents involve maritime law. Most lawyers don't handle these. We do.",

  problem:
    "If you were hurt on the water near {market_display_name}, you're up against a different set of rules. Maritime jurisdiction. Federal admiralty law. Filing deadlines that can be much shorter than a regular accident claim. And evidence on the water disappears fast — boats are moved, witnesses scatter, conditions change overnight.",

  authority:
    "{firm_name} handles {state} boating cases with the maritime experience these claims actually require.",

  cta: "Time matters more in boating cases than people realize. Free consultation, no fee unless we win.",

  baseDisclaimer:
    "Attorney advertising. Prior results do not guarantee a similar outcome.",

  toneHint:
    "Authoritative and specialized. Convey that boating cases are a different animal — not just \"car accidents on water.\" Lean into urgency around evidence preservation. For lakes and rivers, the maritime angle still applies under federal navigability rules; don't shy away from it.",
};
