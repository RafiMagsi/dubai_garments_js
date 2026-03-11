'use client';

import { useState } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import AdminPageHeader from '@/components/admin/common/page-header';
import EndpointPreviewsPanel from '@/components/admin/observability/endpoint-previews-panel';
import ServiceChecksPanel from '@/components/admin/observability/service-checks-panel';
import {
  useObservabilityChecks,
  useObservabilityScrape,
  useObservabilityTargets,
} from '@/features/admin/observability';

export default function AdminObservabilityPage() {
  const targetsQuery = useObservabilityTargets();
  const checksQuery = useObservabilityChecks();
  const scrapeMutation = useObservabilityScrape();

  const [activeTarget, setActiveTarget] = useState<string | null>(null);
  const [previewResults, setPreviewResults] = useState<
    Record<string, { ok: boolean; status: number; durationMs: number; preview: string }>
  >({});

  const checks = checksQuery.data?.items ?? [];
  const summary = checksQuery.data?.summary;

  const stats = {
    healthy: summary?.healthy ?? checks.filter((item) => item.ok).length,
    failed: summary?.failed ?? checks.filter((item) => !item.ok).length,
    total: summary?.total ?? checks.length,
  };

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
          subtitle="Unified health, metrics, and probe tooling for storefront, FastAPI, AI service, workers, database, and Redis."
        />

        <div className="dg-kpi-grid">
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
            <p className="dg-kpi-label">Total Checks</p>
            <p className="dg-kpi-value">{checksQuery.isLoading ? '...' : stats.total}</p>
            <p className="dg-kpi-meta">HTTP, Redis, and PostgreSQL checks</p>
          </article>
          <article className="dg-card dg-kpi-card">
            <p className="dg-kpi-label">Probe Targets</p>
            <p className="dg-kpi-value">{targetsQuery.isLoading ? '...' : targetsQuery.data?.items.length ?? 0}</p>
            <p className="dg-kpi-meta">Metrics and health endpoints</p>
          </article>
        </div>
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
