-- Migration: create_subscriptions
-- Purpose: Per-user subscription, tier, and Campaign Builder entitlements
-- Note: This is SEPARATE from the existing `tenants` table.
--       `tenants` handles white-label branding (one tenant = one branded instance).
--       `subscriptions` handles billing and feature access (one subscription per user).

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Buyer segment (drives pricing, upgrade copy, sales motion)
  buyer_type TEXT NOT NULL
    CHECK (buyer_type IN ('media_company', 'ad_agency', 'law_firm')),

  -- Subscription tier (free-text to allow legacy/grandfathered tier names)
  -- Examples:
  --   media_company:  'mc_regional', 'mc_enterprise', 'mc_national'
  --   ad_agency:      'agency_regional', 'agency_multi_market', 'agency_enterprise'
  --   law_firm:       'firm_state_one_pa', 'firm_state_both', 'firm_multi_state', 'firm_enterprise'
  subscription_tier TEXT NOT NULL,

  billing_cycle TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'annual')),

  -- Campaign Builder feature flags (granular for upsell scenarios)
  campaign_builder_mass_tort BOOLEAN NOT NULL DEFAULT FALSE,
  campaign_builder_pi BOOLEAN NOT NULL DEFAULT FALSE,
  campaign_builder_monthly_cap INT,           -- NULL = unlimited
  campaign_builder_white_label BOOLEAN NOT NULL DEFAULT FALSE,
  campaign_builder_api_access BOOLEAN NOT NULL DEFAULT FALSE,

  -- Geographic scope (primarily for law firm tiers)
  geo_scope_states TEXT[],                    -- NULL when geo_scope_unlimited = true
  geo_scope_unlimited BOOLEAN NOT NULL DEFAULT FALSE,

  -- Seat tracking (matters most for law firms; agency/media count differently)
  seats_included INT NOT NULL DEFAULT 1,
  seats_used INT NOT NULL DEFAULT 0,

  -- Tort add-ons (law firm only; array of tort slugs they've paid for)
  active_tort_addons TEXT[] DEFAULT '{}',

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled')),
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,

  -- Stripe / billing references (populated when Stripe integration ships)
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_buyer_type
  ON subscriptions (buyer_type);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier
  ON subscriptions (subscription_tier);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer
  ON subscriptions (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- RLS: users can read their own subscription only; writes via service role
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies — those go through service role
-- (Stripe webhooks, admin actions). Users never write directly.

COMMENT ON TABLE subscriptions IS
  'Per-user subscription and Campaign Builder entitlements. Separate from `tenants` (branding/white-label).';
COMMENT ON COLUMN subscriptions.subscription_tier IS
  'Free-text tier identifier; allows grandfathered legacy tiers (e.g. agency_regional_v1).';
COMMENT ON COLUMN subscriptions.geo_scope_states IS
  'Array of state codes. NULL when geo_scope_unlimited = true.';
