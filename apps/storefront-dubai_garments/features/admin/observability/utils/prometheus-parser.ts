type MetricPoint = {
  name: string;
  labels: Record<string, string>;
  value: number;
};

function parseLabels(serialized?: string): Record<string, string> {
  if (!serialized) return {};
  const output: Record<string, string> = {};
  const raw = serialized.trim().replace(/^\{/, '').replace(/\}$/, '');
  if (!raw) return output;

  const parts = raw.match(/(?:[^,"]+="(?:\\.|[^"])*")/g) || [];
  for (const part of parts) {
    const eqIndex = part.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = part.slice(0, eqIndex).trim();
    const quoted = part.slice(eqIndex + 1).trim();
    const value = quoted.replace(/^"/, '').replace(/"$/, '').replace(/\\"/g, '"');
    output[key] = value;
  }
  return output;
}

function parsePrometheusText(input: string): MetricPoint[] {
  const rows: MetricPoint[] = [];
  const lines = input.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{[^}]*\})?\s+(.+)$/);
    if (!match) continue;
    const value = Number(match[3]);
    if (!Number.isFinite(value)) continue;
    rows.push({
      name: match[1],
      labels: parseLabels(match[2]),
      value,
    });
  }
  return rows;
}

function sumMetric(
  rows: MetricPoint[],
  name: string,
  matcher?: (labels: Record<string, string>) => boolean
): number {
  return rows
    .filter((row) => row.name === name && (matcher ? matcher(row.labels) : true))
    .reduce((sum, row) => sum + row.value, 0);
}

function toStatusCode(labels: Record<string, string>) {
  const raw = labels.status || labels.code || '';
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function weightedStorefrontLatency(rows: MetricPoint[]) {
  const pathLatency = new Map<string, number>();
  for (const row of rows) {
    if (row.name !== 'storefront_api_request_duration_ms_avg') continue;
    const path = row.labels.path || '';
    pathLatency.set(path, row.value);
  }

  let weightedSum = 0;
  let totalCount = 0;
  for (const row of rows) {
    if (row.name !== 'storefront_api_requests_total') continue;
    const path = row.labels.path || '';
    const avg = pathLatency.get(path);
    if (!Number.isFinite(avg)) continue;
    weightedSum += (avg || 0) * row.value;
    totalCount += row.value;
  }

  if (totalCount <= 0) return 0;
  return weightedSum / totalCount;
}

export type CombinedObservabilityMetrics = {
  totalRequests: number;
  totalErrors: number;
  averageLatencyMs: number;
  fastApiTotalRequests: number;
  storefrontTotalRequests: number;
};

export function computeCombinedMetrics(input: {
  fastApiMetricsText: string;
  storefrontMetricsText: string;
}): CombinedObservabilityMetrics {
  const fastApiRows = parsePrometheusText(input.fastApiMetricsText);
  const storefrontRows = parsePrometheusText(input.storefrontMetricsText);

  const fastApiTotalRequests = sumMetric(fastApiRows, 'fastapi_http_requests_total');
  const fastApiErrors = sumMetric(
    fastApiRows,
    'fastapi_http_requests_total',
    (labels) => toStatusCode(labels) >= 400
  );

  const fastApiDurationSum = sumMetric(fastApiRows, 'fastapi_http_request_duration_seconds_sum');
  const fastApiDurationCount = sumMetric(fastApiRows, 'fastapi_http_request_duration_seconds_count');
  const fastApiLatencyMs =
    fastApiDurationCount > 0 ? (fastApiDurationSum / fastApiDurationCount) * 1000 : 0;

  const storefrontTotalRequests = sumMetric(storefrontRows, 'storefront_api_requests_total');
  const storefrontErrors = sumMetric(
    storefrontRows,
    'storefront_api_requests_total',
    (labels) => toStatusCode(labels) >= 400
  );
  const storefrontLatencyMs = weightedStorefrontLatency(storefrontRows);

  const totalRequests = fastApiTotalRequests + storefrontTotalRequests;
  const totalErrors = fastApiErrors + storefrontErrors;

  let averageLatencyMs = 0;
  if (totalRequests > 0) {
    averageLatencyMs =
      (fastApiLatencyMs * fastApiTotalRequests + storefrontLatencyMs * storefrontTotalRequests) /
      totalRequests;
  } else {
    averageLatencyMs = fastApiLatencyMs || storefrontLatencyMs || 0;
  }

  return {
    totalRequests,
    totalErrors,
    averageLatencyMs,
    fastApiTotalRequests,
    storefrontTotalRequests,
  };
}
