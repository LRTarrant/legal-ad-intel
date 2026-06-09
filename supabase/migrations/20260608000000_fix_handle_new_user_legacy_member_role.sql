-- Fix handle_new_user() writing the legacy 'member' role.
--
-- The on_auth_user_created trigger (hand-applied via the SQL editor, so it was
-- never in a migration) inserts new non-first tenant members with role
-- 'member'. Migration 20260604000000 renamed member -> user and NARROWED the
-- profiles.role CHECK to ('super_admin','tenant_admin','manager','user'), but it
-- could not touch this out-of-band trigger. Result: every new signup into an
-- existing tenant fails with "Database error creating new user" (CHECK
-- violation on role='member'). First-user-in-tenant still works because that
-- path writes 'tenant_admin'.
--
-- Fix: write 'user' instead of 'member'. Body is otherwise identical to the
-- live function. Idempotent (CREATE OR REPLACE); the trigger itself is
-- unchanged and keeps pointing at this function.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  v_tenant_id := COALESCE(
    (NEW.raw_user_meta_data->>'tenant_id')::uuid,
    (SELECT id FROM public.tenants WHERE slug = 'lmi')
  );

  INSERT INTO public.profiles (id, tenant_id, full_name, role)
  VALUES (
    NEW.id,
    v_tenant_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE
      WHEN NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE tenant_id = v_tenant_id
      ) THEN 'tenant_admin'
      ELSE 'user'
    END
  );

  RETURN NEW;
END;
$$;
