-- Migration: seed_super_admin_subscription
-- Purpose: give every super_admin user an internal admin subscription row
--          so the app doesn't fall back to mass-tort-only legacy bypass
--          when they hit Campaign Builder / Settings.
--
-- Background:
--   The subscriptions table was added in Phase 0.something. Real users
--   get rows via Stripe webhook; super_admin / dev users have no
--   billing path so they fell through to the legacy "no row \u2192 mass tort
--   only" branch in entitlements.ts. That blocks PI access for the
--   founder using their own product.
--
--   This migration upserts an 'internal_admin' subscription for every
--   profile with role='super_admin'. Future super_admin promotions
--   need to either run this migration again or get inserted via a
--   trigger \u2014 we'll wire a trigger when there's a second super_admin.
--
-- Idempotent: ON CONFLICT updates the row to the canonical admin shape
--   so re-running normalizes any drift from manual edits.
--
-- Flags chosen:
--   buyer_type           media_company   (broadest UI: multi-firm + WL)
--   subscription_tier    internal_admin  (clearly internal in queries)
--   campaign_builder_*   all true        (full access)
--   monthly_cap          NULL            (unlimited)
--   geo_scope_unlimited  true
--   status               active
--   seats_included       999             (sanity ceiling, never hit)

INSERT INTO public.subscriptions (
  user_id,
  buyer_type,
  subscription_tier,
  billing_cycle,
  campaign_builder_mass_tort,
  campaign_builder_pi,
  campaign_builder_monthly_cap,
  campaign_builder_white_label,
  campaign_builder_api_access,
  geo_scope_states,
  geo_scope_unlimited,
  seats_included,
  seats_used,
  active_tort_addons,
  status,
  current_period_start,
  current_period_end
)
SELECT
  p.id,                            -- profiles.id == auth.users.id
  'media_company',
  'internal_admin',
  'annual',
  TRUE,
  TRUE,
  NULL,
  TRUE,
  TRUE,
  NULL,
  TRUE,
  999,
  1,
  ARRAY[]::TEXT[],
  'active',
  NOW(),
  NOW() + INTERVAL '100 years'    -- effectively permanent
FROM public.profiles p
WHERE p.role = 'super_admin'
ON CONFLICT (user_id) DO UPDATE SET
  buyer_type = EXCLUDED.buyer_type,
  subscription_tier = EXCLUDED.subscription_tier,
  billing_cycle = EXCLUDED.billing_cycle,
  campaign_builder_mass_tort = EXCLUDED.campaign_builder_mass_tort,
  campaign_builder_pi = EXCLUDED.campaign_builder_pi,
  campaign_builder_monthly_cap = EXCLUDED.campaign_builder_monthly_cap,
  campaign_builder_white_label = EXCLUDED.campaign_builder_white_label,
  campaign_builder_api_access = EXCLUDED.campaign_builder_api_access,
  geo_scope_states = EXCLUDED.geo_scope_states,
  geo_scope_unlimited = EXCLUDED.geo_scope_unlimited,
  seats_included = EXCLUDED.seats_included,
  status = EXCLUDED.status,
  current_period_start = EXCLUDED.current_period_start,
  current_period_end = EXCLUDED.current_period_end,
  updated_at = NOW()
WHERE
  -- Only normalize rows that ARE internal_admin already, so we don't
  -- accidentally clobber a real subscription if a super_admin happens
  -- to have purchased one.
  public.subscriptions.subscription_tier = 'internal_admin';

COMMENT ON COLUMN public.subscriptions.subscription_tier IS
  'Tier label. Includes ''internal_admin'' for super_admin users (full access, no billing).';
