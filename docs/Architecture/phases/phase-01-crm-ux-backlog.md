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

## Exit Criteria
- Leads/deals/quotes use same UI primitives
- Design tokens and spacing/typography consistent
- No hydration/layout regressions
