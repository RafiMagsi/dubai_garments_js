CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_tenants_updated_at'
      AND tgrelid = 'public.tenants'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER trg_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;

INSERT INTO tenants (slug, name)
VALUES ('default', 'Default Tenant')
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION app_current_tenant_id()
RETURNS UUID AS $$
DECLARE
  v_value TEXT;
BEGIN
  v_value := current_setting('app.tenant_id', TRUE);
  IF v_value IS NULL OR btrim(v_value) = '' THEN
    RETURN NULL;
  END IF;
  RETURN v_value::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION app_default_tenant_id()
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT id
  INTO v_tenant_id
  FROM tenants
  WHERE slug = 'default'
  LIMIT 1;

  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION assign_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := app_current_tenant_id();
  END IF;
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := app_default_tenant_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id UUID', table_name);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT app_default_tenant_id()', table_name);
    EXECUTE format('UPDATE public.%I SET tenant_id = app_default_tenant_id() WHERE tenant_id IS NULL', table_name);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', table_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_tenant_id ON public.%I(tenant_id)', table_name, table_name);

    constraint_name := format('fk_%s_tenant_id', table_name);
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = constraint_name
        AND conrelid = format('public.%I', table_name)::regclass
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT',
        table_name,
        constraint_name
      );
    END IF;

    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_assign_tenant_id ON public.%I', table_name, table_name);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_assign_tenant_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION assign_tenant_id()',
      table_name,
      table_name
    );
  END LOOP;
END
$$;

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
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', rls_table);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', rls_table);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I USING (tenant_id = app_current_tenant_id()) WITH CHECK (tenant_id = app_current_tenant_id())',
      rls_table
    );
  END LOOP;
END
$$;
