'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardText, CardTitle, SelectField, TextField } from '@/components/ui';
import { getAiModelConfig, updateAiModelConfig } from '@/features/admin/ai-sales-agent/api';
import type {
  AiModelConfig,
  AiModelConfigEnvelope,
  AiModelProvider,
} from '@/features/admin/ai-sales-agent/types';
import { AisBadge, AisFieldLabel } from './reusable';

const DEFAULT_MODEL_CONFIG: AiModelConfig = {
  provider: 'deterministic',
  model: 'gpt-4o-mini',
  fallbackProvider: 'deterministic',
  fallbackModel: 'gpt-4o-mini',
  temperature: 0.2,
  maxOutputTokens: 1200,
  prompts: {
    copilotSystem: 'You are an AI sales copilot.',
    replyStudioSystem: 'Generate concise and professional sales replies.',
    quoteCopilotSystem: 'Generate quote guidance with margin-safe recommendations.',
  },
};

function getProviderBadgeTone(provider: AiModelProvider) {
  return provider === 'openai' ? 'blue' : 'slate';
}

export default function ModelSettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [config, setConfig] = useState<AiModelConfig>(DEFAULT_MODEL_CONFIG);
  const [providerChecks, setProviderChecks] = useState<AiModelConfigEnvelope['providerChecks']>([]);
  const [strictEnvChecksPassed, setStrictEnvChecksPassed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        setError(null);
        setLoading(true);
        const result = await getAiModelConfig();
        if (cancelled) return;
        setConfig(result.config);
        setProviderChecks(result.providerChecks);
        setStrictEnvChecksPassed(result.strictEnvChecksPassed);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load model settings.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasMissingProviderKey = useMemo(
    () => providerChecks.some((item) => !item.present),
    [providerChecks]
  );

  function updateConfig(partial: Partial<AiModelConfig>) {
    setConfig((prev) => ({ ...prev, ...partial }));
  }

  function updatePrompt<K extends keyof AiModelConfig['prompts']>(
    key: K,
    value: AiModelConfig['prompts'][K]
  ) {
    setConfig((prev) => ({
      ...prev,
      prompts: {
        ...prev.prompts,
        [key]: value,
      },
    }));
  }

  async function handleSave() {
    try {
      setError(null);
      setSavedMessage(null);
      setSaving(true);

      const result = await updateAiModelConfig(config);
      setConfig(result.config);
      setStrictEnvChecksPassed(result.strictEnvChecksPassed);
      setSavedMessage('Model settings saved.');

      const refreshed = await getAiModelConfig();
      setProviderChecks(refreshed.providerChecks);
      setStrictEnvChecksPassed(refreshed.strictEnvChecksPassed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save model settings.');
    } finally {
      setSaving(false);
    }
  }

  function handleResetDefaults() {
    setConfig(DEFAULT_MODEL_CONFIG);
    setSavedMessage('Defaults loaded locally. Click Save to persist.');
    setError(null);
  }

  return (
    <div className="pins-scope pins-stack" data-testid="model-settings-panel">
      <Card className="pins-composer" data-testid="model-settings-config-card">
        <p className="pins-kicker">Model Settings</p>
        <p className="pins-muted">
          Configure provider/model routing, prompt defaults, and strict provider key checks.
        </p>

        {loading ? (
          <CardText className="pins-muted">Loading model settings...</CardText>
        ) : (
          <>
            <div className="pins-grid">
              <div>
                <AisFieldLabel>Primary Provider</AisFieldLabel>
                <SelectField
                  className="pins-input"
                  value={config.provider}
                  onChange={(event) =>
                    updateConfig({ provider: event.target.value as AiModelProvider })
                  }
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
                  onChange={(event) => updateConfig({ model: event.target.value })}
                  placeholder="gpt-4o-mini"
                  data-testid="model-settings-model-input"
                />
              </div>

              <div>
                <AisFieldLabel>Fallback Provider</AisFieldLabel>
                <SelectField
                  className="pins-input"
                  value={config.fallbackProvider}
                  onChange={(event) =>
                    updateConfig({ fallbackProvider: event.target.value as AiModelProvider })
                  }
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
                  onChange={(event) => updateConfig({ fallbackModel: event.target.value })}
                  placeholder="gpt-4o-mini"
                  data-testid="model-settings-fallback-model-input"
                />
              </div>

              <div>
                <AisFieldLabel>Temperature</AisFieldLabel>
                <TextField
                  className="pins-input"
                  type="number"
                  value={String(config.temperature)}
                  onChange={(event) => updateConfig({ temperature: Number(event.target.value || 0) })}
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
                    updateConfig({ maxOutputTokens: Number(event.target.value || 0) })
                  }
                  data-testid="model-settings-max-output-tokens-input"
                />
              </div>
            </div>

            <div className="pins-grid">
              <div>
                <AisFieldLabel>Copilot System Prompt</AisFieldLabel>
                <textarea
                  className="dg-input pins-input dg-min-h-[88px]"
                  value={config.prompts.copilotSystem}
                  onChange={(event) => updatePrompt('copilotSystem', event.target.value)}
                  data-testid="model-settings-copilot-prompt-input"
                />
              </div>

              <div>
                <AisFieldLabel>Reply Studio System Prompt</AisFieldLabel>
                <textarea
                  className="dg-input pins-input dg-min-h-[88px]"
                  value={config.prompts.replyStudioSystem}
                  onChange={(event) => updatePrompt('replyStudioSystem', event.target.value)}
                  data-testid="model-settings-reply-prompt-input"
                />
              </div>

              <div>
                <AisFieldLabel>Quote Copilot System Prompt</AisFieldLabel>
                <textarea
                  className="dg-input pins-input dg-min-h-[88px]"
                  value={config.prompts.quoteCopilotSystem}
                  onChange={(event) => updatePrompt('quoteCopilotSystem', event.target.value)}
                  data-testid="model-settings-quote-prompt-input"
                />
              </div>
            </div>
          </>
        )}

        <div className="pins-badges" data-testid="model-settings-status-badges">
          <AisBadge tone={strictEnvChecksPassed ? 'green' : 'amber'}>
            {strictEnvChecksPassed ? 'Strict Env Checks: Passed' : 'Strict Env Checks: Failed'}
          </AisBadge>
          <AisBadge tone={getProviderBadgeTone(config.provider)}>
            Provider: {config.provider}
          </AisBadge>
          <AisBadge tone={getProviderBadgeTone(config.fallbackProvider)}>
            Fallback: {config.fallbackProvider}
          </AisBadge>
        </div>

        <div className="pins-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={handleResetDefaults}
            disabled={saving || loading}
          >
            Reset Defaults
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            data-testid="model-settings-save-btn"
          >
            {saving ? 'Saving...' : 'Save Model Settings'}
          </Button>
        </div>
      </Card>

      <Card className="pins-card" data-testid="model-settings-provider-check-card">
        <CardTitle>Provider Key Checks</CardTitle>
        <CardText className="pins-muted">
          Save is allowed only when selected providers have required keys configured.
        </CardText>
        <div className="pins-list">
          {providerChecks.length === 0 ? (
            <p className="pins-muted">No provider checks available.</p>
          ) : (
            providerChecks.map((item, index) => (
              <div key={`${item.provider}-${index}`} className="pins-item">
                <div className="pins-item-head">
                  <div className="pins-item-title">
                    {item.provider} - {item.requiredKey}
                  </div>
                  <AisBadge tone={item.present ? 'green' : 'amber'}>
                    {item.present ? 'Available' : 'Missing'}
                  </AisBadge>
                </div>
                <div className="pins-item-text">{item.message}</div>
                <div className="pins-item-text">Source: {item.source}</div>
              </div>
            ))
          )}
        </div>
      </Card>

      {hasMissingProviderKey ? (
        <Card className="pins-card pins-card-error" data-testid="model-settings-warning-card">
          <CardTitle>Provider Key Missing</CardTitle>
          <CardText>
            OPENAI_API_KEY is required when provider is set to OpenAI. Configure it in environment
            or DB config before saving this provider selection.
          </CardText>
        </Card>
      ) : null}

      {error ? (
        <Card className="pins-card pins-card-error" data-testid="model-settings-error-card">
          <CardTitle>Model Settings Error</CardTitle>
          <CardText>{error}</CardText>
        </Card>
      ) : null}

      {savedMessage ? (
        <Card className="pins-card" data-testid="model-settings-success-card">
          <CardTitle>Model Settings</CardTitle>
          <CardText>{savedMessage}</CardText>
        </Card>
      ) : null}
    </div>
  );
}
