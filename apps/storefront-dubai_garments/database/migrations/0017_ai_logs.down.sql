ALTER TABLE IF EXISTS public.ai_logs NO FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.ai_logs;
ALTER TABLE IF EXISTS public.ai_logs DISABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_ai_logs_assign_tenant_id ON public.ai_logs;
DROP TRIGGER IF EXISTS trg_ai_logs_updated_at ON public.ai_logs;

ALTER TABLE IF EXISTS public.ai_logs
  DROP CONSTRAINT IF EXISTS fk_ai_logs_tenant_id;

DROP INDEX IF EXISTS idx_ai_logs_trigger_entity;
DROP INDEX IF EXISTS idx_ai_logs_workflow_status;
DROP INDEX IF EXISTS idx_ai_logs_tenant_created_at;

DROP TABLE IF EXISTS public.ai_logs;
