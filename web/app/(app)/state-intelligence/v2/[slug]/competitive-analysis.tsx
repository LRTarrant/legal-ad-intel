"use client";

import { useCallback, useEffect, useState } from "react";
import { Swords, Database, ChevronDown, ExternalLink, Loader2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

/* ------------------------------------------------------------------ */
/*  Competitive Analysis — PI-firm advertising competition by DMA.    */
/*                                                                    */
/*  Replaces the legacy PIAdvertisingSection / CompetitiveLandscape   */
/*  Table / StateAdvertisingSection on the v2 state page.             */
/*                                                                    */
/*  Phase 1 (this): Paid Search tab is LIVE — get_pi_competitors_by_  */
/*  dma over geo-targeted Google search observations, filtered by the */
/*  Nielsen DMA dropdown (/api/dma-markets). Competitors are shown    */
/*  domain-led: the pipeline's advertiser_name is an ad headline, so  */
/*  the firm domain is the reliable identity.                         */
/*  SEO (Phase 2) + YouTube (Phase 4) are "coming soon". TikTok is    */
/*  disabled — TikTok publishes no US ad library (EU/UK DSA only).    */
/* ------------------------------------------------------------------ */

type ChannelKey = "paid_search" | "seo" | "youtube" | "tiktok" | "traditional";

interface ChannelTab {
  key: ChannelKey;
  label: string;
  disabled?: boolean;
  badge?: string;
}

const CHANNEL_TABS: ChannelTab[] = [
  { key: "paid_search", label: "Paid Search" },
  { key: "seo", label: "SEO" },
  { key: "youtube", label: "YouTube" },
  { key: "tiktok", label: "TikTok", disabled: true, badge: "No US data" },
  { key: "traditional", label: "Traditional Media", disabled: true, badge: "Soon" },
];

interface DmaOption {
  dma_code: string;
  display_name: string;
}

interface PiCompetitor {
  advertiser_domain: string;
  advertiser_name: string | null;
  website: string | null;
  total_observations: number;
  avg_ad_position: number | null;
  metros_active: string[] | null;
  case_types_active: string[] | null;
  first_seen: string | null;
  last_seen: string | null;
}

const CASE_TYPE_LABELS: Record<string, string> = {
  general_pi: "General PI",
  motor_vehicle: "Motor Vehicle",
  truck: "Truck",
  motorcycle: "Motorcycle",
  construction: "Construction",
  slip_and_fall: "Slip & Fall",
};

function caseLabel(key: string): string {
  return (
    CASE_TYPE_LABELS[key] ??
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function CompetitiveAnalysis({
  stateName,
  stateCode,
}: {
  stateName: string;
  stateCode: string;
}) {
  const [activeChannel, setActiveChannel] = useState<ChannelKey>("paid_search");
  const [selectedDma, setSelectedDma] = useState<string>("all");
  const [dmaOptions, setDmaOptions] = useState<DmaOption[]>([]);
  const [competitors, setCompetitors] = useState<PiCompetitor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // DMA dropdown — Nielsen list for this state (full list; some have no data).
  useEffect(() => {
    let active = true;
    fetch(`/api/dma-markets?state=${stateCode}`)
      .then((r) => (r.ok ? r.json() : { markets: [] }))
      .then((d: { markets?: DmaOption[] }) => {
        if (active) setDmaOptions(d.markets ?? []);
      })
      .catch(() => {
        if (active) setDmaOptions([]);
      });
    return () => {
      active = false;
    };
  }, [stateCode]);

  // Paid-search competitor set for the state, optionally filtered to one DMA.
  const loadCompetitors = useCallback(async () => {
    setLoading(true);
    setError(null);
    const sb = getSupabase() as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: PiCompetitor[] | null; error: { message: string } | null }>;
    };
    const { data, error: rpcError } = await sb.rpc("get_pi_competitors_by_dma", {
      p_state: stateCode,
      p_dma_code: selectedDma === "all" ? null : selectedDma,
    });
    if (rpcError) {
      setError("Couldn't load competitor data.");
      setCompetitors([]);
    } else {
      setCompetitors(data ?? []);
    }
    setLoading(false);
  }, [stateCode, selectedDma]);

  useEffect(() => {
    void loadCompetitors();
  }, [loadCompetitors]);

  const selectedDmaLabel =
    selectedDma === "all"
      ? "all markets"
      : (dmaOptions.find((d) => d.dma_code === selectedDma)?.display_name ??
        "this market");

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

      {/* DMA market dropdown — full Nielsen list for the state */}
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
            {dmaOptions.map((d) => (
              <option key={d.dma_code} value={d.dma_code}>
                {d.display_name}
              </option>
            ))}
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
              {tab.badge && (
                <span className="ml-1.5 rounded-full bg-cloud px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-gray/70">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Panel */}
      {activeChannel === "paid_search" ? (
        <PaidSearchPanel
          loading={loading}
          error={error}
          competitors={competitors}
          dmaLabel={selectedDmaLabel}
        />
      ) : activeChannel === "tiktok" ? (
        <ComingSoon
          title="TikTok competitive data is not available in the U.S."
          body="TikTok only publishes an ad library for the EU/UK (DSA mandate); there is no U.S. ad-library source to attribute ads to firms. We'll wire this up if that changes."
        />
      ) : (
        <ComingSoon
          title={`${activeChannel === "seo" ? "SEO" : "YouTube"} competition for ${stateName}`}
          body="Wiring in a follow-up — PI-firm presence on this channel, filtered by DMA."
        />
      )}
    </div>
  );
}

function PaidSearchPanel({
  loading,
  error,
  competitors,
  dmaLabel,
}: {
  loading: boolean;
  error: string | null;
  competitors: PiCompetitor[];
  dmaLabel: string;
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
        <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-intelligence-teal/60" />
        <p className="text-sm text-slate-gray">Loading competitors…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
        <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
        <p className="text-sm font-medium text-midnight-navy/60">{error}</p>
      </div>
    );
  }
  if (competitors.length === 0) {
    return (
      <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
        <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
        <p className="text-sm font-medium text-midnight-navy/60">
          No PI advertisers observed in {dmaLabel} yet.
        </p>
        <p className="mt-1 text-xs text-slate-gray">
          Paid-search observations accumulate daily; data fills in over time.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <p className="mb-3 text-xs text-slate-gray">
        Plaintiff-firm advertisers competing on Google paid search in {dmaLabel},
        ranked by ad appearances. Firms are identified by domain.
      </p>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-cloud">
            <th className="py-2 pr-2 text-xs font-semibold uppercase tracking-wider text-slate-gray w-8">
              #
            </th>
            <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Firm (domain)
            </th>
            <th className="py-2 px-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Ad appearances
            </th>
            <th className="py-2 px-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Avg position
            </th>
            <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Case types
            </th>
          </tr>
        </thead>
        <tbody>
          {competitors.map((c, i) => (
            <tr key={c.advertiser_domain} className="border-b border-cloud/60">
              <td className="py-2 pr-2 text-slate-gray">{i + 1}</td>
              <td className="py-2 px-3">
                <a
                  href={c.website ?? `https://${c.advertiser_domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-midnight-navy hover:text-intelligence-teal"
                >
                  {c.advertiser_domain}
                  <ExternalLink className="w-3 h-3 text-slate-gray/50" />
                </a>
              </td>
              <td className="py-2 px-3 text-right font-mono text-midnight-navy">
                {c.total_observations.toLocaleString()}
              </td>
              <td className="py-2 px-3 text-right text-midnight-navy">
                {c.avg_ad_position != null ? c.avg_ad_position.toFixed(1) : "—"}
              </td>
              <td className="py-2 px-3">
                <div className="flex flex-wrap gap-1">
                  {(c.case_types_active ?? []).map((ct) => (
                    <span
                      key={ct}
                      className="rounded-full bg-intelligence-teal/10 px-2 py-0.5 text-[10px] font-medium text-intelligence-teal"
                    >
                      {caseLabel(ct)}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
      <Database className="w-8 h-8 mx-auto mb-3 text-slate-gray/40" />
      <p className="text-sm font-medium text-midnight-navy/60">{title}</p>
      <p className="mt-1 text-xs text-slate-gray max-w-md mx-auto">{body}</p>
    </div>
  );
}
