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
