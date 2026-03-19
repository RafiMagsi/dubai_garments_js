import { prisma } from '@/lib/prisma';
import { AiModelConfigSchema, type AiModelConfig, type AiModelProvider } from '@/lib/ai-sales-agent/contracts';

const MODEL_SETTING_KEYS = {
  provider: 'AI_MODEL_PROVIDER',
  model: 'AI_MODEL_NAME',
  fallbackProvider: 'AI_FALLBACK_PROVIDER',
  fallbackModel: 'AI_FALLBACK_MODEL',
  temperature: 'AI_MODEL_TEMPERATURE',
  maxOutputTokens: 'AI_MODEL_MAX_OUTPUT_TOKENS',
  promptCopilot: 'AI_PROMPT_COPILOT_SYSTEM',
  promptReplyStudio: 'AI_PROMPT_REPLY_STUDIO_SYSTEM',
  promptQuoteCopilot: 'AI_PROMPT_QUOTE_COPILOT_SYSTEM',
} as const;

type ProviderCheck = {
  provider: AiModelProvider;
  requiredKey: string;
  present: boolean;
  source: 'env' | 'db' | 'missing';
  message: string;
};

function parseNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

async function hasDbSecret(key: string) {
  const rows = await prisma.$queryRaw<Array<{ value: string }>>`
    SELECT value
    FROM system_settings
    WHERE is_active = TRUE
      AND key = ${key}
      AND scope IN ('fastapi', 'global')
    ORDER BY CASE WHEN scope = 'fastapi' THEN 0 ELSE 1 END, updated_at DESC
    LIMIT 1
  `;
  return Boolean(rows[0]?.value);
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

export async function getAiModelConfig() {
  const settings = await readSettingsMap();
  const defaults = AiModelConfigSchema.parse({});

  const config = AiModelConfigSchema.parse({
    provider: settings.get(MODEL_SETTING_KEYS.provider) ?? defaults.provider,
    model: settings.get(MODEL_SETTING_KEYS.model) ?? defaults.model,
    fallbackProvider: settings.get(MODEL_SETTING_KEYS.fallbackProvider) ?? defaults.fallbackProvider,
    fallbackModel: settings.get(MODEL_SETTING_KEYS.fallbackModel) ?? defaults.fallbackModel,
    temperature: parseNumber(settings.get(MODEL_SETTING_KEYS.temperature), defaults.temperature),
    maxOutputTokens: parseNumber(settings.get(MODEL_SETTING_KEYS.maxOutputTokens), defaults.maxOutputTokens),
    prompts: {
      copilotSystem: settings.get(MODEL_SETTING_KEYS.promptCopilot) ?? defaults.prompts.copilotSystem,
      replyStudioSystem:
        settings.get(MODEL_SETTING_KEYS.promptReplyStudio) ?? defaults.prompts.replyStudioSystem,
      quoteCopilotSystem:
        settings.get(MODEL_SETTING_KEYS.promptQuoteCopilot) ?? defaults.prompts.quoteCopilotSystem,
    },
  });

  const providerChecks = [
    await checkProviderKey(config.provider),
    await checkProviderKey(config.fallbackProvider),
  ];
  const strictEnvChecksPassed = providerChecks.every((item) => item.present);

  return {
    config,
    providerChecks,
    strictEnvChecksPassed,
  };
}

async function upsertSetting(input: {
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
      WHERE scope = 'storefront'
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
      'storefront',
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
  updatedByUserId: string;
}) {
  const providerChecks = [
    await checkProviderKey(input.config.provider),
    await checkProviderKey(input.config.fallbackProvider),
  ];
  const strictEnvChecksPassed = providerChecks.every((item) => item.present);

  if (!strictEnvChecksPassed) {
    throw new Error('Strict env check failed: missing provider key for selected model provider.');
  }

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
