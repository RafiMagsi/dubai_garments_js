export type DealStage = 'new' | 'qualified' | 'quoted' | 'negotiation' | 'won' | 'lost';

export interface Deal {
  id: string;
  lead_id?: string | null;
  customer_id?: string | null;
  owner_user_id?: string | null;
  title: string;
  stage: DealStage;
  expected_value: number;
  probability_pct: number;
  expected_close_date?: string | null;
  won_at?: string | null;
  lost_reason?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  lead_contact_name?: string | null;
  lead_company_name?: string | null;
  lead_email?: string | null;
  lead_product_name?: string | null;
  lead_quantity?: number | null;
  customer_company_name?: string | null;
}

export interface DealCommunication {
  id: string;
  channel: string;
  direction: 'outbound' | 'inbound';
  subject?: string | null;
  message_text?: string | null;
  sent_at?: string | null;
  created_at: string;
}

export interface PipelineStage {
  stageKey: DealStage;
  stageLabel: string;
  count: number;
  items: Deal[];
}

export interface PipelineResponse {
  stages: PipelineStage[];
}

export interface DealsResponse {
  items: Deal[];
}

export interface DealDetailResponse {
  item: Deal;
  quotes: Array<{
    id: string;
    quote_number: string;
    status: string;
    currency: string;
    total_amount: number;
  }>;
  communications: DealCommunication[];
}

export interface DealCreateInput {
  lead_id?: string;
  customer_id?: string;
  owner_user_id?: string;
  title: string;
  stage?: DealStage;
  expected_value?: number;
  probability_pct?: number;
  expected_close_date?: string;
  notes?: string;
}

export interface DealStageUpdateInput {
  stage: DealStage;
  lost_reason?: string;
  notes?: string;
}

export interface DealUpdateInput {
  stage?: DealStage;
  owner_user_id?: string;
  expected_value?: number;
  probability_pct?: number;
  expected_close_date?: string;
  notes?: string;
}

export interface ConvertLeadToDealInput {
  title?: string;
  owner_user_id?: string;
  expected_value?: number;
  probability_pct?: number;
  expected_close_date?: string;
  notes?: string;
}

export interface DealSendEmailInput {
  recipient_email: string;
  subject: string;
  message: string;
}
