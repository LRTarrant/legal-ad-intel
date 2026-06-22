# Competitive Analysis Phase 4b — YouTube tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the YouTube channel tab on the v2 State Intelligence "Competitive Analysis" surface to the `youtube_ad_creatives` data — a firm-level, national ranking of PI firms by YouTube/video advertising.

**Architecture:** A new read-only Postgres RPC (`get_youtube_competitors`) aggregates `youtube_ad_creatives` per advertiser domain; the existing `competitive-analysis.tsx` gains a `YouTubePanel` and a YouTube branch in its control row (no filter control — national, no case-type). Mirrors the SEO tab pattern.

**Tech Stack:** Supabase Postgres (SQL RPC, `SECURITY DEFINER`), Next.js 16 / React 19 client component.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-22-youtube-competitive-tab-design.md`.
- Firm-level, **national** — no DMA filter, no case-type filter. YouTube tab's control row shows only a "measured nationally" note.
- Domain-led identity (`advertiser_name` is often the agency, so the domain is the firm identity).
- RPC excludes junk domains: `advertiser_domain NOT IN ('google.com','youtube.com')`.
- RPC ordered by `active_creatives DESC, longest_running_days DESC NULLS LAST`, `LIMIT p_limit` (default 50). `SECURITY DEFINER`, `SET search_path = public`, granted anon/authenticated/service_role.
- Per-row **"view ads ↗"** link → `https://adstransparency.google.com/advertiser/{advertiser_ar_id}?region=US` (only when `advertiser_ar_id` present). Domain links to `https://{advertiser_domain}`.
- RPC called via the untyped `getSupabase().rpc()` cast (no `database.types.ts` gate; regen post-merge), same as the SEO/Paid Search tabs.
- Migrations apply on merge — do NOT apply via Supabase MCP. Validate the RPC body read-only against prod first.
- Project: Supabase `project_id = inmktpwhpkiknctznrys`. Migration timestamp `20260622020000` (verify: `ls supabase/migrations/ | grep ^20260622`).
- TypeScript: run `npx tsc --noEmit` only AFTER `npm install` in `web/`; only the changed file must be clean vs the known baseline.

---

### Task 1: `get_youtube_competitors` RPC (migration)

**Files:**
- Create: `supabase/migrations/20260622020000_add_youtube_competitors_rpc.sql`

**Interfaces:**
- Consumes: `youtube_ad_creatives` table (Phase 4a, on main).
- Produces: RPC `get_youtube_competitors(p_limit INTEGER DEFAULT 50)` returning `(advertiser_domain TEXT, advertiser_name TEXT, advertiser_ar_id TEXT, active_creatives BIGINT, longest_running_days INTEGER, first_shown DATE, last_shown DATE)`. Consumed by Task 2.

- [ ] **Step 1: Confirm no migration timestamp collision**

Run: `ls supabase/migrations/ | grep ^20260622020000`
Expected: no output. If anything returns, bump to `20260622030000` and use that throughout.

- [ ] **Step 2: Validate the RPC body read-only against prod (the "failing test")**

Run the SELECT body inline against prod via Supabase MCP `execute_sql` (`project_id = inmktpwhpkiknctznrys`) — read-only, safe:

```sql
SELECT
    y.advertiser_domain,
    mode() WITHIN GROUP (ORDER BY y.advertiser_name) AS advertiser_name,
    mode() WITHIN GROUP (ORDER BY y.advertiser_ar_id) AS advertiser_ar_id,
    COUNT(*) AS active_creatives,
    MAX(y.total_days_shown) AS longest_running_days,
    MIN(y.first_shown) AS first_shown,
    MAX(y.last_shown) AS last_shown
FROM public.youtube_ad_creatives y
WHERE y.advertiser_domain NOT IN ('google.com', 'youtube.com')
GROUP BY y.advertiser_domain
ORDER BY active_creatives DESC, longest_running_days DESC NULLS LAST
LIMIT 50;
```

Expected: a ranked list of real PI firms (e.g. `thebarnesfirm.com`, `forthepeople.com`, `getgordon.com`), **`google.com` absent**, `active_creatives` descending, `longest_running_days` populated. If `google.com` appears or the list is empty, stop and re-check before writing the migration.

- [ ] **Step 3: Write the migration file**

Create `supabase/migrations/20260622020000_add_youtube_competitors_rpc.sql`:

```sql
-- ============================================================================
-- Competitive Analysis Phase 4b: get_youtube_competitors RPC.
-- Firm-level, national ranking of PI firms by YouTube/video advertising,
-- aggregated from youtube_ad_creatives (Phase 4a). No DMA / case-type filter —
-- Transparency video creatives carry no geo or keyword tag.
--
-- Junk filter: google.com / youtube.com snuck into the pi_search seed and
-- return Google's own ads (google.com ranked #1 with 100 creatives) — they are
-- not PI competitors. The list is small and extensible.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_youtube_competitors(
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    advertiser_domain TEXT,
    advertiser_name TEXT,
    advertiser_ar_id TEXT,
    active_creatives BIGINT,
    longest_running_days INTEGER,
    first_shown DATE,
    last_shown DATE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        y.advertiser_domain,
        mode() WITHIN GROUP (ORDER BY y.advertiser_name) AS advertiser_name,
        mode() WITHIN GROUP (ORDER BY y.advertiser_ar_id) AS advertiser_ar_id,
        COUNT(*) AS active_creatives,
        MAX(y.total_days_shown) AS longest_running_days,
        MIN(y.first_shown) AS first_shown,
        MAX(y.last_shown) AS last_shown
    FROM public.youtube_ad_creatives y
    WHERE y.advertiser_domain NOT IN ('google.com', 'youtube.com')
    GROUP BY y.advertiser_domain
    ORDER BY active_creatives DESC, longest_running_days DESC NULLS LAST
    LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_youtube_competitors(INTEGER) IS
    'Firm-level national ranking of PI firms by YouTube/video advertising '
    '(active creatives + longevity), from youtube_ad_creatives. Excludes '
    'google.com/youtube.com seed junk.';

GRANT EXECUTE ON FUNCTION public.get_youtube_competitors(INTEGER)
    TO anon, authenticated, service_role;
```

- [ ] **Step 4: Verify the file has the required clauses**

Run each; each must print `1`:
```bash
F=supabase/migrations/20260622020000_add_youtube_competitors_rpc.sql
grep -c "CREATE OR REPLACE FUNCTION public.get_youtube_competitors" "$F"
grep -c "NOT IN ('google.com', 'youtube.com')" "$F"
grep -c "GRANT EXECUTE ON FUNCTION public.get_youtube_competitors" "$F"
```
Expected: `1` from each.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260622020000_add_youtube_competitors_rpc.sql
git commit -m "feat(competitive-analysis): get_youtube_competitors RPC"
```

---

### Task 2: YouTube panel + control-row branch in competitive-analysis.tsx

**Files:**
- Modify (rewrite whole): `web/app/(app)/state-intelligence/v2/[slug]/competitive-analysis.tsx`

**Interfaces:**
- Consumes: RPC `get_youtube_competitors(p_limit)` from Task 1.

Rewrite the whole file (repo convention — one write over many edits) with the content below. It preserves the entire Paid Search + SEO paths and adds: a `YouTubeCompetitor` interface, YouTube state + loader + effect, a YouTube branch in the subtitle and control row (note only, no dropdown), a YouTube panel branch, and the `YouTubePanel` component.

- [ ] **Step 1: Replace the file with the updated component**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Swords, Database, ChevronDown, ExternalLink, Loader2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

/* ------------------------------------------------------------------ */
/*  Competitive Analysis — PI-firm advertising competition.           */
/*                                                                    */
/*  Paid Search (Phase 1): get_pi_competitors_by_dma over geo-        */
/*  targeted Google ad observations, filtered by Nielsen DMA.         */
/*  SEO (Phase 2): get_seo_competitors_by_tort over organic SERP      */
/*  results, filtered by PI case type (national).                     */
/*  YouTube (Phase 4b): get_youtube_competitors over Google Ads       */
/*  Transparency video creatives — firm-level, national (no DMA, no   */
/*  case-type tag), with a link to each firm's Transparency page.     */
/*  TikTok is disabled — TikTok publishes no US ad library (EU/UK     */
/*  DSA only).                                                         */
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

// SEO case types (organic data is national — keyed by tort_slug, not DMA).
const SEO_CASE_TYPES: { slug: string; label: string }[] = [
  { slug: "motor_vehicle", label: "Motor Vehicle" },
  { slug: "truck_accident", label: "Truck" },
  { slug: "motorcycle", label: "Motorcycle" },
  { slug: "boating", label: "Boating" },
  { slug: "nursing_home", label: "Nursing Home" },
  { slug: "workers_comp", label: "Workers' Comp" },
];

// Known directory / aggregator domains — tagged so firm rows read at a glance.
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

interface SeoCompetitor {
  domain: string;
  advertiser_name: string | null;
  organic_appearances: number;
  avg_position: number | null;
  best_position: number | null;
  top_3_count: number;
  top_10_count: number;
  keywords_tracked: number;
  first_seen: string | null;
  last_seen: string | null;
}

interface YouTubeCompetitor {
  advertiser_domain: string;
  advertiser_name: string | null;
  advertiser_ar_id: string | null;
  active_creatives: number;
  longest_running_days: number | null;
  first_shown: string | null;
  last_shown: string | null;
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

  // Paid Search state (Phase 1)
  const [selectedDma, setSelectedDma] = useState<string>("all");
  const [dmaOptions, setDmaOptions] = useState<DmaOption[]>([]);
  const [competitors, setCompetitors] = useState<PiCompetitor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SEO state (Phase 2)
  const [selectedCaseType, setSelectedCaseType] = useState<string>("motor_vehicle");
  const [seoCompetitors, setSeoCompetitors] = useState<SeoCompetitor[]>([]);
  const [seoLoading, setSeoLoading] = useState(false);
  const [seoError, setSeoError] = useState<string | null>(null);

  // YouTube state (Phase 4b)
  const [ytCompetitors, setYtCompetitors] = useState<YouTubeCompetitor[]>([]);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytError, setYtError] = useState<string | null>(null);

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
    if (activeChannel === "paid_search") void loadCompetitors();
  }, [activeChannel, loadCompetitors]);

  // SEO competitor set — national organic, filtered by case type.
  const loadSeo = useCallback(async () => {
    setSeoLoading(true);
    setSeoError(null);
    const sb = getSupabase() as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: SeoCompetitor[] | null; error: { message: string } | null }>;
    };
    const { data, error: rpcError } = await sb.rpc("get_seo_competitors_by_tort", {
      p_tort_slug: selectedCaseType,
      p_days: 90,
    });
    if (rpcError) {
      setSeoError("Couldn't load SEO data.");
      setSeoCompetitors([]);
    } else {
      setSeoCompetitors(data ?? []);
    }
    setSeoLoading(false);
  }, [selectedCaseType]);

  useEffect(() => {
    if (activeChannel === "seo") void loadSeo();
  }, [activeChannel, loadSeo]);

  // YouTube competitor set — national, firm-level (no filter).
  const loadYouTube = useCallback(async () => {
    setYtLoading(true);
    setYtError(null);
    const sb = getSupabase() as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: YouTubeCompetitor[] | null; error: { message: string } | null }>;
    };
    const { data, error: rpcError } = await sb.rpc("get_youtube_competitors", {
      p_limit: 50,
    });
    if (rpcError) {
      setYtError("Couldn't load YouTube data.");
      setYtCompetitors([]);
    } else {
      setYtCompetitors(data ?? []);
    }
    setYtLoading(false);
  }, []);

  useEffect(() => {
    if (activeChannel === "youtube") void loadYouTube();
  }, [activeChannel, loadYouTube]);

  const selectedDmaLabel =
    selectedDma === "all"
      ? "all markets"
      : (dmaOptions.find((d) => d.dma_code === selectedDma)?.display_name ??
        "this market");

  const selectedCaseLabel =
    SEO_CASE_TYPES.find((c) => c.slug === selectedCaseType)?.label ?? "this case type";

  const subtitle =
    activeChannel === "seo"
      ? "Organic-search competition for PI case types (measured nationally)"
      : activeChannel === "youtube"
        ? "YouTube / video ad presence by PI firm (measured nationally)"
        : `PI-firm advertising competition in ${stateName}, filtered by DMA market`;

  return (
    <div className="rounded-lg border border-intelligence-teal/20 bg-gradient-to-br from-intelligence-teal/[0.04] to-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Swords className="w-4.5 h-4.5 text-intelligence-teal" />
        <h2 className="font-heading text-2xl font-bold text-midnight-navy">
          Competitive Analysis
        </h2>
      </div>
      <p className="mb-4 text-sm text-slate-gray">{subtitle}</p>

      {/* Filter control — DMA for Paid Search, case type for SEO, none for YouTube */}
      {activeChannel === "seo" ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label
            htmlFor="seo-case-type"
            className="text-xs font-semibold uppercase tracking-wider text-slate-gray"
          >
            Case Type
          </label>
          <div className="relative">
            <select
              id="seo-case-type"
              value={selectedCaseType}
              onChange={(e) => setSelectedCaseType(e.target.value)}
              className="appearance-none rounded-md border border-cloud bg-white py-1.5 pl-3 pr-8 text-sm text-midnight-navy shadow-sm focus:border-intelligence-teal focus:outline-none focus:ring-1 focus:ring-intelligence-teal"
            >
              {SEO_CASE_TYPES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-gray" />
          </div>
          <span className="text-xs text-slate-gray/70">
            Organic rankings are measured nationally, not by DMA.
          </span>
        </div>
      ) : activeChannel === "youtube" ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-gray/70">
            YouTube / video ad presence is measured nationally, not by DMA.
          </span>
        </div>
      ) : (
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
      )}

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
      ) : activeChannel === "seo" ? (
        <SeoPanel
          loading={seoLoading}
          error={seoError}
          competitors={seoCompetitors}
          caseLabel={selectedCaseLabel}
        />
      ) : activeChannel === "youtube" ? (
        <YouTubePanel
          loading={ytLoading}
          error={ytError}
          competitors={ytCompetitors}
        />
      ) : activeChannel === "tiktok" ? (
        <ComingSoon
          title="TikTok competitive data is not available in the U.S."
          body="TikTok only publishes an ad library for the EU/UK (DSA mandate); there is no U.S. ad-library source to attribute ads to firms. We'll wire this up if that changes."
        />
      ) : (
        <ComingSoon
          title={`Traditional media for ${stateName}`}
          body="Wiring in a follow-up — broadcast / radio presence by market."
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

function SeoPanel({
  loading,
  error,
  competitors,
  caseLabel: caseLabelText,
}: {
  loading: boolean;
  error: string | null;
  competitors: SeoCompetitor[];
  caseLabel: string;
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
        <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-intelligence-teal/60" />
        <p className="text-sm text-slate-gray">Loading organic competitors…</p>
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
          No organic data for {caseLabelText} yet.
        </p>
        <p className="mt-1 text-xs text-slate-gray">
          Organic data for this case type is accruing — check back over the next
          few days.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <p className="mb-3 text-xs text-slate-gray">
        Domains ranked by organic Google appearances for {caseLabelText} search
        terms (national, last 90 days). Includes directories and aggregators —
        the full field a firm competes against for organic clicks.
      </p>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-cloud">
            <th className="py-2 pr-2 text-xs font-semibold uppercase tracking-wider text-slate-gray w-8">
              #
            </th>
            <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Domain
            </th>
            <th className="py-2 px-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Organic appearances
            </th>
            <th className="py-2 px-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Avg position
            </th>
            <th className="py-2 px-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Top 10
            </th>
            <th className="py-2 px-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Keywords
            </th>
          </tr>
        </thead>
        <tbody>
          {competitors.map((c, i) => {
            const isDirectory = DIRECTORY_DOMAINS.has(c.domain.toLowerCase());
            return (
              <tr key={c.domain} className="border-b border-cloud/60">
                <td className="py-2 pr-2 text-slate-gray">{i + 1}</td>
                <td className="py-2 px-3">
                  <a
                    href={`https://${c.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-midnight-navy hover:text-intelligence-teal"
                  >
                    {c.domain}
                    <ExternalLink className="w-3 h-3 text-slate-gray/50" />
                  </a>
                  {isDirectory && (
                    <span className="ml-1.5 rounded-full bg-cloud px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-gray/70">
                      Directory
                    </span>
                  )}
                </td>
                <td className="py-2 px-3 text-right font-mono text-midnight-navy">
                  {c.organic_appearances.toLocaleString()}
                </td>
                <td className="py-2 px-3 text-right text-midnight-navy">
                  {c.avg_position != null ? c.avg_position.toFixed(1) : "—"}
                </td>
                <td className="py-2 px-3 text-right text-midnight-navy">
                  {c.top_10_count.toLocaleString()}
                </td>
                <td className="py-2 px-3 text-right text-midnight-navy">
                  {c.keywords_tracked.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function YouTubePanel({
  loading,
  error,
  competitors,
}: {
  loading: boolean;
  error: string | null;
  competitors: YouTubeCompetitor[];
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-cloud bg-cloud/40 p-8 text-center">
        <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-intelligence-teal/60" />
        <p className="text-sm text-slate-gray">Loading YouTube advertisers…</p>
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
          No YouTube video-ad data yet.
        </p>
        <p className="mt-1 text-xs text-slate-gray">
          The daily pipeline populates this from the Google Ads Transparency
          Center.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <p className="mb-3 text-xs text-slate-gray">
        Plaintiff firms running YouTube / video ads (Google Ads Transparency
        Center, national), ranked by active creatives and longevity. Firms are
        identified by domain.
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
              Active video ads
            </th>
            <th className="py-2 px-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Longest running
            </th>
            <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray">
              Last seen
            </th>
            <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-gray" />
          </tr>
        </thead>
        <tbody>
          {competitors.map((c, i) => (
            <tr key={c.advertiser_domain} className="border-b border-cloud/60">
              <td className="py-2 pr-2 text-slate-gray">{i + 1}</td>
              <td className="py-2 px-3">
                <a
                  href={`https://${c.advertiser_domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-midnight-navy hover:text-intelligence-teal"
                >
                  {c.advertiser_domain}
                  <ExternalLink className="w-3 h-3 text-slate-gray/50" />
                </a>
              </td>
              <td className="py-2 px-3 text-right font-mono text-midnight-navy">
                {c.active_creatives.toLocaleString()}
              </td>
              <td className="py-2 px-3 text-right text-midnight-navy">
                {c.longest_running_days != null
                  ? `${c.longest_running_days.toLocaleString()} days`
                  : "—"}
              </td>
              <td className="py-2 px-3 text-midnight-navy">{c.last_shown ?? "—"}</td>
              <td className="py-2 px-3">
                {c.advertiser_ar_id && (
                  <a
                    href={`https://adstransparency.google.com/advertiser/${c.advertiser_ar_id}?region=US`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-intelligence-teal hover:underline"
                  >
                    view ads
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
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
```

- [ ] **Step 2: Install deps (required before tsc)**

Run: `cd web && npm install`
Expected: completes without error.

- [ ] **Step 3: Type-check the changed file**

Run: `cd web && npx tsc --noEmit 2>&1 | grep "competitive-analysis"`
Expected: no output (no errors in this file).

- [ ] **Step 4: Build**

Run: `cd web && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add "web/app/(app)/state-intelligence/v2/[slug]/competitive-analysis.tsx"
git commit -m "feat(competitive-analysis): YouTube tab — firm-level video-ad ranking"
```

---

### Task 3: Docs + open PR

**Files:**
- Modify: `memory.md`
- Modify: `CURRENT_PRIORITIES.md`

- [ ] **Step 1: Log in memory.md**

Append to the bottom of the "Recent PRs / shipped work" section of `memory.md` a dated (2026-06-22) entry: Competitive Analysis Phase 4b — YouTube tab live; new `get_youtube_competitors` RPC (firm-level, national, aggregates `youtube_ad_creatives`, excludes `google.com`/`youtube.com` seed junk); YouTube tab in `competitive-analysis.tsx` has no filter control (national, no case-type tag) and a per-row "view ads" link to each firm's Google Ads Transparency page; domain-led identity (advertiser_name is often the agency). Note this completes the Competitive Analysis channel program except Traditional Media (pending) and TikTok (permanently out).

- [ ] **Step 2: Update CURRENT_PRIORITIES.md**

In §0 add a "Recently shipped" entry for Phase 4b (YouTube tab live). In the §2 **D. Competitive Analysis** track, move Phase 4b from "Next" to "Shipped" and note Traditional Media is now the only remaining channel.

- [ ] **Step 3: Commit docs**

```bash
git add memory.md CURRENT_PRIORITIES.md
git commit -m "docs(memory): log Competitive Analysis Phase 4b — YouTube tab"
```

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin feat/youtube-competitive-tab
gh pr create --title "Competitive Analysis Phase 4b: YouTube tab" --body "$(cat <<'EOF'
## Summary
Wires the **YouTube** tab on the v2 State Intelligence Competitive Analysis surface to the `youtube_ad_creatives` data shipped in Phase 4a (#430). Completes the YouTube channel end-to-end.

- **Migration `20260622020000`** — `get_youtube_competitors(p_limit=50)` RPC: firm-level, national aggregate of `youtube_ad_creatives` (active creatives, longest-running, last seen), domain-led, **excludes `google.com`/`youtube.com`** seed junk.
- **`competitive-analysis.tsx`** — YouTube panel: no filter control (national, no case-type), table of # · Firm (domain) · Active video ads · Longest running · Last seen, plus a per-row **"view ads ↗"** link to the firm's Google Ads Transparency page.

## Notes
- Firm-level + national by design (Transparency video carries no case-type tag, no DMA). Same firm list on every state page — the "measured nationally" note makes this explicit.
- RPC uses the untyped `.rpc()` cast; `database.types.ts` regen is post-merge.

## Testing
- RPC body validated read-only against prod (real PI firms ranked; `google.com` filtered out).
- `npm run build` + `tsc` green (no net-new errors in the changed file).
- Post-merge: browser-verify on prod (CLAUDE.md §2.7) — YouTube tab renders the firm ranking, "view ads" opens the right Transparency page, no DMA/case-type control, network 2xx, no console errors.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL printed; `pr-typecheck` + Vercel checks pass.

---

## Post-merge (operational follow-up, not a task)

1. Confirm the migration auto-applied (re-run `supabase-migrations` if it hits the known `setup-cli` rate-limit transient).
2. Browser-verify on prod per CLAUDE.md §2.7.
3. Regenerate `web/lib/database.types.ts` so the new RPC is typed (standing post-schema-change practice).
</content>
