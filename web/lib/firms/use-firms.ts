"use client";

/**
 * useFirms \u2014 React hook to fetch and cache the firms managed by the
 * current user. Mirrors the shape of useSubscription (lib/campaign-builder).
 *
 * Returns:
 *   firms        \u2014 array of FirmWithRole, ordered by label asc
 *   selfFirm     \u2014 the user's owner firm (null for agencies/media)
 *   buyerType    \u2014 buyer type from subscription (or 'law_firm' fallback)
 *   loading      \u2014 true while the initial fetch is in flight
 *   error        \u2014 truthy if /api/firms/ensure-self failed
 *   refresh()    \u2014 manually re-hydrate (used after creating a firm,
 *                  editing the brand profile, etc.)
 *
 * Calls POST /api/firms/ensure-self on mount, which is idempotent and
 * does both "auto-create if needed" and "list current firms" in one
 * round trip.
 */

import { useCallback, useEffect, useState } from "react";
import type { FirmWithRole } from "./types";
import { fetchWithDemoMode } from "@/lib/admin/demo-mode-client";

export type BuyerType = "law_firm" | "ad_agency" | "media_company";

interface EnsureSelfResponse {
  buyer_type: BuyerType;
  self_firm: FirmWithRole | null;
  firms: FirmWithRole[];
}

export interface UseFirmsResult {
  firms: FirmWithRole[];
  selfFirm: FirmWithRole | null;
  buyerType: BuyerType;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useFirms(): UseFirmsResult {
  const [firms, setFirms] = useState<FirmWithRole[]>([]);
  const [selfFirm, setSelfFirm] = useState<FirmWithRole | null>(null);
  const [buyerType, setBuyerType] = useState<BuyerType>("law_firm");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithDemoMode("/api/firms/ensure-self", {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error(`firm fetch failed: ${res.status}`);
      }
      const data = (await res.json()) as EnsureSelfResponse;
      setBuyerType(data.buyer_type);
      setSelfFirm(data.self_firm);
      setFirms(data.firms);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-fetch when the demo-mode pill changes the override in this tab.
  // (The storage event only fires across tabs; we dispatch a custom
  // event in writeDemoModeStored() to cover same-tab updates.)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => refresh();
    window.addEventListener("lmi:demo-mode-changed", handler);
    return () => window.removeEventListener("lmi:demo-mode-changed", handler);
  }, [refresh]);

  return { firms, selfFirm, buyerType, loading, error, refresh };
}
