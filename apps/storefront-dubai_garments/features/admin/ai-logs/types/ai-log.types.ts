export type AiLogStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled' | string;

export interface AiLogItem {
  id: string;
  source_service: string;
  workflow_name: string;
  provider?: string | null;
  model?: string | null;
  trigger_entity_type?: string | null;
  trigger_entity_id?: string | null;
  status: AiLogStatus;
  fallback_used: boolean;
  input_payload: Record<string, unknown>;
  output_payload: Record<string, unknown>;
  error_message?: string | null;
  latency_ms?: number | null;
  created_at: string;
  updated_at: string;
}

export interface AiLogsResponse {
  items: AiLogItem[];
}

export interface AiLogDetailResponse {
  item: AiLogItem;
}
