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