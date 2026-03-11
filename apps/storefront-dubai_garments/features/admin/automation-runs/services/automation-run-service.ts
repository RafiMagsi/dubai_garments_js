import { apiClient } from '@/lib/api/axios';
import {
  AutomationRunDetailResponse,
  AutomationRunsResponse,
  RetryAutomationRunResponse,
} from '@/features/admin/automation-runs/types/automation-run.types';

export async function getAutomationRuns(filters?: {
  workflow_name?: string;
  status?: string;
  failed_only?: boolean;
  search?: string;
}): Promise<AutomationRunsResponse> {
  const response = await apiClient.get<AutomationRunsResponse>('/admin/automation-runs', {
    params: {
      workflow_name: filters?.workflow_name || undefined,
      status: filters?.status || undefined,
      failed_only: filters?.failed_only ? true : undefined,
      search: filters?.search || undefined,
    },
  });
  return response.data;
}

export async function getAutomationRunById(runId: string): Promise<AutomationRunDetailResponse> {
  const response = await apiClient.get<AutomationRunDetailResponse>(`/admin/automation-runs/${runId}`);
  return response.data;
}

export async function retryAutomationRun(runId: string): Promise<RetryAutomationRunResponse> {
  const response = await apiClient.post<RetryAutomationRunResponse>(
    `/admin/automation-runs/${runId}/retry`
  );
  return response.data;
}

