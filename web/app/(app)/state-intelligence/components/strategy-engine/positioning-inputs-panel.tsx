"use client";

import { Loader2, Sparkles } from "lucide-react";
import {
  ARCHETYPE_LABELS,
  type Cadence,
  type FunnelEmphasis,
  type ScoredArchetype,
  type Voice,
} from "@/lib/strategy-engine/types";

/** A small segmented control matching the product's quiet, flat aesthetic. */
function Segmented<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-gray">
          {label}
        </span>
        {hint && <span className="text-[11px] text-slate-gray/80">{hint}</span>}
      </div>
      <div
        role="radiogroup"
        aria-label={label}
        className="mt-1.5 inline-flex rounded-lg border border-cloud bg-white p-0.5"
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={`rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-intelligence-teal/60 motion-reduce:transition-none ${
                active
                  ? "bg-midnight-navy text-white"
                  : "text-slate-gray hover:text-midnight-navy"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PositioningInputsPanel({
  archetype,
  cadence,
  funnel,
  voice,
  onCadence,
  onFunnel,
  onVoice,
  onGenerate,
  generating,
  hasResult,
}: {
  archetype: ScoredArchetype;
  cadence: Cadence;
  funnel: FunnelEmphasis;
  voice: Voice;
  onCadence: (c: Cadence) => void;
  onFunnel: (f: FunnelEmphasis) => void;
  onVoice: (v: Voice) => void;
  onGenerate: () => void;
  generating: boolean;
  hasResult: boolean;
}) {
  return (
    <div className="mt-4 rounded-xl bg-cloud/40 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-heading text-sm font-bold text-midnight-navy">
          Tune the {ARCHETYPE_LABELS[archetype.key]} plan
        </h4>
        <span className="text-[12px] text-slate-gray">
          Defaults are set from the data; adjust if you know better.
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-4">
        <Segmented<Cadence>
          label="Cadence"
          value={cadence}
          onChange={onCadence}
          options={[
            { value: "always_on", label: "Always-On" },
            { value: "surge", label: "Surge" },
          ]}
        />
        <Segmented<FunnelEmphasis>
          label="Emphasis"
          value={funnel}
          onChange={onFunnel}
          options={[
            { value: "brand_led", label: "Brand-led" },
            { value: "conversion_led", label: "Conversion-led" },
          ]}
        />
        <Segmented<Voice>
          label="Write for"
          hint="changes the wording, not the plan"
          value={voice}
          onChange={onVoice}
          options={[
            { value: "firm", label: "Firm" },
            { value: "agency", label: "Agency" },
            { value: "seller", label: "Seller" },
          ]}
        />
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-intelligence-teal px-5 py-2.5 text-sm font-semibold text-intelligence-teal transition hover:bg-intelligence-teal hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-intelligence-teal/60 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {hasResult ? "Regenerate 90-day strategy" : "Generate 90-day strategy"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
