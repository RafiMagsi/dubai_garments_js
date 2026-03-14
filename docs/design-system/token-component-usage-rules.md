# Token + Component Usage Rules

## Rule 1: Token-First Styling
1. Use tokenized CSS variables from `apps/storefront-dubai_garments/lib/design/design-tokens.ts`.
2. Prefer semantic variables (`--color-border`, `--color-ink-500`) over raw values.
3. If a new visual concept is needed, add token first, then use it in components.

## Rule 2: Surface Hierarchy
1. Page container: `PageShell`
2. Section container: `Panel`
3. Nested content card (optional): `Card` or `dg-card`
4. Never combine `Panel` with nested `dg-card dg-panel`.

## Rule 3: Component Contracts
1. Buttons:
2. Primary action: `dg-btn-primary` or `Button variant="primary"`
3. Secondary action: `dg-btn-secondary` or `Button variant="secondary"`
4. Forms:
5. Label + field + hint/error structure is mandatory.
6. Tables:
7. Use compact density for admin by default (`dg-table-density-compact`, `ui-table-density-compact`).
8. Status:
9. Use shared `StatusBadge`; no page-level badge color mapping.

## Rule 4: Motion + Interaction
1. Keep transitions short and low-noise.
2. Respect reduced-motion behavior.
3. Preserve visible focus indicators for keyboard users.

## Rule 5: Accessibility
1. Every form field must have a visible label.
2. Focus styles cannot be removed.
3. Keyboard path must allow reaching all key actions.
4. Contrast for helper/meta text must remain readable in compact mode.

## Rule 6: New Page Acceptance Criteria
1. Uses `AdminShell` + `PageShell density="compact"` + `Panel`.
2. Uses shared primitives (layout, fields, status, table/list).
3. No raw semantic colors in JSX.
4. Lint passes for page + related components.
5. Visual golden screenshot captured for updated page.

## Rule 7: Change Governance
1. Token changes must update:
2. `design-tokens.ts`
3. `/admin/design-system` rendering
4. related docs under `docs/design-system`
5. Any breaking style behavior must include migration note in:
6. `docs/Architecture/phases/phase-11-theme-migration-map.md`
