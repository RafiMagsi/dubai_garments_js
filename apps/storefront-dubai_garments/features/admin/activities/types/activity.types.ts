export type ActivityType =
  | 'lead_created'
  | 'lead_updated'
  | 'lead_status_changed'
  | 'ai_processed_lead'
  | 'quote_generated'
  | 'email_sent'
  | 'followup_triggered'
  | 'customer_replied'
  | 'deal_created'
  | 'deal_stage_changed'
  | 'ai_copilot_action';

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
