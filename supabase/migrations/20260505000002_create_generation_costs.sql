-- Migration: create_generation_costs
-- Purpose: Cost attribution layer for every external AI/asset API call.
--
-- Why now (Phase 0.5): the foundation needs to capture data we can't
-- reconstruct later. Once campaigns are flying through the system
-- without per-call attribution, retrofitting historical cost-by-firm
-- analysis is impossible. Adding it on day one is cheap.
--
-- What this enables:
--   - Real-time COGS dashboard (top users by spend this month)
--   - Per-firm cost tracking (your most profitable / least profitable
--     customers, with margin against subscription tier)
--   - Future overage billing precision (when an agency hits cap and
--     opts for overage, charge what it actually cost + markup, not
--     a flat guess)
--   - Cost anomaly detection (a runaway script generation loop)
--
-- What this intentionally doesn't enable yet:
--   - Caching (separate concern; cache layer comes later if hit rate
--     justifies the work)
--   - Tiered model routing (separate code-level decision, not a
--     schema decision)

CREATE TABLE IF NOT EXISTS generation_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Attribution (who + what)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES firms(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  -- The call itself
  --   purpose: 'pi_script' | 'mt_radio_script' | 'mt_video_script' |
  --            'voiceover' | 'video_render' | 'brand_extract' |
  --            'ad_creative' | 'other'
  --   provider: 'openai' | 'anthropic' | 'elevenlabs' | 'replicate' |
  --             'fal' | 'runwayml' | 'azure' | 'other'
  --   model: free-form (e.g. 'gpt-4o-mini', 'eleven_turbo_v2',
  --          'claude-3-5-sonnet-20241022', 'sora-1')
  purpose TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,

  -- Token / unit measurements (nullable so non-LLM calls don't have to fake it).
  -- For LLMs: input_tokens, output_tokens
  -- For audio: characters_synth (TTS char count) or seconds_audio
  -- For video: seconds_video
  -- For images: image_count
  input_tokens INTEGER,
  output_tokens INTEGER,
  characters_synth INTEGER,
  seconds_audio NUMERIC,
  seconds_video NUMERIC,
  image_count INTEGER,

  -- The bottom line, always populated.
  -- Stored as cents (integer) to avoid floating-point grief.
  -- Computed via lib/cost-tracking/calculator.ts so the table never
  -- holds a "we forgot to convert" mistake.
  cost_cents INTEGER NOT NULL,

  -- Optional: latency for this call (ms). Useful for spotting
  -- model regressions and rate-limit problems.
  latency_ms INTEGER,

  -- Free-form metadata for things we haven't generalized yet.
  -- Keep small \u2014 don't dump full request bodies here.
  meta JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for the queries we'll actually run:
--   1. "Top users by spend this month" \u2014 admin dashboard
--   2. "Total cost for this firm this period" \u2014 COGS calc
--   3. "Total cost for this campaign" \u2014 campaign-level analytics
--   4. "Spend by purpose" \u2014 which features are eating the budget
CREATE INDEX IF NOT EXISTS idx_generation_costs_user_created
  ON generation_costs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_generation_costs_firm_created
  ON generation_costs (firm_id, created_at DESC)
  WHERE firm_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_generation_costs_campaign
  ON generation_costs (campaign_id)
  WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_generation_costs_purpose_created
  ON generation_costs (purpose, created_at DESC);

-- RLS: users can read their own cost rows; admins (service role) read all.
-- INSERTs always go through service-role API code, never client-side, so
-- there's no insert policy needed \u2014 we just deny by default.
ALTER TABLE generation_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "generation_costs_select_own" ON generation_costs
  FOR SELECT USING (user_id = auth.uid());

COMMENT ON TABLE generation_costs IS
  'Per-call attribution for every external AI/asset API call. Powers COGS dashboard, overage precision, and cost anomaly detection.';
COMMENT ON COLUMN generation_costs.cost_cents IS
  'Cost in cents. Computed by lib/cost-tracking/calculator.ts \u2014 never set this directly.';
COMMENT ON COLUMN generation_costs.purpose IS
  'What the call was for. Free-form but standardized: pi_script, mt_radio_script, mt_video_script, voiceover, video_render, brand_extract, ad_creative, other.';
