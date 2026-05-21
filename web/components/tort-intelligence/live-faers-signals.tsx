"use client";

/**
 * Live FAERS Signals block for the tort pages.
 *
 * Renders three signals computed live from the ingested FAERS dataset:
 *   1. Drug-by-drug breakdown (events, top reactions, % serious outcomes)
 *   2. Reporting-source concentration vs. the dataset baseline
 *   3. Monthly trend per drug
 *
 * Presentational only - data is fetched server-side via getFaersSignals()
 * and passed in. Deliberately styled distinct from the static, paper-sourced
 * adverse-event cards on the page: a teal ring + tinted header + green
 * "LIVE DATA" pill mark this as live data.
 *
 * Signal 2 has two modes (see ConcentrationMode in faers-shared.ts):
 * "consumer" for pre-MDL torts (consumer-report share is a lawyer-flood
 * proxy) and "lawyer" for mature MDLs (plaintiff firms file reports
 * directly). The page picks the mode for its tort.
 */

import {
  Activity,
  Database,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip } from "recharts";
import type {
  ConcentrationMode,
  FaersDrugSignal,
  FaersSignals,
  FaersTrendDirection,
} from "@/lib/queries/faers-shared";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}

/** "2026-03-01" -> "Mar 2026". */
function fmtMonth(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

const DIRECTION_META: Record<
  FaersTrendDirection,
  { label: string; Icon: typeof TrendingUp; cls: string }
> = {
  accelerating: { label: "Accelerating", Icon: TrendingUp, cls: "text-amber-600" },
  declining: { label: "Declining", Icon: TrendingDown, cls: "text-slate-gray" },
  stable: { label: "Stable", Icon: Minus, cls: "text-slate-gray" },
  insufficient: { label: "Limited data", Icon: Minus, cls: "text-slate-gray" },
};

/** Per-mode copy for Signal 2. */
const MODE_META: Record<
  ConcentrationMode,
  { heading: string; rowLabel: string; blurb: (baseline: number) => string }
> = {
  consumer: {
    heading: "Consumer-report concentration",
    rowLabel: "consumer-reported",
    blurb: (b) =>
      `Share of each drug’s reports filed by consumers vs. the full-dataset ` +
      `baseline of ${b}% (vertical marker). Higher than baseline is consistent ` +
      `with active claimant intake. Preliminary signal.`,
  },
  lawyer: {
    heading: "Lawyer-filed report concentration",
    rowLabel: "lawyer-filed",
    blurb: (b) =>
      `Share of each drug’s reports filed by attorneys vs. the full-dataset ` +
      `baseline of ${b}% (vertical marker). A share far above baseline reflects ` +
      `direct plaintiff-firm reporting tied to active litigation. Preliminary signal.`,
  },
};

/* ------------------------------------------------------------------ */
/*  Trend tooltip                                                       */
/* ------------------------------------------------------------------ */

interface TrendTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { month: string; count: number } }>;
}

function TrendTooltip({ active, payload }: TrendTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border border-midnight-navy/10 bg-white px-2.5 py-1.5 shadow-md">
      <p className="text-[11px] font-semibold text-midnight-navy">
        {fmtMonth(point.month)}
      </p>
      <p className="text-[11px] text-slate-gray">
        {fmtNum(point.count)} {point.count === 1 ? "report" : "reports"}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Drug breakdown card (Signal 1)                                      */
/* ------------------------------------------------------------------ */

function DrugBreakdownCard({ drug }: { drug: FaersDrugSignal }) {
  if (drug.totalEvents === 0) {
    return (
      <div className="rounded-lg border border-midnight-navy/10 bg-cloud/40 p-4">
        <p className="text-sm font-semibold text-midnight-navy">{drug.brand}</p>
        <p className="mt-2 text-xs text-slate-gray">
          No qualifying events in the current dataset.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-midnight-navy/10 bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-midnight-navy">{drug.brand}</p>
        <p className="text-[11px] text-slate-gray">
          {fmtNum(drug.totalEvents)} events
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-center">
          <p className="text-lg font-bold text-midnight-navy">{drug.deathPct}%</p>
          <p className="text-[10px] font-medium text-midnight-navy/70">
            Serious &mdash; death
          </p>
        </div>
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-center">
          <p className="text-lg font-bold text-midnight-navy">
            {drug.hospitalizationPct}%
          </p>
          <p className="text-[10px] font-medium text-midnight-navy/70">
            Serious &mdash; hospitalized
          </p>
        </div>
      </div>

      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
        Top reactions
      </p>
      <ul className="mt-1 space-y-1">
        {drug.topReactions.map((r) => (
          <li
            key={r.pt}
            className="flex items-baseline justify-between gap-2 text-xs"
          >
            <span className="text-midnight-navy/80">{r.pt}</span>
            <span className="shrink-0 font-semibold text-midnight-navy">
              {fmtNum(r.count)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Concentration row (Signal 2)                                        */
/* ------------------------------------------------------------------ */

function ConcentrationRow({
  drug,
  baseline,
  mode,
}: {
  drug: FaersDrugSignal;
  baseline: number;
  mode: ConcentrationMode;
}) {
  if (drug.totalEvents === 0) return null;
  const value = mode === "lawyer" ? drug.lawyerPct : drug.consumerPct;
  const fill = Math.min(value, 100);
  const baselineLeft = Math.min(baseline, 100);
  const aboveBaseline = value > baseline;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold text-midnight-navy">{drug.brand}</span>
        <span className="text-slate-gray">
          <span
            className={
              aboveBaseline
                ? "font-semibold text-amber-600"
                : "font-semibold text-midnight-navy"
            }
          >
            {value}%
          </span>{" "}
          {MODE_META[mode].rowLabel}
        </span>
      </div>
      <div className="relative mt-1 h-3 rounded-full bg-cloud">
        <div
          className={`h-3 rounded-full ${
            aboveBaseline ? "bg-amber-500" : "bg-intelligence-teal"
          }`}
          style={{ width: `${fill}%` }}
        />
        {/* dataset baseline marker */}
        <div
          className="absolute top-[-3px] h-[18px] w-0.5 bg-midnight-navy/70"
          style={{ left: `${baselineLeft}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Trend card (Signal 3)                                               */
/* ------------------------------------------------------------------ */

function TrendCard({ drug }: { drug: FaersDrugSignal }) {
  const meta = DIRECTION_META[drug.trendDirection];
  return (
    <div className="rounded-lg border border-midnight-navy/10 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-midnight-navy">{drug.brand}</p>
        <span
          className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${meta.cls}`}
        >
          <meta.Icon className="h-3 w-3" />
          {meta.label}
        </span>
      </div>
      <div className="mt-2 h-16">
        {drug.trend.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={drug.trend}
              margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
            >
              <Tooltip
                content={<TrendTooltip />}
                cursor={{ fill: "rgba(20,184,166,0.08)" }}
              />
              <Bar dataKey="count" fill="#14B8A6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-[11px] text-slate-gray">No trend data</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main block                                                          */
/* ------------------------------------------------------------------ */

export interface LiveFaersSignalsProps {
  data: FaersSignals;
  /** Short injury phrase, e.g. "gastroparesis-spectrum" or "meningioma". */
  injuryLabel: string;
  /** One-line methodology footer shown under the concentration signal. */
  methodologyNote: string;
  /**
   * Which reporting-source share Signal 2 surfaces. "consumer" (default) for
   * pre-MDL torts, "lawyer" for mature MDLs. See ConcentrationMode.
   */
  concentrationMode?: ConcentrationMode;
}

export function LiveFaersSignals({
  data,
  injuryLabel,
  methodologyNote,
  concentrationMode = "consumer",
}: LiveFaersSignalsProps) {
  const activeDrugs = data.drugs.filter((d) => d.totalEvents > 0);
  // Single-brand torts (e.g. Depo-Provera) get a non-grid layout so the lone
  // card / chart is not stranded in a multi-column grid.
  const cardGridCls =
    data.drugs.length === 1
      ? "mt-3 grid grid-cols-1 gap-3"
      : "mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-intelligence-teal/30">
      {/* Tinted header strip - the live-data marker */}
      <div className="border-b border-intelligence-teal/20 bg-intelligence-teal/[0.07] px-6 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Activity className="h-4.5 w-4.5 text-intelligence-teal" />
          <h2 className="font-heading text-lg font-semibold text-midnight-navy">
            Live FAERS Signals
          </h2>
          <span className="flex items-center gap-1 rounded-full border border-success/30 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
            <Database className="h-3 w-3" /> Live Data
          </span>
          {data.dataCurrentThrough && (
            <span className="rounded-full border border-intelligence-teal/30 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-intelligence-teal">
              Data current through {data.dataCurrentThrough}
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-gray">
          Computed live from FDA FAERS adverse-event reports &mdash; distinct
          from the paper-sourced profile below.
        </p>
      </div>

      {!data.hasData ? (
        <div className="px-6 py-8">
          <p className="text-sm text-slate-gray">
            Live FAERS signals are temporarily unavailable. The paper-sourced
            adverse-event profile below remains current.
          </p>
        </div>
      ) : (
        <div className="space-y-8 px-6 py-6">
          {/* -- Signal 1: drug-by-drug breakdown -------------------------- */}
          <section>
            <h3 className="text-sm font-semibold text-midnight-navy">
              Drug-by-drug breakdown
            </h3>
            <p className="mt-0.5 text-xs text-slate-gray">
              Qualifying {injuryLabel} adverse-event reports per drug, with top
              reactions and serious-outcome rates.
            </p>
            <div className={cardGridCls}>
              {data.drugs.map((drug) => (
                <DrugBreakdownCard key={drug.brand} drug={drug} />
              ))}
            </div>
          </section>

          {/* -- Signal 2: reporting-source concentration ------------------ */}
          <section>
            <h3 className="text-sm font-semibold text-midnight-navy">
              {MODE_META[concentrationMode].heading}
            </h3>
            <p className="mt-0.5 text-xs text-slate-gray">
              {MODE_META[concentrationMode].blurb(data.baselinePct)}
            </p>
            <div className="mt-3 space-y-3">
              {activeDrugs.map((drug) => (
                <ConcentrationRow
                  key={drug.brand}
                  drug={drug}
                  baseline={data.baselinePct}
                  mode={concentrationMode}
                />
              ))}
            </div>
            <p className="mt-3 border-t border-midnight-navy/10 pt-2 text-[11px] leading-relaxed text-slate-gray">
              <span className="font-semibold text-midnight-navy">
                Methodology:
              </span>{" "}
              {methodologyNote}
            </p>
          </section>

          {/* -- Signal 3: trend over time --------------------------------- */}
          <section>
            <h3 className="text-sm font-semibold text-midnight-navy">
              Reporting trend
            </h3>
            <p className="mt-0.5 text-xs text-slate-gray">
              Monthly qualifying-event count per drug
              {data.windowStart && data.windowEnd
                ? ` (${fmtMonth(data.windowStart)} – ${fmtMonth(
                    data.windowEnd,
                  )})`
                : ""}
              . Hover a bar for the monthly figure.
            </p>
            <div className={cardGridCls}>
              {data.drugs.map((drug) => (
                <TrendCard key={drug.brand} drug={drug} />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
