/**
 * Per-request memoized reads shared by the (app) layout's trial check and the
 * read-surface entitlement guards.
 *
 * Both the layout and the guards need the current user + their profile
 * (role / trial_expires_at). Without memoization a single gated page load did
 * `auth.getUser()` twice and read `profiles` twice. React's `cache()` dedupes
 * these within one server render pass, so each is fetched at most once per
 * request. Server-only.
 */

import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/** The current authenticated user, or null. Memoized per request. */
export const getRequestUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export interface RequestProfile {
  role: string | null;
  trial_expires_at: string | null;
}

/**
 * The user's own profile row (role + trial). RLS lets a seat read its own
 * profile, so this uses the standard server (RLS) client. Memoized per request
 * so the layout's trial check and the guards' role read hit the DB once.
 */
export const getRequestProfile = cache(
  async (userId: string): Promise<RequestProfile | null> => {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const { data } = await db
      .from("profiles")
      .select("role, trial_expires_at")
      .eq("id", userId)
      .maybeSingle();
    if (!data) return null;
    return {
      role: (data.role as string | undefined) ?? null,
      trial_expires_at: (data.trial_expires_at as string | undefined) ?? null,
    };
  },
);
