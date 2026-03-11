'use client';

import { useTheme } from '@/components/design/theme-provider';

const customColorFields = [
  { key: 'brand500', label: 'Brand Primary' },
  { key: 'brand600', label: 'Brand Strong' },
  { key: 'brandMid', label: 'Brand Mid' },
  { key: 'brandDeep', label: 'Brand Deep' },
  { key: 'accent500', label: 'Accent' },
  { key: 'headerText', label: 'Header Text' },
  { key: 'headerSubtext', label: 'Header Subtext' },
  { key: 'footerBg', label: 'Footer BG' },
  { key: 'footerText', label: 'Footer Text' },
  { key: 'cardBg', label: 'Card BG' },
  { key: 'cardText', label: 'Card Text' },
  { key: 'buttonPrimaryText', label: 'Primary Btn Text' },
  { key: 'buttonSecondaryBg', label: 'Secondary Btn BG' },
  { key: 'buttonSecondaryText', label: 'Secondary Btn Text' },
  { key: 'textMain', label: 'Text Main' },
  { key: 'textMuted', label: 'Text Muted' },
  { key: 'surfaceSoft', label: 'Surface Soft' },
  { key: 'border', label: 'Border' },
  { key: 'ink900', label: 'Ink 900' },
  { key: 'ink700', label: 'Ink 700' },
  { key: 'ink500', label: 'Ink 500' },
  { key: 'topbarFrom', label: 'Topbar Start' },
  { key: 'topbarTo', label: 'Topbar End' },
] as const;

const fontOptions = [
  { value: "'Inter', ui-sans-serif, system-ui, sans-serif", label: 'Inter / System' },
  { value: "'Poppins', ui-sans-serif, system-ui, sans-serif", label: 'Poppins / System' },
  { value: "'Manrope', ui-sans-serif, system-ui, sans-serif", label: 'Manrope / System' },
  { value: "'Instrument Sans', ui-sans-serif, system-ui, sans-serif", label: 'Instrument Sans / System' },
  { value: "ui-sans-serif, system-ui, sans-serif", label: 'System Sans' },
  { value: "'Georgia', serif", label: 'Georgia Serif' },
] as const;

export default function ThemeSelector() {
  const { themeId, setThemeId, themes, customTheme, updateCustomTheme, resetCustomTheme } = useTheme();

  return (
    <article className="dg-card dg-panel">
      <div className="dg-admin-head">
        <h2 className="dg-title-sm">Theme Options</h2>
        <span className="dg-badge">{themes.length} themes</span>
      </div>
      <p className="dg-muted-sm">Select a preset or build your custom theme. Selection is persisted in local browser storage.</p>

      <div className="dg-feature-grid cols-3 mt-3">
        {themes.map((theme) => {
          const isActive = theme.id === themeId;
          return (
            <article key={theme.id} className="dg-card dg-chart-card">
              <div className="flex items-center gap-2">
                <span
                  className="h-4 w-4 rounded-full border border-slate-200"
                  style={{ backgroundColor: theme.preview.brand }}
                />
                <span
                  className="h-4 w-4 rounded-full border border-slate-200"
                  style={{ backgroundColor: theme.preview.accent }}
                />
                <span
                  className="h-4 w-4 rounded-full border border-slate-200"
                  style={{ backgroundColor: theme.preview.surface }}
                />
              </div>

              <h3 className="dg-title-sm mt-3">{theme.name}</h3>
              <p className="dg-muted-sm">{theme.description}</p>

              <div className="mt-3">
                <button
                  type="button"
                  className={isActive ? 'dg-btn-primary' : 'dg-btn-secondary'}
                  onClick={() => setThemeId(theme.id)}
                >
                  {isActive ? 'Active Theme' : 'Apply Theme'}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-white/80 p-4">
        <div className="dg-admin-head">
          <h3 className="dg-title-sm">Custom Theme Editor</h3>
          <div className="flex items-center gap-2">
            <button type="button" className="dg-btn-secondary" onClick={resetCustomTheme}>
              Reset Custom
            </button>
            <button type="button" className="dg-btn-primary" onClick={() => setThemeId('custom')}>
              Apply Custom
            </button>
          </div>
        </div>

        <h4 className="dg-title-sm mt-2">Color Controls</h4>
        <div className="dg-feature-grid cols-4 mt-3">
          {customColorFields.map((field) => (
            <div key={field.key}>
              <label className="ui-field-label" htmlFor={`custom-${field.key}`}>
                {field.label}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id={`custom-${field.key}`}
                  type="color"
                  className="h-10 w-14 rounded border border-[var(--color-border)] bg-white"
                  value={customTheme[field.key]}
                  onChange={(event) => updateCustomTheme({ [field.key]: event.target.value })}
                />
                <input
                  type="text"
                  className="ui-field"
                  value={customTheme[field.key]}
                  onChange={(event) => updateCustomTheme({ [field.key]: event.target.value })}
                />
              </div>
            </div>
          ))}
        </div>

        <h4 className="dg-title-sm mt-5">Font Controls</h4>
        <div className="dg-feature-grid cols-3 mt-3">
          <div>
            <label className="ui-field-label" htmlFor="font-base">Global Font</label>
            <select
              id="font-base"
              className="ui-field"
              value={customTheme.fontBase}
              onChange={(event) => updateCustomTheme({ fontBase: event.target.value })}
            >
              {fontOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="ui-field-label" htmlFor="font-header">Header Font</label>
            <select
              id="font-header"
              className="ui-field"
              value={customTheme.fontHeader}
              onChange={(event) => updateCustomTheme({ fontHeader: event.target.value })}
            >
              {fontOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="ui-field-label" htmlFor="font-footer">Footer Font</label>
            <select
              id="font-footer"
              className="ui-field"
              value={customTheme.fontFooter}
              onChange={(event) => updateCustomTheme({ fontFooter: event.target.value })}
            >
              {fontOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="ui-field-label" htmlFor="font-card">Card Font</label>
            <select
              id="font-card"
              className="ui-field"
              value={customTheme.fontCard}
              onChange={(event) => updateCustomTheme({ fontCard: event.target.value })}
            >
              {fontOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="ui-field-label" htmlFor="font-button">Button Font</label>
            <select
              id="font-button"
              className="ui-field"
              value={customTheme.fontButton}
              onChange={(event) => updateCustomTheme({ fontButton: event.target.value })}
            >
              {fontOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="ui-field-label" htmlFor="font-text">Text Font</label>
            <select
              id="font-text"
              className="ui-field"
              value={customTheme.fontText}
              onChange={(event) => updateCustomTheme({ fontText: event.target.value })}
            >
              {fontOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </article>
  );
}
