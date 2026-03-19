import {
  AiModelConfigSchema,
  AiPromptTestRequestSchema,
  DraftReplyResponseSchema,
  FollowupsTodayResponseSchema,
  QuoteRecommendationPayloadSchema,
  ReplyStudioDraftSchema,
  type AiModelConfig,
  type AiPromptTestRequest,
} from '@/lib/ai-sales-agent/contracts';
import {
  getAiModelConfig,
  getProviderApiKey,
  resolveProviderChecks,
} from '@/lib/ai-sales-agent/model-config';
import { computeStrictEnvChecksPassed } from '@/lib/ai-sales-agent/model-config-strict-checks';
import {
  PromptTestConfigError,
  PromptTestUpstreamError,
} from '@/lib/ai-sales-agent/model-prompt-test-errors';

type PromptTestParsed = {
  schemaValid: boolean;
  parsed: unknown | null;
  parseIssues: string[];
};

function getSchemaLabel(feature: AiPromptTestRequest['feature']) {
  if (feature === 'copilot') return 'FollowupsTodayResponse';
  if (feature === 'reply_studio') return 'ReplyStudioDraft';
  return 'QuoteRecommendationPayload';
}

function getSchemaHint(feature: AiPromptTestRequest['feature']) {
  if (feature === 'copilot') {
    return `{"summary":"string","items":[{"type":"lead|deal|quote","id":"string","title":"string","reason":"string","priority":"high|medium|low","suggestedAction":"string"}]}`;
  }
  if (feature === 'reply_studio') {
    return `{"mode":"first_reply|followup_reply|clarification_questions","tone":"concise|formal|persuasive","channel":"email|whatsapp","subject":"string|null","message":"string","rationale":"string","suggestedNextAction":"string","confidence":0,"questions":["string"]}`;
  }
  return `{"summary":"string","recommendations":[{"productId":"uuid|null","productName":"string","suggestedQuantity":0,"suggestedVariant":"string|null","rationale":"string"}],"missingData":[{"field":"string","reason":"string"}],"canCreateQuote":true,"suggestedNextAction":"string","confidence":0}`;
}

function styleHint(stylePreset: AiModelConfig['stylePreset']) {
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

function parseOutput(
  feature: AiPromptTestRequest['feature'],
  rawOutput: string
): PromptTestParsed {
  try {
    const normalized = stripMarkdownFences(rawOutput);
    const parsedJson = JSON.parse(normalized);

    if (feature === 'copilot') {
      const validated = FollowupsTodayResponseSchema.safeParse(parsedJson);
      return validated.success
        ? { schemaValid: true, parsed: validated.data, parseIssues: [] }
        : {
            schemaValid: false,
            parsed: parsedJson,
            parseIssues: validated.error.issues.map((issue) => issue.message),
          };
    }
    if (feature === 'reply_studio') {
      const validated = ReplyStudioDraftSchema.safeParse(parsedJson);
      return validated.success
        ? { schemaValid: true, parsed: validated.data, parseIssues: [] }
        : {
            schemaValid: false,
            parsed: parsedJson,
            parseIssues: validated.error.issues.map((issue) => issue.message),
          };
    }

    const validated = QuoteRecommendationPayloadSchema.safeParse(parsedJson);
    return validated.success
      ? { schemaValid: true, parsed: validated.data, parseIssues: [] }
      : {
          schemaValid: false,
          parsed: parsedJson,
          parseIssues: validated.error.issues.map((issue) => issue.message),
        };
  } catch (error) {
    return {
      schemaValid: false,
      parsed: null,
      parseIssues: [
        error instanceof Error ? `Invalid JSON: ${error.message}` : 'Invalid JSON output.',
      ],
    };
  }
}

function deterministicOutput(input: AiPromptTestRequest) {
  if (input.feature === 'copilot') {
    return JSON.stringify(
      {
        summary: 'Deterministic prompt-test output for copilot.',
        items: [
          {
            type: 'lead',
            id: input.context?.leadId ?? 'demo-lead',
            title: 'Priority lead follow-up',
            reason: input.input,
            priority: 'high',
            suggestedAction: 'Send immediate follow-up and capture missing quote inputs.',
          },
        ],
      },
      null,
      2
    );
  }

  if (input.feature === 'reply_studio') {
    return JSON.stringify(
      {
        mode: 'first_reply',
        tone: input.context?.tone === 'friendly' ? 'concise' : 'formal',
        channel: input.context?.channel ?? 'email',
        subject: 'Re: Your inquiry',
        message: `Thank you for your request. ${input.input}`,
        rationale: 'Deterministic test response from local provider path.',
        suggestedNextAction: 'Request missing specifications before preparing quote.',
        confidence: 74,
        questions: ['Can you confirm quantity split and delivery location?'],
      },
      null,
      2
    );
  }

  return JSON.stringify(
    {
      summary: 'Deterministic recommendation output for quote copilot testing.',
      recommendations: [
        {
          productId: null,
          productName: 'Demo Product',
          suggestedQuantity: 100,
          suggestedVariant: 'Standard',
          rationale: input.input,
        },
      ],
      missingData: [
        {
          field: 'timeline',
          reason: 'Required to estimate urgency and final quote readiness.',
        },
      ],
      canCreateQuote: false,
      suggestedNextAction: 'Collect timeline and branding constraints first.',
      confidence: 68,
    },
    null,
    2
  );
}

async function callOpenAi(input: {
  apiKey: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  systemPrompt: string;
  userInput: string;
  feature: AiPromptTestRequest['feature'];
  stylePreset: AiModelConfig['stylePreset'];
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
              text: `${input.systemPrompt}\n\nOutput policy:\n- Return ONLY valid JSON.\n- Do not include markdown fences.\n- Schema target: ${getSchemaLabel(input.feature)}\n- Schema shape: ${getSchemaHint(input.feature)}\n- Style: ${styleHint(input.stylePreset)}`,
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
    throw new PromptTestUpstreamError(
      `OpenAI request failed (${response.status}): ${text}`
    );
  }

  const json = (await response.json()) as {
    output_text?: string;
  };
  return json.output_text ?? '';
}

function resolveSystemPrompt(
  feature: AiPromptTestRequest['feature'],
  config: AiModelConfig
) {
  if (feature === 'copilot') return config.prompts.copilotSystem;
  if (feature === 'reply_studio') return config.prompts.replyStudioSystem;
  return config.prompts.quoteCopilotSystem;
}

function mergeConfig(
  base: AiModelConfig,
  override: AiPromptTestRequest['configOverride']
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

export async function runAiPromptTest(rawInput: unknown) {
  const parsed = AiPromptTestRequestSchema.parse(rawInput);
  const startedAt = Date.now();
  const saved = await getAiModelConfig();
  const effectiveConfig = mergeConfig(saved.config, parsed.configOverride);
  const providerChecks = await resolveProviderChecks(effectiveConfig);
  const strictChecksPassed = computeStrictEnvChecksPassed(
    effectiveConfig,
    providerChecks
  );

  if (!strictChecksPassed) {
    throw new PromptTestConfigError(
      'Strict env check failed: selected provider/fallback is missing required key.'
    );
  }

  const prompt = `${parsed.input}\n\nContext: ${JSON.stringify(parsed.context ?? {}, null, 2)}`;
  const primaryProvider = effectiveConfig.provider;
  const fallbackProvider = effectiveConfig.fallbackProvider;

  let rawOutput = '';
  let source: 'model' | 'fallback' = 'model';
  let providerUsed = primaryProvider;
  let modelUsed = effectiveConfig.model;
  let fallbackUsed = false;

  try {
    if (primaryProvider === 'openai') {
      const key = await getProviderApiKey(primaryProvider);
      if (!key) {
        throw new PromptTestConfigError(
          'Missing OPENAI_API_KEY for selected provider.'
        );
      }
      rawOutput = await callOpenAi({
        apiKey: key,
        model: effectiveConfig.model,
        temperature: effectiveConfig.temperature,
        maxOutputTokens: effectiveConfig.maxOutputTokens,
        systemPrompt: resolveSystemPrompt(parsed.feature, effectiveConfig),
        userInput: prompt,
        feature: parsed.feature,
        stylePreset: effectiveConfig.stylePreset,
      });
    } else {
      rawOutput = deterministicOutput(parsed);
      source = 'fallback';
      providerUsed = 'deterministic';
    }
  } catch (error) {
    if (!effectiveConfig.fallbackEnabled) {
      throw error;
    }

    fallbackUsed = true;
    source = 'fallback';
    providerUsed = fallbackProvider;
    modelUsed = effectiveConfig.fallbackModel;

    if (fallbackProvider === 'openai') {
      const fallbackKey = await getProviderApiKey(fallbackProvider);
      if (!fallbackKey) {
        throw new PromptTestConfigError(
          'Missing OPENAI_API_KEY for fallback provider.'
        );
      }
      rawOutput = await callOpenAi({
        apiKey: fallbackKey,
        model: effectiveConfig.fallbackModel,
        temperature: effectiveConfig.temperature,
        maxOutputTokens: effectiveConfig.maxOutputTokens,
        systemPrompt: resolveSystemPrompt(parsed.feature, effectiveConfig),
        userInput: prompt,
        feature: parsed.feature,
        stylePreset: effectiveConfig.stylePreset,
      });
    } else {
      rawOutput = deterministicOutput(parsed);
      providerUsed = 'deterministic';
    }
  }

  const parsedOutput = parseOutput(parsed.feature, rawOutput);

  return {
    feature: parsed.feature,
    source,
    provider: providerUsed,
    model: modelUsed,
    fallbackUsed,
    schemaValid: parsedOutput.schemaValid,
    parsed: parsedOutput.parsed,
    parseIssues: parsedOutput.parseIssues,
    rawOutput,
    latencyMs: Date.now() - startedAt,
  };
}
