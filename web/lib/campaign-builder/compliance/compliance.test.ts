/**
 * Tests for the state compliance layer.
 *
 * Run with:
 *   npx vitest run web/lib/campaign-builder/compliance/compliance.test.ts
 */

import { applyStateCompliance } from "./index";
import { GENERIC_RULES, STATE_RULES, getStateRules } from "./state-rules";
import type { PITemplate } from "../pi-templates/types";
import { PI_TEMPLATES, renderPITemplate } from "../pi-templates";
import { routePracticeArea } from "../practice-area-router";

const VARS = {
  market_display_name: "Birmingham",
  state: "Alabama",
  firm_name: "Acme Law",
};
const renderedCar = (): PITemplate =>
  renderPITemplate(PI_TEMPLATES.car_accident!, VARS);

/* ── getStateRules ────────────────────────────────────────────────────── */

test("getStateRules returns explicit rules for each top-10 state", () => {
  for (const code of ["NY", "FL", "TX", "CA", "GA", "PA", "IL", "OH", "NC", "MI"]) {
    const { rules, hasExplicitRules } = getStateRules(code);
    expect(hasExplicitRules).toBe(true);
    expect(rules.stateName.length).toBeGreaterThan(0);
  }
});

test("getStateRules falls back to generic for non-curated states", () => {
  const { rules, hasExplicitRules } = getStateRules("AK");
  expect(hasExplicitRules).toBe(false);
  expect(rules).toBe(GENERIC_RULES);
});

test("getStateRules handles null/undefined gracefully", () => {
  expect(getStateRules(null).hasExplicitRules).toBe(false);
  expect(getStateRules(undefined).hasExplicitRules).toBe(false);
});

test("getStateRules is case-insensitive", () => {
  expect(getStateRules("ny").hasExplicitRules).toBe(true);
  expect(getStateRules("Ny").rules.stateName).toBe("New York");
});

/* ── New York: strictest state ────────────────────────────────────────── */

test("NY: prepends 'Attorney Advertising' label to disclaimer", () => {
  const result = applyStateCompliance(renderedCar(), "NY");
  expect(result.template.baseDisclaimer.toLowerCase()).toContain("attorney advertising");
  // "Attorney Advertising" should be at the start (label position)
  expect(result.template.baseDisclaimer).toMatch(/^Attorney Advertising/);
});

test("NY: ensures 'prior results' disclaimer present", () => {
  const result = applyStateCompliance(renderedCar(), "NY");
  expect(result.template.baseDisclaimer.toLowerCase()).toContain(
    "prior results do not guarantee",
  );
});

test("NY: doesn't double-prepend label when already present", () => {
  const tpl: PITemplate = {
    ...renderedCar(),
    baseDisclaimer: "Attorney Advertising. Prior results do not guarantee a similar outcome.",
  };
  const result = applyStateCompliance(tpl, "NY");
  // Only one "Attorney Advertising" occurrence
  const matches = result.template.baseDisclaimer.match(/attorney advertising/gi) ?? [];
  expect(matches.length).toBe(1);
});

test("NY: flags 'won millions' language", () => {
  const tpl: PITemplate = {
    ...renderedCar(),
    socialProof: "We've won millions for our clients.",
  };
  const result = applyStateCompliance(tpl, "NY");
  expect(result.flags.some((f) => f.summary.toLowerCase().includes("won millions"))).toBe(true);
});

/* ── Florida: pre-publication review flag ─────────────────────────────── */

test("FL: surfaces a 'review' flag for pre-publication filing", () => {
  const result = applyStateCompliance(renderedCar(), "FL");
  expect(result.flags.some((f) => f.severity === "review")).toBe(true);
});

test("FL: doesn't add Attorney Advertising label", () => {
  const result = applyStateCompliance(renderedCar(), "FL");
  expect(result.template.baseDisclaimer).not.toMatch(/^Attorney Advertising/);
});

/* ── Texas: pre-publication review ────────────────────────────────────── */

test("TX: surfaces a 'review' flag for Advertising Review Committee", () => {
  const result = applyStateCompliance(renderedCar(), "TX");
  expect(result.flags.some((f) => f.severity === "review")).toBe(true);
  const reviewFlag = result.flags.find((f) => f.severity === "review");
  expect(reviewFlag?.summary.toLowerCase()).toContain("texas");
});

/* ── Universal flagged phrases ────────────────────────────────────────── */

test("flags 'guaranteed' across all states", () => {
  for (const stateCode of ["CA", "AK", "WY"]) {
    const tpl: PITemplate = {
      ...renderedCar(),
      cta: "We guaranteed compensation for your case.",
    };
    const result = applyStateCompliance(tpl, stateCode);
    expect(result.flags.some((f) => f.summary.includes("guaranteed"))).toBe(true);
  }
});

test("flags 'best lawyer' across all states", () => {
  const tpl: PITemplate = {
    ...renderedCar(),
    authority: "We're the best lawyer in town.",
  };
  const result = applyStateCompliance(tpl, "CA");
  expect(result.flags.some((f) => f.summary.includes("best lawyer"))).toBe(true);
});

test("flag includes which section triggered it", () => {
  const tpl: PITemplate = {
    ...renderedCar(),
    hook: "We guarantee a win.",
  };
  const result = applyStateCompliance(tpl, "CA");
  const flag = result.flags.find((f) => f.summary.includes("guarantee"));
  expect(flag?.section).toBe("hook");
});

/* ── Generic states ───────────────────────────────────────────────────── */

test("non-curated state appends generic disclaimer + warning flag", () => {
  const result = applyStateCompliance(renderedCar(), "AK");
  expect(result.template.baseDisclaimer.toLowerCase()).toContain(
    "prior results do not guarantee",
  );
  expect(result.flags.some((f) => f.summary.includes("AK"))).toBe(true);
  expect(result.hasExplicitRules).toBe(false);
});

test("missing state still applies generic disclaimer", () => {
  const result = applyStateCompliance(renderedCar(), undefined);
  expect(result.template.baseDisclaimer.toLowerCase()).toContain(
    "prior results do not guarantee",
  );
  expect(result.hasExplicitRules).toBe(false);
});

/* ── Idempotence: existing disclaimer not duplicated ──────────────────── */

test("doesn't duplicate prior-results disclaimer if already present", () => {
  const tpl: PITemplate = {
    ...renderedCar(),
    baseDisclaimer:
      "Attorney advertising. Prior results do not guarantee a similar outcome.",
  };
  const result = applyStateCompliance(tpl, "GA");
  // Only one "prior results" occurrence
  const matches =
    result.template.baseDisclaimer.match(/prior results/gi) ?? [];
  expect(matches.length).toBe(1);
});

/* ── Clean states (no flagged phrases) ────────────────────────────────── */

test("standard car-accident template has no flagged phrases for GA", () => {
  // GA has no extra flagged phrases beyond universal; the base
  // template doesn't contain 'guaranteed', 'best lawyer', etc.
  const result = applyStateCompliance(renderedCar(), "GA");
  // GA might still have warning for "no curated rules" — but it IS
  // curated, so we expect 0 flags total
  expect(result.flags.length).toBe(0);
});

test("standard motorcycle template generates no flags in CA", () => {
  const moto = renderPITemplate(PI_TEMPLATES.motorcycle_accident!, VARS);
  const result = applyStateCompliance(moto, "CA");
  expect(result.flags.length).toBe(0);
});

/* ── Router integration ───────────────────────────────────────────────── */

test("router result includes compliance fields", () => {
  const result = routePracticeArea({
    practice_area: "personal_injury",
    pi_category: "car_accident",
    market_display_name: "Birmingham",
    state: "AL",
    state_full_name: "Alabama",
    firm_name: "Acme Law",
  });
  if (result.practice_area !== "personal_injury") throw new Error("wrong path");

  expect(result.compliance_state).toBe("AL");
  // AL isn't in the top-10 curated list; should be flagged
  expect(result.compliance_has_explicit_rules).toBe(false);
  expect(result.compliance_flags.length).toBeGreaterThan(0);
});

test("router applies NY label to disclaimer end-to-end", () => {
  const result = routePracticeArea({
    practice_area: "personal_injury",
    pi_category: "car_accident",
    market_display_name: "New York",
    state: "NY",
    state_full_name: "New York",
    firm_name: "Acme Law",
  });
  if (result.practice_area !== "personal_injury") throw new Error("wrong path");

  expect(result.template.baseDisclaimer).toMatch(/^Attorney Advertising/);
  expect(result.compliance_has_explicit_rules).toBe(true);
});

test("router compliance runs AFTER severity modifiers", () => {
  // Use a fatal modifier — its CTA is "When you're ready..." which
  // contains no flagged phrases. NY compliance should still prepend
  // the Attorney Advertising label without altering the modifier-applied CTA.
  const result = routePracticeArea({
    practice_area: "personal_injury",
    pi_category: "car_accident",
    market_display_name: "New York",
    state: "NY",
    state_full_name: "New York",
    firm_name: "Acme Law",
    severity_modifiers: ["fatal"],
  });
  if (result.practice_area !== "personal_injury") throw new Error("wrong path");

  // CTA reflects fatal modifier
  expect(result.template.cta.toLowerCase()).toContain("when you're ready");
  // Disclaimer reflects NY compliance
  expect(result.template.baseDisclaimer).toMatch(/^Attorney Advertising/);
});
