import { prisma } from '@/lib/prisma';
import {
  AiModelConfigSchema,
  type AiModelConfig,
  type AiModelSecretsUpdate,
  type AiModelProvider,
  type AiModelStylePreset,
} from '@/lib/ai-sales-agent/contracts';
import {
  computeStrictEnvChecksPassed,
  type ProviderCheck,
} from '@/lib/ai-sales-agent/model-config-strict-checks';

const MODEL_SETTING_KEYS = {
  runtimeMode: 'AI_RUNTIME_MODE',
  provider: 'AI_MODEL_PROVIDER',
  model: 'AI_MODEL_NAME',
  fallbackEnabled: 'AI_FALLBACK_ENABLED',
  fallbackProvider: 'AI_FALLBACK_PROVIDER',
  fallbackModel: 'AI_FALLBACK_MODEL',
  stylePreset: 'AI_MODEL_STYLE_PRESET',
  temperature: 'AI_MODEL_TEMPERATURE',
  maxOutputTokens: 'AI_MODEL_MAX_OUTPUT_TOKENS',
  requestTimeoutMs: 'AI_MODEL_REQUEST_TIMEOUT_MS',
  maxRetries: 'AI_MODEL_MAX_RETRIES',
  retryBackoffMs: 'AI_MODEL_RETRY_BACKOFF_MS',
  enableCopilot: 'AI_RUNTIME_ENABLE_COPILOT',
  enableTriage: 'AI_RUNTIME_ENABLE_TRIAGE',
  enableReplyStudio: 'AI_RUNTIME_ENABLE_REPLY_STUDIO',
  enableQuote: 'AI_RUNTIME_ENABLE_QUOTE',
  enablePipeline: 'AI_RUNTIME_ENABLE_PIPELINE',
  enableSmartRoutingSla: 'AI_RUNTIME_ENABLE_SMART_ROUTING_SLA',
  enableFastapiLeadAi: 'AI_RUNTIME_ENABLE_FASTAPI_LEAD_AI',
  enableFastapiEmailDraft: 'AI_RUNTIME_ENABLE_FASTAPI_EMAIL_DRAFT',
  promptCopilot: 'AI_PROMPT_COPILOT_SYSTEM',
  promptReplyStudio: 'AI_PROMPT_REPLY_STUDIO_SYSTEM',
  promptQuoteCopilot: 'AI_PROMPT_QUOTE_COPILOT_SYSTEM',
} as const;

function parseNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseFlagWithEnv(
  envKey: string,
  settingsValue: string | undefined,
  fallback: boolean
) {
  const envValue = process.env[envKey];
  if (typeof envValue === 'string' && envValue.trim().length > 0) {
    return parseBoolean(envValue, fallback);
  }
  return parseBoolean(settingsValue, fallback);
}

function parseStylePreset(
  value: string | undefined,
  fallback: AiModelStylePreset
): AiModelStylePreset {
  if (value === 'balanced' || value === 'concise' || value === 'persuasive') {
    return value;
  }
  return fallback;
}

async function readSettingsMap() {
  const keys = Object.values(MODEL_SETTING_KEYS);
  const rows = await prisma.$queryRaw<Array<{ key: string; value: string }>>`
    SELECT key, value
    FROM system_settings
    WHERE is_active = TRUE
      AND scope IN ('storefront', 'global')
      AND key = ANY(${keys})
    ORDER BY CASE WHEN scope = 'storefront' THEN 0 ELSE 1 END, updated_at DESC
  `;

  const map = new Map<string, string>();
  rows.forEach((row) => {
    if (!map.has(row.key)) {
      map.set(row.key, row.value);
    }
  });
  return map;
}

async function getDbSecret(key: string) {
  const rows = await prisma.$queryRaw<Array<{ value: string }>>`
    SELECT value
    FROM system_settings
    WHERE is_active = TRUE
      AND key = ${key}
      AND scope IN ('fastapi', 'storefront', 'global')
    ORDER BY
      CASE
        WHEN scope = 'fastapi' THEN 0
        WHEN scope = 'storefront' THEN 1
        ELSE 2
      END,
      updated_at DESC
    LIMIT 1
  `;
  return rows[0]?.value ?? null;
}

async function hasDbSecret(key: string) {
  const value = await getDbSecret(key);
  return Boolean(value);
}

async function checkProviderKey(provider: AiModelProvider): Promise<ProviderCheck> {
  if (provider === 'deterministic') {
    return {
      provider,
      requiredKey: 'NONE',
      present: true,
      source: 'env',
      message: 'Deterministic provider does not require external API keys.',
    };
  }

  const envValue = process.env.OPENAI_API_KEY;
  if (envValue && envValue.trim().length > 0) {
    return {
      provider,
      requiredKey: 'OPENAI_API_KEY',
      present: true,
      source: 'env',
      message: 'Provider key found in environment.',
    };
  }

  const hasDbValue = await hasDbSecret('OPENAI_API_KEY');
  if (hasDbValue) {
    return {
      provider,
      requiredKey: 'OPENAI_API_KEY',
      present: true,
      source: 'db',
      message: 'Provider key found in DB-backed runtime settings.',
    };
  }

  return {
    provider,
    requiredKey: 'OPENAI_API_KEY',
    present: false,
    source: 'missing',
    message: 'Missing OPENAI_API_KEY for selected provider.',
  };
}

export async function getProviderApiKey(provider: AiModelProvider) {
  if (provider !== 'openai') return null;
  const envValue = process.env.OPENAI_API_KEY;
  if (envValue && envValue.trim().length > 0) {
    return envValue.trim();
  }
  const dbValue = await getDbSecret('OPENAI_API_KEY');
  if (dbValue && dbValue.trim().length > 0) {
    return dbValue.trim();
  }
  return null;
}

export async function getAiModelConfig() {
  const settings = await readSettingsMap();
  const defaults = AiModelConfigSchema.parse({});

  const config = AiModelConfigSchema.parse({
    runtimeMode: settings.get(MODEL_SETTING_KEYS.runtimeMode) ?? defaults.runtimeMode,
    provider: settings.get(MODEL_SETTING_KEYS.provider) ?? defaults.provider,
    model: settings.get(MODEL_SETTING_KEYS.model) ?? defaults.model,
    fallbackEnabled: parseBoolean(
      settings.get(MODEL_SETTING_KEYS.fallbackEnabled),
      defaults.fallbackEnabled
    ),
    fallbackProvider: settings.get(MODEL_SETTING_KEYS.fallbackProvider) ?? defaults.fallbackProvider,
    fallbackModel: settings.get(MODEL_SETTING_KEYS.fallbackModel) ?? defaults.fallbackModel,
    stylePreset: parseStylePreset(
      settings.get(MODEL_SETTING_KEYS.stylePreset),
      defaults.stylePreset
    ),
    temperature: parseNumber(settings.get(MODEL_SETTING_KEYS.temperature), defaults.temperature),
    maxOutputTokens: parseNumber(settings.get(MODEL_SETTING_KEYS.maxOutputTokens), defaults.maxOutputTokens),
    requestTimeoutMs: parseNumber(
      settings.get(MODEL_SETTING_KEYS.requestTimeoutMs),
      defaults.requestTimeoutMs
    ),
    maxRetries: parseNumber(settings.get(MODEL_SETTING_KEYS.maxRetries), defaults.maxRetries),
    retryBackoffMs: parseNumber(
      settings.get(MODEL_SETTING_KEYS.retryBackoffMs),
      defaults.retryBackoffMs
    ),
    featureFlags: {
      copilot: parseFlagWithEnv(
        'AI_RUNTIME_ENABLE_COPILOT',
        settings.get(MODEL_SETTING_KEYS.enableCopilot),
        defaults.featureFlags.copilot
      ),
      triage: parseFlagWithEnv(
        'AI_RUNTIME_ENABLE_TRIAGE',
        settings.get(MODEL_SETTING_KEYS.enableTriage),
        defaults.featureFlags.triage
      ),
      replyStudio: parseFlagWithEnv(
        'AI_RUNTIME_ENABLE_REPLY_STUDIO',
        settings.get(MODEL_SETTING_KEYS.enableReplyStudio),
        defaults.featureFlags.replyStudio
      ),
      quote: parseFlagWithEnv(
        'AI_RUNTIME_ENABLE_QUOTE',
        settings.get(MODEL_SETTING_KEYS.enableQuote),
        defaults.featureFlags.quote
      ),
      pipeline: parseFlagWithEnv(
        'AI_RUNTIME_ENABLE_PIPELINE',
        settings.get(MODEL_SETTING_KEYS.enablePipeline),
        defaults.featureFlags.pipeline
      ),
      smartRoutingSla: parseFlagWithEnv(
        'AI_RUNTIME_ENABLE_SMART_ROUTING_SLA',
        settings.get(MODEL_SETTING_KEYS.enableSmartRoutingSla),
        defaults.featureFlags.smartRoutingSla
      ),
      fastapiLeadAi: parseFlagWithEnv(
        'AI_RUNTIME_ENABLE_FASTAPI_LEAD_AI',
        settings.get(MODEL_SETTING_KEYS.enableFastapiLeadAi),
        defaults.featureFlags.fastapiLeadAi
      ),
      fastapiEmailDraft: parseFlagWithEnv(
        'AI_RUNTIME_ENABLE_FASTAPI_EMAIL_DRAFT',
        settings.get(MODEL_SETTING_KEYS.enableFastapiEmailDraft),
        defaults.featureFlags.fastapiEmailDraft
      ),
    },
    prompts: {
      copilotSystem: settings.get(MODEL_SETTING_KEYS.promptCopilot) ?? defaults.prompts.copilotSystem,
      replyStudioSystem:
        settings.get(MODEL_SETTING_KEYS.promptReplyStudio) ?? defaults.prompts.replyStudioSystem,
      quoteCopilotSystem:
        settings.get(MODEL_SETTING_KEYS.promptQuoteCopilot) ?? defaults.prompts.quoteCopilotSystem,
    },
  });

  const providerChecks = await resolveProviderChecks(config);
  const strictEnvChecksPassed = computeStrictEnvChecksPassed(config, providerChecks);

  return {
    config,
    providerChecks,
    strictEnvChecksPassed,
  };
}

export async function resolveProviderChecks(config: AiModelConfig) {
  return Promise.all([
    checkProviderKey(config.provider),
    checkProviderKey(config.fallbackProvider),
  ]);
}

async function upsertSetting(input: {
  scope?: 'storefront' | 'fastapi' | 'global';
  key: string;
  value: string;
  description: string;
  isSecret?: boolean;
  updatedByUserId: string;
}) {
  await prisma.$executeRaw`
    WITH updated AS (
      UPDATE system_settings
      SET
        value = ${input.value},
        is_secret = ${Boolean(input.isSecret)},
        is_active = TRUE,
        description = ${input.description},
        updated_by_user_id = ${input.updatedByUserId}::uuid,
        updated_at = NOW()
      WHERE scope = ${input.scope ?? 'storefront'}
        AND key = ${input.key}
      RETURNING id
    )
    INSERT INTO system_settings (
      scope,
      key,
      value,
      is_secret,
      is_active,
      description,
      updated_by_user_id
    )
    SELECT
      ${input.scope ?? 'storefront'},
      ${input.key},
      ${input.value},
      ${Boolean(input.isSecret)},
      TRUE,
      ${input.description},
      ${input.updatedByUserId}::uuid
    WHERE NOT EXISTS (SELECT 1 FROM updated)
  `;
}

export async function updateAiModelConfig(input: {
  config: AiModelConfig;
  secrets?: AiModelSecretsUpdate;
  updatedByUserId: string;
}) {
  const maybeKey = input.secrets?.openaiApiKey?.trim();
  console.info('[ai-model-config] save request secret received', {
    hasOpenAiApiKey: Boolean(maybeKey),
    keyLength: maybeKey?.length ?? 0,
  });
  if (maybeKey) {
    await upsertSetting({
      scope: 'fastapi',
      key: 'OPENAI_API_KEY',
      value: maybeKey,
      isSecret: true,
      description: 'OpenAI API key for AI Sales Agent model runtime',
      updatedByUserId: input.updatedByUserId,
    });
    await upsertSetting({
      scope: 'storefront',
      key: 'OPENAI_API_KEY',
      value: maybeKey,
      isSecret: true,
      description: 'OpenAI API key mirror for storefront scope runtime checks',
      updatedByUserId: input.updatedByUserId,
    });
  }

  const providerChecks = await resolveProviderChecks(input.config);
  const strictEnvChecksPassed = computeStrictEnvChecksPassed(
    input.config,
    providerChecks
  );
  console.info('[ai-model-config] strict checks', {
    provider: input.config.provider,
    fallbackProvider: input.config.fallbackProvider,
    fallbackEnabled: input.config.fallbackEnabled,
    checks: providerChecks,
    strictEnvChecksPassed,
  });

  if (!strictEnvChecksPassed) {
    const missingChecks = providerChecks.filter((check) => !check.present);
    const details = missingChecks
      .map((check) => `${check.provider}:${check.requiredKey}`)
      .join(', ');
    throw new Error(
      `Strict env check failed: missing provider key for selected model provider. Missing: ${details || 'unknown'}.`
    );
  }

  await upsertSetting({
    key: MODEL_SETTING_KEYS.runtimeMode,
    value: input.config.runtimeMode,
    description: 'Runtime mode for AI execution (auto / llm_only / fallback_only)',
    updatedByUserId: input.updatedByUserId,
  });
  await upsertSetting({
    key: MODEL_SETTING_KEYS.provider,
    value: input.config.provider,
    description: 'Primary AI provider for AI Sales Agent',
    updatedByUserId: input.updatedByUserId,
  });
  await upsertSetting({
    key: MODEL_SETTING_KEYS.model,
    value: input.config.model,
    description: 'Primary AI model for AI Sales Agent',
    updatedByUserId: input.updatedByUserId,
  });
  await upsertSetting({
    key: MODEL_SETTING_KEYS.fallbackEnabled,
    value: String(input.config.fallbackEnabled),
    description: 'Enable fallback provider/model for AI Sales Agent',
    updatedByUserId: input.updatedByUserId,
  });
  await upsertSetting({
    key: MODEL_SETTING_KEYS.fallbackProvider,
    value: input.config.fallbackProvider,
    description: 'Fallback AI provider for AI Sales Agent',
    updatedByUserId: input.updatedByUserId,
  });
  await upsertSetting({
    key: MODEL_SETTING_KEYS.fallbackModel,
    value: input.config.fallbackModel,
    description: 'Fallback AI model for AI Sales Agent',
    updatedByUserId: input.updatedByUserId,
  });
  await upsertSetting({
    key: MODEL_SETTING_KEYS.stylePreset,
    value: input.config.stylePreset,
    description: 'Model prompt style preset for AI Sales Agent',
    updatedByUserId: input.updatedByUserId,
  });
  await upsertSetting({
    key: MODEL_SETTING_KEYS.temperature,
    value: String(input.config.temperature),
    description: 'AI generation temperature',
    updatedByUserId: input.updatedByUserId,
  });
  await upsertSetting({
    key: MODEL_SETTING_KEYS.maxOutputTokens,
    value: String(input.config.maxOutputTokens),
    description: 'AI maximum output tokens',
    updatedByUserId: input.updatedByUserId,
  });
  await upsertSetting({
    key: MODEL_SETTING_KEYS.requestTimeoutMs,
    value: String(input.config.requestTimeoutMs),
    description: 'AI request timeout in milliseconds',
    updatedByUserId: input.updatedByUserId,
  });
  await upsertSetting({
    key: MODEL_SETTING_KEYS.maxRetries,
    value: String(input.config.maxRetries),
    description: 'AI retry count for retryable upstream failures',
    updatedByUserId: input.updatedByUserId,
  });
  await upsertSetting({
    key: MODEL_SETTING_KEYS.retryBackoffMs,
    value: String(input.config.retryBackoffMs),
    description: 'AI retry backoff base delay in milliseconds',
    updatedByUserId: input.updatedByUserId,
  });
  await upsertSetting({
    key: MODEL_SETTING_KEYS.enableCopilot,
    value: String(input.config.featureFlags.copilot),
    description: 'Enable LLM runtime for copilot features',
    updatedByUserId: input.updatedByUserId,
  });
  await upsertSetting({
    key: MODEL_SETTING_KEYS.enableTriage,
    value: String(input.config.featureFlags.triage),
    description: 'Enable LLM runtime for triage features',
    updatedByUserId: input.updatedByUserId,
  });
  await upsertSetting({
    key: MODEL_SETTING_KEYS.enableReplyStudio,
    value: String(input.config.featureFlags.replyStudio),
    description: 'Enable LLM runtime for reply studio features',
    updatedByUserId: input.updatedByUserId,
  });
  await upsertSetting({
    key: MODEL_SETTING_KEYS.enableQuote,
    value: String(input.config.featureFlags.quote),
    description: 'Enable LLM runtime for quote recommendation/copilot features',
    updatedByUserId: input.updatedByUserId,
  });
  await upsertSetting({
    key: MODEL_SETTING_KEYS.enablePipeline,
    value: String(input.config.featureFlags.pipeline),
    description: 'Enable LLM runtime for pipeline insights',
    updatedByUserId: input.updatedByUserId,
  });
  await upsertSetting({
    key: MODEL_SETTING_KEYS.enableSmartRoutingSla,
    value: String(input.config.featureFlags.smartRoutingSla),
    description: 'Enable LLM runtime for smart routing + SLA reasoning',
    updatedByUserId: input.updatedByUserId,
  });
  await upsertSetting({
    key: MODEL_SETTING_KEYS.enableFastapiLeadAi,
    value: String(input.config.featureFlags.fastapiLeadAi),
    description: 'Enable LLM runtime for FastAPI lead AI calls',
    updatedByUserId: input.updatedByUserId,
  });
  await upsertSetting({
    key: MODEL_SETTING_KEYS.enableFastapiEmailDraft,
    value: String(input.config.featureFlags.fastapiEmailDraft),
    description: 'Enable LLM runtime for FastAPI email draft calls',
    updatedByUserId: input.updatedByUserId,
  });
  await upsertSetting({
    key: MODEL_SETTING_KEYS.promptCopilot,
    value: input.config.prompts.copilotSystem,
    description: 'System prompt for AI Copilot',
    updatedByUserId: input.updatedByUserId,
  });
  await upsertSetting({
    key: MODEL_SETTING_KEYS.promptReplyStudio,
    value: input.config.prompts.replyStudioSystem,
    description: 'System prompt for Reply Studio',
    updatedByUserId: input.updatedByUserId,
  });
  await upsertSetting({
    key: MODEL_SETTING_KEYS.promptQuoteCopilot,
    value: input.config.prompts.quoteCopilotSystem,
    description: 'System prompt for Quote Copilot',
    updatedByUserId: input.updatedByUserId,
  });

  return {
    config: input.config,
    strictEnvChecksPassed,
  };
}
