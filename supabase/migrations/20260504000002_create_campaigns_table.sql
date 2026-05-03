-- Migration: create_campaigns_table
-- Purpose: Persist campaign configurations (not generated assets)
-- Pattern: New table, tied to auth.users
--
-- Storage policy: This table stores ONLY the configuration a user submitted.
-- Generated scripts, audio, video, and images are NOT stored here.
-- Users re-render assets from saved config when needed.

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Practice area discriminator
  practice_area TEXT NOT NULL
    CHECK (practice_area IN ('mass_tort', 'personal_injury')),

  -- Mass tort campaigns reference a tort by slug
  tort_slug TEXT,

  -- PI campaigns specify category + DMA
  -- v1 categories: car, truck, motorcycle, boating, slip & fall,
  -- dog bite, premises, pedestrian, bicycle.
  -- Rideshare deferred to v2. Wrongful death = severity modifier.
  pi_category TEXT
    CHECK (pi_category IN (
      'car_accident',
      'truck_accident',
      'motorcycle_accident',
      'boating_accident',
      'slip_and_fall',
      'dog_bite',
      'premises_liability',
      'pedestrian_accident',
      'bicycle_accident'
    )),

  -- Geographic targeting
  state TEXT,                       -- two-letter state code
  market_dma_code TEXT REFERENCES dma_markets(dma_code) ON DELETE SET NULL,

  -- Severity modifiers (v1: 'fatal', 'catastrophic'; mutually exclusive)
  severity_modifiers TEXT[] DEFAULT '{}',

  -- Flexible config: voice, tone, firm name, audience tweaks, channel mix, etc.
  -- Schema-on-read so we don't migrate every time we add a knob.
  config JSONB NOT NULL DEFAULT '{}',

  -- Cached display name for the DMA (avoids join in list views)
  market_display_name TEXT,

  -- Lifecycle
  name TEXT,                        -- user-editable label
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Validation: PI campaigns must have category and DMA
  CONSTRAINT pi_requires_category_and_market
    CHECK (
      practice_area != 'personal_injury'
      OR (pi_category IS NOT NULL AND market_dma_code IS NOT NULL)
    ),

  -- Validation: mass tort campaigns must have tort_slug
  CONSTRAINT mass_tort_requires_slug
    CHECK (
      practice_area != 'mass_tort'
      OR tort_slug IS NOT NULL
    ),

  -- Validation: severity modifiers fatal and catastrophic mutually exclusive
  CONSTRAINT severity_modifiers_mutually_exclusive
    CHECK (
      NOT ('fatal' = ANY(severity_modifiers) AND 'catastrophic' = ANY(severity_modifiers))
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns (user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_practice_area ON campaigns (practice_area);
CREATE INDEX IF NOT EXISTS idx_campaigns_pi_category
  ON campaigns (pi_category) WHERE pi_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_tort_slug
  ON campaigns (tort_slug) WHERE tort_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns (created_at DESC);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();

-- RLS: users can only see their own campaigns
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_select_own" ON campaigns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "campaigns_insert_own" ON campaigns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "campaigns_update_own" ON campaigns
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "campaigns_delete_own" ON campaigns
  FOR DELETE USING (auth.uid() = user_id);
