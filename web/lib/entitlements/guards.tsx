/**
 * Read-surface entitlement guards for state + tort pages.
 *
 * Each guard resolves the current user's ACCOUNT-level access (via
 * `resolveAccess`) and returns either `null` (allowed → render the page) or an
 * `<AccessDenied />` element the page renders instead. Usage in a page/layout
 * server component:
 *
 *   const denied = await assertTortAccess("roundup");
 *   if (denied) return denied;
 *
 * Scope gating is by PURCHASED entitlements, independent of role:
 *   - super_admin (LMI staff) bypasses scope entirely — nobody else does.
 *     Note this is deliberately NOT `hasUnlimitedAccess` (manager+): that
 *     predicate is the TRIAL-expiry bypass (a firm's own admins keep access
 *     after the trial ends), a different axis from purchased scope. A tenant
 *     admin / manager on an AL-only account must NOT see non-AL states, or the
 *     per-state / per-tort packaging leaks to the buyer's own seats.
 *   - No governing subscription anywhere → legacy bypass (internal / admin /
 *     grandfathered pre-billing users keep access).
 *   - Geo scope is a STATE axis only: `geo_scope_unlimited` grants all states,
 *     never torts. Tort add-ons (`active_tort_addons`) are the only thing that
 *     unlocks tort pages. The two axes never cross.
 * Denials mirror the action routes' vocabulary: an inactive subscription is
 * denied, and a state/tort outside the purchased scope is a geo_scope_violation.
 *
 * Server-only (resolveAccess uses the service-role key).
 */

import { isSuperAdmin } from "@/lib/roles";
import { resolveAccess, type Access } from "./access";
import { getRequestUser } from "./request-context";
import { AccessDenied } from "@/app/(app)/components/access-denied";

/** Normalize a tort slug to both hyphen + underscore forms for tolerant match. */
function tortSlugVariants(slug: string): Set<string> {
  const lower = slug.trim().toLowerCase();
  return new Set([lower, lower.replace(/-/g, "_"), lower.replace(/_/g, "-")]);
}

/** Turn a slug like "bard-powerport" into a human label "Bard Powerport". */
function prettifyTortSlug(slug: string): string {
  return slug
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Baseline access decision shared by both guards, EXCLUDING per-axis scope.
 *   - "allow": render (super_admin, or legacy no-subscription bypass).
 *   - "deny_inactive": hard deny (subscription exists but not active/trialing).
 *   - "gate": proceed to the surface-specific scope check.
 * Geo-unlimited is intentionally NOT resolved here — it's a state-only signal
 * applied inside `assertStateAccess`, so it can't leak into tort gating.
 */
function passesBaseline(access: Access): "allow" | "deny_inactive" | "gate" {
  // Only LMI staff (super_admin) bypass purchased scope. NOT manager+ — that is
  // the trial-expiry bypass, a different axis (see file header).
  if (isSuperAdmin(access.role)) return "allow";
  // Legacy bypass: no subscription row anywhere → allow (pre-billing users).
  if (!access.hasSubscription) return "allow";
  // Inactive subscription → hard deny (mirrors subscription_inactive).
  if (access.status !== "active" && access.status !== "trialing") {
    return "deny_inactive";
  }
  return "gate";
}

/**
 * Guard a state page. `stateCode` is the two-letter code (e.g. "AL"); it is
 * compared uppercase against the account's purchased geo scope.
 */
export async function assertStateAccess(
  stateCode: string,
  stateName?: string,
): Promise<React.ReactElement | null> {
  const user = await getRequestUser();
  // Unauthenticated requests are handled by middleware; don't double-gate.
  if (!user) return null;

  const access = await resolveAccess(user.id);
  const base = passesBaseline(access);
  if (base === "allow") return null;

  const label = stateName ?? stateCode;
  if (base === "deny_inactive") {
    return <AccessDenied surface="state" name={label} />;
  }

  // Geo-unlimited grants every STATE (state axis only).
  if (access.unlimited) return null;
  const scope = access.states ?? [];
  if (scope.includes(stateCode.toUpperCase())) return null;
  return <AccessDenied surface="state" name={label} />;
}

/**
 * Guard a tort page. `tortSlug` is the URL slug (hyphenated, e.g. "roundup");
 * it is compared against the account's purchased tort add-ons. Geo scope
 * (including geo_scope_unlimited) has NO effect here — torts are a separate
 * purchase axis.
 */
export async function assertTortAccess(
  tortSlug: string,
  tortLabel?: string,
): Promise<React.ReactElement | null> {
  const user = await getRequestUser();
  if (!user) return null;

  const access = await resolveAccess(user.id);
  const base = passesBaseline(access);
  if (base === "allow") return null;

  const label = tortLabel ?? prettifyTortSlug(tortSlug);
  if (base === "deny_inactive") {
    return <AccessDenied surface="tort" name={label} />;
  }

  const wanted = tortSlugVariants(tortSlug);
  const owned = access.torts.some((t) =>
    [...tortSlugVariants(t)].some((v) => wanted.has(v)),
  );
  if (owned) return null;
  return <AccessDenied surface="tort" name={label} />;
}
