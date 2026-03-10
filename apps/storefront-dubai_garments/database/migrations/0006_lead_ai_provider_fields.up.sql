ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS ai_provider TEXT,
  ADD COLUMN IF NOT EXISTS ai_fallback_used BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_ai_provider_check;

ALTER TABLE leads
  ADD CONSTRAINT leads_ai_provider_check
  CHECK (ai_provider IS NULL OR ai_provider IN ('system', 'openai'));
