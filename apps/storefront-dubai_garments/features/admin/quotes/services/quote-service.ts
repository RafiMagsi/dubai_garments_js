import { apiClient } from '@/lib/api/axios';
import {
  AdminQuote,
  AdminQuoteDetailResponse,
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
