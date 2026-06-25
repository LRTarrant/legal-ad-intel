"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw } from "lucide-react";

/** Re-runs the page's server-side data fetch via an RSC refresh. */
export function RetryButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="inline-flex flex-none items-center gap-1.5 rounded-lg border border-cloud bg-white px-3 py-1.5 text-xs font-semibold text-midnight-navy transition hover:bg-cloud focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-intelligence-teal/50"
    >
      <RefreshCw className="h-3.5 w-3.5" />
      Refresh to retry
    </button>
  );
}

/**
 * Amber banner shown when one or more datasets failed to load, so a partially
 * zeroed page is never mistaken for "no activity". Pass the human-readable
 * labels of the datasets that failed.
 */
export function DataHealthBanner({
  stateName,
  failed,
}: {
  stateName: string;
  failed: string[];
}) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-600" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-amber-900">
          {`Some ${stateName} data couldn't be loaded`}
        </p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-amber-800">
          {`${failed.join(", ")} ${failed.length === 1 ? "is" : "are"} unavailable right now. Figures below may be incomplete. This is a temporary data issue, not a sign of zero activity.`}
        </p>
      </div>
      <RetryButton />
    </div>
  );
}
