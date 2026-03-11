'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  CUSTOM_THEME_STORAGE_KEY,
  CustomThemeTokens,
  DEFAULT_CUSTOM_THEME,
  DEFAULT_THEME_ID,
  isValidThemeId,
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
  ThemeOption,
} from '@/lib/design/theme-options';

type ThemeContextValue = {
  themeId: ThemeOption['id'];
  setThemeId: (nextTheme: ThemeOption['id']) => void;
  themes: ThemeOption[];
  customTheme: CustomThemeTokens;
  updateCustomTheme: (updates: Partial<CustomThemeTokens>) => void;
  resetCustomTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const CUSTOM_VAR_KEYS = [
  '--color-brand-500',
  '--color-brand-600',
  '--color-brand-mid',
  '--color-brand-deep',
  '--color-accent-500',
  '--color-ink-900',
  '--color-ink-700',
  '--color-ink-500',
  '--color-surface-soft',
  '--color-border',
  '--topbar-from',
  '--topbar-to',
  '--brand-rgb',
  '--dg-header-text',
  '--dg-header-subtext',
  '--dg-footer-bg',
  '--dg-footer-text',
  '--dg-card-bg',
  '--dg-card-text',
  '--dg-button-primary-text',
  '--dg-button-secondary-bg',
  '--dg-button-secondary-text',
  '--dg-text-main',
  '--dg-text-muted',
  '--dg-font-family',
  '--dg-font-header',
  '--dg-font-footer',
  '--dg-font-card',
  '--dg-font-button',
  '--dg-font-text',
] as const;

function hexToRgbValue(hex: string) {
  const normalized = hex.replace('#', '').trim();
  if (!/^[a-fA-F0-9]{6}$/.test(normalized)) {
    return '31, 111, 255';
  }
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function parseCustomThemeFromStorage() {
  if (typeof window === 'undefined') {
    return DEFAULT_CUSTOM_THEME;
  }
  const raw = window.localStorage.getItem(CUSTOM_THEME_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_CUSTOM_THEME;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<CustomThemeTokens>;
    return {
      ...DEFAULT_CUSTOM_THEME,
      ...parsed,
    };
  } catch {
    return DEFAULT_CUSTOM_THEME;
  }
}

function applyCustomThemeVars(customTheme: CustomThemeTokens) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--color-brand-500', customTheme.brand500);
  root.style.setProperty('--color-brand-600', customTheme.brand600);
  root.style.setProperty('--color-brand-mid', customTheme.brandMid);
  root.style.setProperty('--color-brand-deep', customTheme.brandDeep);
  root.style.setProperty('--color-accent-500', customTheme.accent500);
  root.style.setProperty('--color-ink-900', customTheme.ink900);
  root.style.setProperty('--color-ink-700', customTheme.ink700);
  root.style.setProperty('--color-ink-500', customTheme.ink500);
  root.style.setProperty('--color-surface-soft', customTheme.surfaceSoft);
  root.style.setProperty('--color-border', customTheme.border);
  root.style.setProperty('--topbar-from', customTheme.topbarFrom);
  root.style.setProperty('--topbar-to', customTheme.topbarTo);
  root.style.setProperty('--brand-rgb', hexToRgbValue(customTheme.brand500));
  root.style.setProperty('--dg-header-text', customTheme.headerText);
  root.style.setProperty('--dg-header-subtext', customTheme.headerSubtext);
  root.style.setProperty('--dg-footer-bg', customTheme.footerBg);
  root.style.setProperty('--dg-footer-text', customTheme.footerText);
  root.style.setProperty('--dg-card-bg', customTheme.cardBg);
  root.style.setProperty('--dg-card-text', customTheme.cardText);
  root.style.setProperty('--dg-button-primary-text', customTheme.buttonPrimaryText);
  root.style.setProperty('--dg-button-secondary-bg', customTheme.buttonSecondaryBg);
  root.style.setProperty('--dg-button-secondary-text', customTheme.buttonSecondaryText);
  root.style.setProperty('--dg-text-main', customTheme.textMain);
  root.style.setProperty('--dg-text-muted', customTheme.textMuted);
  root.style.setProperty('--dg-font-family', customTheme.fontBase);
  root.style.setProperty('--dg-font-header', customTheme.fontHeader);
  root.style.setProperty('--dg-font-footer', customTheme.fontFooter);
  root.style.setProperty('--dg-font-card', customTheme.fontCard);
  root.style.setProperty('--dg-font-button', customTheme.fontButton);
  root.style.setProperty('--dg-font-text', customTheme.fontText);
}

function clearCustomThemeVars() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const key of CUSTOM_VAR_KEYS) {
    root.style.removeProperty(key);
  }
}

function applyThemeToDocument(themeId: ThemeOption['id'], customTheme: CustomThemeTokens) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-dg-theme', themeId);
  if (themeId === 'custom') {
    applyCustomThemeVars(customTheme);
  } else {
    clearCustomThemeVars();
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeOption['id']>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_THEME_ID;
    }
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isValidThemeId(saved) ? saved : DEFAULT_THEME_ID;
  });

  const [customTheme, setCustomTheme] = useState<CustomThemeTokens>(() => parseCustomThemeFromStorage());

  useEffect(() => {
    applyThemeToDocument(themeId, customTheme);
  }, [themeId, customTheme]);

  const setThemeId = useCallback((nextTheme: ThemeOption['id']) => {
    setThemeIdState(nextTheme);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    }
  }, []);

  const updateCustomTheme = useCallback((updates: Partial<CustomThemeTokens>) => {
    setCustomTheme((prev) => {
      const next = { ...prev, ...updates };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
    if (themeId !== 'custom') {
      setThemeId('custom');
    }
  }, [setThemeId, themeId]);

  const resetCustomTheme = useCallback(() => {
    setCustomTheme(DEFAULT_CUSTOM_THEME);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, JSON.stringify(DEFAULT_CUSTOM_THEME));
    }
    if (themeId !== 'custom') {
      setThemeId('custom');
    }
  }, [setThemeId, themeId]);

  const themes = useMemo(() => {
    return THEME_OPTIONS.map((theme) =>
      theme.id === 'custom'
        ? {
            ...theme,
            preview: {
              brand: customTheme.brand500,
              accent: customTheme.accent500,
              surface: customTheme.surfaceSoft,
            },
          }
        : theme
    );
  }, [customTheme]);

  const value = useMemo(
    () => ({
      themeId,
      setThemeId,
      themes,
      customTheme,
      updateCustomTheme,
      resetCustomTheme,
    }),
    [customTheme, resetCustomTheme, setThemeId, themeId, themes, updateCustomTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider.');
  }
  return context;
}
