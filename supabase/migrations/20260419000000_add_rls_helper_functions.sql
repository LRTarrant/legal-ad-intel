-- RLS helper functions referenced by alert_configs, alert_events, activity_log
-- These must exist for the RLS policies to evaluate correctly.

-- my_tenant_id(): returns the current authenticated user's tenant_id from profiles
CREATE OR REPLACE FUNCTION public.my_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;

-- is_super_admin(): returns true if the current user has the super_admin role
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
  )
$$;

-- is_tenant_admin(): returns true if the current user has an admin-level role
CREATE OR REPLACE FUNCTION public.is_tenant_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
  )
$$;
