import type { ZodType } from 'zod';
import { getAiModelConfig, getProviderApiKey } from '@/lib/ai-sales-agent/model-config';
import {
  isFeatureLlmEnabled,
  type AiFeatureRoutingKey,
} from '@/lib/ai-sales-agent/feature-routing';

type RuntimeResult<T> = {
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
  feature: AiFeatureRoutingKey;
  systemPrompt: string;
  userInput: string;
  schemaLabel: string;
  schemaHint: string;
  outputSchema: ZodType<T>;
  fallbackReasonPrefix: string;
  fallback: () => Promise<T> | T;
  forceDeterministic?: boolean;
};

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
}) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${input.apiKey}`,
    },
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
    throw new Error(`OpenAI request failed (${response.status}): ${text}`);
  }

  const json = (await response.json()) as { output_text?: string };
  return json.output_text ?? '';
}

export async function runStructuredWithRuntime<T>(
  input: StructuredRuntimeInput<T>
): Promise<RuntimeResult<T>> {
  const startedAt = Date.now();
  const { config } = await getAiModelConfig();

  const runFallback = async (
    reason: string,
    sourceProvider = 'deterministic'
  ): Promise<RuntimeResult<T>> => {
    const data = await input.fallback();
    return {
      data,
      source: 'fallback',
      provider: sourceProvider,
      fallbackUsed: true,
      failureReason: reason,
      model: sourceProvider === 'openai' ? config.fallbackModel : 'deterministic',
      schemaValid: true,
      rawOutput: null,
      parseIssues: [],
      processingMs: Date.now() - startedAt,
    };
  };

  if (input.forceDeterministic || !isFeatureLlmEnabled(input.feature)) {
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
    const rawOutput = await callOpenAi({
      apiKey: primaryKey,
      model: config.model,
      temperature: config.temperature,
      maxOutputTokens: config.maxOutputTokens,
      systemPrompt: input.systemPrompt,
      userInput: input.userInput,
      schemaLabel: input.schemaLabel,
      schemaHint: input.schemaHint,
      stylePreset: config.stylePreset,
    });

    const normalized = stripMarkdownFences(rawOutput);
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
      const fallback = await runFallback(
        `${input.fallbackReasonPrefix} Model output failed schema validation.`,
        config.fallbackProvider
      );
      return {
        ...fallback,
        schemaValid: false,
        rawOutput,
        parseIssues,
      };
    }

    return {
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
  } catch (error) {
    if (!config.fallbackEnabled || config.runtimeMode === 'llm_only') {
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
