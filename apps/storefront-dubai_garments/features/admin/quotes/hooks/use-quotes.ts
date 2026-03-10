import { useQuery } from '@tanstack/react-query';
import { getQuotes } from '@/features/admin/quotes/services/quote-service';

export function useQuotes(filters?: { status?: string; search?: string }) {
  return useQuery({
    queryKey: ['quotes', filters],
    queryFn: () => getQuotes(filters),
  });
}
