# Observability Service

Centralized observability API for health checks, dependency checks, metrics scraping, and persistent history sampling.

## Endpoints

- `GET /health`
- `GET /metrics`
- `GET /api/v1/checks`
- `GET /api/v1/scrape?target=fastapi_metrics|storefront_metrics|ai_health|fastapi_health|storefront_health`
- `GET /api/v1/history?limit=240&hours=24`

## Background sampler

The service runs a background sampling loop and stores snapshots in PostgreSQL table:

- `observability_history_samples`

Environment controls:

- `OBS_SAMPLE_INTERVAL_SECONDS` (default `10`)
- `OBS_HISTORY_RETENTION_DAYS` (default `30`)

## Local run

```bash
cd services/observability_service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.test .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8200
```

If `OBSERVABILITY_SERVICE_TOKEN` is set, pass header:

- `X-Observability-Token: <token>`
