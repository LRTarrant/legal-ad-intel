-- Founder-global user-activity roster.
--
-- Aggregates activity_log into a per-user summary across ALL tenants for the
-- super_admin "User Activity" surface. PostgREST can't GROUP BY without an RPC,
-- and JS-side aggregation over the raw table doesn't scale.
--
-- SECURITY DEFINER + an internal is_super_admin() guard: the function returns
-- rows only when invoked under a super_admin session (auth.uid() = a super
-- admin). It must therefore be called with the caller's RLS client, NOT the
-- service-role key (service role has a null auth.uid() and fails the guard).
-- Uses the existing idx_activity_log_user_created index on (user_id, created_at).

CREATE OR REPLACE FUNCTION public.get_activity_user_summary(
  p_from timestamptz,
  p_to timestamptz
)
RETURNS TABLE (
  user_id uuid,
  tenant_id uuid,
  event_count bigint,
  page_view_count bigint,
  login_count bigint,
  last_event_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cross-tenant data is super_admin only.
  IF NOT public.is_super_admin() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    a.user_id,
    a.tenant_id,
    count(*)::bigint AS event_count,
    count(*) FILTER (WHERE a.event_type = 'page_view')::bigint AS page_view_count,
    count(*) FILTER (WHERE a.event_type = 'login')::bigint AS login_count,
    max(a.created_at) AS last_event_at
  FROM public.activity_log a
  WHERE a.created_at >= p_from
    AND a.created_at <= p_to
  GROUP BY a.user_id, a.tenant_id
  ORDER BY max(a.created_at) DESC;
END;
$$;
