ALTER TABLE quote_items
  ADD COLUMN IF NOT EXISTS pricing_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb;
