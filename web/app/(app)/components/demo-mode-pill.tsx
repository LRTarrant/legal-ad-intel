"use client";

/**
 * DemoModePill \u2014 super_admin-only impersonation switcher.
 *
 * Shows a yellow pill in the top-right when an override is active, or
 * a subtle "Demo \u25be" trigger when in real mode. Clicking opens a
 * dropdown with three buyer-type presets plus "Real" to clear.
 *
 * Wired up against:
 *   - useSuperAdmin() to gate visibility entirely
 *   - lib/admin/demo-mode-client to read/write localStorage and dispatch
 *     the lmi:demo-mode-changed event so useFirms / useSubscription
 *     refetch immediately after a switch
 *
 * Server contract: see lib/admin/demo-mode.ts (Phase 324a).
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Sparkles, X } from "lucide-react";
import { useSuperAdmin } from "@/lib/admin/use-super-admin";
import {
  presetForBuyerType,
  readDemoModeStored,
  reconcileDemoModeCookie,
  writeDemoModeStored,
  type DemoModeStored,
} from "@/lib/admin/demo-mode-client";
import type { BuyerTypeOverride } from "@/lib/admin/demo-mode";

const BUYER_TYPE_LABELS: Record<BuyerTypeOverride, string> = {
  law_firm: "Law Firm",
  ad_agency: "Ad Agency",
  media_company: "Media Co.",
};

const BUYER_TYPE_DESCRIPTIONS: Record<BuyerTypeOverride, string> = {
  law_firm: "Single self-firm. PI access. AL only. 50/mo cap.",
  ad_agency: "Multi-firm. PI + MT. All states. 200/mo cap.",
  media_company: "Multi-firm + white label. Unlimited.",
};

export function DemoModePill() {
  const isSuper = useSuperAdmin();
  const [override, setOverride] = useState<DemoModeStored | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initial load + cross-tab sync via storage events.
  useEffect(() => {
    // Seed the mirror cookie if a pre-cookie-channel override is in localStorage
    // (else the server read guards stay unaware until the next pill toggle).
    reconcileDemoModeCookie();
    setOverride(readDemoModeStored());
    if (typeof window === "undefined") return;
    const handler = () => setOverride(readDemoModeStored());
    window.addEventListener("storage", handler);
    window.addEventListener("lmi:demo-mode-changed", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("lmi:demo-mode-changed", handler);
    };
  }, []);

  // Click-outside to close the dropdown.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!isSuper) return null;

  function pickPreset(buyerType: BuyerTypeOverride) {
    const preset = presetForBuyerType(buyerType);
    writeDemoModeStored(preset);
    setOverride(preset);
    setOpen(false);
  }

  function clearOverride() {
    writeDemoModeStored(null);
    setOverride(null);
    setOpen(false);
  }

  const isActive = override !== null;
  const label = isActive ? BUYER_TYPE_LABELS[override.buyer_type] : "Real";

  return (
    <div
      ref={containerRef}
      className="fixed top-3 right-3 z-50"
      role="region"
      aria-label="Admin demo mode"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
          isActive
            ? "bg-yellow-400 text-yellow-950 hover:bg-yellow-300"
            : "bg-white/90 text-slate-gray hover:bg-white border border-cloud"
        }`}
        title={
          isActive
            ? `Impersonating ${label}. Click to switch.`
            : "Admin demo mode (real). Click to impersonate."
        }
      >
        <Sparkles className="h-3.5 w-3.5" />
        {isActive ? `Demo: ${label}` : "Demo"}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-72 overflow-hidden rounded-lg border border-cloud bg-white shadow-lg"
          role="menu"
        >
          <div className="border-b border-cloud bg-cloud/50 px-3 py-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Demo as
            </div>
            <div className="mt-0.5 text-[11px] text-slate-gray">
              Super-admin impersonation. Stays in your browser only.
            </div>
          </div>

          <ul className="divide-y divide-cloud">
            {(["law_firm", "ad_agency", "media_company"] as const).map(
              (bt) => {
                const active = isActive && override.buyer_type === bt;
                return (
                  <li key={bt}>
                    <button
                      type="button"
                      onClick={() => pickPreset(bt)}
                      className={`flex w-full items-start gap-2 px-3 py-2 text-left transition ${
                        active
                          ? "bg-yellow-50 text-midnight-navy"
                          : "hover:bg-cloud/40 text-midnight-navy"
                      }`}
                      role="menuitem"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold">
                          {BUYER_TYPE_LABELS[bt]}
                          {active && (
                            <span className="ml-2 rounded-sm bg-yellow-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-yellow-950">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-gray">
                          {BUYER_TYPE_DESCRIPTIONS[bt]}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              },
            )}
          </ul>

          {isActive && (
            <div className="border-t border-cloud bg-cloud/30 px-3 py-2">
              <button
                type="button"
                onClick={clearOverride}
                className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-midnight-navy shadow-sm transition hover:bg-cloud/50"
                role="menuitem"
              >
                <X className="h-3 w-3" />
                Clear (back to Real)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
