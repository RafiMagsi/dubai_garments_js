DROP INDEX IF EXISTS idx_leads_ai_processed_at;

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_ai_complexity_check;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_ai_urgency_check;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_ai_quantity_check;

ALTER TABLE leads
  DROP COLUMN IF EXISTS ai_processed_at,
  DROP COLUMN IF EXISTS ai_complexity,
  DROP COLUMN IF EXISTS ai_urgency,
  DROP COLUMN IF EXISTS ai_quantity,
  DROP COLUMN IF EXISTS ai_product;
