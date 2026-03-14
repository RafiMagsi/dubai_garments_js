import { useQuery } from '@tanstack/react-query';
import { getAiLogById, getAiLogs } from '@/features/admin/ai-logs/services/ai-log-service';

export function useAiLogs(filters?: {
  workflow_name?: string;
  provider?: string;
  status?: string;
  trigger_entity_type?: string;
  trigger_entity_id?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['ai-logs', filters],
    queryFn: () => getAiLogs(filters),
    refetchInterval: 5000,
    staleTime: 0,
  });
}

export function useAiLogById(logId?: string) {
  return useQuery({
    queryKey: ['ai-log', logId],
    queryFn: () => getAiLogById(logId as string),
    enabled: Boolean(logId),
  });
}
