import { apiClient } from '@/lib/api/axios';
import {
  AdminQuoteCreateInput,
  AdminQuote,
  AdminQuoteDetailResponse,
  AdminQuotePdfStatusResponse,
  AdminQuoteStatusUpdateInput,
  AdminQuotesResponse,
} from '@/features/admin/quotes/types/quote.types';

export async function getQuotes(filters?: {
  status?: string;
  search?: string;
}): Promise<AdminQuotesResponse> {
  const response = await apiClient.get<AdminQuotesResponse>('/admin/quotes', {
    params: {
      status: filters?.status || undefined,
      search: filters?.search || undefined,
    },
  });
  return response.data;
}

export async function getQuoteById(quoteId: string): Promise<AdminQuoteDetailResponse> {
  const response = await apiClient.get<AdminQuoteDetailResponse>(`/admin/quotes/${quoteId}`);
  return response.data;
}

export async function createQuote(payload: AdminQuoteCreateInput): Promise<AdminQuote> {
  const response = await apiClient.post<{ item: AdminQuote }>('/admin/quotes', payload);
  return response.data.item;
}

export async function updateQuoteStatus(
  quoteId: string,
  payload: AdminQuoteStatusUpdateInput
): Promise<AdminQuote> {
  const response = await apiClient.post<{ item: AdminQuote }>(
    `/admin/quotes/${quoteId}/status`,
    payload
  );
  return response.data.item;
}

export async function generateQuotePdf(quoteId: string): Promise<{ ok: boolean; jobId?: string | null; message?: string }> {
  const response = await apiClient.post<{ ok: boolean; jobId?: string | null; message?: string }>(
    `/admin/quotes/${quoteId}/pdf/generate`
  );
  return response.data;
}

export async function getQuotePdfStatus(quoteId: string): Promise<AdminQuotePdfStatusResponse> {
  const response = await apiClient.get<AdminQuotePdfStatusResponse>(`/admin/quotes/${quoteId}/pdf`);
  return response.data;
}
