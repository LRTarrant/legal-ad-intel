import {
  getTortCostBenchmarks,
  getLifecycleCpaRanges,
  type TortCostBenchmark,
  type LifecycleCpaRange,
} from "@/lib/queries";
import Link from "next/link";
import { DollarSign, ExternalLink } from "lucide-react";
import { AdvertisingInsight } from "../../components/advertising-insight";
import { MethodologySources } from "../../components/methodology-sources";
import { CpaEstimatorWidget } from "./cpa-estimator-widget";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cost Benchmarks | Legal Marketing Intelligence",
  description:
    "Mass tort CPL, CPA, and CPK benchmarks by tort type with criteria-adjusted CPA estimator.",
};

/* ── Helpers ────────────────────────────────────────────────────────────── */

function fmtCurrency(val: number | null): string {
  if (val == null) return "—";
  return `$${val.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtRange(low: number | null, high: number | null): string {
  if (low == null && high == null) return "—";
  if (low != null && high != null && low === high) return fmtCurrency(low);
  return `${fmtCurrency(low)} – ${fmtCurrency(high)}`;
}

function fmtPct(val: number | null): string {
  if (val == null) return "—";
  return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}%`;
}

const PHASE_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  emerging:  { label: "Emerging",  color: "#10B981", bg: "#ECFDF5" },
  buzzy:     { label: "Buzzy",     color: "#F59E0B", bg: "#FFFBEB" },
  mdl_stage: { label: "MDL Stage", color: "#2563EB", bg: "#EFF6FF" },
  late:      { label: "Late",      color: "#EF4444", bg: "#FEF2F2" },
  closed:    { label: "Closed",    color: "#6B7280", bg: "#F9FAFB" },
};

/* ── Page ───────────────────────────────────────────────────────────────── */

export default async function CostBenchmarksPage() {
  const [benchmarks, lifecycleRanges] = await Promise.all([
    getTortCostBenchmarks(),
    getLifecycleCpaRanges(),
  ]);

  // De-dupe: show the most recent entry per tort
  const latestByTort = new Map<string, TortCostBenchmark>();
  for (const b of benchmarks) {
    const key = b.tort_name;
    const existing = latestByTort.get(key);
    if (!existing || b.observed_date > existing.observed_date) {
      latestByTort.set(key, b);
    }
  }

  const sortedBenchmarks = Array.from(latestByTort.values()).sort((a, b) =>
    (a.cpa_low ?? Infinity) - (b.cpa_low ?? Infinity)
  );

  const tortNames = sortedBenchmarks.map((b) => b.tort_name);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/advertising/channel-planner"
          className="text-sm text-slate-gray hover:text-midnight-navy"
        >
          ← Channel Planner
        </Link>
        <h1 className="mt-2 font-heading text-3xl font-bold text-midnight-navy">
          Mass Tort Cost Benchmarks
        </h1>
        <p className="mt-1 text-slate-gray">
          Industry-sourced CPL, CPA, and conversion data by tort. Updated from
          vendor pricing sheets and marketing agencies.
        </p>
      </div>

      {/* Intelligence callout */}
      <AdvertisingInsight>
        <p className="font-semibold mb-1">Why These Numbers Vary</p>
        <p>
          The same tort can show a 3–5x CPA spread depending on three factors:{" "}
          <span className="font-medium">criteria breadth</span> (broad &quot;used product&quot; vs.
          narrow &quot;specific injury + surgery&quot;),{" "}
          <span className="font-medium">geographic scope</span> (national vs. 4-state),
          and <span className="font-medium">lifecycle phase</span> (emerging vs. late-stage
          saturation). Use the CPA Estimator below to model these adjustments.
        </p>
      </AdvertisingInsight>

      {/* Lifecycle Phase Reference */}
      {lifecycleRanges.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-4">
            CPA by Lifecycle Phase
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {lifecycleRanges
              .filter((r) => r.lifecycle_phase !== "closed")
              .map((r) => {
                const style = PHASE_STYLE[r.lifecycle_phase];
                return (
                  <div
                    key={r.lifecycle_phase}
                    className="rounded-lg p-4"
                    style={{ backgroundColor: style?.bg ?? "#F9FAFB" }}
                  >
                    <p
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: style?.color ?? "#6B7280" }}
                    >
                      {style?.label ?? r.label}
                    </p>
                    <p className="mt-1 text-lg font-bold text-midnight-navy">
                      {fmtRange(r.cpa_low, r.cpa_high)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-gray">{r.description}</p>
                  </div>
                );
              })}
          </div>
          <p className="mt-3 text-xs text-slate-gray">
            Source:{" "}
            <a
              href="https://blueskylegal.com/how-to-estimate-cpa-in-mass-tort-population-filters-competition-and-channel-strategy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-intelligence-teal hover:underline"
            >
              Blue Sky Legal ↗
            </a>
          </p>
        </div>
      )}

      {/* CPA Estimator Widget (client component) */}
      <CpaEstimatorWidget tortNames={tortNames} />

      {/* Master Benchmark Table */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            All Tort Benchmarks
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cloud">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Tort
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  Phase
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  CPL
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  CPA (Retainer)
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  CPK
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  Conv. %
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                  Attrition
                </th>
                <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                  Settlement
                </th>
                <th className="py-3 pl-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                  Source
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedBenchmarks.map((b, i) => {
                const phase = b.lifecycle_phase ? PHASE_STYLE[b.lifecycle_phase] : null;
                return (
                  <tr
                    key={`${b.tort_name}-${i}`}
                    className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                  >
                    <td className="py-3 pr-4 font-medium text-midnight-navy whitespace-nowrap">
                      {b.tort_name}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {phase ? (
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: phase.bg, color: phase.color }}
                        >
                          {phase.label}
                        </span>
                      ) : (
                        <span className="text-slate-gray">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sm text-midnight-navy">
                      {fmtRange(b.cpl_low, b.cpl_high)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sm font-semibold text-midnight-navy">
                      {fmtRange(b.cpa_low, b.cpa_high)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sm text-midnight-navy">
                      {fmtRange(b.cpk_low, b.cpk_high)}
                    </td>
                    <td className="py-3 px-3 text-center text-sm text-midnight-navy">
                      {fmtPct(b.lead_to_retainer_pct)}
                    </td>
                    <td className="py-3 px-3 text-center text-sm text-midnight-navy">
                      {fmtPct(b.attrition_pct)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-sm text-midnight-navy">
                      {fmtRange(b.settlement_low ?? null, b.settlement_high ?? null)}
                    </td>
                    <td className="py-3 pl-3 text-xs text-slate-gray whitespace-nowrap">
                      {b.source_url ? (
                        <a
                          href={b.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-intelligence-teal hover:underline"
                        >
                          {b.source_name ?? "Link"}{" "}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        b.source_name ?? "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-slate-gray">
          Showing most recent benchmark per tort. Historical snapshots are stored
          for trend analysis. Vendor averages reflect blended criteria.
        </p>
      </div>

      {/* Methodology */}
      <MethodologySources
        sections={[
          {
            title: "Data Sources",
            content: "Cost benchmarks are aggregated from public vendor pricing, marketing agency reports, and industry publications.",
            bullets: [
              "Whitehardt (whitehardt.com/national/) — CPQL, media CPA, and CPK with contract services across 20+ torts. Updated monthly.",
              "Lawsuit Information Center (lawsuit-information-center.com) — CPL and signed retainer pricing from vendor emails. Updated quarterly.",
              "Blue Sky Legal (blueskylegal.com) — Lifecycle phase CPA ranges and criteria impact analysis.",
              "Taqtics (taqtics.com) — CPA, attrition, and settlement benchmarks for emerging torts.",
            ],
          },
          {
            title: "CPA Estimator Methodology",
            content: "The CPA estimator applies multipliers to base benchmark data. Criteria breadth (broad/medium/narrow) adjusts for qualification rate impact on CPA. Geographic scope (national/regional/state-limited) adjusts for reduced ad inventory and higher competition in constrained geographies.",
          },
        ]}
        limitations={[
          "Benchmark data is self-reported by vendors and marketing agencies — actual costs may vary.",
          "CPA ranges reflect blended criteria tiers unless specified. Narrow criteria can push CPA 2-3x above listed ranges.",
          "Data freshness varies by source. The observed_date field indicates when each benchmark was captured.",
        ]}
        dataNotice="Cost benchmarks are intended for planning and modeling purposes. Actual campaign costs depend on specific intake criteria, geographic targeting, competitive dynamics, and media buying efficiency."
      />
    </div>
  );
}
