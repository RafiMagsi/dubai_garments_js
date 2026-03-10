import { apiClient } from '@/lib/api/axios';
import {
  Lead,
  LeadCreateInput,
  LeadDetailResponse,
  LeadSendEmailInput,
  LeadsResponse,
  LeadStatus,
  LeadStatusUpdateInput,
  LeadUpdateInput,
} from '@/features/admin/leads/types/lead.types';

export async function getLeads(filters?: {
  status?: LeadStatus | 'all';
  search?: string;
}): Promise<LeadsResponse> {
  const response = await apiClient.get<LeadsResponse>('/admin/leads', {
    params: {
      status: filters?.status && filters.status !== 'all' ? filters.status : undefined,
      search: filters?.search || undefined,
    },
  });
  return response.data;
}

export async function getLeadById(leadId: string): Promise<LeadDetailResponse> {
  const response = await apiClient.get<LeadDetailResponse>(`/admin/leads/${leadId}`);
  return response.data;
}

export async function createLead(payload: LeadCreateInput): Promise<Lead> {
  const response = await apiClient.post<{ item: Lead }>('/admin/leads', payload);
  return response.data.item;
}

export async function updateLead(leadId: string, payload: LeadUpdateInput): Promise<Lead> {
  const response = await apiClient.patch<{ item: Lead }>(`/admin/leads/${leadId}`, payload);
  return response.data.item;
}

export async function updateLeadStatus(
  leadId: string,
  payload: LeadStatusUpdateInput
): Promise<Lead> {
  const response = await apiClient.patch<{ item: Lead }>(
    `/admin/leads/${leadId}/status`,
    payload
  );
  return response.data.item;
}

export async function sendLeadEmail(
  leadId: string,
  payload: LeadSendEmailInput
): Promise<{ ok: boolean; message: string }> {
  const response = await apiClient.post<{ ok: boolean; message: string }>(
    `/admin/leads/${leadId}/send-email`,
    payload
  );
  return response.data;
}
