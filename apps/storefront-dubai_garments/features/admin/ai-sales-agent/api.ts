import type {
  CopilotEnvelope,
  CopilotExecuteRequest,
  CopilotRequest,
} from './types';

export async function queryCopilot(input: CopilotRequest): Promise<CopilotEnvelope> {
  const response = await fetch('/api/admin/ai-sales-agent/copilot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    credentials: 'include',
  });

  const json = (await response.json()) as CopilotEnvelope;

  if (!response.ok) {
    throw new Error(json.message || 'Failed to query copilot.');
  }

  return json;
}

export async function executeCopilot(input: CopilotExecuteRequest): Promise<CopilotEnvelope> {
  const response = await fetch('/api/admin/ai-sales-agent/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    credentials: 'include',
  });

  const json = (await response.json()) as CopilotEnvelope;

  if (!response.ok) {
    throw new Error(json.message || 'Failed to execute copilot action.');
  }

  return json;
}