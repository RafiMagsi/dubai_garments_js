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