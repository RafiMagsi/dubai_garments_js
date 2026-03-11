CREATE TABLE IF NOT EXISTS quote_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  storage_provider TEXT NOT NULL DEFAULT 'local',
  storage_bucket TEXT,
  storage_key TEXT,
  file_name TEXT,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  file_size INTEGER,
  status TEXT NOT NULL DEFAULT 'queued',
  error_message TEXT,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('queued', 'processing', 'generated', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_quote_documents_quote_id ON quote_documents(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_documents_status ON quote_documents(status);
CREATE INDEX IF NOT EXISTS idx_quote_documents_created_at ON quote_documents(created_at DESC);

CREATE TRIGGER trg_quote_documents_updated_at
BEFORE UPDATE ON quote_documents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
