/**
 * Admin demo-mode override.
 *
 * Lets super_admin users impersonate a different buyer_type + entitlement
 * profile so they can demo the law-firm vs agency vs media-company UX
 * without swapping their own subscription row.
 *
 * Wire up:
 *   1. Client sends x-demo-mode-* headers with every request that goes
 *      through useFirms / useSubscription.
 *   2. Server route calls readDemoModeOverride(supabase, request).
 *   3. If headers present:
 *        - Caller's profile.role must be 'super_admin' \u2014 if not, this
 *          throws (we treat header spoofing as a hostile request).
 *        - Returns a parsed override object that downstream helpers
 *          accept as an optional last argument.
 *   4. If headers absent: returns null \u2014 real-subscription path.
 *
 * Synthesis rule:
 *   getSubscriptionForUser(supabase, userId, override) ignores the DB
 *   when override is non-null and returns a ServerSubscription with
 *   the override's fields. The user_id field stays as the real user's
 *   id so cost attribution and firm_managers writes still target the
 *   admin's own row \u2014 we never silently impersonate another user.
 */

import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServerSubscription } from "@/lib/campaign-builder/entitlements";

/* ── Types ─────────────────────────────────────────────────────────────── */

export type BuyerTypeOverride = "law_firm" | "ad_agency" | "media_company";

/**
 * The full impersonation payload the client sends. Mirrors the fields
 * that drive entitlement decisions plus buyer_type for the firm-profile
 * page UI branching.
 */
export interface DemoModeOverride {
  /** Marks this object so callers can pattern-match. */
  kind: "demo";
  buyer_type: BuyerTypeOverride;
  /** Whether to grant PI campaign builder access. */
  pi_access: boolean;
  /** Whether to grant Mass Tort campaign builder access. */
  mt_access: boolean;
  /** Monthly cap for new campaign creates. null = unlimited. */
  monthly_cap: number | null;
  /** Two-letter state codes the demo subscription scopes to. Empty = no states. */
  geo_scope_states: string[];
  /** When true, geo_scope_states is ignored \u2014 demo has unlimited geo. */
  geo_scope_unlimited: boolean;
  /**
   * Purchased tort add-on slugs to preview (optional, additive). Unset/undefined
   * leaves the synthesized subscription's tort scope null (the header path never
   * sets it, so the 13 action routes are unaffected). Seed this to preview the
   * positive-tort read surface (assertTortAccess) under demo mode.
   */
  active_tort_addons?: string[];
}

/**
 * Header names sent by the client. Keep these in lock-step with
 * the client-side helper in web/lib/admin/demo-mode-client.ts (Phase
 * 324b). Header values are URL-decoded strings.
 */
export const DEMO_HEADER_BUYER_TYPE = "x-demo-mode-buyer-type";
export const DEMO_HEADER_PI = "x-demo-mode-pi";
export const DEMO_HEADER_MT = "x-demo-mode-mt";
export const DEMO_HEADER_CAP = "x-demo-mode-cap";
export const DEMO_HEADER_GEO_STATES = "x-demo-mode-geo-states";
export const DEMO_HEADER_GEO_UNLIMITED = "x-demo-mode-geo-unlimited";

/**
 * Browser cookie name for the read-surface demo override. Same key family as
 * the client localStorage key so the pill's write point can mirror both. The
 * cookie is what the SERVER-side read guards (assertStateAccess /
 * assertTortAccess) see on a full document navigation — custom headers never
 * ride those requests. Read server-side via readDemoModeCookieOverride() in
 * demo-mode-server.ts (isolates the next/headers import out of this
 * client-bundle-safe module).
 */
export const DEMO_COOKIE_NAME = "lmi_demo_mode_v1";

export const VALID_BUYER_TYPES: ReadonlySet<string> = new Set([
  "law_firm",
  "ad_agency",
  "media_company",
]);

/* ── Server-side reader ────────────────────────────────────────────────── */

/**
 * Read demo-mode headers from a request.
 *
 * Returns null when no headers are present (real-subscription path).
 *
 * Throws when headers ARE present but the caller is not super_admin.
 * Routes should treat that throw as a 403 \u2014 spoofed override is a
 * hostile request, even if the underlying real subscription would
 * have been fine.
 */
export async function readDemoModeOverride(
  supabase: SupabaseClient,
  request: NextRequest,
  userId: string,
): Promise<DemoModeOverride | null> {
  const buyerTypeHeader = request.headers.get(DEMO_HEADER_BUYER_TYPE);
  if (!buyerTypeHeader) return null;

  // Headers present \u2014 super_admin gate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { data: profile } = (await db
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle()) as {
    data: { role: string } | null;
    error: { message: string } | null;
  };
  if (!profile || profile.role !== "super_admin") {
    throw new DemoModeAccessDenied(
      "Demo-mode headers require super_admin role.",
    );
  }

  return parseDemoModeHeaders(request);
}

/**
 * Pure parse step: turns headers into a DemoModeOverride. Exported for
 * unit tests. Production code goes through readDemoModeOverride which
 * also runs the super_admin gate.
 */
export function parseDemoModeHeaders(
  request: NextRequest,
): DemoModeOverride | null {
  const buyerTypeHeader = request.headers.get(DEMO_HEADER_BUYER_TYPE);
  if (!buyerTypeHeader) return null;
  if (!VALID_BUYER_TYPES.has(buyerTypeHeader)) {
    throw new DemoModeAccessDenied(
      `Invalid x-demo-mode-buyer-type: ${buyerTypeHeader}`,
    );
  }

  const piRaw = request.headers.get(DEMO_HEADER_PI);
  const mtRaw = request.headers.get(DEMO_HEADER_MT);
  const capRaw = request.headers.get(DEMO_HEADER_CAP);
  const geoStatesRaw = request.headers.get(DEMO_HEADER_GEO_STATES);
  const geoUnlimitedRaw = request.headers.get(DEMO_HEADER_GEO_UNLIMITED);

  return {
    kind: "demo",
    buyer_type: buyerTypeHeader as BuyerTypeOverride,
    pi_access: parseBool(piRaw, true),
    mt_access: parseBool(mtRaw, true),
    monthly_cap: parseCap(capRaw),
    geo_scope_states: parseStates(geoStatesRaw),
    geo_scope_unlimited: parseBool(geoUnlimitedRaw, false),
  };
}

/* ── Synthesis ─────────────────────────────────────────────────────────── */

/**
 * Build a ServerSubscription out of a demo override. The result looks
 * exactly like a real subscriptions row would, so downstream entitlement
 * checks need no special-casing.
 *
 * Status is fixed at 'active' so isStatusActive() passes. Period
 * timestamps are synthesized to "now -> 30 days" so monthly cap counts
 * window correctly even though no real billing window exists.
 */
export function synthesizeSubscription(
  userId: string,
  override: DemoModeOverride,
): ServerSubscription {
  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    user_id: userId,
    buyer_type: override.buyer_type,
    campaign_builder_mass_tort: override.mt_access,
    campaign_builder_pi: override.pi_access,
    campaign_builder_monthly_cap: override.monthly_cap,
    geo_scope_states: override.geo_scope_states,
    geo_scope_unlimited: override.geo_scope_unlimited,
    // Backward-compatible: the 13 action routes' header path never sets this,
    // so it stays null exactly as before. Only the read-surface cookie path
    // seeds it, to unlock the positive-tort preview case.
    active_tort_addons: override.active_tort_addons ?? null,
    status: "active",
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
  };
}

/* ── Errors ────────────────────────────────────────────────────────────── */

/**
 * Thrown when demo-mode headers are present but the caller can't use
 * them (not super_admin, malformed values, etc.). Routes should catch
 * this and return a 403.
 */
export class DemoModeAccessDenied extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DemoModeAccessDenied";
  }
}

/* ── Internal helpers ──────────────────────────────────────────────────── */

export function parseBool(raw: string | null, fallback: boolean): boolean {
  if (raw === null || raw === undefined) return fallback;
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === "true" || trimmed === "1" || trimmed === "yes") return true;
  if (trimmed === "false" || trimmed === "0" || trimmed === "no") return false;
  return fallback;
}

export function parseCap(raw: string | null): number | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === "" || trimmed === "null" || trimmed === "unlimited") return null;
  const n = parseInt(trimmed, 10);
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

export function parseStates(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z]{2}$/.test(s));
}
