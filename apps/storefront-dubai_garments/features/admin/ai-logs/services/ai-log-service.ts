import { apiClient } from '@/lib/api/axios';
import {
  AiLogDetailResponse,
  AiLogsResponse,
} from '@/features/admin/ai-logs/types/ai-log.types';

export async function getAiLogs(filters?: {
  workflow_name?: string;
  provider?: string;
  status?: string;
  trigger_entity_type?: string;
  trigger_entity_id?: string;
  search?: string;
}): Promise<AiLogsResponse> {
  const response = await apiClient.get<AiLogsResponse>('/admin/ai-logs', {
    params: {
      workflow_name: filters?.workflow_name || undefined,
      provider: filters?.provider || undefined,
      status: filters?.status || undefined,
      trigger_entity_type: filters?.trigger_entity_type || undefined,
      trigger_entity_id: filters?.trigger_entity_id || undefined,
      search: filters?.search || undefined,
    },
  });
  return response.data;
}

export async function getAiLogById(logId: string): Promise<AiLogDetailResponse> {
  const response = await apiClient.get<AiLogDetailResponse>(`/admin/ai-logs/${logId}`);
  return response.data;
}
