/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — no test-runner types are installed in this repo (the existing
// lib/**/*.test.ts files rely on ambient jest globals that tsc can't see). This
// keeps the new test out of the net-new pr-typecheck count without adding
// @types/jest to the toolchain.
/**
 * Unit tests for the account-inheritance governing-subscription rule.
 *
 * Covers the pure pieces of resolveAccess() that don't need a DB:
 *   - pickGoverningSubscription: admin-first, then active/trialing.
 *   - buildAccess: geo scope + tort add-on + legacy (no-sub) shaping.
 *
 * Mirrors the import-less test/expect style used elsewhere in this package.
 */

import { pickGoverningSubscription, buildAccess } from "./access";
import type { ServerSubscription } from "@/lib/campaign-builder/entitlements";

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
