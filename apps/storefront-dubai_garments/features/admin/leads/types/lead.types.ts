export type LeadStatus = 'new' | 'qualified' | 'quoted' | 'won' | 'lost';

export interface Lead {
  id: string;
  customer_id?: string | null;
  assigned_to_user_id?: string | null;
  source: string;
  status: LeadStatus;
  lead_score?: number | null;
  company_name?: string | null;
  contact_name: string;
  email?: string | null;
  phone?: string | null;
  requested_qty?: number | null;
  ai_product?: string | null;
  ai_quantity?: number | null;
  ai_urgency?: 'low' | 'medium' | 'high' | null;
  ai_complexity?: 'low' | 'medium' | 'high' | null;
  ai_provider?: 'system' | 'openai' | null;
  ai_fallback_used?: boolean | null;
  ai_processed_at?: string | null;
  budget?: number | null;
  timeline_date?: string | null;
  notes?: string | null;
  last_contacted_at?: string | null;
  created_at: string;
  updated_at: string;
  customer_company_name?: string | null;
}

export interface LeadActivity {
  id: string;
  activity_type: string;
  title: string;
  details?: string | null;
  metadata?: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
}

export interface LeadsResponse {
  items: Lead[];
}

export interface LeadDetailResponse {
  item: Lead;
  activities: LeadActivity[];
}

export interface LeadCreateInput {
  source?: string;
  status?: LeadStatus;
  lead_score?: number;
  company_name?: string;
  contact_name: string;
  email?: string;
  phone?: string;
  requested_qty?: number;
  budget?: number;
  timeline_date?: string;
  notes?: string;
}

export interface LeadUpdateInput {
  lead_score?: number;
  company_name?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  requested_qty?: number;
  budget?: number;
  timeline_date?: string;
  notes?: string;
}

export interface LeadStatusUpdateInput {
  status: LeadStatus;
  notes?: string;
}
