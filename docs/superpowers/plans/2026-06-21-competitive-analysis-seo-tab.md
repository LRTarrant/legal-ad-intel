# Competitive Analysis Phase 2 — SEO tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Light up the SEO tab on the v2 State Intelligence "Competitive Analysis" surface with national organic-search competition data, filtered by PI case type.

**Architecture:** A new organic-only Postgres RPC (`get_seo_competitors_by_tort`) aggregates `serp_results_normalized`; the existing `competitive-analysis.tsx` gains an SEO panel that swaps the DMA dropdown for a case-type dropdown (organic data has no geo dimension). Two PI case types (motorcycle, boating) missing from the SERP pipeline are added via a keyword config change + `torts` seed so their data accrues.

**Tech Stack:** Supabase Postgres (SQL RPC, `SECURITY DEFINER`), Next.js 16 / React 19 client component, Python 3.12 ETL (`serp_intel_daily.py`), pytest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-21-competitive-analysis-seo-tab-design.md`.
- SEO data is **national** — no DMA/state/metro dimension. The SEO tab must not imply geo filtering; show a "measured nationally" note.
- Case-type set (slug → label), exact: `motor_vehicle`→Motor Vehicle, `truck_accident`→Truck, `motorcycle`→Motorcycle, `boating`→Boating, `nursing_home`→Nursing Home, `workers_comp`→Workers' Comp.
- RPC is **organic-only** (`result_type = 'organic'`). Do NOT reuse `get_serp_visibility_windowed` (it blends paid + organic).
- Show **all** organic domains, not just law firms; lightly tag known directory/aggregator domains.
- Migrations are applied by the user / auto-apply on merge (CLAUDE.md §3). Do NOT apply via Supabase MCP (desyncs migration history — memory rule). Validate RPC logic read-only against prod, then commit; it applies on merge.
- RPC calls use the untyped `getSupabase().rpc()` cast pattern from Phase 1 — no `database.types.ts` regen needed pre-merge.
- Project: Supabase `project_id = inmktpwhpkiknctznrys`. Branch: `feat/competitive-analysis-seo`.
- TypeScript: run `npx tsc --noEmit` only AFTER `npm install` in `web/`. `pr-typecheck.yml` fails only on net-new errors vs main.

---

### Task 1: SEO competitors RPC + PI torts seed (migration)

**Files:**
- Create: `supabase/migrations/20260621000000_add_seo_competitors_rpc_and_pi_torts.sql`

**Interfaces:**
- Produces: RPC `get_seo_competitors_by_tort(p_tort_slug TEXT, p_days INTEGER DEFAULT 90)` returning rows of `(domain TEXT, advertiser_name TEXT, organic_appearances BIGINT, avg_position NUMERIC, best_position INTEGER, top_3_count BIGINT, top_10_count BIGINT, keywords_tracked BIGINT, first_seen DATE, last_seen DATE)`. Consumed by Task 3.
- Produces: `torts` rows `motorcycle` + `boating` (category `personal_injury`). Consumed by Task 2 (pipeline picks up only slugs present in `torts`).

- [ ] **Step 1: Confirm no migration timestamp collision**

Run: `ls supabase/migrations/ | grep ^20260621`
Expected: no output (empty). If anything returns, bump the filename timestamp (e.g. `20260621010000`) before continuing.

- [ ] **Step 2: Validate the RPC body logic read-only against prod (the "failing test")**

Before writing the function, run its SELECT body inline against prod with a literal slug to confirm it returns sane rows. Use the Supabase MCP `execute_sql` (read-only SELECT — safe, not a schema change), `project_id = inmktpwhpkiknctznrys`:

```sql
SELECT
    n.domain,
    MAX(ae.canonical_name) AS advertiser_name,
    COUNT(*) AS organic_appearances,
    ROUND(AVG(n.position)::numeric, 1) AS avg_position,
    MIN(n.position) AS best_position,
    COUNT(*) FILTER (WHERE n.position IS NOT NULL AND n.position <= 3) AS top_3_count,
    COUNT(*) FILTER (WHERE n.position IS NOT NULL AND n.position <= 10) AS top_10_count,
    COUNT(DISTINCT n.query) AS keywords_tracked,
    MIN(n.fetched_at)::date AS first_seen,
    MAX(n.fetched_at)::date AS last_seen
FROM public.serp_results_normalized n
LEFT JOIN public.advertiser_entities ae ON ae.id = n.advertiser_entity_id
WHERE n.result_type = 'organic'
  AND n.tort_slug = 'motor_vehicle'
  AND n.fetched_at >= now() - (90 || ' days')::interval
GROUP BY n.domain
ORDER BY organic_appearances DESC
LIMIT 50;
```

Expected: a non-empty ranked list of domains (e.g. firm + directory domains like forbes.com/nolo.com), `organic_appearances` descending, `avg_position` between 1 and ~100, `top_10_count <= organic_appearances`. If empty or nonsensical, stop and re-check column names against the spec's data inventory before writing the migration.

- [ ] **Step 3: Write the migration file**

Create `supabase/migrations/20260621000000_add_seo_competitors_rpc_and_pi_torts.sql`:

```sql
-- ============================================================================
-- Competitive Analysis Phase 2 (SEO tab): organic-only competitor RPC + the two
-- PI torts (motorcycle, boating) the SEO surface needs but the SERP pipeline
-- did not yet track.
--
-- SEO data (serp_results_normalized) is NATIONAL — no geo dimension — so this
-- RPC is keyed on tort_slug, NOT DMA. Organic-only on purpose:
-- get_serp_visibility_windowed blends paid + organic and is unsuitable here.
-- ============================================================================

-- 1. PI torts the SERP pipeline will start tracking (keyed by ad pipeline; these
--    are NOT mass_torts advertising pages, so no tort-page registration needed).
INSERT INTO public.torts (slug, label, category)
VALUES
    ('motorcycle', 'Motorcycle Accident', 'personal_injury'),
    ('boating',    'Boating Accident',    'personal_injury')
ON CONFLICT (slug) DO NOTHING;

-- 2. Organic SEO competitors for a case type, national, last p_days window.
CREATE OR REPLACE FUNCTION public.get_seo_competitors_by_tort(
    p_tort_slug TEXT,
    p_days INTEGER DEFAULT 90
)
RETURNS TABLE (
    domain TEXT,
    advertiser_name TEXT,
    organic_appearances BIGINT,
    avg_position NUMERIC,
    best_position INTEGER,
    top_3_count BIGINT,
    top_10_count BIGINT,
    keywords_tracked BIGINT,
    first_seen DATE,
    last_seen DATE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        n.domain,
        MAX(ae.canonical_name) AS advertiser_name,
        COUNT(*) AS organic_appearances,
        ROUND(AVG(n.position)::numeric, 1) AS avg_position,
        MIN(n.position) AS best_position,
        COUNT(*) FILTER (WHERE n.position IS NOT NULL AND n.position <= 3) AS top_3_count,
        COUNT(*) FILTER (WHERE n.position IS NOT NULL AND n.position <= 10) AS top_10_count,
        COUNT(DISTINCT n.query) AS keywords_tracked,
        MIN(n.fetched_at)::date AS first_seen,
        MAX(n.fetched_at)::date AS last_seen
    FROM public.serp_results_normalized n
    LEFT JOIN public.advertiser_entities ae ON ae.id = n.advertiser_entity_id
    WHERE n.result_type = 'organic'
      AND n.tort_slug = p_tort_slug
      AND n.fetched_at >= now() - (p_days || ' days')::interval
    GROUP BY n.domain
    ORDER BY organic_appearances DESC
    LIMIT 50;
$$;

COMMENT ON FUNCTION public.get_seo_competitors_by_tort(TEXT, INTEGER) IS
    'Organic-search competitors (all domains, not just firms) for a PI case '
    'type over the last p_days. NATIONAL — serp_results_normalized has no geo '
    'dimension. Aggregated from serp_results_normalized (result_type=organic).';

GRANT EXECUTE ON FUNCTION public.get_seo_competitors_by_tort(TEXT, INTEGER)
    TO anon, authenticated, service_role;
```

- [ ] **Step 4: Verify the file is syntactically self-consistent**

Run: `grep -c "get_seo_competitors_by_tort" supabase/migrations/20260621000000_add_seo_competitors_rpc_and_pi_torts.sql`
Expected: `3` (CREATE, COMMENT, GRANT).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260621000000_add_seo_competitors_rpc_and_pi_torts.sql
git commit -m "feat(competitive-analysis): SEO competitors RPC + motorcycle/boating torts"
```

---

### Task 2: Add motorcycle + boating SERP keywords

**Files:**
- Modify: `pipeline/pipelines/serp_intel_daily.py` (the `SERP_SEARCH_TERMS` dict, after the `workers_comp` line ~84)
- Create: `pipeline/tests/test_serp_keywords.py`

**Interfaces:**
- Consumes: `torts` rows from Task 1 (the pipeline skips slugs not in `torts`; documented dependency, not a code import).
- Produces: SERP ingest for `motorcycle` + `boating` on the next daily run (data accrues over days).

- [ ] **Step 1: Write the failing test**

Create `pipeline/tests/test_serp_keywords.py`:

```python
from pipelines.serp_intel_daily import SERP_SEARCH_TERMS


def test_motorcycle_keywords_present():
    assert "motorcycle" in SERP_SEARCH_TERMS
    assert len(SERP_SEARCH_TERMS["motorcycle"]) >= 2


def test_boating_keywords_present():
    assert "boating" in SERP_SEARCH_TERMS
    assert len(SERP_SEARCH_TERMS["boating"]) >= 2
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd pipeline && pytest tests/test_serp_keywords.py -v`
Expected: 2 FAILS (`assert "motorcycle" in SERP_SEARCH_TERMS` → KeyError-style assertion failure; both slugs absent).

- [ ] **Step 3: Add the keywords**

In `pipeline/pipelines/serp_intel_daily.py`, immediately after the `"workers_comp":` line in `SERP_SEARCH_TERMS`, add:

```python
    "motorcycle":        ["motorcycle accident lawyer", "motorcycle accident attorney"],
    "boating":           ["boat accident lawyer", "boating accident attorney"],
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd pipeline && pytest tests/test_serp_keywords.py -v`
Expected: 2 PASS.

- [ ] **Step 5: Run the full pipeline test suite (no regressions)**

Run: `cd pipeline && pytest tests/ -q`
Expected: all pass (no new failures introduced).

- [ ] **Step 6: Commit**

```bash
git add pipeline/pipelines/serp_intel_daily.py pipeline/tests/test_serp_keywords.py
git commit -m "feat(serp): track motorcycle + boating PI keywords"
```

---

### Task 3: SEO panel + case-type dropdown in competitive-analysis.tsx

**Files:**
- Modify (rewrite whole): `web/app/(app)/state-intelligence/v2/[slug]/competitive-analysis.tsx`

**Interfaces:**
- Consumes: RPC `get_seo_competitors_by_tort(p_tort_slug, p_days)` from Task 1.
- Produces: an interactive SEO tab (no downstream consumers).

Rewrite the whole file (per repo convention — one write beats many edits) with the content below. This preserves the entire Phase 1 Paid Search path and adds: SEO state + loader, a case-type dropdown shown when the SEO tab is active (DMA dropdown shown only for Paid Search), and a `SeoPanel`.

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
/*  results, filtered by PI case type. Organic data is NATIONAL (no   */
/*  geo dimension) so the SEO tab swaps the DMA dropdown for a case-  */
/*  type dropdown and labels its scope national.                      */
/*  YouTube (Phase 4) is "coming soon". TikTok is disabled — TikTok   */
/*  publishes no US ad library (EU/UK DSA only).                      */
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

  const selectedDmaLabel =
    selectedDma === "all"
      ? "all markets"
      : (dmaOptions.find((d) => d.dma_code === selectedDma)?.display_name ??
        "this market");

  const selectedCaseLabel =
    SEO_CASE_TYPES.find((c) => c.slug === selectedCaseType)?.label ?? "this case type";

  return (
    <div className="rounded-lg border border-intelligence-teal/20 bg-gradient-to-br from-intelligence-teal/[0.04] to-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Swords className="w-4.5 h-4.5 text-intelligence-teal" />
        <h2 className="font-heading text-2xl font-bold text-midnight-navy">
          Competitive Analysis
        </h2>
      </div>
      <p className="mb-4 text-sm text-slate-gray">
        {activeChannel === "seo"
          ? `Organic-search competition for PI case types (measured nationally)`
          : `PI-firm advertising competition in ${stateName}, filtered by DMA market`}
      </p>

      {/* Filter control — DMA for Paid Search, case type for SEO */}
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
      ) : activeChannel === "tiktok" ? (
        <ComingSoon
          title="TikTok competitive data is not available in the U.S."
          body="TikTok only publishes an ad library for the EU/UK (DSA mandate); there is no U.S. ad-library source to attribute ads to firms. We'll wire this up if that changes."
        />
      ) : (
        <ComingSoon
          title={`YouTube competition for ${stateName}`}
          body="Wiring in a follow-up — PI-firm presence on this channel."
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

- [ ] **Step 3: Type-check**

Run: `cd web && npx tsc --noEmit 2>&1 | grep "competitive-analysis"`
Expected: no output (no errors in this file). The repo has a known baseline of unrelated errors; only this file must be clean.

- [ ] **Step 4: Build**

Run: `cd web && npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add "web/app/(app)/state-intelligence/v2/[slug]/competitive-analysis.tsx"
git commit -m "feat(competitive-analysis): SEO tab — national organic competition by case type"
```

---

### Task 4: Docs + open PR

**Files:**
- Modify: `memory.md`
- Modify: `CURRENT_PRIORITIES.md`

- [ ] **Step 1: Log the work in memory.md**

Append to the "Recent PRs / shipped work" section of `memory.md` a dated entry covering: SEO tab is Phase 2 of Competitive Analysis; data is national organic from `serp_results_normalized` (no geo — SEO tab uses a case-type dropdown, not DMA); new organic-only RPC `get_seo_competitors_by_tort` (do NOT reuse `get_serp_visibility_windowed`, which blends paid); motorcycle + boating added to the SERP pipeline + `torts` and accrue over days; all organic domains shown with directory tagging. Also note Phase 1 (PR #428) reference.

- [ ] **Step 2: Update CURRENT_PRIORITIES.md**

Add a short "Recently shipped" entry for the Competitive Analysis SEO tab and note the program's next channels (YouTube = Phase 4; Traditional Media pending; TikTok permanently out — no US data).

- [ ] **Step 3: Commit docs**

```bash
git add memory.md CURRENT_PRIORITIES.md
git commit -m "docs(memory): log Competitive Analysis Phase 2 — SEO tab"
```

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin feat/competitive-analysis-seo
gh pr create --title "Competitive Analysis Phase 2: SEO by case type" --body "$(cat <<'EOF'
## Summary
Lights up the **SEO** tab on the v2 State Intelligence Competitive Analysis surface (follows PR #428, Paid Search).

- **Migration `20260621000000`** — `get_seo_competitors_by_tort(p_tort_slug, p_days=90)` (organic-only, national; NOT the paid-blending windowed RPC) + `torts` seed for `motorcycle` + `boating`.
- **`serp_intel_daily.py`** — adds motorcycle + boating keyword pairs; their organic data accrues over the next daily runs.
- **`competitive-analysis.tsx`** — SEO panel + a case-type dropdown (organic data is national, so no DMA filter); shows all organic domains ranked, with directory/aggregator tagging.

## Notes
- SEO is national by design — the same competitor set renders on every state page for a given case type. The "measured nationally" note makes this explicit.
- Motorcycle/Boating show an "accruing" empty state until the pipeline backfills them.
- RPC uses the Phase 1 untyped `.rpc()` cast; `database.types.ts` regen is post-merge.

## Testing
- Pipeline keyword test added (`pytest tests/test_serp_keywords.py`); full suite green.
- RPC body validated read-only against prod (sane ranked rows for `motor_vehicle`).
- `npm run build` + `tsc` green (no net-new errors in the changed file).
- Post-merge: browser-verify on prod per CLAUDE.md §2.7 (SEO tab renders real competitors on 2+ states, case-type switch refetches, network 2xx, no console errors, screenshot).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL printed. CI (`pr-typecheck` + Vercel) should go green.

---

## Post-merge (not a task — operational follow-up)

1. Confirm the migration auto-applied (re-run `supabase-migrations` if it hits the known `setup-cli` rate-limit transient: `gh run rerun --failed <id>`).
2. Browser-verify on prod per CLAUDE.md §2.7.
3. After a daily SERP run or two, confirm `motorcycle`/`boating` rows appear: `SELECT tort_slug, COUNT(*) FROM serp_results_normalized WHERE tort_slug IN ('motorcycle','boating') GROUP BY tort_slug;`
4. Regenerate `web/lib/database.types.ts` so the new RPC is typed (per the standing decision to regen after schema changes).
</content>
</invoke>
