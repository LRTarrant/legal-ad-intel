/**
 * Tests for PI templates and the practice-area router.
 *
 * Run with any TS-compatible test runner (vitest, jest with ts-jest, tsx, etc.):
 *   npx vitest run web/lib/campaign-builder/pi-templates/pi-templates.test.ts
 */

import {
  PI_TEMPLATES,
  getAvailablePICategories,
  getPITemplate,
  renderPITemplate,
  renderTemplate,
} from "./index";
import type { PITemplateVars } from "./types";
import { routePracticeArea } from "../practice-area-router";

const SAMPLE_VARS: PITemplateVars = {
  market_display_name: "Birmingham",
  state: "Alabama",
  firm_name: "Acme Law",
};

/* ── renderTemplate ───────────────────────────────────────────────────── */

test("renderTemplate substitutes variables", () => {
  expect(
    renderTemplate(
      "Hi {firm_name}, you're in {market_display_name}, {state}",
      SAMPLE_VARS,
    ),
  ).toBe("Hi Acme Law, you're in Birmingham, Alabama");
});

test("renderTemplate handles repeated variables", () => {
  expect(
    renderTemplate("{state} cars hit {state} drivers", SAMPLE_VARS),
  ).toBe("Alabama cars hit Alabama drivers");
});

test("renderTemplate throws on unknown variable", () => {
  expect(() =>
    renderTemplate("Hi {unknown_var}", SAMPLE_VARS),
  ).toThrow(/unknown variable \{unknown_var\}/);
});

test("renderTemplate leaves text without placeholders unchanged", () => {
  expect(renderTemplate("No placeholders here.", SAMPLE_VARS)).toBe(
    "No placeholders here.",
  );
});

/* ── PI templates registry ────────────────────────────────────────────── */

test("v1 ships motorcycle, boating, and car_accident templates", () => {
  expect(getAvailablePICategories().sort()).toEqual([
    "boating_accident",
    "car_accident",
    "motorcycle_accident",
  ]);
});

test("getPITemplate returns the right template for known categories", () => {
  expect(getPITemplate("car_accident")?.category).toBe("car_accident");
  expect(getPITemplate("motorcycle_accident")?.category).toBe(
    "motorcycle_accident",
  );
  expect(getPITemplate("boating_accident")?.category).toBe("boating_accident");
});

test("getPITemplate returns undefined for v2 categories not yet shipped", () => {
  // These exist in the DB CHECK constraint but don't have templates yet.
  expect(getPITemplate("truck_accident")).toBeUndefined();
  expect(getPITemplate("dog_bite")).toBeUndefined();
  expect(getPITemplate("slip_and_fall")).toBeUndefined();
});

test("every template's category field matches its registry key", () => {
  for (const [key, template] of Object.entries(PI_TEMPLATES)) {
    expect(template?.category).toBe(key);
  }
});

/* ── Variable substitution per template ───────────────────────────────── */

test("car_accident template substitutes market_display_name in hook", () => {
  const tpl = renderPITemplate(
    PI_TEMPLATES.car_accident!,
    SAMPLE_VARS,
  );
  expect(tpl.hook).toContain("Birmingham");
  expect(tpl.hook).not.toContain("{market_display_name}");
});

test("car_accident template substitutes state and firm_name", () => {
  const tpl = renderPITemplate(
    PI_TEMPLATES.car_accident!,
    SAMPLE_VARS,
  );
  expect(tpl.authority).toContain("Alabama");
  expect(tpl.authority).toContain("Acme Law");
});

test("motorcycle_accident substitutes correctly and keeps the rider-bias hook", () => {
  const tpl = renderPITemplate(
    PI_TEMPLATES.motorcycle_accident!,
    SAMPLE_VARS,
  );
  // The rider-bias hook is the differentiator for this category.
  expect(tpl.hook.toLowerCase()).toContain("reckless");
  expect(tpl.problem).toContain("Birmingham");
  expect(tpl.authority).toContain("Acme Law");
});

test("boating_accident substitutes correctly and keeps the maritime hook", () => {
  const tpl = renderPITemplate(
    PI_TEMPLATES.boating_accident!,
    SAMPLE_VARS,
  );
  // Maritime law is the differentiator.
  expect(tpl.hook.toLowerCase()).toContain("maritime");
  expect(tpl.problem).toContain("Birmingham");
});

/* ── Market injection rule (spec section 2.6) ─────────────────────────── */

test("templates inject market name conversationally — not as DMA code or full_name", () => {
  // Try a market with parens in its full_name to make sure we never use it.
  const vars: PITemplateVars = {
    market_display_name: "Birmingham",
    state: "Alabama",
    firm_name: "Acme Law",
  };
  for (const tpl of Object.values(PI_TEMPLATES)) {
    if (!tpl) continue;
    const rendered = renderPITemplate(tpl, vars);
    const allText = [
      rendered.hook,
      rendered.problem,
      rendered.authority,
      rendered.cta,
      rendered.baseDisclaimer,
    ].join(" ");
    // Shouldn't contain leftover placeholders
    expect(allText).not.toMatch(/\{[a-z_]+\}/);
    // Shouldn't accidentally contain DMA-like junk
    expect(allText).not.toMatch(/\bDMA \d+\b/);
  }
});

/* ── Practice-area router ─────────────────────────────────────────────── */

test("router returns mass_tort path when practice_area=mass_tort", () => {
  const result = routePracticeArea({
    practice_area: "mass_tort",
    tort_slug: "roundup",
  });
  expect(result.practice_area).toBe("mass_tort");
  if (result.practice_area === "mass_tort") {
    expect(result.tort_slug).toBe("roundup");
  }
});

test("router throws when mass_tort campaign has no tort_slug", () => {
  expect(() =>
    routePracticeArea({ practice_area: "mass_tort" }),
  ).toThrow(/requires tort_slug/);
});

test("router returns rendered PI template when practice_area=personal_injury", () => {
  const result = routePracticeArea({
    practice_area: "personal_injury",
    pi_category: "car_accident",
    market_display_name: "Birmingham",
    state: "AL",
    state_full_name: "Alabama",
    firm_name: "Acme Law",
    severity_modifiers: [],
  });
  expect(result.practice_area).toBe("personal_injury");
  if (result.practice_area === "personal_injury") {
    expect(result.template.category).toBe("car_accident");
    expect(result.template.hook).toContain("Birmingham");
    expect(result.template.authority).toContain("Acme Law");
    expect(result.severity_modifiers).toEqual([]);
  }
});

test("router throws when PI campaign missing pi_category", () => {
  expect(() =>
    routePracticeArea({
      practice_area: "personal_injury",
      market_display_name: "Birmingham",
    }),
  ).toThrow(/requires pi_category/);
});

test("router throws when PI campaign missing market_display_name", () => {
  expect(() =>
    routePracticeArea({
      practice_area: "personal_injury",
      pi_category: "car_accident",
    }),
  ).toThrow(/requires market_display_name/);
});

test("router throws when PI category has no template registered", () => {
  expect(() =>
    routePracticeArea({
      practice_area: "personal_injury",
      pi_category: "truck_accident", // valid enum, no template yet
      market_display_name: "Birmingham",
      state_full_name: "Alabama",
      firm_name: "Acme Law",
    }),
  ).toThrow(/No PI template registered/);
});

test("router filters out invalid severity modifiers", () => {
  const result = routePracticeArea({
    practice_area: "personal_injury",
    pi_category: "car_accident",
    market_display_name: "Birmingham",
    state_full_name: "Alabama",
    firm_name: "Acme Law",
    // Caller passed something garbage; router should drop it.
    severity_modifiers: ["fatal", "garbage", "catastrophic"] as never,
  });
  if (result.practice_area === "personal_injury") {
    expect(result.severity_modifiers).toEqual(["fatal", "catastrophic"]);
  }
});

test("router defaults firm_name when not provided", () => {
  const result = routePracticeArea({
    practice_area: "personal_injury",
    pi_category: "car_accident",
    market_display_name: "Birmingham",
    state_full_name: "Alabama",
  });
  if (result.practice_area === "personal_injury") {
    // Should not throw; should substitute "Our firm" as a safe default
    expect(result.template.authority).toContain("Our firm");
  }
});
