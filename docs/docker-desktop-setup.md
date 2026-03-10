# Docker Desktop Setup

## What you install

Install:

1. Docker Desktop

This gives you:

1. Docker Engine
2. Docker Compose
3. Docker Desktop GUI

## 1. Install Docker Desktop

Download and install Docker Desktop for macOS:

1. Open `https://www.docker.com/products/docker-desktop/`
2. Download the correct version for your Mac:
   `Apple Silicon` or `Intel`
3. Install Docker Desktop
4. Open Docker Desktop and wait until it shows Docker is running

## 2. Prepare local Docker env files

From project root:

```bash
cp .env.docker.example .env.docker.local
cp apps/storefront-dubai_garments/.env.docker.example apps/storefront-dubai_garments/.env.docker.local
cp services/fastapi_quote_api/.env.docker.example services/fastapi_quote_api/.env.docker.local
```

Then fill the real values:

1. `POSTGRES_PASSWORD`
2. `AUTH_SESSION_SECRET`
3. `BOOTSTRAP_ADMIN_*`
4. `BOOTSTRAP_CUSTOMER_*`
5. `OPENAI_API_KEY`

Important:

1. In Docker env files, database host must be `postgres`
2. In FastAPI Docker env, Redis host must be `redis`
3. In storefront Docker env, FastAPI base URL must be `http://fastapi:8000`

## 3. Start the stack

From project root:

```bash
docker compose up --build
```

This starts:

1. `postgres`
2. `redis`
3. `fastapi`
4. `worker`
5. `storefront`

## 4. Open Docker Desktop GUI

In Docker Desktop:

1. Open the `Containers` view
2. You should see the `dubai_garments` compose project
3. Expand it to see:
   - `dubai_garments_postgres`
   - `dubai_garments_redis`
   - `dubai_garments_fastapi`
   - `dubai_garments_worker`
   - `dubai_garments_storefront`

From the GUI you can:

1. Start/stop containers
2. Restart a single service
3. Open container logs
4. Inspect environment variables
5. Open terminal inside a container

## 5. Run database migration

The compose stack does not auto-run your SQL migration scripts.

Run migrations from your host terminal:

```bash
cd apps/storefront-dubai_garments
npm run db:migrate
npm run db:seed
npm run db:seed:users
```

If you want these to target Docker Postgres from the host, use the Docker DB connection in your local env or run the commands inside the storefront container.

## 6. URLs

After startup:

1. Storefront: `http://localhost:3000`
2. FastAPI: `http://localhost:8000`
3. DB health: `http://localhost:3000/api/health/db`

## 7. Useful Docker commands

Start:

```bash
docker compose up --build
```

Stop:

```bash
docker compose down
```

Stop and delete volumes:

```bash
docker compose down -v
```

Rebuild one service:

```bash
docker compose build fastapi
```

Open logs:

```bash
docker compose logs -f fastapi
docker compose logs -f worker
docker compose logs -f storefront
```

Import SQL dump into Docker Postgres:

```bash
./scripts/db-import-dump.sh
```

Import a specific dump file:

```bash
./scripts/db-import-dump.sh /path/to/your_dump.sql
```

After importing an older dump, apply latest migrations so API queries match current schema:

```bash
cd apps/storefront-dubai_garments
npm run db:migrate
```

Copy only one table from local Postgres to Docker Postgres (example: `leads`):

```bash
SOURCE_DATABASE_URL='postgresql://<local_user>:<local_password>@localhost:5432/dubai_garments' ./scripts/db-copy-table-local-to-docker.sh leads
```

## 8. What each service does

1. `storefront`: Next.js customer/admin app
2. `fastapi`: backend API
3. `worker`: Redis queue worker for AI jobs
4. `redis`: queue broker
5. `postgres`: database

## 9. Recommended GUI workflow

1. Start Docker Desktop
2. Run `docker compose up --build`
3. Use Docker Desktop GUI to inspect logs and restart services
4. Keep code editing in your IDE
5. Let bind mounts update containers automatically during development
