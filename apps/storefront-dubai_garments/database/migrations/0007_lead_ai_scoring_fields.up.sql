ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS ai_score INTEGER,
  ADD COLUMN IF NOT EXISTS ai_classification TEXT,
  ADD COLUMN IF NOT EXISTS ai_reasoning JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_ai_score_check;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_ai_classification_check;

ALTER TABLE leads
  ADD CONSTRAINT leads_ai_score_check
  CHECK (ai_score IS NULL OR (ai_score >= 0 AND ai_score <= 100));

ALTER TABLE leads
  ADD CONSTRAINT leads_ai_classification_check
  CHECK (ai_classification IS NULL OR ai_classification IN ('HOT', 'WARM', 'COLD'));
