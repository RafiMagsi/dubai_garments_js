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
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', rls_table);
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', rls_table);
  END LOOP;
END
$$;

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
    'observability_history_samples'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_assign_tenant_id ON public.%I', table_name, table_name);

    constraint_name := format('fk_%s_tenant_id', table_name);
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = constraint_name
        AND conrelid = format('public.%I', table_name)::regclass
    ) THEN
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', table_name, constraint_name);
    END IF;

    EXECUTE format('DROP INDEX IF EXISTS idx_%I_tenant_id', table_name);
    EXECUTE format('ALTER TABLE public.%I DROP COLUMN IF EXISTS tenant_id', table_name);
  END LOOP;
END
$$;

DROP FUNCTION IF EXISTS assign_tenant_id();
DROP FUNCTION IF EXISTS app_default_tenant_id();
DROP FUNCTION IF EXISTS app_current_tenant_id();

DROP TRIGGER IF EXISTS trg_tenants_updated_at ON tenants;
DROP TABLE IF EXISTS tenants;
