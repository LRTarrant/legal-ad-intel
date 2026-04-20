"use client";

import { useSyncExternalStore } from "react";
import { X } from "lucide-react";

const DISMISS_KEY = "trial-banner-dismissed";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

function getSnapshot(): boolean {
  return sessionStorage.getItem(DISMISS_KEY) === "1";
}

function getServerSnapshot(): boolean {
  return true; // hidden during SSR
}

export function TrialBanner({ daysRemaining }: { daysRemaining: number }) {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (dismissed) return null;

  const urgent = daysRemaining <= 3;
  const label =
    daysRemaining === 0
      ? "Trial expires today"
      : daysRemaining === 1
        ? "Trial: 1 day remaining"
        : `Trial: ${daysRemaining} days remaining`;

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-lg px-4 py-2 text-sm font-medium ${
        urgent
          ? "border border-amber-400/40 bg-amber-50 text-amber-800"
          : "border border-amber-300/30 bg-amber-50/60 text-amber-700"
      }`}
    >
      <span>{label}</span>
      <button
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, "1");
          // Trigger storage event listeners to re-render
          window.dispatchEvent(new StorageEvent("storage"));
        }}
        className="shrink-0 text-amber-500 transition hover:text-amber-700"
        aria-label="Dismiss trial banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
