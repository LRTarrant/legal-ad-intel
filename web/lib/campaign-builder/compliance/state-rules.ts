/**
 * State Compliance Rule Definitions
 *
 * Top 10 PI-volume states (TX, CA, FL, NY, GA, PA, IL, OH, NC, MI)
 * have explicit rules. Other states fall back to GENERIC_RULES
 * (ABA Model Rule 7.1 baseline + universal disclaimer).
 *
 * Sources for rule curation (verified May 2026):
 *   - NY: 22 NYCRR 1200, Rule 7.1(f) — "Attorney Advertising" label
 *         and Rule 7.1(d)/(e) — "Prior results do not guarantee a
 *         similar outcome" disclaimer
 *   - FL: Rules of Professional Conduct 4-7.13–4-7.18 — past results
 *         must be objectively verifiable; certain content categories
 *         require filing
 *   - TX: Texas Disciplinary Rules of Professional Conduct Part VII
 *         — Advertising Review Committee filing for most public
 *         marketing efforts (rules updated 2021)
 *   - CA: Rule 7.1 — truthfulness; testimonials allowed with proper
 *         framing
 *   - PA, IL, OH, GA, NC, MI: Mostly mirror ABA Model Rule 7.1
 *
 * These rules are MARKETING-RISK guidance, not legal compliance
 * verification. Users must verify current state bar requirements
 * directly and have ads cleared by counsel before publication.
 */

import type { StateCode, StateComplianceRules } from "./types";

/**
 * Universal flagged phrases applied across ALL states regardless of
 * state-specific rules. These are language patterns that ABA Model
 * Rule 7.1 would consider misleading or unverifiable in any U.S.
 * jurisdiction.
 *
 * State-specific rules add MORE phrases on top of these; they don't
 * replace them.
 */
export const UNIVERSAL_FLAGGED_PHRASES: string[] = [
  // Guarantee language — never permitted in any state
  "guaranteed",
  "guarantee a",
  "guarantee you",
  "we guarantee",
  // Superlative language without verification
  "best lawyer",
  "best attorney",
  "best law firm",
  "top lawyer",
  "top attorney",
  "#1 lawyer",
  "#1 attorney",
  "number one lawyer",
  // Misleading specialization claims
  "expert in",
  "specialist in",
  "we specialize",
  // Fee/result claims that need verification
  "always win",
  "never lose",
  "100% success",
  "millions for you",
];

/**
 * Universal disclaimer used when state-specific rules don't supply
 * one. ABA Model Rule 7.1 baseline.
 */
const ABA_BASELINE_DISCLAIMER =
  "Attorney advertising. Prior results do not guarantee a similar outcome.";

/**
 * Top 10 PI-volume states. Order roughly matches their PI ad spend
 * concentration; the lookup is by state code so order doesn't matter
 * functionally.
 */
export const STATE_RULES: Record<StateCode, StateComplianceRules> = {
  // ── New York ─────────────────────────────────────────────────────────
  // Strictest of the top 10. Mandatory "Attorney Advertising" label,
  // mandatory "Prior results" disclaimer, restrictions on testimonials.
  NY: {
    stateName: "New York",
    requiresAdvertisingLabel: true,
    priorResultsDisclaimer:
      "Attorney Advertising. Prior results do not guarantee a similar outcome.",
    preReviewRecommended: false,
    flaggedPhrases: [
      // NY rule 7.1(d) restricts these specifically
      "won millions",
      "millions won",
      "millions recovered",
      "largest verdict",
      "record settlement",
    ],
    uxNote:
      "New York requires an 'Attorney Advertising' label on all ads. " +
      "Past-results language must be accompanied by the disclaimer. " +
      "Testimonials require additional framing — review with counsel.",
  },

  // ── Florida ──────────────────────────────────────────────────────────
  // Past results allowed but must be objectively verifiable. Some
  // content categories (e.g. direct mail) require filing.
  FL: {
    stateName: "Florida",
    requiresAdvertisingLabel: false,
    priorResultsDisclaimer: ABA_BASELINE_DISCLAIMER,
    preReviewRecommended: true,
    flaggedPhrases: [
      "we recovered",
      "record-breaking",
      "biggest settlement",
    ],
    uxNote:
      "Florida allows past-results language but requires it be " +
      "objectively verifiable. Direct mail and some other categories " +
      "must be filed with The Florida Bar before use.",
  },

  // ── Texas ────────────────────────────────────────────────────────────
  // Texas Advertising Review Committee mandates pre-publication filing
  // for most public marketing under Part VII of the Disciplinary Rules.
  TX: {
    stateName: "Texas",
    requiresAdvertisingLabel: false,
    priorResultsDisclaimer: ABA_BASELINE_DISCLAIMER,
    preReviewRecommended: true,
    flaggedPhrases: [],
    uxNote:
      "Texas requires most public marketing to be filed with the " +
      "Advertising Review Committee. Verify your specific format and " +
      "media type with current Part VII rules.",
  },

  // ── California ───────────────────────────────────────────────────────
  // Rule 7.1 truthfulness baseline. Testimonials allowed with proper
  // framing.
  CA: {
    stateName: "California",
    requiresAdvertisingLabel: false,
    priorResultsDisclaimer: ABA_BASELINE_DISCLAIMER,
    preReviewRecommended: false,
    flaggedPhrases: [],
    uxNote:
      "California Rule 7.1 prohibits false or misleading communications. " +
      "Testimonials are permitted with appropriate framing.",
  },

  // ── Georgia ──────────────────────────────────────────────────────────
  GA: {
    stateName: "Georgia",
    requiresAdvertisingLabel: false,
    priorResultsDisclaimer: ABA_BASELINE_DISCLAIMER,
    preReviewRecommended: false,
    flaggedPhrases: [],
  },

  // ── Pennsylvania ─────────────────────────────────────────────────────
  PA: {
    stateName: "Pennsylvania",
    requiresAdvertisingLabel: false,
    priorResultsDisclaimer: ABA_BASELINE_DISCLAIMER,
    preReviewRecommended: false,
    flaggedPhrases: [],
  },

  // ── Illinois ─────────────────────────────────────────────────────────
  IL: {
    stateName: "Illinois",
    requiresAdvertisingLabel: false,
    priorResultsDisclaimer: ABA_BASELINE_DISCLAIMER,
    preReviewRecommended: false,
    flaggedPhrases: [],
  },

  // ── Ohio ─────────────────────────────────────────────────────────────
  OH: {
    stateName: "Ohio",
    requiresAdvertisingLabel: false,
    priorResultsDisclaimer: ABA_BASELINE_DISCLAIMER,
    preReviewRecommended: false,
    flaggedPhrases: [],
  },

  // ── North Carolina ───────────────────────────────────────────────────
  NC: {
    stateName: "North Carolina",
    requiresAdvertisingLabel: false,
    priorResultsDisclaimer: ABA_BASELINE_DISCLAIMER,
    preReviewRecommended: false,
    flaggedPhrases: [],
  },

  // ── Michigan ─────────────────────────────────────────────────────────
  // MRPC 7.1 baseline; recent platform-restriction rule (MRPC 7.2(d))
  // applies to some Google/Facebook-style targeting but not script content.
  MI: {
    stateName: "Michigan",
    requiresAdvertisingLabel: false,
    priorResultsDisclaimer: ABA_BASELINE_DISCLAIMER,
    preReviewRecommended: false,
    flaggedPhrases: [],
    uxNote:
      "Michigan MRPC 7.2(d) places restrictions on certain platform " +
      "targeting (e.g. Google, Facebook). Verify your distribution " +
      "channel separately.",
  },
};

/**
 * Generic fallback for states without explicit rules. ABA Model Rule
 * 7.1 baseline.
 */
export const GENERIC_RULES: StateComplianceRules = {
  stateName: "U.S. (generic)",
  requiresAdvertisingLabel: false,
  priorResultsDisclaimer: ABA_BASELINE_DISCLAIMER,
  preReviewRecommended: false,
  flaggedPhrases: [],
};

/**
 * Look up the rules for a state code. Returns generic rules and a
 * `hasExplicitRules: false` indicator when the state isn't in the
 * top-10 curated list.
 */
export function getStateRules(state: StateCode | null | undefined): {
  rules: StateComplianceRules;
  hasExplicitRules: boolean;
} {
  if (!state) {
    return { rules: GENERIC_RULES, hasExplicitRules: false };
  }
  const upper = state.toUpperCase();
  const rules = STATE_RULES[upper];
  return rules
    ? { rules, hasExplicitRules: true }
    : { rules: GENERIC_RULES, hasExplicitRules: false };
}
