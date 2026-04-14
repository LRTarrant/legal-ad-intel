-- Add CourtListener attorney contact columns + source_url
-- Applied: 2026-04-13
-- Context: The mdl_attorneys table exists but lacks email, phone, and
--          source_url columns needed for the Plaintiff/Defendant Attorneys UI.
--          This migration adds those columns and a unique constraint to
--          support upsert from the CourtListener sync API route.
--
-- All statements are idempotent and safe to re-run.

------------------------------------------------------------------------
-- Add missing contact columns to mdl_attorneys
------------------------------------------------------------------------

ALTER TABLE mdl_attorneys
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS source_url text;

------------------------------------------------------------------------
-- Index for filtering attorneys by mdl_number + role (used by UI)
------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_mdl_attorneys_mdl_role
  ON mdl_attorneys (mdl_number, role);

------------------------------------------------------------------------
-- Unique constraint on (mdl_number, cl_attorney_id) for upsert support
------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS idx_mdl_attorneys_mdl_cl_attorney
  ON mdl_attorneys (mdl_number, cl_attorney_id)
  WHERE cl_attorney_id IS NOT NULL;
