import type { AiModelConfig } from '@/lib/ai-sales-agent/contracts';

export type AiFeatureRoutingKey =
  | 'copilot_followups_today'
  | 'copilot_draft_reply'
  | 'copilot_at_risk_deals'
  | 'lead_triage'
  | 'reply_studio'
  | 'quote_recommendation'
  | 'quote_copilot_summary'
  | 'pipeline_insights'
  | 'smart_routing_sla'
  | 'fastapi_lead_ai'
  | 'fastapi_email_draft';

export const AI_FEATURE_ROUTING: Record<
  AiFeatureRoutingKey,
  { label: string; llmEnabled: boolean; flagKey: keyof AiModelConfig['featureFlags'] }
> = {
  copilot_followups_today: { label: 'Follow-ups Today', llmEnabled: false, flagKey: 'copilot' },
  copilot_draft_reply: { label: 'Draft Reply (Copilot)', llmEnabled: true, flagKey: 'copilot' },
  copilot_at_risk_deals: { label: 'At-Risk Deals', llmEnabled: false, flagKey: 'copilot' },
  lead_triage: { label: 'Lead Triage', llmEnabled: false, flagKey: 'triage' },
  reply_studio: { label: 'Reply Studio', llmEnabled: true, flagKey: 'replyStudio' },
  quote_recommendation: { label: 'Quote Recommendation', llmEnabled: true, flagKey: 'quote' },
  quote_copilot_summary: { label: 'Quote Copilot Summary', llmEnabled: true, flagKey: 'quote' },
  pipeline_insights: { label: 'Pipeline Insights', llmEnabled: true, flagKey: 'pipeline' },
  smart_routing_sla: { label: 'Smart Routing + SLA', llmEnabled: true, flagKey: 'smartRoutingSla' },
  fastapi_lead_ai: { label: 'Lead AI (FastAPI)', llmEnabled: true, flagKey: 'fastapiLeadAi' },
  fastapi_email_draft: { label: 'Email Draft (FastAPI)', llmEnabled: true, flagKey: 'fastapiEmailDraft' },
};

export function isFeatureLlmEnabled(feature: AiFeatureRoutingKey) {
  return AI_FEATURE_ROUTING[feature].llmEnabled;
}

export function isFeatureLlmEnabledByConfig(
  feature: AiFeatureRoutingKey,
  config: AiModelConfig
) {
  const route = AI_FEATURE_ROUTING[feature];
  if (!route.llmEnabled) return false;
  return Boolean(config.featureFlags[route.flagKey]);
}
