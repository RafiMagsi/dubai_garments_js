# Hestia Deployment

This project should run behind Hestia as a reverse-proxied application stack.
Hestia should terminate SSL and forward traffic to the storefront on `127.0.0.1:3005`.
Do not expose PostgreSQL, Redis, or FastAPI directly to the public internet.

## Recommended Topology

- Hestia + Nginx SSL termination
- Docker Compose for app runtime
- Public traffic:
  - `https://aisales.dropticks.com` -> `127.0.0.1:3005`
- Private/internal only:
  - PostgreSQL
  - Redis
  - FastAPI
  - AI service
- Optional localhost-only services:
  - n8n on `127.0.0.1:5678`
  - observability on `127.0.0.1:8200`

## Files

- Production Compose override:
  - [docker-compose.prod.yml](/Users/rafi/developer/ai_development/projects/dubai_garments/docker-compose.prod.yml)
- Hestia SSL proxy config:
  - [deploy/hestia/aisales.dropticks.com.ssl.conf](/Users/rafi/developer/ai_development/projects/dubai_garments/deploy/hestia/aisales.dropticks.com.ssl.conf)

## 1. Server Prerequisites

Install on the Hestia host:

- Docker Engine
- Docker Compose plugin
- Git

The app should be deployed outside `public_html`, for example:

```bash
mkdir -p /home/rafiadmin/apps
cd /home/rafiadmin/apps
git clone <your-repo-url> dubai_garments
cd dubai_garments
```

## 2. Create Runtime Env Files

You need these three runtime env files:

```bash
cp .env.test .env
cp apps/storefront-dubai_garments/.env.example apps/storefront-dubai_garments/.env
cp services/fastapi_quote_api/.env.test services/fastapi_quote_api/.env
```

Then set real production values.

### Root `.env`

At minimum, set:

```env
POSTGRES_DB=dubai_garments
POSTGRES_USER=rafi
POSTGRES_PASSWORD=change-this
NEXT_PROXY_PORT=3005
N8N_PORT=5678
OBSERVABILITY_PORT=8200
```

### Storefront env

File:

- `apps/storefront-dubai_garments/.env`

Required production changes:

```env
NODE_ENV=production
DATABASE_URL=postgresql://rafi:change-this@postgres:5432/dubai_garments
FASTAPI_BASE_URL=http://fastapi:8000
OBSERVABILITY_SERVICE_URL=http://observability:8200
NEXT_PUBLIC_API_BASE_URL=/api
NEXT_PUBLIC_FASTAPI_BASE_URL=/api
AUTH_SESSION_SECRET=replace-with-a-long-random-secret
CONFIG_MODE=auto
```

### FastAPI env

File:

- `services/fastapi_quote_api/.env`

Required production changes:

```env
DATABASE_URL=postgresql://rafi:change-this@postgres:5432/dubai_garments
REDIS_URL=redis://redis:6379/0
CORS_ORIGINS=https://aisales.dropticks.com
UPLOAD_DIR=uploads
STORAGE_LOCAL_DIR=uploads/quote_pdfs
STORAGE_PUBLIC_BASE_URL=https://aisales.dropticks.com
AUTOMATION_SHARED_SECRET=replace-with-a-long-random-secret
OPENAI_API_KEY=<your-key>
CONFIG_MODE=auto
```

Do not leave localhost URLs in production.

## 3. Build and Start the Stack

From repo root:

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

This production compose file does three important things:

1. Keeps the storefront on `127.0.0.1:3005`
2. Removes public exposure for PostgreSQL, Redis, FastAPI, and the AI service
3. Persists FastAPI uploads using a named Docker volume

## 4. Run Migrations

Run schema migrations after startup:

```bash
docker compose -f docker-compose.prod.yml run --rm -T \
  -e DATABASE_URL="postgresql://${POSTGRES_USER:-rafi}:${POSTGRES_PASSWORD:-secret}@postgres:5432/${POSTGRES_DB:-dubai_garments}" \
  -v "$PWD/apps/storefront-dubai_garments:/work" \
  -w /work \
  postgres sh ./scripts/db-migrate.sh
```

If needed, seed bootstrap users:

```bash
docker compose -f docker-compose.prod.yml exec storefront npm run db:seed:users
```

## 5. Verify Local App Health

Before touching Hestia config, verify:

```bash
curl -I http://127.0.0.1:3005
curl http://127.0.0.1:3005/api/metrics
docker compose -f docker-compose.prod.yml ps
```

The storefront must respond on `127.0.0.1:3005`.

## 6. Apply Hestia SSL Proxy Config

Use this Nginx SSL server block:

- [deploy/hestia/aisales.dropticks.com.ssl.conf](/Users/rafi/developer/ai_development/projects/dubai_garments/deploy/hestia/aisales.dropticks.com.ssl.conf)

It proxies:

- `https://aisales.dropticks.com`
- to `http://127.0.0.1:3005`

Important:

- Keep websocket headers
- Keep `X-Forwarded-Proto https`
- Do not proxy to `fastapi:8000` from Hestia

## 7. Firewall Rules

Publicly open only:

- `22`
- `80`
- `443`

Do not expose:

- `5432`
- `6379`
- `8000`
- `8100`
- `8200`
- `5678`
- `3005`

## 8. Updates

To deploy updates:

```bash
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

If migrations are included:

```bash
docker compose -f docker-compose.prod.yml run --rm -T \
  -e DATABASE_URL="postgresql://${POSTGRES_USER:-rafi}:${POSTGRES_PASSWORD:-secret}@postgres:5432/${POSTGRES_DB:-dubai_garments}" \
  -v "$PWD/apps/storefront-dubai_garments:/work" \
  -w /work \
  postgres sh ./scripts/db-migrate.sh
```

## 9. Operational Notes

- The current base `docker-compose.yml` is not production-safe by itself because it publishes internal services.
- This production compose file is standalone on purpose, so internal ports cannot leak through Compose merge behavior.
- FastAPI in the base file runs with `--reload`; this production compose file removes that.
- Quote PDFs and uploaded files persist through `fastapi_uploads_data`.
- If you want public `n8n` or `observability`, put each behind its own Hestia subdomain instead of exposing raw ports.
