/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — no test-runner types are installed in this repo (the existing
// lib/**/*.test.ts files rely on ambient jest globals that tsc can't see). This
// keeps the new test out of the net-new pr-typecheck count without adding
// @types/jest to the toolchain.
/**
 * Unit tests for the account-inheritance governing-subscription rule.
 *
 * Covers the pure pieces of resolveAccess() that don't need a DB:
 *   - pickGoverningSubscription: active/trialing first, then admin role.
 *   - buildAccess: geo scope + tort add-on + legacy (no-sub) shaping.
 *
 * Mirrors the import-less test/expect style used elsewhere in this package.
 */

import {
  pickGoverningSubscription,
  buildAccess,
  resolveDemoOverrideAccess,
} from "./access";
import type { ServerSubscription } from "@/lib/campaign-builder/entitlements";
import type { DemoModeOverride } from "@/lib/admin/demo-mode";

function makeSub(over: Partial<ServerSubscription> = {}): ServerSubscription {
  return {
    user_id: "u-default",
    buyer_type: "law_firm",
    campaign_builder_mass_tort: true,
    campaign_builder_pi: false,
    campaign_builder_monthly_cap: null,
    geo_scope_states: ["AL"],
    geo_scope_unlimited: false,
    active_tort_addons: ["roundup"],
    status: "active",
    current_period_start: null,
    current_period_end: null,
    ...over,
  };
}

/* ── pickGoverningSubscription ───────────────────────────────────────────── */

test("prefers an admin's subscription over a plain user's", () => {
  const adminSub = makeSub({ user_id: "admin", geo_scope_states: ["NY"] });
  const userSub = makeSub({ user_id: "user", geo_scope_states: ["AL"] });
  const roles = { admin: "tenant_admin", user: "user" };
  const picked = pickGoverningSubscription([userSub, adminSub], roles);
  expect(picked?.user_id).toBe("admin");
});

test("among non-admins, prefers an active/trialing subscription over cancelled", () => {
  const cancelled = makeSub({ user_id: "a", status: "cancelled" });
  const active = makeSub({ user_id: "b", status: "active" });
  const roles = { a: "user", b: "user" };
  const picked = pickGoverningSubscription([cancelled, active], roles);
  expect(picked?.user_id).toBe("b");
});

test("returns null when there are no subscriptions", () => {
  expect(pickGoverningSubscription([], {})).toBe(null);
});

test("active status ranks above admin role: a user's active plan beats an admin's cancelled plan", () => {
  // Regression for the sort-order bug: admin rank must NOT outrank active
  // status, or a seat gets handed the admin's inactive sub and is wrongly
  // denied even though an active plan exists in the tenant.
  const adminCancelled = makeSub({ user_id: "admin", status: "cancelled" });
  const userActive = makeSub({ user_id: "user", status: "active" });
  const roles = { admin: "tenant_admin", user: "user" };
  const picked = pickGoverningSubscription([adminCancelled, userActive], roles);
  expect(picked?.user_id).toBe("user");
});

/* ── buildAccess ─────────────────────────────────────────────────────────── */

test("no subscription → legacy shape (hasSubscription false, no scope)", () => {
  const a = buildAccess(null, "user", "none");
  expect(a.hasSubscription).toBe(false);
  expect(a.unlimited).toBe(false);
  expect(a.states).toBe(null);
  expect(a.torts).toEqual([]);
});

test("unlimited plan → states null, unlimited true", () => {
  const a = buildAccess(
    makeSub({ geo_scope_unlimited: true, geo_scope_states: null }),
    "user",
    "own",
  );
  expect(a.unlimited).toBe(true);
  expect(a.states).toBe(null);
});

test("scoped plan → states + torts carried through", () => {
  const a = buildAccess(
    makeSub({ geo_scope_states: ["AL", "GA"], active_tort_addons: ["roundup"] }),
    "user",
    "firm_owner",
  );
  expect(a.states).toEqual(["AL", "GA"]);
  expect(a.torts).toEqual(["roundup"]);
  expect(a.source).toBe("firm_owner");
});

/* ── resolveDemoOverrideAccess ───────────────────────────────────────────── */

function makeOverride(over: Partial<DemoModeOverride> = {}): DemoModeOverride {
  return {
    kind: "demo",
    buyer_type: "law_firm",
    pi_access: true,
    mt_access: true,
    monthly_cap: null,
    geo_scope_states: ["AL"],
    geo_scope_unlimited: false,
    ...over,
  };
}

test("PRIVILEGE ESCALATION GUARD: non-super-admin + forged override → null (no override)", () => {
  // A user/manager/tenant_admin who forges the demo cookie must get NO override
  // and stay on their real subscription path. The whole security surface.
  for (const role of ["user", "manager", "tenant_admin", null]) {
    const forged = makeOverride({ geo_scope_unlimited: true });
    expect(resolveDemoOverrideAccess(role, forged, "u-1")).toBe(null);
  }
});

test("super_admin + scoped override → Access.role null, states enforced, active", () => {
  const a = resolveDemoOverrideAccess(
    "super_admin",
    makeOverride({ geo_scope_states: ["AL"], geo_scope_unlimited: false }),
    "u-1",
  );
  // role null suppresses the passesBaseline super_admin scope bypass so the
  // synthesized geo scope is actually enforced while previewing.
  expect(a.role).toBe(null);
  expect(a.states).toEqual(["AL"]);
  expect(a.unlimited).toBe(false);
  expect(a.status).toBe("active");
  expect(a.hasSubscription).toBe(true);
});

test("super_admin + positive-tort override → torts carried through", () => {
  const a = resolveDemoOverrideAccess(
    "super_admin",
    makeOverride({ active_tort_addons: ["roundup"] }),
    "u-1",
  );
  expect(a.torts).toEqual(["roundup"]);
});

test("super_admin + null override → null (real subscription path preserved)", () => {
  expect(resolveDemoOverrideAccess("super_admin", null, "u-1")).toBe(null);
});
