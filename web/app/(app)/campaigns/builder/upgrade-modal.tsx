"use client";

/**
 * UpgradeModal — buyer-type-specific upgrade prompt for the Campaign
 * Builder.
 *
 * Shown when a user clicks a locked practice area tab. Copy varies by
 * buyer_type and which practice area they're missing, per SPEC §5.4.
 *
 * Modes:
 *   "pi_locked"  — user has Mass Tort, clicked locked Personal Injury tab
 *   "mt_locked"  — user has Personal Injury, clicked locked Mass Tort tab
 *   "no_access"  — user has neither (e.g. expired sub, no sub)
 *
 * Triggers for the "Talk to sales" CTA:
 *   - For now this is mailto:sales@legalmarketingintelligence.com
 *   - Future: route to an in-app contact form / Calendly link
 */

import { X } from "lucide-react";
import type { ClientSubscription } from "@/app/api/subscription/me/route";

export type UpgradeModalReason = "pi_locked" | "mt_locked" | "no_access";

interface UpgradeModalProps {
  open: boolean;
  reason: UpgradeModalReason;
  subscription: ClientSubscription | null;
  onClose: () => void;
  accentColor: string;
}

interface UpgradeCopy {
  headline: string;
  body: string;
  primaryCta: string;
  secondaryCta: string;
}

/**
 * Resolve the right copy block for the buyer + reason combination.
 * Falls back to generic copy if subscription is null (no_access case).
 */
function getUpgradeCopy(
  reason: UpgradeModalReason,
  subscription: ClientSubscription | null,
): UpgradeCopy {
  // No subscription at all — generic upgrade prompt
  if (!subscription || reason === "no_access") {
    return {
      headline: "Campaign Builder access required",
      body:
        "Your account doesn't have Campaign Builder access yet. Reach out to " +
        "sales to discuss the right tier for your firm or agency.",
      primaryCta: "Talk to sales",
      secondaryCta: "Close",
    };
  }

  const buyer = subscription.buyer_type;

  if (reason === "pi_locked") {
    if (buyer === "law_firm") {
      return {
        headline: "Personal Injury campaigns require an upgrade",
        body:
          "Personal Injury isn't included in your current tier. Upgrade to " +
          "Single State + Both for $1,500/mo to add PI alongside your existing " +
          "Mass Tort access — or unlock more states with Multi-State at $3,500/mo.",
        primaryCta: "Talk to sales",
        secondaryCta: "Maybe later",
      };
    }
    if (buyer === "ad_agency") {
      return {
        headline: "Personal Injury campaigns require an upgrade",
        body:
          "Personal Injury isn't included in your current agency tier. Reach " +
          "out to sales to add PI to your plan or upgrade to Multi-Market Agency.",
        primaryCta: "Talk to sales",
        secondaryCta: "Maybe later",
      };
    }
    // media_company falls through to default — they should never see this
    // since all media tiers include both practice areas.
  }

  if (reason === "mt_locked") {
    if (buyer === "law_firm") {
      return {
        headline: "Mass Tort campaigns require an upgrade",
        body:
          "Mass Tort isn't included in your current tier. Upgrade to Single " +
          "State + Both for $1,500/mo to add Mass Tort alongside your existing " +
          "PI access.",
        primaryCta: "Talk to sales",
        secondaryCta: "Maybe later",
      };
    }
    if (buyer === "ad_agency") {
      return {
        headline: "Mass Tort campaigns require an upgrade",
        body:
          "Mass Tort isn't included in your current agency tier. Reach out " +
          "to sales to add it to your plan.",
        primaryCta: "Talk to sales",
        secondaryCta: "Maybe later",
      };
    }
  }

  // Catch-all (shouldn't be reachable for media_company)
  return {
    headline: "Upgrade required",
    body: "Reach out to sales to discuss expanding your Campaign Builder access.",
    primaryCta: "Talk to sales",
    secondaryCta: "Close",
  };
}

export function UpgradeModal({
  open,
  reason,
  subscription,
  onClose,
  accentColor,
}: UpgradeModalProps) {
  if (!open) return null;

  const copy = getUpgradeCopy(reason, subscription);
  const salesMailto =
    "mailto:sales@legalmarketingintelligence.com" +
    "?subject=Campaign%20Builder%20upgrade%20inquiry" +
    `&body=I%27d%20like%20to%20discuss%20upgrading%20Campaign%20Builder%20access%20` +
    `(${encodeURIComponent(reason)}).`;

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

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            {copy.secondaryCta}
          </button>
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
