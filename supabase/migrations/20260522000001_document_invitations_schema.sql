-- Migration: document_invitations_schema
-- Purpose: Reconstruct the real `public.invitations` schema into version
--          control. The original create statement was hand-applied to
--          production before repo sync; migration 20260418165323
--          (create_invitations_table) is only a `SELECT 1;` placeholder
--          (see CLAUDE.md §11). This migration is the schema-of-record.
--
-- IDEMPOTENCY: every statement is `IF NOT EXISTS` or `DROP ... IF EXISTS`
--   followed by `CREATE`, so running it via `supabase db push` against
--   production — where every object already exists — is a safe no-op. It
--   does NOT re-execute the placeholder; it documents the live state.
--
-- KNOWN GAP (intentionally not addressed here): there is no UPDATE policy
--   on this table. The `/api/invites` resend path updates rows via the
--   service-role client, which bypasses RLS, so it is unaffected. Adding a
--   tenant-admin-scoped UPDATE policy is deferred pending a policy-shape
--   decision — see the PR description.

-- ============================================================================
-- invitations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'member'
                CHECK (role = ANY (ARRAY['member'::text, 'tenant_admin'::text])),
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by  UUID REFERENCES auth.users(id),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + '7 days'::interval),
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- trial_days: days of trial access granted on acceptance (migration
  -- 20260420120000_add_trial_access added this to the live table).
  trial_days  INTEGER DEFAULT 14
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_invitations_token  ON public.invitations (token);
CREATE INDEX IF NOT EXISTS idx_invitations_tenant ON public.invitations (tenant_id);

-- Partial unique index: at most one UNACCEPTED invitation per (tenant, email).
-- NOTE: the predicate is `accepted_at IS NULL` only — it does NOT exclude
-- expired rows, so an expired-but-unaccepted row still occupies the slot.
-- This is why `/api/invites` resends by UPDATE-in-place rather than INSERT.
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_unique_pending
  ON public.invitations (tenant_id, email)
  WHERE (accepted_at IS NULL);

-- ============================================================================
-- Row-level security
-- ============================================================================
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view tenant invitations" ON public.invitations;
CREATE POLICY "Admins can view tenant invitations"
  ON public.invitations
  FOR SELECT
  TO authenticated
  USING (
    (tenant_id = my_tenant_id())
    AND (
      (
        (SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid())
          = ANY (ARRAY['tenant_admin'::text, 'super_admin'::text])
      )
      OR is_super_admin()
    )
  );

DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
CREATE POLICY "Admins can create invitations"
  ON public.invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (tenant_id = my_tenant_id())
    AND (
      (
        (SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid())
          = ANY (ARRAY['tenant_admin'::text, 'super_admin'::text])
      )
      OR is_super_admin()
    )
  );

DROP POLICY IF EXISTS "Admins can revoke invitations" ON public.invitations;
CREATE POLICY "Admins can revoke invitations"
  ON public.invitations
  FOR DELETE
  TO authenticated
  USING (
    (tenant_id = my_tenant_id())
    AND (accepted_at IS NULL)
    AND (
      (
        (SELECT profiles.role FROM profiles WHERE profiles.id = auth.uid())
          = ANY (ARRAY['tenant_admin'::text, 'super_admin'::text])
      )
      OR is_super_admin()
    )
  );
