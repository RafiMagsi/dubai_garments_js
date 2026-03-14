# Pilot Rollout and Rollback Handoff

## Purpose
Handoff guide for safe pilot deployment with clear:
1. Rollout sequence
2. Verification gates
3. Rollback sequence

## Deployment Model
Production deploy is executed by GitHub Actions SSH flow:
1. Sync files with `rsync`
2. Run server command: `SKIP_GIT_SYNC=true ./scripts/github-deploy.sh docker <ref>`
3. Core deploy script: [deploy-docker-core.sh](/Users/rafi/developer/ai_development/projects/dubai_garments/scripts/deploy-docker-core.sh)

## Pre-Deploy Gate
Run on server before release:
```bash
cd /var/www/aisales
docker --version
docker compose version
df -h .
docker ps
```

Run env validation:
```bash
cd /var/www/aisales
./scripts/env-doctor.sh --strict
```

Create backup (mandatory):
1. Follow [pilot-backup-restore-runbook.md](/Users/rafi/developer/ai_development/projects/dubai_garments/docs/ops/pilot-backup-restore-runbook.md)
2. Store backup path in deploy notes

## Rollout Procedure
From CI (preferred):
1. Trigger deploy workflow on target ref
2. Watch logs for:
1. `Running env doctor`
2. `Docker network preflight`
3. `Building core services`
4. `Running database migrations`
5. `Storefront is up`

From server (manual fallback):
```bash
cd /var/www/aisales
SKIP_GIT_SYNC=true ./scripts/github-deploy.sh docker main
```

## Post-Deploy Verification
Health checks:
```bash
curl -fsS http://localhost:3000/api/metrics >/dev/null && echo "storefront metrics ok"
curl -fsS http://localhost:8000/health >/dev/null && echo "fastapi health ok"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Functional smoke:
1. Admin login works
2. Lead -> Deal -> Quote flow works
3. Quote PDF generation works
4. AI draft action works in lead/deal/quote pages
5. `/admin/observability` loads data
6. `/admin/users` list and role actions work

## Rollback Triggers
Rollback immediately if any of the following:
1. Migration failure with unrecoverable app behavior
2. Login or core CRM flow broken
3. 5xx spike sustained for more than 5 minutes
4. Data integrity issue found in pilot path

## Fast Rollback (Application Only)
If schema is unchanged and issue is app/container-only:
1. Re-deploy previous known-good ref via workflow dispatch
2. Verify health checks and smoke tests

## DB Rollback (If Data/Schema Impact)
1. Stop write traffic (maintenance mode or block external access)
2. Restore DB from latest valid backup
3. Re-deploy previous known-good ref
4. Validate data counts and key entities

Commands:
```bash
cd /var/www/aisales
docker compose down
# restore db using backup runbook
docker compose up -d postgres redis fastapi storefront
```

## Release Handoff Template
For each pilot release capture:
1. Release ref / commit
2. Deploy start/end time
3. Backup path used
4. Migration result
5. Health check results
6. Smoke test results
7. Rollback decision (`not needed` or `executed`)
8. Owner and approver names

## Ownership
1. Release operator: executes deploy and smoke
2. App owner: validates CRM functional flow
3. Approver: signs off release/rollback decision

## Pilot Standards
1. No deploy without fresh backup
2. No schema-changing deploy without restore-tested backup
3. No release sign-off without smoke checklist completion
