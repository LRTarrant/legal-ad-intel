"use client";

/**
 * useSuperAdmin \u2014 React hook that returns whether the current user
 * has the 'super_admin' role on their profile.
 *
 * Used to gate admin-only UI like the demo-mode pill. Returns false
 * during the initial fetch so non-admin UI doesn't flash.
 *
 * Why a separate hook from sidebar's isAdmin: sidebar treats tenant_admin
 * AND super_admin as equivalent for menu visibility. Demo-mode is more
 * sensitive \u2014 only super_admin should be able to flip entitlements.
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useSuperAdmin(): boolean {
  const [isSuper, setIsSuper] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        // Cast through any: the generated database.types.ts doesn't
        // include the profiles table; row shape is stable (role TEXT).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = supabase as any;
        const { data: profile } = await sb
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (
          !cancelled &&
          profile &&
          (profile as { role?: string }).role === "super_admin"
        ) {
          setIsSuper(true);
        }
      } catch {
        // Silent \u2014 default to false
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return isSuper;
}
