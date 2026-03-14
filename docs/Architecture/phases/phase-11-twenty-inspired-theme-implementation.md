# Phase 11 Backlog - Twenty-Inspired Theme Implementation

## Objective
Apply a Twenty-inspired visual and interaction language to the CRM UI (clean-room implementation), while preserving existing architecture and functionality.

## Theme Principles (Do Not Copy Source Code)
1. Clean information hierarchy with strong typography and spacing
2. Neutral, professional color system with subtle semantic accents
3. Dense but readable tables and list views
4. Predictable interaction states (hover/focus/active/selected)
5. Consistent surface system (page, panel, card, modal, drawer)
6. Fast, low-noise motion and polished micro-interactions

## Scope
- In scope:
1. Admin shell and all admin modules
2. Shared components and tokens
3. Table, form, modal, drawer, command/search visuals

- Out of scope:
1. Rewriting business logic
2. Replacing data architecture
3. Direct code copy from Twenty repo

## Tickets
1. `FE-P11-001` `frontend` `M` Define new design token map (color, typography, spacing, radius, shadow, borders).
2. `FE-P11-002` `frontend` `M` Build reusable theme primitives (`PageShell`, `Panel`, `Toolbar`, `EmptyState`, `StatCard`).
3. `FE-P11-003` `frontend` `M` Restyle admin navigation shell (sidebar/header/top actions).
4. `FE-P11-004` `frontend` `M` Standardize table/list styling and interaction states.
5. `FE-P11-005` `frontend` `M` Standardize forms/inputs/selects/validation UI.
6. `FE-P11-006` `frontend` `S` Standardize modal/drawer/command-surface styling.
7. `FE-P11-007` `frontend` `S` Apply consistent motion and hover transitions.
8. `FE-P11-008` `frontend` `M` Refactor key pages: dashboard/leads/deals/quotes/pipeline.
9. `OPS-P11-009` `ops` `S` Add visual regression baseline and screenshot checks.
10. `FE-P11-010` `frontend` `S` Publish design usage guide in docs/design-system.

## Stage-by-Stage Implementation

## Stage 1 - Theme Foundation
1. Create token contract and semantic aliases
2. Define component state matrix (default/hover/focus/disabled/error)
3. Lock baseline contrast/accessibility rules

## Stage 2 - Surface System
1. Standardize page background, panel, card, and borders
2. Normalize spacing rhythm and content widths
3. Introduce reusable layout primitives

## Stage 3 - Data UX Layer
1. Restyle tables, filters, list headers, row actions
2. Add consistent selected/active row behavior
3. Ensure list readability with high-density layouts

## Stage 4 - Input and Command Layer
1. Restyle form controls and validation feedback
2. Restyle modal/drawer interactions
3. Add command/search surface styling

## Stage 5 - Module Rollout
1. Apply theme to dashboard and analytics
2. Apply theme to leads/deals/quotes/pipeline/activities
3. Apply theme to configuration/observability/reconfigure

## Stage 6 - QA and Hardening
1. Visual regression checks across key breakpoints
2. Accessibility pass (focus visibility, contrast, keyboard flow)
3. Final polish and style docs update

## Week-by-Week Execution Board (Daily Order)

## Week 1 - Foundation and Primitives
### Day 1
1. Implement `FE-P11-001` token set and semantic naming.
2. Define theme migration map from current classes.

### Day 2
1. Implement `FE-P11-002` base primitives (`PageShell`, `Panel`, `Toolbar`).
2. Validate responsiveness for desktop/tablet/mobile.

### Day 3
1. Implement `FE-P11-003` admin shell restyle.
2. Add active/hover/focus state consistency in nav.

### Day 4
1. Implement `FE-P11-004` table/list baseline style system.
2. Add row density and status badge standards.

### Day 5
1. Integration pass for Week 1 outputs.
2. Freeze foundation baseline.

## Week 2 - Controls and Interaction Surfaces
### Day 6
1. Implement `FE-P11-005` forms/input/select/validation style standardization.
2. Normalize helper text and error state spacing.

### Day 7
1. Implement `FE-P11-006` modal/drawer/command-surface styling.
2. Validate overlay z-index and scroll locking behavior.

### Day 8
1. Implement `FE-P11-007` motion/micro-interactions.
2. Add reduced-motion support.

### Day 9
1. Start `FE-P11-008` rollout on dashboard/leads/deals.
2. Fix module-level style conflicts.

### Day 10
1. Continue `FE-P11-008` rollout on quotes/pipeline/activities.
2. Freeze Week 2 interaction baseline.

## Week 3 - Full Rollout, QA, and Documentation
### Day 11
1. Complete `FE-P11-008` rollout for config/observability/reconfigure.
2. Run consistency pass across all admin modules.

### Day 12
1. Implement `OPS-P11-009` visual regression baseline.
2. Capture golden screenshots for key pages.

### Day 13
1. Accessibility and keyboard navigation audit.
2. Fix contrast/focus/order defects.

### Day 14
1. Implement `FE-P11-010` design usage guide and examples.
2. Document token + component usage rules.

### Day 15
1. Final theme regression and sign-off.
2. Publish handoff note and freeze Phase 11.

## Daily Definition of Done
1. Code merged for daily scope
2. Visual proof captured (screenshots/video)
3. No critical UX regressions left open

## Exit Criteria
- Admin experience reflects Twenty-inspired quality without code copy
- All key modules follow shared token/component rules
- Visual and accessibility checks pass


## Current Status
### Day 1
1. `FE-P11-001` completed: token set + semantic naming.
2. Theme migration map completed.
3. Files:
4. `apps/storefront-dubai_garments/lib/design/design-tokens.ts`
5. `apps/storefront-dubai_garments/lib/design/theme-migration-map.ts`
6. `this file -> Appendix A: Theme Migration Map`
7. Where to Verify:
8. `/admin/design-system` (token groups and values rendered from token source)
9. `this file -> Appendix A: Theme Migration Map` (class migration mapping)

### Day 2
1. `FE-P11-002` completed: base primitives (`PageShell`, `Panel`, `Toolbar`).
2. Responsive behavior validated (desktop/tablet/mobile).
3. Files:
4. `apps/storefront-dubai_garments/components/ui/layout-primitives.tsx`
5. `apps/storefront-dubai_garments/components/ui/index.ts`
6. `apps/storefront-dubai_garments/app/globals.css`
7. `apps/storefront-dubai_garments/app/admin/dashboard/page.tsx`
8. `apps/storefront-dubai_garments/app/admin/design-system/page.tsx`
9. Where to Verify:
10. `/admin/dashboard` (PageShell/Panel/Toolbar used in production page)
11. `/admin/design-system` (primitives used in docs surface)
12. Resize viewport to tablet/mobile: toolbar stacks and panel/page spacing compresses

### Day 3
1. `FE-P11-003` completed: admin shell restyle (sidebar, topbar, main layout surfaces).
2. Navigation interaction states standardized: active + hover + focus-visible.
3. Files:
4. `apps/storefront-dubai_garments/components/admin/admin-shell.tsx`
5. `apps/storefront-dubai_garments/app/globals.css`
6. Where to Verify:
7. `/admin/dashboard` (new shell visuals)
8. Any `/admin/*` module route (same nav behavior across pages)
9. Keyboard tab on sidebar links to confirm focus ring consistency

### Day 4
1. `FE-P11-004` completed: table/list baseline style system.
2. Added row density standards (`compact`, `comfortable`) for both `dg-*` and `ui-*` tables/lists.
3. Added centralized status badge standard (`info`, `warning`, `success`, `danger`, `neutral`) and mapped legacy statuses.
4. Files:
5. `apps/storefront-dubai_garments/lib/ui/status-badge.ts`
6. `apps/storefront-dubai_garments/components/ui/status-badge.tsx`
7. `apps/storefront-dubai_garments/components/ui/table.tsx`
8. `apps/storefront-dubai_garments/components/ui/list.tsx`
9. `apps/storefront-dubai_garments/app/globals.css`
10. `apps/storefront-dubai_garments/app/admin/leads/page.tsx`
11. `apps/storefront-dubai_garments/app/admin/deals/page.tsx`
12. `apps/storefront-dubai_garments/app/admin/quotes/page.tsx`
13. `apps/storefront-dubai_garments/app/admin/dashboard/page.tsx`
14. `apps/storefront-dubai_garments/components/admin/configuration/execution-audit-table.tsx`
15. `apps/storefront-dubai_garments/app/admin/design-system/page.tsx`
16. Where to Verify:
17. `/admin/leads`, `/admin/deals`, `/admin/quotes`, `/admin/dashboard` (compact density + standardized status badges)
18. `/admin/design-system` (`ui-list` and `ui-table` density variants)

### Day 5
1. Week 1 integration pass completed across core admin pages.
2. Foundation baseline frozen (Week 1 contracts locked for Week 2 onward).
3. Files:
4. `apps/storefront-dubai_garments/app/admin/leads/page.tsx`
5. `apps/storefront-dubai_garments/app/admin/deals/page.tsx`
6. `apps/storefront-dubai_garments/app/admin/quotes/page.tsx`
7. `this file -> Appendix B: Week 1 Foundation Baseline`
8. Where to Verify:
9. `/admin/leads`, `/admin/deals`, `/admin/quotes` now use `PageShell` + `Panel` + `Toolbar` consistently
10. Baseline freeze document: `this file -> Appendix B: Week 1 Foundation Baseline`

### Day 6
1. `FE-P11-005` completed: forms/input/select/validation style standardization.
2. Helper text and error spacing normalized across shared and admin form surfaces.
3. Files:
4. `apps/storefront-dubai_garments/components/ui/fields.tsx`
5. `apps/storefront-dubai_garments/components/ui/index.ts`
6. `apps/storefront-dubai_garments/app/globals.css`
7. `apps/storefront-dubai_garments/app/admin/login/page.tsx`
8. `apps/storefront-dubai_garments/app/customer/login/page.tsx`
9. `apps/storefront-dubai_garments/app/admin/leads/page.tsx`
10. `apps/storefront-dubai_garments/app/admin/deals/page.tsx`
11. `apps/storefront-dubai_garments/app/admin/quotes/page.tsx`
12. Where to Verify:
13. `/admin/login` and `/customer/login` (shared field helper/error behavior)
14. `/admin/leads`, `/admin/deals`, `/admin/quotes` (standardized field blocks + helper spacing)

### Day 7
1. `FE-P11-006` completed: modal/drawer/command-surface styling standardized.
2. Overlay z-index and scroll locking behavior validated in shared `Modal`/`Drawer` primitives.
3. Files:
4. `apps/storefront-dubai_garments/components/ui/modal.tsx`
5. `apps/storefront-dubai_garments/components/ui/drawer.tsx`
6. `apps/storefront-dubai_garments/components/ui/index.ts`
7. `apps/storefront-dubai_garments/components/admin/configuration/command-run-log-modal.tsx`
8. `apps/storefront-dubai_garments/components/admin/configuration/execution-output-modal.tsx`
9. `apps/storefront-dubai_garments/app/globals.css`
10. Where to Verify:
11. `/admin/configuration` and `/admin/configuration/audit` (open execution modals, verify backdrop layering, command surfaces, and body scroll lock)

### Day 8
1. `FE-P11-007` completed: motion and micro-interactions standardized.
2. Added reduced-motion support for entry, hover, press, and focus interaction transforms.
3. Files:
4. `apps/storefront-dubai_garments/components/ui/layout-primitives.tsx`
5. `apps/storefront-dubai_garments/app/globals.css`
6. Where to Verify:
7. `/admin/dashboard`, `/admin/leads`, `/admin/deals`, `/admin/quotes` (staggered entry + hover/press interactions)
8. Enable OS reduced-motion setting and reload; motion should be suppressed while layout/functionality remains intact

### Day 9
1. `FE-P11-008` rollout started for dashboard/leads/deals.
2. Fixed module-level style conflicts by removing nested `Panel` + `dg-card dg-panel` wrappers in leads/deals.
3. Unified compact `PageShell` density on dashboard/leads/deals for consistent module rhythm.
4. Removed nested `dg-card` wrappers inside dashboard analytics panels to avoid double surface treatment.
5. Files:
6. `apps/storefront-dubai_garments/app/admin/dashboard/page.tsx`
7. `apps/storefront-dubai_garments/app/admin/leads/page.tsx`
8. `apps/storefront-dubai_garments/app/admin/deals/page.tsx`
9. Where to Verify:
10. `/admin/dashboard` (single-surface panel styling in analytics + compact layout rhythm)
11. `/admin/leads` (filters and table sections use `Panel` directly without nested `dg-card dg-panel`)
12. `/admin/deals` (filters/pipeline/table sections use consistent panel surface and compact spacing)

### Day 10
1. Continued `FE-P11-008` rollout on quotes/pipeline/activities.
2. Fixed module-level style conflicts by removing nested `Card`/`dg-card dg-panel` wrappers from quotes/activities.
3. Migrated pipeline page to compact `PageShell` + `Panel` primitives for visual consistency with other admin modules.
4. Week 2 interaction baseline frozen and documented.
5. Files:
6. `apps/storefront-dubai_garments/app/admin/quotes/page.tsx`
7. `apps/storefront-dubai_garments/app/admin/pipeline/page.tsx`
8. `apps/storefront-dubai_garments/app/admin/activities/page.tsx`
9. `this file -> Appendix C: Week 2 Interaction Baseline`
10. Where to Verify:
11. `/admin/quotes` (single-surface filters/table panels, compact density, consistent controls)
12. `/admin/pipeline` (compact shell, panelized KPI/convert/board sections, consistent stage card actions)
13. `/admin/activities` (compact shell + panelized event stream without nested panel wrappers)
14. Week 2 freeze doc: `this file -> Appendix C: Week 2 Interaction Baseline`

### Day 11
1. Completed `FE-P11-008` rollout for configuration, observability, and reconfigure modules.
2. Converted configuration audit page to compact shell primitives as part of config module completion.
3. Ran consistency pass across admin modules and aligned remaining top-level surfaces (analytics + automations + design-system density).
4. Consistency scan confirms all top-level admin modules now use `PageShell density="compact"`.
5. Files:
6. `apps/storefront-dubai_garments/app/admin/configuration/page.tsx`
7. `apps/storefront-dubai_garments/app/admin/configuration/audit/page.tsx`
8. `apps/storefront-dubai_garments/app/admin/observability/page.tsx`
9. `apps/storefront-dubai_garments/app/admin/reconfigure/page.tsx`
10. `apps/storefront-dubai_garments/app/admin/analytics/page.tsx`
11. `apps/storefront-dubai_garments/app/admin/automations/page.tsx`
12. `apps/storefront-dubai_garments/app/admin/design-system/page.tsx`
13. Where to Verify:
14. `/admin/configuration`, `/admin/configuration/audit`, `/admin/observability`, `/admin/reconfigure` (compact shell + panelized sections)
15. `/admin/analytics`, `/admin/automations`, `/admin/design-system` (top-level consistency alignment)
16. Consistency command checks:
17. `rg -n "PageShell density=\"compact\"" apps/storefront-dubai_garments/app/admin -g"**/page.tsx"`
18. `rg -n "dg-card dg-panel" apps/storefront-dubai_garments/app/admin -g"**/page.tsx"`

### Day 12
1. Implemented `OPS-P11-009` visual regression baseline workflow.
2. Added reusable golden capture script for key admin routes.
3. Captured golden screenshots for all defined key pages.
4. Files:
5. `scripts/capture-visual-goldens.sh`
6. `docs/qa/visual-regression-baseline.md`
7. `docs/qa/visual-goldens/2026-03-14/admin-dashboard.png`
8. `docs/qa/visual-goldens/2026-03-14/admin-leads.png`
9. `docs/qa/visual-goldens/2026-03-14/admin-deals.png`
10. `docs/qa/visual-goldens/2026-03-14/admin-quotes.png`
11. `docs/qa/visual-goldens/2026-03-14/admin-pipeline.png`
12. `docs/qa/visual-goldens/2026-03-14/admin-activities.png`
13. `docs/qa/visual-goldens/2026-03-14/admin-configuration.png`
14. `docs/qa/visual-goldens/2026-03-14/admin-configuration-audit.png`
15. `docs/qa/visual-goldens/2026-03-14/admin-observability.png`
16. `docs/qa/visual-goldens/2026-03-14/admin-reconfigure.png`
17. `docs/qa/visual-goldens/2026-03-14/admin-analytics.png`
18. `docs/qa/visual-goldens/2026-03-14/admin-automations.png`
19. Where to Verify:
20. Run `ls -lh docs/qa/visual-goldens/2026-03-14`
21. Open any key screenshot from that folder and compare against current UI
22. Run capture again after UI changes and diff with previous dated baseline

### Day 13
1. Completed accessibility and keyboard navigation audit pass on shared admin surfaces.
2. Added global keyboard-visible focus treatment and strengthened button/link/input focus indicators.
3. Added skip-link for keyboard users and main-content focus target in admin shell.
4. Improved contrast for helper/meta/hint text and increased compact admin small-text readability.
5. Added keyboard row-focus feedback for data tables (`tr:focus-within`) to improve orientation during tab navigation.
6. Files:
7. `apps/storefront-dubai_garments/app/globals.css`
8. `apps/storefront-dubai_garments/components/admin/admin-shell.tsx`
9. Where to Verify:
10. Use `Tab` from top of any admin page: skip link appears and moves focus to main content.
11. `/admin/dashboard`, `/admin/leads`, `/admin/deals`, `/admin/quotes` (clear focus rings on buttons/links/fields + clearer muted text)
12. Any admin table with action links/buttons (focused row gets visible highlight via `:focus-within`)

### Day 14
1. Implemented `FE-P11-010` design usage guide and examples.
2. Documented token + component usage rules for enforcement during implementation and review.
3. Added design-system doc index for discoverability.
4. Files:
5. `docs/design-system/README.md`
6. `docs/design-system/design-usage-guide.md`
7. `docs/design-system/token-component-usage-rules.md`
8. Where to Verify:
9. `docs/design-system/README.md` (entry-point and reading order)
10. `docs/design-system/design-usage-guide.md` (page patterns + examples + anti-patterns)
11. `docs/design-system/token-component-usage-rules.md` (strict token/component governance checklist)

### Day 15
1. Final theme regression pass completed and sign-off published.
2. Phase 11 handoff note documented with delivered scope, verification evidence, and carry-over items.
3. Phase freeze record published to lock visual contracts and post-freeze change policy.
4. Files:
5. `this file -> Appendix D: Handoff Note`
6. `this file -> Appendix E: Freeze Record`
7. `docs/Architecture/phases/phase-11-twenty-inspired-theme-implementation.md`
8. Sign-off Evidence:
9. Lint: `cd apps/storefront-dubai_garments && npm run lint -- app/admin`
10. Build: `cd apps/storefront-dubai_garments && npm run build`
11. Visual baseline: `docs/qa/visual-goldens/2026-03-14` (12 golden screenshots)
12. Where to Verify:
13. `this file -> Appendix D: Handoff Note`
14. `this file -> Appendix E: Freeze Record`
15. `docs/qa/visual-regression-baseline.md`

## Appendix A: Theme Migration Map
### Purpose
Map existing UI class groups to semantic token-based primitives so the Twenty-inspired theme rollout is systematic and low-risk.

### Artifacts
1. Source map: `apps/storefront-dubai_garments/lib/design/theme-migration-map.ts`
2. Token source: `apps/storefront-dubai_garments/lib/design/design-tokens.ts`
3. Runtime vars: `apps/storefront-dubai_garments/app/globals.css`

### Migration Matrix
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

### Rollout Order
1. Shell + navigation
2. Card/surface + buttons
3. Inputs + table
4. Status/alerts + typography
5. Layout + motion consistency

### Acceptance Criteria
1. No hardcoded component-level color literals for migrated class groups
2. Interactive states derive from token vars
3. Visual regressions captured before and after each migration slice

## Appendix B: Week 1 Foundation Baseline (Frozen)
### Scope Frozen
1. FE-P11-001 Tokens + semantic naming
2. FE-P11-002 Layout primitives (`PageShell`, `Panel`, `Toolbar`)
3. FE-P11-003 Admin shell/nav interaction states
4. FE-P11-004 Table/list baseline, density, status badges

### Locked Primitives
1. `PageShell` with `comfortable` and `compact` density
2. `Panel` as standard admin content surface
3. `Toolbar` for page/header actions
4. `StatusBadge` powered by centralized status-to-tone mapping

### Locked Styling Contracts
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

### Integration Coverage (Week 1)
1. `/admin/dashboard`
2. `/admin/design-system`
3. `/admin/leads`
4. `/admin/deals`
5. `/admin/quotes`
6. Configuration execution audit table

### Freeze Rules
1. Do not introduce new one-off admin layout wrappers if `PageShell` + `Panel` works
2. Do not create page-local status-pill mappings; use centralized `StatusBadge`
3. Keep Week 1 contracts stable until Week 2 controls pass starts

### Verify Baseline
1. Visual check:
2. `/admin/dashboard`, `/admin/leads`, `/admin/deals`, `/admin/quotes`, `/admin/design-system`
3. Build check:
4. `cd apps/storefront-dubai_garments && npm run build`
5. Lint check:
6. `cd apps/storefront-dubai_garments && npm run lint`

## Appendix C: Week 2 Interaction Baseline (Frozen)
### Scope Frozen
1. FE-P11-005 Forms/input/select/validation standardization
2. FE-P11-006 Modal/drawer/command-surface standardization
3. FE-P11-007 Motion and micro-interactions + reduced-motion support
4. FE-P11-008 rollout continuation for `/admin/quotes`, `/admin/pipeline`, `/admin/activities`

### Locked Interaction Contracts
1. Shared form controls use unified helper/error spacing patterns (`FieldGroup`, `FieldHint`, `FieldError`)
2. Overlay surfaces use shared z-index and scroll-lock behavior from `Modal` and `Drawer`
3. Entry/hover/press transitions use shared motion classes and respect reduced-motion settings
4. Admin module pages use `PageShell density="compact"` + `Panel` as primary interaction containers

### Integration Coverage (Week 2)
1. `/admin/quotes`
2. `/admin/pipeline`
3. `/admin/activities`
4. `/admin/configuration`
5. `/admin/configuration/audit`

### Freeze Rules
1. Do not re-introduce nested panel surfaces (`Panel` + `dg-card dg-panel`) in admin pages
2. Use shared field primitives and avoid page-local input spacing variants
3. Keep motion subtle and disable non-essential transitions under reduced-motion environments
4. Keep module spacing and row density aligned to compact baseline unless explicitly approved

### Verify Baseline
1. Visual check:
2. `/admin/quotes`, `/admin/pipeline`, `/admin/activities`, `/admin/configuration`, `/admin/configuration/audit`
3. Reduced-motion check:
4. Enable OS/browser reduced motion, reload admin routes, verify animation suppression
5. Build check:
6. `cd apps/storefront-dubai_garments && npm run build`
7. Lint check:
8. `cd apps/storefront-dubai_garments && npm run lint`

## Appendix D: Handoff Note
### Phase
Phase 11: Twenty-Inspired Theme Implementation

### Status
Signed off with controlled residual items.

### Delivered Scope
1. Token system and migration mapping
2. Layout primitives (`PageShell`, `Panel`, `Toolbar`)
3. Admin shell restyle and compact baseline rollout
4. Table/list/forms/modal/drawer interaction standardization
5. Key module rollout across admin top-level pages
6. Visual regression baseline process + golden screenshots
7. Accessibility and keyboard navigation baseline pass
8. Design usage documentation and token/component rules

### Verification Completed
1. Lint: `cd apps/storefront-dubai_garments && npm run lint -- app/admin`
2. Build: `cd apps/storefront-dubai_garments && npm run build` (successful)
3. Golden screenshots present:
4. `docs/qa/visual-goldens/2026-03-14/*.png` (12 files)
5. Compact-shell coverage confirmed on top-level admin pages

### Known Residual Items
1. Recharts build-time warnings for responsive chart width/height in static rendering contexts.
2. Legacy nested `dg-card dg-panel` wrappers still exist in detail routes:
3. `apps/storefront-dubai_garments/app/admin/leads/[leadId]/page.tsx`
4. `apps/storefront-dubai_garments/app/admin/deals/[dealId]/page.tsx`

### Operational Notes
1. Visual baseline capture script includes browser preflight install:
2. `scripts/capture-visual-goldens.sh`
3. Usage guide:
4. `docs/qa/visual-regression-baseline.md`

### Recommended Carry-Over (Next Phase)
1. Finish detail-page surface cleanup (remove remaining nested panel wrappers).
2. Resolve Recharts static rendering warnings via fixed container sizing fallback.
3. Add automated visual diff gate in CI.

## Appendix E: Freeze Record
### Freeze Date
2026-03-14

### Freeze Decision
Phase 11 is frozen for feature scope and visual contracts.

### Frozen Contracts
1. Admin top-level pages use `AdminShell` + `PageShell density="compact"` + `Panel`.
2. Shared UI primitives are default entry point for new implementation.
3. Design tokens and migration map remain the styling source of truth.
4. Visual baseline folder `docs/qa/visual-goldens/2026-03-14` is the reference snapshot.
5. Accessibility baseline includes visible focus, skip-link, and keyboard-friendly table focus behavior.

### Do Not Change Without Explicit Approval
1. Global focus-visible behavior in `app/globals.css`
2. Compact spacing rules under `.dg-admin-main ...`
3. Token naming contracts in `lib/design/design-tokens.ts`
4. Status badge semantic mapping

### Allowed Post-Freeze Changes
1. Bug fixes that do not alter the visual contract
2. Accessibility fixes that improve compliance without breaking baseline structure
3. Detail-page migration completion already listed as carry-over

### Traceability
1. Backlog/status source: `docs/Architecture/phases/phase-11-twenty-inspired-theme-implementation.md`
2. Handoff note: `this file -> Appendix D: Handoff Note`
3. Baseline capture process: `docs/qa/visual-regression-baseline.md`

## Appendix F: Future Phase Appendix Standard
Use this same structure for every future phase file (`phase-XX-*.md`) and keep all content in the single phase file.

### Rule
1. One phase = one file.
2. Do not create extra phase support files (no separate handoff/freeze/week baseline docs).
3. Put all supplemental material in appendices inside that same phase file.

### Required Appendices (Template)
1. `Appendix A: Migration/Implementation Map`
- Class/component mapping, dependency impact, rollout slices.

2. `Appendix B: Week 1 Baseline (Frozen)`
- Scope frozen, locked contracts, freeze rules, verification.

3. `Appendix C: Week 2 Baseline (Frozen)` (or next execution block)
- Scope frozen, interaction/behavior contracts, verification.

4. `Appendix D: Handoff Note`
- Delivered scope, verification evidence, residual items, carry-over.

5. `Appendix E: Freeze Record`
- Freeze date, frozen contracts, allowed post-freeze changes, traceability.

### Optional Appendices
1. `Appendix F+: QA Evidence`
- Golden screenshots, visual diffs, accessibility report references.

2. `Appendix F+: Operational Playbook`
- Commands, deploy notes, rollback notes specific to that phase.
