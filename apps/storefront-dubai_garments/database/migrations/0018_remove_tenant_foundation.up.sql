DO $$
DECLARE
  table_name TEXT;
  constraint_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users',
    'customers',
    'products',
    'product_variants',
    'leads',
    'deals',
    'quotes',
    'quote_items',
    'communications',
    'activities',
    'automation_runs',
    'followups',
    'quote_documents',
    'system_settings',
    'admin_config_command_runs',
    'observability_history_samples',
    'ai_logs'
  ]
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I NO FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', table_name);

    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_assign_tenant_id ON public.%I', table_name, table_name);

    constraint_name := format('fk_%s_tenant_id', table_name);
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', table_name, constraint_name);

    EXECUTE format('DROP INDEX IF EXISTS idx_%I_tenant_id', table_name);
    EXECUTE format('ALTER TABLE public.%I DROP COLUMN IF EXISTS tenant_id', table_name);
  END LOOP;
END
$$;

DROP INDEX IF EXISTS idx_ai_logs_tenant_created_at;
DO $$
BEGIN
  IF to_regclass('public.ai_logs') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at
      ON public.ai_logs (created_at DESC);
  END IF;
END
$$;

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

DROP FUNCTION IF EXISTS assign_tenant_id();
DROP FUNCTION IF EXISTS app_default_tenant_id();
DROP FUNCTION IF EXISTS app_current_tenant_id();

DO $$
BEGIN
  IF to_regclass('public.tenants') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_tenants_updated_at ON public.tenants;
  END IF;
END
$$;

DROP TABLE IF EXISTS public.tenants;
