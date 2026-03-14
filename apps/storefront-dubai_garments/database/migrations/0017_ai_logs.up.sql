CREATE TABLE IF NOT EXISTS ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT app_default_tenant_id(),
  source_service TEXT NOT NULL DEFAULT 'fastapi_quote_api',
  workflow_name TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  trigger_entity_type TEXT,
  trigger_entity_id UUID,
  status TEXT NOT NULL,
  fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_tenant_created_at
  ON ai_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_workflow_status
  ON ai_logs (workflow_name, status);
CREATE INDEX IF NOT EXISTS idx_ai_logs_trigger_entity
  ON ai_logs (trigger_entity_type, trigger_entity_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_ai_logs_tenant_id'
      AND conrelid = 'public.ai_logs'::regclass
  ) THEN
    ALTER TABLE public.ai_logs
      ADD CONSTRAINT fk_ai_logs_tenant_id
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_ai_logs_updated_at'
      AND tgrelid = 'public.ai_logs'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER trg_ai_logs_updated_at
    BEFORE UPDATE ON ai_logs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END
$$;

DROP TRIGGER IF EXISTS trg_ai_logs_assign_tenant_id ON public.ai_logs;
CREATE TRIGGER trg_ai_logs_assign_tenant_id
BEFORE INSERT ON public.ai_logs
FOR EACH ROW EXECUTE FUNCTION assign_tenant_id();

ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.ai_logs;
CREATE POLICY tenant_isolation ON public.ai_logs
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

ALTER TABLE public.ai_logs FORCE ROW LEVEL SECURITY;
