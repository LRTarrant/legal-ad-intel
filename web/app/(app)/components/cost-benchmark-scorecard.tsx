import Link from "next/link";
import { DollarSign, TrendingDown, TrendingUp, ArrowRight } from "lucide-react";

export interface BenchmarkScorecardData {
  tort_name: string;
  cpl_low: number | null;
  cpl_high: number | null;
  cpa_low: number | null;
  cpa_high: number | null;
  cpk_low: number | null;
  cpk_high: number | null;
  lead_to_retainer_pct: number | null;
  attrition_pct: number | null;
  settlement_low: number | null;
  settlement_high: number | null;
  lifecycle_phase: string | null;
  observed_date: string;
  source_name: string | null;
  source_url: string | null;
}

function formatCurrency(val: number | null): string {
  if (val == null) return "—";
  if (val >= 1000) return `$${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}K`;
  return `$${val.toLocaleString()}`;
}

function formatRange(low: number | null, high: number | null): string {
  if (low == null && high == null) return "—";
  if (low != null && high != null && low === high) return formatCurrency(low);
  return `${formatCurrency(low)} – ${formatCurrency(high)}`;
}

function formatPct(val: number | null): string {
  if (val == null) return "—";
  return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}%`;
}

const PHASE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  emerging:  { label: "Emerging",  color: "#10B981", bg: "#ECFDF5" },
  buzzy:     { label: "Buzzy",     color: "#F59E0B", bg: "#FFFBEB" },
  mdl_stage: { label: "MDL Stage", color: "#2563EB", bg: "#EFF6FF" },
  late:      { label: "Late",      color: "#EF4444", bg: "#FEF2F2" },
  closed:    { label: "Closed",    color: "#6B7280", bg: "#F9FAFB" },
};

interface CostBenchmarkScorecardProps {
  data: BenchmarkScorecardData | null;
  /** If true, shows a compact single-row layout */
  compact?: boolean;
}

export function CostBenchmarkScorecard({ data, compact }: CostBenchmarkScorecardProps) {
  if (!data) {
    return (
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-intelligence-teal" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-gray">
            Cost Benchmarks
          </h3>
        </div>
        <p className="text-sm text-slate-gray">
          No benchmark data available for this tort.{" "}
          <Link
            href="/advertising/cost-benchmarks"
            className="text-intelligence-teal hover:underline"
          >
            View all benchmarks →
          </Link>
        </p>
      </div>
    );
  }

  const phase = data.lifecycle_phase
    ? PHASE_LABELS[data.lifecycle_phase]
    : null;

  const hasSettlement = data.settlement_low != null || data.settlement_high != null;

  // Estimate simple ROI if we have settlement and CPA data
  let estimatedRoi: string | null = null;
  if (data.settlement_low && data.cpa_high && data.cpa_high > 0) {
    const roi = ((data.settlement_low * 0.4 - data.cpa_high) / data.cpa_high) * 100;
    estimatedRoi = roi > 0 ? `${roi.toFixed(0)}%` : null;
  }

  if (compact) {
    return (
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-intelligence-teal" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-gray">
              Cost Benchmarks
            </h3>
          </div>
          {phase && (
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: phase.bg, color: phase.color }}
            >
              {phase.label}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-[10px] font-medium uppercase text-slate-gray">CPL</p>
            <p className="text-sm font-semibold text-midnight-navy">
              {formatRange(data.cpl_low, data.cpl_high)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase text-slate-gray">CPA (Retainer)</p>
            <p className="text-sm font-semibold text-midnight-navy">
              {formatRange(data.cpa_low, data.cpa_high)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase text-slate-gray">Conversion</p>
            <p className="text-sm font-semibold text-midnight-navy">
              {formatPct(data.lead_to_retainer_pct)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase text-slate-gray">Attrition</p>
            <p className="text-sm font-semibold text-midnight-navy">
              {formatPct(data.attrition_pct)}
            </p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-cloud flex items-center justify-between">
          <p className="text-[10px] text-slate-gray">
            Source: {data.source_name ?? "Industry data"} · {data.observed_date}
          </p>
          <Link
            href="/advertising/cost-benchmarks"
            className="flex items-center gap-1 text-xs font-medium text-intelligence-teal hover:underline"
          >
            Full benchmarks <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  }

  // Full scorecard (for standalone use or wider layout)
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-intelligence-teal" />
          <h3 className="font-heading text-lg font-semibold text-midnight-navy">
            Cost Benchmarks
          </h3>
        </div>
        {phase && (
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ backgroundColor: phase.bg, color: phase.color }}
          >
            {phase.label} Phase
          </span>
        )}
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {/* CPL */}
        <div className="rounded-md bg-cloud p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
            Cost Per Lead
          </p>
          <p className="mt-1 text-lg font-bold text-midnight-navy">
            {formatRange(data.cpl_low, data.cpl_high)}
          </p>
        </div>

        {/* CPA */}
        <div className="rounded-md bg-cloud p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
            Cost Per Retainer
          </p>
          <p className="mt-1 text-lg font-bold text-midnight-navy">
            {formatRange(data.cpa_low, data.cpa_high)}
          </p>
        </div>

        {/* CPK */}
        <div className="rounded-md bg-cloud p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
            Cost Per Kept Case
          </p>
          <p className="mt-1 text-lg font-bold text-midnight-navy">
            {formatRange(data.cpk_low, data.cpk_high)}
          </p>
        </div>

        {/* Conversion Rate */}
        <div className="rounded-md bg-cloud p-3">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-success" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
              Lead → Retainer
            </p>
          </div>
          <p className="mt-1 text-lg font-bold text-midnight-navy">
            {formatPct(data.lead_to_retainer_pct)}
          </p>
        </div>

        {/* Attrition */}
        <div className="rounded-md bg-cloud p-3">
          <div className="flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-alert" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
              Attrition
            </p>
          </div>
          <p className="mt-1 text-lg font-bold text-midnight-navy">
            {formatPct(data.attrition_pct)}
          </p>
        </div>

        {/* Settlement range */}
        {hasSettlement && (
          <div className="rounded-md bg-cloud p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
              Settlement Range
            </p>
            <p className="mt-1 text-lg font-bold text-midnight-navy">
              {formatRange(data.settlement_low ?? null, data.settlement_high ?? null)}
            </p>
          </div>
        )}
      </div>

      {/* ROI callout */}
      {estimatedRoi && (
        <div
          className="mt-4 rounded-md px-4 py-2.5 text-sm"
          style={{ backgroundColor: "#ECFDF5", color: "#065F46" }}
        >
          <span className="font-semibold">Estimated Firm ROI:</span>{" "}
          ~{estimatedRoi} (based on low-end settlement at 40% contingency vs. high-end CPA)
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-cloud flex items-center justify-between">
        <p className="text-xs text-slate-gray">
          {data.source_url ? (
            <a
              href={data.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {data.source_name ?? "Source"} ↗
            </a>
          ) : (
            data.source_name ?? "Industry data"
          )}
          {" · "}
          Updated {data.observed_date}
        </p>
        <Link
          href="/advertising/cost-benchmarks"
          className="flex items-center gap-1 text-xs font-semibold text-intelligence-teal hover:underline"
        >
          All benchmarks <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
