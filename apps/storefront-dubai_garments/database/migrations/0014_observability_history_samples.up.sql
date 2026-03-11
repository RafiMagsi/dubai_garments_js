CREATE TABLE IF NOT EXISTS observability_history_samples (
  id BIGSERIAL PRIMARY KEY,
  sampled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  healthy_checks INTEGER NOT NULL,
  failed_checks INTEGER NOT NULL,
  total_checks INTEGER NOT NULL,
  availability_percent DOUBLE PRECISION NOT NULL,
  saturation_percent DOUBLE PRECISION NOT NULL,
  request_rate_rps DOUBLE PRECISION NOT NULL,
  error_rate_percent DOUBLE PRECISION NOT NULL,
  avg_latency_ms DOUBLE PRECISION NOT NULL,
  fastapi_total_requests DOUBLE PRECISION NOT NULL,
  storefront_total_requests DOUBLE PRECISION NOT NULL,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_observability_history_samples_sampled_at
  ON observability_history_samples(sampled_at DESC);
