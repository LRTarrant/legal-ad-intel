"use client";

/**
 * FirmPicker \u2014 the "Working on" dropdown shown above Campaign Builder
 * forms.
 *
 * Buyer-type behavior (per the MCC design):
 *   law_firm        \u2192 hide the picker entirely. They have one firm
 *                     (their self firm) and don't think in client terms.
 *   ad_agency       \u2192 show as a required dropdown labelled "Managing".
 *                     Includes an "Add client \u2192" footer that links to
 *                     Settings \u2192 Firms.
 *   media_company   \u2192 same as agency.
 *
 * The selected firm_id is stored in localStorage so the picker remembers
 * the last client across page reloads. Parent owns the controlled state
 * and is responsible for passing firm_id into save / generate calls.
 */

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import type { FirmWithRole } from "@/lib/firms/types";
import type { BuyerType } from "@/lib/firms/use-firms";

interface FirmPickerProps {
  firms: FirmWithRole[];
  buyerType: BuyerType;
  value: string | null;
  onChange: (firmId: string | null) => void;
  /** Optional: hide the "Add client" footer when the picker is embedded
   * in a flow that should keep the user on-task. */
  hideAddClient?: boolean;
}

const STORAGE_KEY = "campaignBuilder.selectedFirmId";

export function FirmPicker({
  firms,
  buyerType,
  value,
  onChange,
  hideAddClient,
}: FirmPickerProps) {
  // Load last-selected firm from localStorage on mount, but only if the
  // parent hasn't already set a value (deep links + URL params win).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (value) return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && firms.some((f) => f.id === saved)) {
      onChange(saved);
    } else if (firms.length > 0) {
      onChange(firms[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firms]);

  // Persist selection
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (value) window.localStorage.setItem(STORAGE_KEY, value);
  }, [value]);

  const sortedFirms = useMemo(
    () => [...firms].sort((a, b) => a.label.localeCompare(b.label)),
    [firms],
  );

  // Law firms see no picker. They have exactly one firm; the parent
  // pulls it from the firms list directly.
  if (buyerType === "law_firm") return null;

  const empty = sortedFirms.length === 0;

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-cloud bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-gray">
        <Briefcase className="h-4 w-4" />
        Managing
      </div>

      {empty ? (
        <p className="text-sm text-slate-gray">
          You haven&apos;t added any client firms yet.
          {!hideAddClient && (
            <>
              {" "}
              <Link
                href="/settings/firms"
                className="font-semibold text-intelligence-teal hover:underline"
              >
                Add your first client \u2192
              </Link>
            </>
          )}
        </p>
      ) : (
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="min-w-[16rem] rounded-md border border-cloud bg-white px-3 py-2 text-sm text-midnight-navy focus:border-intelligence-teal focus:outline-none focus:ring-2 focus:ring-intelligence-teal/30"
        >
          <option value="" disabled>
            Select a client firm\u2026
          </option>
          {sortedFirms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      )}

      {!empty && !hideAddClient && (
        <Link
          href="/settings/firms"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-intelligence-teal hover:underline"
        >
          <Plus className="h-4 w-4" />
          Add client
        </Link>
      )}
    </div>
  );
}
