import type { ZodType } from 'zod';
import { createHash, randomUUID } from 'node:crypto';
import { AiModelConfigSchema, type AiModelConfig } from '@/lib/ai-sales-agent/contracts';
import {
  getAiModelConfig,
  getProviderApiKey,
  resolveProviderChecks,
} from '@/lib/ai-sales-agent/model-config';
import { computeStrictEnvChecksPassed } from '@/lib/ai-sales-agent/model-config-strict-checks';
import {
  isFeatureLlmEnabledByConfig,
  type AiFeatureRoutingKey,
} from '@/lib/ai-sales-agent/feature-routing';
import { logAiRuntimeTelemetry } from '@/lib/ai-sales-agent/llm-runtime/telemetry';

export type RuntimeResult<T> = {
  data: T;
  source: 'model' | 'fallback';
  provider: string;
  fallbackUsed: boolean;
  failureReason: string | null;
  model: string;
  schemaValid: boolean;
  rawOutput: string | null;
  parseIssues: string[];
  processingMs: number;
};

type StructuredRuntimeInput<T> = {
  requestId?: string | null;
  feature: AiFeatureRoutingKey;
  systemPrompt: string;
  userInput: string;
  schemaLabel: string;
  schemaHint: string;
  outputSchema: ZodType<T>;
  fallbackReasonPrefix: string;
  fallback: () => Promise<T> | T;
  forceDeterministic?: boolean;
  configOverride?: Omit<Partial<AiModelConfig>, 'prompts'> & {
    prompts?: Partial<AiModelConfig['prompts']>;
  };
};

function mergeConfig(
  base: AiModelConfig,
  override?: StructuredRuntimeInput<unknown>['configOverride']
) {
  if (!override) return base;
  return AiModelConfigSchema.parse({
    ...base,
    ...override,
    prompts: {
      ...base.prompts,
      ...(override.prompts ?? {}),
    },
  });
}

function styleHint(stylePreset: 'balanced' | 'concise' | 'persuasive') {
  if (stylePreset === 'concise') {
    return 'Be concise and direct. Use short business language and avoid unnecessary detail.';
  }
  if (stylePreset === 'persuasive') {
    return 'Use persuasive sales framing while remaining factual and professional.';
  }
  return 'Use balanced professional business tone.';
}

function stripMarkdownFences(raw: string) {
  const trimmed = raw.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fencedMatch?.[1]) return fencedMatch[1].trim();
  return trimmed;
}

function isRetryable(status: number) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callOpenAi(input: {
  apiKey: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  systemPrompt: string;
  userInput: string;
  schemaLabel: string;
  schemaHint: string;
  stylePreset: 'balanced' | 'concise' | 'persuasive';
  requestTimeoutMs: number;
  maxRetries: number;
  retryBackoffMs: number;
}): Promise<{
  rawOutput: string;
  tokenUsage: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  } | null;
}> {
  let lastError: Error | null = null;
  const attempts = Math.max(1, input.maxRetries + 1);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), input.requestTimeoutMs);

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${input.apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: input.model,
          temperature: input.temperature,
          max_output_tokens: input.maxOutputTokens,
          input: [
            {
              role: 'system',
              content: [
                {
                  type: 'input_text',
                  text: `${input.systemPrompt}\n\nOutput policy:\n- Return ONLY valid JSON.\n- Do not include markdown fences.\n- Schema target: ${input.schemaLabel}\n- Schema shape: ${input.schemaHint}\n- Style: ${styleHint(input.stylePreset)}`,
                },
              ],
            },
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: input.userInput,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        const err = new Error(`OpenAI request failed (${response.status}): ${text}`);
        if (attempt < attempts - 1 && isRetryable(response.status)) {
          lastError = err;
          await sleep(input.retryBackoffMs * (attempt + 1));
          continue;
        }
        throw err;
      }

      const json = (await response.json()) as {
        output_text?: string;
        usage?: {
          input_tokens?: number;
          output_tokens?: number;
          total_tokens?: number;
        };
        output?: Array<{
          content?: Array<{
            type?: string;
            text?: string;
          }>;
        }>;
      };

      const tokenUsage = {
        inputTokens: json.usage?.input_tokens ?? null,
        outputTokens: json.usage?.output_tokens ?? null,
        totalTokens: json.usage?.total_tokens ?? null,
      };

      if (typeof json.output_text === 'string' && json.output_text.trim().length > 0) {
        return {
          rawOutput: json.output_text,
          tokenUsage,
        };
      }

      const stitched =
        json.output
          ?.flatMap((item) => item.content ?? [])
          .map((content) => content.text ?? '')
          .join('\n')
          .trim() ?? '';

      if (stitched.length > 0) {
        return {
          rawOutput: stitched,
          tokenUsage,
        };
      }

      throw new Error('OpenAI returned empty output text.');
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error('OpenAI request failed unexpectedly.');
      const isAbort =
        (err as { name?: string }).name === 'AbortError' ||
        err.message.toLowerCase().includes('aborted');

      if (attempt < attempts - 1 && (isAbort || err.message.includes('OpenAI request failed'))) {
        lastError = new Error(
          isAbort ? `OpenAI request timed out after ${input.requestTimeoutMs}ms` : err.message
        );
        await sleep(input.retryBackoffMs * (attempt + 1));
        continue;
      }

      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError ?? new Error('OpenAI request failed after retries.');
}

export async function runStructuredWithRuntime<T>(
  input: StructuredRuntimeInput<T>
): Promise<RuntimeResult<T>> {
  const runtimeRequestId = input.requestId ?? randomUUID();
  const startedAt = Date.now();
  const { config: savedConfig } = await getAiModelConfig();
  const config = mergeConfig(savedConfig, input.configOverride);
  const promptVersionHash = createHash('sha256')
    .update(input.systemPrompt)
    .digest('hex')
    .slice(0, 12);
  const checks = await resolveProviderChecks(config);
  const strictChecksPassed = computeStrictEnvChecksPassed(config, checks);

  if (!strictChecksPassed) {
    const missing = checks
      .filter((item) => !item.present)
      .map((item) => `${item.provider}:${item.requiredKey}`)
      .join(', ');
    await logAiRuntimeTelemetry({
      requestId: runtimeRequestId,
      feature: input.feature,
      promptVersionHash,
      provider: config.provider,
      model: config.model,
      latencyMs: Date.now() - startedAt,
      schemaValid: false,
      fallbackUsed: false,
      fallbackReason: `Strict env check failed. Missing: ${missing || 'unknown'}.`,
      source: 'fallback',
      status: 'failed',
      tokenUsage: null,
    });
    throw new Error(`Strict env check failed. Missing: ${missing || 'unknown'}.`);
  }

  const runFallback = async (
    reason: string,
    sourceProvider = 'deterministic',
    options?: {
      schemaValid?: boolean;
      rawOutput?: string | null;
      parseIssues?: string[];
      tokenUsage?: {
        inputTokens: number | null;
        outputTokens: number | null;
        totalTokens: number | null;
      } | null;
    }
  ): Promise<RuntimeResult<T>> => {
    const data = await input.fallback();
    const result: RuntimeResult<T> = {
      data,
      source: 'fallback',
      provider: sourceProvider,
      fallbackUsed: true,
      failureReason: reason,
      model: sourceProvider === 'openai' ? config.fallbackModel : 'deterministic',
      schemaValid: options?.schemaValid ?? true,
      rawOutput: options?.rawOutput ?? null,
      parseIssues: options?.parseIssues ?? [],
      processingMs: Date.now() - startedAt,
    };
    await logAiRuntimeTelemetry({
      requestId: runtimeRequestId,
      feature: input.feature,
      promptVersionHash,
      provider: result.provider,
      model: result.model,
      latencyMs: result.processingMs,
      schemaValid: result.schemaValid,
      fallbackUsed: true,
      fallbackReason: reason,
      source: 'fallback',
      status: 'success',
      tokenUsage: options?.tokenUsage ?? null,
    });
    return result;
  };

  if (input.forceDeterministic || !isFeatureLlmEnabledByConfig(input.feature, config)) {
    return runFallback('Feature policy enforces deterministic/internal execution.');
  }

  if (config.runtimeMode === 'fallback_only') {
    return runFallback('Runtime mode is set to fallback_only.');
  }

  if (config.provider !== 'openai') {
    if (config.runtimeMode === 'llm_only') {
      throw new Error(
        'Runtime mode is llm_only but primary provider is not OpenAI. Update Model Settings.'
      );
    }
    return runFallback('Primary provider is deterministic; using internal fallback path.');
  }

  const primaryKey = await getProviderApiKey(config.provider);
  if (!primaryKey) {
    if (config.runtimeMode === 'llm_only') {
      throw new Error('Missing OPENAI_API_KEY while runtime mode is llm_only.');
    }
    return runFallback('Missing OPENAI_API_KEY for primary provider.');
  }

  try {
    const callResult = await callOpenAi({
      apiKey: primaryKey,
      model: config.model,
      temperature: config.temperature,
      maxOutputTokens: config.maxOutputTokens,
      systemPrompt: input.systemPrompt,
      userInput: input.userInput,
      schemaLabel: input.schemaLabel,
      schemaHint: input.schemaHint,
      stylePreset: config.stylePreset,
      requestTimeoutMs: config.requestTimeoutMs,
      maxRetries: config.maxRetries,
      retryBackoffMs: config.retryBackoffMs,
    });

    const rawOutput = callResult.rawOutput;
    const normalized = stripMarkdownFences(rawOutput);
    if (!normalized) {
      throw new Error('Model returned empty content after normalization.');
    }
    const parsedJson = JSON.parse(normalized);
    const validated = input.outputSchema.safeParse(parsedJson);

    if (!validated.success) {
      const parseIssues = validated.error.issues.map((issue) => issue.message);
      if (!config.fallbackEnabled || config.runtimeMode === 'llm_only') {
        throw new Error(
          `${input.fallbackReasonPrefix} Model output failed schema validation: ${parseIssues.join(
            '; '
          )}`
        );
      }
      return runFallback(
        `${input.fallbackReasonPrefix} Model output failed schema validation.`,
        config.fallbackProvider,
        {
          schemaValid: false,
          rawOutput,
          parseIssues,
          tokenUsage: callResult.tokenUsage,
        }
      );
    }

    const result: RuntimeResult<T> = {
      data: validated.data,
      source: 'model',
      provider: 'openai',
      fallbackUsed: false,
      failureReason: null,
      model: config.model,
      schemaValid: true,
      rawOutput,
      parseIssues: [],
      processingMs: Date.now() - startedAt,
    };
    await logAiRuntimeTelemetry({
      requestId: runtimeRequestId,
      feature: input.feature,
      promptVersionHash,
      provider: result.provider,
      model: result.model,
      latencyMs: result.processingMs,
      schemaValid: true,
      fallbackUsed: false,
      fallbackReason: null,
      source: 'model',
      status: 'success',
      tokenUsage: callResult.tokenUsage,
    });
    return result;
  } catch (error) {
    if (!config.fallbackEnabled || config.runtimeMode === 'llm_only') {
      await logAiRuntimeTelemetry({
        requestId: runtimeRequestId,
        feature: input.feature,
        promptVersionHash,
        provider: config.provider,
        model: config.model,
        latencyMs: Date.now() - startedAt,
        schemaValid: false,
        fallbackUsed: false,
        fallbackReason: error instanceof Error ? error.message : 'Model request failed.',
        source: 'model',
        status: 'failed',
        tokenUsage: null,
      });
      throw error;
    }
    return runFallback(
      `${input.fallbackReasonPrefix} ${
        error instanceof Error ? error.message : 'Model request failed.'
      }`,
      config.fallbackProvider
    );
  }
}
