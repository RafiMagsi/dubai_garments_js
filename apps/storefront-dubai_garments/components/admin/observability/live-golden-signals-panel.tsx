type LiveGoldenSignalsPanelProps = {
  requestRateRps: number;
  errorRatePercent: number;
  avgLatencyMs: number;
  availabilityPercent: number;
  saturationPercent: number;
  trafficTrend: number[];
  errorTrend: number[];
  latencyTrend: number[];
  availabilityTrend: number[];
};

function renderTrend(values: number[], colorClass: string) {
  const max = Math.max(1, ...values);
  return (
    <div className="mt-2 flex h-10 items-end gap-1">
      {values.map((value, index) => (
        <span
          key={`${colorClass}-${index}`}
          className={`w-1.5 rounded-sm ${colorClass}`}
          style={{ height: `${Math.max(6, (value / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

export default function LiveGoldenSignalsPanel({
  requestRateRps,
  errorRatePercent,
  avgLatencyMs,
  availabilityPercent,
  saturationPercent,
  trafficTrend,
  errorTrend,
  latencyTrend,
  availabilityTrend,
}: LiveGoldenSignalsPanelProps) {
  return (
    <div className="dg-kpi-grid">
      <article className="dg-card dg-kpi-card">
        <p className="dg-kpi-label">Traffic (RED)</p>
        <p className="dg-kpi-value">{requestRateRps.toFixed(2)} rps</p>
        <p className="dg-kpi-meta">Rolling request rate</p>
        {renderTrend(trafficTrend, 'bg-blue-500')}
      </article>
      <article className="dg-card dg-kpi-card">
        <p className="dg-kpi-label">Errors (RED)</p>
        <p className="dg-kpi-value">{errorRatePercent.toFixed(2)}%</p>
        <p className="dg-kpi-meta">Requests with 4xx/5xx status</p>
        {renderTrend(errorTrend, 'bg-rose-500')}
      </article>
      <article className="dg-card dg-kpi-card">
        <p className="dg-kpi-label">Duration (RED)</p>
        <p className="dg-kpi-value">{avgLatencyMs.toFixed(0)}ms</p>
        <p className="dg-kpi-meta">Weighted avg latency</p>
        {renderTrend(latencyTrend, 'bg-amber-500')}
      </article>
      <article className="dg-card dg-kpi-card">
        <p className="dg-kpi-label">Availability</p>
        <p className="dg-kpi-value">{availabilityPercent.toFixed(1)}%</p>
        <p className="dg-kpi-meta">Live dependency health window</p>
        {renderTrend(availabilityTrend, 'bg-emerald-500')}
      </article>
      <article className="dg-card dg-kpi-card">
        <p className="dg-kpi-label">Saturation Proxy</p>
        <p className="dg-kpi-value">{saturationPercent.toFixed(1)}%</p>
        <p className="dg-kpi-meta">Slow/failed dependency checks</p>
      </article>
    </div>
  );
}
