"use client";

/**
 * PIConfigForm — wraps the Personal Injury config inputs (category,
 * severity, state, DMA, firm name) and the Generate button.
 *
 * On submit, POSTs to /api/campaigns/plan with practice_area=personal_injury
 * and surfaces the rendered template (with severity modifiers already
 * applied) via a callback so the parent can render the result card.
 *
 * State flow:
 *   1. User picks category, state, DMA, severity (optional), firm name
 *   2. Generate is enabled when category + state + DMA + firm name are filled
 *   3. On click, we call /api/campaigns/plan and pass the result back up
 *   4. Parent renders <PIScriptCard> below the form
 *
 * Form does NOT save the campaign yet — that happens via /api/campaigns/save
 * in a follow-up "Save Draft" button (Task 7 v1 keeps it simple; persistence
 * UX expands in Task 7.1).
 */

import { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { PICategory, PITemplate, SeverityModifier } from "@/lib/campaign-builder/pi-templates/types";
import { PICategoryDropdown } from "./pi-category-dropdown";
import { DMASelector, type SelectedDMA } from "./dma-selector";
import { SeverityModifierCheckboxes } from "./severity-modifier-checkboxes";

const US_STATES_FULL: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan",
  MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};
const US_STATE_CODES = Object.keys(US_STATES_FULL);

export interface PIPlanResult {
  practice_area: "personal_injury";
  template: PITemplate;
  base_template: PITemplate;
  severity_modifiers: SeverityModifier[];
}

interface PIConfigFormProps {
  /** Initial firm name (shared with mass tort form). */
  firmName: string;
  onFirmNameChange: (next: string) => void;
  onGenerated: (result: PIPlanResult) => void;
  accentColor: string;
}

export function PIConfigForm({
  firmName,
  onFirmNameChange,
  onGenerated,
  accentColor,
}: PIConfigFormProps) {
  const [category, setCategory] = useState<PICategory | "">("");
  const [state, setState] = useState<string>("");
  const [dma, setDma] = useState<SelectedDMA | null>(null);
  const [severity, setSeverity] = useState<SeverityModifier | null>(null);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = useMemo(
    () =>
      Boolean(category) &&
      Boolean(state) &&
      Boolean(dma) &&
      Boolean(firmName.trim()) &&
      !generating,
    [category, state, dma, firmName, generating],
  );

  async function handleGenerate() {
    if (!canGenerate || !category || !dma) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/campaigns/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          practice_area: "personal_injury",
          pi_category: category,
          market_dma_code: dma.dma_code,
          market_display_name: dma.display_name,
          state,
          state_full_name: US_STATES_FULL[state] ?? state,
          firm_name: firmName.trim(),
          severity_modifiers: severity ? [severity] : [],
        }),
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as
          | { error?: string; details?: string }
          | null;
        throw new Error(
          errBody?.details ?? errBody?.error ?? `Plan failed: ${res.status}`,
        );
      }

      const data = (await res.json()) as PIPlanResult;
      onGenerated(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Row 1: Firm name + Category */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <label
            htmlFor="pi-firm-name"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1.5"
          >
            Firm / Company Name <span className="text-alert">*</span>
          </label>
          <input
            id="pi-firm-name"
            type="text"
            value={firmName}
            onChange={(e) => onFirmNameChange(e.target.value)}
            placeholder="Acme Law"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-midnight-navy focus:outline-none focus:ring-1"
            style={{
              ...({ "--tw-ring-color": accentColor } as React.CSSProperties),
            }}
          />
        </div>

        <PICategoryDropdown
          value={category}
          onChange={setCategory}
          accentColor={accentColor}
        />

        {/* State picker */}
        <div>
          <label
            htmlFor="pi-state"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1.5"
          >
            State <span className="text-alert">*</span>
          </label>
          <select
            id="pi-state"
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              // DMASelector will auto-clear stale dma when state changes,
              // but we also clear locally to avoid a flash of stale UI.
              setDma(null);
            }}
            className="w-full appearance-none rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-midnight-navy focus:outline-none focus:ring-1"
            style={{
              ...({ "--tw-ring-color": accentColor } as React.CSSProperties),
            }}
          >
            <option value="" disabled>
              Select a state…
            </option>
            {US_STATE_CODES.map((code) => (
              <option key={code} value={code}>
                {code} — {US_STATES_FULL[code]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: DMA + Severity */}
      <div className="grid gap-4 md:grid-cols-2">
        <DMASelector
          state={state || null}
          value={dma}
          onChange={setDma}
          accentColor={accentColor}
        />
        <SeverityModifierCheckboxes
          value={severity}
          onChange={setSeverity}
          accentColor={accentColor}
        />
      </div>

      {/* Generate button */}
      <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
        <p className="text-xs text-slate-gray">
          Scripts will reference your selected market by name and apply
          state-specific compliance rules.
        </p>
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:opacity-90"
          style={canGenerate ? { backgroundColor: accentColor } : undefined}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate PI Campaign
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-alert/20 bg-alert/5 p-3 text-sm text-alert">
          {error}
        </div>
      )}
    </div>
  );
}
