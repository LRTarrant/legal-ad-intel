/**
 * Unit tests for CriteriaSection.
 * node:test + node:assert, rendered with react-dom/server (no test-renderer dep).
 * Run with `npx tsx --test`.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

import CriteriaSection from "./CriteriaSection";
import type { StrategyQualificationCriteria } from "@/lib/strategy-engine/standalone";

/** A boating-shaped fixture: a universal screening question + a case-type delta
 *  (one of which is a Jones Act question), a disqualifier, a factor, an SOL note,
 *  and a confidence. Mirrors what the merge in pi-qualification-criteria.ts emits. */
const boatingCriteria: StrategyQualificationCriteria = {
  case_type: "boating",
  screening_questions: [
    {
      id: "uni-injured",
      question: "Were you injured?",
      purpose: "Confirm bodily injury exists",
      type: "yes_no",
      evidence: "observed",
      scope: "universal",
      source: "Universal source",
      theory: null,
    },
    {
      id: "boat-jones-act-seaman",
      question: "[Jones Act] Are you a seaman/crew spending 30%+ of work time aboard?",
      purpose: "Seaman-status gate that unlocks a Jones Act claim",
      type: "yes_no",
      evidence: "observed",
      scope: "specific",
      source: "Southern Injury",
      theory: "jones_act",
    },
  ],
  disqualifiers: [
    { label: "Claimant was the boater under the influence (own BUI)", evidence: "inferred", theory: null },
    { label: "[Jones Act] Not a seaman — routes to LHWCA", evidence: "observed", theory: "jones_act" },
  ],
  case_type_specific_factors: [
    { label: "Vessel type dictates legal theory", evidence: "observed", theory: null },
  ],
  disqualify_message: null,
  qualify_message: null,
  sol_note: "Jurisdiction-dependent; screen for the EARLIEST applicable clock.",
  confidence: "medium-high",
  source_notes: "Landing-page-sourced; ad-side screening is thin.",
};

test("CriteriaSection renders both the universal question and the case-type delta", () => {
  const html = renderToStaticMarkup(createElement(CriteriaSection, { criteria: boatingCriteria }));
  assert.ok(html.includes("Were you injured?"), "universal screening question renders");
  assert.ok(
    html.includes("Are you a seaman/crew spending 30%+ of work time aboard?"),
    "case-type delta question renders",
  );
});

test("CriteriaSection labels Jones Act questions with a badge and strips the [Jones Act] prefix", () => {
  const html = renderToStaticMarkup(createElement(CriteriaSection, { criteria: boatingCriteria }));
  assert.ok(html.includes("Jones Act"), "Jones Act badge renders");
  assert.ok(
    !html.includes("[Jones Act] Are you a seaman"),
    "the leading [Jones Act] marker is stripped from the question text",
  );
});

test("CriteriaSection shows a confidence pill", () => {
  const html = renderToStaticMarkup(createElement(CriteriaSection, { criteria: boatingCriteria }));
  assert.ok(html.includes("medium-high confidence"), "confidence pill renders");
});

test("CriteriaSection omits nothing for a boating criteria block", () => {
  const html = renderToStaticMarkup(createElement(CriteriaSection, { criteria: boatingCriteria }));
  // screening questions, disqualifiers, factors, SOL note all present
  assert.ok(html.includes("Screening questions"), "screening section header");
  assert.ok(html.includes("Disqualifiers"), "disqualifiers section header");
  assert.ok(html.includes("boater under the influence"), "disqualifier renders");
  assert.ok(html.includes("Vessel type dictates legal theory"), "case-type factor renders");
  assert.ok(html.includes("Statute of limitations"), "SOL section header");
  assert.ok(html.includes("EARLIEST applicable clock"), "SOL note text renders");
  // observed vs inferred evidence pills both present
  assert.ok(html.includes("observed"), "observed pill renders");
  assert.ok(html.includes("inferred"), "inferred pill renders");
});

test("CriteriaSection renders the optional tie-in line when provided", () => {
  const tieIn = "Good qualification is what moves the lead-to-signed rate.";
  const html = renderToStaticMarkup(
    createElement(CriteriaSection, { criteria: boatingCriteria, tieIn }),
  );
  assert.ok(html.includes(tieIn), "tie-in line renders when passed");
});
