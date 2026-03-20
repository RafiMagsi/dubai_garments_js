export type AiFeatureRoutingKey =
  | 'copilot_followups_today'
  | 'copilot_draft_reply'
  | 'copilot_at_risk_deals'
  | 'lead_triage'
  | 'reply_studio'
  | 'quote_recommendation'
  | 'quote_copilot_summary'
  | 'pipeline_insights'
  | 'smart_routing_sla';

export const AI_FEATURE_ROUTING: Record<
  AiFeatureRoutingKey,
  { label: string; llmEnabled: boolean }
> = {
  copilot_followups_today: { label: 'Follow-ups Today', llmEnabled: false },
  copilot_draft_reply: { label: 'Draft Reply (Copilot)', llmEnabled: true },
  copilot_at_risk_deals: { label: 'At-Risk Deals', llmEnabled: false },
  lead_triage: { label: 'Lead Triage', llmEnabled: false },
  reply_studio: { label: 'Reply Studio', llmEnabled: true },
  quote_recommendation: { label: 'Quote Recommendation', llmEnabled: false },
  quote_copilot_summary: { label: 'Quote Copilot Summary', llmEnabled: true },
  pipeline_insights: { label: 'Pipeline Insights', llmEnabled: false },
  smart_routing_sla: { label: 'Smart Routing + SLA', llmEnabled: false },
};

export function isFeatureLlmEnabled(feature: AiFeatureRoutingKey) {
  return AI_FEATURE_ROUTING[feature].llmEnabled;
}

