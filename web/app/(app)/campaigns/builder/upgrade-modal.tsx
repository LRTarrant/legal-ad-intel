"use client";

/**
 * UpgradeModal — buyer-type-specific upgrade prompt for the Campaign
 * Builder.
 *
 * Triggers (per SPEC §5.4 + handoff Task 13):
 *   - "pi_locked"            — locked Personal Injury tab clicked
 *   - "mt_locked"            — locked Mass Tort tab clicked
 *   - "no_access"            — no subscription / inactive
 *   - "monthly_cap_exceeded" — server returned 429 from cap gate
 *   - "geo_scope_violation"  — server returned 403 from geo gate
 *
 * Copy lives in @/lib/billing/upgrade-copy so it stays out of this
 * presentation component and can be unit-tested independently.
 *
 * For ad agencies hitting the campaign cap, the modal exposes a
 * third button labeled "Generate anyway ($N)" that calls onOverage()
 * (the consumer is responsible for actually retrying the request and
 * accepting the overage charge).
 */

import { X } from "lucide-react";
import type { ClientSubscription } from "@/app/api/subscription/me/route";
import {
  getUpgradeCopy,
  buildSalesMailto,
  type UpgradeReason,
  type UpgradeMeta,
} from "@/lib/billing/upgrade-copy";

// Re-export so existing campaign-builder-client imports keep working.
export type UpgradeModalReason = UpgradeReason;

interface UpgradeModalProps {
  open: boolean;
  reason: UpgradeReason;
  subscription: ClientSubscription | null;
  onClose: () => void;
  accentColor: string;
  /** Optional contextual data for cap/geo cases. */
  meta?: UpgradeMeta;
  /**
   * Called when the user clicks the "Generate anyway ($N)" overage
   * button (ad agency cap case). The consumer should retry the original
   * request with overage acceptance and then close the modal.
   */
  onOverage?: () => void;
}

export function UpgradeModal({
  open,
  reason,
  subscription,
  onClose,
  accentColor,
  meta,
  onOverage,
}: UpgradeModalProps) {
  if (!open) return null;

  const copy = getUpgradeCopy(reason, subscription, meta);
  const salesMailto = buildSalesMailto(reason, subscription);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-headline"
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            id="upgrade-modal-headline"
            className="font-heading text-lg font-semibold text-midnight-navy"
          >
            {copy.headline}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-slate-gray mb-6 leading-relaxed">
          {copy.body}
        </p>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            {copy.secondaryCta}
          </button>

          {/* Overage button (ad agency cap path). Only renders when copy
              exposes an overage option AND consumer wired onOverage. */}
          {copy.overage && onOverage && (
            <button
              onClick={onOverage}
              className="rounded-lg border-2 px-4 py-2 text-sm font-semibold transition hover:bg-slate-50"
              style={{ borderColor: accentColor, color: accentColor }}
            >
              {copy.overage.label}
            </button>
          )}

          <a
            href={salesMailto}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: accentColor }}
          >
            {copy.primaryCta}
          </a>
        </div>
      </div>
    </div>
  );
}
