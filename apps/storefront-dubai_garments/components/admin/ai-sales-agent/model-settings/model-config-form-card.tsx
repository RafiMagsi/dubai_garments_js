'use client';

import { Button, Card, CardText, SelectField, TextField } from '@/components/ui';
import { AisBadge, AisFieldLabel } from '@/components/admin/ai-sales-agent/reusable';
import type { AiModelConfig, AiModelProvider, AiModelStylePreset } from '@/features/admin/ai-sales-agent/types';

type Props = {
  loading: boolean;
  saving: boolean;
  strictEnvChecksPassed: boolean;
  config: AiModelConfig;
  onChange: (partial: Partial<AiModelConfig>) => void;
  onStylePresetChange: (value: AiModelStylePreset) => void;
  onSave: () => Promise<void> | void;
  onResetDefaults: () => void;
};

export default function ModelConfigFormCard({
  loading,
  saving,
  strictEnvChecksPassed,
  config,
  onChange,
  onStylePresetChange,
  onSave,
  onResetDefaults,
}: Props) {
  return (
    <Card className="pins-composer" data-testid="model-settings-config-card">
      <p className="pins-kicker">Model Settings</p>
      <p className="pins-muted">
        Configure provider/model routing, fallback behavior, and temperature/style presets.
      </p>

      <div className="pins-grid">
        <div>
          <AisFieldLabel>Primary Provider</AisFieldLabel>
          <SelectField
            className="pins-input"
            value={config.provider}
            onChange={(event) =>
              onChange({ provider: event.target.value as AiModelProvider })
            }
            disabled={loading || saving}
            data-testid="model-settings-provider-select"
          >
            <option value="deterministic">Deterministic</option>
            <option value="openai">OpenAI</option>
          </SelectField>
        </div>

        <div>
          <AisFieldLabel>Primary Model</AisFieldLabel>
          <TextField
            className="pins-input"
            value={config.model}
            onChange={(event) => onChange({ model: event.target.value })}
            placeholder="gpt-4o-mini"
            disabled={loading || saving}
            data-testid="model-settings-model-input"
          />
        </div>

        <div>
          <AisFieldLabel>Fallback Provider</AisFieldLabel>
          <SelectField
            className="pins-input"
            value={config.fallbackProvider}
            onChange={(event) =>
              onChange({ fallbackProvider: event.target.value as AiModelProvider })
            }
            disabled={loading || saving}
            data-testid="model-settings-fallback-provider-select"
          >
            <option value="deterministic">Deterministic</option>
            <option value="openai">OpenAI</option>
          </SelectField>
        </div>

        <div>
          <AisFieldLabel>Fallback Model</AisFieldLabel>
          <TextField
            className="pins-input"
            value={config.fallbackModel}
            onChange={(event) => onChange({ fallbackModel: event.target.value })}
            placeholder="gpt-4o-mini"
            disabled={loading || saving}
            data-testid="model-settings-fallback-model-input"
          />
        </div>

        <div>
          <AisFieldLabel>Style Preset</AisFieldLabel>
          <SelectField
            className="pins-input"
            value={config.stylePreset}
            onChange={(event) =>
              onStylePresetChange(event.target.value as AiModelStylePreset)
            }
            disabled={loading || saving}
            data-testid="model-settings-style-preset-select"
          >
            <option value="balanced">Balanced</option>
            <option value="concise">Concise</option>
            <option value="persuasive">Persuasive</option>
          </SelectField>
        </div>

        <div>
          <AisFieldLabel>Temperature</AisFieldLabel>
          <TextField
            className="pins-input"
            type="number"
            value={String(config.temperature)}
            onChange={(event) => onChange({ temperature: Number(event.target.value || 0) })}
            disabled={loading || saving}
            data-testid="model-settings-temperature-input"
          />
        </div>

        <div>
          <AisFieldLabel>Max Output Tokens</AisFieldLabel>
          <TextField
            className="pins-input"
            type="number"
            value={String(config.maxOutputTokens)}
            onChange={(event) =>
              onChange({ maxOutputTokens: Number(event.target.value || 0) })
            }
            disabled={loading || saving}
            data-testid="model-settings-max-output-tokens-input"
          />
        </div>
      </div>

      <div className="pins-actions">
        <label className="dg-flex dg-items-center dg-gap-2 dg-text-sm dg-font-semibold">
          <input
            type="checkbox"
            checked={config.fallbackEnabled}
            onChange={(event) => onChange({ fallbackEnabled: event.target.checked })}
            disabled={loading || saving}
            data-testid="model-settings-fallback-enabled-toggle"
          />
          Enable fallback provider
        </label>
      </div>

      <div className="pins-badges" data-testid="model-settings-status-badges">
        <AisBadge tone={strictEnvChecksPassed ? 'green' : 'amber'}>
          {strictEnvChecksPassed ? 'Strict Env Checks: Passed' : 'Strict Env Checks: Failed'}
        </AisBadge>
        <AisBadge tone={config.provider === 'openai' ? 'blue' : 'slate'}>
          Provider: {config.provider}
        </AisBadge>
        <AisBadge tone={config.fallbackProvider === 'openai' ? 'blue' : 'slate'}>
          Fallback: {config.fallbackProvider}
        </AisBadge>
        <AisBadge tone="slate">Style: {config.stylePreset}</AisBadge>
      </div>

      <div className="pins-badges">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange({ temperature: 0.2 })}
          disabled={loading || saving}
          data-testid="model-settings-temp-balanced-btn"
        >
          Temp 0.2
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange({ temperature: 0.1 })}
          disabled={loading || saving}
          data-testid="model-settings-temp-concise-btn"
        >
          Temp 0.1
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange({ temperature: 0.4 })}
          disabled={loading || saving}
          data-testid="model-settings-temp-persuasive-btn"
        >
          Temp 0.4
        </Button>
      </div>

      <CardText className="pins-muted">
        Presets auto-adjust style and temperature; you can still override temperature manually.
      </CardText>

      <div className="pins-actions">
        <Button
          type="button"
          variant="secondary"
          onClick={onResetDefaults}
          disabled={loading || saving}
        >
          Reset Defaults
        </Button>
        <Button
          type="button"
          onClick={onSave}
          disabled={loading || saving}
          data-testid="model-settings-save-btn"
        >
          {saving ? 'Saving...' : 'Save Model Settings'}
        </Button>
      </div>
    </Card>
  );
}
