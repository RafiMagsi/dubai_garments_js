export type ActivityType =
  | 'lead_created'
  | 'lead_updated'
  | 'lead_status_changed'
  | 'ai_processed_lead'
  | 'ai_lead_triage'
  | 'quote_generated'
  | 'email_sent'
  | 'followup_triggered'
  | 'customer_replied'
  | 'deal_created'
  | 'deal_stage_changed'
  | 'ai_copilot_action'
  | 'ai_lead_intelligence_action'
  | 'ai_pipeline_insight'
  | 'ai_pipeline_insight_execution'
  | 'ai_smart_routing_sla'
  | 'ai_automation_rerun'
  | 'ai_automation_template_toggle';

export interface Activity {
  id: string;
  user_id?: string | null;
  customer_id?: string | null;
  lead_id?: string | null;
  deal_id?: string | null;
  quote_id?: string | null;
  activity_type: ActivityType;
  title: string;
  details?: string | null;
  metadata?: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
  updated_at?: string;
}

export interface ActivitiesResponse {
  items: Activity[];
}

export interface ActivityDetailResponse {
  item: Activity;
}
