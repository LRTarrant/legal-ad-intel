"use client";

/**
 * Strategy Engine — interview + result (v1, PR 3a).
 *
 * One-screen interview (mostly pills) → POST /api/strategy/generate → a plain,
 * source-tagged readout of the returned Strategy object. The designed 12-slide
 * deck + white-label brand land in PR 3b; this proves the pipeline end-to-end
 * (the Montgomery FARS number must render live, not a placeholder).
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import StrategyDeck from "./strategy-deck";

type Voice = "firm" | "agency" | "seller";

interface DmaOption {
  dma_code: string;
  display_name: string;
}

const AUDIENCES: { key: Voice; label: string }[] = [
  { key: "agency", label: "Agency" },
  { key: "firm", label: "Law firm" },
  { key: "seller", label: "Media seller" },
];
const CASE_TYPES = ["trucking", "auto", "motorcycle", "nursing_home", "workers_comp", "boating"];
const BUDGET_TIERS = [
  { key: "under_25k", label: "Under $25K/mo" },
  { key: "25k_75k", label: "$25K–$75K/mo" },
  { key: "75k_plus", label: "$75K+/mo" },
];
const GOALS = ["More qualified signups", "Brand awareness", "Enter a new market", "Defend share"];
const CHANNELS = ["paid_search", "broadcast_tv", "billboards", "radio", "social", "ctv"];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

function pretty(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface StrategyClientProps {
  /** Pre-selected state (2-letter code), e.g. from a state-page CTA. Validated against US_STATES. */
  initialState?: string;
  /** Pre-selected case types, validated against CASE_TYPES. */
  initialCaseTypes?: string[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function StrategyClient({ initialState, initialCaseTypes }: StrategyClientProps = {}) {
  const seededState = initialState && US_STATES.includes(initialState) ? initialState : "AL";
  const seededCaseTypes = (initialCaseTypes ?? []).filter((c) => CASE_TYPES.includes(c));

  const [audience, setAudience] = useState<Voice>("agency");
  const [caseTypes, setCaseTypes] = useState<string[]>(
    seededCaseTypes.length > 0 ? seededCaseTypes : ["trucking"],
  );
  const [stateCode, setStateCode] = useState(seededState);
  const [dmaCode, setDmaCode] = useState<string>("");
  const [dmaOptions, setDmaOptions] = useState<DmaOption[]>([]);
  const [budgetTier, setBudgetTier] = useState("75k_plus");
  const [goal, setGoal] = useState(GOALS[0]);
  const [existingChannels, setExistingChannels] = useState<string[]>(["paid_search", "billboards"]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/dma-markets?state=${stateCode}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (active) setDmaOptions(Array.isArray(d) ? d : (d?.markets ?? []));
      })
      .catch(() => active && setDmaOptions([]));
    return () => {
      active = false;
    };
  }, [stateCode]);

  const toggle = (arr: string[], v: string, set: (a: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/strategy/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          case_types: caseTypes,
          state: stateCode,
          dma_code: dmaCode || null,
          county_fips: null,
          budget_tier: budgetTier,
          goal,
          existing_channels: existingChannels,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Generation failed");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [audience, caseTypes, stateCode, dmaCode, budgetTier, goal, existingChannels]);

  const Pill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition ${
        active ? "border-intelligence-teal bg-intelligence-teal/10 text-intelligence-teal" : "border-cloud text-slate-gray hover:border-slate-gray"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold text-midnight-navy">Strategy Engine</h1>
      <p className="mt-1 text-sm text-slate-gray">
        A defensible, data-traced media strategy for a market — every number carries its source.
      </p>

      {/* Interview */}
      <div className="mt-6 space-y-5 rounded-xl border border-cloud bg-white p-5">
        <Field label="Audience">
          <div className="flex flex-wrap gap-2">
            {AUDIENCES.map((a) => (
              <Pill key={a.key} active={audience === a.key} onClick={() => setAudience(a.key)}>{a.label}</Pill>
            ))}
          </div>
        </Field>
        <Field label="Case types">
          <div className="flex flex-wrap gap-2">
            {CASE_TYPES.map((c) => (
              <Pill key={c} active={caseTypes.includes(c)} onClick={() => toggle(caseTypes, c, setCaseTypes)}>{pretty(c)}</Pill>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="State">
            <select value={stateCode} onChange={(e) => setStateCode(e.target.value)} className="rounded-lg border border-cloud px-3 py-2 text-sm">
              {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Market (DMA)">
            <select value={dmaCode} onChange={(e) => setDmaCode(e.target.value)} className="rounded-lg border border-cloud px-3 py-2 text-sm">
              <option value="">All markets (statewide)</option>
              {dmaOptions.map((d) => <option key={d.dma_code} value={d.dma_code}>{d.display_name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Budget tier">
          <div className="flex flex-wrap gap-2">
            {BUDGET_TIERS.map((b) => (
              <Pill key={b.key} active={budgetTier === b.key} onClick={() => setBudgetTier(b.key)}>{b.label}</Pill>
            ))}
          </div>
        </Field>
        <Field label="Goal">
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => <Pill key={g} active={goal === g} onClick={() => setGoal(g)}>{g}</Pill>)}
          </div>
        </Field>
        <Field label="Existing channels">
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((c) => (
              <Pill key={c} active={existingChannels.includes(c)} onClick={() => toggle(existingChannels, c, setExistingChannels)}>{pretty(c)}</Pill>
            ))}
          </div>
        </Field>
        <button
          onClick={generate}
          disabled={loading || caseTypes.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-intelligence-teal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? "Building strategy…" : "Generate strategy"}
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>

      {result ? <StrategyDeck data={result} /> : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-gray">{label}</div>
      {children}
    </div>
  );
}
