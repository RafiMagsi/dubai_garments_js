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
  AutomationRunDetailEnvelope,
  SmartRoutingSlaEnvelope,
  AutomationRunRerunEnvelope,
  AutomationTemplateLibraryEnvelope,
  AutomationTemplateToggleEnvelope,
  AiModelConfig,
  AiModelSecretsUpdate,
  AiModelConfigEnvelope,
  AiModelConfigUpdateEnvelope,
  AiPromptTestEnvelope,
  AiPromptTestRequest,
  AiImpactKpiEnvelope,
  FlowOrchestrationEnvelope,
  FlowOrchestrationRequest,
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

export async function orchestrateAgentFlow(
  input: FlowOrchestrationRequest
): Promise<FlowOrchestrationEnvelope> {
  const response = await fetch('/api/admin/ai-sales-agent/flow/orchestrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    credentials: 'include',
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || 'Failed to orchestrate lead-to-close flow.');
  }

  return json as FlowOrchestrationEnvelope;
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

export async function getAutomationRunDetails(input: {
  page?: number;
  pageSize?: number;
  workflowName?: string;
  status?: 'success' | 'failed' | 'pending';
}): Promise<AutomationRunDetailEnvelope> {
  const response = await fetch('/api/admin/ai-sales-agent/automation-runs/detail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    credentials: 'include',
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || 'Failed to load automation run details.');
  }

  return json as AutomationRunDetailEnvelope;
}

export async function runSmartRoutingSla(input: {
  leadId?: string;
  dealId?: string;
  dry_run?: boolean;
}): Promise<SmartRoutingSlaEnvelope> {
  const response = await fetch('/api/admin/ai-sales-agent/smart-routing-sla', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    credentials: 'include',
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || 'Failed to run smart routing + SLA.');
  }

  return json as SmartRoutingSlaEnvelope;
}

export async function rerunAutomationRun(input: {
  runId: string;
  note?: string;
  dry_run?: boolean;
}): Promise<AutomationRunRerunEnvelope> {
  const response = await fetch('/api/admin/ai-sales-agent/automation-runs/rerun', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    credentials: 'include',
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || 'Failed to rerun automation run.');
  }

  return json as AutomationRunRerunEnvelope;
}

export async function getAutomationTemplateLibrary(): Promise<AutomationTemplateLibraryEnvelope> {
  const response = await fetch('/api/admin/ai-sales-agent/automation-templates', {
    method: 'GET',
    credentials: 'include',
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || 'Failed to load automation template library.');
  }

  return json as AutomationTemplateLibraryEnvelope;
}

export async function toggleAutomationTemplate(input: {
  key: string;
  enabled: boolean;
}): Promise<AutomationTemplateToggleEnvelope> {
  const response = await fetch('/api/admin/ai-sales-agent/automation-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    credentials: 'include',
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || 'Failed to update automation template.');
  }

  return json as AutomationTemplateToggleEnvelope;
}

export async function getAiModelConfig(): Promise<AiModelConfigEnvelope> {
  const response = await fetch('/api/admin/ai-sales-agent/model-config', {
    method: 'GET',
    credentials: 'include',
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || 'Failed to load model settings.');
  }

  return json as AiModelConfigEnvelope;
}

export async function updateAiModelConfig(
  input: AiModelConfig,
  secrets?: AiModelSecretsUpdate
): Promise<AiModelConfigUpdateEnvelope> {
  const response = await fetch('/api/admin/ai-sales-agent/model-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config: input, secrets }),
    credentials: 'include',
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || 'Failed to save model settings.');
  }

  return json as AiModelConfigUpdateEnvelope;
}

export async function runAiPromptTest(
  input: AiPromptTestRequest
): Promise<AiPromptTestEnvelope> {
  const response = await fetch('/api/admin/ai-sales-agent/model-config/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    credentials: 'include',
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || 'Failed to run prompt test.');
  }

  return json as AiPromptTestEnvelope;
}

export async function getAiImpactKpis(): Promise<AiImpactKpiEnvelope> {
  const response = await fetch('/api/admin/ai-sales-agent/impact-kpis', {
    method: 'GET',
    credentials: 'include',
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || 'Failed to load AI impact KPIs.');
  }

  return json as AiImpactKpiEnvelope;
}
