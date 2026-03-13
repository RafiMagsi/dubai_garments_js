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

## GitHub Deploy (CI/CD)

Automated deploy workflow is included:

- [.github/workflows/deploy.yml](/Users/rafi/developer/ai_development/projects/dubai_garments/.github/workflows/deploy.yml)
- [scripts/github-deploy.sh](/Users/rafi/developer/ai_development/projects/dubai_garments/scripts/github-deploy.sh)

### Required GitHub Secrets

Add in repo settings: `Settings -> Secrets and variables -> Actions`

- `DEPLOY_HOST` (server IP or domain)
- `DEPLOY_USER` (SSH user)
- `DEPLOY_SSH_KEY` (private key content)
- `DEPLOY_PATH` (absolute path on server, e.g. `/opt/dubai_garments`)

### Deploy trigger options

1. Push to `main`:
- runs deploy in `docker` mode by default

2. Manual deploy:
- GitHub Actions -> `Deploy` -> `Run workflow`
- choose mode: `docker` or `systemd`
- choose git ref/branch

### Server prerequisites

- For `docker` mode:
  - Docker + Docker Compose installed
- For `systemd` mode:
  - Complete once: `./scripts/non-docker-setup.sh`
  - Install units once: `sudo ./scripts/install-systemd-units.sh`
  - Configure passwordless sudo for service restarts, or restart manually

## AWS Lightsail Setup (aisales.appcenter.me)

1. Create Lightsail instance (Ubuntu 22.04+ recommended).
2. Attach a Static IP.
3. DNS in Lightsail zone (`appcenter.me`):
   - `A` record `appcenter.me` -> Static IP
   - `CNAME` record `www.appcenter.me` -> `appcenter.me`
   - `A` record `aisales.appcenter.me` -> Static IP
4. Point domain nameservers at registrar to Lightsail nameservers.
5. Verify DNS:
   - `dig aisales.appcenter.me A +short`
   - expected: your Static IP

### GitHub Actions secrets for this domain

- `DEPLOY_HOST=aisales.appcenter.me` (or use server public IP)
- `DEPLOY_USER=<your-ssh-user>`
- `DEPLOY_SSH_KEY=<private key content>`
- `DEPLOY_PATH=/home/<your-ssh-user>/apps/dubai_garments`

### First deploy

1. Push repo changes.
2. In GitHub: `Actions -> Deploy -> Run workflow`.
3. Choose:
   - `deploy_mode=docker` (recommended first run), or
   - `deploy_mode=systemd`
4. Open installer:
   - `http://aisales.appcenter.me/install`
