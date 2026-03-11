export interface ObservabilityTargetItem {
  key: string;
  label: string;
  url: string;
}

export interface ObservabilityTargetsResponse {
  items: ObservabilityTargetItem[];
}

export interface ObservabilityCheckItem {
  key: string;
  kind: string;
  url: string;
  ok: boolean;
  status: number;
  durationMs: number;
  detail: string;
}

export interface ObservabilityChecksSummary {
  healthy: number;
  failed: number;
  total: number;
}

export interface ObservabilityChecksResponse {
  generatedAt: number;
  overallOk: boolean;
  summary: ObservabilityChecksSummary;
  items: ObservabilityCheckItem[];
}

export interface ObservabilityScrapeResponse {
  ok: boolean;
  target: string;
  url: string;
  status: number;
  durationMs: number;
  preview: string;
}

export interface ObservabilityHistorySample {
  id: number;
  sampledAt: string;
  healthyChecks: number;
  failedChecks: number;
  totalChecks: number;
  availabilityPercent: number;
  saturationPercent: number;
  requestRateRps: number;
  errorRatePercent: number;
  avgLatencyMs: number;
  fastapiTotalRequests: number;
  storefrontTotalRequests: number;
}

export interface ObservabilityHistoryResponse {
  generatedAt: number;
  summary: {
    count: number;
    limit: number;
    hours: number;
  };
  items: ObservabilityHistorySample[];
}
