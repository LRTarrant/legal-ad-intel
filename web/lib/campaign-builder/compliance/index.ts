/**
 * State Compliance Layer — Public API
 *
 * Applies state-specific advertising rules to a rendered (and
 * optionally severity-modified) PI template. Runs after severity
 * modifiers, before the script is shown to the user or sent to the
 * audio/video generation step.
 *
 * Order of operations (per SPEC §2.5):
 *   1. Base PI template rendered with vars
 *   2. Severity modifiers applied
 *   3. State compliance pass (THIS LAYER)
 *   4. LLM prompt assembled by generate-* routes
 *
 * IMPORTANT: This is marketing-risk guidance, not legal review.
 * See compliance/types.ts for the full disclaimer.
 */

import type { PITemplate } from "../pi-templates/types";
import type {
  ComplianceFlag,
  ComplianceResult,
  StateCode,
} from "./types";
import {
  GENERIC_RULES,
  STATE_RULES,
  UNIVERSAL_FLAGGED_PHRASES,
  getStateRules,
} from "./state-rules";

export type {
  ComplianceFlag,
  ComplianceFlagSeverity,
  ComplianceResult,
  StateCode,
  StateComplianceRules,
} from "./types";
export { STATE_RULES, GENERIC_RULES, UNIVERSAL_FLAGGED_PHRASES };

/**
 * Apply compliance rules for a given state to a rendered PITemplate.
 *
 * What we do:
 *   1. Append (or replace) the disclaimer with the state's required
 *      version, if the existing disclaimer doesn't already include
 *      the key required phrasing.
 *   2. Prepend "ATTORNEY ADVERTISING" to the disclaimer if the state
 *      requires it.
 *   3. Scan all script sections for flagged phrases and produce
 *      compliance flags.
 *   4. Surface a 'review' flag if the state requires pre-publication
 *      filing.
 *
 * What we don't do:
 *   - Modify the hook/problem/authority/CTA copy. Those are creative
 *     content; we only touch the disclaimer.
 *   - Auto-strip flagged language. We surface flags so the user can
 *     decide; auto-stripping would silently change creative intent.
 *   - Block generation. Even with serious flags, we return a result
 *     and let the user decide whether to proceed.
 */
export function applyStateCompliance(
  template: PITemplate,
  state: StateCode | null | undefined,
): ComplianceResult {
  const { rules, hasExplicitRules } = getStateRules(state);

  // ── 1. Build the disclaimer ──────────────────────────────────────
  // If the template already includes the state's required disclaimer
  // text, leave it alone. Otherwise append. We never duplicate.
  const existingDisclaimer = template.baseDisclaimer ?? "";
  const requiredDisclaimer = rules.priorResultsDisclaimer;
  const requiresLabel = rules.requiresAdvertisingLabel;

  let finalDisclaimer = existingDisclaimer.trim();

  // Add the prior-results disclaimer if it isn't already there
  // (case-insensitive substring check on the key phrase).
  const hasPriorResultsLanguage = /prior results do not guarantee/i.test(
    finalDisclaimer,
  );
  if (!hasPriorResultsLanguage) {
    finalDisclaimer = finalDisclaimer
      ? `${finalDisclaimer} ${requiredDisclaimer}`
      : requiredDisclaimer;
  }

  // Prepend "Attorney Advertising" label for states that require it
  // (NY). NY rule 7.1(f) requires the label appear at the start as
  // a clear, conspicuous header — not buried in disclaimer body. We
  // normalize to title-case at the start regardless of any casing
  // already in the existing disclaimer.
  if (requiresLabel) {
    // Strip any existing "attorney advertising" / "Attorney advertising"
    // / "ATTORNEY ADVERTISING" prefix and replace with the proper label.
    const labelStripRe = /^(attorney advertising[.,]?\s*)/i;
    finalDisclaimer = finalDisclaimer.replace(labelStripRe, "").trim();
    finalDisclaimer = `Attorney Advertising. ${finalDisclaimer}`;
  }

  const finalTemplate: PITemplate = {
    ...template,
    baseDisclaimer: finalDisclaimer,
  };

  // ── 2. Scan for flagged phrases ──────────────────────────────────
  const flags: ComplianceFlag[] = [];
  const scanSections: Array<{ key: keyof PITemplate; text: string }> = [
    { key: "hook", text: template.hook },
    { key: "problem", text: template.problem },
    { key: "authority", text: template.authority },
    { key: "cta", text: template.cta },
  ];
  if (template.socialProof) {
    scanSections.push({ key: "socialProof", text: template.socialProof });
  }

  const allFlaggedPhrases = [
    ...UNIVERSAL_FLAGGED_PHRASES,
    ...rules.flaggedPhrases,
  ];

  for (const section of scanSections) {
    const lower = section.text.toLowerCase();
    for (const phrase of allFlaggedPhrases) {
      if (lower.includes(phrase.toLowerCase())) {
        flags.push({
          severity: "warning",
          summary: `"${phrase}" may be considered misleading`,
          detail:
            `The phrase "${phrase}" appears in the ${section.key} ` +
            `section. ${rules.stateName} (and ABA Model Rule 7.1 generally) ` +
            `restrict unverifiable superlative or guarantee language. ` +
            `Consider revising before publication.`,
          section: section.key,
        });
      }
    }
  }

  // ── 3. Pre-publication review flag ───────────────────────────────
  if (rules.preReviewRecommended) {
    flags.push({
      severity: "review",
      summary: `${rules.stateName} requires pre-publication review`,
      detail: rules.uxNote ?? `${rules.stateName} bar rules require ` +
        "pre-publication filing or review committee approval for " +
        "most public marketing. Verify your specific format and media type.",
    });
  }

  // ── 4. State without explicit rules (informational, not an error) ──
  if (!hasExplicitRules && state) {
    flags.push({
      severity: "warning",
      summary: `No curated rules for ${state}`,
      detail:
        `Compliance rules for ${state} aren't curated yet. The universal ` +
        `disclaimer was applied as a baseline. Verify ${state}'s current ` +
        `bar rules directly before publishing.`,
    });
  }

  return {
    template: finalTemplate,
    flags,
    state: (state ?? "").toUpperCase(),
    stateName: rules.stateName,
    hasExplicitRules,
  };
}
