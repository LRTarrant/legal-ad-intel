# Competitive Analysis Phase 4b — YouTube tab (design)

Date: 2026-06-22
Branch: `feat/youtube-competitive-tab`
Predecessor: Phase 4a (#430) landed the data — `youtube_ad_creatives` is now populated (1,508 creatives across 142 firms) and refreshes daily via `youtube_ads_daily`.

## Goal

Wire the **YouTube** channel tab on the v2 State Intelligence "Competitive Analysis" surface (`web/app/(app)/state-intelligence/v2/[slug]/competitive-analysis.tsx`) to the `youtube_ad_creatives` data. Firm-level ranking of which PI firms run the most YouTube/video advertising. This is the UI layer on top of Phase 4a's pipeline.

## Signal & geo model (settled in 4a brainstorming)

- **Firm-level, national.** Google Ads Transparency video creatives carry no case-type/keyword tag and have no DMA dimension. So the tab ranks *firms* by video-ad investment — it has **no DMA filter and no case-type filter** (unlike Paid Search's DMA dropdown and SEO's case-type dropdown). The control row shows only a "measured nationally" note.
- **Domain-led identity.** `advertiser_name` is often the agency/media buyer (e.g. `thebarnesfirm.com` → "BRAINLABS DIGITAL", `855mikewins.com` → "Townsquare Media"), so the firm domain is the reliable identity — same convention as Paid Search and SEO.

## Architecture

### 1. New RPC `get_youtube_competitors(p_limit integer default 50)`

Aggregates `youtube_ad_creatives` per `advertiser_domain`, national. Mirrors the conventions of `get_seo_competitors_by_tort` (SQL, `SECURITY DEFINER`, `SET search_path = public`, granted to anon/authenticated/service_role).

Returns, ranked by `active_creatives DESC, longest_running_days DESC` (LIMIT `p_limit`):

| column | source |
|---|---|
| `advertiser_domain` | group key |
| `advertiser_name` | `mode() WITHIN GROUP (ORDER BY advertiser_name)` |
| `advertiser_ar_id` | `mode() WITHIN GROUP (ORDER BY advertiser_ar_id)` — for the Transparency link |
| `active_creatives` | `COUNT(*)` |
| `longest_running_days` | `MAX(total_days_shown)` |
| `first_shown` | `MIN(first_shown)` |
| `last_shown` | `MAX(last_shown)` |

**Junk filter:** `WHERE advertiser_domain NOT IN ('google.com','youtube.com')` — `google.com` snuck into the `pi_search` seed and returns Google's own ads (it ranked #1 with 100 creatives); these are not PI competitors. The list is small and extensible; documented in the migration header.

Migration filename: fresh `20260622*`-or-later timestamp; run `ls supabase/migrations/ | grep ^<ts>` first (CLAUDE.md §11). Applied on merge, not via MCP.

### 2. Tab UI in `competitive-analysis.tsx`

- `activeChannel === "youtube"` renders a new `YouTubePanel` (replaces the current `ComingSoon` branch for `youtube`).
- **Control row:** when YouTube is active, render neither the DMA dropdown (Paid Search) nor the case-type dropdown (SEO) — just the national-scope note: "YouTube/video ad presence is measured nationally." The existing conditional already gates DMA to Paid Search and case-type to SEO; add a YouTube branch that shows only the note.
- `YouTubePanel` calls `get_youtube_competitors` via the same untyped `getSupabase().rpc()` cast pattern the SEO/Paid Search tabs use (no `database.types.ts` gate; regen post-merge).
- Table columns: **# · Firm (domain) · Active video ads · Longest running · Last seen**, plus a per-row **"view ads ↗"** link to the firm's Google Ads Transparency page: `https://adstransparency.google.com/advertiser/{advertiser_ar_id}?region=US` (rendered only when `advertiser_ar_id` is present). The domain links to the firm site (`https://{advertiser_domain}`) like the other tabs.
- `longest_running_days` renders as e.g. "479 days"; `last_seen` as the date.
- Loading / error / empty states reuse the established panel patterns. Empty-state copy: "No YouTube video-ad data yet — the daily pipeline populates this." (The table is already populated, so this should not show in practice.)

## Out of scope

- Any change to the `youtube_ads_daily` pipeline or the `youtube_ad_creatives` table (4a).
- Case-type or DMA filtering (not possible with this data).
- Raising the per-firm `num=100` ingest cap or capturing true `total_results` (a 4a-pipeline refinement, tracked separately).
- TikTok (permanently disabled) and Traditional Media (pending) tabs.

## Testing / definition of done

- Migration applies cleanly (no timestamp collision).
- RPC returns sane rows against prod data before UI wiring (top firms = real PI firms, `google.com` absent, counts/longevity populated).
- Build + lint + `tsc` green (run `npx tsc` only after `npm install`; only the changed file must be clean vs the known baseline).
- Browser-verify on prod after merge (CLAUDE.md §2.7): on a v2 state page, YouTube tab renders the firm ranking, the "view ads" link opens the correct Transparency page, no DMA/case-type control shows, network 2xx, zero console errors, screenshot.

## Risks / notes

- Same firm list renders on every state page (national data) — the scope note prevents it reading as a bug, consistent with the SEO tab.
- The denylist is a blunt instrument; if more non-firm domains surface in the ranking later, extend the list (or, better, filter the ingest seed — tracked as the 4a seed-cleanup backlog item).
