-- Migration: add_manager_role_and_rename_member_to_user
-- Purpose: Introduce the tenant role hierarchy Admin > Manager > User.
--   * Rename the legacy 'member' tier to 'user' (data + constraint + default).
--   * Add the new 'manager' tier to the invitations role CHECK.
--   * Fix the is_tenant_admin() helper bug (it checked 'admin' instead of
--     'tenant_admin') and add an is_tenant_manager() helper.
--
-- Role semantics:
--   super_admin  — LMI system-wide admin (above the tenant hierarchy)
--   tenant_admin — "Admin": full tenant control (billing, branding, all users)
--   manager      — invite/remove Users + view roster only; full (non-trial) access
--   user         — standard/trial product access (formerly 'member')
--
-- IDEMPOTENCY: the UPDATEs are no-ops once data is migrated; CREATE OR REPLACE
--   FUNCTION and DROP/ADD CONSTRAINT are safe to re-run. Running this via
--   `supabase db push` against a DB that is already migrated is harmless.
--
-- NOTE: We intentionally do NOT add a CHECK constraint to profiles.role — the
--   OAuth callback historically wrote 'viewer' (now 'user' in code), and a
--   strict constraint risks breaking inserts for any stray legacy value.

-- ============================================================================
-- 1. Migrate existing data: member -> user
-- ============================================================================
UPDATE public.profiles    SET role = 'user' WHERE role = 'member';
UPDATE public.invitations SET role = 'user' WHERE role = 'member';

-- ============================================================================
-- 2. invitations.role CHECK: allow user | manager | tenant_admin
-- ============================================================================
ALTER TABLE public.invitations
  DROP CONSTRAINT IF EXISTS invitations_role_check;

ALTER TABLE public.invitations
  ADD CONSTRAINT invitations_role_check
  CHECK (role = ANY (ARRAY['user'::text, 'manager'::text, 'tenant_admin'::text]));

-- New invitations default to the User tier.
ALTER TABLE public.invitations ALTER COLUMN role SET DEFAULT 'user';

-- ============================================================================
-- 3. profiles.role default -> user (covers any direct insert; invited users
--    always get their role set explicitly by /api/invites/accept)
-- ============================================================================
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user';

-- ============================================================================
-- 4. Fix is_tenant_admin() — it checked 'admin' but the app uses 'tenant_admin'
--    (bug carried since 20260419000000_add_rls_helper_functions.sql).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_tenant_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('super_admin', 'tenant_admin')
  )
$$;

-- ============================================================================
-- 5. is_tenant_manager() — admits Managers (and above) for any future RLS that
--    should allow user-management actions.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_tenant_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('super_admin', 'tenant_admin', 'manager')
  )
$$;
