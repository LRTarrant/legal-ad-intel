/**
 * Tests for severity modifiers (fatal, catastrophic).
 *
 * Run with any TS-compatible test runner:
 *   npx vitest run web/lib/campaign-builder/severity-modifiers/severity-modifiers.test.ts
 */

import {
  applySeverityModifiers,
  SEVERITY_MODIFIER_LABELS,
  validateSeverityModifiers,
} from "./index";
import { fatalModifier } from "./fatal";
import { catastrophicModifier } from "./catastrophic";
import { PI_TEMPLATES, renderPITemplate } from "../pi-templates";
import type { PITemplateVars } from "../pi-templates/types";
import { routePracticeArea } from "../practice-area-router";

const VARS: PITemplateVars = {
  market_display_name: "Birmingham",
  state: "Alabama",
  firm_name: "Acme Law",
};

const renderedCar = () => renderPITemplate(PI_TEMPLATES.car_accident!, VARS);
const renderedMoto = () => renderPITemplate(PI_TEMPLATES.motorcycle_accident!, VARS);
const renderedBoat = () => renderPITemplate(PI_TEMPLATES.boating_accident!, VARS);

/* ── validateSeverityModifiers ────────────────────────────────────────── */

test("validate accepts a single known modifier", () => {
  const r = validateSeverityModifiers(["fatal"]);
  expect(r.ok).toBe(true);
  expect(r.applied).toEqual(["fatal"]);
  expect(r.errors).toEqual([]);
});

test("validate accepts catastrophic alone", () => {
  const r = validateSeverityModifiers(["catastrophic"]);
  expect(r.ok).toBe(true);
  expect(r.applied).toEqual(["catastrophic"]);
});

test("validate accepts an empty array", () => {
  const r = validateSeverityModifiers([]);
  expect(r.ok).toBe(true);
  expect(r.applied).toEqual([]);
});

test("validate rejects unknown modifiers with a clear error", () => {
  const r = validateSeverityModifiers(["nuclear"]);
  expect(r.ok).toBe(false);
  expect(r.errors[0]).toContain("Unknown severity modifier");
  expect(r.errors[0]).toContain("nuclear");
});

test("validate rejects fatal + catastrophic combo", () => {
  const r = validateSeverityModifiers(["fatal", "catastrophic"]);
  expect(r.ok).toBe(false);
  expect(r.errors[0]).toContain("mutually exclusive");
  // Should fall back to fatal (safer fail-mode for ad copy)
  expect(r.applied).toEqual(["fatal"]);
});

test("validate dedupes repeated modifiers", () => {
  const r = validateSeverityModifiers(["fatal", "fatal"]);
  expect(r.applied).toEqual(["fatal"]);
});

/* ── applySeverityModifiers — empty / pass-through ────────────────────── */

test("applySeverityModifiers returns input unchanged when no modifiers", () => {
  const base = renderedCar();
  const out = applySeverityModifiers(base, [], VARS);
  expect(out).toBe(base); // same reference, no copy
});

test("applySeverityModifiers does not mutate the input template", () => {
  const base = renderedCar();
  const originalHook = base.hook;
  applySeverityModifiers(base, ["fatal"], VARS);
  expect(base.hook).toBe(originalHook);
});

/* ── fatal modifier ───────────────────────────────────────────────────── */

test("fatal: hook shifts to somber acknowledgment", () => {
  const out = fatalModifier(renderedCar(), VARS);
  expect(out.hook).not.toBe(PI_TEMPLATES.car_accident!.hook);
  // Should NOT contain the urgency-driven base hook language
  expect(out.hook).not.toContain("already working against you");
  // Should acknowledge loss
  expect(out.hook.toLowerCase()).toMatch(/(brings them back|loss|took them)/);
});

test("fatal: removes urgency language from CTA", () => {
  const out = fatalModifier(renderedCar(), VARS);
  expect(out.cta.toLowerCase()).not.toContain("call now");
  expect(out.cta.toLowerCase()).not.toContain("time matters");
  expect(out.cta.toLowerCase()).toContain("when you're ready");
});

test("fatal: removes social proof entirely", () => {
  // socialProof might be undefined to start with, but if it isn't, fatal strips it
  const tpl = renderedCar();
  const tplWithProof = { ...tpl, socialProof: "We've recovered millions." };
  const out = fatalModifier(tplWithProof, VARS);
  expect(out.socialProof).toBeUndefined();
});

test("fatal: preserves firm name and state from base authority", () => {
  const out = fatalModifier(renderedCar(), VARS);
  expect(out.authority).toContain("Acme Law");
  expect(out.authority).toContain("Alabama");
});

test("fatal: keeps category-specific anchor for motorcycle", () => {
  const out = fatalModifier(renderedMoto(), VARS);
  // Motorcycle category should still be referenced somewhere — not generic
  expect(out.problem.toLowerCase()).toMatch(/(motorcycle|rider|helmet)/);
});

test("fatal: keeps market reference after modifier replaces problem text", () => {
  // Regression: catch the case where the modifier overwrites the entire
  // problem section and accidentally drops {market_display_name}.
  const out = fatalModifier(renderedCar(), VARS);
  expect(out.problem).toContain("Birmingham");
});

test("fatal: keeps category-specific anchor for boating", () => {
  const out = fatalModifier(renderedBoat(), VARS);
  expect(out.problem.toLowerCase()).toMatch(/(maritime|water)/);
});

test("fatal: appends wrongful death callout to authority", () => {
  const out = fatalModifier(renderedCar(), VARS);
  expect(out.authority.toLowerCase()).toContain("wrongful death");
});

test("fatal: tone hint forbids urgency markers", () => {
  const out = fatalModifier(renderedCar(), VARS);
  expect(out.toneHint.toLowerCase()).toContain("somber");
  expect(out.toneHint.toLowerCase()).toContain("urgency");
});

test("fatal: displayName flags wrongful death", () => {
  const out = fatalModifier(renderedCar(), VARS);
  expect(out.displayName).toContain("Wrongful Death");
});

/* ── catastrophic modifier ────────────────────────────────────────────── */

test("catastrophic: hook keeps urgency but adds gravity", () => {
  const out = catastrophicModifier(renderedCar(), VARS);
  expect(out.hook.toLowerCase()).toMatch(/(changes your life|lifetime|isn't a regular|isn't a standard)/);
});

test("catastrophic: problem pivots to lifetime cost framing", () => {
  const out = catastrophicModifier(renderedCar(), VARS);
  expect(out.problem.toLowerCase()).toContain("lifetime");
  expect(out.problem.toLowerCase()).toMatch(/(future actually costs|earning capacity|future losses)/);
});

test("catastrophic: CTA frames around offer evaluation", () => {
  const out = catastrophicModifier(renderedCar(), VARS);
  expect(out.cta.toLowerCase()).toContain("before you accept");
});

test("catastrophic: preserves firm + state in authority", () => {
  const out = catastrophicModifier(renderedCar(), VARS);
  expect(out.authority).toContain("Acme Law");
  expect(out.authority).toContain("Alabama");
});

test("catastrophic: keeps market reference", () => {
  // Regression: same as fatal version. Modifier replaces problem text
  // entirely, so it must re-inject {market_display_name}.
  const out = catastrophicModifier(renderedCar(), VARS);
  expect(out.problem).toContain("Birmingham");
});

test("catastrophic: keeps motorcycle-specific framing", () => {
  const out = catastrophicModifier(renderedMoto(), VARS);
  expect(out.problem.toLowerCase()).toContain("motorcycle");
});

test("catastrophic: keeps boating maritime framing", () => {
  const out = catastrophicModifier(renderedBoat(), VARS);
  expect(out.problem.toLowerCase()).toMatch(/(water|maritime)/);
});

test("catastrophic: tone hint avoids cliché words", () => {
  const out = catastrophicModifier(renderedCar(), VARS);
  expect(out.toneHint.toLowerCase()).toContain("avoid");
  expect(out.toneHint.toLowerCase()).toMatch(/(tragic|devastating)/); // mentioned to forbid
});

test("catastrophic: displayName flags catastrophic", () => {
  const out = catastrophicModifier(renderedCar(), VARS);
  expect(out.displayName).toContain("Catastrophic");
});

/* ── Mutual exclusion at the apply layer ──────────────────────────────── */

test("apply: fatal wins when both fatal and catastrophic somehow present", () => {
  const out = applySeverityModifiers(renderedCar(), ["fatal", "catastrophic"], VARS);
  // Fatal-specific marker (CTA capitalizes "When" so check case-insensitively)
  expect(out.cta.toLowerCase()).toContain("when you're ready");
  // Catastrophic-specific marker should NOT be present
  expect(out.cta.toLowerCase()).not.toContain("before you accept");
});

test("apply: catastrophic alone does not produce fatal copy", () => {
  const out = applySeverityModifiers(renderedCar(), ["catastrophic"], VARS);
  expect(out.cta.toLowerCase()).not.toContain("when you're ready");
  expect(out.cta.toLowerCase()).toContain("before you accept");
});

/* ── Router integration ───────────────────────────────────────────────── */

test("router applies fatal modifier end-to-end", () => {
  const result = routePracticeArea({
    practice_area: "personal_injury",
    pi_category: "car_accident",
    market_display_name: "Birmingham",
    state_full_name: "Alabama",
    firm_name: "Acme Law",
    severity_modifiers: ["fatal"],
  });
  if (result.practice_area === "personal_injury") {
    expect(result.template.cta.toLowerCase()).toContain("when you're ready");
    expect(result.severity_modifiers).toEqual(["fatal"]);
    // baseTemplate should still have the unmodified CTA
    expect(result.baseTemplate.cta.toLowerCase()).not.toContain("when you're ready");
  }
});

test("router applies catastrophic modifier end-to-end", () => {
  const result = routePracticeArea({
    practice_area: "personal_injury",
    pi_category: "motorcycle_accident",
    market_display_name: "Tampa",
    state_full_name: "Florida",
    firm_name: "Acme Law",
    severity_modifiers: ["catastrophic"],
  });
  if (result.practice_area === "personal_injury") {
    expect(result.template.cta.toLowerCase()).toContain("before you accept");
    expect(result.template.problem.toLowerCase()).toContain("lifetime");
    // Tampa should still appear (variable substitution preserved)
    expect(result.template.problem).toContain("Tampa");
  }
});

test("router with no modifiers leaves template unchanged", () => {
  const result = routePracticeArea({
    practice_area: "personal_injury",
    pi_category: "boating_accident",
    market_display_name: "Mobile",
    state_full_name: "Alabama",
    firm_name: "Acme Law",
  });
  if (result.practice_area === "personal_injury") {
    expect(result.template).toBe(result.baseTemplate);
    expect(result.severity_modifiers).toEqual([]);
  }
});

/* ── UI label metadata ────────────────────────────────────────────────── */

test("modifier labels exist for both v1 modifiers", () => {
  expect(SEVERITY_MODIFIER_LABELS.fatal.label).toContain("Fatal");
  expect(SEVERITY_MODIFIER_LABELS.catastrophic.label).toContain("Catastrophic");
});

test("modifier tooltips mention mutual exclusion", () => {
  expect(SEVERITY_MODIFIER_LABELS.fatal.tooltip.toLowerCase()).toContain("mutually exclusive");
  expect(SEVERITY_MODIFIER_LABELS.catastrophic.tooltip.toLowerCase()).toContain("mutually exclusive");
});
