"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasUnlimitedAccess } from "@/lib/roles";
import { TrialExpired } from "./trial-expired";
import { TrialBanner } from "./trial-banner";

interface TrialState {
  checked: boolean;
  expired: boolean;
  daysRemaining: number | null;
}

export function TrialGate({ children }: { children: React.ReactNode }) {
  const [trial, setTrial] = useState<TrialState>({
    checked: false,
    expired: false,
    daysRemaining: null,
  });

  useEffect(() => {
    async function check() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setTrial({ checked: true, expired: false, daysRemaining: null });
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role, trial_expires_at")
          .eq("id", user.id)
          .single();

        if (!profile) {
          setTrial({ checked: true, expired: false, daysRemaining: null });
          return;
        }

        // Managers and Admins always have unlimited access regardless of
        // trial_expires_at — only the User tier is trial-gated.
        if (hasUnlimitedAccess(profile.role)) {
          setTrial({ checked: true, expired: false, daysRemaining: null });
          return;
        }

        // No trial_expires_at means unlimited access
        if (!profile.trial_expires_at) {
          setTrial({ checked: true, expired: false, daysRemaining: null });
          return;
        }

        const expiresAt = new Date(profile.trial_expires_at).getTime();
        const now = Date.now();
        const msPerDay = 1000 * 60 * 60 * 24;
        const daysRemaining = Math.max(0, Math.ceil((expiresAt - now) / msPerDay));
        const expired = expiresAt < now;

        setTrial({ checked: true, expired, daysRemaining: expired ? 0 : daysRemaining });
      } catch {
        setTrial({ checked: true, expired: false, daysRemaining: null });
      }
    }
    check();
  }, []);

  if (!trial.checked) return null;

  if (trial.expired) {
    return <TrialExpired />;
  }

  return (
    <>
      {trial.daysRemaining != null && (
        <TrialBanner daysRemaining={trial.daysRemaining} />
      )}
      {children}
    </>
  );
}
