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
    EXECUTE format('ALTER TABLE public.%I NO FORCE ROW LEVEL SECURITY', rls_table);
  END LOOP;
END
$$;

DROP POLICY IF EXISTS tenant_isolation ON public.users;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.system_settings;
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_system_settings_tenant_scope_key'
      AND conrelid = 'public.system_settings'::regclass
  ) THEN
    ALTER TABLE public.system_settings
      DROP CONSTRAINT uq_system_settings_tenant_scope_key;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_system_settings_scope_key'
      AND conrelid = 'public.system_settings'::regclass
  ) THEN
    ALTER TABLE public.system_settings
      ADD CONSTRAINT uq_system_settings_scope_key UNIQUE (scope, key);
  END IF;
END
$$;
