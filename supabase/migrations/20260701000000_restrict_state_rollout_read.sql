-- Migration: restrict_state_rollout_read
-- Purpose: Lock down the state_rollout table's SELECT policy.
--
-- state_rollout is an internal control table (which states are live / in which
-- rollout phase). The existing "state_rollout_read" policy granted SELECT to
-- every authenticated user with qual = true, which exposed the full rollout
-- roadmap to any signed-in account. Read is now restricted to super-admins;
-- the app resolves per-account state access at the application layer
-- (web/lib/entitlements), not from this table.
--
-- The service_role write policy (state_rollout_service_all) is intentionally
-- left untouched so pipelines / service-role clients keep full access.
--
-- Ordering: DROP the old policy BEFORE creating the replacement so the two
-- SELECT policies never coexist.

DROP POLICY IF EXISTS "state_rollout_read" ON public.state_rollout;

CREATE POLICY "state_rollout_read_super_admin"
  ON public.state_rollout
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());
