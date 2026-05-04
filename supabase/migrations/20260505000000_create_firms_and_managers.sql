-- Migration: create_firms_and_managers
-- Purpose: MCC-style (Google Manager Account) firm management for Campaign Builder PI.
--
-- Two tables:
--   firms          — the entity being marketed (a plaintiff law firm)
--   firm_managers  — M:N relationship between users (managers) and firms
--
-- This is a foundation migration. UI + app logic ship in subsequent PRs.
-- No data is moved here — campaigns.firm_id arrives in a follow-up migration.
--
-- Key design choices:
--   - firms is decoupled from subscriptions. A firm can exist with no manager
--     (e.g. when the only manager's subscription is cancelled — firm history
--     survives the relationship change).
--   - firm_managers.role distinguishes:
--       'owner'   — the firm itself manages this row (law firm subscription)
--       'manager' — agency / media company manages on the firm's behalf
--       'viewer'  — read-only access (referral partners, future use)
--   - At most ONE 'owner' per firm, enforced by partial unique index.
--   - RLS: users see firms they have ANY firm_managers role on.

/* ── firms ─────────────────────────────────────────────────────────────── */

CREATE TABLE IF NOT EXISTS firms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Display name shown in pickers, dropdowns, campaign rows.
  -- For a law firm this is typically their account/firm name.
  -- For an agency-managed firm this is "Smith & Jones LLP" or similar.
  label TEXT NOT NULL,

  -- Brand profile fields (populated by manual entry in Phase 1.5,
  -- auto-extracted from website_url in Phase 3).
  website_url TEXT,
  social_handles JSONB DEFAULT '{}'::jsonb,    -- e.g. {"facebook":"...","x":"...","linkedin":"..."}
  tagline TEXT,
  voice_descriptors TEXT[] DEFAULT '{}',       -- e.g. ['empathetic','no-nonsense','local']
  differentiators TEXT[] DEFAULT '{}',         -- e.g. ['20 years in Birmingham']
  partner_names TEXT[] DEFAULT '{}',
  signature_phrases TEXT[] DEFAULT '{}',
  service_areas TEXT[] DEFAULT '{}',           -- counties, cities, regions

  -- Default campaign config (prefills Campaign Builder forms).
  default_state TEXT,                          -- two-letter state code
  default_dma_codes TEXT[] DEFAULT '{}',

  -- How the brand profile fields above were populated:
  --   'manual'  — user typed them in
  --   'auto'    — extracted from website_url by background job
  --   'hybrid'  — auto-extracted then user-edited
  extraction_source TEXT NOT NULL DEFAULT 'manual'
    CHECK (extraction_source IN ('manual', 'auto', 'hybrid')),
  extracted_at TIMESTAMPTZ,                    -- last successful auto-extraction

  -- Free-form notes for agency PMs / media buyers.
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firms_label ON firms (label);
CREATE INDEX IF NOT EXISTS idx_firms_website_url ON firms (website_url)
  WHERE website_url IS NOT NULL;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_firms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_firms_updated_at
  BEFORE UPDATE ON firms
  FOR EACH ROW
  EXECUTE FUNCTION update_firms_updated_at();

/* ── firm_managers ──────────────────────────────────────────────────────── */

CREATE TABLE IF NOT EXISTS firm_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  manager_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role within this firm:
  --   'owner'   — the firm itself; max ONE per firm; typically a law firm subscription
  --   'manager' — agency / media co. with full edit + create access
  --   'viewer'  — read-only (referral partner, future expansion)
  role TEXT NOT NULL DEFAULT 'manager'
    CHECK (role IN ('owner', 'manager', 'viewer')),

  -- Audit trail
  added_by_user_id UUID REFERENCES auth.users(id),
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A user can only have one role per firm at a time.
  UNIQUE (firm_id, manager_user_id)
);

CREATE INDEX IF NOT EXISTS idx_firm_managers_firm ON firm_managers (firm_id);
CREATE INDEX IF NOT EXISTS idx_firm_managers_user ON firm_managers (manager_user_id);

-- Enforce at most one 'owner' per firm. Multiple managers/viewers are fine.
CREATE UNIQUE INDEX IF NOT EXISTS idx_firm_managers_one_owner
  ON firm_managers (firm_id)
  WHERE role = 'owner';

/* ── RLS ────────────────────────────────────────────────────────────────── */

-- firms: users see firms they manage (any role). Writes go through service
-- role / API routes that check firm_managers themselves.
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "firms_select_managed" ON firms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM firm_managers fm
      WHERE fm.firm_id = firms.id
        AND fm.manager_user_id = auth.uid()
    )
  );

CREATE POLICY "firms_update_managed" ON firms
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM firm_managers fm
      WHERE fm.firm_id = firms.id
        AND fm.manager_user_id = auth.uid()
        AND fm.role IN ('owner', 'manager')
    )
  );

-- INSERT and DELETE flow through API routes (which manage the firm_managers
-- row in the same transaction). No direct INSERT/DELETE policy.

-- firm_managers: users see rows for firms they themselves manage.
-- This is intentionally tight — agencies should not see WHO ELSE manages
-- a given firm row (privacy across managers). Owners CAN see all managers
-- of their own firm.
ALTER TABLE firm_managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "firm_managers_select_own_or_owned" ON firm_managers
  FOR SELECT USING (
    -- Always see your own management rows
    manager_user_id = auth.uid()
    OR
    -- Owners of a firm see all managers of that firm
    EXISTS (
      SELECT 1 FROM firm_managers owner_check
      WHERE owner_check.firm_id = firm_managers.firm_id
        AND owner_check.manager_user_id = auth.uid()
        AND owner_check.role = 'owner'
    )
  );

-- Owners can add/remove other managers on their own firm.
CREATE POLICY "firm_managers_owner_manage" ON firm_managers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM firm_managers owner_check
      WHERE owner_check.firm_id = firm_managers.firm_id
        AND owner_check.manager_user_id = auth.uid()
        AND owner_check.role = 'owner'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM firm_managers owner_check
      WHERE owner_check.firm_id = firm_managers.firm_id
        AND owner_check.manager_user_id = auth.uid()
        AND owner_check.role = 'owner'
    )
  );

/* ── Comments for documentation ─────────────────────────────────────────── */

COMMENT ON TABLE firms IS
  'Plaintiff law firms being marketed. MCC-style: a firm exists independently of who manages it.';
COMMENT ON TABLE firm_managers IS
  'M:N between users and firms. Roles: owner (firm itself), manager (agency/media co.), viewer (referral).';
COMMENT ON COLUMN firms.extraction_source IS
  'How brand profile fields were populated. ''auto'' indicates URL-driven extraction.';
COMMENT ON COLUMN firm_managers.role IS
  'owner = the firm itself (max 1 per firm); manager = full access; viewer = read-only.';
