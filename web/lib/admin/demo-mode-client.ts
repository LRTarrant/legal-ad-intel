/**
 * Client-side demo-mode helpers.
 *
 * Reads the override the user picked in the admin nav pill (Phase 324b)
 * from localStorage and converts it into headers for outgoing fetches.
 * No PII; just the impersonation config.
 *
 * Server gate is in web/lib/admin/demo-mode.ts \u2014 it requires the caller
 * to be super_admin, so even if a non-admin user manually puts something
 * in localStorage and the headers go out, the server will refuse with
 * 403.
 */

import {
  DEMO_COOKIE_NAME,
  DEMO_HEADER_BUYER_TYPE,
  DEMO_HEADER_CAP,
  DEMO_HEADER_GEO_STATES,
  DEMO_HEADER_GEO_UNLIMITED,
  DEMO_HEADER_MT,
  DEMO_HEADER_PI,
  type BuyerTypeOverride,
} from "./demo-mode";

const STORAGE_KEY = DEMO_COOKIE_NAME;

export interface DemoModeStored {
  buyer_type: BuyerTypeOverride;
  pi_access: boolean;
  mt_access: boolean;
  monthly_cap: number | null;
  geo_scope_states: string[];
  geo_scope_unlimited: boolean;
  /**
   * Tort add-on slugs to preview (optional). Not set by the pill UI today; seed
   * it here to reach the positive-tort read surface under demo mode. Mirrored
   * into the cookie so the server read guards see it.
   */
  active_tort_addons?: string[];
}

/**
 * Read the current demo override from localStorage, or null if none.
 * Returns null in non-browser environments (SSR safe).
 */
export function readDemoModeStored(): DemoModeStored | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DemoModeStored>;
    if (
      parsed.buyer_type !== "law_firm" &&
      parsed.buyer_type !== "ad_agency" &&
      parsed.buyer_type !== "media_company"
    ) {
      return null;
    }
    return {
      buyer_type: parsed.buyer_type,
      pi_access: parsed.pi_access ?? true,
      mt_access: parsed.mt_access ?? true,
      monthly_cap:
        typeof parsed.monthly_cap === "number" ? parsed.monthly_cap : null,
      geo_scope_states: Array.isArray(parsed.geo_scope_states)
        ? parsed.geo_scope_states.filter(
            (s): s is string => typeof s === "string",
          )
        : [],
      geo_scope_unlimited: parsed.geo_scope_unlimited ?? false,
      active_tort_addons: Array.isArray(parsed.active_tort_addons)
        ? parsed.active_tort_addons.filter(
            (s): s is string => typeof s === "string",
          )
        : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Persist the override (or clear it when null).
 */
export function writeDemoModeStored(value: DemoModeStored | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    }
    // Mirror into a non-httpOnly cookie so SERVER-side read guards
    // (assertStateAccess / assertTortAccess) see the override on a full
    // document navigation — custom headers never ride those requests. The
    // cookie is deliberately client-writable; security rests on the server
    // re-verifying super_admin from the real profile row, not on cookie
    // secrecy (same trust model as the forgeable x-demo-mode-* headers).
    if (typeof document !== "undefined") {
      // Secure over HTTPS (prod); omit on http localhost so dev still works.
      const secure =
        typeof window !== "undefined" &&
        window.location.protocol === "https:"
          ? ";secure"
          : "";
      if (value === null) {
        document.cookie = `${DEMO_COOKIE_NAME}=;path=/;max-age=0;samesite=lax${secure}`;
      } else {
        document.cookie = `${DEMO_COOKIE_NAME}=${encodeURIComponent(
          JSON.stringify(value),
        )};path=/;max-age=2592000;samesite=lax${secure}`;
      }
    }
    // Notify other components in the same tab (the storage event only
    // fires for OTHER tabs by spec, not the one that wrote the value).
    window.dispatchEvent(new CustomEvent("lmi:demo-mode-changed"));
  } catch {
    // Quota or privacy mode \u2014 silently fail. The pill UI will still
    // show what the user picked in the dropdown for the current
    // session.
  }
}

/**
 * Reconcile the mirror cookie with localStorage.
 *
 * The cookie is only written when `writeDemoModeStored` runs (a pill toggle).
 * A super_admin who already had demo mode ON in localStorage BEFORE the cookie
 * channel shipped has no cookie, so the server-side read guards keep bypassing
 * while the action routes (header path) still see demo mode. Call this on the
 * pill's mount: if an override exists but the cookie is missing, re-seed the
 * cookie. Idempotent; a no-op when the two channels already agree.
 */
export function reconcileDemoModeCookie(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const stored = readDemoModeStored();
  if (!stored) return;
  const hasCookie = document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${DEMO_COOKIE_NAME}=`));
  if (!hasCookie) writeDemoModeStored(stored);
}

/**
 * Convert a stored override into request headers.
 * Returns an empty object when no override is set.
 */
export function demoModeHeaders(
  override: DemoModeStored | null,
): Record<string, string> {
  if (!override) return {};
  return {
    [DEMO_HEADER_BUYER_TYPE]: override.buyer_type,
    [DEMO_HEADER_PI]: override.pi_access ? "true" : "false",
    [DEMO_HEADER_MT]: override.mt_access ? "true" : "false",
    [DEMO_HEADER_CAP]:
      override.monthly_cap === null ? "unlimited" : String(override.monthly_cap),
    [DEMO_HEADER_GEO_STATES]: override.geo_scope_states.join(","),
    [DEMO_HEADER_GEO_UNLIMITED]: override.geo_scope_unlimited ? "true" : "false",
  };
}

/**
 * Convenience: fetch wrapper that automatically adds demo-mode headers
 * when an override is set in localStorage. Drop-in replacement for
 * window.fetch() for app code; passes through credentials, body, etc.
 */
export async function fetchWithDemoMode(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const override = readDemoModeStored();
  const extra = demoModeHeaders(override);
  const merged = new Headers(init?.headers);
  for (const [k, v] of Object.entries(extra)) merged.set(k, v);
  return fetch(input, { ...init, headers: merged });
}

/**
 * Build presets for each buyer_type with sensible defaults. Used by
 * the nav pill (Phase 324b) when the user picks a mode without
 * customizing the entitlement flags.
 */
export function presetForBuyerType(
  buyerType: BuyerTypeOverride,
): DemoModeStored {
  if (buyerType === "law_firm") {
    // Scoped preset: exercises BOTH read-surface axes so a super_admin can
    // preview positive + negative gating. geo=[AL] (Alabama renders, other
    // states → AccessDenied); active_tort_addons=[roundup] (Roundup renders,
    // other torts → AccessDenied). Without a tort add-on here the positive-tort
    // preview is unreachable — geo_scope_unlimited never grants torts.
    return {
      buyer_type: "law_firm",
      pi_access: true,
      mt_access: true,
      monthly_cap: 50,
      geo_scope_states: ["AL"],
      geo_scope_unlimited: false,
      active_tort_addons: ["roundup"],
    };
  }
  if (buyerType === "ad_agency") {
    return {
      buyer_type: "ad_agency",
      pi_access: true,
      mt_access: true,
      monthly_cap: 200,
      geo_scope_states: [],
      geo_scope_unlimited: true,
    };
  }
  // media_company
  return {
    buyer_type: "media_company",
    pi_access: true,
    mt_access: true,
    monthly_cap: null,
    geo_scope_states: [],
    geo_scope_unlimited: true,
  };
}
