export type AutomationRunStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled' | string;

export interface AutomationRun {
  id: string;
  workflow_name: string;
  trigger_source: string;
  trigger_entity_type?: string | null;
  trigger_entity_id?: string | null;
  status: AutomationRunStatus;
  request_payload: Record<string, unknown>;
  response_payload: Record<string, unknown>;
  error_message?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  created_at: string;
  updated_at: string;
  retryable?: boolean;
}

export interface AutomationRunsResponse {
  items: AutomationRun[];
}

export interface AutomationRunDetailResponse {
  item: AutomationRun;
}

export interface RetryAutomationRunResponse {
  ok: boolean;
  message: string;
  retryRunId?: string;
  jobId?: string;
  result?: Record<string, unknown>;
}

