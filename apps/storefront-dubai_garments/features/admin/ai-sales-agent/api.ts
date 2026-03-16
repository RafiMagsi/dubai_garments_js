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
