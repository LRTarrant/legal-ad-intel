import { TrialBanner } from "./trial-banner";

/**
 * Renders the trial countdown banner above the app content. The trial-expiry
 * DECISION now happens server-side in the (app) layout (so an expired user
 * never fetches page data); this component only surfaces the remaining-days
 * banner for users still inside their trial window.
 *
 * `daysRemaining` is server-computed and null for users who aren't trial-gated
 * (managers+, or no trial_expires_at) — in which case no banner renders.
 */
export function TrialGate({
  daysRemaining,
  children,
}: {
  daysRemaining: number | null;
  children: React.ReactNode;
}) {
  return (
    <>
      {daysRemaining != null && <TrialBanner daysRemaining={daysRemaining} />}
      {children}
    </>
  );
}
