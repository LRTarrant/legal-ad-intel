import type { PITemplate } from "./types";

/**
 * Truck Accident PI Template
 *
 * Hook angle: "Truck accidents aren't car accidents." Trucking
 * companies have legal teams on the scene fast and federal regulations
 * (FMCSA) create a different evidence and liability picture.
 *
 * Why this category needs its own template:
 *   - Multiple potentially liable parties: driver, motor carrier,
 *     freight broker, manufacturer, maintenance contractor
 *   - Federal Motor Carrier Safety Regulations (FMCSA) governing
 *     hours-of-service, equipment, drug/alcohol testing
 *   - Critical evidence (driver logs, ECM data, dashcam footage)
 *     can be deleted or overwritten within days
 *   - Higher case values than regular auto cases when liability
 *     is established
 *   - Insurance policies are typically much larger ($1M+ minimum
 *     for interstate carriers) — the recovery ceiling is higher
 */
export const truckAccidentTemplate: PITemplate = {
  category: "truck_accident",
  displayName: "Truck Accident",

  hook: "Truck accidents aren't car accidents. The trucking company has a team of lawyers on the way to the scene right now.",

  problem:
    "If you were hit by a commercial truck in the {market_display_name} area, you're up against a different opponent than a regular insurance claim. Federal trucking regulations. Multiple potentially liable parties — the driver, the carrier, the broker, the manufacturer. And evidence that disappears fast: driver logs get overwritten, ECM data resets, dashcam footage gets deleted within days.",

  authority:
    "{firm_name} handles {state} trucking cases with the federal regulation experience these claims actually require. We know how to preserve evidence before it's gone.",

  cta: "Call now — every hour matters when evidence is being destroyed. Free consultation, no fee unless we win.",

  baseDisclaimer:
    "Attorney advertising. Prior results do not guarantee a similar outcome.",

  toneHint:
    "Authoritative and urgent. The evidence-destruction angle is the legitimate hook — don't dilute it with generic personal injury language. Use \"commercial truck\" or \"big rig\" or \"semi\" rather than just \"truck\" when natural to distinguish from passenger pickups. Convey that this is a specialized practice area, not just a bigger car wreck.",
};
