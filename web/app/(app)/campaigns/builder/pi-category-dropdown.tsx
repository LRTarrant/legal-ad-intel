"use client";

/**
 * PICategoryDropdown — selector for the 9 v1 PI categories.
 *
 * Categories that don't yet have a script template registered (truck,
 * slip & fall, dog bite, premises, pedestrian, bicycle in v1) are
 * shown but disabled. The user can save a draft for them but cannot
 * generate scripts until Task 9 ships those templates.
 *
 * Category labels are localized here (not in DB) since they're UI
 * concerns. The DB stores the enum value (e.g. 'motorcycle_accident'),
 * and this component maps it to "Motorcycle accident" for display.
 */

import { ChevronDown } from "lucide-react";
import type { PICategory } from "@/lib/campaign-builder/pi-templates/types";
import { getAvailablePICategories } from "@/lib/campaign-builder/pi-templates";

interface CategoryConfig {
  value: PICategory;
  label: string;
  /** One-line description shown in the dropdown to clarify scope. */
  description: string;
}

/**
 * Full v1 category list. The order here drives the dropdown order;
 * we put the highest-volume categories first since most users will
 * pick one of those.
 */
const CATEGORIES: CategoryConfig[] = [
  {
    value: "car_accident",
    label: "Car accident",
    description: "Two-vehicle crashes, rear-end, T-bone, etc.",
  },
  {
    value: "truck_accident",
    label: "Truck accident",
    description: "Commercial truck crashes; FMCSA-regulated carriers",
  },
  {
    value: "motorcycle_accident",
    label: "Motorcycle accident",
    description: "Motorcycle riders hit by other drivers",
  },
  {
    value: "boating_accident",
    label: "Boating accident",
    description: "Watercraft incidents (often maritime jurisdiction)",
  },
  {
    value: "slip_and_fall",
    label: "Slip and fall",
    description: "Falls on wet or hazardous surfaces",
  },
  {
    value: "dog_bite",
    label: "Dog bite",
    description: "Dog attacks (typically homeowner's insurance)",
  },
  {
    value: "premises_liability",
    label: "Premises liability",
    description: "Other property-based injuries (broader than slip & fall)",
  },
  {
    value: "pedestrian_accident",
    label: "Pedestrian accident",
    description: "Pedestrians struck by vehicles",
  },
  {
    value: "bicycle_accident",
    label: "Bicycle accident",
    description: "Cyclists hit by vehicles",
  },
];

interface PICategoryDropdownProps {
  value: PICategory | "";
  onChange: (next: PICategory) => void;
  accentColor: string;
}

export function PICategoryDropdown({
  value,
  onChange,
  accentColor,
}: PICategoryDropdownProps) {
  const availableSet = new Set(getAvailablePICategories());

  return (
    <div>
      <label
        htmlFor="pi-category-select"
        className="block text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1.5"
      >
        PI Category <span className="text-alert">*</span>
      </label>
      <div className="relative">
        <select
          id="pi-category-select"
          value={value}
          onChange={(e) => onChange(e.target.value as PICategory)}
          className="w-full appearance-none rounded-md border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm text-midnight-navy focus:outline-none focus:ring-1"
          style={{
            // Match the focus ring color to the tenant accent
            // (inline because Tailwind can't see the runtime color)
            ...({ "--tw-ring-color": accentColor } as React.CSSProperties),
          }}
        >
          <option value="" disabled>
            Select a PI category…
          </option>
          {CATEGORIES.map((cat) => {
            const available = availableSet.has(cat.value);
            return (
              <option
                key={cat.value}
                value={cat.value}
                disabled={!available}
              >
                {cat.label}
                {available ? "" : " — coming soon"}
              </option>
            );
          })}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
          aria-hidden="true"
        />
      </div>
      {value && (
        <p className="mt-1.5 text-xs text-slate-gray">
          {CATEGORIES.find((c) => c.value === value)?.description}
        </p>
      )}
    </div>
  );
}
