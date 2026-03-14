# Phase 11 Theme Migration Map (FE-P11-001)

## Purpose
Map existing UI class groups to semantic token-based primitives so the Twenty-inspired theme rollout is systematic and low-risk.

## Artifacts
1. Source map: `apps/storefront-dubai_garments/lib/design/theme-migration-map.ts`
2. Token source: `apps/storefront-dubai_garments/lib/design/design-tokens.ts`
3. Runtime vars: `apps/storefront-dubai_garments/app/globals.css`

## Migration Matrix

1. `SHELL-001`
- Current selectors: `.dg-admin-shell`, `.dg-admin-sidebar`, `.dg-admin-main`, `.dg-admin-topbar`
- Target primitive: `PageShell`
- Token family: surface + border + shadow + layout spacing

2. `NAV-001`
- Current selectors: `.dg-admin-link`, `.dg-nav-link`, `.dgx-nav-link`, `.dgx-category-pill`
- Target primitive: `NavItem`
- Token family: nav color states + radius + motion

3. `SURFACE-001`
- Current selectors: `.dg-card`, `.dg-panel`, `.dgx-footer-cta`, `.dgx-hero-aside`, `.dg-filter-card`
- Target primitive: `Card/Panel`
- Token family: surface, border, card radius, card shadow

4. `BUTTON-001`
- Current selectors: `.dg-btn-primary`, `.dg-btn-secondary`, `.dg-btn-block`
- Target primitive: `Button`
- Token family: brand colors + text-on-button + focus ring + radius

5. `INPUT-001`
- Current selectors: `.dg-input`, `.dg-select`, `.dg-textarea`
- Target primitive: `Input/Select/TextArea`
- Token family: input border + focus ring + radius + body type

6. `TABLE-001`
- Current selectors: `.dg-table-wrap`, `.dg-table`, `.dg-table th`, `.dg-table td`
- Target primitive: `DataTable`
- Token family: table surfaces + border + spacing + text hierarchy

7. `STATUS-001`
- Current selectors: `.dg-status-pill*`, `.dg-alert-success`, `.dg-alert-error`
- Target primitive: `StatusBadge/Alert`
- Token family: semantic status colors + badge radius

8. `LAYOUT-001`
- Current selectors: `.dg-container`, `.dg-main`, `.dg-section`, `.dg-two-col-grid`, `.dg-three-col-grid`
- Target primitive: `Layout primitives`
- Token family: container/content max widths + section/grid spacing

9. `TYPO-001`
- Current selectors: `.dg-page-title`, `.dg-title-lg`, `.dg-title-md`, `.dg-title-sm`, `.dg-muted-sm`
- Target primitive: `Typography scale`
- Token family: heading/base families + scale + line-height + letter-spacing

10. `MOTION-001`
- Current selectors: `.dg-motion-fade-up`, `.dg-motion-stagger > *`, `.dgx-nav-link`, `.dg-card`
- Target primitive: `Motion utilities`
- Token family: durations + easing + reduced-motion behavior

## Rollout Order
1. Shell + navigation
2. Card/surface + buttons
3. Inputs + table
4. Status/alerts + typography
5. Layout + motion consistency

## Acceptance Criteria
1. No hardcoded component-level color literals for migrated class groups
2. Interactive states derive from token vars
3. Visual regressions captured before and after each migration slice
