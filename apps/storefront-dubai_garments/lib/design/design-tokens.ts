export const designTokens = {
  brand: {
    productName: 'Dubai Garments Revenue OS',
    fontPrimary: 'Manrope',
    radiusCard: '1.1rem',
    shadowCard: '0 18px 38px -22px rgba(11, 18, 32, 0.42)',
  },
  colors: {
    brand50: '#edf3ff',
    brand100: '#dbe7ff',
    brand500: '#1f6fff',
    brand600: '#1554d6',
    accent500: '#06b6d4',
    ink900: '#0b1220',
    ink700: '#27364a',
    ink500: '#55657b',
    surface: '#ffffff',
    surfaceSoft: '#f3f7fc',
    border: '#d8e2ef',
  },
  motion: {
    fastMs: 120,
    standardMs: 180,
    slowMs: 260,
    easeStandard: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    easeOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },
  layout: {
    containerMax: '1120px',
    sectionY: '2rem',
    gridGap: '1rem',
  },
  typography: {
    heroTitle: 'clamp(2rem, 5vw, 3rem)',
    pageTitle: 'clamp(1.35rem, 2vw, 1.9rem)',
    sectionTitle: 'clamp(1.5rem, 2vw, 2rem)',
    body: '1rem',
    small: '0.875rem',
  },
} as const;

export type DesignTokens = typeof designTokens;

export const tokenGroups = {
  colors: [
    { key: 'brand50', cssVar: '--color-brand-50', value: designTokens.colors.brand50 },
    { key: 'brand100', cssVar: '--color-brand-100', value: designTokens.colors.brand100 },
    { key: 'brand500', cssVar: '--color-brand-500', value: designTokens.colors.brand500 },
    { key: 'brand600', cssVar: '--color-brand-600', value: designTokens.colors.brand600 },
    { key: 'accent500', cssVar: '--color-accent-500', value: designTokens.colors.accent500 },
    { key: 'ink900', cssVar: '--color-ink-900', value: designTokens.colors.ink900 },
    { key: 'ink700', cssVar: '--color-ink-700', value: designTokens.colors.ink700 },
    { key: 'ink500', cssVar: '--color-ink-500', value: designTokens.colors.ink500 },
    { key: 'surface', cssVar: '--color-surface', value: designTokens.colors.surface },
    { key: 'surfaceSoft', cssVar: '--color-surface-soft', value: designTokens.colors.surfaceSoft },
    { key: 'border', cssVar: '--color-border', value: designTokens.colors.border },
  ],
  motion: [
    { key: 'fast', value: `${designTokens.motion.fastMs}ms` },
    { key: 'standard', value: `${designTokens.motion.standardMs}ms` },
    { key: 'slow', value: `${designTokens.motion.slowMs}ms` },
    { key: 'easeStandard', value: designTokens.motion.easeStandard },
    { key: 'easeOut', value: designTokens.motion.easeOut },
  ],
} as const;
