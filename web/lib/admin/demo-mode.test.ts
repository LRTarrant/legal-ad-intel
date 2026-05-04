/**
 * Unit tests for the demo-mode override helpers.
 *
 * Pure-function pieces only \u2014 the super_admin gate in
 * readDemoModeOverride hits the database and is exercised against the
 * live profiles table via Vercel preview.
 */

import {
  DEMO_HEADER_BUYER_TYPE,
  DEMO_HEADER_CAP,
  DEMO_HEADER_GEO_STATES,
  DEMO_HEADER_GEO_UNLIMITED,
  DEMO_HEADER_MT,
  DEMO_HEADER_PI,
  DemoModeAccessDenied,
  parseDemoModeHeaders,
  synthesizeSubscription,
  type DemoModeOverride,
} from "./demo-mode";

/* ── Test helpers ──────────────────────────────────────────────────────── */

/**
 * Build a minimal NextRequest-compatible shape for parseDemoModeHeaders.
 * The function only reads `request.headers.get(name)` so a plain object
 * with a Headers-like get() works in tests without importing Next types.
 */
function reqWithHeaders(map: Record<string, string>): {
  headers: { get: (k: string) => string | null };
} {
  return {
    headers: {
      get: (key: string) => map[key.toLowerCase()] ?? null,
    },
  };
}

function lc(map: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) out[k.toLowerCase()] = v;
  return out;
}

/* ── parseDemoModeHeaders ──────────────────────────────────────────────── */

test("parseDemoModeHeaders: returns null when no buyer-type header", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = reqWithHeaders({}) as any;
  const out = parseDemoModeHeaders(r);
  expect(out).toBeNull();
});

test("parseDemoModeHeaders: returns null when buyer-type header empty", () => {
  // Empty header string is treated as absent.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = reqWithHeaders(lc({ [DEMO_HEADER_BUYER_TYPE]: "" })) as any;
  // Empty string is falsy in our null-check.
  const out = parseDemoModeHeaders(r);
  expect(out).toBeNull();
});

test("parseDemoModeHeaders: rejects invalid buyer_type", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = reqWithHeaders(lc({ [DEMO_HEADER_BUYER_TYPE]: "ceo" })) as any;
  let threw = false;
  try {
    parseDemoModeHeaders(r);
  } catch (e) {
    threw = e instanceof DemoModeAccessDenied;
  }
  expect(threw).toBe(true);
});

test("parseDemoModeHeaders: minimal valid law_firm with defaults", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = reqWithHeaders(lc({ [DEMO_HEADER_BUYER_TYPE]: "law_firm" })) as any;
  const out = parseDemoModeHeaders(r);
  expect(out !== null).toBe(true);
  if (!out) return;
  expect(out.kind).toBe("demo");
  expect(out.buyer_type).toBe("law_firm");
  // Defaults: pi=true, mt=true, cap=null, states=[], unlimited=false
  expect(out.pi_access).toBe(true);
  expect(out.mt_access).toBe(true);
  expect(out.monthly_cap).toBeNull();
  expect(out.geo_scope_states).toEqual([]);
  expect(out.geo_scope_unlimited).toBe(false);
});

test("parseDemoModeHeaders: full ad_agency override", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = reqWithHeaders(
    lc({
      [DEMO_HEADER_BUYER_TYPE]: "ad_agency",
      [DEMO_HEADER_PI]: "true",
      [DEMO_HEADER_MT]: "false",
      [DEMO_HEADER_CAP]: "200",
      [DEMO_HEADER_GEO_STATES]: "AL,TN,GA",
      [DEMO_HEADER_GEO_UNLIMITED]: "false",
    }),
  ) as any;
  const out = parseDemoModeHeaders(r);
  if (!out) throw new Error("expected non-null");
  expect(out.buyer_type).toBe("ad_agency");
  expect(out.pi_access).toBe(true);
  expect(out.mt_access).toBe(false);
  expect(out.monthly_cap).toBe(200);
  expect(out.geo_scope_states).toEqual(["AL", "TN", "GA"]);
  expect(out.geo_scope_unlimited).toBe(false);
});

test("parseDemoModeHeaders: media_company unlimited geo", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = reqWithHeaders(
    lc({
      [DEMO_HEADER_BUYER_TYPE]: "media_company",
      [DEMO_HEADER_GEO_UNLIMITED]: "true",
    }),
  ) as any;
  const out = parseDemoModeHeaders(r);
  if (!out) throw new Error("expected non-null");
  expect(out.geo_scope_unlimited).toBe(true);
});

test("parseDemoModeHeaders: cap=unlimited string \u2192 null", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = reqWithHeaders(
    lc({
      [DEMO_HEADER_BUYER_TYPE]: "law_firm",
      [DEMO_HEADER_CAP]: "unlimited",
    }),
  ) as any;
  const out = parseDemoModeHeaders(r);
  if (!out) throw new Error("expected non-null");
  expect(out.monthly_cap).toBeNull();
});

test("parseDemoModeHeaders: cap=NaN \u2192 null", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = reqWithHeaders(
    lc({
      [DEMO_HEADER_BUYER_TYPE]: "law_firm",
      [DEMO_HEADER_CAP]: "abc",
    }),
  ) as any;
  const out = parseDemoModeHeaders(r);
  if (!out) throw new Error("expected non-null");
  expect(out.monthly_cap).toBeNull();
});

test("parseDemoModeHeaders: cap negative \u2192 null", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = reqWithHeaders(
    lc({
      [DEMO_HEADER_BUYER_TYPE]: "law_firm",
      [DEMO_HEADER_CAP]: "-5",
    }),
  ) as any;
  const out = parseDemoModeHeaders(r);
  if (!out) throw new Error("expected non-null");
  expect(out.monthly_cap).toBeNull();
});

test("parseDemoModeHeaders: pi=false respected", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = reqWithHeaders(
    lc({
      [DEMO_HEADER_BUYER_TYPE]: "law_firm",
      [DEMO_HEADER_PI]: "false",
    }),
  ) as any;
  const out = parseDemoModeHeaders(r);
  if (!out) throw new Error("expected non-null");
  expect(out.pi_access).toBe(false);
});

test("parseDemoModeHeaders: pi=0 respected", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = reqWithHeaders(
    lc({
      [DEMO_HEADER_BUYER_TYPE]: "law_firm",
      [DEMO_HEADER_PI]: "0",
    }),
  ) as any;
  const out = parseDemoModeHeaders(r);
  if (!out) throw new Error("expected non-null");
  expect(out.pi_access).toBe(false);
});

test("parseDemoModeHeaders: pi=garbage \u2192 fallback true", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = reqWithHeaders(
    lc({
      [DEMO_HEADER_BUYER_TYPE]: "law_firm",
      [DEMO_HEADER_PI]: "maybe",
    }),
  ) as any;
  const out = parseDemoModeHeaders(r);
  if (!out) throw new Error("expected non-null");
  expect(out.pi_access).toBe(true);
});

test("parseDemoModeHeaders: states normalized + filtered", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = reqWithHeaders(
    lc({
      [DEMO_HEADER_BUYER_TYPE]: "ad_agency",
      [DEMO_HEADER_GEO_STATES]: "al, tn,not_a_state, ga,FLA",
    }),
  ) as any;
  const out = parseDemoModeHeaders(r);
  if (!out) throw new Error("expected non-null");
  // Lowercase input \u2192 uppercase output. Non 2-letter codes dropped.
  expect(out.geo_scope_states).toEqual(["AL", "TN", "GA"]);
});

test("parseDemoModeHeaders: states empty header \u2192 empty array", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = reqWithHeaders(
    lc({
      [DEMO_HEADER_BUYER_TYPE]: "ad_agency",
      [DEMO_HEADER_GEO_STATES]: "",
    }),
  ) as any;
  const out = parseDemoModeHeaders(r);
  if (!out) throw new Error("expected non-null");
  expect(out.geo_scope_states).toEqual([]);
});

/* ── synthesizeSubscription ────────────────────────────────────────────── */

function basicOverride(): DemoModeOverride {
  return {
    kind: "demo",
    buyer_type: "law_firm",
    pi_access: true,
    mt_access: false,
    monthly_cap: 50,
    geo_scope_states: ["AL"],
    geo_scope_unlimited: false,
  };
}

test("synthesizeSubscription: maps fields onto ServerSubscription", () => {
  const sub = synthesizeSubscription("user-123", basicOverride());
  expect(sub.user_id).toBe("user-123");
  expect(sub.buyer_type).toBe("law_firm");
  expect(sub.campaign_builder_pi).toBe(true);
  expect(sub.campaign_builder_mass_tort).toBe(false);
  expect(sub.campaign_builder_monthly_cap).toBe(50);
  expect(sub.geo_scope_states).toEqual(["AL"]);
  expect(sub.geo_scope_unlimited).toBe(false);
});

test("synthesizeSubscription: status=active so isStatusActive passes", () => {
  const sub = synthesizeSubscription("user-123", basicOverride());
  expect(sub.status).toBe("active");
});

test("synthesizeSubscription: provides ISO period start and end", () => {
  const sub = synthesizeSubscription("user-123", basicOverride());
  // Both should parse as valid dates
  expect(typeof sub.current_period_start).toBe("string");
  expect(typeof sub.current_period_end).toBe("string");
  if (sub.current_period_start && sub.current_period_end) {
    expect(Number.isNaN(Date.parse(sub.current_period_start))).toBe(false);
    expect(Number.isNaN(Date.parse(sub.current_period_end))).toBe(false);
    // End is strictly after start
    expect(
      Date.parse(sub.current_period_end) > Date.parse(sub.current_period_start),
    ).toBe(true);
  }
});

test("synthesizeSubscription: real user_id stays attached", () => {
  // Critical: even when impersonating, cost rows + firm writes track to
  // the admin's real user_id, not a fake one.
  const sub = synthesizeSubscription(
    "real-admin-id",
    { ...basicOverride(), buyer_type: "ad_agency" },
  );
  expect(sub.user_id).toBe("real-admin-id");
});

test("synthesizeSubscription: unlimited cap stays null", () => {
  const sub = synthesizeSubscription("u", {
    ...basicOverride(),
    monthly_cap: null,
  });
  expect(sub.campaign_builder_monthly_cap).toBeNull();
});

/* ── Header constants \u2014 sanity ─────────────────────────────────────── */

test("header constants: lowercase x-demo-mode prefix", () => {
  expect(DEMO_HEADER_BUYER_TYPE).toBe("x-demo-mode-buyer-type");
  expect(DEMO_HEADER_PI).toBe("x-demo-mode-pi");
  expect(DEMO_HEADER_MT).toBe("x-demo-mode-mt");
  expect(DEMO_HEADER_CAP).toBe("x-demo-mode-cap");
  expect(DEMO_HEADER_GEO_STATES).toBe("x-demo-mode-geo-states");
  expect(DEMO_HEADER_GEO_UNLIMITED).toBe("x-demo-mode-geo-unlimited");
});
