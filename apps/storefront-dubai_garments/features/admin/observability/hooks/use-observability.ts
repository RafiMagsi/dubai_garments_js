import { useMutation, useQuery } from '@tanstack/react-query';
import {
  getObservabilityChecks,
  getObservabilityScrape,
  getObservabilityTargets,
} from '@/features/admin/observability/services/observability-service';

export function useObservabilityTargets() {
  return useQuery({
    queryKey: ['admin-observability-targets'],
    queryFn: getObservabilityTargets,
    staleTime: 60_000,
  });
}

export function useObservabilityChecks() {
  return useQuery({
    queryKey: ['admin-observability-checks'],
    queryFn: getObservabilityChecks,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useObservabilityScrape() {
  return useMutation({
    mutationFn: (target: string) => getObservabilityScrape(target),
  });
}
