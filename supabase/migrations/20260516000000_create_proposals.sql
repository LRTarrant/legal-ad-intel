-- Migration: create_proposals
-- Purpose: Proposal / presentation deck builder. Tenants (agencies, media
--          companies, firms) assemble ordered "blocks" sourced from LMI
--          surfaces into a deck, save drafts, and export to PPTX/PDF.
--
-- NOTE ON SCHEMA CORRECTIONS vs. the original handoff spec:
--   The handoff migration referenced `public.profiles.firm_id` and
--   `tenant_id -> firms(id)`. This codebase's real multi-tenant model is:
--     - public.profiles.tenant_id -> public.tenants.id
--     - canonical RLS helper public.my_tenant_id() (SECURITY DEFINER) already
--       used by activity_log / alert_configs / alert_events.
--     - `firms` is a *different* concept (tracked ad-spending orgs), not the
--       tenant; tenant branding lives on `tenants`.
--   The original `created_by uuid NOT NULL ... ON DELETE SET NULL` was also
--   self-contradictory. We follow the established `campaigns` pattern:
--   `created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`.

-- ============================================================================
-- proposals
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.proposals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- proposal_blocks  (ordered list of blocks within a deck)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.proposal_blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  block_type  TEXT NOT NULL
    CHECK (block_type IN (
      'tort_page',
      'state_intel',
      'ad_intel',
      'campaign',
      'custom_text'
    )),
  -- Flexible per-type payload, e.g. { "tort_slug": "roundup" },
  -- { "state_abbr": "FL" }, { "surface": "saturation" },
  -- { "campaign_id": "<uuid>" }, { "title": "...", "content": "..." }.
  block_data  JSONB NOT NULL DEFAULT '{}',
  "order"     INT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_proposals_tenant_id
  ON public.proposals (tenant_id);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at
  ON public.proposals (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposal_blocks_proposal_id
  ON public.proposal_blocks (proposal_id, "order");

-- ============================================================================
-- updated_at triggers (mirrors the campaigns table pattern)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proposals_updated_at ON public.proposals;
CREATE TRIGGER trg_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_proposals_updated_at();

CREATE OR REPLACE FUNCTION public.update_proposal_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proposal_blocks_updated_at ON public.proposal_blocks;
CREATE TRIGGER trg_proposal_blocks_updated_at
  BEFORE UPDATE ON public.proposal_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_proposal_blocks_updated_at();

-- ============================================================================
-- RLS — tenant-scoped, mirroring activity_log / alert_configs conventions.
-- All members of a tenant can view/edit that tenant's proposals (agencies and
-- media companies collaborate on shared decks). Super admins get cross-tenant
-- access for support/reporting, consistent with the rest of the schema.
-- ============================================================================
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposals_tenant_all" ON public.proposals
  FOR ALL
  USING (tenant_id = public.my_tenant_id())
  WITH CHECK (tenant_id = public.my_tenant_id());

CREATE POLICY "proposals_super_admin_all" ON public.proposals
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "proposal_blocks_tenant_all" ON public.proposal_blocks
  FOR ALL
  USING (
    proposal_id IN (
      SELECT id FROM public.proposals
      WHERE tenant_id = public.my_tenant_id()
    )
  )
  WITH CHECK (
    proposal_id IN (
      SELECT id FROM public.proposals
      WHERE tenant_id = public.my_tenant_id()
    )
  );

CREATE POLICY "proposal_blocks_super_admin_all" ON public.proposal_blocks
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
