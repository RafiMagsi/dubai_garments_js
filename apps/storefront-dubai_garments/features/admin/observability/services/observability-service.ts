import { apiClient } from '@/lib/api/axios';
import {
  ObservabilityChecksResponse,
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
