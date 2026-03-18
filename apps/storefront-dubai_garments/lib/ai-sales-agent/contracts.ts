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
  data: ReplyStudioDraftSchema,
  requestId: z.string().nullable(),
});

export type ReplyStudioMode = z.infer<typeof ReplyStudioModeSchema>;
export type ReplyStudioTone = z.infer<typeof ReplyStudioToneSchema>;
export type ReplyStudioRequest = z.infer<typeof ReplyStudioRequestSchema>;
export type ReplyStudioDraft = z.infer<typeof ReplyStudioDraftSchema>;
export type ReplyStudioResponse = z.infer<typeof ReplyStudioResponseSchema>;