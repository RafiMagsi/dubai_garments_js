import { z } from 'zod';

export const CopilotIntentSchema = z.enum([
  'followups_today',
  'draft_reply',
  'at_risk_deals',
]);

export const CopilotRequestSchema = z.object({
  intent: CopilotIntentSchema,
  leadId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  channel: z.enum(['email', 'whatsapp']).optional(),
  context: z
    .object({
      tone: z.enum(['professional', 'friendly', 'persuasive']).optional(),
      userNotes: z.string().max(2000).optional(),
    })
    .optional(),
});

export const FollowupsTodayItemSchema = z.object({
  type: z.enum(['lead', 'deal', 'quote']),
  id: z.string(),
  title: z.string(),
  reason: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  suggestedAction: z.string(),
});

export const FollowupsTodayResponseSchema = z.object({
  summary: z.string(),
  items: z.array(FollowupsTodayItemSchema),
});

export const DraftReplyResponseSchema = z.object({
  channel: z.enum(['email', 'whatsapp']),
  subject: z.string().optional(),
  message: z.string(),
  rationale: z.string(),
  suggestedNextAction: z.string(),
});

export const AtRiskDealItemSchema = z.object({
  id: z.string(),
  stage: z.string(),
  riskReason: z.string(),
  suggestedAction: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
});

export const AtRiskDealsResponseSchema = z.object({
  summary: z.string(),
  deals: z.array(AtRiskDealItemSchema),
});

export const CopilotSuccessEnvelopeSchema = z.object({
  ok: z.literal(true),
  intent: CopilotIntentSchema,
  source: z.enum(['model', 'fallback']),
  schemaValid: z.boolean(),
  data: z.union([
    FollowupsTodayResponseSchema,
    DraftReplyResponseSchema,
    AtRiskDealsResponseSchema,
  ]),
  fallbackReason: z.string().nullable(),
  requestId: z.string().nullable(),
});

export type CopilotIntent = z.infer<typeof CopilotIntentSchema>;
export type CopilotRequest = z.infer<typeof CopilotRequestSchema>;
export type FollowupsTodayResponse = z.infer<typeof FollowupsTodayResponseSchema>;
export type DraftReplyResponse = z.infer<typeof DraftReplyResponseSchema>;
export type AtRiskDealsResponse = z.infer<typeof AtRiskDealsResponseSchema>;


export const CopilotActionSchema = z.enum([
  'draft_reply',
  'schedule_followup',
  'mark_deal_at_risk',
]);

export const CopilotExecuteRequestSchema = z.object({
  action: CopilotActionSchema,
  leadId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  channel: z.enum(['email', 'whatsapp']).optional(),
  dry_run: z.boolean().optional().default(false),
  payload: z
    .object({
      tone: z.enum(['professional', 'friendly', 'persuasive']).optional(),
      userNotes: z.string().max(2000).optional(),
      followupDate: z.string().optional(),
      reason: z.string().max(1000).optional(),
    })
    .optional(),
});

export const CopilotExecuteSuccessSchema = z.object({
  ok: z.literal(true),
  action: CopilotActionSchema,
  dryRun: z.boolean(),
  executed: z.boolean(),
  result: z.record(z.string(), z.any()),
  auditId: z.string().nullable(),
  requestId: z.string().nullable(),
});

export type CopilotAction = z.infer<typeof CopilotActionSchema>;
export type CopilotExecuteRequest = z.infer<typeof CopilotExecuteRequestSchema>;

export const LeadTriageRequestSchema = z.object({
  leadId: z.string().uuid(),
  dry_run: z.boolean().optional().default(false),
});

export const LeadIntentSchema = z.enum([
  'quotation_request',
  'product_inquiry',
  'bulk_order',
  'followup_request',
  'general_sales',
  'unknown',
]);

export const LeadUrgencySchema = z.enum(['high', 'medium', 'low']);
export const LeadComplexitySchema = z.enum(['high', 'medium', 'low']);
export const LeadClassificationSchema = z.enum(['hot', 'warm', 'cold']);

export const LeadTriageOutputSchema = z.object({
  summary: z.string(),
  intent: LeadIntentSchema,
  urgency: LeadUrgencySchema,
  complexity: LeadComplexitySchema,
  quantity: z.number().nullable(),
  confidence: z.number().min(0).max(100),
  score: z.number().min(0).max(100),
  classification: LeadClassificationSchema,
  nextBestAction: z.string(),
});

export const LeadTriageResponseSchema = z.object({
  ok: z.literal(true),
  dryRun: z.boolean(),
  source: z.enum(['model', 'fallback']),
  persisted: z.boolean(),
  leadId: z.string(),
  data: LeadTriageOutputSchema,
  requestId: z.string().nullable(),
});

export type LeadTriageRequest = z.infer<typeof LeadTriageRequestSchema>;
export type LeadTriageOutput = z.infer<typeof LeadTriageOutputSchema>;
export type LeadTriageResponse = z.infer<typeof LeadTriageResponseSchema>;

export const ReplyStudioModeSchema = z.enum([
  'first_reply',
  'followup_reply',
  'clarification_questions',
]);

export const ReplyStudioToneSchema = z.enum([
  'concise',
  'formal',
  'persuasive',
]);

export const ReplyStudioRequestSchema = z.object({
  leadId: z.string().uuid(),
  dealId: z.string().uuid().optional(),
  quoteId: z.string().uuid().optional(),
  mode: ReplyStudioModeSchema,
  tone: ReplyStudioToneSchema.optional().default('formal'),
  channel: z.enum(['email', 'whatsapp']).optional().default('email'),
  userNotes: z.string().max(2000).optional(),
  dry_run: z.boolean().optional().default(false),
});

export const ReplyStudioDraftSchema = z.object({
  mode: ReplyStudioModeSchema,
  tone: ReplyStudioToneSchema,
  channel: z.enum(['email', 'whatsapp']),
  subject: z.string().nullable(),
  message: z.string(),
  rationale: z.string(),
  suggestedNextAction: z.string(),
  confidence: z.number().min(0).max(100),
  questions: z.array(z.string()).default([]),
});

export const ReplyStudioResponseSchema = z.object({
  ok: z.literal(true),
  leadId: z.string(),
  source: z.enum(['model', 'fallback']),
  provider: z.string(),
  fallbackUsed: z.boolean(),
  failureReason: z.string().nullable(),
  dryRun: z.boolean(),
  processingMs: z.number().optional(),
  data: ReplyStudioDraftSchema,
  requestId: z.string().nullable(),
});

export type ReplyStudioMode = z.infer<typeof ReplyStudioModeSchema>;
export type ReplyStudioTone = z.infer<typeof ReplyStudioToneSchema>;
export type ReplyStudioRequest = z.infer<typeof ReplyStudioRequestSchema>;
export type ReplyStudioDraft = z.infer<typeof ReplyStudioDraftSchema>;
export type ReplyStudioResponse = z.infer<typeof ReplyStudioResponseSchema>;

export const QuoteRecommendationRequestSchema = z.object({
  leadId: z.string().uuid(),
  dealId: z.string().uuid().optional(),
  quoteId: z.string().uuid().optional(),
  dry_run: z.boolean().optional().default(false),
});

export const QuoteRecommendationProductSchema = z.object({
  productId: z.string().uuid().nullable(),
  productName: z.string(),
  suggestedQuantity: z.number().nullable(),
  suggestedVariant: z.string().nullable(),
  rationale: z.string(),
});

export const QuoteRecommendationMissingFieldSchema = z.object({
  field: z.string(),
  reason: z.string(),
});

export const QuoteRecommendationPayloadSchema = z.object({
  summary: z.string(),
  recommendations: z.array(QuoteRecommendationProductSchema),
  missingData: z.array(QuoteRecommendationMissingFieldSchema),
  canCreateQuote: z.boolean(),
  suggestedNextAction: z.string(),
  confidence: z.number().min(0).max(100),
});

export const QuoteRecommendationResponseSchema = z.object({
  ok: z.literal(true),
  leadId: z.string(),
  dealId: z.string().nullable(),
  quoteId: z.string().nullable(),
  source: z.enum(['model', 'fallback']),
  provider: z.string(),
  fallbackUsed: z.boolean(),
  failureReason: z.string().nullable(),
  dryRun: z.boolean(),
  processingMs: z.number().optional(),
  data: QuoteRecommendationPayloadSchema,
  requestId: z.string().nullable(),
});

export type QuoteRecommendationRequest = z.infer<typeof QuoteRecommendationRequestSchema>;
export type QuoteRecommendationPayload = z.infer<typeof QuoteRecommendationPayloadSchema>;
export type QuoteRecommendationResponse = z.infer<typeof QuoteRecommendationResponseSchema>;

export const QuoteCopilotAcceptedItemSchema = z.object({
  productId: z.string().uuid().nullable(),
  productName: z.string(),
  suggestedQuantity: z.number().nullable(),
  suggestedVariant: z.string().nullable(),
});

export const QuoteCopilotRequestSchema = z.object({
  leadId: z.string().uuid(),
  dealId: z.string().uuid().optional(),
  quoteId: z.string().uuid().optional(),
  acceptedRecommendations: z.array(QuoteCopilotAcceptedItemSchema).default([]),
  dry_run: z.boolean().optional().default(false),
});

export const QuoteCopilotSummarySchema = z.object({
  summaryTitle: z.string(),
  summaryText: z.string(),
  acceptedCount: z.number(),
  acceptedItems: z.array(z.string()),
  generationMode: z.enum(['selected_recommendations', 'lead_context_only']),
  canProceed: z.boolean(),
  suggestedNextAction: z.string(),
});

export const QuoteCopilotMarginSafetySchema = z.object({
  status: z.enum(['safe', 'watch', 'risk']),
  estimatedGrossMarginPct: z.number().nullable(),
  guidance: z.string(),
});

export const QuoteCopilotDiscountGuidanceSchema = z.object({
  requestedDiscountPct: z.number().nullable(),
  suggestedDiscountPct: z.number().nullable(),
  maxSafeDiscountPct: z.number().nullable(),
  reason: z.string(),
});

export const QuoteCopilotUpsellSchema = z.object({
  title: z.string(),
  type: z.enum(['upsell', 'cross_sell']),
  rationale: z.string(),
});

export const QuoteCopilotResponseSchema = z.object({
  ok: z.literal(true),
  leadId: z.string(),
  dealId: z.string().nullable(),
  quoteId: z.string().nullable(),
  source: z.enum(['model', 'fallback']),
  provider: z.string(),
  fallbackUsed: z.boolean(),
  failureReason: z.string().nullable(),
  dryRun: z.boolean(),
  data: z.object({
    summary: QuoteCopilotSummarySchema,
    upsellSuggestions: z.array(QuoteCopilotUpsellSchema),
    quoteIntelligence: z.object({
      estimatedSubtotalAED: z.number().nullable(),
      marginSafety: QuoteCopilotMarginSafetySchema,
      discountGuidance: QuoteCopilotDiscountGuidanceSchema,
      pricingRiskHints: z.array(z.string()),
    }),
  }),
  processingMs: z.number().optional(),
  requestId: z.string().nullable(),
});

export type QuoteCopilotRequest = z.infer<typeof QuoteCopilotRequestSchema>;
export type QuoteCopilotResponse = z.infer<typeof QuoteCopilotResponseSchema>;

export const PipelineInsightRequestSchema = z.object({
  leadId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  dry_run: z.boolean().optional().default(true),
});

export const PipelineInsightReasonSchema = z.object({
  label: z.string(),
  impact: z.enum(['low', 'medium', 'high']),
});

export const PipelineInsightQueueItemSchema = z.object({
  title: z.string(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  reason: z.string(),
});

export const PipelineInsightPayloadSchema = z.object({
  summary: z.string(),
  stalled: z.boolean(),
  stageAgeDays: z.number(),
  inactivityDays: z.number(),
  riskScore: z.number().min(0).max(100),
  riskReasons: z.array(PipelineInsightReasonSchema),
  urgencyQueue: z.array(PipelineInsightQueueItemSchema),
  nextAction: z.string(),
});

export const PipelineInsightResponseSchema = z.object({
  ok: z.literal(true),
  leadId: z.string().nullable(),
  dealId: z.string().nullable(),
  source: z.enum(['model', 'fallback']),
  provider: z.string(),
  fallbackUsed: z.boolean(),
  failureReason: z.string().nullable(),
  dryRun: z.boolean(),
  data: PipelineInsightPayloadSchema,
  processingMs: z.number().optional(),
  requestId: z.string().nullable(),
});

export type PipelineInsightRequest = z.infer<typeof PipelineInsightRequestSchema>;
export type PipelineInsightResponse = z.infer<typeof PipelineInsightResponseSchema>;

export const PipelineInsightExecuteActionSchema = z.enum([
  'draft_followup',
  'assign_owner',
  'move_stage_suggestion',
]);

export const PipelineInsightExecuteRequestSchema = z.object({
  action: PipelineInsightExecuteActionSchema,
  leadId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  payload: z
    .object({
      ownerUserId: z.string().uuid().optional(),
      suggestedStage: z.string().optional(),
      note: z.string().optional(),
    })
    .optional()
    .default({}),
  dry_run: z.boolean().optional().default(true),
});

export const PipelineInsightExecuteResponseSchema = z.object({
  ok: z.literal(true),
  action: PipelineInsightExecuteActionSchema,
  leadId: z.string().nullable(),
  dealId: z.string().nullable(),
  dryRun: z.boolean(),
  outcome: z.string(),
  requestId: z.string().nullable(),
});

export type PipelineInsightExecuteRequest = z.infer<
  typeof PipelineInsightExecuteRequestSchema
>;
export type PipelineInsightExecuteResponse = z.infer<
  typeof PipelineInsightExecuteResponseSchema
>;

export const AutomationRunDetailRequestSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  pageSize: z.number().int().min(1).max(50).optional().default(10),
  workflowName: z.string().optional(),
  status: z.enum(['success', 'failed', 'pending']).optional(),
});

export const AutomationRunDetailItemSchema = z.object({
  id: z.string(),
  workflowName: z.string(),
  status: z.enum(['success', 'failed', 'pending']),
  triggerSource: z.string().nullable(),
  inputSummary: z.string(),
  outputSummary: z.string(),
  failureMetadata: z.string().nullable(),
  createdAt: z.string(),
});

export const AutomationRunDetailResponseSchema = z.object({
  ok: z.literal(true),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  items: z.array(AutomationRunDetailItemSchema),
  processingMs: z.number().optional(),
  requestId: z.string().nullable(),
});

export const SmartRoutingSlaRequestSchema = z.object({
  leadId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  dry_run: z.boolean().optional().default(true),
});

export const SmartRoutingSlaResponseSchema = z.object({
  ok: z.literal(true),
  leadId: z.string().nullable(),
  dealId: z.string().nullable(),
  source: z.enum(['model', 'fallback']),
  provider: z.string(),
  fallbackUsed: z.boolean(),
  failureReason: z.string().nullable(),
  dryRun: z.boolean(),
  data: z.object({
    recommendedOwner: z.string().nullable(),
    routingReason: z.string(),
    slaBucket: z.enum(['on_track', 'at_risk', 'breached']),
    slaReason: z.string(),
    recommendedAction: z.string(),
  }),
  processingMs: z.number().optional(),
  requestId: z.string().nullable(),
});

export type AutomationRunDetailRequest = z.infer<typeof AutomationRunDetailRequestSchema>;
export type AutomationRunDetailResponse = z.infer<typeof AutomationRunDetailResponseSchema>;
export type SmartRoutingSlaRequest = z.infer<typeof SmartRoutingSlaRequestSchema>;
export type SmartRoutingSlaResponse = z.infer<typeof SmartRoutingSlaResponseSchema>;

export const AutomationRunRerunRequestSchema = z.object({
  runId: z.string(),
  note: z.string().optional(),
  dry_run: z.boolean().optional().default(true),
});

export const AutomationRunRerunResponseSchema = z.object({
  ok: z.literal(true),
  runId: z.string(),
  dryRun: z.boolean(),
  guardrailPassed: z.boolean(),
  outcome: z.string(),
  requestId: z.string().nullable(),
});

export const AutomationTemplateLibraryResponseSchema = z.object({
  ok: z.literal(true),
  templates: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      category: z.string(),
      description: z.string(),
      inputs: z.array(z.string()),
      outputs: z.array(z.string()),
      guardrails: z.array(z.string()),
      enabled: z.boolean(),
    })
  ),
  requestId: z.string().nullable(),
});

export const AutomationTemplateToggleRequestSchema = z.object({
  key: z.string().min(1),
  enabled: z.boolean(),
});

export const AutomationTemplateToggleResponseSchema = z.object({
  ok: z.literal(true),
  key: z.string(),
  enabled: z.boolean(),
  requestId: z.string().nullable(),
});

export type AutomationRunRerunRequest = z.infer<typeof AutomationRunRerunRequestSchema>;
export type AutomationRunRerunResponse = z.infer<typeof AutomationRunRerunResponseSchema>;
export type AutomationTemplateLibraryResponse = z.infer<typeof AutomationTemplateLibraryResponseSchema>;
export type AutomationTemplateToggleRequest = z.infer<typeof AutomationTemplateToggleRequestSchema>;
export type AutomationTemplateToggleResponse = z.infer<typeof AutomationTemplateToggleResponseSchema>;

export const AiModelProviderSchema = z.enum(['openai', 'deterministic']);
export const AiModelStylePresetSchema = z.enum(['balanced', 'concise', 'persuasive']);
export const AiRuntimeModeSchema = z.enum(['auto', 'llm_only', 'fallback_only']);

export const AiModelConfigSchema = z.object({
  runtimeMode: AiRuntimeModeSchema.default('auto'),
  provider: AiModelProviderSchema.default('deterministic'),
  model: z.string().min(1).max(120).default('gpt-4o-mini'),
  fallbackEnabled: z.boolean().default(true),
  fallbackProvider: AiModelProviderSchema.default('deterministic'),
  fallbackModel: z.string().min(1).max(120).default('gpt-4o-mini'),
  stylePreset: AiModelStylePresetSchema.default('balanced'),
  temperature: z.number().min(0).max(1.5).default(0.2),
  maxOutputTokens: z.number().int().min(128).max(8192).default(1200),
  requestTimeoutMs: z.number().int().min(1000).max(120000).default(15000),
  maxRetries: z.number().int().min(0).max(5).default(1),
  retryBackoffMs: z.number().int().min(100).max(10000).default(750),
  featureFlags: z
    .object({
      copilot: z.boolean().default(true),
      triage: z.boolean().default(true),
      replyStudio: z.boolean().default(true),
      quote: z.boolean().default(true),
      pipeline: z.boolean().default(true),
      smartRoutingSla: z.boolean().default(true),
      fastapiLeadAi: z.boolean().default(true),
      fastapiEmailDraft: z.boolean().default(true),
    })
    .default({
      copilot: true,
      triage: true,
      replyStudio: true,
      quote: true,
      pipeline: true,
      smartRoutingSla: true,
      fastapiLeadAi: true,
      fastapiEmailDraft: true,
    }),
  prompts: z
    .object({
      copilotSystem: z.string().min(1).max(8000).default('You are an AI sales copilot.'),
      replyStudioSystem: z
        .string()
        .min(1)
        .max(8000)
        .default('Generate concise and professional sales replies.'),
      quoteCopilotSystem: z
        .string()
        .min(1)
        .max(8000)
        .default('Generate quote guidance with margin-safe recommendations.'),
    })
    .default({
      copilotSystem: 'You are an AI sales copilot.',
      replyStudioSystem: 'Generate concise and professional sales replies.',
      quoteCopilotSystem: 'Generate quote guidance with margin-safe recommendations.',
    }),
});

export const AiModelConfigResponseSchema = z.object({
  ok: z.literal(true),
  config: AiModelConfigSchema,
  providerChecks: z.array(
    z.object({
      provider: AiModelProviderSchema,
      requiredKey: z.string(),
      present: z.boolean(),
      source: z.enum(['env', 'db', 'missing']),
      message: z.string(),
    })
  ),
  strictEnvChecksPassed: z.boolean(),
  requestId: z.string().nullable(),
});

export const AiModelSecretsUpdateSchema = z.object({
  openaiApiKey: z.string().min(1).max(512).optional(),
});

export const AiModelConfigUpdateRequestSchema = z.union([
  z.object({
    config: AiModelConfigSchema,
    secrets: AiModelSecretsUpdateSchema.optional(),
  }).strict(),
  AiModelConfigSchema,
]);
export const AiModelConfigUpdateResponseSchema = z.object({
  ok: z.literal(true),
  config: AiModelConfigSchema,
  strictEnvChecksPassed: z.boolean(),
  requestId: z.string().nullable(),
});

export const AiPromptTestFeatureSchema = z.enum([
  'copilot',
  'reply_studio',
  'quote_copilot',
]);

export const AiPromptTestRequestSchema = z.object({
  feature: AiPromptTestFeatureSchema,
  input: z.string().min(1).max(4000),
  context: z
    .object({
      leadId: z.string().uuid().optional(),
      dealId: z.string().uuid().optional(),
      channel: z.enum(['email', 'whatsapp']).optional(),
      tone: z.enum(['professional', 'friendly', 'persuasive']).optional(),
    })
    .optional(),
  configOverride: z
    .object({
      runtimeMode: AiRuntimeModeSchema.optional(),
      provider: AiModelProviderSchema.optional(),
      model: z.string().min(1).max(120).optional(),
      fallbackEnabled: z.boolean().optional(),
      fallbackProvider: AiModelProviderSchema.optional(),
      fallbackModel: z.string().min(1).max(120).optional(),
      stylePreset: AiModelStylePresetSchema.optional(),
      temperature: z.number().min(0).max(1.5).optional(),
      maxOutputTokens: z.number().int().min(128).max(8192).optional(),
      requestTimeoutMs: z.number().int().min(1000).max(120000).optional(),
      maxRetries: z.number().int().min(0).max(5).optional(),
      retryBackoffMs: z.number().int().min(100).max(10000).optional(),
      prompts: z
        .object({
          copilotSystem: z.string().min(1).max(8000).optional(),
          replyStudioSystem: z.string().min(1).max(8000).optional(),
          quoteCopilotSystem: z.string().min(1).max(8000).optional(),
        })
        .optional(),
    })
    .optional(),
});

export const AiPromptTestResponseSchema = z.object({
  ok: z.literal(true),
  feature: AiPromptTestFeatureSchema,
  source: z.enum(['model', 'fallback']),
  provider: z.string(),
  model: z.string(),
  fallbackUsed: z.boolean(),
  schemaValid: z.boolean(),
  parsed: z.unknown().nullable(),
  parseIssues: z.array(z.string()),
  rawOutput: z.string(),
  latencyMs: z.number(),
  requestId: z.string().nullable(),
});

export const AiImpactMetricSchema = z.object({
  value: z.number(),
  today: z.number(),
  last7d: z.number(),
  denominator7d: z.number(),
  deltaPct: z.number(),
});

export const AiImpactKpiResponseSchema = z.object({
  ok: z.literal(true),
  generatedAt: z.string(),
  window: z.object({
    todayStart: z.string(),
    last7dStart: z.string(),
  }),
  timeSavedEstimate: AiImpactMetricSchema.extend({
    hoursSaved7d: z.number(),
  }),
  suggestionsAccepted: AiImpactMetricSchema.extend({
    acceptanceRate7d: z.number(),
  }),
  riskAlertsResolved: AiImpactMetricSchema.extend({
    resolutionRate7d: z.number(),
  }),
  requestId: z.string().nullable(),
});

export type AiModelProvider = z.infer<typeof AiModelProviderSchema>;
export type AiModelStylePreset = z.infer<typeof AiModelStylePresetSchema>;
export type AiRuntimeMode = z.infer<typeof AiRuntimeModeSchema>;
export type AiModelConfig = z.infer<typeof AiModelConfigSchema>;
export type AiModelConfigResponse = z.infer<typeof AiModelConfigResponseSchema>;
export type AiModelConfigUpdateRequest = z.infer<typeof AiModelConfigUpdateRequestSchema>;
export type AiModelConfigUpdateResponse = z.infer<typeof AiModelConfigUpdateResponseSchema>;
export type AiModelSecretsUpdate = z.infer<typeof AiModelSecretsUpdateSchema>;
export type AiPromptTestFeature = z.infer<typeof AiPromptTestFeatureSchema>;
export type AiPromptTestRequest = z.infer<typeof AiPromptTestRequestSchema>;
export type AiPromptTestResponse = z.infer<typeof AiPromptTestResponseSchema>;
export type AiImpactKpiResponse = z.infer<typeof AiImpactKpiResponseSchema>;
