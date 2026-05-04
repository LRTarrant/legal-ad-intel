"use client";

/**
 * useSubscription — React hook to fetch and cache the current user's
 * subscription row.
 *
 * Used by the Campaign Builder client to decide:
 *   - Which practice area tabs to show as unlocked
 *   - Whether to gate features behind upgrade prompts
 *   - What buyer-type-specific copy to show in the upgrade modal
 *
 * Returns three things:
 *   - subscription: the row, or null if not yet loaded / user has none
 *   - loading: true on initial fetch
 *   - error: the error message if the fetch failed
 *
 * "No subscription" is a valid state — internal/admin users may not
 * have a subscriptions row. Callers should treat null as "no entitlements"
 * and gate accordingly.
 */

import { useCallback, useEffect, useState } from "react";
import type {
  ClientSubscription,
  SubscriptionMeResponse,
} from "@/app/api/subscription/me/route";
import { fetchWithDemoMode } from "@/lib/admin/demo-mode-client";

export interface UseSubscriptionResult {
  subscription: ClientSubscription | null;
  loading: boolean;
  error: string | null;
}

export function useSubscription(): UseSubscriptionResult {
  const [subscription, setSubscription] = useState<ClientSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchWithDemoMode("/api/subscription/me", { credentials: "same-origin" })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`subscription fetch failed: ${res.status}`);
        }
        return (await res.json()) as SubscriptionMeResponse;
      })
      .then((data) => {
        if (cancelled) return;
        setSubscription(data.subscription);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => refresh(), [refresh]);

  // Re-fetch when the demo-mode pill changes in this tab.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => refresh();
    window.addEventListener("lmi:demo-mode-changed", handler);
    return () => window.removeEventListener("lmi:demo-mode-changed", handler);
  }, [refresh]);

  return { subscription, loading, error };
}

/**
 * Convenience selectors built on top of useSubscription. Keep these
 * here so the gating logic is one place rather than scattered across
 * components.
 */

export function hasMassTortAccess(sub: ClientSubscription | null): boolean {
  if (!sub) return false;
  if (sub.status !== "active" && sub.status !== "trialing") return false;
  return sub.campaign_builder_mass_tort;
}

export function hasPIAccess(sub: ClientSubscription | null): boolean {
  if (!sub) return false;
  if (sub.status !== "active" && sub.status !== "trialing") return false;
  return sub.campaign_builder_pi;
}
