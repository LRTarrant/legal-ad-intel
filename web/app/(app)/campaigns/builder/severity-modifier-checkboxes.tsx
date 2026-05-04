"use client";

/**
 * SeverityModifierCheckboxes — fatal | catastrophic toggles.
 *
 * Mutually exclusive (DB-enforced + UI-enforced). Selecting one
 * disables the other. Default state: neither selected (standard
 * injury tone).
 *
 * Tooltips explain what each modifier does to the script — sourced
 * from SEVERITY_MODIFIER_LABELS in the modifiers index so they stay
 * in sync with the actual script transformations.
 */

import type { SeverityModifier } from "@/lib/campaign-builder/pi-templates/types";
import { SEVERITY_MODIFIER_LABELS } from "@/lib/campaign-builder/severity-modifiers";

interface SeverityModifierCheckboxesProps {
  /**
   * Active modifier (singular: only one can be active at a time).
   * `null` means standard injury tone.
   */
  value: SeverityModifier | null;
  onChange: (next: SeverityModifier | null) => void;
  accentColor: string;
}

const MODIFIERS: SeverityModifier[] = ["fatal", "catastrophic"];

export function SeverityModifierCheckboxes({
  value,
  onChange,
  accentColor,
}: SeverityModifierCheckboxesProps) {
  const handleToggle = (modifier: SeverityModifier) => {
    // Toggle behavior: clicking the active modifier turns it off.
    // Clicking a different modifier replaces the active one.
    if (value === modifier) {
      onChange(null);
    } else {
      onChange(modifier);
    }
  };

  return (
    <fieldset>
      <legend className="block text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1.5">
        Severity (optional)
      </legend>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {MODIFIERS.map((m) => {
          const meta = SEVERITY_MODIFIER_LABELS[m];
          const isActive = value === m;
          const isDisabledByOther = value !== null && value !== m;

          return (
            <label
              key={m}
              className={`flex items-center gap-2 text-sm ${
                isDisabledByOther
                  ? "text-slate-400 cursor-not-allowed"
                  : "text-midnight-navy cursor-pointer"
              }`}
              title={meta.tooltip}
            >
              <input
                type="checkbox"
                checked={isActive}
                disabled={isDisabledByOther}
                onChange={() => handleToggle(m)}
                className="h-4 w-4 rounded border-slate-300 focus:ring-1"
                style={{
                  accentColor: isActive ? accentColor : undefined,
                  ...({ "--tw-ring-color": accentColor } as React.CSSProperties),
                }}
              />
              <span>{meta.label}</span>
            </label>
          );
        })}
      </div>
      {value && (
        <p className="mt-1.5 text-xs text-slate-gray">
          {SEVERITY_MODIFIER_LABELS[value].tooltip}
        </p>
      )}
    </fieldset>
  );
}
