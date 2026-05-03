-- Migration: create_dma_markets
-- Purpose: Reference table for Nielsen DMA markets used in PI campaign targeting
-- Pattern: Follows existing repo convention (timestamped filename, CREATE only)

CREATE TABLE IF NOT EXISTS dma_markets (
  dma_code TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,           -- 'Birmingham' (colloquial, for scripts)
  full_name TEXT NOT NULL,              -- 'Birmingham (Anniston and Tuscaloosa)'
  primary_state TEXT NOT NULL,          -- 'AL'
  states_covered TEXT[] NOT NULL,       -- ['AL', 'GA']
  population BIGINT,
  rank INT,                             -- Nielsen DMA rank
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dma_markets_primary_state
  ON dma_markets (primary_state);

CREATE INDEX IF NOT EXISTS idx_dma_markets_states_covered
  ON dma_markets USING GIN (states_covered);

COMMENT ON COLUMN dma_markets.display_name IS
  'Colloquial name for script injection. Always use this, never full_name or dma_code in user-facing scripts.';

-- RLS: read-only reference table, public read
ALTER TABLE dma_markets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dma_markets_public_read" ON dma_markets
  FOR SELECT USING (true);
