/**
 * Server-side helpers for the Proposal Builder API routes.
 *
 * Mirrors the auth + tenant-resolution pattern used by /api/alerts and
 * /api/activity: authenticate via Supabase, then read tenant_id/role
 * from `profiles`. RLS still enforces tenant isolation at the DB layer;
 * we set tenant_id explicitly on insert for parity with the rest of the
 * codebase.
 */

import type { NextRequest } from "next/server";
import type { createClient } from "@/lib/supabase/server";
import { resolveTenant, DEFAULT_LMI_BRANDING } from "@/lib/tenant";
import type { TenantBranding } from "@/lib/tenant-config";

export interface AuthedUser {
  user: { id: string };
  profile: { id: string; tenant_id: string; role: string | null };
}

/**
 * Resolve the caller and their tenant. Returns null when there is no
 * authenticated user or no matching profile row.
 */
export async function getAuthenticatedUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<AuthedUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // `profiles` isn't in the generated Database types — same `as any`
  // escape hatch the campaigns/activity routes use for untyped tables.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: profile } = (await db
    .from("profiles")
    .select("id, tenant_id, role")
    .eq("id", user.id)
    .single()) as {
    data: { id: string; tenant_id: string | null; role: string | null } | null;
  };

  if (!profile || !profile.tenant_id) return null;
  return {
    user: { id: user.id },
    profile: {
      id: profile.id,
      tenant_id: profile.tenant_id,
      role: profile.role ?? null,
    },
  };
}

/**
 * Resolve tenant branding for a proposal response. RLS guarantees the
 * proposal belongs to the caller's tenant, and the caller browses on
 * their tenant's host — so host-based resolution (the same path the app
 * shell uses) yields the proposal's branding. Falls back to LMI default.
 */
export async function resolveBrandingFromRequest(
  req: NextRequest,
): Promise<TenantBranding> {
  try {
    const host = req.headers.get("host") ?? "";
    if (!host) return DEFAULT_LMI_BRANDING;
    return await resolveTenant(host);
  } catch {
    return DEFAULT_LMI_BRANDING;
  }
}
