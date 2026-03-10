import { apiClient } from '@/lib/api/axios';
import { AdminQuotesResponse } from '@/features/admin/quotes/types/quote.types';

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
