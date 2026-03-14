# AI Sales System MVP — Minimal Implementation Plan (Status Updated)

## Goal
Ship a small but complete AI Sales CRM that is usable, demo-ready, and stable for pilot users.

Core MVP outcomes:
1. Capture leads
2. Manage leads in admin CRM
3. Move leads through pipeline
4. Generate quotes + PDF
5. Use AI for lead summary/scoring/classification and practical assist actions
6. Deliver a clean product-grade admin UX

## Module Index (Priority Order)

## Done (Top Priority Baseline Confirmed)
1. `M01` Workspace/Tenant Foundation
- Tenant foundation + tenant isolation migrations (`0015`, `0016`)
- Tenant-aware session and route-level protections
- Install and reconfigure foundations exist

2. `M02` Admin Auth Protection
- Admin login/logout APIs working
- Protected admin APIs/routes with session checks
- `proxy.ts` + server-side admin guard coverage in core paths

3. `M03` Leads Core + AI Scoring Surface
- Leads list/detail/status management
- Lead conversion to deal endpoint
- AI score/classification/reasoning visible on lead detail
- Lead AI worker pipeline integrated

4. `M04` Quotes Core + PDF
- Quote list/detail/status flows
- Quote PDF generation and download endpoints
- Worker-based quote PDF processing

5. `M05` Automation Visibility Baseline
- `automation_runs` history available
- Retry endpoints available for failed runs
- Follow-up automation hooks present

6. `M06` Observability Baseline
- Storefront metrics endpoint available
- FastAPI metrics available
- Admin observability route/page exists

## Partially Done (Center - Close These Next)
1. `M07` CRM Shell UX Completeness
- Done: sidebar/header/dashboard/leads/deals/quotes/pipeline/activities pages
- Done: real global search page (`/admin/search`) + topbar quick command input (`Cmd/Ctrl+K`)

2. `M08` Deals/Pipeline UX Completeness
- Done: deals pages + pipeline stage operations
- Done: stronger kanban drag/drop UX for demos (optimistic move, drop highlights, rollback on API failure)

3. `M09` Products + Quote Builder Completeness
- Done: product APIs and storefront product flows
- Done: dedicated admin products management page (`/admin/products`) with create/edit/archive flows

4. `M10` Activity Timeline Completeness
- Done: activities APIs + activities page
- Done: consistent per-record timeline parity across lead/deal/quote detail pages

5. `M11` Settings/Configuration Completeness
- Done: configuration panel + DB-backed system settings + env/runtime controls
- Done: logo upload + branding asset workflow polish (admin upload API, branding settings persistence, storefront/admin branding read API)

6. `M12` AI Layer Completeness
- Done: lead summarize/score/classify, provider fallback behavior
- Done: dedicated `ai_logs` trace table + admin AI log viewer
- Done: explicit AI draft-reply/quote-email action in admin UX (lead/deal/quote admin flows)

## Recently Closed
1. `N07` Demo QA Freeze Checklist — `Done`
- Final smoke checklist added: `docs/qa/mvp-demo-freeze-checklist.md`
- Reproducible pass/fail sign-off template added: `docs/qa/mvp-demo-signoff-template.md`

2. `N09` Pilot Readiness — `Done`
- Backup/restore runbook added: `docs/ops/pilot-backup-restore-runbook.md`
- Rollout/rollback handoff added: `docs/ops/pilot-rollout-rollback-handoff.md`

3. `N08` Sales Workflow Polish — `Done`
- Owner assignment UX tightened on deal detail with explicit owner mode defaults (`Assign to me`, `Unassigned`, `Custom`)
- Timeline panels now include clearer loading/error/empty states across lead/deal/quote details

## Status Snapshot (As of March 14, 2026)

## 1. Workspace and Auth Foundation
- Status: `Done`
- Verified done:
1. Tenant foundation + tenant isolation migrations exist (`0015`, `0016`)
2. Admin auth APIs + protected admin routes exist
3. `proxy.ts` and server-side `requireAdminSession` checks are in place
4. `/install` and `/admin/reconfigure` flows exist
5. Explicit backoffice role mapping for `admin`, `sales_manager`, `sales_rep`, `ops` is implemented in session typing, login flow, proxy gating, and admin navigation visibility

### Backoffice Role Matrix (Enforced)

| Area | admin | sales_manager | sales_rep | ops |
|---|---|---|---|---|
| `/admin/dashboard`, `/admin/analytics` | ✅ | ✅ | ✅ | ✅ |
| `/admin/leads*`, `/admin/deals*`, `/admin/quotes*`, `/admin/pipeline`, `/admin/activities` | ✅ | ✅ | ✅ | ✅ |
| `/admin/automations`, `/admin/observability` | ✅ | ❌ | ❌ | ✅ |
| `/admin/configuration*`, `/admin/reconfigure`, `/admin/design-system` | ✅ | ❌ | ❌ | ❌ |

### Admin API Matrix (Second Layer)

| API group | admin | sales_manager | sales_rep | ops |
|---|---|---|---|---|
| `/api/admin/leads*`, `/deals*`, `/quotes*`, `/pipeline`, `/activities*` | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/automation-runs*`, `/observability` | ✅ | ❌ | ❌ | ✅ |
| `/api/admin/config*`, `/reconfigure` | ✅ | ❌ | ❌ | ❌ |

## 2. CRM Shell UI
- Status: `Done`
- Verified done:
1. Admin shell with sidebar + top header
2. Dashboard, leads, deals, quotes, pipeline, activities pages
3. Consistent admin visual system is present
4. Real global search and quick command input implemented

## 3. Leads Module
- Status: `Done`
- Verified done:
1. Leads list + detail + status/source/notes flows
2. Lead conversion to deal API exists
3. AI score/classification/reasoning fields rendered on lead detail
4. Lead AI background worker pipeline exists
- Remaining:
1. Tighten assigned-user UX if needed for sales-team workflow polish

## 4. Deals / Pipeline Module
- Status: `Mostly Done`
- Verified done:
1. Deals list and deal detail
2. Pipeline views and stage update APIs
3. Follow-up automation hooks on stage movement
- Remaining:
1. Optional polish only (non-blocking): additional drag/drop animation tuning if desired for demos

## 5. Products + Quote Builder
- Status: `Done`
- Verified done:
1. Products APIs + storefront product pages
2. Quote creation/list/detail/status flows
3. Quote PDF generation/download APIs + worker
- Remaining:
1. Optional polish only (non-blocking): richer product media/gallery management UX

## 6. AI Layer
- Status: `Mostly Done`
- Verified done:
1. Lead AI summarize/score/classify in worker flow
2. AI-related outcomes logged through automation run history
3. Dedicated `ai_logs` table + backend trace write path
4. Admin AI logs list/detail viewer (`/admin/ai-logs`)
5. Provider fallback behavior exists in lead AI service logic
6. Explicit AI draft reply / quote-email actions are available in lead/deal/quote admin UX
- Remaining:
1. None for MVP baseline

## 7. Activity Timeline
- Status: `Done`
- Verified done:
1. Activities APIs and admin activities page exist
2. Key lead/deal/quote/automation events are recorded
- Remaining:
1. Optional polish only (non-blocking): iconography/type labels normalization in timeline events

## 8. Basic Automation Layer
- Status: `Done for MVP Scope`
- Verified done:
1. Lead AI auto-processing
2. Quote/deal follow-up automation hooks
3. `automation_runs` history + retry surfaces
- Remaining:
1. Keep only 2-3 automation stories in demo to avoid complexity

## 9. Settings / Configuration
- Status: `Done`
- Verified done:
1. Configuration UI + env/runtime setting endpoints
2. `system_settings` DB support exists
3. Observability/metrics surfaces available (`/metrics`, `/api/metrics`, observability service)
4. Branding workflow complete: admin upload for logo/favicon + saved branding keys + runtime storefront/admin render path

## MVP Scope Adjustments (Outdated Items Fixed)
1. Remove “skip tenants for MVP” guidance: tenant foundation already exists and should stay.
2. Keep MVP narrow: do not add advanced object builder/view engine/plugin marketplace yet.
3. Keep enterprise Phase 9/10 items out of MVP closure unless they block demo or pilot stability.

## What Is Done vs To-Do (Condensed)

### Done
1. Tenant-aware foundation and admin protection
2. Install/reconfigure flows
3. Admin shell and core CRM pages
4. Leads/deals/quotes core lifecycle
5. Quote PDF generation
6. AI scoring/classification baseline
7. Automation runs + observability endpoints

### Must Finish to Close MVP
1. Execute demo QA freeze checklist and capture sign-off report
2. Pilot rehearsal pass and release sign-off

## Updated MVP Definition of Done
MVP is complete when all are true:
1. Login and tenant-safe admin access works reliably
2. Lead -> Deal -> Quote -> PDF flow works end-to-end
3. AI summary/score/classification is visible and reliable on leads
4. Automation history is visible and retryable
5. Admin has product management, basic settings, and health visibility
6. Demo script runs without critical blocker

## Recommended Next 2-Sprint Closure Plan

## Sprint M1 (MVP Closure Core)
1. Demo QA freeze checklist + scripted rehearsal report
2. Sales workflow polish (owner/default/edge-state improvements)

## Sprint M2 (Demo Hardening)
1. Run smoke + demo rehearsal checklist and freeze MVP
2. Publish final pilot sign-off evidence

## Final Note
Current project is beyond “idea stage” and already near MVP-complete. Remaining work is mostly productization and demo-hardening, not foundational architecture.
