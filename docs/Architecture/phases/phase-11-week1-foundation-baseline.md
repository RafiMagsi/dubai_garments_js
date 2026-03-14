# Phase 11 Week 1 - Foundation Baseline (Frozen)

## Scope Frozen
1. FE-P11-001 Tokens + semantic naming
2. FE-P11-002 Layout primitives (`PageShell`, `Panel`, `Toolbar`)
3. FE-P11-003 Admin shell/nav interaction states
4. FE-P11-004 Table/list baseline, density, status badges

## Locked Primitives
1. `PageShell` with `comfortable` and `compact` density
2. `Panel` as standard admin content surface
3. `Toolbar` for page/header actions
4. `StatusBadge` powered by centralized status-to-tone mapping

## Locked Styling Contracts
1. Admin compact baseline defaults live under `.dg-admin-main ...` selectors
2. Table density contracts:
3. `dg-table-density-compact`
4. `dg-table-density-comfortable`
5. `ui-table-density-compact`
6. `ui-table-density-comfortable`
7. List density contracts:
8. `dg-list-density-compact`
9. `dg-list-density-comfortable`
10. `ui-list-density-compact`
11. `ui-list-density-comfortable`
12. Status tone contracts:
13. `info`, `warning`, `success`, `danger`, `neutral`

## Integration Coverage (Week 1)
1. `/admin/dashboard`
2. `/admin/design-system`
3. `/admin/leads`
4. `/admin/deals`
5. `/admin/quotes`
6. Configuration execution audit table

## Freeze Rules
1. Do not introduce new one-off admin layout wrappers if `PageShell` + `Panel` works
2. Do not create page-local status-pill mappings; use centralized `StatusBadge`
3. Keep Week 1 contracts stable until Week 2 controls pass starts

## Verify Baseline
1. Visual check:
2. `/admin/dashboard`, `/admin/leads`, `/admin/deals`, `/admin/quotes`, `/admin/design-system`
3. Build check:
4. `cd apps/storefront-dubai_garments && npm run build`
5. Lint check:
6. `cd apps/storefront-dubai_garments && npm run lint`
