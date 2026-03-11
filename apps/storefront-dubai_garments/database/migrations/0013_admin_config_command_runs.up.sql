CREATE TABLE IF NOT EXISTS admin_config_command_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email TEXT,
  execution_type TEXT NOT NULL,
  command_key TEXT NOT NULL,
  command_label TEXT NOT NULL,
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'running',
  output_log TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (execution_type IN ('script', 'terminal')),
  CHECK (status IN ('running', 'success', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_admin_cfg_runs_user_id ON admin_config_command_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_cfg_runs_status ON admin_config_command_runs(status);
CREATE INDEX IF NOT EXISTS idx_admin_cfg_runs_command_key ON admin_config_command_runs(command_key);
CREATE INDEX IF NOT EXISTS idx_admin_cfg_runs_started_at ON admin_config_command_runs(started_at DESC);

CREATE TRIGGER trg_admin_cfg_runs_updated_at
BEFORE UPDATE ON admin_config_command_runs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
