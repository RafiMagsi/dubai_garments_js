export type CopilotIntent = 'followups_today' | 'draft_reply' | 'at_risk_deals';
export type CopilotAction = 'draft_reply' | 'schedule_followup' | 'mark_deal_at_risk';

export type CopilotRequest = {
  intent: CopilotIntent;
  leadId?: string;
  dealId?: string;
  channel?: 'email' | 'whatsapp';
  context?: {
    tone?: 'professional' | 'friendly' | 'persuasive';
    userNotes?: string;
  };
};

export type CopilotExecuteRequest = {
  action: CopilotAction;
  leadId?: string;
  dealId?: string;
  channel?: 'email' | 'whatsapp';
  dry_run?: boolean;
  payload?: {
    tone?: 'professional' | 'friendly' | 'persuasive';
    userNotes?: string;
    followupDate?: string;
    reason?: string;
  };
};

export type CopilotEnvelope = {
  ok: boolean;
  intent?: CopilotIntent;
  action?: CopilotAction;
  source?: 'model' | 'fallback';
  schemaValid?: boolean;
  dryRun?: boolean;
  executed?: boolean;
  data?: unknown;
  result?: Record<string, unknown>;
  fallbackReason?: string | null;
  auditId?: string | null;
  requestId?: string | null;
  message?: string;
};

export type LeadTriageOutput = {
  summary: string;
  intent:
    | 'quotation_request'
    | 'product_inquiry'
    | 'bulk_order'
    | 'followup_request'
    | 'general_sales'
    | 'unknown';
  urgency: 'high' | 'medium' | 'low';
  complexity: 'high' | 'medium' | 'low';
  quantity: number | null;
  confidence: number;
  score: number;
  classification: 'hot' | 'warm' | 'cold';
  nextBestAction: string;
};

export type LeadTriageEnvelope = {
  ok: boolean;
  dryRun: boolean;
  source: 'model' | 'fallback';
  persisted: boolean;
  leadId: string;
  data: LeadTriageOutput;
  requestId?: string | null;
  message?: string;
};

export type AiSalesAgentEnvelope = CopilotEnvelope | LeadTriageEnvelope;
