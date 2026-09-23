-- Migration: Fix "permission denied for table users" errors
-- Tables like user_devices, login_history, security_events and storage.objects
-- reference auth.users with foreign keys. RLS policies also reference auth.users
-- to verify the primary admin. The authenticated/storage roles need the right
-- privileges for those references and subqueries to succeed.

DO $$
BEGIN
  -- Make sure the auth schema is reachable
  GRANT USAGE ON SCHEMA auth TO authenticated, anon, service_role;

  -- FK checks on auth.users require REFERENCES
  GRANT REFERENCES ON auth.users TO authenticated, anon, service_role;

  -- RLS policies use `EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email = ...)`
  -- to detect the primary admin. Column-level SELECT (id, email) keeps the grant minimal.
  GRANT SELECT (id, email) ON auth.users TO authenticated, anon, service_role;

  -- Grant the same privileges to the storage service role if it exists
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    GRANT USAGE ON SCHEMA auth TO supabase_storage_admin;
    GRANT REFERENCES ON auth.users TO supabase_storage_admin;
    GRANT SELECT (id, email) ON auth.users TO supabase_storage_admin;
  END IF;

  -- Auth admin may also need these privileges when creating/managing users
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    GRANT REFERENCES ON auth.users TO supabase_auth_admin;
    GRANT SELECT (id, email) ON auth.users TO supabase_auth_admin;
  END IF;
END $$;
