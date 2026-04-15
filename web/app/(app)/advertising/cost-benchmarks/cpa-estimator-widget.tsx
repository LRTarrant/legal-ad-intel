"use client";

import { useState } from "react";
import { Calculator, ChevronDown } from "lucide-react";

interface CpaEstimatorWidgetProps {
  tortNames: string[];
}

interface EstimateResult {
  tort_name: string;
  base_cpa_low: number;
  base_cpa_high: number;
  criteria_multiplier: number;
  geo_multiplier: number;
  estimated_cpa_low: number;
  estimated_cpa_high: number;
  lifecycle_phase: string;
  confidence: string;
}

const CRITERIA_OPTIONS = [
  {
    value: "broad",
    label: "Broad",
    description: "Minimal qualification — e.g., used product, diagnosis present",
    multiplier: "~30% lower CPA",
  },
  {
    value: "medium",
    label: "Medium",
    description: "Standard intake criteria — product + injury + timeframe",
    multiplier: "Baseline",
  },
  {
    value: "narrow",
    label: "Narrow",
    description: "Strict — specific injury + surgery/treatment + geography",
    multiplier: "~80% higher CPA",
  },
] as const;

const GEO_OPTIONS = [
  {
    value: "national",
    label: "National",
    description: "Advertising across all 50 states",
  },
  {
    value: "regional",
    label: "Regional",
    description: "Targeting 10–20 states or specific DMAs",
  },
  {
    value: "state_limited",
    label: "Limited (≤4 states)",
    description: "Targeting 4 or fewer states — CPA can double",
  },
] as const;

const CONFIDENCE_LABELS: Record<string, { label: string; color: string }> = {
  high:     { label: "High",      color: "#10B981" },
  medium:   { label: "Medium",    color: "#F59E0B" },
  low:      { label: "Low",       color: "#EF4444" },
  very_low: { label: "Very Low",  color: "#6B7280" },
};

function fmtCurrency(val: number): string {
  return `$${val.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function CpaEstimatorWidget({ tortNames }: CpaEstimatorWidgetProps) {
  const [selectedTort, setSelectedTort] = useState(tortNames[0] ?? "");
  const [criteria, setCriteria] = useState<"broad" | "medium" | "narrow">("medium");
  const [geoScope, setGeoScope] = useState<"national" | "regional" | "state_limited">("national");
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEstimate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cpa-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tort_name: selectedTort,
          criteria_breadth: criteria,
          geo_scope: geoScope,
        }),
      });
      if (!res.ok) throw new Error("Estimation failed");
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Could not estimate CPA. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const confidence = result ? CONFIDENCE_LABELS[result.confidence] : null;

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5 text-intelligence-teal" />
        <h2 className="font-heading text-lg font-semibold text-midnight-navy">
          CPA Estimator
        </h2>
      </div>

      <p className="text-sm text-slate-gray mb-5">
        Adjust criteria breadth and geographic scope to see how they impact cost
        per signed retainer. Based on industry benchmarks with multiplier
        adjustments.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Tort selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1.5">
            Tort
          </label>
          <div className="relative">
            <select
              value={selectedTort}
              onChange={(e) => {
                setSelectedTort(e.target.value);
                setResult(null);
              }}
              className="w-full appearance-none rounded-md border border-cloud bg-white px-3 py-2.5 pr-8 text-sm text-midnight-navy focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
            >
              {tortNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-slate-gray pointer-events-none" />
          </div>
        </div>

        {/* Criteria breadth */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1.5">
            Criteria Breadth
          </label>
          <div className="flex gap-1.5">
            {CRITERIA_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setCriteria(opt.value);
                  setResult(null);
                }}
                title={opt.description}
                className={`flex-1 rounded-md px-2 py-2.5 text-xs font-medium transition-colors ${
                  criteria === opt.value
                    ? "bg-intelligence-teal text-white"
                    : "bg-cloud text-slate-gray hover:bg-cloud/80"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Geo scope */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1.5">
            Geographic Scope
          </label>
          <div className="flex gap-1.5">
            {GEO_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setGeoScope(opt.value);
                  setResult(null);
                }}
                title={opt.description}
                className={`flex-1 rounded-md px-2 py-2.5 text-xs font-medium transition-colors ${
                  geoScope === opt.value
                    ? "bg-intelligence-teal text-white"
                    : "bg-cloud text-slate-gray hover:bg-cloud/80"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Estimate button */}
      <button
        type="button"
        onClick={handleEstimate}
        disabled={loading || !selectedTort}
        className="mt-5 rounded-lg bg-intelligence-teal px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-intelligence-teal/90 disabled:opacity-50"
      >
        {loading ? "Estimating…" : "Estimate CPA"}
      </button>

      {/* Error */}
      {error && (
        <p className="mt-3 text-sm text-alert">{error}</p>
      )}

      {/* Result */}
      {result && (
        <div className="mt-5 rounded-lg border border-cloud p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-semibold text-midnight-navy">
              {result.tort_name}
            </h3>
            {confidence && (
              <span className="text-xs font-medium" style={{ color: confidence.color }}>
                Confidence: {confidence.label}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
                Base CPA
              </p>
              <p className="text-lg font-bold text-slate-gray line-through">
                {fmtCurrency(result.base_cpa_low)} – {fmtCurrency(result.base_cpa_high)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
                Adjusted CPA
              </p>
              <p className="text-lg font-bold text-midnight-navy">
                {fmtCurrency(result.estimated_cpa_low)} – {fmtCurrency(result.estimated_cpa_high)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
                Criteria Multiplier
              </p>
              <p className="text-lg font-bold text-midnight-navy">
                {result.criteria_multiplier}x
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
                Geo Multiplier
              </p>
              <p className="text-lg font-bold text-midnight-navy">
                {result.geo_multiplier}x
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-gray">
            Lifecycle phase: <span className="font-medium">{result.lifecycle_phase}</span>.
            Adjusted CPA applies a {result.criteria_multiplier}x criteria and{" "}
            {result.geo_multiplier}x geographic multiplier to the base benchmark range.
          </p>
        </div>
      )}
    </div>
  );
}
