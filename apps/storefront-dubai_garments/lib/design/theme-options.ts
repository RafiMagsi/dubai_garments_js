export type ThemeOption = {
  id: 'neo' | 'sunset' | 'graphite' | 'custom';
  name: string;
  description: string;
  preview: {
    brand: string;
    accent: string;
    surface: string;
  };
};

export const THEME_STORAGE_KEY = 'dg_theme';
export const CUSTOM_THEME_STORAGE_KEY = 'dg_custom_theme';
export const DEFAULT_THEME_ID: ThemeOption['id'] = 'neo';

export type CustomThemeTokens = {
  brand500: string;
  brand600: string;
  brandMid: string;
  brandDeep: string;
  accent500: string;
  ink900: string;
  ink700: string;
  ink500: string;
  surfaceSoft: string;
  border: string;
  topbarFrom: string;
  topbarTo: string;
  headerText: string;
  headerSubtext: string;
  footerBg: string;
  footerText: string;
  cardBg: string;
  cardText: string;
  buttonPrimaryText: string;
  buttonSecondaryBg: string;
  buttonSecondaryText: string;
  textMain: string;
  textMuted: string;
  fontBase: string;
  fontHeader: string;
  fontFooter: string;
  fontCard: string;
  fontButton: string;
  fontText: string;
};

export const DEFAULT_CUSTOM_THEME: CustomThemeTokens = {
  brand500: '#7c3aed',
  brand600: '#6d28d9',
  brandMid: '#7e22ce',
  brandDeep: '#5b21b6',
  accent500: '#22d3ee',
  ink900: '#121829',
  ink700: '#334155',
  ink500: '#64748b',
  surfaceSoft: '#f6f4ff',
  border: '#d9d4f4',
  topbarFrom: '#26154c',
  topbarTo: '#3c2471',
  headerText: '#0b1220',
  headerSubtext: '#55657b',
  footerBg: '#ffffff',
  footerText: '#475569',
  cardBg: '#ffffff',
  cardText: '#27364a',
  buttonPrimaryText: '#ffffff',
  buttonSecondaryBg: '#ffffff',
  buttonSecondaryText: '#0b1220',
  textMain: '#0b1220',
  textMuted: '#55657b',
  fontBase: "'Inter', ui-sans-serif, system-ui, sans-serif",
  fontHeader: "'Poppins', 'Inter', ui-sans-serif, system-ui, sans-serif",
  fontFooter: "'Inter', ui-sans-serif, system-ui, sans-serif",
  fontCard: "'Inter', ui-sans-serif, system-ui, sans-serif",
  fontButton: "'Inter', ui-sans-serif, system-ui, sans-serif",
  fontText: "'Inter', ui-sans-serif, system-ui, sans-serif",
};

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'neo',
    name: 'Neo Blue',
    description: 'Modern SaaS default optimized for AI sales dashboards.',
    preview: {
      brand: '#1f6fff',
      accent: '#06b6d4',
      surface: '#f3f7fc',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset Copper',
    description: 'Warm premium theme for agency and creative sales brands.',
    preview: {
      brand: '#c2410c',
      accent: '#ea580c',
      surface: '#fff7ef',
    },
  },
  {
    id: 'graphite',
    name: 'Graphite Mint',
    description: 'High-contrast executive theme with clean enterprise tones.',
    preview: {
      brand: '#0f766e',
      accent: '#14b8a6',
      surface: '#eff7f6',
    },
  },
  {
    id: 'custom',
    name: 'Custom Theme',
    description: 'Define your own brand palette and apply it live.',
    preview: {
      brand: DEFAULT_CUSTOM_THEME.brand500,
      accent: DEFAULT_CUSTOM_THEME.accent500,
      surface: DEFAULT_CUSTOM_THEME.surfaceSoft,
    },
  },
];

export function isValidThemeId(value: string | null | undefined): value is ThemeOption['id'] {
  return THEME_OPTIONS.some((theme) => theme.id === value);
}
