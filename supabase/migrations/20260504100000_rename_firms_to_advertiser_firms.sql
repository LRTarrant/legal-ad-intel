-- Migration: rename_firms_to_advertiser_firms
-- Purpose: free up the `firms` name for the new MCC-style client firm management
--          introduced in Phase 0a of the PI feature parity project.
--
-- Background:
--   The original `firms` table holds COMPETITIVE-INTELLIGENCE advertiser
--   data — the law firms whose ads we're tracking, joined to ad_events,
--   creative-gallery, market-heatmap, etc. That table needs to keep
--   existing.
--
--   The new firms (Phase 0a, PRs #306-308) is a totally different concept:
--   the user's OWN firm or the firms they manage on behalf of (MCC-style).
--   It includes brand profile fields, social handles, voice descriptors, etc.
--
--   We rename the original table to `advertiser_firms` to make space.
--   PostgreSQL automatically updates all foreign keys, RLS policies, and
--   indexes attached to the table — no FK drops/recreates needed.
--
-- Files referencing the old name in app code (must be updated in the same PR):
--   web/lib/queries/firms.ts
--   web/lib/queries/creative-gallery.ts
--   web/lib/queries/market-heatmap.ts
--   web/lib/queries/ad-events.ts
--   web/app/(app)/advertising/creatives/creatives-client.tsx
--   web/app/api/alerts/check/route.ts
--   web/lib/database.types.ts
--
-- Rollback: rename advertiser_firms back to firms.

ALTER TABLE IF EXISTS public.firms RENAME TO advertiser_firms;

-- The FK constraint on ad_events.firm_id automatically follows the rename.
-- Sanity comment so future readers don't have to grep:
COMMENT ON TABLE public.advertiser_firms IS
  'Competitive-intelligence advertiser firms (the law firms whose ads we track). Used by ad_events, creative-gallery, market-heatmap, alerts. Renamed from "firms" in Phase 0a to free up the name for MCC-style client firm management.';
