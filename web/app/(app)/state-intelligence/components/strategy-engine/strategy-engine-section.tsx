"use client";

import { useMemo, useState } from "react";
import { Compass, AlertTriangle } from "lucide-react";
import { SectionHeading } from "@/components/state-intelligence/SectionHeading";
import { detectGorilla, scoreArchetypes, topPlayable } from "@/lib/strategy-engine/archetypes";
import type {
  ArchetypeKey,
  Cadence,
  FunnelEmphasis,
  GeneratedStrategy,
  StrategyInputs,
  Voice,
} from "@/lib/strategy-engine/types";
import { ArchetypeCard } from "./archetype-card";
import { PositioningInputsPanel } from "./positioning-inputs-panel";
import { StrategyResult } from "./strategy-result";

/** Deterministic one-line market read, shown above the cards before any generation. */
function marketRead(inputs: StrategyInputs, gorillaName: string | null): string {
  if (gorillaName) {
    return `${gorillaName} dominates ${inputs.state_name} PI advertising. These strategies are built to win cases by differentiating, not by matching that budget.`;
  }
  if (inputs.saturation != null && inputs.saturation >= 0.6) {
    return `${inputs.state_name} PI advertising is crowded. The edge here is a sharper niche or audience, not louder spend.`;
  }
  if (inputs.saturation != null && inputs.saturation < 0.35) {
    return `${inputs.state_name} PI advertising is relatively open — there's room to claim share of voice against the field.`;
  }
  return `Pick the approach that fits your budget and goal. Each is scored against live ${inputs.state_name} market data.`;
}

export function StrategyEngineSection({
  n,
  inputs,
}: {
  n: number;
  inputs: StrategyInputs | null;
}) {
  const scored = useMemo(() => (inputs ? scoreArchetypes(inputs) : []), [inputs]);
  const gorilla = useMemo(
    () => (inputs ? detectGorilla(inputs.top_advertisers) : null),
    [inputs],
  );

  const defaultKey = useMemo(() => topPlayable(scored)?.key ?? null, [scored]);

  const [selectedKey, setSelectedKey] = useState<ArchetypeKey | null>(null);
  const [cadence, setCadence] = useState<Cadence>("always_on");
  const [funnel, setFunnel] = useState<FunnelEmphasis>("conversion_led");
  const [voice, setVoice] = useState<Voice>("firm");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedStrategy | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = scored.find((a) => a.key === selectedKey) ?? null;

  function selectArchetype(key: ArchetypeKey) {
    const a = scored.find((x) => x.key === key);
    if (!a || a.locked_out) return;
    setSelectedKey(key);
    setCadence(a.recommended_cadence);
    setFunnel(a.recommended_funnel);
    setResult(null);
    setError(null);
  }

  async function handleGenerate() {
    if (!selected || !inputs) return;
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/state-intelligence/strategy-engine/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: inputs.state_abbr,
          archetype: selected.key,
          cadence,
          funnel,
          voice,
          tort_slug: inputs.tort_slug,
          tort_label: inputs.tort_label,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          (json as { error?: string } | null)?.error ?? `Generation failed (${res.status})`,
        );
      }
      setResult(json as GeneratedStrategy);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div id="strategy" className="scroll-mt-20">
      <SectionHeading n={n} title="Strategy Engine" />

      <div className="rounded-xl border border-cloud bg-white p-6 shadow-sm">
        <div className="flex items-start gap-2">
          <Compass className="mt-0.5 h-5 w-5 flex-none text-intelligence-teal" />
          <div>
            <h3 className="font-heading text-xl font-bold text-midnight-navy">
              Turn this market read into a media plan
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-gray">
              Three data-backed approaches, scored against Alabama&apos;s competitive whitespace,
              audience fit, and crash signal. Pick one, tune it, and generate a 90-day strategy that
              ends in named outlets and a first call — downloadable as a deck.
            </p>
          </div>
        </div>

        {!inputs || scored.length === 0 ? (
          <div className="mt-5 flex items-start gap-2 rounded-xl bg-cloud/40 p-4 text-sm text-slate-gray">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-500" />
            <span>
              Market data for the strategy engine isn&apos;t available right now. Refresh the page,
              or check back once the latest ad-activity sync completes.
            </span>
          </div>
        ) : (
          <>
            {/* Deterministic market read */}
            <div className="mt-5 rounded-xl bg-midnight-navy p-5 text-white">
              <p className="text-[13.5px] leading-relaxed">
                {marketRead(inputs, gorilla?.present ? gorilla.name : null)}
              </p>
            </div>

            {/* Archetype cards */}
            <div className="mt-5 grid gap-3.5 lg:grid-cols-3">
              {scored.map((a) => (
                <ArchetypeCard
                  key={a.key}
                  archetype={a}
                  selected={a.key === selectedKey}
                  onSelect={() => selectArchetype(a.key)}
                />
              ))}
            </div>

            {!selectedKey && (
              <p className="mt-3 text-[12.5px] text-slate-gray">
                {defaultKey
                  ? "Select an approach to tune the plan and generate a strategy."
                  : "No playable approach for this market yet."}
              </p>
            )}

            {/* Inputs panel */}
            {selected && (
              <PositioningInputsPanel
                archetype={selected}
                cadence={cadence}
                funnel={funnel}
                voice={voice}
                onCadence={setCadence}
                onFunnel={setFunnel}
                onVoice={setVoice}
                onGenerate={handleGenerate}
                generating={generating}
                hasResult={!!result}
              />
            )}

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-[12.5px] text-red-600">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                <span>{error}</span>
              </div>
            )}

            {/* Result */}
            {result && <StrategyResult strategy={result} />}
          </>
        )}
      </div>
    </div>
  );
}
