# Phase 11 Week 2 - Interaction Baseline (Frozen)

## Scope Frozen
1. FE-P11-005 Forms/input/select/validation standardization
2. FE-P11-006 Modal/drawer/command-surface standardization
3. FE-P11-007 Motion and micro-interactions + reduced-motion support
4. FE-P11-008 rollout continuation for `/admin/quotes`, `/admin/pipeline`, `/admin/activities`

## Locked Interaction Contracts
1. Shared form controls use unified helper/error spacing patterns (`FieldGroup`, `FieldHint`, `FieldError`)
2. Overlay surfaces use shared z-index and scroll-lock behavior from `Modal` and `Drawer`
3. Entry/hover/press transitions use shared motion classes and respect reduced-motion settings
4. Admin module pages use `PageShell density="compact"` + `Panel` as primary interaction containers

## Integration Coverage (Week 2)
1. `/admin/quotes`
2. `/admin/pipeline`
3. `/admin/activities`
4. `/admin/configuration`
5. `/admin/configuration/audit`

## Freeze Rules
1. Do not re-introduce nested panel surfaces (`Panel` + `dg-card dg-panel`) in admin pages
2. Use shared field primitives and avoid page-local input spacing variants
3. Keep motion subtle and disable non-essential transitions under reduced-motion environments
4. Keep module spacing and row density aligned to compact baseline unless explicitly approved

## Verify Baseline
1. Visual check:
2. `/admin/quotes`, `/admin/pipeline`, `/admin/activities`, `/admin/configuration`, `/admin/configuration/audit`
3. Reduced-motion check:
4. Enable OS/browser reduced motion, reload admin routes, verify animation suppression
5. Build check:
6. `cd apps/storefront-dubai_garments && npm run build`
7. Lint check:
8. `cd apps/storefront-dubai_garments && npm run lint`
