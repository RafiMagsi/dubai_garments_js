# Dubai Garments Storefront + Admin

Next.js storefront and private admin panel for AI sales automation workflows.

## Environment Setup

```bash
cp .env.example .env.local
```

Fill `.env.local` with your real values.  
`.env.local` is ignored by git.

## Config Mode

Set `CONFIG_MODE=auto` in both storefront and FastAPI env files:

- Development (`NODE_ENV=development`): configuration is read from local env files.
- Production: configuration is read from DB-backed `system_settings` (managed from Admin Configuration page).

## Database Setup

```bash
npm run db:migrate
npm run db:seed
npm run db:seed:users
```

## Run App

```bash
npm run dev
```

Open:

- Storefront: `http://localhost:3000`
- Customer login: `http://localhost:3000/customer/login`
- Admin login: `http://localhost:3000/admin/login`
- Storefront metrics: `http://localhost:3000/api/metrics`
- FastAPI metrics: `http://localhost:8000/metrics`

## Notes

- Admin routes and admin APIs are role-protected by middleware.
- Login credentials are fetched from the `users` table (not env credentials).
- `db:seed:users` creates/updates one admin and one customer user from `BOOTSTRAP_*` vars in `.env.local`.
- Request IDs are injected across storefront and FastAPI via `X-Request-ID`.
- OpenAI inference runs as a dedicated service (`services/ai_openai_service`) and FastAPI calls it via `AI_SERVICE_URL`.

## Docker

Docker Compose and Docker Desktop setup is documented here:

- [Docker Desktop Setup](/Users/rafi/developer/ai_development/projects/dubai_garments/docs/docker-desktop-setup.md)
- [Architecture Overview](/Users/rafi/developer/ai_development/projects/dubai_garments/docs/architecture-overview.md)
- [n8n Follow-up Automation](/Users/rafi/developer/ai_development/projects/dubai_garments/docs/n8n-followup-automation.md)
- [n8n Scheduler Cron](/Users/rafi/developer/ai_development/projects/dubai_garments/docs/n8n-scheduler-cron.md)
- [n8n SendGrid Inbound Test](/Users/rafi/developer/ai_development/projects/dubai_garments/docs/n8n-sendgrid-inbound-test.md)

## One-Command Bootstrap

From project root:

```bash
./scripts/setup-install.sh
```

Optional (auto-open browser on local machine):

```bash
./scripts/setup-install.sh --open
```

This command will:

1. Create missing Docker env files from templates
2. Build and start Docker services
3. Wait for storefront readiness
4. Run DB migrations inside storefront container
5. Print installer URL (`/install`, with token if configured)

## Server Mode (No Docker + systemd)

Use this when Docker is blocked or unavailable on the target server.

Requirements:
- Node.js 20+ and npm
- Python 3.10+ with `venv`
- PostgreSQL client (`psql`)
- Reachable PostgreSQL + Redis (local or managed)

### 1) Bootstrap everything (deps + venv + migrate + seed + build)

```bash
./scripts/non-docker-setup.sh
```

Optional flags:

```bash
./scripts/non-docker-setup.sh --skip-seed
./scripts/non-docker-setup.sh --skip-build
```

### 2) Install systemd services

```bash
sudo ./scripts/install-systemd-units.sh
```

Optional AI service:

```bash
sudo ./scripts/install-systemd-units.sh --enable-ai
```

### 3) Verify service status

```bash
sudo systemctl status dubai-garments-storefront dubai-garments-fastapi dubai-garments-worker
```

### 4) Open installer

- `http://localhost:3000/install`

Unit files are in:

- [deploy/systemd/README.md](/Users/rafi/developer/ai_development/projects/dubai_garments/deploy/systemd/README.md)
