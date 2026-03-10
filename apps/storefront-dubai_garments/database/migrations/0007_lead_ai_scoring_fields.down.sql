ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_ai_classification_check;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_ai_score_check;

ALTER TABLE leads
  DROP COLUMN IF EXISTS ai_reasoning,
  DROP COLUMN IF EXISTS ai_classification,
  DROP COLUMN IF EXISTS ai_score;
