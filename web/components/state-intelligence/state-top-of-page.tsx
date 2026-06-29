"use client";

/* ------------------------------------------------------------------ */
/*  Shared Design-D "top of page" system for State Intelligence pages. */
/*                                                                    */
/*  Sticky context bar · compact hero (strategy-primary CTAs) ·        */
/*  process-map pipeline strip · "the verdict" card row · bottom       */
/*  strategy closer. Mirrors the shipped + prod-verified Alabama page   */
/*  (PRs #507/#508/#509), parameterized so the v2 [slug] shell — and,   */
/*  in Phase 3, the legacy bespoke pages — render one implementation.   */
/* ------------------------------------------------------------------ */

import Link from "next/link";
import { Compass, ArrowRight, Check } from "lucide-react";
import { BuildCampaignLink } from "@/app/(app)/components/build-campaign-link";
import { VerdictCard, type VerdictCardProps } from "./VerdictCard";
import type { ChipTone } from "./viability";

/* Sticky-bar pills: a 10%-tint chip with 700 text (clears AA on the tint). */
const STICKY_PILL: Record<ChipTone, string> = {
  bad: "bg-red-500/10 text-red-700",
  mid: "bg-amber-500/10 text-amber-700",
  good: "bg-emerald-500/10 text-emerald-700",
  info: "bg-steel-blue/10 text-steel-blue",
};

/* Hero pill: bordered 50-tint chip with 700 text. */
const HERO_PILL: Record<ChipTone, string> = {
  bad: "border-red-300 bg-red-50 text-red-700",
  mid: "border-amber-300 bg-amber-50 text-amber-700",
  good: "border-emerald-300 bg-emerald-50 text-emerald-700",
  info: "border-cloud bg-cloud text-slate-gray",
};

/* ------------------------------------------------------------------ */
/*  Sticky context bar                                                 */
/* ------------------------------------------------------------------ */

export function StateStickyBar({
  stateName,
  negligenceShort,
  negligenceTone,
  composite,
  viabilityTone,
  nav,
}: {
  stateName: string;
  negligenceShort: string;
  negligenceTone: ChipTone;
  composite: number | string;
  viabilityTone: ChipTone;
  nav: [string, string][];
}) {
  return (
    <div className="sticky top-0 z-30 -mx-4 border-b border-cloud bg-white/90 px-4 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex h-13 items-center gap-3 py-2.5">
        <span className="text-base font-bold text-midnight-navy">{stateName}</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${STICKY_PILL[negligenceTone]}`}
        >
          {negligenceShort}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 font-mono text-[10.5px] font-bold ${STICKY_PILL[viabilityTone]}`}
        >
          Viability {composite || "—"}
        </span>
        <nav className="ml-auto hidden items-center gap-4 md:flex">
          {nav.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="text-[13px] font-semibold text-slate-gray hover:text-midnight-navy"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Mobile: compact jump menu (the page is long). */}
        <select
          aria-label="Jump to section"
          defaultValue=""
          onChange={(e) => {
            const id = e.target.value;
            if (id) document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
            e.target.selectedIndex = 0;
          }}
          className="ml-auto rounded-lg border border-cloud bg-white px-2.5 py-1 text-[13px] font-semibold text-slate-gray md:hidden"
        >
          <option value="" disabled>
            Jump to&hellip;
          </option>
          {nav.map(([href, label]) => (
            <option key={href} value={href.slice(1)}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero — compact, strategy-primary CTAs                              */
/* ------------------------------------------------------------------ */

export function StateHero({
  stateName,
  stateCode,
  negligenceLabel,
  negligenceTone = "info",
  tagline,
  subtitle,
}: {
  stateName: string;
  stateCode: string;
  /** Full negligence label for the hero pill (omit to hide the pill). */
  negligenceLabel?: string;
  negligenceTone?: ChipTone;
  /** Plain-text headline override; falls back to the templated default. */
  tagline?: string;
  /** Plain-text subhead override; falls back to the templated default. */
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-intelligence-teal">
            {stateName} · State Intelligence
          </span>
          {negligenceLabel && (
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${HERO_PILL[negligenceTone]}`}
            >
              {negligenceLabel}
            </span>
          )}
        </div>
        <h1 className="mt-3 font-heading text-3xl font-bold leading-[1.15] text-midnight-navy sm:text-[2.1rem]">
          {tagline ?? (
            <>
              We turn{" "}
              <span className="text-intelligence-teal">where accidents actually happen</span>{" "}
              into a strategy built for your budget &mdash; and a campaign you can launch.
            </>
          )}
        </h1>
        <p className="mt-3.5 max-w-2xl text-base leading-relaxed text-slate-gray">
          {subtitle ??
            "Real accident, boating & construction data, matched to local demographics and live competition. No guesswork — every number carries its source."}
        </p>
      </div>

      {/* Strategy is the primary path (filled); campaign is the quieter secondary. */}
      <div className="flex flex-none flex-col gap-2.5 lg:items-end">
        <div className="flex flex-col gap-2.5 sm:flex-row lg:justify-end">
          <Link
            href={`/strategy?state=${stateCode}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-intelligence-teal px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-intelligence-teal/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-intelligence-teal focus-visible:ring-offset-2"
          >
            <Compass className="h-4 w-4" />
            Build Media Strategy
          </Link>
          <BuildCampaignLink
            variant={{ kind: "personal_injury", stateCode, stateName }}
            tone="ghost"
          />
        </div>
        <p className="text-[11.5px] text-slate-gray lg:text-right">
          Strategy first &mdash; the campaign builds from it.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pipeline strip — process map only (CTAs live in the hero)          */
/* ------------------------------------------------------------------ */

function PipelineStep({
  n,
  label,
  state,
}: {
  n: number;
  label: string;
  state: "done" | "active" | "todo";
}) {
  const dot =
    state === "done"
      ? "bg-intelligence-teal text-white"
      : state === "active"
        ? "bg-intelligence-teal text-white ring-2 ring-intelligence-teal/25 ring-offset-2"
        : "bg-cloud text-slate-gray";
  const text =
    state === "todo"
      ? "text-slate-gray"
      : state === "active"
        ? "font-bold text-midnight-navy"
        : "font-semibold text-midnight-navy";
  return (
    <li className="flex items-center gap-2" aria-current={state === "active" ? "step" : undefined}>
      <span
        className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11px] font-bold ${dot}`}
      >
        {state === "done" ? <Check className="h-3.5 w-3.5" aria-hidden /> : n}
      </span>
      <span className={`text-[13px] ${text}`}>
        {state === "done" && <span className="sr-only">Completed: </span>}
        {label}
      </span>
    </li>
  );
}

function PipelineArrow() {
  return <ArrowRight className="h-4 w-4 flex-none text-slate-gray/35" aria-hidden />;
}

export function PipelineStrip() {
  return (
    <div className="rounded-2xl border border-cloud bg-white px-5 py-4 shadow-sm">
      <ol className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2">
        <PipelineStep n={1} label="Read the data" state="done" />
        <PipelineArrow />
        <PipelineStep n={2} label="Build strategy" state="active" />
        <PipelineArrow />
        <PipelineStep n={3} label="Launch campaign" state="todo" />
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  "The verdict" card row                                             */
/* ------------------------------------------------------------------ */

export function VerdictRow({ cards }: { cards: VerdictCardProps[] }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-gray">
          The verdict
        </span>
        <span className="h-px flex-1 bg-cloud" />
        <span className="text-[11.5px] text-slate-gray">
          Should a firm advertise here &mdash; and where?
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <VerdictCard key={c.label} {...c} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Strategy closer — bottom-of-page "now act on it" CTA              */
/* ------------------------------------------------------------------ */

export function StrategyCloserCTA({
  stateName,
  stateCode,
}: {
  stateName: string;
  stateCode: string;
}) {
  return (
    <div className="rounded-xl border border-intelligence-teal/20 bg-gradient-to-br from-intelligence-teal/[0.04] to-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-intelligence-teal/10">
            <Compass className="h-5 w-5 text-intelligence-teal" />
          </span>
          <div>
            <h3 className="mb-1 font-heading text-xl font-bold text-midnight-navy">
              Ready to act on this?
            </h3>
            <p className="max-w-2xl text-sm text-slate-gray">
              You&apos;ve seen the exposure, the legal landscape, and who you&apos;re up
              against. Turn it into a defensible, data-traced strategy &mdash; every number
              carries its source &mdash; then hand it to the Campaign Builder to produce the
              ads.
            </p>
          </div>
        </div>
        <Link
          href={`/strategy?state=${stateCode}`}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-intelligence-teal px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-intelligence-teal/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-intelligence-teal focus-visible:ring-offset-2"
        >
          Build the {stateName} strategy
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
