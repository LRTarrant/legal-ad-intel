import type { PITemplate } from "./types";

/**
 * Bicycle Accident PI Template
 *
 * Hook angle: similar to pedestrian — vulnerable road user — but with
 * a layer of cyclist-specific bias that mirrors motorcycle bias.
 * Drivers and insurers routinely assume cyclists were doing something
 * wrong (riding outside the bike lane, not signaling, ignoring traffic
 * laws). The hook addresses that head-on.
 *
 * Why this category needs its own template:
 *   - Cyclist bias from juries and insurance adjusters is real and
 *     well-documented (similar dynamic to motorcycle cases)
 *   - State-specific bicycle laws vary (mandatory helmet laws,
 *     "vehicular cycling" rules, bike lane requirements) and
 *     adjusters exploit cyclists' uncertainty about them
 *   - Catastrophic head/spine injury rates are high; pairs well with
 *     the catastrophic severity modifier
 *   - Doored cyclists, right-hook crashes, left-cross crashes — each
 *     has specific liability fact patterns the firm should signal
 *     they understand
 */
export const bicycleAccidentTemplate: PITemplate = {
  category: "bicycle_accident",
  displayName: "Bicycle Accident",

  hook: "Drivers and insurers assume cyclists were doing something wrong. We know they usually weren't.",

  problem:
    "If you were hit on your bike in the {market_display_name} area, the driver's insurer has a script ready: you weren't in the bike lane, you didn't signal, you ignored a sign. Most of that is wrong, and even when something is technically true it usually doesn't shift fault. {state} law has specific protections for cyclists — doored cyclists, right-hook and left-cross crashes — but the insurance company is counting on you not knowing them.",

  authority:
    "{firm_name} handles {state} bicycle cases with the right framework — vulnerable road user laws, state-specific cycling rules, and the fact patterns that actually win these cases (right-hooks, dooring, intersection crashes).",

  cta: "Don't let them turn this into your fault. Free consultation, no fee unless we win.",

  baseDisclaimer:
    "Attorney advertising. Prior results do not guarantee a similar outcome.",

  toneHint:
    "Validating and direct. Cyclist bias is the parallel to motorcycle bias — the script should reinforce that the firm understands the dynamic. Don't lecture about helmet use or bike lanes (defensive framing). Use \"hit on your bike\" or \"struck while riding\" rather than \"bicycle accident\" when natural; sounds less clinical.",
};
