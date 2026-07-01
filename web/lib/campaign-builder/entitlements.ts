/**
 * Server-side entitlement checks for Campaign Builder.
 *
 * The UI gates features client-side via useSubscription / hasMassTortAccess /
 * hasPIAccess. Those are easy to bypass with a direct API call, so every
 * campaign-builder route also runs these server checks before doing real work.
 *
 * Five checks (per SPEC §5 / handoff Task 12):
 *   1. practice_area = "personal_injury" → requires campaign_builder_pi
 *   2. practice_area = "mass_tort"       → requires campaign_builder_mass_tort
 *   3. selected state must be in geo_scope_states (skipped when geo_scope_unlimited)
 *   4. user must be under campaign_builder_monthly_cap (counted from current_period_start)
 *   5. subscription.status must be 'active' or 'trialing'
 *
 * Legacy bypass: users who DO NOT have a subscription row are allowed to use
 * mass tort (existing pre-billing behavior — internal/admin/grandfathered).
 * They are NOT granted PI access — PI is post-billing and gated.
 *
 * The result shape returns enough metadata for the API route to forward an
 * actionable error body to the client (HTTP status + machine-readable code +
 * human reason). The Campaign Builder client maps these codes to upgrade
 * modals or inline error toasts.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  synthesizeSubscription,
  type DemoModeOverride,
} from "@/lib/admin/demo-mode";

/* ──────────────────────────────────────────────────────────────────────── */
/* Types                                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

/**
 * Subset of the subscriptions table required for server-side gating.
 * Includes period bookkeeping that the client-facing ClientSubscription
 * intentionally hides.
 */
export interface ServerSubscription {
  user_id: string;
  buyer_type: "media_company" | "ad_agency" | "law_firm";
  campaign_builder_mass_tort: boolean;
  campaign_builder_pi: boolean;
  campaign_builder_monthly_cap: number | null;
  geo_scope_states: string[] | null;
  geo_scope_unlimited: boolean;
  /** Law-firm tort add-ons (array of tort slugs the account has purchased). */
  active_tort_addons: string[] | null;
  status: "trialing" | "active" | "past_due" | "cancelled";
  current_period_start: string | null;
  current_period_end: string | null;
}

export type EntitlementCheckContext = {
  practice_area: "mass_tort" | "personal_injury";
  /** Two-letter state code being targeted (or null/undefined when N/A). */
  state?: string | null;
  /**
   * Whether this request will cause a NEW campaign to be created (true for
   * plan/save when no campaign id is supplied), as opposed to re-rendering
   * an existing one. Cap counts apply only to creates.
   */
  is_create?: boolean;
};

export type EntitlementError =
  | "subscription_inactive"
  | "practice_area_locked"
  | "geo_scope_violation"
  | "monthly_cap_exceeded";

export interface EntitlementOk {
  ok: true;
  /** null when the user has no subscription row (legacy bypass for mass tort). */
  subscription: ServerSubscription | null;
}

export interface EntitlementDenied {
  ok: false;
  status: 403 | 429;
  code: EntitlementError;
  reason: string;
  /** Optional metadata clients can show in the upgrade modal. */
  meta?: Record<string, unknown>;
}

export type EntitlementResult = EntitlementOk | EntitlementDenied;

/* ──────────────────────────────────────────────────────────────────────── */
/* Subscription fetch                                                       */
/* ──────────────────────────────────────────────────────────────────────── */

/**
 * Look up the current user's subscription row. Returns null when no row
 * exists (legacy / internal users) — callers should treat that as "no
 * entitlements" except for the explicit mass-tort legacy bypass below.
 *
 * When `override` is supplied (admin demo-mode), the DB lookup is
 * skipped and a synthesized ServerSubscription is returned instead.
 * The real user_id stays attached so cost rows + firm_managers writes
 * still target the admin's own row — we never silently impersonate.
 * The override must be vetted by the caller (super_admin gate) BEFORE
 * being passed in. This function trusts the override.
 */
export async function getSubscriptionForUser(
  supabase: SupabaseClient,
  userId: string,
  override?: DemoModeOverride | null,
): Promise<ServerSubscription | null> {
  if (override) {
    return synthesizeSubscription(userId, override);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { data, error } = (await db
    .from("subscriptions")
    .select(
      "user_id, buyer_type, " +
        "campaign_builder_mass_tort, campaign_builder_pi, " +
        "campaign_builder_monthly_cap, geo_scope_states, geo_scope_unlimited, " +
        "active_tort_addons, status, current_period_start, current_period_end",
    )
    .eq("user_id", userId)
    .single()) as {
    data: ServerSubscription | null;
    error: { message: string; code?: string } | null;
  };

  // PGRST116 = no rows. Valid state — no subscription yet.
  if (error && error.code !== "PGRST116" && !error.message?.includes("0 rows")) {
    throw new Error(`subscription lookup failed: ${error.message}`);
  }
  return data ?? null;
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Per-rule checks                                                          */
/* ──────────────────────────────────────────────────────────────────────── */

function isStatusActive(status: ServerSubscription["status"]): boolean {
  return status === "active" || status === "trialing";
}

function checkPracticeArea(
  sub: ServerSubscription,
  area: EntitlementCheckContext["practice_area"],
): EntitlementDenied | null {
  if (area === "personal_injury" && !sub.campaign_builder_pi) {
    return {
      ok: false,
      status: 403,
      code: "practice_area_locked",
      reason:
        "This subscription does not include the Personal Injury Campaign Builder.",
      meta: { practice_area: "personal_injury", buyer_type: sub.buyer_type },
    };
  }
  if (area === "mass_tort" && !sub.campaign_builder_mass_tort) {
    return {
      ok: false,
      status: 403,
      code: "practice_area_locked",
      reason:
        "This subscription does not include the Mass Tort Campaign Builder.",
      meta: { practice_area: "mass_tort", buyer_type: sub.buyer_type },
    };
  }
  return null;
}

function checkGeoScope(
  sub: ServerSubscription,
  state: string | null | undefined,
): EntitlementDenied | null {
  if (sub.geo_scope_unlimited) return null;
  if (!state) return null; // no state in this request → nothing to gate
  const scope = sub.geo_scope_states ?? [];
  if (scope.length === 0) {
    // geo_scope_unlimited=false AND empty scope = no states allowed.
    return {
      ok: false,
      status: 403,
      code: "geo_scope_violation",
      reason: "This subscription has no states enabled.",
      meta: { requested_state: state, allowed_states: [] },
    };
  }
  if (!scope.includes(state.toUpperCase())) {
    return {
      ok: false,
      status: 403,
      code: "geo_scope_violation",
      reason: `State ${state.toUpperCase()} is not in this subscription's geo scope.`,
      meta: { requested_state: state, allowed_states: scope },
    };
  }
  return null;
}

/**
 * Count campaigns the user has created since current_period_start.
 * Cap of NULL = unlimited (skip the check entirely).
 *
 * If current_period_start is null on the subscription (e.g. brand-new row
 * before Stripe webhook fires), we fall back to "first of the current
 * calendar month" so users aren't blocked by a missing timestamp.
 */
async function checkMonthlyCap(
  supabase: SupabaseClient,
  sub: ServerSubscription,
): Promise<EntitlementDenied | null> {
  if (sub.campaign_builder_monthly_cap == null) return null;

  const periodStart = sub.current_period_start
    ? new Date(sub.current_period_start)
    : firstOfMonthUtc();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { count, error } = (await db
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("user_id", sub.user_id)
    .gte("created_at", periodStart.toISOString())) as {
    count: number | null;
    error: { message: string } | null;
  };

  if (error) {
    throw new Error(`cap count query failed: ${error.message}`);
  }

  const used = count ?? 0;
  if (used >= sub.campaign_builder_monthly_cap) {
    return {
      ok: false,
      status: 429,
      code: "monthly_cap_exceeded",
      reason:
        `You've reached your monthly Campaign Builder cap (${sub.campaign_builder_monthly_cap}). ` +
        "The cap resets at the start of your next billing period.",
      meta: {
        cap: sub.campaign_builder_monthly_cap,
        used,
        period_start: periodStart.toISOString(),
        period_end: sub.current_period_end ?? null,
      },
    };
  }
  return null;
}

function firstOfMonthUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Top-level check                                                          */
/* ──────────────────────────────────────────────────────────────────────── */

/**
 * Run all five entitlement checks for the given context. Returns either
 * { ok: true, subscription } so the route can proceed, or a structured
 * denial that maps directly to an HTTP response.
 *
 * Pass `is_create=false` for read-only or re-render endpoints (e.g.
 * generate-radio-script when persisted later) so the cap check is skipped.
 */
export async function checkCampaignBuilderEntitlement(
  supabase: SupabaseClient,
  userId: string,
  ctx: EntitlementCheckContext,
  override?: DemoModeOverride | null,
): Promise<EntitlementResult> {
  const sub = await getSubscriptionForUser(supabase, userId, override);

  // Legacy bypass: no subscription row → allow mass tort only.
  // This preserves access for internal/admin/grandfathered users from
  // before the subscriptions table existed.
  if (!sub) {
    if (ctx.practice_area === "personal_injury") {
      return {
        ok: false,
        status: 403,
        code: "practice_area_locked",
        reason:
          "Personal Injury Campaign Builder requires an active subscription.",
        meta: { practice_area: "personal_injury", legacy_user: true },
      };
    }
    return { ok: true, subscription: null };
  }

  if (!isStatusActive(sub.status)) {
    return {
      ok: false,
      status: 403,
      code: "subscription_inactive",
      reason: `Subscription is ${sub.status}.`,
      meta: { status: sub.status },
    };
  }

  const practiceAreaErr = checkPracticeArea(sub, ctx.practice_area);
  if (practiceAreaErr) return practiceAreaErr;

  const geoErr = checkGeoScope(sub, ctx.state ?? null);
  if (geoErr) return geoErr;

  if (ctx.is_create !== false) {
    const capErr = await checkMonthlyCap(supabase, sub);
    if (capErr) return capErr;
  }

  return { ok: true, subscription: sub };
}

/**
 * Convenience: run the check and, if denied, return a NextResponse-shaped
 * payload directly. Routes can call this to avoid duplicating the
 * status/code/reason JSON shape.
 */
export function entitlementErrorBody(denied: EntitlementDenied): {
  body: { error: string; code: EntitlementError; meta?: Record<string, unknown> };
  status: number;
} {
  return {
    body: { error: denied.reason, code: denied.code, meta: denied.meta },
    status: denied.status,
  };
}
