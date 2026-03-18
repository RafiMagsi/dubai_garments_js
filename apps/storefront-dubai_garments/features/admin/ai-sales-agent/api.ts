import type {
  AiSalesAgentEnvelope,
  LeadTriageEnvelope,
  CopilotExecuteRequest,
  CopilotRequest,
} from './types';

export async function queryCopilot(input: CopilotRequest): Promise<AiSalesAgentEnvelope> {
  const response = await fetch('/api/admin/ai-sales-agent/copilot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    credentials: 'include',
  });

  const json = (await response.json()) as AiSalesAgentEnvelope;

  if (!response.ok) {
    throw new Error(json.message || 'Failed to query copilot.');
  }

  return json;
}

export async function executeCopilot(input: CopilotExecuteRequest): Promise<AiSalesAgentEnvelope> {
  const response = await fetch('/api/admin/ai-sales-agent/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    credentials: 'include',
  });

  const json = (await response.json()) as AiSalesAgentEnvelope;

  if (!response.ok) {
    throw new Error(json.message || 'Failed to execute copilot action.');
  }

  return json;
}

export async function runLeadTriage(
  input: { leadId: string; dry_run?: boolean }
): Promise<LeadTriageEnvelope> {
  const response = await fetch('/api/admin/ai-sales-agent/triage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    credentials: 'include',
  });

  const json = (await response.json()) as LeadTriageEnvelope;

  if (!response.ok) {
    throw new Error(json.message || 'Failed to run lead triage.');
  }

  return json;
}


export async function draftReplyFromLeadIntelligence(input: {
  leadId: string;
  tone?: 'professional' | 'friendly' | 'persuasive';
  channel?: 'email' | 'whatsapp';
}) {
  return queryCopilot({
    intent: 'draft_reply',
    leadId: input.leadId,
    channel: input.channel ?? 'email',
    context: {
      tone: input.tone ?? 'professional',
      userNotes: 'Draft a first response from lead intelligence context.',
    },
  });
}

export async function convertLeadFromIntelligence(leadId: string) {
  const response = await fetch(`/api/admin/leads/${leadId}/convert-to-deal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
    credentials: 'include',
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || 'Failed to convert lead to deal.');
  }

  return json;
}

export async function prioritizeLeadFromIntelligence(leadId: string) {
  const response = await fetch(`/api/admin/leads/${leadId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'qualified',
    }),
    credentials: 'include',
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || 'Failed to prioritize lead.');
  }

  return json;
}

export async function writeLeadIntelligenceAudit(input: {
  leadId: string;
  action: 'draft_reply' | 'convert' | 'prioritize';
  outcome: 'success' | 'failure';
  details?: string;
  metadata?: Record<string, unknown>;
}) {
  const response = await fetch(`/api/admin/leads/${input.leadId}/ai-action-audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    credentials: 'include',
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || 'Failed to write AI audit event.');
  }

  return json;
}

export async function getAgentFlow(input: { leadId?: string; dealId?: string }) {
  const response = await fetch('/api/admin/ai-sales-agent/flow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    credentials: 'include',
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || 'Failed to load agent flow.');
  }

  return json;
}