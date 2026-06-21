# Competitive Analysis Phase 2 — SEO tab (design)

Date: 2026-06-21
Branch: `feat/competitive-analysis-seo`
Predecessor: PR #428 (Phase 1 — Paid Search by DMA)

## Goal

Wire the **SEO** channel tab on the v2 State Intelligence "Competitive Analysis"
surface (`web/app/(app)/state-intelligence/v2/[slug]/competitive-analysis.tsx`)
to real organic-search competition data. Phase 1 lit up Paid Search; this lights
up the next tab in the same component.

## Key constraint: SEO data is national, not geo

The organic data lives in `serp_results_normalized`, populated by
`pipeline/pipelines/serp_intel_daily.py`. That pipeline searches Google for
tort/PI keywords with **no geo targeting**, so every row is national — there is
no DMA, metro, or state dimension, and organic rank is a national game (a firm
ranks nationally, not per-metro).

Consequence: the SEO tab **cannot** mirror Phase 1's DMA filter. Decision
(approved): on the SEO tab, the DMA dropdown is replaced by a **case-type
dropdown**, with an explicit "Organic rankings are measured nationally" note so
the national scope is honest and unmistakable. The same competitor set therefore
renders on every state page for a given case type — correct, because organic
visibility is national.

## Data inventory (verified 2026-06-21, prod)

- `serp_results_normalized`: 72,926 rows; 59,327 organic; 29 `tort_slug`s; 2,352
  distinct organic domains; refreshed daily (last fetch was same-day).
- Existing aggregate `serp_visibility_scores` (44k rows) and RPC
  `get_serp_visibility_windowed(p_start, p_end, p_tort_slug)` exist but blend
  paid + organic in `avg_position` / `visibility_score`, so they are **not**
  reused for an organic-only surface.
- PI case types present with data: `motor_vehicle`, `truck_accident`,
  `nursing_home`, `workers_comp` (keywords at `serp_intel_daily.py:80-83`).
- **Absent**: `motorcycle`, `boating` — not in `SERP_SEARCH_TERMS` and not in the
  `torts` table (the pipeline skips any slug missing from `torts`).

## Scope (approved)

Case-type set for the SEO tab: **Motor Vehicle, Truck, Motorcycle, Boating,
Nursing Home, Workers' Comp.** Four have data today; Motorcycle + Boating are
added by this PR and fill in over subsequent daily runs (same "accrues over
days" pattern as the pi_metros rollout) — they show an "accruing" empty state
until then.

## Architecture

### 1. New RPC: `get_seo_competitors_by_tort(p_tort_slug text, p_days int default 90)`

Organic-only aggregation, mirroring the shape/conventions of Phase 1's
`get_pi_competitors_by_dma` (SQL, `SECURITY DEFINER`, `SET search_path = public`,
granted to anon/authenticated/service_role).

Returns, per `domain`, ranked by organic appearances (LIMIT 50):

| column | source |
|---|---|
| `domain` | `serp_results_normalized.domain` |
| `advertiser_name` | `advertiser_entities.canonical_name` via `advertiser_entity_id` LEFT JOIN, else NULL |
| `organic_appearances` | `COUNT(*) WHERE result_type='organic'` |
| `avg_position` | `AVG(position)` over organic rows only |
| `best_position` | `MIN(position)` |
| `top_3_count` | `COUNT(*) FILTER (position <= 3)` |
| `top_10_count` | `COUNT(*) FILTER (position <= 10)` |
| `keywords_tracked` | `COUNT(DISTINCT query)` |
| `first_seen` / `last_seen` | `MIN/MAX(fetched_at)::date` |

Filter: `result_type = 'organic' AND tort_slug = p_tort_slug AND fetched_at >=
now() - (p_days || ' days')::interval`. The 90-day window matches the kind of
recency the existing windowed RPC uses and keeps the set current as rankings move.

Migration filename: pick a fresh timestamp and `ls supabase/migrations/ | grep
^<ts>` first (per CLAUDE.md §11). Same migration seeds the two `torts` rows.

### 2. `torts` seed (same migration)

Insert rows for `motorcycle` and `boating` so `serp_intel_daily` will pick them
up (`slug`, `label`; `ON CONFLICT (slug) DO NOTHING`). Match the existing `torts`
row shape — inspect an existing PI row first; do not invent columns. These are
ad-pipeline keying rows, **not** `mass_torts` advertising pages, so no
three-touchpoint tort-page registration is needed.

### 3. Pipeline: add keywords

In `serp_intel_daily.py` `SERP_SEARCH_TERMS`:

```python
"motorcycle": ["motorcycle accident lawyer", "motorcycle accident attorney"],
"boating":    ["boat accident lawyer", "boating accident attorney"],
```

No other pipeline change. Runs nationally like the rest.

### 4. Frontend: `competitive-analysis.tsx` SEO panel

- `activeChannel === "seo"` renders a new `SeoPanel` (replaces the current
  `ComingSoon` branch for `seo`).
- When the SEO tab is active, hide the DMA dropdown and show a **case-type
  dropdown** instead (the six approved case types) + the national-scope note. The
  Paid Search tab keeps the DMA dropdown unchanged.
- `SeoPanel` calls `get_seo_competitors_by_tort` via the same untyped
  `getSupabase().rpc()` cast pattern Phase 1 uses (no `database.types.ts` gate;
  regen post-merge as usual).
- Table columns: rank, Domain (firm domains link out like Phase 1), Organic
  appearances, Avg position, Top-10, Keywords. Light tag on known
  directory/aggregator domains (e.g. nolo.com, justia.com, forbes.com,
  findlaw.com, lawyers.com, avvo.com, wikipedia.org) so firm rows read at a
  glance. Show **all** organic domains, not just firms.
- Loading / error / empty states reuse the Phase 1 visual patterns. Empty state
  copy for Motorcycle/Boating: "Organic data for this case type is accruing —
  check back over the next few days."

## Out of scope

- DMA/geo-targeted SEO (no per-metro organic pipeline).
- Reworking `get_serp_visibility_windowed` or `serp_visibility_scores`.
- YouTube (Phase 4) and Traditional Media tabs; TikTok stays disabled.
- Mass-tort case types on the state page (national, belong on per-tort pages).

## Testing / definition of done

- Build + lint + `tsc` green (run `npx tsc` only after `npm install`).
- Migration applies cleanly (no timestamp collision; verify with the grep).
- RPC returns sane rows for `motor_vehicle` against prod data before UI wiring.
- Browser-verify on prod after merge (CLAUDE.md §2.7): on 2+ state pages, SEO tab
  renders real organic competitors for a data-having case type, the case-type
  switch refetches, network 2xx, zero console errors, screenshot.
- Confirm a later daily run begins populating motorcycle/boating (follow-up
  check, not a merge blocker).

## Risks / notes

- Motorcycle/boating are empty at launch by design; the "accruing" empty state
  makes that honest. If a daily run does not pick them up, check the `torts` seed
  applied and the slug spelling matches `SERP_SEARCH_TERMS`.
- Same competitor list across states for a given case type is expected (national
  data) — the scope note prevents it reading as a bug.
</content>
</invoke>
