"use client";

import { useState } from "react";
import { Swords, Database, ChevronDown } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Competitive Analysis (PI-firm competition, DMA-filtered)          */
/*                                                                    */
/*  PLACEHOLDER SCAFFOLD — tab shell + DMA dropdown only.             */
/*  Replaces the legacy PIAdvertisingSection / CompetitiveLandscape   */
/*  Table / StateAdvertisingSection on the v2 state page. Real data   */
/*  (SEO / Paid Search / YouTube / TikTok per DMA) is wired in a      */
/*  follow-up — see CompetitiveAnalysis props for the keys available. */
/* ------------------------------------------------------------------ */

type ChannelKey = "seo" | "paid_search" | "youtube" | "tiktok" | "traditional";

interface ChannelTab {
  key: ChannelKey;
  label: string;
  disabled?: boolean;
}

const CHANNEL_TABS: ChannelTab[] = [
  { key: "seo", label: "SEO" },
  { key: "paid_search", label: "Paid Search" },
  { key: "youtube", label: "YouTube" },
  { key: "tiktok", label: "TikTok" },
  { key: "traditional", label: "Traditional Media", disabled: true },
];

export function CompetitiveAnalysis({
  stateName,
  stateCode,
}: {
  stateName: string;
  stateCode: string;
}) {
  const [activeChannel, setActiveChannel] = useState<ChannelKey>("seo");
  const [selectedDma, setSelectedDma] = useState<string>("all");

  const activeLabel =
    CHANNEL_TABS.find((t) => t.key === activeChannel)?.label ?? "SEO";

  return (
    <div className="rounded-lg border border-intelligence-teal/20 bg-gradient-to-br from-intelligence-teal/[0.04] to-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Swords className="w-4.5 h-4.5 text-intelligence-teal" />
        <h2 className="font-heading text-2xl font-bold text-midnight-navy">
          Competitive Analysis
        </h2>
      </div>
      <p className="mb-4 text-sm text-slate-gray">
        PI-firm advertising competition in {stateName}, filtered by DMA market
      </p>

      {/* DMA market dropdown (stub — not yet wired) */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label
          htmlFor="dma-market"
          className="text-xs font-semibold uppercase tracking-wider text-slate-gray"
        >
          DMA Market
        </label>
        <div className="relative">
          <select
            id="dma-market"
            value={selectedDma}
            onChange={(e) => setSelectedDma(e.target.value)}
            className="appearance-none rounded-md border border-cloud bg-white py-1.5 pl-3 pr-8 text-sm text-midnight-navy shadow-sm focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
          >
            <option value="all">All DMA markets</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-gray" />
        </div>
      </div>

      {/* Channel tabs */}
      <div className="mb-4 flex flex-wrap gap-1 border-b border-cloud">
        {CHANNEL_TABS.map((tab) => {
          const isActive = tab.key === activeChannel;
          return (
            <button
              key={tab.key}
              type="button"
              disabled={tab.disabled}
              onClick={() => !tab.disabled && setActiveChannel(tab.key)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                tab.disabled
                  ? "cursor-not-allowed border-transparent text-slate-gray/40"
                  : isActive
                    ? "border-intelligence-teal text-intelligence-teal"
                    : "border-transparent text-slate-gray hover:text-midnight-navy"
              }`}
            >
              {tab.label}
              {tab.disabled && (
                <span className="ml-1.5 rounded-full bg-cloud px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-gray/70">
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Channel panel (placeholder — data wiring in follow-up) */}
      <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
        <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
        <p className="text-sm font-medium text-midnight-navy/60">
          {activeLabel} competitive data for {stateName} ({stateCode})
        </p>
        <p className="mt-1 text-xs text-slate-gray">
          PI-firm competition by DMA market — wiring in a follow-up.
        </p>
      </div>
    </div>
  );
}
