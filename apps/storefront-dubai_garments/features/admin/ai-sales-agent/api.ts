import type {
  AiSalesAgentEnvelope,
  LeadTriageEnvelope,
  CopilotExecuteRequest,
  CopilotRequest,
  ReplyStudioRequest,
  ReplyStudioEnvelope,
  QuoteCopilotEnvelope,
  QuoteRecommendationEnvelope,
  PipelineInsightEnvelope,
  PipelineInsightExecuteEnvelope,
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

export async function runReplyStudio(input: ReplyStudioRequest): Promise<ReplyStudioEnvelope> {
  const response = await fetch('/api/admin/ai-sales-agent/reply-studio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    credentials: 'include',
  });

  const json: unknown = await response.json();

  if (!response.ok) {
    const message =
      typeof json === 'object' &&
      json !== null &&
      'message' in json &&
      typeof (json as { message?: unknown }).message === 'string'
        ? (json as { message: string }).message
        : 'Failed to run Reply Studio.';

    throw new Error(message);
  }

  return json as ReplyStudioEnvelope;
}

export async function approveAndSendReplyStudio(input: {
  leadId: string;
  subject?: string | null;
  message: string;
  channel?: 'email' | 'whatsapp';
}) {
  const response = await fetch('/api/admin/ai-sales-agent/reply-studio', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    credentials: 'include',
  });

  const json = (await response.json()) as any;

  if (!response.ok) {
    throw new Error(json.message || 'Failed to approve and send reply.');
  }

  return json;
}

export async function runQuoteRecommendation(input: {
  leadId: string;
  dealId?: string;
  quoteId?: string;
  dry_run?: boolean;
}): Promise<QuoteRecommendationEnvelope> {
  const response = await fetch('/api/admin/ai-sales-agent/quote-recommendation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    credentials: 'include',
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || 'Failed to run quote recommendation.');
  }

  return json as QuoteRecommendationEnvelope;
}

export async function runQuoteCopilot(input: {
  leadId: string;
  dealId?: string;
  quoteId?: string;
  acceptedRecommendations: Array<{
    productId: string | null;
    productName: string;
    suggestedQuantity: number | null;
    suggestedVariant: string | null;
  }>;
  dry_run?: boolean;
}): Promise<QuoteCopilotEnvelope> {
  const response = await fetch('/api/admin/ai-sales-agent/quote-copilot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    credentials: 'include',
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || 'Failed to run quote copilot.');
  }

  return json as QuoteCopilotEnvelope;
}

export async function runPipelineInsights(input: {
  leadId?: string;
  dealId?: string;
  dry_run?: boolean;
}): Promise<PipelineInsightEnvelope> {
  const response = await fetch('/api/admin/ai-sales-agent/pipeline-insights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    credentials: 'include',
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || 'Failed to run pipeline insights.');
  }

  return json as PipelineInsightEnvelope;
}

export async function executePipelineInsightAction(input: {
  action: 'draft_followup' | 'assign_owner' | 'move_stage_suggestion';
  leadId?: string;
  dealId?: string;
  payload?: {
    ownerUserId?: string;
    suggestedStage?: string;
    note?: string;
  };
  dry_run?: boolean;
}): Promise<PipelineInsightExecuteEnvelope> {
  const response = await fetch('/api/admin/ai-sales-agent/pipeline-insights/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    credentials: 'include',
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || 'Failed to execute pipeline insight action.');
  }

  return json as PipelineInsightExecuteEnvelope;
}