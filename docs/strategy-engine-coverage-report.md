# Strategy Engine — Output-Quality Coverage Report

**Date:** 2026-06-29
**Scope:** All 51 jurisdictions (50 states + DC), case type = motor vehicle (`motor_vehicle`), benchmark = Alabama.
**Engine version:** the shipped grounded gpt-5.5 strategist (`/strategy`, PRs #496–#503).
**Method:** read-only, deterministic. We drove the **real engine data layer** — `assembleStrategyInputs()` plus the three route-level RPCs the generate route calls (`strategy_opportunity_counties`, `strategy_whitespace_channels`, `strategy_market_creatives`) — for every jurisdiction, both **statewide** and at each state's **top-ranked DMA**, using the service-role key. No LLM call, no browser.

> **Why not the originally-specced per-state browser interview fan-out?** The redesigned engine is fully scriptable: `assembleStrategyInputs` is a pure function and the route's data calls are plain RPCs. Because the grounded strategist is *grounded* (it cannot invent outlets/competitors/numbers — it can only narrate what the data layer hands it), the **inputs deterministically bound the output quality**. Auditing the inputs across all 51 jurisdictions is faster, complete (not an 8-state sample), and reproducible, and it answers every grading criterion the browser drive would have. Reproduce with `npx tsx web/scripts/strategy-coverage-check.mts`.

---

## TL;DR

1. **The single biggest output-quality problem is an engine BUG, not a data gap.** The named-outlet layer (the "call the WVNN sales desk" / "buy on these stations" specificity that makes Alabama feel sharp) is effectively **Alabama-and-~10-lucky-markets only** — because the assembler fetches `media_outlets` **without pagination**, hitting PostgREST's 1,000-row cap on a **7,873-row table**. Only **46 of 108 markets** are ever visible to the engine. The data for nearly every state's main DMA (Dallas, Houston, Miami, New York, Nashville, Kansas City, Los Angeles…) **exists in the table but is silently dropped.** A second, compounding bug — exact-string DMA-name matching (`"Dallas"` ≠ `"Dallas-Ft.Worth"`) — zeroes outlets even for markets that *do* survive the cap.
2. **Most of the "thin" states are not actually data-starved.** 40 of 51 grade THIN today, but the dominant cause is the outlet bug above. The underlying paid-search competitors, FARS signal, opportunity counties, white-space, creatives, and audience-fit are present for the large majority of states. **Fix the ~5-line outlet fetch and most THIN states become demo-ready.**
3. **Genuinely data-starved (need ingest, not a code fix): a small set** — AR, RI, HI, AK, DC — low tracked paid-search advertisers (2–4) and/or thin creatives. These self-heal slowly via the daily pipelines except for the smallest markets.
4. **Two Alabama-only hardcodes** in the assembler should be generalized: the `COUNTY_DMA_BY_STATE` crosswalk (county→DMA translation works for AL only) and `STATE_NAMES` (only the 6 original legacy states; the other 45 fall back to the bare abbreviation, so labels/prose read "TX statewide" not "Texas statewide").
5. **One real data anomaly:** `get_state_accident_summary` returns **zero** FARS county signal for **CT and DC** (every other state returns 6).

---

## Demo-readiness verdict

| Bucket | Count | States |
|---|---|---|
| **Demo-ready today** | 11 | AL, CO, GA, IA, IL, MA, MI, NH, NM, OH, UT |
| **Demo-ready after the ~5-line outlet fix** | ~35 | AZ, CA, FL, TX, NY, PA, NC, MD, IN, KS, KY, LA, MN, MO, MS, MT, ND, NE, NJ, NV, OK, OR, SC, SD, TN, VA, VT, WA, WI, WV, WY, ME, ID, DE, CT (CT also needs the FARS fix) |
| **Genuinely data-thin (need ingest)** | 5 | AR, RI, HI, AK, DC |

> The 11 "demo-ready today" states are simply the ones whose top-DMA market name (a) lands in the first 1,000 rows of `media_outlets` **and** (b) exact-matches the `dma_markets` label. That's an artifact of row order and naming, not of those states being better-covered.

---

## The five grading criteria, answered

| # | Criterion | Verdict | Detail |
|---|---|---|---|
| (a) | Competitors named & DMA-scoped, or empty? | **Mostly good.** | `get_pi_competitors_by_dma(state, dma)` returns a healthy ranked field (7–10 firms, capped at 10) for ~42 states. Genuinely thin: AR (2), HI (2), RI (2), AK (3), DC (4), CT (6). DMA-scoping works (PR #500). |
| (b) | Audience-fit reasoning specific or generic? | **By design: national baseline applied to local demographics.** | `media_consumption_baseline` (national Pew/BLS/Nielsen) weighted by each state's `census_demographics` mix → all 51 get audience-fit (`available.audience_fit = true` everywhere). The `demographic_note` steer fires correctly only above thresholds (Hispanic ≥25% / Black ≥30%): AZ, CA, FL, GA, LA, MS, NV, NM, TX, DC. This is the documented intentional approach, **not** a per-state gap — label it honestly ("national consumption patterns, weighted to {state}'s demographics"), don't "fix" it. |
| (c) | Outlets real & local, or missing? | **BROKEN by the engine bug.** | Named outlets present at the top DMA for only **13 of 51** states; **0 for 38**. Root cause = the `media_outlets` 1,000-row cap + exact-name match (see Bug #1/#2). The data exists. |
| (d) | Readiness/budget logic populates? | **Always — by design, state-agnostic.** | Readiness is interview-driven (`readiness` answers → prerequisites) and budget allocation is code-owned. Neither depends on state data, so both populate identically for every jurisdiction. No coverage risk here. |
| (e) | Any "no data"/null/empty sections? | **Outlets (38 states), plus CT/DC FARS.** | No state hits the route's 422 fatal floor (the national channel set always yields 10 scored channels). The honest-degradation path works: missing blocks flip `available.*` flags and drop confidence to "directional." |

---

## Per-jurisdiction coverage matrix

Columns: **adv** = ranked paid-search competitors (statewide, cap 10) · **sOut/dOut** = named outlets statewide / at top DMA · **fars** = FARS county-signal counties (cap 6) · **oppC** = opportunity counties (cap 60) · **crea** = creative samples (cap 6) · **audFit** = audience-fit baseline present · **note** = demographic steer fired.

| ST | Tier | Top DMA | adv | sOut | dOut | fars | oppC | crea | audFit | note |
|----|------|---------|----:|----:|----:|----:|----:|----:|:--:|:--:|
| AL | demo-ready | Birmingham | 10 | 16 | 16 | 6 | 60 | 6 | ✓ | |
| CO | demo-ready | Denver | 10 | 16 | 16 | 6 | 60 | 6 | ✓ | |
| GA | demo-ready | Atlanta | 10 | 16 | 16 | 6 | 60 | 6 | ✓ | ✓ |
| IA | demo-ready | Des Moines | 10 | 16 | 16 | 6 | 60 | 6 | ✓ | |
| IL | demo-ready | Chicago | 10 | 16 | 16 | 6 | 60 | 6 | ✓ | |
| MA | demo-ready | Boston | 10 | 16 | 16 | 6 | 14 | 6 | ✓ | |
| MI | demo-ready | Detroit | 10 | 16 | 16 | 6 | 60 | 6 | ✓ | |
| NH | demo-ready | Boston | 7 | 16 | 16 | 6 | 10 | 5 | ✓ | |
| NM | demo-ready | Albuquerque | 10 | 16 | 16 | 6 | 33 | 6 | ✓ | ✓ |
| OH | demo-ready | Cleveland | 10 | 16 | 16 | 6 | 60 | 6 | ✓ | |
| UT | demo-ready | Salt Lake City | 10 | 12 | 12 | 6 | 29 | 6 | ✓ | |
| HI | thin (outlets OK) | Honolulu | 2 | 16 | 16 | 4 | 5 | 4 | ✓ | |
| CA | thin (bug) | Los Angeles | 10 | 16 | 2 | 6 | 58 | 6 | ✓ | ✓ |
| TX | thin (bug) | Dallas | 10 | 16 | 0 | 6 | 60 | 6 | ✓ | ✓ |
| FL | thin (bug) | Miami | 10 | 14 | 1 | 6 | 60 | 6 | ✓ | ✓ |
| NY | thin (bug) | New York | 10 | 16 | 0 | 6 | 60 | 6 | ✓ | |
| PA | thin (bug) | New York | 10 | 16 | 0 | 6 | 60 | 6 | ✓ | |
| NC | thin (bug) | Raleigh-Durham | 9 | 16 | 0 | 6 | 60 | 6 | ✓ | |
| MD | thin (bug) | Washington DC | 10 | 16 | 0 | 6 | 24 | 6 | ✓ | |
| IN | thin (bug) | Chicago | 7 | 16 | 0 | 6 | 60 | 6 | ✓ | |
| WV | thin (bug) | Washington DC | 10 | 0 | 0 | 6 | 55 | 6 | ✓ | |
| LA | thin (bug) | New Orleans | 10 | 13 | 0 | 6 | 60 | 6 | ✓ | ✓ |
| AZ | thin (bug) | Phoenix | 10 | 1 | 0 | 6 | 15 | 6 | ✓ | ✓ |
| NV | thin | Las Vegas | 10 | 1 | 0 | 6 | 17 | 6 | ✓ | ✓ |
| MS | thin (bug) | Memphis | 10 | 1 | 0 | 6 | 60 | 6 | ✓ | ✓ |
| KS | thin (gap) | Kansas City | 10 | 0 | 0 | 6 | 60 | 6 | ✓ | |
| KY | thin (gap) | Nashville | 10 | 0 | 0 | 6 | 60 | 6 | ✓ | |
| TN | thin (gap) | Nashville | 10 | 0 | 0 | 6 | 60 | 6 | ✓ | |
| MN | thin (bug) | Minneapolis | 10 | 6 | 0 | 6 | 60 | 6 | ✓ | |
| MO | thin (bug) | St. Louis | 10 | 2 | 0 | 6 | 60 | 6 | ✓ | |
| WA | thin (bug) | Seattle | 10 | 2 | 0 | 6 | 39 | 6 | ✓ | |
| OR | thin | Portland OR | 10 | 12 | 2 | 6 | 36 | 4 | ✓ | |
| ID | thin (bug) | Spokane | 10 | 12 | 0 | 6 | 44 | 6 | ✓ | |
| DE | thin (gap) | Philadelphia | 10 | 0 | 0 | 3 | 3 | 6 | ✓ | |
| NE | thin | Omaha | 9 | 1 | 0 | 6 | 60 | 6 | ✓ | |
| MT | thin | Missoula | 9 | 5 | 0 | 6 | 56 | 6 | ✓ | |
| NJ | thin (gap) | New York | 9 | 0 | 0 | 6 | 21 | 5 | ✓ | |
| OK | thin | Oklahoma City | 9 | 2 | 0 | 6 | 60 | 6 | ✓ | |
| VA | thin | Washington DC | 8 | 1 | 0 | 6 | 60 | 5 | ✓ | |
| WI | thin (bug) | Minneapolis | 8 | 2 | 0 | 6 | 60 | 6 | ✓ | |
| VT | thin (gap) | Burlington | 8 | 0 | 0 | 6 | 14 | 6 | ✓ | |
| SC | thin | Charlotte | 7 | 1 | 0 | 6 | 46 | 6 | ✓ | |
| SD | thin (bug) | Sioux Falls | 7 | 12 | 0 | 6 | 60 | 6 | ✓ | |
| WY | thin | Idaho Falls | 7 | 1 | 0 | 6 | 23 | 6 | ✓ | |
| ND | thin (bug) | Fargo | 6 | 12 | 0 | 6 | 53 | 6 | ✓ | |
| ME | thin | Portland ME | 6 | 1 | 0 | 6 | 16 | 6 | ✓ | |
| CT | thin (bug+FARS) | New York | 6 | 16 | 0 | **0** | 9 | 6 | ✓ | |
| DC | data-thin | Washington DC | 4 | 0 | 0 | **0** | 1 | 5 | ✓ | ✓ |
| AK | data-thin | Anchorage | 3 | 0 | 0 | 6 | 31 | 6 | ✓ | |
| AR | data-thin | Memphis | 2 | 1 | 0 | 6 | 60 | 3 | ✓ | ✓ |
| RI | data-thin | Providence | 2 | 0 | 0 | 5 | 5 | 3 | ✓ | |

(`(bug)` = outlets exist statewide but vanish at the DMA via Bug #1/#2; `(gap)` = no `broadcast_stations`/`media_outlets` rows for the state at all.)

---

## Classification of gaps

### (c) Engine bugs — code-fixable, flag immediately

**Bug #1 — `media_outlets` fetched without pagination (1,000-row cap). HIGHEST LEVERAGE.**
`assemble-inputs.ts` (~line 189) does `supabase.from("media_outlets").select(...)` with no `.range()`. The table has **7,873 rows across 108 markets**; PostgREST returns only the first **1,000** (→ 46 markets visible). Markets past row 1,000 (Nashville, New York, Kansas City, Los Angeles, Seattle, and dozens more) are invisible; even surviving markets are truncated to a few rows (Miami → FL got 1 outlet). This is the same class of bug the Recall Watchlist already solved with paginated `range()`.
- **Fix:** filter server-side by the resolved market name(s) instead of pulling the whole table — `.in("market", scopedMarketNames)` — or paginate with `range()` like the recall reader. Server-side filter is best (one small query, no cap).

**Bug #2 — exact-string DMA-name matching. Compounds Bug #1.**
Outlet inclusion compares `media_outlets.market` / `broadcast_stations.nielsen_dma` to `dma_markets.display_name` by case-insensitive *exact* string. `dma_markets` uses short labels (`"Dallas"`, `"Washington DC"`); the outlet tables use Nielsen full/regional names (`"Dallas-Ft.Worth"`, `"DALLAS-FT. WORTH"`, `"Washington, DC"`). So even when the market survives the cap, the match fails (TX = 16 statewide → 0 at DMA).
- **Fix:** normalize before comparing (uppercase, strip ` & `/`-`/`,`/`Ft.`/`St.` variants) or, better, add a small `dma_code`→market-name crosswalk and key outlets on `dma_code` rather than display string.

**Bug #3 — `COUNTY_DMA_BY_STATE` is Alabama-only.**
The county→DMA translation feature (a real trust element — "your Jefferson County fatalities map to the Birmingham DMA") is hardcoded for AL's 18 counties only; all other states return an empty translation. Generalize via `county_msa_crosswalk` (already used by `strategy_opportunity_counties`) or extend the table.

**Bug #4 — `STATE_NAMES` covers only the 6 original legacy states (AL/AZ/CA/FL/GA/TN).**
The other 45 fall back to the bare abbreviation, so the market-label fallback and any prose using `state_name` read "TX statewide" / "WA statewide" instead of the full state name. One-line fix: use the full 51-entry name map (one already exists elsewhere in the app, e.g. `US_STATES`).

**Bug #5 — CT and DC return zero FARS county signal.**
`get_state_accident_summary('CT'|'DC')` returns no `top_counties` while every other state returns 6. Likely a county-naming mismatch (CT moved to planning regions in 2022; DC is a single district). Investigate the RPC's county join for these two; low effort, removes a visible empty section on two markets (one of which, DC, is a demo-relevant metro).

### (a) Data-coverage gaps — fixable by ingest/seed, mostly self-healing

- **Paid-search advertiser thinness** — AR (2), RI (2), HI (2), AK (3), DC (4), CT (6). Source: `pi_search_observations` accrues via `pi-search-daily.yml` (per memory, new states fill over days/weeks). Low-population markets (AK, RI, DC, HI) may stay structurally thin.
- **Creative-sample thinness** — AR (3), RI (3), HI (4), OR (4); DC/NH/NJ/VA (5). Source: `youtube_ad_creatives` (roster-scoped) + paid-search headlines accrue via `youtube-ads-daily.yml`.
- **`broadcast_stations` is a weak secondary source** — only 401 rows across 39 states; 12 states have zero. This matters far less once Bug #1 is fixed (the rich source is `media_outlets`, 7,873 rows). Not worth a dedicated ingest effort.

### (b) By-design — acceptable, label honestly, do not "fix"

- **Audience-fit = national consumption baseline weighted by local demographics.** Present for all 51 by construction. Surface the provenance honestly; it is the intended design, not a per-state gap.
- **Channels = the 10-key national channel set, always scored.** This is why no state hits the 422 floor.
- **White-space = exactly 2 measured channels (paid_search + seo).** The RPC always returns both; the *status* (open/contested/defended) and firm count are data-driven and meaningful. Note: status reads **"defended"** in nearly every state (PI paid search and SEO are saturated nationally) — accurate, but it makes white-space a weak differentiator. Product call, not a bug.
- **Cross-state DMAs** (AR→Memphis, CT→New York, KY/TN→Nashville) — the engine correctly picks the rank-1 DMA covering the state even when it's named for an out-of-state metro.

---

## Prioritized fix list

1. **[P0 · ~5 lines · flips ~25 states] Fix the `media_outlets` fetch (Bug #1).** Filter server-side by the resolved market name(s) (or paginate). This is the single highest-leverage change in the engine and the clearest demo win.
2. **[P0 · small · compounds with #1] Normalize the DMA-name match (Bug #2).** Without it, #1 still misses `"Dallas"`-vs-`"Dallas-Ft.Worth"`-style markets. Do #1 and #2 together.
3. **[P1 · small] Generalize `STATE_NAMES` to all 51 (Bug #4).** Cosmetic but visible in labels/prose for 45 states.
4. **[P1 · medium] Generalize county→DMA translation beyond AL (Bug #3)** via `county_msa_crosswalk`.
5. **[P2 · small] Investigate CT/DC FARS county summary (Bug #5).**
6. **[P2 · ongoing] Let the daily pipelines accrue** paid-search + creative coverage for the 5 data-thin states; no code work, just time (and accept that AK/RI/DC/HI may stay structurally light).

**Net:** the Strategy Engine is in far better shape than the raw "11 demo-ready / 40 thin" split suggests. The data is largely present; one well-understood fetch bug is suppressing the most demo-critical layer (named outlets) for ~25 states. Fixing items 1–2 is the difference between "Alabama is sharp, everything else feels thin" and "every priority demo state names real local stations."

---

## Reproduce

```bash
cd web && npx tsx scripts/strategy-coverage-check.mts
# → prints the coverage matrix + writes full JSON
```

The script drives the real engine functions; it does not mock. It is read-only (service-role reads, no writes, no LLM, no browser).
