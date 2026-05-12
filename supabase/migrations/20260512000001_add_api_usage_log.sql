-- Migration: add_api_usage_log
-- Purpose: Provider-agnostic infra-cost ledger for external API calls
-- (OpenAI, Searchapi, Apify). Distinct from `generation_costs`, which
-- remains the per-user/per-campaign attribution ledger.
--
-- Why both tables:
--   generation_costs is keyed on user_id (NOT NULL) + campaign_id and
--   serves COGS / per-firm chargeback for AI generation features.
--   api_usage_log is broader: it covers pipeline cron jobs (no user)
--   and infra costs (Searchapi searches, Apify compute units) that
--   don't fit the campaign-builder shape. They are written
--   independently — no cross-table dedup. The admin dashboard reads
--   api_usage_log for "total spend by provider" and generation_costs
--   only for per-user/per-campaign attribution.
--
-- Pricing config table:
--   For Searchapi (and any future flat-rate provider), the rate per
--   unit and the monthly plan quota live in api_pricing_config so a
--   plan upgrade is a single SQL UPDATE. OpenAI per-model rates stay
--   in web/lib/cost-tracking/calculator.ts (too many variants for a
--   table, already the established pattern). Apify cost is read from
--   the run's `usage.totalUsageUsd` field at terminal state — no
--   config needed.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE api_provider AS ENUM ('openai', 'searchapi', 'apify');

CREATE TYPE api_unit_type AS ENUM (
  'tokens',
  'searches',
  'compute_units',
  'characters',
  'seconds',
  'images'
);

-- ---------------------------------------------------------------------------
-- api_usage_log
-- ---------------------------------------------------------------------------

CREATE TABLE public.api_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider api_provider NOT NULL,
  operation text NOT NULL,
  model_or_actor text NOT NULL,
  units_consumed numeric NOT NULL DEFAULT 0,
  unit_type api_unit_type NOT NULL,
  -- USD dollars (not cents): Apify compute can be < $0.01 per unit.
  -- numeric(12,6) gives 6 decimal places, enough for $0.000001 precision.
  cost_usd numeric(12, 6) NOT NULL DEFAULT 0,
  -- Idempotency key for retry-safe inserts. Generated at log time
  -- (UUID); not used for cross-table joins.
  request_id text,
  -- Source: API route path (e.g. 'api/campaigns/generate-pi-meta-ad')
  -- or pipeline name (e.g. 'pipelines.ad_intel_daily').
  called_from text NOT NULL,
  tenant_id uuid REFERENCES public.firms(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for the queries the dashboard will actually run.
CREATE INDEX idx_api_usage_log_provider_created
  ON public.api_usage_log (provider, created_at DESC);

CREATE INDEX idx_api_usage_log_created
  ON public.api_usage_log (created_at DESC);

CREATE INDEX idx_api_usage_log_called_from_created
  ON public.api_usage_log (called_from, created_at DESC);

CREATE INDEX idx_api_usage_log_tenant_created
  ON public.api_usage_log (tenant_id, created_at DESC)
  WHERE tenant_id IS NOT NULL;

-- Idempotency: dedupe retries within the same provider's request_id space.
CREATE UNIQUE INDEX idx_api_usage_log_request_id
  ON public.api_usage_log (provider, request_id)
  WHERE request_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- RLS — matches activity_log pattern (20260418203012):
--   super_admin SELECT only; service role bypasses RLS for inserts.
-- ---------------------------------------------------------------------------

ALTER TABLE public.api_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_usage_log_super_admin_select" ON public.api_usage_log
  FOR SELECT USING (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- api_pricing_config — editable rates / quotas for flat-rate providers
-- ---------------------------------------------------------------------------

CREATE TABLE public.api_pricing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider api_provider NOT NULL,
  unit_type api_unit_type NOT NULL,
  rate_per_unit_usd numeric(12, 6) NOT NULL,
  monthly_quota_units integer,
  plan_name text,
  effective_from date NOT NULL DEFAULT current_date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- One active rate row per (provider, unit_type, effective_from).
  -- When a plan changes, insert a new row with a later effective_from;
  -- the lib functions read the most recent row <= today.
  UNIQUE (provider, unit_type, effective_from)
);

CREATE INDEX idx_api_pricing_config_provider_unit_effective
  ON public.api_pricing_config (provider, unit_type, effective_from DESC);

ALTER TABLE public.api_pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_pricing_config_super_admin_select" ON public.api_pricing_config
  FOR SELECT USING (public.is_super_admin());

-- Seed: Searchapi.io Developer plan ($99/mo, 10k searches → $0.0099/search).
-- Update via SQL UPDATE when the plan changes; no code change required.
INSERT INTO public.api_pricing_config
  (provider, unit_type, rate_per_unit_usd, monthly_quota_units, plan_name, notes)
VALUES
  ('searchapi', 'searches', 0.0099, 10000, 'Developer',
   'Effective rate from $99/mo for 10k searches. Update this row on plan change.');

COMMENT ON TABLE public.api_usage_log IS
  'Provider-agnostic infra-cost ledger for external API calls. Distinct from generation_costs (per-user/per-campaign attribution). Dashboard at admin/api-costs reads from here.';
COMMENT ON COLUMN public.api_usage_log.cost_usd IS
  'USD dollars (NOT cents). numeric(12,6) for sub-cent precision (Apify compute units).';
COMMENT ON COLUMN public.api_usage_log.called_from IS
  'API route path or pipeline name. Free-form but standardized: e.g. "api/campaigns/generate-pi-meta-ad" or "pipelines.ad_intel_daily".';
COMMENT ON COLUMN public.api_usage_log.request_id IS
  'Idempotency key for retry-safe inserts within api_usage_log. UUID generated at log time. Not used for cross-table joins.';

COMMENT ON TABLE public.api_pricing_config IS
  'Editable per-provider flat rates and monthly quotas. Searchapi rate lives here so plan upgrades are a single SQL UPDATE. OpenAI per-model rates stay in code (calculator.ts).';
