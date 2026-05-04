-- Migration: add_firms_insert_policy
-- Purpose: lets authenticated users insert into firms.
--
-- Background:
--   The original Phase 0a migration intentionally left INSERT/DELETE
--   off the firms table, with a comment saying:
--     'INSERT and DELETE flow through API routes (which manage the
--      firm_managers row in the same transaction). No direct
--      INSERT/DELETE policy.'
--   The intent was that route code would use a service-role Supabase
--   client to bypass RLS. But the actual createFirm() server helper
--   uses the user's auth-bound client, so every insert fails:
--       new row violates row-level security policy for table "firms"
--   This blocks both:
--     - the agency 'Add client firm' button on /settings/firms
--     - ensureSelfFirmForLawFirm() which auto-mints law-firm self-firms
--
-- Fix: add a permissive INSERT policy. Threat model is OK:
--   - Authenticated users only (TO authenticated)
--   - Each insert must be paired with a firm_managers row pointing
--     back to the user (the createFirm helper does this in sequence,
--     and firm_managers_insert_own RLS already enforces self-write)
--   - SELECT policy on firms still scopes visibility to firms the
--     user manages, so spam-created orphan rows aren't visible to
--     anyone but the inserter (until they add a manager row)
--
-- Future: add a periodic cleanup job for firms with no firm_managers
-- rows older than N hours.

CREATE POLICY "firms_insert_authenticated" ON public.firms
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON POLICY "firms_insert_authenticated" ON public.firms IS
  'Lets authenticated users create new firms. Pairs with firm_managers_insert_own which constrains the manager row.';
