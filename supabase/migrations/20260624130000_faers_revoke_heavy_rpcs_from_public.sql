-- =============================================================================
-- Harden: fully remove the 8M-row FAERS aggregators from the request-path roles
-- =============================================================================
-- Migration 20260624120000 REVOKEd EXECUTE on faers_drug_breakdown_by_reactions
-- / faers_monthly_trend_by_reactions FROM anon, authenticated. That was not
-- enough: Postgres grants EXECUTE on every function to PUBLIC by default, and
-- anon/authenticated inherit it through PUBLIC — so anon could still invoke the
-- 8M-row scan directly (has_function_privilege('anon', ...) stayed true after
-- the merge). That is the exact query that saturated the DB on 2026-06-24.
--
-- Revoke from PUBLIC (and re-revoke the named roles, harmless if already gone)
-- so the heavy aggregators can only run as their owner — i.e. as the matview
-- build + faers_refresh_signal_caches() (SECURITY DEFINER, owned by postgres).
-- The owner always retains EXECUTE regardless of grants, so the weekly refresh
-- is unaffected. Tort pages read the cheap cached RPCs (faers_cached_*).
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.faers_drug_breakdown_by_reactions(jsonb, text[])
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.faers_monthly_trend_by_reactions(jsonb, text[])
  FROM PUBLIC, anon, authenticated;
