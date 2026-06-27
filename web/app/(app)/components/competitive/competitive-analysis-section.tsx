"use client";

/* ------------------------------------------------------------------ */
/*  Competitive Analysis — shared, state-parameterized.               */
/*                                                                    */
/*  Used by the bespoke Alabama page (numbered heading) and the v2    */
/*  [slug] client (embedded — host renders its own group header).     */
/*   - Market (DMA) filter drives Paid Search (genuinely per-DMA).    */
/*   - SEO / YouTube / Meta are national in source, so they are       */
/*     firm-scoped to the state roster (domains/pages that appear in  */
/*     the state's paid search). A toggle exposes the full national   */
/*     field.                                                         */
/*   - "View ads" opens an in-app creative modal (AdCreativeModal),   */
/*     not a link-out to the ad library.                              */
/* ------------------------------------------------------------------ */

import { useCallback, useEffect, useState } from "react";
import { Database, ChevronDown, Loader2, Eye, Lock, MapPin } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { useFirmRoster } from "./use-firm-roster";
import { AdCreativeModal } from "./ad-creative-modal";
import type {
  ChannelKey,
  DmaOption,
  ModalTarget,
  PiCompetitor,
  SeoCompetitor,
  YouTubeCompetitor,
  MetaCompetitor,
  RpcClient,
} from "./types";

interface ChannelTab {
  key: ChannelKey;
  label: string;
  status: "live" | "planned" | "locked";
}

const CHANNEL_TABS: ChannelTab[] = [
  { key: "paid_search", label: "Paid Search", status: "live" },
  { key: "seo", label: "SEO", status: "live" },
  { key: "meta", label: "Meta", status: "live" },
  { key: "youtube", label: "YouTube", status: "live" },
  { key: "tiktok", label: "TikTok", status: "planned" },
  { key: "traditional", label: "Traditional Media", status: "locked" },
];

const SEO_CASE_TYPES: { slug: string; label: string }[] = [
  { slug: "motor_vehicle", label: "Motor Vehicle" },
  { slug: "truck_accident", label: "Truck" },
  { slug: "motorcycle", label: "Motorcycle" },
  { slug: "boating", label: "Boating" },
  { slug: "nursing_home", label: "Nursing Home" },
  { slug: "workers_comp", label: "Workers' Comp" },
];

// Meta carries a broad "general_pi" bucket (from the expanded keyword crawl)
// that SEO doesn't, so the Meta dropdown gets its own list with General PI.
const META_CASE_TYPES: { slug: string; label: string }[] = [
  { slug: "all", label: "All case types" },
  { slug: "general_pi", label: "General PI" },
  ...SEO_CASE_TYPES,
];

const DIRECTORY_DOMAINS = new Set([
  "nolo.com",
  "justia.com",
  "forbes.com",
  "findlaw.com",
  "lawyers.com",
  "avvo.com",
  "wikipedia.org",
  "en.wikipedia.org",
  "superlawyers.com",
  "expertise.com",
  "martindale.com",
]);

const CASE_TYPE_LABELS: Record<string, string> = {
  general_pi: "General PI",
  motor_vehicle: "Motor Vehicle",
  truck: "Truck",
  truck_accident: "Truck",
  motorcycle: "Motorcycle",
  construction: "Construction",
  slip_and_fall: "Slip & Fall",
  boating: "Boating",
  nursing_home: "Nursing Home",
  workers_comp: "Workers' Comp",
};

function caseLabel(key: string): string {
  return (
    CASE_TYPE_LABELS[key] ??
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function rpcClient(): RpcClient {
  return getSupabase() as unknown as RpcClient;
}

export function CompetitiveAnalysis({
  stateName,
  stateCode,
  embedded = false,
  numbered = true,
  sectionNumber = 3,
}: {
  stateName: string;
  stateCode: string;
  /** When true (v2 shared client), skip the section heading entirely — the
   *  host already renders its own group header. */
  embedded?: boolean;
  /** Show the numbered badge in the heading. True for the bespoke Alabama
   *  page; false for the legacy pages (which don't number sections). */
  numbered?: boolean;
  /** Number shown in the badge. Defaults to 3; the Alabama page passes 4 once
   *  the Recent Legal Activity section takes slot 2. */
  sectionNumber?: number;
}) {
  const roster = useFirmRoster(stateCode);

  const [activeChannel, setActiveChannel] = useState<ChannelKey>("paid_search");
  const [rosterOnly, setRosterOnly] = useState(true);
  const [modalTarget, setModalTarget] = useState<ModalTarget | null>(null);

  // Paid Search
  const [selectedDma, setSelectedDma] = useState<string>("all");
  const [dmaOptions, setDmaOptions] = useState<DmaOption[]>([]);
  const [paid, setPaid] = useState<PiCompetitor[]>([]);
  const [paidLoading, setPaidLoading] = useState(false);
  const [paidError, setPaidError] = useState<string | null>(null);

  // SEO
  const [seoCaseType, setSeoCaseType] = useState<string>("motor_vehicle");
  const [seo, setSeo] = useState<SeoCompetitor[]>([]);
  const [seoLoading, setSeoLoading] = useState(false);
  const [seoError, setSeoError] = useState<string | null>(null);

  // YouTube
  const [yt, setYt] = useState<YouTubeCompetitor[]>([]);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytError, setYtError] = useState<string | null>(null);

  // Meta
  const [metaCaseType, setMetaCaseType] = useState<string>("all");
  const [meta, setMeta] = useState<MetaCompetitor[]>([]);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  // DMA dropdown
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

  const loadPaid = useCallback(async () => {
    setPaidLoading(true);
    setPaidError(null);
    const { data, error } = await rpcClient().rpc("get_pi_competitors_by_dma", {
      p_state: stateCode,
      p_dma_code: selectedDma === "all" ? null : selectedDma,
    });
    if (error) {
      setPaidError("Couldn't load competitor data.");
      setPaid([]);
    } else {
      setPaid((data as PiCompetitor[] | null) ?? []);
    }
    setPaidLoading(false);
  }, [stateCode, selectedDma]);

  useEffect(() => {
    if (activeChannel === "paid_search") void loadPaid();
  }, [activeChannel, loadPaid]);

  const loadSeo = useCallback(async () => {
    setSeoLoading(true);
    setSeoError(null);
    // "All markets" = state-wide organic (all of the state's DMAs); a specific
    // DMA = per-metro organic. Both stay in-state, so SEO needs no roster filter.
    const { data, error } =
      selectedDma === "all"
        ? await rpcClient().rpc("get_seo_competitors_by_state", {
            p_tort_slug: seoCaseType,
            p_state: stateCode,
            p_days: 90,
          })
        : await rpcClient().rpc("get_seo_competitors_by_dma", {
            p_tort_slug: seoCaseType,
            p_dma_code: selectedDma,
            p_days: 90,
          });
    if (error) {
      setSeoError("Couldn't load SEO data.");
      setSeo([]);
    } else {
      setSeo((data as SeoCompetitor[] | null) ?? []);
    }
    setSeoLoading(false);
  }, [seoCaseType, selectedDma, stateCode]);

  useEffect(() => {
    if (activeChannel === "seo") void loadSeo();
  }, [activeChannel, loadSeo]);

  const loadYt = useCallback(async () => {
    setYtLoading(true);
    setYtError(null);
    const { data, error } = await rpcClient().rpc("get_youtube_competitors", {
      p_limit: 100,
    });
    if (error) {
      setYtError("Couldn't load YouTube data.");
      setYt([]);
    } else {
      setYt((data as YouTubeCompetitor[] | null) ?? []);
    }
    setYtLoading(false);
  }, []);

  useEffect(() => {
    if (activeChannel === "youtube") void loadYt();
  }, [activeChannel, loadYt]);

  const loadMeta = useCallback(async () => {
    setMetaLoading(true);
    setMetaError(null);
    const { data, error } = await rpcClient().rpc("get_meta_competitors", {
      p_case_type: metaCaseType === "all" ? null : metaCaseType,
      p_limit: 100,
    });
    if (error) {
      setMetaError("Couldn't load Meta data.");
      setMeta([]);
    } else {
      setMeta((data as MetaCompetitor[] | null) ?? []);
    }
    setMetaLoading(false);
  }, [metaCaseType]);

  useEffect(() => {
    if (activeChannel === "meta") void loadMeta();
  }, [activeChannel, loadMeta]);

  // SEO is geo-scoped (per-DMA or state-wide), so every domain already competes
  // in-state — no roster filter. Meta/YouTube are national feeds, so they honor
  // the roster toggle to scope down to in-state firms.
  const seoRows = seo;
  const ytRows =
    rosterOnly && !roster.loading
      ? yt.filter((c) => roster.matchesDomain(c.advertiser_domain))
      : yt;
  const metaRows =
    rosterOnly && !roster.loading
      ? meta.filter((c) => roster.matchesPageName(c.page_name ?? ""))
      : meta;

  const ytHidden = yt.length - ytRows.length;
  const metaHidden = meta.length - metaRows.length;

  const activeStatus =
    CHANNEL_TABS.find((t) => t.key === activeChannel)?.status ?? "live";
  // Meta/YouTube are national feeds with no geo, so they expose the roster
  // toggle to scope down to in-state firms. Paid Search + SEO are already
  // geo-scoped and honor the DMA filter instead.
  const rosterScoped = activeChannel === "meta" || activeChannel === "youtube";
  const dmaCapable = activeChannel === "paid_search" || activeChannel === "seo";

  return (
    <div id="competition" className="scroll-mt-20 space-y-4">
      {/* Section heading — skipped when embedded (host renders its own) */}
      {!embedded && (
        <div className="flex flex-wrap items-center gap-3">
          {numbered && (
            <span className="font-mono text-xs font-semibold tabular-nums text-slate-gray">
              {String(sectionNumber).padStart(2, "0")}
            </span>
          )}
          <h2 className="font-heading text-2xl font-bold text-midnight-navy">
            {stateName} Competitive Analysis
          </h2>
          <span className="rounded-full bg-intelligence-teal/10 px-2.5 py-1 text-xs font-semibold text-intelligence-teal">
            PI firms only
          </span>
        </div>
      )}

      {/* How-to-read callout (honest framing, no fabricated counts) */}
      <div className="rounded-xl border border-cloud bg-cloud/30 p-5">
        <p className="text-sm leading-relaxed text-slate-gray">
          <span className="font-semibold text-midnight-navy">
            Who you&apos;re competing against, by market.
          </span>{" "}
          Paid Search and SEO are broken out by DMA — switch the market to see
          who competes in each metro. Meta and YouTube are measured nationally,
          so they&apos;re scoped to the {stateName} firm roster (firms
          we&apos;ve seen competing in-state via organic and paid search). Click{" "}
          <span className="font-medium text-midnight-navy">View ads</span> on any
          row to see that firm&apos;s actual creative.
        </p>
      </div>

      <div className="rounded-xl border border-cloud bg-white p-6 shadow-sm">
        {/* Control bar */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-5">
            {/* Market (DMA) */}
            <div>
              <label
                htmlFor="al-dma"
                className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-gray"
              >
                Market (DMA)
              </label>
              <div className="relative inline-block">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-intelligence-teal" />
                <select
                  id="al-dma"
                  value={selectedDma}
                  onChange={(e) => setSelectedDma(e.target.value)}
                  disabled={!dmaCapable}
                  className="appearance-none rounded-lg border border-cloud bg-white py-2 pl-9 pr-9 text-sm font-semibold text-midnight-navy shadow-sm focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal disabled:cursor-not-allowed disabled:bg-cloud/40 disabled:text-slate-gray/60"
                >
                  <option value="all">All {stateName} markets</option>
                  {dmaOptions.map((d) => (
                    <option key={d.dma_code} value={d.dma_code}>
                      {d.display_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-gray" />
              </div>
            </div>

            {/* Case type (SEO / Meta only) */}
            {activeChannel === "seo" && (
              <CaseTypeSelect
                id="al-seo-case"
                value={seoCaseType}
                onChange={setSeoCaseType}
                options={SEO_CASE_TYPES}
              />
            )}
            {activeChannel === "meta" && (
              <CaseTypeSelect
                id="al-meta-case"
                value={metaCaseType}
                onChange={setMetaCaseType}
                options={META_CASE_TYPES}
              />
            )}
          </div>

          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-gray">
              Firms tracked
            </div>
            <div className="font-mono text-2xl font-semibold leading-none text-midnight-navy">
              {roster.loading ? "—" : roster.size}
            </div>
          </div>
        </div>

        {/* Channel tabs */}
        <div className="mt-5 flex gap-1 overflow-x-auto border-b border-cloud">
          {CHANNEL_TABS.map((tab) => {
            const isActive = tab.key === activeChannel;
            const disabled = tab.status !== "live";
            return (
              <button
                key={tab.key}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setActiveChannel(tab.key)}
                className={`-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  disabled
                    ? "cursor-not-allowed border-transparent text-slate-gray/40"
                    : isActive
                      ? "border-intelligence-teal text-intelligence-teal"
                      : "border-transparent text-slate-gray hover:text-midnight-navy"
                }`}
              >
                {tab.label}
                {tab.status === "planned" && (
                  <span className="rounded-full bg-cloud px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-gray/70">
                    Soon
                  </span>
                )}
                {tab.status === "locked" && (
                  <Lock className="h-3 w-3 text-slate-gray/40" />
                )}
              </button>
            );
          })}
        </div>

        {/* Roster scope toggle — national channels (Meta / YouTube) only */}
        {rosterScoped && activeStatus === "live" && (
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-midnight-navy">
              <input
                type="checkbox"
                checked={rosterOnly}
                onChange={(e) => setRosterOnly(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-cloud text-intelligence-teal focus:ring-intelligence-teal"
              />
              Show {stateName} firms only
            </label>
            <span className="text-xs text-slate-gray/70">
              This ad data is national. Checked, the list shows only firms
              we&apos;ve seen competing in {stateName} (organic + paid search);
              unchecked shows the full national field.
            </span>
          </div>
        )}

        {/* Panel */}
        <div className="mt-5">
          {activeChannel === "paid_search" ? (
            <PaidPanel
              loading={paidLoading}
              error={paidError}
              rows={paid}
              onViewAds={(c) =>
                setModalTarget({
                  channel: "paid_search",
                  domain: c.advertiser_domain,
                  label: c.advertiser_name ?? c.advertiser_domain,
                })
              }
            />
          ) : activeChannel === "seo" ? (
            <SeoPanel
              stateName={stateName}
              loading={seoLoading}
              error={seoError}
              rows={seoRows}
              hidden={0}
              onViewAds={(c) =>
                setModalTarget({
                  channel: "seo",
                  domain: c.domain,
                  label: c.advertiser_name ?? c.domain,
                })
              }
            />
          ) : activeChannel === "meta" ? (
            <MetaPanel
              stateName={stateName}
              loading={metaLoading || roster.loading}
              error={metaError}
              rows={metaRows}
              hidden={rosterOnly ? metaHidden : 0}
              onViewAds={(c) =>
                setModalTarget({
                  channel: "meta",
                  pageId: c.page_id,
                  label: c.page_name ?? c.page_id,
                })
              }
            />
          ) : activeChannel === "youtube" ? (
            <YouTubePanel
              stateName={stateName}
              loading={ytLoading || roster.loading}
              error={ytError}
              rows={ytRows}
              hidden={rosterOnly ? ytHidden : 0}
              onViewAds={(c) =>
                setModalTarget({
                  channel: "youtube",
                  domain: c.advertiser_domain,
                  arId: c.advertiser_ar_id,
                  label: c.advertiser_name ?? c.advertiser_domain,
                })
              }
            />
          ) : (
            <LockedPanel channel={activeChannel} />
          )}
        </div>
      </div>

      <AdCreativeModal
        target={modalTarget}
        alMetroIds={roster.alMetroIds}
        onClose={() => setModalTarget(null)}
      />
    </div>
  );
}

/* ------------------------------ shared bits ------------------------------ */

function CaseTypeSelect({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: { slug: string; label: string }[];
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-gray"
      >
        Case type
      </label>
      <div className="relative inline-block">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none rounded-lg border border-cloud bg-white py-2 pl-3 pr-9 text-sm font-semibold text-midnight-navy shadow-sm focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
        >
          {options.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-gray" />
      </div>
    </div>
  );
}

function PanelState({
  loading,
  error,
  empty,
  emptyMsg,
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyMsg: string;
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
        <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-intelligence-teal/60" />
        <p className="text-sm text-slate-gray">Loading competitors…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
        <Database className="mx-auto mb-3 h-8 w-8 text-slate-gray/40" />
        <p className="text-sm font-medium text-midnight-navy/60">{error}</p>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
        <Database className="mx-auto mb-3 h-8 w-8 text-slate-gray/40" />
        <p className="text-sm font-medium text-midnight-navy/60">{emptyMsg}</p>
      </div>
    );
  }
  return null;
}

function ViewAdsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-cloud bg-white px-3 py-1.5 text-xs font-semibold text-intelligence-teal transition-colors hover:bg-intelligence-teal/5"
    >
      <Eye className="h-3.5 w-3.5" />
      View ads
    </button>
  );
}

function HiddenNote({
  hidden,
  noun,
  stateName,
}: {
  hidden: number;
  noun: string;
  stateName: string;
}) {
  if (hidden <= 0) return null;
  return (
    <p className="mb-3 text-xs text-slate-gray/70">
      {hidden} non-{stateName} {noun} hidden. Uncheck &ldquo;Show {stateName}{" "}
      firms only&rdquo; to see the full national field.
    </p>
  );
}

const TH =
  "py-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray";

/* ------------------------------ Paid Search ------------------------------ */

function PaidPanel({
  loading,
  error,
  rows,
  onViewAds,
}: {
  loading: boolean;
  error: string | null;
  rows: PiCompetitor[];
  onViewAds: (c: PiCompetitor) => void;
}) {
  if (loading || error || rows.length === 0) {
    return (
      <PanelState
        loading={loading}
        error={error}
        empty={rows.length === 0}
        emptyMsg="No PI advertisers observed in this market yet. Paid-search data accumulates daily."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-cloud">
            <th className={`${TH} w-8`}>#</th>
            <th className={TH}>Firm (domain)</th>
            <th className={`${TH} text-right`}>Recent presence (90d)</th>
            <th className={`${TH} text-right`}>Avg position</th>
            <th className={TH}>Case types</th>
            <th className={`${TH} text-right`}>Creative</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c, i) => (
            <tr key={c.advertiser_domain} className="border-b border-cloud/60">
              <td className="px-3 py-2.5 text-slate-gray">{i + 1}</td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-midnight-navy">
                    {c.advertiser_name ?? c.advertiser_domain}
                  </span>
                  {c.low_confidence ? (
                    <span
                      title="New or thin sample: first seen in the last 21 days, or fewer than 14 active days. Not yet an established presence."
                      className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700"
                    >
                      New
                    </span>
                  ) : null}
                </div>
                <div className="text-[11px] text-slate-gray/70">
                  {c.advertiser_domain}
                  {c.first_seen ? ` · since ${c.first_seen}` : ""}
                </div>
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-midnight-navy">
                {c.total_observations.toLocaleString()}
                {c.observations_per_active_day != null ? (
                  <div className="text-[11px] font-sans text-slate-gray/70">
                    {c.observations_per_active_day.toFixed(1)}/active day
                  </div>
                ) : null}
              </td>
              <td className="px-3 py-2.5 text-right text-midnight-navy">
                {c.avg_ad_position != null ? c.avg_ad_position.toFixed(1) : "—"}
              </td>
              <td className="px-3 py-2.5">
                <div className="flex flex-wrap gap-1">
                  {(c.case_types_active ?? []).slice(0, 4).map((ct) => (
                    <span
                      key={ct}
                      className="rounded-full bg-intelligence-teal/10 px-2 py-0.5 text-[10px] font-medium text-intelligence-teal"
                    >
                      {caseLabel(ct)}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-3 py-2.5 text-right">
                <ViewAdsButton onClick={() => onViewAds(c)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 px-3 text-[11px] leading-relaxed text-slate-gray/70">
        Ranked by sustained presence over the last 90 days — statewide market
        breadth first, then per-active-day density — not all-time ad volume.
        &ldquo;New&rdquo; flags firms first seen in the last 21 days or with
        fewer than 14 active days.
      </p>
    </div>
  );
}

/* --------------------------------- SEO --------------------------------- */

function SeoPanel({
  stateName,
  loading,
  error,
  rows,
  hidden,
  onViewAds,
}: {
  stateName: string;
  loading: boolean;
  error: string | null;
  rows: SeoCompetitor[];
  hidden: number;
  onViewAds: (c: SeoCompetitor) => void;
}) {
  if (loading || error || rows.length === 0) {
    return (
      <PanelState
        loading={loading}
        error={error}
        empty={rows.length === 0}
        emptyMsg={`No organic results tracked for this case type in ${stateName} yet. Per-metro SEO data accumulates daily.`}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <HiddenNote hidden={hidden} noun="domains" stateName={stateName} />
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-cloud">
            <th className={`${TH} w-8`}>#</th>
            <th className={TH}>Domain</th>
            <th className={`${TH} text-right`}>Organic appearances</th>
            <th className={`${TH} text-right`}>Avg position</th>
            <th className={`${TH} text-right`}>Top 10</th>
            <th className={`${TH} text-right`}>Creative</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c, i) => {
            const isDir = DIRECTORY_DOMAINS.has(c.domain.toLowerCase());
            return (
              <tr key={c.domain} className="border-b border-cloud/60">
                <td className="px-3 py-2.5 text-slate-gray">{i + 1}</td>
                <td className="px-3 py-2.5">
                  <span className="font-medium text-midnight-navy">
                    {c.domain}
                  </span>
                  {isDir && (
                    <span className="ml-1.5 rounded-full bg-cloud px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-gray/70">
                      Directory
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-midnight-navy">
                  {c.organic_appearances.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-right text-midnight-navy">
                  {c.avg_position != null ? c.avg_position.toFixed(1) : "—"}
                </td>
                <td className="px-3 py-2.5 text-right text-midnight-navy">
                  {c.top_10_count.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <ViewAdsButton onClick={() => onViewAds(c)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* --------------------------------- Meta -------------------------------- */

function MetaPanel({
  stateName,
  loading,
  error,
  rows,
  hidden,
  onViewAds,
}: {
  stateName: string;
  loading: boolean;
  error: string | null;
  rows: MetaCompetitor[];
  hidden: number;
  onViewAds: (c: MetaCompetitor) => void;
}) {
  if (loading || error || rows.length === 0) {
    return (
      <PanelState
        loading={loading}
        error={error}
        empty={rows.length === 0}
        emptyMsg={`No ${stateName}-roster firms running Meta ads for this case type yet.`}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <HiddenNote hidden={hidden} noun="pages" stateName={stateName} />
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-cloud">
            <th className={`${TH} w-8`}>#</th>
            <th className={TH}>Firm (page)</th>
            <th className={`${TH} text-right`}>Active ads</th>
            <th className={TH}>Case types</th>
            <th className={`${TH} text-right`}>Creative</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c, i) => (
            <tr key={c.page_id} className="border-b border-cloud/60">
              <td className="px-3 py-2.5 text-slate-gray">{i + 1}</td>
              <td className="px-3 py-2.5 font-medium text-midnight-navy">
                {c.page_name ?? c.page_id}
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-midnight-navy">
                {c.active_ads.toLocaleString()}
              </td>
              <td className="px-3 py-2.5">
                <div className="flex flex-wrap gap-1">
                  {(c.case_types_active ?? []).slice(0, 4).map((ct) => (
                    <span
                      key={ct}
                      className="rounded-full bg-intelligence-teal/10 px-2 py-0.5 text-[10px] font-medium text-intelligence-teal"
                    >
                      {caseLabel(ct)}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-3 py-2.5 text-right">
                <ViewAdsButton onClick={() => onViewAds(c)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------- YouTube ------------------------------- */

function YouTubePanel({
  stateName,
  loading,
  error,
  rows,
  hidden,
  onViewAds,
}: {
  stateName: string;
  loading: boolean;
  error: string | null;
  rows: YouTubeCompetitor[];
  hidden: number;
  onViewAds: (c: YouTubeCompetitor) => void;
}) {
  if (loading || error || rows.length === 0) {
    return (
      <PanelState
        loading={loading}
        error={error}
        empty={rows.length === 0}
        emptyMsg={`No ${stateName}-roster firms running YouTube video ads yet.`}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <HiddenNote hidden={hidden} noun="firms" stateName={stateName} />
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-cloud">
            <th className={`${TH} w-8`}>#</th>
            <th className={TH}>Firm (domain)</th>
            <th className={`${TH} text-right`}>Active video ads</th>
            <th className={`${TH} text-right`}>Longest running</th>
            <th className={TH}>Last seen</th>
            <th className={`${TH} text-right`}>Creative</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c, i) => (
            <tr key={c.advertiser_domain} className="border-b border-cloud/60">
              <td className="px-3 py-2.5 text-slate-gray">{i + 1}</td>
              <td className="px-3 py-2.5 font-medium text-midnight-navy">
                {c.advertiser_domain}
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-midnight-navy">
                {c.active_creatives.toLocaleString()}
              </td>
              <td className="px-3 py-2.5 text-right text-midnight-navy">
                {c.longest_running_days != null
                  ? `${c.longest_running_days.toLocaleString()} days`
                  : "—"}
              </td>
              <td className="px-3 py-2.5 text-midnight-navy">
                {c.last_shown ?? "—"}
              </td>
              <td className="px-3 py-2.5 text-right">
                <ViewAdsButton onClick={() => onViewAds(c)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------- Locked -------------------------------- */

function LockedPanel({ channel }: { channel: ChannelKey }) {
  const copy =
    channel === "tiktok"
      ? {
          title: "TikTok — no US ad library",
          body: "TikTok exposes no public US ad-library data, so firm-level competition can't be measured here.",
        }
      : {
          title: "Traditional Media — coming soon",
          body: "TV, radio, and out-of-home spend by PI firm will land here in a later release.",
        };
  return (
    <div className="rounded-lg border border-dashed border-cloud bg-cloud/30 p-12 text-center">
      <Lock className="mx-auto mb-3 h-7 w-7 text-slate-gray/40" />
      <p className="text-base font-bold text-midnight-navy">{copy.title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-gray">
        {copy.body}
      </p>
    </div>
  );
}
