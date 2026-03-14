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
- Partial gap: real global search / quick command input

2. `M08` Deals/Pipeline UX Completeness
- Done: deals pages + pipeline stage operations
- Partial gap: stronger kanban drag/drop UX polish for demos

3. `M09` Products + Quote Builder Completeness
- Done: product APIs and storefront product flows
- Partial gap: dedicated admin products management page (full CRUD UX)

4. `M10` Activity Timeline Completeness
- Done: activities APIs + activities page
- Partial gap: consistent per-record timeline parity across detail pages

5. `M11` Settings/Configuration Completeness
- Done: configuration panel + DB-backed system settings + env/runtime controls
- Partial gap: logo upload and branding asset workflow polish

6. `M12` AI Layer Completeness
- Done: lead summarize/score/classify, provider fallback behavior
- Partial gap: dedicated `ai_logs` trace table + admin AI log viewer
- Partial gap: explicit AI draft-reply/quote-email action in admin UX

## Needs To Be Done (Bottom - Focus Work Queue)
1. `N01` Admin Products Management UI
- Build admin products list/create/edit/delete screens
- Add product variant management UX

2. `N02` Global Search / Quick Command Input
- Add searchable global input in admin shell
- Support quick navigation to leads/deals/quotes

3. `N03` Dedicated AI Logs Layer
- Add `ai_logs` DB table + migration
- Write AI execution traces to `ai_logs`
- Build admin AI logs page/detail view

4. `N04` AI Draft Actions in UX
- Add “draft reply” / “draft quote email” actions in admin UI
- Add clear loading/error/fallback UX for these actions

5. `N05` Timeline Consistency Pass
- Ensure lead/deal/quote detail pages all show complete timeline entries

6. `N06` Demo Seed + Demo Script Hardening
- One-command demo seed/reset script
- Scripted end-to-end demo path for sales walkthrough

## Status Snapshot (As of March 14, 2026)

## 1. Workspace and Auth Foundation
- Status: `Mostly Done`
- Verified done:
1. Tenant foundation + tenant isolation migrations exist (`0015`, `0016`)
2. Admin auth APIs + protected admin routes exist
3. `proxy.ts` and server-side `requireAdminSession` checks are in place
4. `/install` and `/admin/reconfigure` flows exist
- Remaining:
1. Explicit `sales` role UX/permission mapping (currently mostly admin/customer oriented)

## 2. CRM Shell UI
- Status: `Done with Minor Gap`
- Verified done:
1. Admin shell with sidebar + top header
2. Dashboard, leads, deals, quotes, pipeline, activities pages
3. Consistent admin visual system is present
- Remaining:
1. Real global search/quick command input (not fully implemented)

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
1. Drag-and-drop kanban interaction polish/strict behavior (if required for demo script)

## 5. Products + Quote Builder
- Status: `Mostly Done`
- Verified done:
1. Products APIs + storefront product pages
2. Quote creation/list/detail/status flows
3. Quote PDF generation/download APIs + worker
- Remaining:
1. Dedicated admin `Products` management page (full CRUD UX) for stronger demo completeness

## 6. AI Layer
- Status: `Partially Done`
- Verified done:
1. Lead AI summarize/score/classify in worker flow
2. AI-related outcomes logged through automation run history
3. Provider fallback behavior exists in lead AI service logic
- Remaining:
1. Dedicated `ai_logs` table for clean AI trace separation (currently mostly `automation_runs` + lead fields)
2. Explicit AI draft reply/quote-email UX surfaced in admin as a first-class feature

## 7. Activity Timeline
- Status: `Mostly Done`
- Verified done:
1. Activities APIs and admin activities page exist
2. Key lead/deal/quote/automation events are recorded
- Remaining:
1. Ensure per-record timeline parity across all detail pages for demo consistency

## 8. Basic Automation Layer
- Status: `Done for MVP Scope`
- Verified done:
1. Lead AI auto-processing
2. Quote/deal follow-up automation hooks
3. `automation_runs` history + retry surfaces
- Remaining:
1. Keep only 2-3 automation stories in demo to avoid complexity

## 9. Settings / Configuration
- Status: `Mostly Done`
- Verified done:
1. Configuration UI + env/runtime setting endpoints
2. `system_settings` DB support exists
3. Observability/metrics surfaces available (`/metrics`, `/api/metrics`, observability service)
- Remaining:
1. Logo upload + true branding asset flow (if required for MVP demo package)

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
1. Add dedicated admin products management screen
2. Add explicit global search/quick search input in admin shell
3. Add dedicated `ai_logs` table + minimal admin AI logs view
4. Add explicit AI draft-reply/quote-email action in admin UX
5. Tighten demo seed flow and scripted demo path

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
1. Build admin products CRUD page
2. Add global search input in admin shell
3. Add `ai_logs` table + backend write path
4. Add AI logs admin list/detail view

## Sprint M2 (Demo Hardening)
1. Add explicit AI draft reply/quote email action in UI
2. Finalize per-record activity timeline consistency
3. Add one-command demo seed/reset script
4. Run smoke + demo rehearsal checklist and freeze MVP

## Final Note
Current project is beyond “idea stage” and already near MVP-complete. Remaining work is mostly productization and demo-hardening, not foundational architecture.
