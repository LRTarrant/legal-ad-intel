/**
 * Server-only demo-mode cookie reader.
 *
 * The 13 Campaign Builder action routes read the override from x-demo-mode-*
 * request headers (see demo-mode.ts). Read surfaces (state + tort pages) render
 * as server components on a full document navigation, which NEVER carries those
 * custom headers — so the read guards need a different delivery channel. The
 * pill mirrors the override into a browser cookie (demo-mode-client.ts); this
 * module reads that cookie server-side via next/headers.
 *
 * SECURITY: the cookie is untrusted input (JS-writable, non-httpOnly — it must
 * be, so the client pill can set it — and forgeable, exactly like the existing
 * x-demo-mode-* headers). This reader does NO role check. The sole gate lives in
 * resolveAccess(): it only calls this reader when the caller's REAL, server-read
 * profile.role is super_admin, and resolveDemoOverrideAccess() re-asserts that.
 *
 * This file is isolated from demo-mode.ts purely to keep the next/headers import
 * out of the client bundle — demo-mode.ts has zero runtime imports and must stay
 * client-safe.
 */

import { cookies } from "next/headers";
import {
  DEMO_COOKIE_NAME,
  VALID_BUYER_TYPES,
  parseBool,
  parseCap,
  parseStates,
  type BuyerTypeOverride,
  type DemoModeOverride,
} from "./demo-mode";

/** Coerce an arbitrary JSON value into `string | null` for the parse helpers. */
function asStringOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  return String(v);
}

/**
 * Read + validate the demo-mode override from the browser cookie. Returns null
 * on any miss/parse/validation error (missing cookie, malformed JSON, unknown
 * buyer_type). Mirrors the coercion parseDemoModeHeaders applies so the cookie
 * and header paths agree on shape.
 */
export async function readDemoModeCookieOverride(): Promise<DemoModeOverride | null> {
  try {
    const store = await cookies();
    const raw = store.get(DEMO_COOKIE_NAME)?.value;
    if (!raw) return null;

    // The pill writes encodeURIComponent(JSON.stringify(value)); decode first.
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      // Not URL-encoded (or malformed) — fall back to the raw value.
      decoded = raw;
    }

    const parsed = JSON.parse(decoded) as Record<string, unknown>;
    const buyerType = parsed?.buyer_type;
    if (typeof buyerType !== "string" || !VALID_BUYER_TYPES.has(buyerType)) {
      return null;
    }

    const tortAddons = Array.isArray(parsed.active_tort_addons)
      ? parsed.active_tort_addons.filter(
          (s): s is string => typeof s === "string",
        )
      : undefined;

    return {
      kind: "demo",
      buyer_type: buyerType as BuyerTypeOverride,
      pi_access: parseBool(asStringOrNull(parsed.pi_access), true),
      mt_access: parseBool(asStringOrNull(parsed.mt_access), true),
      monthly_cap: parseCap(asStringOrNull(parsed.monthly_cap)),
      geo_scope_states: parseStates(
        Array.isArray(parsed.geo_scope_states)
          ? parsed.geo_scope_states.join(",")
          : asStringOrNull(parsed.geo_scope_states),
      ),
      geo_scope_unlimited: parseBool(
        asStringOrNull(parsed.geo_scope_unlimited),
        false,
      ),
      active_tort_addons: tortAddons,
    };
  } catch {
    return null;
  }
}
