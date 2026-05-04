import type { PITemplate } from "./types";

/**
 * Slip and Fall PI Template
 *
 * Hook angle: notice. The whole case turns on whether the property
 * owner knew (or should have known) about the hazard. That's the
 * question juries decide and adjusters try to muddy.
 *
 * Why this category needs its own template:
 *   - Liability hinges on notice (actual or constructive) — a unique
 *     legal element that doesn't apply to most other PI categories
 *   - Property owners and insurers reflexively use the "open and
 *     obvious" defense and attempt to blame the victim
 *   - Critical evidence (incident reports, prior complaints,
 *     surveillance footage, maintenance logs) gets destroyed quickly
 *   - Cases are often dismissed on summary judgment when evidence
 *     of notice can't be established — speed of investigation matters
 */
export const slipAndFallTemplate: PITemplate = {
  category: "slip_and_fall",
  displayName: "Slip and Fall",

  hook: "Did the property owner know the hazard was there? That's the question that wins these cases.",

  problem:
    "If you slipped and fell on someone else's property in the {market_display_name} area, the owner and their insurer are already preparing the same defense: it was open and obvious, you should have seen it. The only thing that beats that defense is evidence the owner knew the hazard existed and didn't fix it. That evidence — incident reports, prior complaints, surveillance footage — gets destroyed quickly.",

  authority:
    "{firm_name} investigates {state} slip and fall cases the way they need to be investigated: maintenance logs, prior incident reports, surveillance footage, before any of it disappears.",

  cta: "If you fell on someone else's property, you may have a case. Free review, no fee unless we win.",

  baseDisclaimer:
    "Attorney advertising. Prior results do not guarantee a similar outcome.",

  toneHint:
    "Direct and investigative. The differentiator here is showing the firm understands what wins these cases — notice, not just injury severity. Avoid framing the caller as careless (\"if you were paying attention this wouldn't have happened\" is a defense talking point, not a plaintiff hook). Use \"property owner\" rather than \"defendant\" in voice copy; sounds more conversational.",
};
