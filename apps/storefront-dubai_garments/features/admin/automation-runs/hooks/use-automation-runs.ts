import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAutomationRunById,
  getAutomationRuns,
  retryAutomationRun,
} from '@/features/admin/automation-runs/services/automation-run-service';

export function useAutomationRuns(filters?: {
  workflow_name?: string;
  status?: string;
  failed_only?: boolean;
  search?: string;
}) {
  return useQuery({
    queryKey: ['automation-runs', filters],
    queryFn: () => getAutomationRuns(filters),
    refetchInterval: 5000,
    staleTime: 0,
  });
}

export function useAutomationRunById(runId?: string) {
  return useQuery({
    queryKey: ['automation-run', runId],
    queryFn: () => getAutomationRunById(runId as string),
    enabled: Boolean(runId),
  });
}

export function useRetryAutomationRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (runId: string) => retryAutomationRun(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-runs'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

