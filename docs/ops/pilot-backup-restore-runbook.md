# Pilot Backup and Restore Runbook

## Purpose
Operational runbook for pilot environments to back up and restore:
1. PostgreSQL data
2. Docker named volumes (`postgres_data`, `redis_data`, `n8n_data`)
3. Environment files required for startup

## Scope
Applies to the server deployment model used by:
1. [deploy.yml](/Users/rafi/developer/ai_development/projects/dubai_garments/.github/workflows/deploy.yml)
2. [github-deploy.sh](/Users/rafi/developer/ai_development/projects/dubai_garments/scripts/github-deploy.sh)
3. [deploy-docker-core.sh](/Users/rafi/developer/ai_development/projects/dubai_garments/scripts/deploy-docker-core.sh)

## Preconditions
1. SSH access to server as deploy user (`bitnami` or equivalent)
2. Docker and Docker Compose available
3. `DEPLOY_PATH` known (example: `/var/www/aisales`)
4. `.env`, `apps/storefront-dubai_garments/.env`, `services/fastapi_quote_api/.env` exist on server

## Backup Frequency
1. Daily: DB dump only
2. Before deploy: DB dump + env file copy
3. Before schema changes/migrations: full snapshot (DB dump + volume archive)

## Backup Location Convention
Use timestamped folder:
```bash
BACKUP_DIR="/var/backups/aisales/$(date +%F-%H%M%S)"
mkdir -p "$BACKUP_DIR"
```

## 1) PostgreSQL Logical Backup (Primary)
From server root project path:
```bash
cd /var/www/aisales
set -a; . ./.env; set +a

BACKUP_DIR="/var/backups/aisales/$(date +%F-%H%M%S)"
mkdir -p "$BACKUP_DIR"

docker exec -i dubai_garments_postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
  > "$BACKUP_DIR/db.dump"

docker exec -i dubai_garments_postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "\dt+" > "$BACKUP_DIR/table_sizes.txt"
```

## 2) Environment File Backup
```bash
cd /var/www/aisales
BACKUP_DIR="/var/backups/aisales/$(date +%F-%H%M%S)"
mkdir -p "$BACKUP_DIR/env"

cp .env "$BACKUP_DIR/env/.env"
cp apps/storefront-dubai_garments/.env "$BACKUP_DIR/env/storefront.env"
cp services/fastapi_quote_api/.env "$BACKUP_DIR/env/fastapi.env"
```

## 3) Optional Named Volume Snapshot
Use for disaster recovery drills or host migration:
```bash
BACKUP_DIR="/var/backups/aisales/$(date +%F-%H%M%S)"
mkdir -p "$BACKUP_DIR/volumes"

docker run --rm -v postgres_data:/source -v "$BACKUP_DIR/volumes:/backup" alpine \
  sh -lc "cd /source && tar czf /backup/postgres_data.tgz ."

docker run --rm -v redis_data:/source -v "$BACKUP_DIR/volumes:/backup" alpine \
  sh -lc "cd /source && tar czf /backup/redis_data.tgz ."

docker run --rm -v n8n_data:/source -v "$BACKUP_DIR/volumes:/backup" alpine \
  sh -lc "cd /source && tar czf /backup/n8n_data.tgz ."
```

## Restore Procedure (DB First)

## A) Safe Restore to Existing DB
```bash
cd /var/www/aisales
set -a; . ./.env; set +a

BACKUP_FILE="/var/backups/aisales/<timestamp>/db.dump"

docker exec -i dubai_garments_postgres psql -U "$POSTGRES_USER" -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$POSTGRES_DB' AND pid <> pg_backend_pid();"

docker exec -i dubai_garments_postgres psql -U "$POSTGRES_USER" -d postgres \
  -c "DROP DATABASE IF EXISTS $POSTGRES_DB;"

docker exec -i dubai_garments_postgres psql -U "$POSTGRES_USER" -d postgres \
  -c "CREATE DATABASE $POSTGRES_DB OWNER $POSTGRES_USER;"

cat "$BACKUP_FILE" | docker exec -i dubai_garments_postgres \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists
```

## B) Post-Restore Validation
```bash
docker exec -i dubai_garments_postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "SELECT COUNT(*) AS users_count FROM users;"

docker exec -i dubai_garments_postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "SELECT COUNT(*) AS leads_count FROM leads;"

docker compose up -d postgres redis fastapi storefront
curl -fsS http://localhost:3000/api/metrics >/dev/null && echo "storefront ok"
curl -fsS http://localhost:8000/health >/dev/null && echo "fastapi ok"
```

## C) Env Restore (if needed)
```bash
cp /var/backups/aisales/<timestamp>/env/.env /var/www/aisales/.env
cp /var/backups/aisales/<timestamp>/env/storefront.env /var/www/aisales/apps/storefront-dubai_garments/.env
cp /var/backups/aisales/<timestamp>/env/fastapi.env /var/www/aisales/services/fastapi_quote_api/.env
```

## D) Volume Restore (Optional / Full DR)
Stop services before restore:
```bash
cd /var/www/aisales
docker compose down

BACKUP_ROOT="/var/backups/aisales/<timestamp>/volumes"

docker run --rm -v postgres_data:/target -v "$BACKUP_ROOT:/backup" alpine \
  sh -lc "cd /target && rm -rf ./* && tar xzf /backup/postgres_data.tgz -C /target"

docker run --rm -v redis_data:/target -v "$BACKUP_ROOT:/backup" alpine \
  sh -lc "cd /target && rm -rf ./* && tar xzf /backup/redis_data.tgz -C /target"

docker run --rm -v n8n_data:/target -v "$BACKUP_ROOT:/backup" alpine \
  sh -lc "cd /target && rm -rf ./* && tar xzf /backup/n8n_data.tgz -C /target"

docker compose up -d
```

## Recovery Targets (Pilot)
1. RPO: 24 hours (daily backups)
2. RTO: 60 minutes (DB restore + service restart + smoke checks)

## Operational Checklist
1. Backup generated and file size checked (`ls -lh`)
2. Backup copied to off-host storage
3. Restore drill tested at least once per month
4. Smoke checks documented after restore
