"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  Megaphone,
  Users,
  DollarSign,
  Activity,
  ChevronDown,
  X,
} from "lucide-react";

/* ── Constants ─────────────────────────────────────────────────────────── */

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
  "VT","VA","WA","WV","WI","WY",
];

const STATE_NAMES: Record<string, string> = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",
  CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",
  FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",
  IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",
  MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",
  MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",
  NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",
  OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",
  SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",
  VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",
  WY:"Wyoming",
};

const PHASE_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  emerging:  { label: "Emerging",  color: "#10B981", bg: "#ECFDF5" },
  buzzy:     { label: "Buzzy",     color: "#F59E0B", bg: "#FFFBEB" },
  mdl_stage: { label: "MDL Stage", color: "#2563EB", bg: "#EFF6FF" },
  late:      { label: "Late",      color: "#EF4444", bg: "#FEF2F2" },
};

const OPPORTUNITY_STYLE: Record<string, { color: string; bg: string }> = {
  high:     { color: "#10B981", bg: "#ECFDF5" },
  moderate: { color: "#F59E0B", bg: "#FFFBEB" },
  low:      { color: "#EF4444", bg: "#FEF2F2" },
};

/* ── Types ──────────────────────────────────────────────────────────────── */

interface CampaignPlan {
  tort_overview: {
    tort_name: string;
    lifecycle_phase: string;
    cpl_range: { low: number | null; high: number | null };
    cpa_range: { low: number | null; high: number | null };
    cpk_range: { low: number | null; high: number | null };
    lead_to_retainer_pct: number | null;
    latest_mdl: { title: string; date: string; summary: string | null } | null;
    trend_direction: "up" | "down" | "flat";
  };
  geo_recommendations: {
    state: string;
    population: number;
    incidence: number;
    saturation_score: number;
    opportunity_score: number;
    opportunity_level: "high" | "moderate" | "low";
  }[];
  relevant_dmas: { name: string; population: number }[];
  channel_mix: {
    primary: {
      channel: string;
      role: string;
      cost_pressure: string;
      competition_score: number | null;
      allocation_pct: number;
      recommendation: string;
    }[];
    secondary: {
      channel: string;
      role: string;
      cost_pressure: string;
      competition_score: number | null;
      allocation_pct: number;
      recommendation: string;
    }[];
    situational: {
      channel: string;
      role: string;
      cost_pressure: string;
      allocation_pct: number;
    }[];
    lifecycle_note: string;
  };
  audience_targeting: {
    age_bands: Record<string, number> | null;
    meta_targeting: {
      age_ranges: string[];
      interests: string[];
      demographics: string;
    };
    google_targeting: {
      keyword_themes: string[];
      audience_segments: string[];
    };
    state_specific_notes: string;
  };
  budget_projection: {
    monthly_budget: number;
    avg_cpl: number;
    expected_leads_per_month: number;
    lead_to_retainer_pct: number;
    expected_retainers_per_month: number;
    cost_per_kept_case: number | null;
    channel_split: {
      core: { label: string; amount: number; pct: number };
      secondary: { label: string; amount: number; pct: number };
      situational: { label: string; amount: number; pct: number };
    };
  } | null;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function fmtCurrency(val: number | null): string {
  if (val == null) return "\u2014";
  return `$${val.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtRange(low: number | null, high: number | null): string {
  if (low == null && high == null) return "\u2014";
  if (low != null && high != null && low === high) return fmtCurrency(low);
  return `${fmtCurrency(low)} \u2013 ${fmtCurrency(high)}`;
}

function fmtNumber(val: number): string {
  return val.toLocaleString("en-US");
}

function fmtPct(val: number | null): string {
  if (val == null) return "\u2014";
  return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}%`;
}

function channelLabel(ch: string): string {
  return ch
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace("Ctv ", "CTV ")
    .replace("Tv ", "TV ");
}

/* ── Component ──────────────────────────────────────────────────────────── */

export function CampaignBuilderClient() {
  const tenant = useTenant();
  const accentColor = tenant.accentColor ?? "#1A8C96";

  // Form state
  const [tortNames, setTortNames] = useState<string[]>([]);
  const [selectedTort, setSelectedTort] = useState("");
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState("");

  // Results
  const [plan, setPlan] = useState<CampaignPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch tort names on mount
  useEffect(() => {
    async function fetchTorts() {
      const supabase = createClient();
      const { data } = await (supabase as any)
        .from("tort_cost_benchmarks")
        .select("tort_name");
      if (data) {
        const unique = [...new Set((data as Record<string, unknown>[]).map((d) => d.tort_name as string))].sort();
        setTortNames(unique);
      }
    }
    fetchTorts();
  }, []);

  const filteredStates = useMemo(() => {
    if (!stateSearch) return US_STATES;
    const q = stateSearch.toLowerCase();
    return US_STATES.filter(
      (s) =>
        s.toLowerCase().includes(q) ||
        STATE_NAMES[s]?.toLowerCase().includes(q),
    );
  }, [stateSearch]);

  function toggleState(state: string) {
    setSelectedStates((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state],
    );
  }

  async function generatePlan() {
    if (!selectedTort || selectedStates.length === 0) return;
    setLoading(true);
    setError(null);
    setPlan(null);

    try {
      const res = await fetch("/api/campaigns/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tort_name: selectedTort,
          states: selectedStates,
          monthly_budget: monthlyBudget ? Number(monthlyBudget) : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }

      const data: CampaignPlan = await res.json();
      setPlan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  }

  const canGenerate = selectedTort && selectedStates.length > 0 && !loading;

  return (
    <div className="space-y-6">
      {/* Input Panel */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-midnight-navy mb-4">
          Configure Your Campaign
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Tort Dropdown */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1.5">
              Tort
            </label>
            <select
              value={selectedTort}
              onChange={(e) => setSelectedTort(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-midnight-navy focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
            >
              <option value="">Select a tort...</option>
              {tortNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* State Multi-select */}
          <div className="relative">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1.5">
              Target States
            </label>
            <button
              type="button"
              onClick={() => setStateDropdownOpen(!stateDropdownOpen)}
              className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-left focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
            >
              <span className={selectedStates.length > 0 ? "text-midnight-navy" : "text-slate-gray"}>
                {selectedStates.length > 0
                  ? `${selectedStates.length} state${selectedStates.length > 1 ? "s" : ""} selected`
                  : "Select states..."}
              </span>
              <ChevronDown className="h-4 w-4 text-slate-gray" />
            </button>

            {stateDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setStateDropdownOpen(false)}
                />
                <div className="absolute left-0 top-full z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                  <div className="sticky top-0 bg-white border-b border-slate-100 p-2">
                    <input
                      type="text"
                      value={stateSearch}
                      onChange={(e) => setStateSearch(e.target.value)}
                      placeholder="Search states..."
                      className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm focus:border-intelligence-teal focus:outline-none"
                      autoFocus
                    />
                  </div>
                  {filteredStates.map((state) => (
                    <button
                      key={state}
                      type="button"
                      onClick={() => toggleState(state)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-cloud/60 transition-colors ${
                        selectedStates.includes(state) ? "bg-intelligence-teal/5 text-intelligence-teal font-medium" : "text-midnight-navy"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border text-xs ${
                          selectedStates.includes(state)
                            ? "border-intelligence-teal bg-intelligence-teal text-white"
                            : "border-slate-300"
                        }`}
                      >
                        {selectedStates.includes(state) && "\u2713"}
                      </span>
                      {state} — {STATE_NAMES[state]}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Selected state pills */}
            {selectedStates.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedStates.map((state) => (
                  <span
                    key={state}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                  >
                    {state}
                    <button
                      type="button"
                      onClick={() => toggleState(state)}
                      className="hover:opacity-70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Monthly Budget */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1.5">
              Monthly Budget (optional)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-gray">
                $
              </span>
              <input
                type="number"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                placeholder="50,000"
                min="0"
                className="w-full rounded-md border border-slate-200 bg-white pl-7 pr-3 py-2.5 text-sm text-midnight-navy focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
              />
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex items-end">
            <button
              onClick={generatePlan}
              disabled={!canGenerate}
              className={`w-full rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
                canGenerate ? "" : "bg-slate-300 cursor-not-allowed"
              }`}
              style={canGenerate ? { backgroundColor: accentColor } : undefined}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </span>
              ) : (
                "Generate Campaign Plan"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-alert/20 bg-alert/5 p-4 text-sm text-alert">
          {error}
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`rounded-lg bg-white p-6 shadow-sm ${i === 2 || i === 5 ? "md:col-span-2" : ""}`}
            >
              <div className="animate-pulse space-y-3">
                <div className="h-5 w-1/3 rounded bg-slate-200" />
                <div className="h-4 w-full rounded bg-slate-100" />
                <div className="h-4 w-2/3 rounded bg-slate-100" />
                <div className="h-4 w-1/2 rounded bg-slate-100" />
                <div className="h-20 w-full rounded bg-slate-50" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {plan && !loading && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Card 1: Tort Intelligence */}
            <TortIntelligenceCard overview={plan.tort_overview} accentColor={accentColor} />

            {/* Card 2: Geographic Targeting — full width */}
            <div className="md:col-span-2">
              <GeoTargetingCard
                geoRecs={plan.geo_recommendations}
                dmas={plan.relevant_dmas}
                accentColor={accentColor}
              />
            </div>

            {/* Card 3: Channel Strategy */}
            <ChannelStrategyCard mix={plan.channel_mix} accentColor={accentColor} />

            {/* Card 4: Audience Blueprint */}
            <AudienceBlueprintCard targeting={plan.audience_targeting} accentColor={accentColor} />

            {/* Card 5: Budget Projection — full width, conditional */}
            {plan.budget_projection && (
              <div className="md:col-span-2">
                <BudgetProjectionCard projection={plan.budget_projection} accentColor={accentColor} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Card Components ────────────────────────────────────────────────────── */

function TortIntelligenceCard({
  overview,
  accentColor,
}: {
  overview: CampaignPlan["tort_overview"];
  accentColor: string;
}) {
  const phase = PHASE_STYLE[overview.lifecycle_phase];
  const TrendIcon =
    overview.trend_direction === "up"
      ? TrendingUp
      : overview.trend_direction === "down"
        ? TrendingDown
        : Minus;
  const trendColor =
    overview.trend_direction === "up"
      ? "#10B981"
      : overview.trend_direction === "down"
        ? "#EF4444"
        : "#6B7280";

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5" style={{ color: accentColor }} />
        <h3 className="font-heading text-lg font-semibold text-midnight-navy">
          Tort Intelligence
        </h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-midnight-navy">{overview.tort_name}</span>
          {phase && (
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide"
              style={{ backgroundColor: phase.bg, color: phase.color }}
            >
              {phase.label}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs" style={{ color: trendColor }}>
            <TrendIcon className="h-3.5 w-3.5" />
            {overview.trend_direction === "up" ? "Rising" : overview.trend_direction === "down" ? "Declining" : "Stable"} interest
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-cloud p-3">
            <p className="text-xs text-slate-gray uppercase tracking-wider">CPL Range</p>
            <p className="mt-1 text-sm font-semibold font-mono text-midnight-navy">
              {fmtRange(overview.cpl_range.low, overview.cpl_range.high)}
            </p>
          </div>
          <div className="rounded-md bg-cloud p-3">
            <p className="text-xs text-slate-gray uppercase tracking-wider">CPA Range</p>
            <p className="mt-1 text-sm font-semibold font-mono text-midnight-navy">
              {fmtRange(overview.cpa_range.low, overview.cpa_range.high)}
            </p>
          </div>
          <div className="rounded-md bg-cloud p-3">
            <p className="text-xs text-slate-gray uppercase tracking-wider">CPK Range</p>
            <p className="mt-1 text-sm font-semibold font-mono text-midnight-navy">
              {fmtRange(overview.cpk_range.low, overview.cpk_range.high)}
            </p>
          </div>
          <div className="rounded-md bg-cloud p-3">
            <p className="text-xs text-slate-gray uppercase tracking-wider">Lead → Retainer</p>
            <p className="mt-1 text-sm font-semibold font-mono text-midnight-navy">
              {fmtPct(overview.lead_to_retainer_pct)}
            </p>
          </div>
        </div>

        {overview.latest_mdl && (
          <div className="rounded-md border border-slate-100 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1">
              Latest MDL Development
            </p>
            <p className="text-sm font-medium text-midnight-navy">{overview.latest_mdl.title}</p>
            {overview.latest_mdl.summary && (
              <p className="mt-1 text-xs text-slate-gray">{overview.latest_mdl.summary}</p>
            )}
            <p className="mt-1 text-xs text-slate-gray">
              {new Date(overview.latest_mdl.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function GeoTargetingCard({
  geoRecs,
  dmas,
  accentColor,
}: {
  geoRecs: CampaignPlan["geo_recommendations"];
  dmas: CampaignPlan["relevant_dmas"];
  accentColor: string;
}) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="h-5 w-5" style={{ color: accentColor }} />
        <h3 className="font-heading text-lg font-semibold text-midnight-navy">
          Geographic Targeting
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-cloud">
              <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-gray">
                State
              </th>
              <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                Population
              </th>
              <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-right">
                Incidence
              </th>
              <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                Saturation
              </th>
              <th className="py-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray text-center">
                Opportunity
              </th>
            </tr>
          </thead>
          <tbody>
            {geoRecs.map((rec) => {
              const style = OPPORTUNITY_STYLE[rec.opportunity_level];
              return (
                <tr
                  key={rec.state}
                  className="border-b border-cloud/50 hover:bg-cloud/40 transition-colors"
                >
                  <td className="py-3 pr-4 font-medium text-midnight-navy">
                    {rec.state} — {STATE_NAMES[rec.state] ?? rec.state}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-midnight-navy">
                    {fmtNumber(rec.population)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-midnight-navy">
                    {fmtNumber(rec.incidence)}
                  </td>
                  <td className="py-3 px-3 text-center text-sm text-midnight-navy">
                    {rec.saturation_score}/100
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase"
                      style={{ backgroundColor: style?.bg, color: style?.color }}
                    >
                      {rec.opportunity_level} ({rec.opportunity_score})
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {dmas.length > 0 && (
        <div className="mt-4 rounded-md bg-cloud p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
            Recommended DMAs
          </p>
          <div className="flex flex-wrap gap-2">
            {dmas.map((dma, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
              >
                <MapPin className="h-3 w-3" />
                {dma.name}
                {dma.population ? ` (${fmtNumber(dma.population)} pop.)` : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChannelStrategyCard({
  mix,
  accentColor,
}: {
  mix: CampaignPlan["channel_mix"];
  accentColor: string;
}) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Megaphone className="h-5 w-5" style={{ color: accentColor }} />
        <h3 className="font-heading text-lg font-semibold text-midnight-navy">
          Channel Strategy
        </h3>
      </div>

      <p className="text-xs text-slate-gray mb-4 italic">{mix.lifecycle_note}</p>

      {/* Budget allocation bar */}
      <div className="mb-4">
        <div className="flex h-3 rounded-full overflow-hidden">
          <div className="bg-intelligence-teal" style={{ width: "50%" }} title="Core 50%" />
          <div className="bg-steel-blue" style={{ width: "30%" }} title="Secondary 30%" />
          <div className="bg-slate-gray" style={{ width: "20%" }} title="Situational 20%" />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-slate-gray">
          <span>Core (50%)</span>
          <span>Secondary (30%)</span>
          <span>Situational (20%)</span>
        </div>
      </div>

      {/* Primary channels */}
      {mix.primary.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-intelligence-teal mb-2">
            Primary Channels
          </p>
          <div className="space-y-2">
            {mix.primary.map((ch, i) => (
              <div key={i} className="flex items-center justify-between rounded-md bg-cloud p-2.5">
                <div>
                  <span className="text-sm font-medium text-midnight-navy">
                    {channelLabel(ch.channel)}
                  </span>
                  <span className="ml-2 text-xs text-slate-gray">{ch.role}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CostPressureBadge level={ch.cost_pressure} />
                  <span className="text-xs font-mono text-midnight-navy">
                    {ch.allocation_pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Secondary channels */}
      {mix.secondary.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-steel-blue mb-2">
            Secondary Channels
          </p>
          <div className="space-y-2">
            {mix.secondary.map((ch, i) => (
              <div key={i} className="flex items-center justify-between rounded-md bg-cloud p-2.5">
                <div>
                  <span className="text-sm font-medium text-midnight-navy">
                    {channelLabel(ch.channel)}
                  </span>
                  <span className="ml-2 text-xs text-slate-gray">{ch.role}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CostPressureBadge level={ch.cost_pressure} />
                  <span className="text-xs font-mono text-midnight-navy">
                    {ch.allocation_pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Situational channels */}
      {mix.situational.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
            Situational Channels
          </p>
          <div className="flex flex-wrap gap-1.5">
            {mix.situational.map((ch, i) => (
              <span
                key={i}
                className="rounded-full bg-cloud px-2.5 py-1 text-xs text-midnight-navy"
              >
                {channelLabel(ch.channel)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CostPressureBadge({ level }: { level: string }) {
  const colors: Record<string, { color: string; bg: string }> = {
    high:   { color: "#EF4444", bg: "#FEF2F2" },
    medium: { color: "#F59E0B", bg: "#FFFBEB" },
    low:    { color: "#10B981", bg: "#ECFDF5" },
  };
  const style = colors[level] ?? colors.medium;
  return (
    <span
      className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {level}
    </span>
  );
}

function AudienceBlueprintCard({
  targeting,
  accentColor,
}: {
  targeting: CampaignPlan["audience_targeting"];
  accentColor: string;
}) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5" style={{ color: accentColor }} />
        <h3 className="font-heading text-lg font-semibold text-midnight-navy">
          Audience Blueprint
        </h3>
      </div>

      <div className="space-y-4">
        {/* Age Ranges */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
            Age Targeting
          </p>
          <div className="flex flex-wrap gap-1.5">
            {targeting.meta_targeting.age_ranges.map((range, i) => (
              <span
                key={i}
                className="rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
              >
                {range}
              </span>
            ))}
          </div>
        </div>

        {/* Meta Targeting */}
        <div className="rounded-md bg-cloud p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
            Meta (Facebook/Instagram)
          </p>
          <p className="text-xs text-slate-gray mb-1">Interest targeting:</p>
          <div className="flex flex-wrap gap-1">
            {targeting.meta_targeting.interests.map((interest, i) => (
              <span key={i} className="rounded bg-white px-2 py-0.5 text-xs text-midnight-navy border border-slate-100">
                {interest}
              </span>
            ))}
          </div>
        </div>

        {/* Google Targeting */}
        <div className="rounded-md bg-cloud p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-2">
            Google Ads
          </p>
          <p className="text-xs text-slate-gray mb-1">Keyword themes:</p>
          <div className="flex flex-wrap gap-1 mb-2">
            {targeting.google_targeting.keyword_themes.map((kw, i) => (
              <span key={i} className="rounded bg-white px-2 py-0.5 text-xs font-mono text-midnight-navy border border-slate-100">
                {kw}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-gray mb-1">Audience segments:</p>
          <div className="flex flex-wrap gap-1">
            {targeting.google_targeting.audience_segments.map((seg, i) => (
              <span key={i} className="rounded bg-white px-2 py-0.5 text-xs text-midnight-navy border border-slate-100">
                {seg}
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-gray italic">{targeting.state_specific_notes}</p>
      </div>
    </div>
  );
}

function BudgetProjectionCard({
  projection,
  accentColor,
}: {
  projection: NonNullable<CampaignPlan["budget_projection"]>;
  accentColor: string;
}) {
  const splits = [projection.channel_split.core, projection.channel_split.secondary, projection.channel_split.situational];
  const maxAmount = Math.max(...splits.map((s) => s.amount));

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="h-5 w-5" style={{ color: accentColor }} />
        <h3 className="font-heading text-lg font-semibold text-midnight-navy">
          Budget Projection
        </h3>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-cloud p-3">
            <p className="text-xs text-slate-gray uppercase tracking-wider">Monthly Budget</p>
            <p className="mt-1 text-lg font-bold font-mono text-midnight-navy">
              {fmtCurrency(projection.monthly_budget)}
            </p>
          </div>
          <div className="rounded-md bg-cloud p-3">
            <p className="text-xs text-slate-gray uppercase tracking-wider">Avg CPL</p>
            <p className="mt-1 text-lg font-bold font-mono text-midnight-navy">
              {fmtCurrency(projection.avg_cpl)}
            </p>
          </div>
          <div className="rounded-md p-3" style={{ backgroundColor: `${accentColor}10` }}>
            <p className="text-xs uppercase tracking-wider" style={{ color: accentColor }}>
              Expected Leads/mo
            </p>
            <p className="mt-1 text-lg font-bold font-mono text-midnight-navy">
              {fmtNumber(projection.expected_leads_per_month)}
            </p>
          </div>
          <div className="rounded-md p-3" style={{ backgroundColor: `${accentColor}10` }}>
            <p className="text-xs uppercase tracking-wider" style={{ color: accentColor }}>
              Expected Retainers/mo
            </p>
            <p className="mt-1 text-lg font-bold font-mono text-midnight-navy">
              {fmtNumber(projection.expected_retainers_per_month)}
            </p>
          </div>
          {projection.cost_per_kept_case && (
            <div className="col-span-2 rounded-md bg-cloud p-3">
              <p className="text-xs text-slate-gray uppercase tracking-wider">Cost Per Kept Case</p>
              <p className="mt-1 text-lg font-bold font-mono text-midnight-navy">
                {fmtCurrency(projection.cost_per_kept_case)}
              </p>
            </div>
          )}
        </div>

        {/* Channel Split Bar Chart */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-3">
            Monthly Channel Split
          </p>
          <div className="space-y-3">
            {splits.map((split, i) => {
              const barColors = ["#1A8C96", "#2E5077", "#6B7280"];
              const widthPct = maxAmount > 0 ? (split.amount / maxAmount) * 100 : 0;
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-midnight-navy font-medium">
                      {split.label} ({split.pct}%)
                    </span>
                    <span className="font-mono text-midnight-navy font-semibold">
                      {fmtCurrency(split.amount)}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-cloud overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: barColors[i],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-slate-gray">
            Conv. rate: {fmtPct(projection.lead_to_retainer_pct)} lead-to-retainer
          </p>
        </div>
      </div>
    </div>
  );
}
