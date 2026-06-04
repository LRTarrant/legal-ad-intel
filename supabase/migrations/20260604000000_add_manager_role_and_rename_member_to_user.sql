-- Migration: add_manager_role_and_rename_member_to_user
-- Purpose: Introduce the tenant role hierarchy Admin > Manager > User.
--   * Rename the legacy 'member' tier to 'user' (data + constraint + default).
--   * Add the new 'manager' tier to the profiles AND invitations role CHECKs.
--   * Fix the is_tenant_admin() helper bug (it checked 'admin' instead of
--     'tenant_admin') and add an is_tenant_manager() helper.
--
-- Role semantics:
--   super_admin  — LMI system-wide admin (above the tenant hierarchy)
--   tenant_admin — "Admin": full tenant control (billing, branding, all users)
--   manager      — invite/remove Users + view roster only; full (non-trial) access
--   user         — standard/trial product access (formerly 'member')
--
-- IMPORTANT (constraint ordering): both `profiles` and `invitations` carry a
--   role CHECK that did NOT permit 'user' (profiles: super_admin|tenant_admin|
--   member|viewer; invitations: member|tenant_admin). The widened CHECK must
--   therefore be installed AROUND the data migration: drop the old CHECK →
--   UPDATE rows to 'user' → add the new CHECK. Updating before dropping fails
--   with "violates check constraint ..._role_check".
--
-- IDEMPOTENCY: the UPDATEs are no-ops once data is migrated; DROP CONSTRAINT IF
--   EXISTS + ADD CONSTRAINT and CREATE OR REPLACE FUNCTION are safe to re-run.
--   Running this via `supabase db push` against an already-migrated DB is a
--   harmless no-op.

-- ============================================================================
-- 1. profiles.role — drop old CHECK, migrate member/viewer -> user, re-add
--    widened CHECK (super_admin | tenant_admin | manager | user).
--    'viewer' (legacy OAuth-callback default, now 'user' in code) is folded in.
-- ============================================================================
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

UPDATE public.profiles SET role = 'user' WHERE role IN ('member', 'viewer');

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['super_admin'::text, 'tenant_admin'::text, 'manager'::text, 'user'::text]));

-- New profiles default to the User tier (invited users get their role set
-- explicitly by /api/invites/accept).
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user';

-- ============================================================================
-- 2. invitations.role — drop old CHECK, migrate member -> user, re-add widened
--    CHECK (user | manager | tenant_admin).
-- ============================================================================
ALTER TABLE public.invitations
  DROP CONSTRAINT IF EXISTS invitations_role_check;

UPDATE public.invitations SET role = 'user' WHERE role = 'member';

ALTER TABLE public.invitations
  ADD CONSTRAINT invitations_role_check
  CHECK (role = ANY (ARRAY['user'::text, 'manager'::text, 'tenant_admin'::text]));

-- New invitations default to the User tier.
ALTER TABLE public.invitations ALTER COLUMN role SET DEFAULT 'user';

-- ============================================================================
-- 3. Fix is_tenant_admin() — it checked 'admin' but the app uses 'tenant_admin'
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
-- 4. is_tenant_manager() — admits Managers (and above) for any future RLS that
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
