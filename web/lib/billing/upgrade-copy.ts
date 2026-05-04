/**
 * Buyer-type-specific upgrade modal copy.
 *
 * Centralizes every variation so the React component stays a thin
 * presentation layer. Copy is grounded in SPEC §5.4 and the pricing
 * tiers in §§5.1–5.3.
 *
 * Inputs:
 *   reason       — what triggered the modal (locked tab, cap, geo, no access)
 *   subscription — the user's current sub row (or null for legacy users)
 *   meta         — optional contextual data for cap/geo cases
 *
 * Output:
 *   headline + body + primary/secondary CTA labels + optional overage option.
 *
 * Design notes:
 *   - Media company tiers include everything; locked-state variants for
 *     media_company should never appear in practice. We still return
 *     sane fallback copy so any accidental trigger still renders well.
 *   - "Talk to sales" remains the only purchase path for v1 (per Task 13
 *     scope: "Self-serve tier upgrades... for now, 'Talk to sales' routes
 *     to contact flow"). Stripe checkout is v2.
 *   - Ad agency overage option is exposed when the cap-exceeded modal
 *     fires for them; the consumer (modal component) decides whether to
 *     surface a "Generate anyway ($N)" button.
 */

import type { ClientSubscription } from "@/app/api/subscription/me/route";

/* ──────────────────────────────────────────────────────────────────────── */
/* Types                                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

export type UpgradeReason =
  | "pi_locked"
  | "mt_locked"
  | "no_access"
  | "monthly_cap_exceeded"
  | "geo_scope_violation";

export interface UpgradeMeta {
  /** Cap context (cap_exceeded). */
  cap?: number;
  used?: number;
  /** Period end ISO. */
  period_end?: string | null;
  /** Geo context. */
  requested_state?: string;
  allowed_states?: string[];
}

export interface UpgradeCopy {
  headline: string;
  body: string;
  /** Label for the main action (always "Talk to sales" for v1). */
  primaryCta: string;
  /** Label for the dismiss action. */
  secondaryCta: string;
  /**
   * Optional overage offer for ad agencies hitting the campaign cap.
   * When present, the modal can surface a third button labeled
   * `overage.label` that, when clicked, allows the in-flight request
   * to proceed (the modal exposes an `onOverage` callback for this).
   */
  overage?: {
    label: string;
    /** Per-campaign overage cost — used in the label. */
    pricePerCampaign: number;
  };
}

type BuyerType = ClientSubscription["buyer_type"];

/* ──────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                  */
/* ──────────────────────────────────────────────────────────────────────── */

const TALK_TO_SALES = "Talk to sales";
const MAYBE_LATER = "Maybe later";

/**
 * Per-tier overage pricing for ad agencies (SPEC §5.2).
 * Multi-Market and Enterprise have higher caps so overage at smaller
 * tiers (Regional Agency) is the costly one. Default to Regional pricing
 * if we can't tell — leave room for future tier introspection.
 */
function agencyOveragePrice(sub: ClientSubscription): number {
  // We don't have a clean "tier rank" field. Use the cap as a proxy:
  //   <100 → Regional Agency      ($25 overage)
  //   ≥100 → Multi-Market         ($15 overage)
  //   null → Enterprise           (no cap, no overage)
  const cap = sub.campaign_builder_monthly_cap;
  if (cap == null) return 0;
  return cap < 100 ? 25 : 15;
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Copy resolvers                                                           */
/* ──────────────────────────────────────────────────────────────────────── */

function piLockedCopy(buyer: BuyerType): UpgradeCopy {
  if (buyer === "law_firm") {
    return {
      // Direct from SPEC §5.4 (law firm — PI tab locked, has Mass Tort)
      headline: "Personal Injury campaigns require an upgrade",
      body:
        "Personal Injury campaigns aren't included in your current tier. " +
        "Upgrade to Single State + Both for $1,500/mo to add PI alongside " +
        "your existing Mass Tort access — or unlock more states with " +
        "Multi-State at $3,500/mo.",
      primaryCta: TALK_TO_SALES,
      secondaryCta: MAYBE_LATER,
    };
  }
  if (buyer === "ad_agency") {
    return {
      headline: "Personal Injury campaigns require an upgrade",
      body:
        "Personal Injury isn't included in your current agency tier. Reach " +
        "out to sales to add PI to your plan or upgrade to Multi-Market " +
        "Agency for unlimited markets and 200 campaigns/mo.",
      primaryCta: TALK_TO_SALES,
      secondaryCta: MAYBE_LATER,
    };
  }
  // media_company — should not happen (all media tiers include both)
  return {
    headline: "Upgrade required",
    body:
      "Personal Injury access isn't enabled on your account. " +
      "Reach out to sales — all media company tiers should include both " +
      "practice areas, so this may be a configuration issue.",
    primaryCta: TALK_TO_SALES,
    secondaryCta: "Close",
  };
}

function mtLockedCopy(buyer: BuyerType): UpgradeCopy {
  if (buyer === "law_firm") {
    return {
      // Direct from SPEC §5.4 (law firm — MT tab locked, has PI)
      headline: "Mass Tort campaigns require an upgrade",
      body:
        "Mass Tort campaigns aren't included in your current tier. Upgrade " +
        "to Single State + Both for $1,500/mo to add Mass Tort alongside " +
        "your existing PI access.",
      primaryCta: TALK_TO_SALES,
      secondaryCta: MAYBE_LATER,
    };
  }
  if (buyer === "ad_agency") {
    return {
      headline: "Mass Tort campaigns require an upgrade",
      body:
        "Mass Tort isn't included in your current agency tier. Reach out " +
        "to sales to add it to your plan.",
      primaryCta: TALK_TO_SALES,
      secondaryCta: MAYBE_LATER,
    };
  }
  return {
    headline: "Upgrade required",
    body:
      "Mass Tort access isn't enabled on your account. Reach out to sales " +
      "— all media company tiers should include both practice areas, so " +
      "this may be a configuration issue.",
    primaryCta: TALK_TO_SALES,
    secondaryCta: "Close",
  };
}

function capExceededCopy(
  sub: ClientSubscription,
  meta: UpgradeMeta,
): UpgradeCopy {
  const buyer = sub.buyer_type;
  const used = meta.used ?? 0;
  const cap = meta.cap ?? sub.campaign_builder_monthly_cap ?? 0;

  if (buyer === "ad_agency") {
    // SPEC §5.4 (ad agency — over campaign cap):
    // "You've used X of Y campaigns this month. Generate this campaign
    //  for $25 (charged at end of cycle), or upgrade to Multi-Market
    //  Agency for unlimited markets and 200 campaigns/mo."
    const overagePrice = agencyOveragePrice(sub);
    return {
      headline: "Monthly campaign cap reached",
      body:
        `You've used ${used} of ${cap} campaigns this month. Generate this ` +
        `campaign for $${overagePrice} (charged at end of cycle), or upgrade ` +
        "to Multi-Market Agency for unlimited markets and 200 campaigns/mo.",
      primaryCta: TALK_TO_SALES,
      secondaryCta: MAYBE_LATER,
      overage:
        overagePrice > 0
          ? { label: `Generate anyway ($${overagePrice})`, pricePerCampaign: overagePrice }
          : undefined,
    };
  }

  if (buyer === "law_firm") {
    // Law firms have caps too. No overage offer — push to upgrade.
    return {
      headline: "Monthly campaign cap reached",
      body:
        `You've used ${used} of ${cap} campaigns this month. The cap resets ` +
        "at the start of your next billing period. To generate more campaigns " +
        "this month, upgrade your tier — Multi-State at $3,500/mo includes " +
        "200 campaigns/mo across up to 5 states.",
      primaryCta: TALK_TO_SALES,
      secondaryCta: MAYBE_LATER,
    };
  }

  // media_company — all tiers are unlimited, so this is a configuration anomaly
  return {
    headline: "Monthly campaign cap reached",
    body:
      `You've used ${used} of ${cap} campaigns this month. Media company ` +
      "tiers are unlimited by default — reach out to sales to confirm your " +
      "configuration.",
    primaryCta: TALK_TO_SALES,
    secondaryCta: "Close",
  };
}

function geoScopeCopy(
  sub: ClientSubscription,
  meta: UpgradeMeta,
): UpgradeCopy {
  const buyer = sub.buyer_type;
  const requested = meta.requested_state ?? "this state";
  const allowedCount = meta.allowed_states?.length ?? 0;

  if (buyer === "law_firm") {
    return {
      headline: `${requested} isn't in your subscription`,
      body:
        `Your current tier covers ${allowedCount} state${allowedCount === 1 ? "" : "s"}. ` +
        `To run campaigns in ${requested}, upgrade to Multi-State at $3,500/mo (up to 5 states) ` +
        "or Enterprise Firm for unlimited geo coverage.",
      primaryCta: TALK_TO_SALES,
      secondaryCta: MAYBE_LATER,
    };
  }

  if (buyer === "ad_agency") {
    return {
      headline: `${requested} isn't in your subscription`,
      body:
        "Your current Regional Agency tier covers up to 10 DMAs. To run " +
        "campaigns nationally, upgrade to Multi-Market Agency for unlimited " +
        "markets and 200 campaigns/mo.",
      primaryCta: TALK_TO_SALES,
      secondaryCta: MAYBE_LATER,
    };
  }

  return {
    headline: `${requested} isn't in your subscription`,
    body:
      "Reach out to sales to expand your geo coverage. Media company tiers " +
      "include unlimited geography by default, so this may be a configuration issue.",
    primaryCta: TALK_TO_SALES,
    secondaryCta: "Close",
  };
}

function noAccessCopy(): UpgradeCopy {
  return {
    headline: "Campaign Builder access required",
    body:
      "Your account doesn't have Campaign Builder access yet. Reach out to " +
      "sales to discuss the right tier for your firm or agency.",
    primaryCta: TALK_TO_SALES,
    secondaryCta: "Close",
  };
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Top-level resolver                                                       */
/* ──────────────────────────────────────────────────────────────────────── */

/**
 * Resolve the right copy block for a (reason, subscription, meta) triple.
 *
 * If the caller passes `subscription === null`, we always return the
 * generic "no_access" copy regardless of the reason — without a sub row,
 * there's no buyer_type to personalize against.
 */
export function getUpgradeCopy(
  reason: UpgradeReason,
  subscription: ClientSubscription | null,
  meta: UpgradeMeta = {},
): UpgradeCopy {
  if (!subscription || reason === "no_access") {
    return noAccessCopy();
  }

  switch (reason) {
    case "pi_locked":
      return piLockedCopy(subscription.buyer_type);
    case "mt_locked":
      return mtLockedCopy(subscription.buyer_type);
    case "monthly_cap_exceeded":
      return capExceededCopy(subscription, meta);
    case "geo_scope_violation":
      return geoScopeCopy(subscription, meta);
    default:
      return noAccessCopy();
  }
}

/* ── Error → modal reason mapping ───────────────────────────────────────────── */

/**
 * Shape returned by every entitlement-gated API route on denial.
 * Mirrors EntitlementError in lib/campaign-builder/entitlements.ts.
 */
export interface EntitlementErrorBody {
  error: string;
  code:
    | "subscription_inactive"
    | "practice_area_locked"
    | "geo_scope_violation"
    | "monthly_cap_exceeded";
  meta?: Record<string, unknown>;
}

/**
 * Type guard: does this JSON response body look like an entitlement
 * denial? Used by client error handlers to branch into the upgrade
 * modal instead of a generic toast.
 */
export function isEntitlementError(
  body: unknown,
): body is EntitlementErrorBody {
  if (!body || typeof body !== "object") return false;
  const code = (body as { code?: unknown }).code;
  return (
    code === "subscription_inactive" ||
    code === "practice_area_locked" ||
    code === "geo_scope_violation" ||
    code === "monthly_cap_exceeded"
  );
}

/**
 * Convert an entitlement error body into the UpgradeReason + UpgradeMeta
 * pair the modal expects. `requestedPracticeArea` lets us distinguish
 * `pi_locked` vs `mt_locked` for the practice_area_locked code (the
 * server doesn't know which one the user intended; only the caller does).
 */
export function reasonFromEntitlementError(
  body: EntitlementErrorBody,
  requestedPracticeArea: "mass_tort" | "personal_injury",
): { reason: UpgradeReason; meta: UpgradeMeta } {
  const meta: UpgradeMeta = {};
  const m = body.meta ?? {};

  if (body.code === "monthly_cap_exceeded") {
    if (typeof m.cap === "number") meta.cap = m.cap;
    if (typeof m.used === "number") meta.used = m.used;
    if (typeof m.period_end === "string" || m.period_end === null) {
      meta.period_end = m.period_end as string | null;
    }
    return { reason: "monthly_cap_exceeded", meta };
  }

  if (body.code === "geo_scope_violation") {
    if (typeof m.requested_state === "string") {
      meta.requested_state = m.requested_state.toUpperCase();
    }
    if (Array.isArray(m.allowed_states)) {
      meta.allowed_states = m.allowed_states.filter(
        (s): s is string => typeof s === "string",
      );
    }
    return { reason: "geo_scope_violation", meta };
  }

  if (body.code === "practice_area_locked") {
    return {
      reason: requestedPracticeArea === "personal_injury" ? "pi_locked" : "mt_locked",
      meta,
    };
  }

  // subscription_inactive → surface as no_access
  return { reason: "no_access", meta };
}

/* ── Mailto helper ──────────────────────────────────────────────────────── */

/**
 * Build the mailto link for the "Talk to sales" CTA. Centralized so the
 * subject + body stay consistent across every modal trigger.
 */
export function buildSalesMailto(
  reason: UpgradeReason,
  subscription: ClientSubscription | null,
): string {
  const buyer = subscription?.buyer_type ?? "unknown";
  const subject = "Campaign Builder upgrade inquiry";
  const body =
    `I'd like to discuss upgrading Campaign Builder access.\n\n` +
    `Reason: ${reason}\n` +
    `Buyer type: ${buyer}\n` +
    (subscription
      ? `Current tier: ${subscription.subscription_tier}\n`
      : "");
  return (
    "mailto:sales@legalmarketingintelligence.com" +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(body)}`
  );
}
