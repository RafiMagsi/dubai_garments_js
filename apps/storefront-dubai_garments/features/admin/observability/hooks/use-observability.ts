import { useMutation, useQuery } from '@tanstack/react-query';
import {
  getObservabilityCoreMetrics,
  getObservabilityChecks,
  getObservabilityHistory,
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

export function useObservabilityChecks(options?: { live?: boolean; refreshMs?: number }) {
  const live = options?.live ?? true;
  const refreshMs = options?.refreshMs ?? 10_000;

  return useQuery({
    queryKey: ['admin-observability-checks'],
    queryFn: getObservabilityChecks,
    refetchInterval: live ? refreshMs : false,
    refetchIntervalInBackground: live,
    staleTime: live ? 0 : 15_000,
  });
}

export function useObservabilityScrape() {
  return useMutation({
    mutationFn: (target: string) => getObservabilityScrape(target),
  });
}

export function useObservabilityCoreMetrics(options?: { live?: boolean; refreshMs?: number }) {
  const live = options?.live ?? true;
  const refreshMs = options?.refreshMs ?? 10_000;
  return useQuery({
    queryKey: ['admin-observability-core-metrics'],
    queryFn: getObservabilityCoreMetrics,
    refetchInterval: live ? refreshMs : false,
    refetchIntervalInBackground: live,
    staleTime: live ? 0 : 15_000,
  });
}

export function useObservabilityHistory(options?: {
  live?: boolean;
  refreshMs?: number;
  limit?: number;
  hours?: number;
}) {
  const live = options?.live ?? true;
  const refreshMs = options?.refreshMs ?? 10_000;
  const limit = options?.limit ?? 240;
  const hours = options?.hours ?? 24;
  return useQuery({
    queryKey: ['admin-observability-history', limit, hours],
    queryFn: () => getObservabilityHistory({ limit, hours }),
    refetchInterval: live ? refreshMs : false,
    refetchIntervalInBackground: live,
    staleTime: live ? 0 : 15_000,
  });
}
