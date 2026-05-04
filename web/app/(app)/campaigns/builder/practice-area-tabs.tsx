"use client";

/**
 * PracticeAreaTabs — Mass Tort / Personal Injury tab toggle.
 *
 * Sits at the top of the Campaign Builder. Locked tabs render with a
 * lock icon; clicking a locked tab opens the UpgradeModal instead of
 * switching the active tab.
 *
 * Tab state is owned by the parent (campaign-builder-client). The
 * parent persists the active tab in URL params + localStorage.
 *
 * Visual notes:
 *   - Tabs (not dropdown) so practice area feels like a first-class
 *     choice, per SPEC §3.2
 *   - Active tab gets the tenant accent color underline
 *   - Locked tabs are slightly faded with a 🔒 icon and reduced cursor
 *     interactivity hint
 */

import { Lock } from "lucide-react";
import type { ClientSubscription } from "@/app/api/subscription/me/route";

export type PracticeArea = "mass_tort" | "personal_injury";

interface PracticeAreaTabsProps {
  active: PracticeArea;
  onChange: (next: PracticeArea) => void;
  onLockedClick: (locked: PracticeArea) => void;
  subscription: ClientSubscription | null;
  loading: boolean;
  accentColor: string;
}

interface TabConfig {
  key: PracticeArea;
  label: string;
  description: string;
}

const TABS: TabConfig[] = [
  {
    key: "mass_tort",
    label: "Mass Tort",
    description: "Tort-driven national or multi-state campaigns",
  },
  {
    key: "personal_injury",
    label: "Personal Injury",
    description: "DMA-targeted campaigns by accident category",
  },
];

function isUnlocked(
  area: PracticeArea,
  subscription: ClientSubscription | null,
): boolean {
  if (!subscription) return false;
  if (subscription.status !== "active" && subscription.status !== "trialing") {
    return false;
  }
  return area === "mass_tort"
    ? subscription.campaign_builder_mass_tort
    : subscription.campaign_builder_pi;
}

export function PracticeAreaTabs({
  active,
  onChange,
  onLockedClick,
  subscription,
  loading,
  accentColor,
}: PracticeAreaTabsProps) {
  return (
    <div
      className="border-b border-slate-200"
      role="tablist"
      aria-label="Practice area"
    >
      <div className="flex items-end gap-1">
        {TABS.map((tab) => {
          const unlocked = isUnlocked(tab.key, subscription);
          const isActive = active === tab.key;
          const showLock = !loading && !unlocked;

          const handleClick = () => {
            if (unlocked) {
              onChange(tab.key);
            } else {
              onLockedClick(tab.key);
            }
          };

          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.key}`}
              id={`tab-${tab.key}`}
              onClick={handleClick}
              className={`group relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? "text-midnight-navy"
                  : "text-slate-gray hover:text-midnight-navy"
              } ${showLock ? "opacity-70" : ""}`}
              title={
                showLock
                  ? `${tab.label} requires an upgrade — click for details`
                  : tab.description
              }
              style={
                isActive
                  ? {
                      borderBottom: `2px solid ${accentColor}`,
                      marginBottom: "-1px",
                    }
                  : undefined
              }
            >
              <span>{tab.label}</span>
              {showLock && (
                <Lock
                  className="h-3.5 w-3.5 text-slate-400"
                  aria-label="Locked"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
