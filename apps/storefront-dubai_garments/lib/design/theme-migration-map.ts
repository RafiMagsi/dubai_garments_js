export type MigrationArea =
  | 'shell'
  | 'surface'
  | 'navigation'
  | 'buttons'
  | 'inputs'
  | 'tables'
  | 'status'
  | 'cards'
  | 'layout'
  | 'motion';

export type ThemeMigrationItem = {
  id: string;
  area: MigrationArea;
  selectors: string[];
  targetPrimitive: string;
  tokenVars: string[];
  notes: string;
};

// FE-P11-001: migration map from legacy utility classes to semantic token usage.
export const themeMigrationMap: ThemeMigrationItem[] = [
  {
    id: 'SHELL-001',
    area: 'shell',
    selectors: ['.dg-admin-shell', '.dg-admin-sidebar', '.dg-admin-main', '.dg-admin-topbar'],
    targetPrimitive: 'PageShell',
    tokenVars: [
      '--color-surface-soft',
      '--color-surface',
      '--border-color-subtle',
      '--shadow-md',
      '--layout-container-max',
      '--space-xl',
      '--space-2xl',
    ],
    notes: 'Unify app shell spacing/surfaces and remove page-specific hardcoded border/shadow values.',
  },
  {
    id: 'NAV-001',
    area: 'navigation',
    selectors: ['.dg-admin-link', '.dg-nav-link', '.dgx-nav-link', '.dgx-category-pill'],
    targetPrimitive: 'Toolbar / NavItem',
    tokenVars: [
      '--color-ink-700',
      '--color-ink-900',
      '--color-brand-50',
      '--color-brand-600',
      '--radius-sm',
      '--radius-pill',
      '--motion-standard-ms',
    ],
    notes: 'Move hover/active states to semantic nav tokens and normalize focus visibility.',
  },
  {
    id: 'SURFACE-001',
    area: 'surface',
    selectors: ['.dg-card', '.dg-panel', '.dgx-footer-cta', '.dgx-hero-aside', '.dg-filter-card'],
    targetPrimitive: 'Panel / Card',
    tokenVars: [
      '--color-surface',
      '--color-border',
      '--radius-card',
      '--shadow-card',
      '--space-lg',
    ],
    notes: 'Replace mixed per-component radius/shadow values with card-level semantic surface tokens.',
  },
  {
    id: 'BUTTON-001',
    area: 'buttons',
    selectors: ['.dg-btn-primary', '.dg-btn-secondary', '.dg-btn-block'],
    targetPrimitive: 'Button',
    tokenVars: [
      '--color-brand-500',
      '--color-brand-600',
      '--dg-button-primary-text',
      '--dg-button-secondary-bg',
      '--dg-button-secondary-text',
      '--radius-md',
      '--shadow-sm',
      '--shadow-focus-ring',
    ],
    notes: 'Centralize primary/secondary variants and remove direct rgba shadow literals.',
  },
  {
    id: 'INPUT-001',
    area: 'inputs',
    selectors: ['.dg-input', '.dg-select', '.dg-textarea'],
    targetPrimitive: 'Input / Select / TextArea',
    tokenVars: [
      '--color-surface',
      '--color-border',
      '--color-brand-500',
      '--radius-md',
      '--shadow-focus-ring',
      '--font-size-body',
    ],
    notes: 'Use one focus-ring and one border token family across all input controls.',
  },
  {
    id: 'TABLE-001',
    area: 'tables',
    selectors: ['.dg-table-wrap', '.dg-table', '.dg-table th', '.dg-table td'],
    targetPrimitive: 'DataTable',
    tokenVars: [
      '--color-surface',
      '--color-border',
      '--color-ink-900',
      '--color-ink-500',
      '--space-sm',
      '--space-md',
      '--radius-lg',
    ],
    notes: 'Normalize table density and state colors to semantic table token set.',
  },
  {
    id: 'STATUS-001',
    area: 'status',
    selectors: ['.dg-status-pill', '.dg-status-pill-WON', '.dg-alert-success', '.dg-alert-error'],
    targetPrimitive: 'StatusBadge / Alert',
    tokenVars: [
      '--color-success',
      '--color-warning',
      '--color-danger',
      '--color-brand-100',
      '--radius-pill',
      '--font-size-small',
    ],
    notes: 'Consolidate status/alert semantics and eliminate ad hoc color duplication.',
  },
  {
    id: 'LAYOUT-001',
    area: 'layout',
    selectors: ['.dg-container', '.dg-main', '.dg-section', '.dg-two-col-grid', '.dg-three-col-grid'],
    targetPrimitive: 'Layout primitives',
    tokenVars: [
      '--layout-container-max',
      '--layout-content-max',
      '--layout-section-y',
      '--layout-grid-gap',
      '--space-xl',
      '--space-2xl',
    ],
    notes: 'Replace hardcoded spacing/gap values with layout tokens and shared section rhythm.',
  },
  {
    id: 'TYPO-001',
    area: 'cards',
    selectors: ['.dg-page-title', '.dg-title-lg', '.dg-title-md', '.dg-title-sm', '.dg-muted-sm'],
    targetPrimitive: 'Typography scale',
    tokenVars: [
      '--font-family-heading',
      '--font-family-base',
      '--font-size-page-title',
      '--font-size-section-title',
      '--font-size-body',
      '--font-size-small',
      '--line-height-base',
      '--letter-spacing-tight',
    ],
    notes: 'Move heading/body classes to a single semantic typography scale contract.',
  },
  {
    id: 'MOTION-001',
    area: 'motion',
    selectors: ['.dg-motion-fade-up', '.dg-motion-stagger > *', '.dgx-nav-link', '.dg-card'],
    targetPrimitive: 'Motion utilities',
    tokenVars: ['--motion-fast-ms', '--motion-standard-ms', '--motion-slow-ms', '--motion-ease-standard', '--motion-ease-out'],
    notes: 'Unify duration/easing; remove mixed transition timing literals.',
  },
];
