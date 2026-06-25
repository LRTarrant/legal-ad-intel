"use client";

import { MapPin, Phone, Radio, ArrowRight } from "lucide-react";
import type { ChipTone } from "@/components/state-intelligence/viability";
import { CHIP_TONES } from "@/components/state-intelligence/VerdictCard";
import {
  ARCHETYPE_LABELS,
  type FunnelStage,
  type GeneratedStrategy,
  type PlannedChannel,
} from "@/lib/strategy-engine/types";
import { DownloadDeckButton } from "./download-deck-button";

const STAGE_LABEL: Record<FunnelStage, string> = {
  awareness: "Awareness",
  consideration: "Consideration",
  conversion: "Conversion",
};

const CONFIDENCE_CHIP: Record<
  GeneratedStrategy["plan"]["confidence"],
  { label: string; tone: ChipTone }
> = {
  high: { label: "High confidence", tone: "good" },
  moderate: { label: "Moderate confidence", tone: "mid" },
  directional: { label: "Directional", tone: "info" },
};

function competitionLabel(c: number | null): string {
  if (c == null) return "competition n/a";
  if (c <= 0.35) return "light competition";
  if (c >= 0.65) return "heavy competition";
  return "moderate competition";
}

function ChannelRow({ channel }: { channel: PlannedChannel }) {
  return (
    <li className="border-t border-cloud pt-2.5 first:border-t-0 first:pt-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold text-midnight-navy">{channel.label}</span>
        <span className="font-mono text-[10.5px] text-slate-gray">
          fit {Math.round(channel.fit * 100)} · {competitionLabel(channel.competition)}
        </span>
      </div>
      {channel.outlets.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {channel.outlets.map((o) => (
            <span
              key={o.name}
              className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-midnight-navy ring-1 ring-cloud"
            >
              <Radio className="h-3 w-3 text-intelligence-teal" />
              {o.name}
              {o.format_genre ? (
                <span className="font-normal text-slate-gray">· {o.format_genre}</span>
              ) : null}
            </span>
          ))}
        </div>
      )}
      <p className="mt-1.5 text-[12px] leading-snug text-slate-gray">{channel.rationale}</p>
    </li>
  );
}

/**
 * The generated strategy, rendered in-page. The action stays inside the tool
 * (per the council): county→DMA translation as a feature, the funnel sequence
 * with named outlets, confidence tiers, and a concrete "first moves" close.
 */
export function StrategyResult({ strategy }: { strategy: GeneratedStrategy }) {
  const { plan, prose } = strategy;
  const stages: FunnelStage[] = ["awareness", "consideration", "conversion"];
  const conf = CONFIDENCE_CHIP[plan.confidence];
  const links = plan.channel_plan.county_dma_translation;

  return (
    <div className="mt-5 rounded-xl border border-cloud bg-white p-6 shadow-sm">
      {/* Header + market read */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-heading text-lg font-bold text-midnight-navy">
          {ARCHETYPE_LABELS[plan.archetype.key]} — {plan.state_name} {plan.tort_label}
        </h4>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${CHIP_TONES[conf.tone]}`}>
          {conf.label}
        </span>
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-charcoal">{prose.market_read}</p>
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-slate-gray">
        {prose.approach_rationale}
      </p>

      {/* County → DMA translation */}
      {links.length > 0 && (
        <div className="mt-5 rounded-xl bg-cloud/40 p-4">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-intelligence-teal" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-gray">
              Your counties → the markets that buy them
            </span>
          </div>
          <div className="mt-2.5 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {links.map((l) => (
              <div
                key={`${l.county_name}-${l.dma_name}`}
                className="flex items-center gap-2 text-[12.5px]"
              >
                <span className="font-semibold text-midnight-navy">{l.county_name} Co.</span>
                <ArrowRight className="h-3 w-3 text-slate-gray" />
                <span className="text-slate-gray">{l.dma_name} DMA</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11.5px] leading-snug text-slate-gray">
            Media is bought at the DMA level, so a county strategy runs through the market that
            covers it.
          </p>
        </div>
      )}

      {/* Funnel sequence */}
      <div className="mt-5">
        <p className="max-w-2xl text-[13px] leading-relaxed text-charcoal">
          {prose.channel_narrative}
        </p>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {stages.map((stage) => {
            const channels = plan.channel_plan.stages[stage];
            return (
              <div key={stage} className="rounded-xl bg-cloud/40 p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-intelligence-teal">
                  {STAGE_LABEL[stage]}
                </div>
                {channels.length > 0 ? (
                  <ul className="mt-2.5 space-y-2.5">
                    {channels.map((c) => (
                      <ChannelRow key={c.channel} channel={c} />
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2.5 text-[12px] text-slate-gray">
                    No clear channel edge at this stage yet.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* First moves + notes + download */}
      <div className="mt-5 border-t border-cloud pt-5">
        <h5 className="font-heading text-sm font-bold text-midnight-navy">Start here in 7 days</h5>
        <ol className="mt-2.5 space-y-2.5">
          {plan.first_moves.map((m, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-midnight-navy font-mono text-[11px] font-bold text-white">
                {i + 1}
              </span>
              <div>
                <div className="text-[13px] font-semibold text-midnight-navy">{m.action}</div>
                <div className="mt-0.5 flex items-start gap-1.5 text-[12px] leading-snug text-slate-gray">
                  <Phone className="mt-0.5 h-3 w-3 flex-none text-intelligence-teal" />
                  <span className="italic">&ldquo;{m.outreach_question}&rdquo;</span>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {prose.notes && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-[12px] leading-snug text-amber-700">
            {prose.notes}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <DownloadDeckButton strategy={strategy} />
          <span className="text-[11.5px] text-slate-gray">
            Relative indices and rates, not measured reach. Validate locally before a large buy.
          </span>
        </div>
      </div>
    </div>
  );
}
