'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardText, CardTitle } from '@/components/ui';
import {
  getAiModelConfig,
  runAiPromptTest,
  updateAiModelConfig,
} from '@/features/admin/ai-sales-agent/api';
import type {
  AiModelConfig,
  AiModelConfigEnvelope,
  AiPromptTestEnvelope,
  AiPromptTestRequest,
  AiModelStylePreset,
} from '@/features/admin/ai-sales-agent/types';
import ModelConfigFormCard from '@/components/admin/ai-sales-agent/model-settings/model-config-form-card';
import PromptEditorCard from '@/components/admin/ai-sales-agent/model-settings/prompt-editor-card';
import PromptTestCard from '@/components/admin/ai-sales-agent/model-settings/prompt-test-card';
import StructuredPreviewCard from '@/components/admin/ai-sales-agent/model-settings/structured-preview-card';
import ProviderChecksCard from '@/components/admin/ai-sales-agent/model-settings/provider-checks-card';
import { getTemperatureForStylePreset } from '@/lib/ai-sales-agent/model-style-presets';

const DEFAULT_MODEL_CONFIG: AiModelConfig = {
  runtimeMode: 'auto',
  provider: 'deterministic',
  model: 'gpt-4o-mini',
  fallbackEnabled: true,
  fallbackProvider: 'deterministic',
  fallbackModel: 'gpt-4o-mini',
  stylePreset: 'balanced',
  temperature: 0.2,
  maxOutputTokens: 1200,
  prompts: {
    copilotSystem: 'You are an AI sales copilot.',
    replyStudioSystem: 'Generate concise and professional sales replies.',
    quoteCopilotSystem: 'Generate quote guidance with margin-safe recommendations.',
  },
};

const DEFAULT_TEST_INPUT: AiPromptTestRequest = {
  feature: 'copilot',
  input: 'Who needs follow-up today and what should be the next action?',
  context: {},
};

export default function ModelSettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [config, setConfig] = useState<AiModelConfig>(DEFAULT_MODEL_CONFIG);
  const [providerChecks, setProviderChecks] =
    useState<AiModelConfigEnvelope['providerChecks']>([]);
  const [strictEnvChecksPassed, setStrictEnvChecksPassed] = useState(false);
  const [openAiApiKey, setOpenAiApiKey] = useState('');

  const [testInput, setTestInput] = useState<AiPromptTestRequest>(DEFAULT_TEST_INPUT);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testResponse, setTestResponse] = useState<AiPromptTestEnvelope | null>(null);

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

  const hasMissingProviderKey = useMemo(() => {
    const primary = providerChecks.find((item) => item.provider === config.provider);
    if (!primary?.present) return true;
    if (!config.fallbackEnabled) return false;
    const fallback = providerChecks.find(
      (item) => item.provider === config.fallbackProvider
    );
    return !fallback?.present;
  }, [providerChecks, config.provider, config.fallbackEnabled, config.fallbackProvider]);

  const openAiProviderCheck = useMemo(
    () => providerChecks.find((item) => item.provider === 'openai'),
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

  function handleStylePresetChange(nextPreset: AiModelStylePreset) {
    setConfig((prev) => ({
      ...prev,
      stylePreset: nextPreset,
      temperature: getTemperatureForStylePreset(nextPreset),
    }));
  }

  async function handleSave() {
    try {
      setError(null);
      setSavedMessage(null);
      setSaving(true);

      const saveConfig: AiModelConfig = { ...config };
      const saveOpenAiApiKey = openAiApiKey.trim();
      if (saveOpenAiApiKey && saveConfig.provider === 'deterministic') {
        saveConfig.provider = 'openai';
        setConfig(saveConfig);
      }
      console.info('[model-settings-panel] saving config snapshot', {
        provider: saveConfig.provider,
        fallbackProvider: saveConfig.fallbackProvider,
        fallbackEnabled: saveConfig.fallbackEnabled,
        runtimeMode: saveConfig.runtimeMode,
        hasOpenAiApiKey: Boolean(saveOpenAiApiKey),
        openAiApiKeyLength: saveOpenAiApiKey.length,
      });

      const result = await updateAiModelConfig(
        saveConfig,
        saveOpenAiApiKey
          ? {
              openaiApiKey: saveOpenAiApiKey,
            }
          : undefined
      );
      setConfig(result.config);
      setStrictEnvChecksPassed(result.strictEnvChecksPassed);
      setSavedMessage('Model settings saved.');
      setOpenAiApiKey('');

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
    setOpenAiApiKey('');
    setSavedMessage('Defaults loaded locally. Click Save to persist.');
    setError(null);
  }

  function handleOpenAiApiKeyChange(value: string) {
    setOpenAiApiKey(value);
  }

  async function handleRunPromptTest() {
    if (!testInput.input.trim()) {
      setTestError('Test input is required.');
      setTestResponse(null);
      return;
    }

    try {
      setTestLoading(true);
      setTestError(null);
      setTestResponse(null);

      const result = await runAiPromptTest({
        ...testInput,
        configOverride: config,
      });
      setTestResponse(result);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Failed to run prompt test.');
    } finally {
      setTestLoading(false);
    }
  }

  return (
    <div className="pins-scope pins-stack" data-testid="model-settings-panel">
      <ModelConfigFormCard
        loading={loading}
        saving={saving}
        strictEnvChecksPassed={strictEnvChecksPassed}
        config={config}
        openAiApiKey={openAiApiKey}
        openAiKeyPresent={Boolean(openAiProviderCheck?.present)}
        openAiKeySource={openAiProviderCheck?.source ?? 'missing'}
        onOpenAiApiKeyChange={handleOpenAiApiKeyChange}
        onChange={updateConfig}
        onStylePresetChange={handleStylePresetChange}
        onSave={handleSave}
        onResetDefaults={handleResetDefaults}
      />

      <PromptEditorCard
        loading={loading}
        saving={saving}
        prompts={config.prompts}
        onChangePrompt={updatePrompt}
      />

      <PromptTestCard
        loading={testLoading}
        testInput={testInput}
        onChange={setTestInput}
        onRun={handleRunPromptTest}
      />

      <StructuredPreviewCard
        loading={testLoading}
        response={testResponse}
        error={testError}
      />

      <ProviderChecksCard checks={providerChecks} config={config} />

      {hasMissingProviderKey ? (
        <Card className="pins-card pins-card-error" data-testid="model-settings-warning-card">
          <CardTitle>Provider Key Missing</CardTitle>
          <CardText>
            OPENAI_API_KEY is required when provider or enabled fallback provider is set to OpenAI.
            Configure it in environment or DB config before saving this provider selection.
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
