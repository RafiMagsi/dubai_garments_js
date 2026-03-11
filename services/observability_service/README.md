# Observability Service

Centralized observability API for health checks, dependency checks, and metrics scraping.

## Endpoints

- `GET /health`
- `GET /metrics`
- `GET /api/v1/checks`
- `GET /api/v1/scrape?target=fastapi_metrics|storefront_metrics|ai_health|fastapi_health|storefront_health`

## Local run

```bash
cd services/observability_service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8200
```

If `OBSERVABILITY_SERVICE_TOKEN` is set, pass header:

- `X-Observability-Token: <token>`
