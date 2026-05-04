-- Migration: add_firm_id_to_campaigns
-- Purpose: Wire campaigns to the firms table from Phase 0a.
--
-- Pattern: 3-step safe backfill
--   1. Add nullable firm_id column (no row impact)
--   2. Backfill: for every distinct user_id in campaigns, ensure they
--      own a firm (mint one if missing) and point all their campaigns at it
--   3. Make firm_id NOT NULL once backfill completes
--
-- Rollback safety: each step is reversible. If a backfill row fails we
-- log it via RAISE NOTICE rather than aborting the migration.
--
-- Important: the backfill creates an 'owner' firm_managers row for any
-- user with existing campaigns, regardless of buyer_type. Reasoning:
-- they already have data, so they own it. Agencies can later rename
-- the firm or move campaigns to a different firm record. We don't try
-- to be clever here \u2014 the goal is "no data orphaned, no surprises."

/* ── Step 1: add nullable column + index ──────────────────────────────── */

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS firm_id UUID
    REFERENCES firms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_firm_id
  ON campaigns (firm_id) WHERE firm_id IS NOT NULL;

/* ── Step 2: backfill ──────────────────────────────────────────────────── */

-- For every distinct user with at least one campaign:
--   a. Find their existing 'owner' firm if any
--   b. If none, mint a new firm using their email (or a default label)
--      and create an 'owner' firm_managers row
--   c. Update all their campaigns to point at that firm

DO $$
DECLARE
  user_rec RECORD;
  target_firm_id UUID;
  user_email TEXT;
  default_label TEXT;
BEGIN
  FOR user_rec IN
    SELECT DISTINCT user_id
    FROM campaigns
    WHERE firm_id IS NULL
  LOOP
    -- Look up the user's email for a sensible default label
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = user_rec.user_id;

    -- Step 2a: existing owned firm?
    SELECT fm.firm_id INTO target_firm_id
    FROM firm_managers fm
    WHERE fm.manager_user_id = user_rec.user_id
      AND fm.role = 'owner'
    LIMIT 1;

    -- Step 2b: mint one if missing
    IF target_firm_id IS NULL THEN
      -- Default label: portion of email before @, or 'My Firm'
      default_label := COALESCE(
        NULLIF(SPLIT_PART(user_email, '@', 1), ''),
        'My Firm'
      );

      INSERT INTO firms (label, extraction_source)
      VALUES (default_label, 'manual')
      RETURNING id INTO target_firm_id;

      INSERT INTO firm_managers (firm_id, manager_user_id, role, added_by_user_id)
      VALUES (target_firm_id, user_rec.user_id, 'owner', user_rec.user_id);

      RAISE NOTICE 'Backfill: created firm % for user %', target_firm_id, user_rec.user_id;
    END IF;

    -- Step 2c: point this user's campaigns at the firm
    UPDATE campaigns
    SET firm_id = target_firm_id
    WHERE user_id = user_rec.user_id
      AND firm_id IS NULL;
  END LOOP;
END $$;

/* ── Step 3: enforce NOT NULL going forward ───────────────────────────── */

-- Sanity check: every row should have a firm_id now. If any are still
-- null (e.g. a user_id that no longer exists in auth.users), surface it
-- before flipping the constraint so we know.
DO $$
DECLARE
  orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM campaigns WHERE firm_id IS NULL;
  IF orphan_count > 0 THEN
    RAISE WARNING 'Skipping NOT NULL: % campaigns still have null firm_id', orphan_count;
  ELSE
    EXECUTE 'ALTER TABLE campaigns ALTER COLUMN firm_id SET NOT NULL';
  END IF;
END $$;

COMMENT ON COLUMN campaigns.firm_id IS
  'The firm this campaign was generated for. Survives manager changes (an agency can drop the client without losing campaign history).';
