import { apiClient } from '@/lib/api/axios';
import {
  ObservabilityChecksResponse,
  ObservabilityHistoryResponse,
  ObservabilityScrapeResponse,
  ObservabilityTargetsResponse,
} from '@/features/admin/observability/types/observability.types';

export async function getObservabilityTargets(): Promise<ObservabilityTargetsResponse> {
  const response = await apiClient.get<ObservabilityTargetsResponse>('/admin/observability');
  return response.data;
}

export async function getObservabilityChecks(): Promise<ObservabilityChecksResponse> {
  const response = await apiClient.get<ObservabilityChecksResponse>('/admin/observability', {
    params: { mode: 'checks' },
  });
  return response.data;
}

export async function getObservabilityScrape(target: string): Promise<ObservabilityScrapeResponse> {
  const response = await apiClient.get<ObservabilityScrapeResponse>('/admin/observability', {
    params: { mode: 'scrape', target },
  });
  return response.data;
}

export async function getObservabilityCoreMetrics(): Promise<{
  fastapi: ObservabilityScrapeResponse;
  storefront: ObservabilityScrapeResponse;
}> {
  const [fastapi, storefront] = await Promise.all([
    getObservabilityScrape('fastapi_metrics'),
    getObservabilityScrape('storefront_metrics'),
  ]);
  return { fastapi, storefront };
}

export async function getObservabilityHistory(params?: {
  limit?: number;
  hours?: number;
}): Promise<ObservabilityHistoryResponse> {
  const response = await apiClient.get<ObservabilityHistoryResponse>('/admin/observability', {
    params: {
      mode: 'history',
      limit: params?.limit ?? 240,
      hours: params?.hours ?? 24,
    },
  });
  return response.data;
}
