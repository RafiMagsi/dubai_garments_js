# Phase 1 Backlog - CRM UX Framework

## Objective
Twenty-inspired professional CRM shell and reusable UI patterns.

## Tickets
1. `FE-P1-001` `frontend` `L` Build unified admin shell (top bar, left nav, command bar entry point).
2. `FE-P1-002` `frontend` `M` Implement `EntityListView` shared component (filters, sort, pagination, bulk select).
3. `FE-P1-003` `frontend` `M` Implement `EntityDetailPanel` shared component (summary, tabs, actions).
4. `FE-P1-004` `frontend` `M` Implement `ActivityTimeline` component template.
5. `FE-P1-005` `frontend` `M` Implement `PipelineBoard` template with consistent drag/drop behavior.
6. `FE-P1-006` `frontend` `M` Create design-token package and usage docs at `/admin/design-system`.
7. `FE-P1-007` `frontend` `S` Add motion system (stagger/fade/hover) with reduced-motion support.
8. `BE-P1-008` `backend` `S` Add list endpoint query contracts for reusable list UI (filter/sort/search shape).
9. `OPS-P1-009` `ops` `S` Add visual regression baseline screenshots for key admin pages.
10. `FE-P1-010` `frontend` `M` Refactor leads/deals/quotes screens to new shared templates.

## Week-by-Week Execution Board (Daily Order)

## Week 1 - Shell, Tokens, and Contracts
### Day 1
1. Lock UX scope and acceptance checklist for admin shell.
2. Start `FE-P1-001` shell foundation (layout, nav structure, header slots).
3. Define reusable page container and section spacing rules.

### Day 2
1. Complete core admin shell scaffolding for desktop and mobile states.
2. Start `FE-P1-006` design-token foundation (color, spacing, typography, radius, shadow).
3. Add token consumption strategy across existing admin components.

### Day 3
1. Continue `FE-P1-006` and publish initial token docs on `/admin/design-system`.
2. Implement `BE-P1-008` query contract shape (filter/sort/search/pagination).
3. Align front-end list interface with backend query contract.

### Day 4
1. Finalize `FE-P1-001` shell interactions (active nav, breadcrumbs/section headers).
2. Finalize `BE-P1-008` and add contract examples.
3. Run integration checks against at least leads and deals list APIs.

### Day 5
1. Stabilization day for Week 1 defects.
2. Freeze shell + token + contract baseline.
3. Capture before/after baseline screenshots for later visual regression.

## Week 2 - Shared View Components
### Day 6
1. Build `FE-P1-002` `EntityListView` core (table wrapper, paging, empty/loading/error states).
2. Add hooks for filter/sort/search contract.

### Day 7
1. Complete `FE-P1-002` advanced features (bulk select, row actions, toolbar).
2. Start `FE-P1-003` `EntityDetailPanel` core structure.

### Day 8
1. Complete `FE-P1-003` tabs, summary cards, action rail.
2. Start `FE-P1-004` `ActivityTimeline` template with normalized item model.

### Day 9
1. Complete `FE-P1-004` timeline view states and action/event styling.
2. Start `FE-P1-005` `PipelineBoard` with drag/drop behavior and stage constraints.

### Day 10
1. Complete `FE-P1-005` board interactions and keyboard/accessibility basics.
2. Start `FE-P1-007` motion layer (stagger/fade/hover, reduced-motion support).
3. Integration pass on shared components in a feature sandbox route.

## Week 3 - Feature Refactor, QA, and Finish
### Day 11
1. Execute `FE-P1-010` refactor for leads pages to shared components.
2. Validate query contract behavior and UI states (loading/error/empty).

### Day 12
1. Continue `FE-P1-010` for deals pages.
2. Add `OPS-P1-009` visual regression baseline snapshots (leads/deals).

### Day 13
1. Finish `FE-P1-010` for quotes pages.
2. Extend `OPS-P1-009` snapshots to quotes and dashboard key views.

### Day 14
1. Full UX polish pass (spacing, typography, responsiveness, motion consistency).
2. Fix hydration/layout regressions and strict lint/type issues.
3. Update `/admin/design-system` docs with reusable template usage.

### Day 15
1. Final regression pass across leads/deals/quotes flow.
2. Collect sign-off evidence (screenshots, API contract checks, responsive checks).
3. Freeze Phase 1 and prepare Phase 2 kickoff handoff.

## Daily Definition of Done
1. Code merged for daily scope.
2. UI evidence captured (screenshot or screen recording).
3. No open critical blocker carried without owner/date.

## Exit Criteria
- Leads/deals/quotes use same UI primitives
- Design tokens and spacing/typography consistent
- No hydration/layout regressions
