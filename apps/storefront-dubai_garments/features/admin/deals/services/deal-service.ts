import { apiClient } from '@/lib/api/axios';
import {
  ConvertLeadToDealInput,
  Deal,
  DealCreateInput,
  DealDetailResponse,
  DealSendEmailInput,
  DealsResponse,
  DealUpdateInput,
  DealStageUpdateInput,
  PipelineResponse,
} from '@/features/admin/deals/types/deal.types';

export async function getPipeline(): Promise<PipelineResponse> {
  const response = await apiClient.get<PipelineResponse>('/admin/pipeline');
  return response.data;
}

export async function getDeals(filters?: { stage?: string; search?: string }): Promise<DealsResponse> {
  const response = await apiClient.get<DealsResponse>('/admin/deals', {
    params: {
      stage: filters?.stage || undefined,
      search: filters?.search || undefined,
    },
  });
  return response.data;
}

export async function getDealById(dealId: string): Promise<DealDetailResponse> {
  const response = await apiClient.get<DealDetailResponse>(`/admin/deals/${dealId}`);
  return response.data;
}

export async function createDeal(payload: DealCreateInput): Promise<Deal> {
  const response = await apiClient.post<{ item: Deal }>('/admin/deals', payload);
  return response.data.item;
}

export async function updateDealStage(dealId: string, payload: DealStageUpdateInput): Promise<Deal> {
  const response = await apiClient.post<{ item: Deal }>(`/admin/deals/${dealId}/stage`, payload);
  return response.data.item;
}

export async function updateDeal(dealId: string, payload: DealUpdateInput): Promise<Deal> {
  const response = await apiClient.patch<{ item: Deal }>(`/admin/deals/${dealId}`, payload);
  return response.data.item;
}

export async function convertLeadToDeal(
  leadId: string,
  payload: ConvertLeadToDealInput
): Promise<Deal> {
  const response = await apiClient.post<{ item: Deal }>(
    `/admin/leads/${leadId}/convert-to-deal`,
    payload
  );
  return response.data.item;
}

export async function sendDealEmail(
  dealId: string,
  payload: DealSendEmailInput
): Promise<{ ok: boolean; message: string }> {
  const response = await apiClient.post<{ ok: boolean; message: string }>(
    `/admin/deals/${dealId}/send-email`,
    payload
  );
  return response.data;
}
