type CounterKey = `${string}:${string}`;

const counters = new Map<CounterKey, number>();
const latencySums = new Map<string, number>();
const latencyCounts = new Map<string, number>();

function incrementCounter(name: string, labels: Record<string, string>) {
  const serialized = Object.entries(labels)
    .map(([key, value]) => `${key}=${value}`)
    .join(',');
  const key = `${name}:${serialized}` as CounterKey;
  counters.set(key, (counters.get(key) || 0) + 1);
}

export function observeApiRequest(path: string, status: number, durationMs: number) {
  const statusLabel = String(status);
  incrementCounter('storefront_api_requests_total', { path, status: statusLabel });
  latencySums.set(path, (latencySums.get(path) || 0) + durationMs);
  latencyCounts.set(path, (latencyCounts.get(path) || 0) + 1);
}

export function renderPrometheusMetrics() {
  const lines: string[] = [];
  lines.push('# HELP storefront_api_requests_total Total API requests processed by Storefront BFF.');
  lines.push('# TYPE storefront_api_requests_total counter');
  for (const [key, value] of counters.entries()) {
    const [, labels] = key.split(':');
    const formatted = labels
      .split(',')
      .filter(Boolean)
      .map((item) => {
        const [k, v] = item.split('=');
        return `${k}="${(v || '').replace(/"/g, '\\"')}"`;
      })
      .join(',');
    lines.push(`storefront_api_requests_total{${formatted}} ${value}`);
  }

  lines.push('# HELP storefront_api_request_duration_ms_avg Average API request duration by path.');
  lines.push('# TYPE storefront_api_request_duration_ms_avg gauge');
  for (const [path, sum] of latencySums.entries()) {
    const count = latencyCounts.get(path) || 1;
    lines.push(`storefront_api_request_duration_ms_avg{path="${path}"} ${(sum / count).toFixed(2)}`);
  }
  return `${lines.join('\n')}\n`;
}
