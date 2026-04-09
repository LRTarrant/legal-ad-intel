import { getStateOpportunityScores } from "@/lib/queries";
import { OpportunityTable } from "./opportunity-table";
import { AdvertisingInsight } from "../components/advertising-insight";
import { Target } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Top Opportunity States | Legal Marketing Intelligence",
};

export default async function OpportunityPage() {
  const scores = await getStateOpportunityScores();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Target className="w-7 h-7 shrink-0" style={{ color: "#1A8C96" }} />
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-dm-sans)", color: "#0B1D3A" }}
          >
            Top Opportunity States
          </h1>
          <p className="text-sm" style={{ color: "#6B7280" }}>
            Combines PI viability, injury volume, and recent trend into a ranked acquisition
            opportunity score
          </p>
        </div>
      </div>

      {/* Methodology Card */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-3">
          Scoring Methodology
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-cloud p-4">
            <div className="text-xs font-bold uppercase text-intelligence-teal mb-1">
              PI Viability — 40%
            </div>
            <p className="text-sm text-slate-gray">
              Economic attractiveness — negligence rules, damage caps, verdict history
            </p>
          </div>
          <div className="rounded-lg bg-cloud p-4">
            <div className="text-xs font-bold uppercase text-intelligence-teal mb-1">
              Incident Volume — 35%
            </div>
            <p className="text-sm text-slate-gray">
              Total addressable market — log-normalized 5-year fatality + boating death counts
            </p>
          </div>
          <div className="rounded-lg bg-cloud p-4">
            <div className="text-xs font-bold uppercase text-intelligence-teal mb-1">
              Recent Trend — 25%
            </div>
            <p className="text-sm text-slate-gray">
              Timing signal — 2023 vs 2022 fatality trajectory
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-gray">
          Higher trend scores reflect rising incident volume expanding the claimant pool.
        </p>
      </div>

      {/* Top 3 highlight cards */}
      {scores.length >= 3 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {scores.slice(0, 3).map((s, i) => (
            <div
              key={s.state}
              className="bg-white rounded-lg shadow-sm p-4 border-t-4"
              style={{
                borderTopColor: i === 0 ? "#D97706" : i === 1 ? "#6B7280" : "#CD7F32",
              }}
            >
              <div className="text-xs font-medium mb-1" style={{ color: "#6B7280" }}>
                #{i + 1} Top Opportunity
              </div>
              <div
                className="text-xl font-bold"
                style={{ color: "#0B1D3A", fontFamily: "var(--font-dm-sans)" }}
              >
                {s.state}
              </div>
              <div className="text-2xl font-bold mt-1" style={{ color: "#1A8C96" }}>
                {s.opportunity_score}
              </div>
              <div className="text-xs mt-1" style={{ color: "#6B7280" }}>
                {s.total_incidents.toLocaleString()} incidents
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Marketing Insight */}
      <AdvertisingInsight>
        <p>
          <strong>Focus your budget where law and volume align.</strong> States with
          plaintiff-friendly negligence rules, no damage caps, and high injury volume represent the
          clearest case-acquisition opportunities. High opportunity scores indicate markets where
          advertising spend is backed by both legal economics and proven demand — the combination
          that produces the best cost-per-signed-case.
        </p>
      </AdvertisingInsight>

      {/* Sortable / filterable table */}
      <OpportunityTable scores={scores} />
    </div>
  );
}
