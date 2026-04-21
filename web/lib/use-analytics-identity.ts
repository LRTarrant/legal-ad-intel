"use client";

// lib/use-analytics-identity.ts
// Hook that binds Supabase auth state to GA4 user_id.
// Put <AnalyticsIdentityBinder /> somewhere inside a client layout (under AnalyticsProvider).

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { identify, clearIdentity } from "@/lib/analytics";

const supabase = createClient();

export default function AnalyticsIdentityBinder() {
  useEffect(() => {
    let mounted = true;

    // Initial hydration: bind if a session already exists.
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!mounted || !user) return;
      await bindFromUser(user);
    });

    // Keep it in sync across login/logout.
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_IN" && session?.user) {
        await bindFromUser(session.user);
      } else if (event === "SIGNED_OUT") {
        clearIdentity();
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}

async function bindFromUser(user: { id: string; email?: string; user_metadata?: any }) {
  // If you store firm_type / firm_name / role on a profile table, fetch it here.
  // For now we read from user_metadata, falling back to undefined.
  const meta = user.user_metadata ?? {};
  identify({
    userId: user.id,
    email: user.email,
    firmType: meta.firm_type,
    firmName: meta.firm_name,
    role: meta.role,
  });
}
