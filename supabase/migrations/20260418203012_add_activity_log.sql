-- Activity tracking for user engagement per tenant
CREATE TABLE public.activity_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  page_path text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index for querying by tenant + time range (most common query)
CREATE INDEX idx_activity_log_tenant_created ON activity_log (tenant_id, created_at DESC);

-- Index for querying by user
CREATE INDEX idx_activity_log_user_created ON activity_log (user_id, created_at DESC);

-- Index for event type filtering
CREATE INDEX idx_activity_log_event_type ON activity_log (event_type);

-- RLS policies
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Users can insert their own activity
CREATE POLICY "Users can insert own activity" ON activity_log
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND tenant_id = public.my_tenant_id()
  );

-- Super admins can read all activity (for cross-tenant reporting)
CREATE POLICY "Super admins can read all activity" ON activity_log
  FOR SELECT USING (public.is_super_admin());

-- Tenant admins can read their tenant's activity
CREATE POLICY "Tenant admins can read tenant activity" ON activity_log
  FOR SELECT USING (
    tenant_id = public.my_tenant_id()
    AND public.is_tenant_admin()
  );
