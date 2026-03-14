# MVP Demo Freeze Checklist

Use this checklist before MVP release/demo sign-off.

## Scope
- Login/auth checks
- Lead -> Deal -> Quote -> PDF flow
- AI draft actions
- Observability checks
- Users/RBAC checks

## Pre-Run Setup
1. Reset demo data:
- Local: `cd apps/storefront-dubai_garments && npm run demo:reset`
- Docker: `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec storefront sh -lc "cd /app && npm run demo:reset"`
2. Print walkthrough:
- Local: `cd apps/storefront-dubai_garments && npm run demo:walkthrough`
- Docker: `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec storefront sh -lc "cd /app && npm run demo:walkthrough"`
3. Confirm app URLs:
- Storefront/Admin: `http://localhost:3000`
- FastAPI: `http://localhost:8000`

## Smoke Checklist

### A. Login + Access
- [ ] `A1` Admin login works at `/admin/login`
- [ ] `A2` Sales Manager login works at `/admin/login`
- [ ] `A3` Protected route redirects when unauthenticated
- [ ] `A4` `/admin/users` is admin-only
- [ ] `A5` `/admin/rbac-matrix` is admin-only

### B. Lead -> Deal -> Quote -> PDF
- [ ] `B1` Open leads list `/admin/leads`
- [ ] `B2` Open one lead detail and update status
- [ ] `B3` Convert lead to deal from lead detail
- [ ] `B4` Open deal in `/admin/deals` and update stage/value/probability
- [ ] `B5` Create quote from deal detail
- [ ] `B6` Open quote detail and set status
- [ ] `B7` Generate quote PDF
- [ ] `B8` Download/open generated PDF

### C. AI Draft Actions
- [ ] `C1` Lead detail: `AI Draft Reply` succeeds
- [ ] `C2` Deal detail: `AI Draft Reply` succeeds
- [ ] `C3` Quote detail: `AI Draft Quote Email` succeeds
- [ ] `C4` Sending drafted email succeeds in all 3 flows
- [ ] `C5` Fallback path still returns usable draft (if provider unavailable)

### D. Timeline + Activity Completeness
- [ ] `D1` Lead timeline shows lifecycle + activity/email events
- [ ] `D2` Deal timeline shows lifecycle + activity/email + quote events
- [ ] `D3` Quote timeline shows lifecycle + item/pdf/link events
- [ ] `D4` `/admin/activities` reflects key actions performed above

### E. Observability + Health
- [ ] `E1` `/admin/observability` loads without errors
- [ ] `E2` Storefront metrics endpoint responds (`/api/metrics`)
- [ ] `E3` DB health endpoint responds (`/api/health/db`)
- [ ] `E4` FastAPI metrics/health endpoint responds

### F. Users + RBAC Management
- [ ] `F1` Admin can create a user in `/admin/users`
- [ ] `F2` Admin can edit role/status
- [ ] `F3` Deactivate user is soft-delete (record remains, `is_active=false`)
- [ ] `F4` Change password flow works
- [ ] `F5` Sales Manager cannot access admin-only modules

## Exit Criteria
- [ ] No blocker (`P0`) issues
- [ ] No unresolved high-severity (`P1`) issues
- [ ] All smoke sections A-F pass or have accepted waiver
- [ ] Release sign-off template completed

