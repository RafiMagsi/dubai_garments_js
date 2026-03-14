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

function TrendBars({ values, colorClass }: { values: number[]; colorClass: string }) {
  const MAX_BARS = 32;
  const visibleValues = values.slice(-MAX_BARS);
  const max = Math.max(1, ...visibleValues);

  return (
    <div className="mt-2 relative w-full max-w-full min-w-0 overflow-hidden">
      <div className="w-full max-w-full min-w-0 overflow-hidden rounded-md border border-[var(--color-border)] px-2 py-1 bg-[var(--color-surface-soft)]">
        <div className="flex h-10 w-full items-end justify-end gap-1">
          {visibleValues.map((value, index) => (
            <span
              key={`${colorClass}-${index}`}
              className={`h-10 flex-1 rounded-sm ${colorClass} transition-all duration-200`}
              style={{ height: `${Math.max(6, (value / max) * 100)}%` }}
            />
          ))}
        </div>
      </div>
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
      <article className="dg-card dg-kpi-card min-w-0 overflow-hidden">
        <p className="dg-kpi-label">Traffic (RED)</p>
        <p className="dg-kpi-value">{requestRateRps.toFixed(2)} rps</p>
        <p className="dg-kpi-meta">Rolling request rate</p>
        <TrendBars values={trafficTrend} colorClass="bg-blue-500" />
      </article>
      <article className="dg-card dg-kpi-card min-w-0 overflow-hidden">
        <p className="dg-kpi-label">Errors (RED)</p>
        <p className="dg-kpi-value">{errorRatePercent.toFixed(2)}%</p>
        <p className="dg-kpi-meta">Requests with 4xx/5xx status</p>
        <TrendBars values={errorTrend} colorClass="bg-rose-500" />
      </article>
      <article className="dg-card dg-kpi-card min-w-0 overflow-hidden">
        <p className="dg-kpi-label">Duration (RED)</p>
        <p className="dg-kpi-value">{avgLatencyMs.toFixed(0)}ms</p>
        <p className="dg-kpi-meta">Weighted avg latency</p>
        <TrendBars values={latencyTrend} colorClass="bg-amber-500" />
      </article>
      <article className="dg-card dg-kpi-card min-w-0 overflow-hidden">
        <p className="dg-kpi-label">Availability</p>
        <p className="dg-kpi-value">{availabilityPercent.toFixed(1)}%</p>
        <p className="dg-kpi-meta">Live dependency health window</p>
        <TrendBars values={availabilityTrend} colorClass="bg-emerald-500" />
      </article>
      <article className="dg-card dg-kpi-card min-w-0 overflow-hidden">
        <p className="dg-kpi-label">Saturation Proxy</p>
        <p className="dg-kpi-value">{saturationPercent.toFixed(1)}%</p>
        <p className="dg-kpi-meta">Slow/failed dependency checks</p>
      </article>
    </div>
  );
}
