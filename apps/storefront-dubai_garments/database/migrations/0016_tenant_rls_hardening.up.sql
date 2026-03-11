DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_system_settings_scope_key'
      AND conrelid = 'public.system_settings'::regclass
  ) THEN
    ALTER TABLE public.system_settings
      DROP CONSTRAINT uq_system_settings_scope_key;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_system_settings_tenant_scope_key'
      AND conrelid = 'public.system_settings'::regclass
  ) THEN
    ALTER TABLE public.system_settings
      ADD CONSTRAINT uq_system_settings_tenant_scope_key UNIQUE (tenant_id, scope, key);
  END IF;
END
$$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.users;
CREATE POLICY tenant_isolation ON public.users
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.system_settings;
CREATE POLICY tenant_isolation ON public.system_settings
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

DO $$
DECLARE
  rls_table TEXT;
BEGIN
  FOREACH rls_table IN ARRAY ARRAY[
    'customers',
    'leads',
    'deals',
    'quotes',
    'quote_items',
    'communications',
    'activities',
    'automation_runs',
    'followups',
    'quote_documents'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', rls_table);
  END LOOP;
END
$$;
