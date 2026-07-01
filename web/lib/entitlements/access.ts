/**
 * Account-level entitlement resolver for READ surfaces (state + tort pages).
 *
 * The 13 Campaign Builder action routes gate on the CALLER's own subscription
 * row (per-user RLS). Read surfaces need the ACCOUNT's plan instead: every seat
 * on a firm inherits the buyer's geo scope + tort add-ons. Because
 * `subscriptions` is keyed per `user_id` with own-row-only RLS, resolving a
 * non-buyer seat's entitlements requires a service-role read (a seat can't read
 * the buyer's row through RLS).
 *
 * Governing-subscription rule (deterministic, documented + unit-tested):
 *   (a) the user's OWN subscriptions row, if present; else
 *   (b) the subscription of the firm 'owner' the user is a firm_managers seat on
 *       (agency/media seats inherit the law-firm owner's plan); else
 *   (c) a CO-TENANT subscription resolved via profiles.tenant_id, preferring an
 *       active/trialing subscription, then a tenant_admin / super_admin's plan.
 *       (Active status ranks ABOVE role so an admin's cancelled plan never
 *       shadows a co-tenant's active one and wrongly denies a paying seat.)
 *
 * Degraded mode: if SUPABASE_SERVICE_ROLE_KEY is unset, this falls back to an
 * own-row RLS read only — seats without their own subscription row resolve to
 * "no subscription" (the guards then apply the legacy bypass, not a hard deny).
 *
 * This module is server-only (uses the service-role key). Never import it into
 * a client component.
 */

import { cache } from "react";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import {
  getSubscriptionForUser,
  type ServerSubscription,
} from "@/lib/campaign-builder/entitlements";
import { isSuperAdmin, roleRank } from "@/lib/roles";
import {
  synthesizeSubscription,
  type DemoModeOverride,
} from "@/lib/admin/demo-mode";
import { readDemoModeCookieOverride } from "@/lib/admin/demo-mode-server";
import { getRequestProfile } from "./request-context";

/* ──────────────────────────────────────────────────────────────────────── */
/* Types                                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

export type AccessSource = "own" | "firm_owner" | "co_tenant" | "none";

export interface Access {
  /** The seat's own profile role (drives the manager+ bypass in the guards). */
  role: string | null;
  /** Governing subscription status; null when no subscription was resolved. */
  status: ServerSubscription["status"] | null;
  /**
   * Purchased state codes (uppercase). `null` when geo scope is unlimited.
   * Empty array = a subscription exists but no states are enabled.
   */
  states: string[] | null;
  /** True when the governing plan has unlimited geo scope. */
  unlimited: boolean;
  /** Purchased tort add-on slugs (as stored on the subscription). */
  torts: string[];
  /** Coarse Campaign Builder feature flags from the governing plan. */
  features: { massTort: boolean; pi: boolean };
  /** Whether ANY governing subscription row was resolved. */
  hasSubscription: boolean;
  /** Which rule produced the governing subscription (for debugging/tests). */
  source: AccessSource;
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Service client                                                           */
/* ──────────────────────────────────────────────────────────────────────── */

function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createServiceClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Governing-subscription pick (exported for unit tests)                    */
/* ──────────────────────────────────────────────────────────────────────── */

function isActiveStatus(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

/**
 * Pick the governing co-tenant subscription: active/trialing FIRST, then admin
 * role (tenant_admin / super_admin) as the tiebreak. Active-first matters — an
 * admin co-tenant's cancelled/past_due plan must never outrank a co-tenant
 * user's active plan, or the seat gets handed an inactive sub and is wrongly
 * denied. Pure so it can be unit-tested against synthetic seat data.
 */
export function pickGoverningSubscription(
  subs: ServerSubscription[],
  roleByUserId: Record<string, string | null | undefined>,
): ServerSubscription | null {
  if (subs.length === 0) return null;
  const scored = subs
    .map((s) => ({
      s,
      adminRank: roleRank(roleByUserId[s.user_id]),
      activeRank: isActiveStatus(s.status) ? 1 : 0,
    }))
    .sort(
      (a, b) => b.activeRank - a.activeRank || b.adminRank - a.adminRank,
    );
  return scored[0]?.s ?? null;
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Access builder                                                           */
/* ──────────────────────────────────────────────────────────────────────── */

export function buildAccess(
  sub: ServerSubscription | null,
  role: string | null,
  source: AccessSource,
): Access {
  if (!sub) {
    return {
      role,
      status: null,
      states: null,
      unlimited: false,
      torts: [],
      features: { massTort: false, pi: false },
      hasSubscription: false,
      source: "none",
    };
  }
  return {
    role,
    status: sub.status,
    // Normalize to uppercase so the guard's `stateCode.toUpperCase()` compare
    // matches even if a subscription row stored codes lowercase — a lowercase
    // ["al"] must not wrongly deny a paying seat's "AL" request. Honors the
    // `Access.states` "(uppercase)" contract at the boundary rather than
    // trusting an unenforced upstream invariant.
    states: sub.geo_scope_unlimited
      ? null
      : (sub.geo_scope_states ?? []).map((s) => s.toUpperCase()),
    unlimited: sub.geo_scope_unlimited,
    torts: sub.active_tort_addons ?? [],
    features: {
      massTort: sub.campaign_builder_mass_tort,
      pi: sub.campaign_builder_pi,
    },
    hasSubscription: true,
    source,
  };
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Demo-mode override (super_admin read-surface preview)                     */
/* ──────────────────────────────────────────────────────────────────────── */

/**
 * Build a demo-preview Access from a super_admin's override, or null.
 *
 * Returns null unless the caller's REAL role is super_admin AND an override is
 * present — a non-super-admin who forges the demo cookie gets NO override and
 * stays on the real subscription path (privilege-escalation guard; unit-tested).
 *
 * The synthesized Access is built with `role = null` ON PURPOSE. `Access.role`
 * feeds exactly one consumer — `passesBaseline`'s `isSuperAdmin(access.role)`
 * scope bypass (grep-verified). Passing the real super_admin role would make the
 * guards allow EVERYTHING and defeat the preview. Nulling it suppresses that
 * bypass so the synthesized geo/tort scope is actually enforced while previewing.
 * Do NOT start trusting `Access.role` for identity elsewhere without revisiting.
 */
export function resolveDemoOverrideAccess(
  role: string | null,
  override: DemoModeOverride | null,
  userId: string,
): Access | null {
  if (!isSuperAdmin(role) || !override) return null;
  return buildAccess(synthesizeSubscription(userId, override), null, "own");
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Resolver                                                                 */
/* ──────────────────────────────────────────────────────────────────────── */

/**
 * Resolve the governing account-level entitlements for a user. See the file
 * header for the (a)/(b)/(c) governing rule and degraded-mode behavior.
 *
 * Memoized per request (React `cache`) so multiple guards on one page share a
 * single resolution. The seat's own role comes from `getRequestProfile`, which
 * the (app) layout's trial check also uses — so role is read once per request.
 */
export const resolveAccess = cache(async (userId: string): Promise<Access> => {
  const service = getServiceClient();
  const role = (await getRequestProfile(userId))?.role ?? null;

  // Demo-mode preview: ONLY when the caller's real, server-read role is
  // super_admin do we read + apply the (untrusted, forgeable) demo cookie. A
  // non-super-admin never reaches this branch, so a forged cookie is inert.
  if (isSuperAdmin(role)) {
    const override = await readDemoModeCookieOverride();
    const demoAccess = resolveDemoOverrideAccess(role, override, userId);
    if (demoAccess) return demoAccess;
  }

  // Degraded mode: no service key → own-row RLS read only.
  if (!service) {
    const rls = await createServerSupabase();
    const sub = await getSubscriptionForUser(
      rls as unknown as SupabaseClient,
      userId,
    );
    return buildAccess(sub, role, sub ? "own" : "none");
  }

  // (a) Own subscription row.
  const ownSub = await getSubscriptionForUser(service, userId);
  if (ownSub) return buildAccess(ownSub, role, "own");

  // (b) Firm-owner inheritance: the buyer whose firm this user is a seat on.
  const ownerSub = await resolveFirmOwnerSubscription(service, userId);
  if (ownerSub) return buildAccess(ownerSub, role, "firm_owner");

  // (c) Co-tenant governing subscription.
  const coTenantSub = await resolveCoTenantSubscription(service, userId);
  if (coTenantSub) return buildAccess(coTenantSub, role, "co_tenant");

  return buildAccess(null, role, "none");
});

/**
 * (b) Find the subscription of the 'owner' seat on any firm the user is a
 * firm_managers member of. The owner is the law firm itself (max one per firm);
 * agency/media seats inherit that owner's plan.
 */
async function resolveFirmOwnerSubscription(
  service: SupabaseClient,
  userId: string,
): Promise<ServerSubscription | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = service as any;

  const { data: seatRows } = await db
    .from("firm_managers")
    .select("firm_id")
    .eq("manager_user_id", userId);
  const firmIds: string[] = (seatRows ?? []).map(
    (r: { firm_id: string }) => r.firm_id,
  );
  if (firmIds.length === 0) return null;

  const { data: ownerRows } = await db
    .from("firm_managers")
    .select("manager_user_id")
    .in("firm_id", firmIds)
    .eq("role", "owner");
  const ownerIds: string[] = (ownerRows ?? [])
    .map((r: { manager_user_id: string }) => r.manager_user_id)
    .filter((id: string) => id !== userId);
  if (ownerIds.length === 0) return null;

  for (const ownerId of ownerIds) {
    const sub = await getSubscriptionForUser(service, ownerId);
    if (sub) return sub;
  }
  return null;
}

/**
 * (c) Resolve a governing subscription across co-tenants (profiles.tenant_id),
 * preferring active/trialing plans, then admin role (see pickGoverningSubscription).
 */
async function resolveCoTenantSubscription(
  service: SupabaseClient,
  userId: string,
): Promise<ServerSubscription | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = service as any;

  const { data: profile } = await db
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle();
  const tenantId: string | null = profile?.tenant_id ?? null;
  if (!tenantId) return null;

  const { data: coProfiles } = await db
    .from("profiles")
    .select("id, role")
    .eq("tenant_id", tenantId);
  const rows: { id: string; role: string | null }[] = coProfiles ?? [];
  const ids = rows.map((r) => r.id).filter((id) => id !== userId);
  if (ids.length === 0) return null;

  const roleByUserId: Record<string, string | null> = {};
  for (const r of rows) roleByUserId[r.id] = r.role;

  const { data: subRows } = await db
    .from("subscriptions")
    .select(
      "user_id, buyer_type, campaign_builder_mass_tort, campaign_builder_pi, " +
        "campaign_builder_monthly_cap, geo_scope_states, geo_scope_unlimited, " +
        "active_tort_addons, status, current_period_start, current_period_end",
    )
    .in("user_id", ids);
  const subs = (subRows ?? []) as ServerSubscription[];
  return pickGoverningSubscription(subs, roleByUserId);
}
