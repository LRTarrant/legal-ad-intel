/**
 * State Compliance Types
 *
 * IMPORTANT: This module flags MARKETING risk, not legal compliance.
 * It is not legal advice. Users (plaintiff firms, agencies, media
 * companies) are responsible for clearing their own ads with
 * counsel and any required state bar review committees before
 * running them. The disclaimers we append are the safe universal
 * framing — state bars publish their own current rules and
 * applicants must verify those directly.
 *
 * What this layer does:
 *   1. Append a universal "Attorney advertising. Prior results do not
 *      guarantee a similar outcome" disclaimer when one isn't already
 *      present.
 *   2. Prepend an "Attorney Advertising" label for states that require
 *      one (NY in particular).
 *   3. Flag high-risk language patterns ("guaranteed", "best lawyer",
 *      "won millions") so users see a warning before publishing.
 *   4. Surface a "needs review" warning for any state where the bar
 *      mandates pre-publication filing or review committee approval
 *      (TX, FL for some categories).
 *
 * What this layer does NOT do:
 *   - Block generation or publication
 *   - Claim that a script is bar-compliant
 *   - Replace state bar review or counsel review
 */

import type { PITemplate } from "../pi-templates/types";

/**
 * Two-letter state code (e.g. 'AL', 'TX'). Compliance rules are
 * keyed by this; states without explicit rules use a generic ABA
 * Model Rule 7.1 baseline.
 */
export type StateCode = string;

/**
 * Severity of a compliance flag.
 *
 * 'warning': should be reviewed before publication, but not necessarily
 *            non-compliant. Safe to render to the user.
 * 'review':  the state requires affirmative action (filing, review
 *            committee, in-house counsel sign-off) before this script
 *            can be used. Surface prominently.
 */
export type ComplianceFlagSeverity = "warning" | "review";

export interface ComplianceFlag {
  severity: ComplianceFlagSeverity;
  /** Short, user-facing one-line summary. */
  summary: string;
  /** Optional longer explanation for tooltip / expanded view. */
  detail?: string;
  /** Which section of the script triggered the flag. */
  section?: keyof PITemplate;
}

/**
 * State-level rule definitions. Each top-10 PI state has explicit
 * rules; everything else falls back to GENERIC_RULES below.
 */
export interface StateComplianceRules {
  /**
   * Display name (only for warnings/admin views).
   */
  stateName: string;

  /**
   * If true, prepend "ATTORNEY ADVERTISING" to the disclaimer.
   * NY rule 7.1(f) requires this label on advertising.
   */
  requiresAdvertisingLabel: boolean;

  /**
   * The minimum disclaimer text the state expects when discussing
   * past results, even at a category level. Most states accept the
   * universal "Prior results do not guarantee a similar outcome"
   * framing.
   */
  priorResultsDisclaimer: string;

  /**
   * If true, the state has affirmative pre-publication review
   * requirements (e.g. TX Advertising Review Committee filing for
   * some categories of ads). We don't block, but we surface a
   * 'review' flag so users know to take an extra step.
   */
  preReviewRecommended: boolean;

  /**
   * Forbidden phrase patterns. Each is a case-insensitive substring
   * we look for; if found, we add a 'warning' compliance flag.
   *
   * These are intentionally conservative — false positives are
   * better than false negatives in a marketing-risk layer.
   */
  flaggedPhrases: string[];

  /**
   * State-specific note shown in the UI (e.g. "Florida ads must use
   * objectively verifiable past results framing"). Optional.
   */
  uxNote?: string;
}

export interface ComplianceResult {
  /**
   * The script template with disclaimers appended/prepended as
   * required.
   */
  template: PITemplate;

  /**
   * Flags surfaced for user review. Empty array = no flags.
   */
  flags: ComplianceFlag[];

  /**
   * Which state was used for the rules check. Useful for the UI
   * to label the compliance summary.
   */
  state: StateCode;

  /**
   * The display name of the state (e.g. "New York"). Pulled from
   * the matched rules so the UI doesn't need its own state-name map.
   */
  stateName: string;

  /**
   * True if explicit state rules were applied. False when we fell
   * back to GENERIC_RULES (states without curated rules in v1).
   */
  hasExplicitRules: boolean;
}
