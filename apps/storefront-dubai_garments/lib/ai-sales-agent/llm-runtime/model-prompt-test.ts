import {
  AiPromptTestRequestSchema,
  FollowupsTodayResponseSchema,
  ReplyStudioDraftSchema,
  QuoteRecommendationPayloadSchema,
  type FollowupsTodayResponse,
  type ReplyStudioDraft,
  type QuoteRecommendationPayload,
  type AiPromptTestRequest,
} from '@/lib/ai-sales-agent/contracts';
import { runStructuredWithRuntime } from '@/lib/ai-sales-agent/llm-runtime';
import {
  PromptTestConfigError,
  PromptTestUpstreamError,
} from '@/lib/ai-sales-agent/model-prompt-test-errors';
import { getAiModelConfig } from '@/lib/ai-sales-agent/model-config';
import { resolveSystemPrompt } from './prompt-resolution';

type PromptTestFeature = AiPromptTestRequest['feature'];

function getSchemaLabel(feature: PromptTestFeature) {
  if (feature === 'copilot') return 'FollowupsTodayResponse';
  if (feature === 'reply_studio') return 'ReplyStudioDraft';
  return 'QuoteRecommendationPayload';
}

function getSchemaHint(feature: PromptTestFeature) {
  if (feature === 'copilot') {
    return `{"summary":"string","items":[{"type":"lead|deal|quote","id":"string","title":"string","reason":"string","priority":"high|medium|low","suggestedAction":"string"}]}`;
  }
  if (feature === 'reply_studio') {
    return `{"mode":"first_reply|followup_reply|clarification_questions","tone":"concise|formal|persuasive","channel":"email|whatsapp","subject":"string|null","message":"string","rationale":"string","suggestedNextAction":"string","confidence":0,"questions":["string"]}`;
  }
  return `{"summary":"string","recommendations":[{"productId":"uuid|null","productName":"string","suggestedQuantity":0,"suggestedVariant":"string|null","rationale":"string"}],"missingData":[{"field":"string","reason":"string"}],"canCreateQuote":true,"suggestedNextAction":"string","confidence":0}`;
}

function deterministicCopilotFallback(input: AiPromptTestRequest): FollowupsTodayResponse {
  return {
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
  };
}

function deterministicReplyFallback(input: AiPromptTestRequest): ReplyStudioDraft {
  return {
    mode: 'first_reply',
    tone: input.context?.tone === 'friendly' ? 'concise' : 'formal',
    channel: input.context?.channel ?? 'email',
    subject: 'Re: Your inquiry',
    message: `Thank you for your request. ${input.input}`,
    rationale: 'Deterministic test response from local provider path.',
    suggestedNextAction: 'Request missing specifications before preparing quote.',
    confidence: 74,
    questions: ['Can you confirm quantity split and delivery location?'],
  };
}

function deterministicQuoteFallback(input: AiPromptTestRequest): QuoteRecommendationPayload {
  return {
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
  };
}

function getRuntimeFeature(feature: PromptTestFeature) {
  if (feature === 'copilot') return 'copilot_followups_today' as const;
  if (feature === 'reply_studio') return 'reply_studio' as const;
  return 'quote_copilot_summary' as const;
}

export async function runAiPromptTest(
  rawInput: unknown,
  options?: { requestId?: string | null }
) {
  const parsed = AiPromptTestRequestSchema.parse(rawInput);
  const { config } = await getAiModelConfig();
  const prompt = `${parsed.input}\n\nContext: ${JSON.stringify(parsed.context ?? {}, null, 2)}`;

  try {
    let runtimeResult:
      | Awaited<ReturnType<typeof runStructuredWithRuntime<FollowupsTodayResponse>>>
      | Awaited<ReturnType<typeof runStructuredWithRuntime<ReplyStudioDraft>>>
      | Awaited<ReturnType<typeof runStructuredWithRuntime<QuoteRecommendationPayload>>>;

    if (parsed.feature === 'copilot') {
      runtimeResult = await runStructuredWithRuntime({
        requestId: options?.requestId,
        feature: getRuntimeFeature(parsed.feature),
        systemPrompt: resolveSystemPrompt(parsed.feature, config.prompts, parsed.configOverride),
        userInput: prompt,
        schemaLabel: getSchemaLabel(parsed.feature),
        schemaHint: getSchemaHint(parsed.feature),
        outputSchema: FollowupsTodayResponseSchema,
        fallbackReasonPrefix: 'PromptTest:',
        fallback: () => deterministicCopilotFallback(parsed),
        configOverride: parsed.configOverride,
      });
    } else if (parsed.feature === 'reply_studio') {
      runtimeResult = await runStructuredWithRuntime({
        requestId: options?.requestId,
        feature: getRuntimeFeature(parsed.feature),
        systemPrompt: resolveSystemPrompt(parsed.feature, config.prompts, parsed.configOverride),
        userInput: prompt,
        schemaLabel: getSchemaLabel(parsed.feature),
        schemaHint: getSchemaHint(parsed.feature),
        outputSchema: ReplyStudioDraftSchema,
        fallbackReasonPrefix: 'PromptTest:',
        fallback: () => deterministicReplyFallback(parsed),
        configOverride: parsed.configOverride,
      });
    } else {
      runtimeResult = await runStructuredWithRuntime({
        requestId: options?.requestId,
        feature: getRuntimeFeature(parsed.feature),
        systemPrompt: resolveSystemPrompt(parsed.feature, config.prompts, parsed.configOverride),
        userInput: prompt,
        schemaLabel: getSchemaLabel(parsed.feature),
        schemaHint: getSchemaHint(parsed.feature),
        outputSchema: QuoteRecommendationPayloadSchema,
        fallbackReasonPrefix: 'PromptTest:',
        fallback: () => deterministicQuoteFallback(parsed),
        configOverride: parsed.configOverride,
      });
    }

    return {
      feature: parsed.feature,
      source: runtimeResult.source,
      provider: runtimeResult.provider,
      model: runtimeResult.model,
      fallbackUsed: runtimeResult.fallbackUsed,
      schemaValid: runtimeResult.schemaValid,
      parsed: runtimeResult.data,
      parseIssues: runtimeResult.parseIssues,
      rawOutput:
        runtimeResult.rawOutput ?? JSON.stringify(runtimeResult.data ?? {}, null, 2),
      latencyMs: runtimeResult.processingMs,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Prompt test runtime failed unexpectedly.';
    if (message.toLowerCase().includes('strict env check')) {
      throw new PromptTestConfigError(message);
    }
    if (
      message.includes('OpenAI request failed') ||
      message.toLowerCase().includes('timed out')
    ) {
      throw new PromptTestUpstreamError(message);
    }
    throw error;
  }
}
