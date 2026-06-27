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

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function StrategyClient() {
  const [audience, setAudience] = useState<Voice>("agency");
  const [caseTypes, setCaseTypes] = useState<string[]>(["trucking"]);
  const [stateCode, setStateCode] = useState("AL");
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

      {result ? <Result data={result} /> : null}
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

function depthBadge(depth: string) {
  const map: Record<string, string> = {
    strong: "bg-green-100 text-green-700",
    moderate: "bg-amber-100 text-amber-700",
    thin: "bg-slate-200 text-slate-600",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${map[depth] ?? ""}`}>{depth}</span>;
}

function Result({ data }: { data: any }) {
  const buildUrl = `/campaigns/builder?practice_area=personal_injury&state=${data.market.state}`;
  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-xl border border-cloud bg-white p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-intelligence-teal">Market</div>
        <h2 className="text-xl font-bold text-midnight-navy">{data.market.label} — {pretty(data.case_types.join(", "))}</h2>
        <p className="mt-1 text-sm text-slate-gray">{data.prose?.market_read}</p>
        <div className="mt-2 text-xs text-slate-gray">Confidence: {data.confidence} · Archetype-driven · est. cost {data.cost_cents != null ? `$${(data.cost_cents / 100).toFixed(2)}` : "—"}</div>
      </div>

      {/* Opportunity */}
      <Section title="Where to play (Opportunity)" tag={`FARS ${data.opportunity.fars_year_min}–${data.opportunity.fars_year_max} · Census`}>
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-cloud text-xs uppercase text-slate-gray">
            <th className="py-1.5">County</th><th>MSA</th><th className="text-right">Total fatal</th><th className="text-right">Truck</th><th className="text-right">Moto</th><th className="text-right">Pop</th><th className="text-right">Internet</th><th className="text-right">/100k</th>
          </tr></thead>
          <tbody>
            {data.opportunity.counties.slice(0, 10).map((c: any) => (
              <tr key={c.county_name} className="border-b border-cloud/50">
                <td className="py-1.5 font-medium text-midnight-navy">{c.county_name}</td>
                <td className="text-slate-gray">{c.cbsa_title ?? "—"}</td>
                <td className="text-right">{c.total_fatalities}</td>
                <td className="text-right font-semibold text-intelligence-teal">{c.truck_fatalities}</td>
                <td className="text-right">{c.motorcycle_fatalities}</td>
                <td className="text-right">{c.total_population?.toLocaleString() ?? "—"}</td>
                <td className="text-right">{c.pct_with_internet != null ? `${c.pct_with_internet}%` : "—"}</td>
                <td className="text-right">{c.deaths_per_100k ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Competitive */}
      <Section title="The competitive field" tag="pi_search · ad library">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-slate-gray">Top advertisers (by presence share)</div>
            <ul className="space-y-1 text-sm">
              {data.competitive.advertisers.slice(0, 6).map((a: any) => (
                <li key={a.name} className="flex justify-between"><span>{a.rank}. {a.name}</span><span className="text-slate-gray">{Math.round(a.share * 100)}%</span></li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-slate-gray">Channel white space</div>
            <ul className="space-y-1 text-sm">
              {data.competitive.channels.map((c: any) => (
                <li key={c.channel} className="flex justify-between">
                  <span>{c.label}{!c.measured ? " (modeled)" : ""}</span>
                  <span className={c.status === "open" ? "font-semibold text-intelligence-teal" : "text-slate-gray"}>{c.status} · {c.active_firms}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Recommendations */}
      <Section title={`The recommendations (${data.recommendations.length})`} tag="3-link because">
        <div className="space-y-4">
          {data.recommendations.map((r: any, i: number) => (
            <div key={i} className="rounded-lg border border-cloud p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-midnight-navy">{i + 1}. {r.headline}</div>
                {depthBadge(r.data_depth)}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {(["opportunity", "white_space", "fit"] as const).map((k) => (
                  <div key={k} className="rounded border border-cloud/70 bg-cloud/10 p-3">
                    <div className="text-[11px] font-semibold uppercase text-intelligence-teal">{k.replace("_", " ")}</div>
                    <div className="text-lg font-bold text-midnight-navy">{r[k].value}</div>
                    <div className="text-xs text-slate-gray">{r[k].text}</div>
                    <div className="mt-1 inline-block rounded bg-cloud px-1.5 py-0.5 text-[10px] uppercase text-slate-gray">{r[k].source}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-slate-gray">
                Buy: {r.buy.kind === "outlets" ? r.buy.outlets.map((o: any) => o.name).join(", ") : r.buy.target}
              </div>
            </div>
          ))}
          {data.watch_list.length > 0 ? (
            <div className="text-xs text-slate-gray">
              Watch / emerging: {data.watch_list.map((w: any) => `${w.channel} (${w.reason})`).join(" · ")}
            </div>
          ) : null}
        </div>
      </Section>

      {/* Integrated plan + handoff */}
      <Section title="Integrated plan" tag={`${data.integrated_plan.cadence} · ${data.integrated_plan.funnel_emphasis}`}>
        <ul className="space-y-1 text-sm">
          {data.integrated_plan.allocation.map((a: any) => (
            <li key={a.channel} className="flex justify-between"><span>{a.label} <span className="text-slate-gray">({a.stage})</span></span><span className="font-semibold">{a.pct}%</span></li>
          ))}
        </ul>
        <a href={buildUrl} className="mt-4 inline-block rounded-lg bg-midnight-navy px-4 py-2 text-sm font-semibold text-white">
          Continue in Campaign Builder →
        </a>
      </Section>
    </div>
  );
}

function Section({ title, tag, children }: { title: string; tag: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-cloud bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-bold text-midnight-navy">{title}</h3>
        <span className="rounded bg-cloud px-2 py-0.5 text-[11px] uppercase text-slate-gray">{tag}</span>
      </div>
      {children}
    </div>
  );
}
