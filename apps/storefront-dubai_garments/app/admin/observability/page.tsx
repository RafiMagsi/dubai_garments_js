'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import AdminPageHeader from '@/components/admin/common/page-header';
import EndpointPreviewsPanel from '@/components/admin/observability/endpoint-previews-panel';
import LiveGoldenSignalsPanel from '@/components/admin/observability/live-golden-signals-panel';
import ServiceChecksPanel from '@/components/admin/observability/service-checks-panel';
import {
  useObservabilityChecks,
  useObservabilityHistory,
  useObservabilityScrape,
  useObservabilityTargets,
} from '@/features/admin/observability';

export default function AdminObservabilityPage() {
  const targetsQuery = useObservabilityTargets();
  const scrapeMutation = useObservabilityScrape();
  const [liveEnabled, setLiveEnabled] = useState(true);
  const [refreshSeconds, setRefreshSeconds] = useState(10);
  const [nextRefreshIn, setNextRefreshIn] = useState(refreshSeconds);
  const checksQuery = useObservabilityChecks({
    live: liveEnabled,
    refreshMs: refreshSeconds * 1000,
  });
  const historyQuery = useObservabilityHistory({
    live: liveEnabled,
    refreshMs: refreshSeconds * 1000,
    limit: 360,
    hours: 24,
  });

  const [activeTarget, setActiveTarget] = useState<string | null>(null);
  const [previewResults, setPreviewResults] = useState<
    Record<string, { ok: boolean; status: number; durationMs: number; preview: string }>
  >({});

  const checks = checksQuery.data?.items ?? [];
  const summary = checksQuery.data?.summary;
  const historyDesc = historyQuery.data?.items ?? [];
  const historyAsc = [...historyDesc].reverse();
  const latestSample = historyDesc[0];

  const stats = {
    healthy: summary?.healthy ?? checks.filter((item) => item.ok).length,
    failed: summary?.failed ?? checks.filter((item) => !item.ok).length,
    total: summary?.total ?? checks.length,
  };

  const availabilityPercent =
    latestSample?.availabilityPercent ?? (stats.total > 0 ? (stats.healthy / stats.total) * 100 : 0);
  const saturationPercent =
    latestSample?.saturationPercent ??
    (stats.total > 0
      ? (checks.filter((item) => !item.ok || item.durationMs >= 500).length / stats.total) * 100
      : 0);

  const requestRateRps = latestSample?.requestRateRps ?? 0;
  const errorRatePercent = latestSample?.errorRatePercent ?? 0;
  const avgLatencyMs = latestSample?.avgLatencyMs ?? 0;

  const trafficTrend = useMemo(() => historyAsc.map((sample) => sample.requestRateRps), [historyAsc]);
  const errorTrend = useMemo(() => historyAsc.map((sample) => sample.errorRatePercent), [historyAsc]);
  const latencyTrend = useMemo(() => historyAsc.map((sample) => sample.avgLatencyMs), [historyAsc]);
  const availabilityTrend = useMemo(
    () => historyAsc.map((sample) => sample.availabilityPercent),
    [historyAsc]
  );

  useEffect(() => {
    setNextRefreshIn(refreshSeconds);
  }, [refreshSeconds, liveEnabled, checksQuery.dataUpdatedAt, historyQuery.dataUpdatedAt]);

  useEffect(() => {
    if (!liveEnabled) {
      return;
    }
    const interval = window.setInterval(() => {
      setNextRefreshIn((previous) => {
        if (previous <= 1) {
          return refreshSeconds;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [liveEnabled, refreshSeconds]);

  const liveStatusText = useMemo(() => {
    if (!liveEnabled) return 'Live updates paused';
    if (checksQuery.isFetching || historyQuery.isFetching) return 'Refreshing now...';
    return `Next refresh in ${nextRefreshIn}s`;
  }, [checksQuery.isFetching, historyQuery.isFetching, liveEnabled, nextRefreshIn]);

  async function handleFetchPreview(target: string) {
    setActiveTarget(target);
    try {
      const result = await scrapeMutation.mutateAsync(target);
      setPreviewResults((previous) => ({
        ...previous,
        [target]: {
          ok: Boolean(result.ok),
          status: Number(result.status || 0),
          durationMs: Number(result.durationMs || 0),
          preview: result.preview || '',
        },
      }));
    } finally {
      setActiveTarget(null);
    }
  }

  return (
    <AdminShell>
      <section className="dg-admin-page">
        <AdminPageHeader
          title="Observability Control Center"
          subtitle="Unified health, metrics, and persistent live history for storefront, FastAPI, AI service, workers, database, and Redis."
        />

        <div className="dg-kpi-grid">
          <article className="dg-card dg-kpi-card">
            <p className="dg-kpi-label">Live Stats</p>
            <p className="dg-kpi-value">{liveEnabled ? 'ON' : 'OFF'}</p>
            <p className="dg-kpi-meta">{liveStatusText}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="dg-btn-secondary"
                onClick={() => setLiveEnabled((value) => !value)}
              >
                {liveEnabled ? 'Pause Live' : 'Resume Live'}
              </button>
              <select
                className="dg-select"
                value={refreshSeconds}
                onChange={(event) => setRefreshSeconds(Number(event.target.value))}
                aria-label="Refresh interval"
              >
                <option value={5}>5s interval</option>
                <option value={10}>10s interval</option>
                <option value={15}>15s interval</option>
                <option value={30}>30s interval</option>
              </select>
            </div>
          </article>
          <article className="dg-card dg-kpi-card">
            <p className="dg-kpi-label">History Samples</p>
            <p className="dg-kpi-value">{historyQuery.isLoading ? '...' : historyDesc.length}</p>
            <p className="dg-kpi-meta">Persisted in background worker</p>
          </article>
          <article className="dg-card dg-kpi-card">
            <p className="dg-kpi-label">Healthy Checks</p>
            <p className="dg-kpi-value">{checksQuery.isLoading ? '...' : stats.healthy}</p>
            <p className="dg-kpi-meta">Services currently passing checks</p>
          </article>
          <article className="dg-card dg-kpi-card">
            <p className="dg-kpi-label">Failed Checks</p>
            <p className="dg-kpi-value">{checksQuery.isLoading ? '...' : stats.failed}</p>
            <p className="dg-kpi-meta">Services requiring intervention</p>
          </article>
          <article className="dg-card dg-kpi-card">
            <p className="dg-kpi-label">Probe Targets</p>
            <p className="dg-kpi-value">{targetsQuery.isLoading ? '...' : targetsQuery.data?.items.length ?? 0}</p>
            <p className="dg-kpi-meta">Metrics and health endpoints</p>
          </article>
        </div>
      </section>

      <section className="dg-admin-page">
        {historyQuery.isError ? (
          <p className="dg-alert-error">
            {historyQuery.error instanceof Error
              ? historyQuery.error.message
              : 'Failed to load observability history.'}
          </p>
        ) : historyDesc.length === 0 ? (
          <p className="dg-alert-error">
            No history samples yet. Keep observability service running for 10-20 seconds to collect baseline.
          </p>
        ) : (
          <LiveGoldenSignalsPanel
            requestRateRps={requestRateRps}
            errorRatePercent={errorRatePercent}
            avgLatencyMs={avgLatencyMs}
            availabilityPercent={availabilityPercent}
            saturationPercent={saturationPercent}
            trafficTrend={trafficTrend}
            errorTrend={errorTrend}
            latencyTrend={latencyTrend}
            availabilityTrend={availabilityTrend}
          />
        )}
      </section>

      <section className="dg-admin-page">
        {checksQuery.isError ? (
          <p className="dg-alert-error">
            {checksQuery.error instanceof Error
              ? checksQuery.error.message
              : 'Failed to load observability checks.'}
          </p>
        ) : (
          <ServiceChecksPanel
            overallOk={Boolean(checksQuery.data?.overallOk)}
            generatedAt={checksQuery.data?.generatedAt}
            checks={checks}
            isRefreshing={checksQuery.isFetching}
            onRefresh={() => void checksQuery.refetch()}
          />
        )}
      </section>

      <section className="dg-admin-page">
        {targetsQuery.isError ? (
          <p className="dg-alert-error">
            {targetsQuery.error instanceof Error
              ? targetsQuery.error.message
              : 'Failed to load observability targets.'}
          </p>
        ) : (
          <EndpointPreviewsPanel
            targets={targetsQuery.data?.items ?? []}
            activeTarget={activeTarget}
            results={previewResults}
            onFetch={(target) => void handleFetchPreview(target)}
          />
        )}
      </section>
    </AdminShell>
  );
}
