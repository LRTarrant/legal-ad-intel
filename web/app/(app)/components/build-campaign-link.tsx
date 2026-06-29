import Link from "next/link";
import { Megaphone } from "lucide-react";

/**
 * Deep link to Campaign Builder with config pre-selected.
 *
 * Used on:
 *  - Mass tort detail pages → opens builder on Mass Tort tab with the
 *    tort name pre-filled.
 *  - State intelligence pages → opens builder on Personal Injury tab
 *    with the state pre-filled.
 *
 * Visual style matches the existing cross-link buttons on tort/state
 * pages so it feels native, not bolted on.
 *
 * The Campaign Builder reads these URL params on mount, applies them,
 * and strips them via history.replaceState() so the URL stays clean
 * for sharing/bookmarking. Users can still change every pre-filled
 * value in the form.
 *
 * Entitlement check happens on the builder side: if the user lacks the
 * practice area, the existing tab-gating + upgrade modal flow takes
 * over (no silent fail).
 */
export type BuildCampaignLinkVariant =
  | { kind: "mass_tort"; tortLabel: string }
  | { kind: "personal_injury"; stateCode: string; stateName: string };

interface BuildCampaignLinkProps {
  variant: BuildCampaignLinkVariant;
  /** Visual size — `sm` for inline header chips, `md` for cross-link rows. */
  size?: "sm" | "md";
  /**
   * Visual emphasis.
   * - `outline` (default): the prominent teal-outline CTA used on tort/state
   *   page headers, where Build Campaign is the page's main cross-link action.
   * - `ghost`: a quieter neutral secondary, for when it sits beside a filled
   *   primary that should win the eye (e.g. the Alabama hero, where the
   *   strategy CTA is primary — "strategy first, the campaign builds from it").
   */
  tone?: "outline" | "ghost";
}

export function BuildCampaignLink({ variant, size = "md", tone = "outline" }: BuildCampaignLinkProps) {
  const href = buildHref(variant);
  const label = buildLabel(variant);

  const sizeClasses =
    size === "sm"
      ? "px-3 py-1.5 text-xs gap-1.5"
      : "px-5 py-2.5 text-sm gap-2";

  // Both tones carry a 1px border so the button height lines up with an
  // adjacent borderless filled primary that uses `border border-transparent`.
  const toneClasses =
    tone === "ghost"
      ? "border border-cloud text-midnight-navy/70 hover:border-intelligence-teal hover:text-intelligence-teal"
      : "border-2 border-intelligence-teal text-intelligence-teal hover:bg-intelligence-teal hover:text-white";

  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-lg font-semibold transition ${toneClasses} ${sizeClasses}`}
    >
      <Megaphone className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      {label} →
    </Link>
  );
}

function buildHref(variant: BuildCampaignLinkVariant): string {
  const params = new URLSearchParams();
  if (variant.kind === "mass_tort") {
    params.set("practice_area", "mass_tort");
    params.set("tort_name", variant.tortLabel);
  } else {
    params.set("practice_area", "personal_injury");
    params.set("state", variant.stateCode);
  }
  return `/campaigns/builder?${params.toString()}`;
}

function buildLabel(variant: BuildCampaignLinkVariant): string {
  if (variant.kind === "mass_tort") {
    return `Build Campaign for ${variant.tortLabel}`;
  }
  return `Build PI Campaign in ${variant.stateName}`;
}
