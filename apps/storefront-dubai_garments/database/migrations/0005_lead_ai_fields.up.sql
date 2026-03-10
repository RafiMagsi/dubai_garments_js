ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS ai_product TEXT,
  ADD COLUMN IF NOT EXISTS ai_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS ai_urgency TEXT,
  ADD COLUMN IF NOT EXISTS ai_complexity TEXT,
  ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMPTZ;

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_ai_quantity_check;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_ai_urgency_check;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_ai_complexity_check;

ALTER TABLE leads
  ADD CONSTRAINT leads_ai_quantity_check
  CHECK (ai_quantity IS NULL OR ai_quantity > 0);

ALTER TABLE leads
  ADD CONSTRAINT leads_ai_urgency_check
  CHECK (ai_urgency IS NULL OR ai_urgency IN ('low', 'medium', 'high'));

ALTER TABLE leads
  ADD CONSTRAINT leads_ai_complexity_check
  CHECK (ai_complexity IS NULL OR ai_complexity IN ('low', 'medium', 'high'));

CREATE INDEX IF NOT EXISTS idx_leads_ai_processed_at ON leads(ai_processed_at);
