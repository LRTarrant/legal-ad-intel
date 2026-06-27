# Issue: `presence_score` over-ranks short-window, narrow-metro advertisers in Competitive Analysis

**Area:** Competitive Analysis (Paid Search tab) · `pi_competitor_profiles` · `pi_search_daily` pipeline
**Severity:** Medium — surfaces misleading "who dominates" rankings to users; erodes trust in the data
**Found:** 2026-06-27, validating an Alabama MVA/trucking competitive analysis against ground truth

## Summary

The Alabama Competitive Analysis page ranks Cunningham Bounds as the dominant paid-search PI advertiser (presence_score 85.0, avg position 1.2, 848 observations). A person who knows the Alabama market flagged this as wrong: Cunningham Bounds is a respected Mobile trial/referral firm, not the volume advertiser that owns PI search statewide. The data over-states them.

Root cause: `presence_score` and the table's sort key reward **raw observation volume** with no normalization for the **time window** an advertiser was observed in or how recently. A firm first seen ~2 months ago, active in only 2 of a state's metros, can outrank firms with genuine long-run statewide saturation simply by having a dense burst of recent scraped observations.

## Evidence (Alabama, as of 2026-06-27)

| Advertiser | presence_score | total_observations | metros_active | first_seen | Ground truth |
|---|---|---|---|---|---|
| Cunningham Bounds (cunninghambounds.com) | 85.0 | 848 | Mobile, Montgomery | 2026-04-18 | Mobile trial/referral firm, not statewide volume leader |
| Cunningham Bounds (google.com) | 79.0 | 402 | 4 metros | 2026-04-17 | duplicate entity (domain = google.com) |
| Wettermark Keith (seriousinjury.wkfirm.com) | 59.2 | 143 | 3 metros | 2026-04-17 | actually runs 200-300 Google ads; a true volume intake advertiser |
| Alexander Shunnarah (shunnarah.com) | 56.0 | 22 | 4 metros | 2026-05-04 | strongest brand/mind-share firm in the state |

The ranking inverts reality: the two firms that genuinely spend the most on paid search (Wettermark Keith) and own the most brand presence (Shunnarah) sit *below* a firm whose score is inflated by a recent observation burst in two metros. There is also a duplicate Cunningham Bounds row keyed to `google.com` (a domain-normalization miss).

## Root cause (code)

`pipeline/pipelines/pi_search_daily.py`, `step_build_profiles()` (~lines 338-393):

```python
# Find max observations for presence_score normalization  (~line 338)
...
obs_score   = (total_observations / max_obs) * 40        # ~line 377
metro_score = (len(metros_active) / total_state_metros) * 30
case_score  = ...                                         # case-type breadth
presence_score = round(obs_score + metro_score + case_score, 1)   # ~line 380
```

- `obs_score` is a flat count ratio. An advertiser observed densely over a short window scores the same as one observed steadily over a long window with the same total. There is **no per-day rate** and **no recency decay**.
- `total_observations` is also the table's sort key in the RPC.

`supabase/migrations/20260620000000_add_pi_dma_crosswalk_and_rpc.sql`, `get_pi_competitors_by_dma()` (~line 74):

```sql
ORDER BY total_observations DESC
```

The UI (`web/app/(app)/components/competitive/competitive-analysis-section.tsx`, `PaidPanel`) renders rows in the order the RPC returns them, so the sort key is what the user reads as "rank."

## Why it matters

Competitive Analysis is a flagship surface for all three LMI audiences (firms, media sellers, agencies). A media seller pitching against "the dominant advertiser" or a firm sizing up a market will act on this ranking. A ranking that a local expert can immediately falsify undermines the product's core promise of trustworthy intelligence.

## Proposed fix

Smallest safe change first; each is independently shippable.

1. **Normalize observations to a per-day rate over a fixed window.** Replace raw `total_observations` in `obs_score` with `observations_per_active_day` computed over a rolling 90-day window (`obs_in_window / days_observed`). This stops a short burst from outranking sustained presence. Keep `metro_score` and `case_score`.

2. **Add a minimum-window / confidence gate.** Advertisers with fewer than N active days or first_seen inside the last ~21 days get a "new / low-confidence" flag rather than a full presence_score, so a 2-month-old entity can't claim "dominant." Surface the flag in the UI.

3. **Re-sort the RPC by the normalized score, not raw `total_observations`.** Update `ORDER BY` in `get_pi_competitors_by_dma()` to the new rate-adjusted score (or expose both columns and let the UI sort).

4. **Fix the `google.com` duplicate entity.** Cunningham Bounds appears twice, once keyed to `google.com`. Add a domain-normalization / dedupe pass in the profile build so display links route to the real advertiser domain.

5. **UI honesty (independent of the math).** In `competitive-analysis-section.tsx`, relabel the metric column/header so it reads as "recent paid-search presence (rolling 90d)" rather than implying all-time dominance, and show first_seen / window so a thin sample is visible to the user. This is the lowest-risk change and can ship immediately while 1-4 are scoped.

## Acceptance criteria

- On the Alabama Paid Search tab, the ranking reflects sustained presence: a high-volume sustained advertiser (e.g. Wettermark Keith / Shunnarah-class) is not outranked by a 2-month, 2-metro entity solely on raw counts.
- New/low-sample advertisers are visibly flagged, not presented as dominant.
- No duplicate `google.com` advertiser rows.
- Methodology note in the UI states the window and that the score is a recent-presence signal, not all-time share.

## Files to touch

- `pipeline/pipelines/pi_search_daily.py` — `step_build_profiles()` scoring (items 1, 2, 4)
- `supabase/migrations/<new>.sql` — add normalized score column(s) + update `get_pi_competitors_by_dma()` ORDER BY (item 3); follows the append-only migration rule in CLAUDE.md §11
- `web/app/(app)/components/competitive/competitive-analysis-section.tsx` — column label + first_seen/window display (item 5)

## Notes

- This is a scoring/normalization fix, not a data-collection fix; the underlying observations are fine.
- Verify against a deployed environment per CLAUDE.md §2.7 after the RPC change (the Paid Search tab calls `get_pi_competitors_by_dma` client-side).
