-- Migration: fix_firms_rls_recursion
-- Purpose: fix two production RLS bugs that landed with the original
--          Phase 0a / Phase 0.5 migrations:
--
--   Bug A: firm_managers RLS policies self-reference firm_managers via
--          subquery, causing 'infinite recursion detected in policy for
--          relation firm_managers' errors and a 500 on /settings/firms.
--   Bug B: generation_costs has a SELECT policy but NO INSERT policy,
--          so every cost-tracking write fails ('new row violates RLS')
--          and cost_cents lands in the response as 0.
--
-- Root cause: I wrote the original policies with subqueries that hit
-- the same table the policy is attached to, which triggers Postgres'
-- recursion guard. The fix is two-fold:
--
--   1. Drop the recursive policies and replace with simpler,
--      non-recursive ones. We lose the advanced "owners see all
--      managers of their firm" feature, but the user value of that
--      was negligible for v1 \u2014 a future migration can reintroduce
--      it via SECURITY DEFINER helper functions.
--   2. Add an INSERT policy on generation_costs that lets users
--      insert their own rows.
--
-- Behavior after this migration:
--   firm_managers: a user can SELECT/INSERT/UPDATE/DELETE rows where
--                  manager_user_id = auth.uid(). Cross-management
--                  workflows route through API routes that use the
--                  service-role client (bypassing RLS) instead.
--   generation_costs: users can INSERT rows where user_id = auth.uid().
--                     SELECT remains scoped to user_id = auth.uid().

/* ── firm_managers: drop and replace recursive policies ─────────────── */

DROP POLICY IF EXISTS "firm_managers_select_own_or_owned" ON public.firm_managers;
DROP POLICY IF EXISTS "firm_managers_owner_manage" ON public.firm_managers;

-- Simple, non-recursive: a user sees and manages only their own
-- firm_managers rows. Owner-level cross-management lives in API
-- routes that use service-role keys.
CREATE POLICY "firm_managers_select_own" ON public.firm_managers
  FOR SELECT
  USING (manager_user_id = auth.uid());

CREATE POLICY "firm_managers_insert_own" ON public.firm_managers
  FOR INSERT
  WITH CHECK (manager_user_id = auth.uid());

CREATE POLICY "firm_managers_update_own" ON public.firm_managers
  FOR UPDATE
  USING (manager_user_id = auth.uid())
  WITH CHECK (manager_user_id = auth.uid());

CREATE POLICY "firm_managers_delete_own" ON public.firm_managers
  FOR DELETE
  USING (manager_user_id = auth.uid());

/* ── generation_costs: add the missing INSERT policy ──────────────────── */

CREATE POLICY "generation_costs_insert_own" ON public.generation_costs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- (SELECT policy "generation_costs_select_own" already exists \u2014 no change.)

COMMENT ON POLICY "firm_managers_select_own" ON public.firm_managers IS
  'Replaces firm_managers_select_own_or_owned which had infinite recursion. Owner-level cross-visibility moved to service-role API routes.';
COMMENT ON POLICY "generation_costs_insert_own" ON public.generation_costs IS
  'Allows users to write their own cost rows. Was missing in the original migration, causing every trackCall() insert to fail RLS.';
