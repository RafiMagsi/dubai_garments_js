import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createQuote,
  getQuoteById,
  getQuotes,
  updateQuoteStatus,
} from '@/features/admin/quotes/services/quote-service';
import {
  AdminQuoteCreateInput,
  AdminQuoteStatusUpdateInput,
} from '@/features/admin/quotes/types/quote.types';

export function useQuotes(filters?: { status?: string; search?: string }) {
  return useQuery({
    queryKey: ['quotes', filters],
    queryFn: () => getQuotes(filters),
  });
}

export function useQuoteById(quoteId?: string) {
  return useQuery({
    queryKey: ['quote', quoteId],
    queryFn: () => getQuoteById(quoteId as string),
    enabled: Boolean(quoteId),
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AdminQuoteCreateInput) => createQuote(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

export function useUpdateQuoteStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quoteId,
      payload,
    }: {
      quoteId: string;
      payload: AdminQuoteStatusUpdateInput;
    }) => updateQuoteStatus(quoteId, payload),
    onSuccess: (_, { quoteId }) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}
