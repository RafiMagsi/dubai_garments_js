import { apiClient } from '@/lib/api/axios';
import {
  ConvertLeadToDealInput,
  Deal,
  DealCreateInput,
  DealsResponse,
  DealStageUpdateInput,
  PipelineResponse,
} from '@/features/admin/deals/types/deal.types';

export async function getPipeline(): Promise<PipelineResponse> {
  const response = await apiClient.get<PipelineResponse>('/admin/pipeline');
  return response.data;
}

export async function getDeals(stage?: string): Promise<DealsResponse> {
  const response = await apiClient.get<DealsResponse>('/admin/deals', {
    params: { stage },
  });
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
