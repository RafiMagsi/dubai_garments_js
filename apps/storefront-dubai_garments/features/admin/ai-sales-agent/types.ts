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

export type AgentFlowStageKey =
  | 'lead_received'
  | 'ai_analysis'
  | 'qualification'
  | 'reply_prepared'
  | 'human_review'
  | 'quote_preparation'
  | 'quote_sent'
  | 'followup_automation'
  | 'negotiation'
  | 'decision'
  | 'post_outcome_intelligence';

export type AgentFlowStageStatus = 'completed' | 'active' | 'pending' | 'blocked';

export type AgentFlowStage = {
  key: AgentFlowStageKey;
  order: number;
  label: string;
  description: string;
  status: AgentFlowStageStatus;
  completed: boolean;
  evidence: string[];
  blockerReason?: string | null;
};

export type AgentFlowMarker = {
  type: 'ai_action' | 'automation_action' | 'human_checkpoint' | 'pending_approval';
  label: string;
  stageKey: AgentFlowStageKey;
  details: string;
};

export type AgentFlowResponse = {
  ok: true;
  leadId?: string | null;
  dealId?: string | null;
  quoteId?: string | null;
  stages: AgentFlowStage[];
  activeStageKey: AgentFlowStageKey;
  completionPercent: number;
  summary: string;
  blockers: string[];
  recommendedNextMove: string;
  markers: AgentFlowMarker[];
  humanCheckpoints: string[];
  pendingApprovals: string[];
  confidenceTrend: Array<{
    label: string;
    value: number;
  }>;
  riskHints: string[];
  requestId?: string | null;
};
