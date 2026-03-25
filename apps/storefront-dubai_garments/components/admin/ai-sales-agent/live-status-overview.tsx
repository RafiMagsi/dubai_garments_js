'use client';

import { useEffect, useMemo, useState } from 'react';
import { Panel } from '@/components/ui';
import { getAiImpactKpis, getAiModelConfig } from '@/features/admin/ai-sales-agent/api';

type ObservabilityChecksResponse = {
  overallOk: boolean;
  summary: {
    healthy: number;
    failed: number;
    total: number;
  };
};

type AutomationRunSummary = {
  id: string;
  workflow_name: string;
  status: string;
  updated_at: string;
};

type AutomationRunsResponse = {
  items: AutomationRunSummary[];
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function runtimeModeLabel(value: string) {
  if (value === 'llm_only') return 'LLM Only';
  if (value === 'fallback_only') return 'Internal Only';
  return 'Auto';
}

function automationStatusToneClass(status: string | null | undefined) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'success' || normalized === 'completed') return 'dg-status-pill-success';
  if (normalized === 'failed' || normalized === 'error' || normalized === 'cancelled') return 'dg-status-pill-danger';
  if (normalized === 'running' || normalized === 'queued' || normalized === 'retrying') return 'dg-status-pill-warning';
  return 'dg-status-pill-neutral';
}

export default function AiSalesLiveStatusOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runtime, setRuntime] = useState<{
    mode: string;
    provider: string;
    fallbackProvider: string;
    fallbackEnabled: boolean;
  } | null>(null);
  const [health, setHealth] = useState<ObservabilityChecksResponse | null>(null);
  const [impact, setImpact] = useState<{
    timeSavedHours: number;
    acceptanceRate: number;
    resolutionRate: number;
  } | null>(null);
  const [lastRun, setLastRun] = useState<AutomationRunSummary | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const [modelRes, healthRes, kpiRes, runsRes] = await Promise.all([
        getAiModelConfig(),
        fetch('/api/admin/observability?mode=checks', {
          credentials: 'include',
        }).then(async (res) => {
          const json = (await res.json()) as ObservabilityChecksResponse | { message?: string };
          if (!res.ok) {
            throw new Error((json as { message?: string }).message || 'Failed to load system health.');
          }
          return json as ObservabilityChecksResponse;
        }),
        getAiImpactKpis(),
        fetch('/api/admin/automation-runs?limit=1', {
          credentials: 'include',
        }).then(async (res) => {
          const json = (await res.json()) as AutomationRunsResponse | { message?: string };
          if (!res.ok) {
            throw new Error((json as { message?: string }).message || 'Failed to load automation runs.');
          }
          return json as AutomationRunsResponse;
        }),
      ]);

      setRuntime({
        mode: modelRes.config.runtimeMode,
        provider: modelRes.config.provider,
        fallbackProvider: modelRes.config.fallbackProvider,
        fallbackEnabled: modelRes.config.fallbackEnabled,
      });
      setHealth(healthRes);
      setImpact({
        timeSavedHours: kpiRes.timeSavedEstimate.hoursSaved7d,
        acceptanceRate: kpiRes.suggestionsAccepted.acceptanceRate7d,
        resolutionRate: kpiRes.riskAlertsResolved.resolutionRate7d,
      });
      setLastRun(runsRes.items?.[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load live AI status.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const healthToneClass = useMemo(() => {
    if (!health) return 'dg-status-pill-neutral';
    return health.overallOk ? 'dg-status-pill-success' : 'dg-status-pill-danger';
  }, [health]);

  return (
    <div
      className="dg-grid dg-gap-4"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
    >
      <Panel>
        <div className="dg-flex dg-items-center dg-justify-between dg-gap-2">
          <h3 className="dg-panel-title">Runtime Mode</h3>
          <span className={`dg-status-pill ${runtime?.mode === 'fallback_only' ? 'dg-status-pill-warning' : 'dg-status-pill-success'}`}>
            {runtime ? runtimeModeLabel(runtime.mode) : 'Unknown'}
          </span>
        </div>
        <p className="dg-muted">
          Primary: <strong>{runtime?.provider || 'n/a'}</strong> · Fallback:{' '}
          <strong>{runtime?.fallbackEnabled ? runtime?.fallbackProvider || 'n/a' : 'Disabled'}</strong>
        </p>
      </Panel>

      <Panel>
        <div className="dg-flex dg-items-center dg-justify-between dg-gap-2">
          <h3 className="dg-panel-title">System Health</h3>
          <span className={`dg-status-pill ${healthToneClass}`}>
            {health ? (health.overallOk ? 'Healthy' : 'Degraded') : 'Unknown'}
          </span>
        </div>
        <p className="dg-muted">
          Checks: <strong>{health?.summary.healthy ?? 0}</strong> healthy /{' '}
          <strong>{health?.summary.failed ?? 0}</strong> failed
        </p>
      </Panel>

      <Panel>
        <h3 className="dg-panel-title">KPI Snapshot (7d)</h3>
        <p className="dg-muted">
          Time saved: <strong>{impact ? `${impact.timeSavedHours}h` : '0h'}</strong> · Acceptance:{' '}
          <strong>{impact ? `${impact.acceptanceRate}%` : '0%'}</strong> · Resolved:{' '}
          <strong>{impact ? `${impact.resolutionRate}%` : '0%'}</strong>
        </p>
      </Panel>

      <Panel>
        <div className="dg-flex dg-items-center dg-justify-between dg-gap-2">
          <h3 className="dg-panel-title">Last Run Status</h3>
          <span className={`dg-status-pill ${automationStatusToneClass(lastRun?.status)}`}>
            {lastRun?.status || 'No runs'}
          </span>
        </div>
        <p className="dg-muted">
          {lastRun ? (
            <>
              {lastRun.workflow_name} · {formatDateTime(lastRun.updated_at)}
            </>
          ) : (
            'No automation run found yet.'
          )}
        </p>
      </Panel>

      {loading ? (
        <Panel style={{ gridColumn: '1 / -1' }}>
          <p className="dg-muted">Loading live AI status...</p>
        </Panel>
      ) : null}

      {error ? (
        <Panel style={{ gridColumn: '1 / -1' }}>
          <p style={{ color: 'var(--color-danger)' }}>{error}</p>
        </Panel>
      ) : null}
    </div>
  );
}
