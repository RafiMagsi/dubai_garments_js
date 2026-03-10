ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_ai_provider_check;

ALTER TABLE leads
  DROP COLUMN IF EXISTS ai_fallback_used,
  DROP COLUMN IF EXISTS ai_provider;
