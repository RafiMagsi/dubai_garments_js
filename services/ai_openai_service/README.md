# AI Runtime Proxy Service

Dedicated microservice that proxies lead AI analysis requests to the shared storefront `llm-runtime`.

## Endpoints

- `GET /health`
- `POST /api/v1/lead-ai/analyze`

## Run locally

```bash
cd services/ai_openai_service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.test .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8100
```

## Auth

If `AI_SERVICE_AUTH_TOKEN` is set, FastAPI callers must send:

- Header: `X-AI-Service-Token: <token>`
