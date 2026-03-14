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
