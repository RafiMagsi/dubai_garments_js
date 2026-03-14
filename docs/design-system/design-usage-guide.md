# Design Usage Guide (Phase 11)

## Purpose
Use this guide to build new pages with the same visual language introduced in Phase 11.

## Core Principles
1. Use shared primitives first, not page-local wrappers.
2. Use semantic tokens, not raw hex/rgb values.
3. Keep admin pages compact and predictable.
4. Favor consistency over novelty for operational screens.

## Required Page Structure (Admin)
```tsx
import AdminShell from '@/components/admin/admin-shell';
import { PageShell, Panel, Toolbar } from '@/components/ui';

export default function ExamplePage() {
  return (
    <AdminShell>
      <PageShell density="compact">
        <Panel>
          {/* header + actions */}
        </Panel>
        <Panel>
          {/* content */}
        </Panel>
      </PageShell>
    </AdminShell>
  );
}
```

## Standard Building Blocks
1. Layout: `PageShell`, `Panel`, `Toolbar`
2. Actions: `Button`, `dg-btn-primary`, `dg-btn-secondary`
3. Forms: `FieldGroup`, `FieldLabel`, `TextField`, `SelectField`, `FieldHint`, `FieldError`
4. Data display: `DataTable`/`dg-table`, `List`/`dg-list`, `StatusBadge`
5. Overlays: `Modal`, `Drawer`

## Common Patterns
### Filter + Table
```tsx
<Panel>
  <form className="dg-form-row">{/* filters */}</form>
</Panel>
<Panel>
  <div className="dg-table-wrap">
    <table className="dg-table dg-table-density-compact">{/* rows */}</table>
  </div>
</Panel>
```

### KPI Strip
Use `MetricStrip` from `@/components/shared/sections` for top summary metrics.

### Status Rendering
Always map status through `StatusBadge`; avoid page-local color logic.

## Accessibility Baseline
1. Interactive elements must be keyboard reachable.
2. Keep visible focus states (`:focus-visible`) intact.
3. Add labels/help/error text for form controls.
4. Keep text readable in compact mode (helper/meta text included).

## Anti-Patterns (Do Not Do)
1. `Panel` wrapping `div.dg-card.dg-panel` (double surface).
2. Inline colors in JSX (`style={{ color: '#...' }}`) for UI states.
3. New one-off button/input styles per page.
4. Removing focus outline/box-shadow without replacement.

## Verification Checklist
1. Page uses `PageShell density="compact"` + `Panel`.
2. No nested `dg-card dg-panel` inside `Panel`.
3. No raw color literals for semantic states.
4. Keyboard tab order is logical.
5. Visual baseline screenshot updated if UI changed.
