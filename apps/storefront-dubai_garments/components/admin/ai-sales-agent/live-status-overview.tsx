'use client';

import { useEffect, useMemo, useState } from 'react';
import { Panel } from '@/components/ui';
import { getAiImpactKpis, getAiModelConfig } from '@/features/admin/ai-sales-agent/api';
import type { AiImpactKpiEnvelope } from '@/features/admin/ai-sales-agent/types';

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

function runBarToneClass(status: string | null | undefined) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'success' || normalized === 'completed') return 'is-success';
  if (normalized === 'failed' || normalized === 'error' || normalized === 'cancelled') return 'is-danger';
  if (normalized === 'running' || normalized === 'queued' || normalized === 'retrying') return 'is-warning';
  return 'is-neutral';
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
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
  const [impact, setImpact] = useState<AiImpactKpiEnvelope | null>(null);
  const [runs, setRuns] = useState<AutomationRunSummary[]>([]);

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
        fetch('/api/admin/automation-runs?limit=8', {
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
        ...kpiRes,
      });
      setRuns(runsRes.items ?? []);
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

  const healthPercent = useMemo(() => {
    if (!health?.summary.total) return 0;
    return Math.round((health.summary.healthy / health.summary.total) * 100);
  }, [health]);

  const acceptanceRate = impact?.suggestionsAccepted.acceptanceRate7d ?? 0;
  const resolutionRate = impact?.riskAlertsResolved.resolutionRate7d ?? 0;
  const hoursSaved = impact?.timeSavedEstimate.hoursSaved7d ?? 0;

  const automationSuccessRate = useMemo(() => {
    if (runs.length === 0) return 0;
    const successCount = runs.filter((run) => {
      const status = String(run.status || '').toLowerCase();
      return status === 'success' || status === 'completed';
    }).length;
    return Math.round((successCount / runs.length) * 100);
  }, [runs]);

  const speedIndex = Math.min(100, Math.round((hoursSaved / 40) * 100));
  const qualityIndex = Math.round((acceptanceRate + resolutionRate) / 2);
  const reliabilityIndex = Math.round((healthPercent + automationSuccessRate) / 2);
  const aiLiftIndex = Math.round(speedIndex * 0.35 + qualityIndex * 0.4 + reliabilityIndex * 0.25);
  const suggestionsTotal = impact?.suggestionsAccepted.denominator7d ?? 0;
  const suggestionsAccepted = impact?.suggestionsAccepted.last7d ?? 0;
  const riskTotal = impact?.riskAlertsResolved.denominator7d ?? 0;
  const riskResolved = impact?.riskAlertsResolved.last7d ?? 0;
  const funnelMax = Math.max(suggestionsTotal, suggestionsAccepted, riskTotal, riskResolved, 1);

  const lastRun = runs[0] ?? null;
  const acceptedToday = impact?.suggestionsAccepted.today ?? 0;
  const acceptedDailyAvg = Math.round((impact?.suggestionsAccepted.last7d ?? 0) / 7);
  const resolvedToday = impact?.riskAlertsResolved.today ?? 0;
  const resolvedDailyAvg = Math.round((impact?.riskAlertsResolved.last7d ?? 0) / 7);
  const timeSavedTodayMinutes = impact?.timeSavedEstimate.today ?? 0;
  const timeSavedDailyAvg = Math.round((impact?.timeSavedEstimate.last7d ?? 0) / 7);

  const runStatusMix = useMemo(() => {
    const base = {
      success: 0,
      warning: 0,
      danger: 0,
      neutral: 0,
    };
    if (!runs.length) return base;
    for (const run of runs) {
      const tone = runBarToneClass(run.status);
      if (tone === 'is-success') base.success += 1;
      else if (tone === 'is-warning') base.warning += 1;
      else if (tone === 'is-danger') base.danger += 1;
      else base.neutral += 1;
    }
    return base;
  }, [runs]);

  const totalRunsInMix = runs.length || 1;
  const successMixPercent = clampPercent((runStatusMix.success / totalRunsInMix) * 100);
  const warningMixPercent = clampPercent((runStatusMix.warning / totalRunsInMix) * 100);
  const dangerMixPercent = clampPercent((runStatusMix.danger / totalRunsInMix) * 100);
  const neutralMixPercent = clampPercent((runStatusMix.neutral / totalRunsInMix) * 100);

  const acceptedVsAvgPercent = clampPercent((acceptedToday / Math.max(1, acceptedDailyAvg)) * 100);
  const resolvedVsAvgPercent = clampPercent((resolvedToday / Math.max(1, resolvedDailyAvg)) * 100);
  const timeSavedVsAvgPercent = clampPercent((timeSavedTodayMinutes / Math.max(1, timeSavedDailyAvg)) * 100);
  const suggestionCompletionRate = clampPercent((suggestionsAccepted / Math.max(1, suggestionsTotal)) * 100);
  const riskClearanceRate = clampPercent((riskResolved / Math.max(1, riskTotal)) * 100);
  const suggestionBacklog = Math.max(0, suggestionsTotal - suggestionsAccepted);
  const riskBacklog = Math.max(0, riskTotal - riskResolved);
  const suggestionBacklogRate = clampPercent((suggestionBacklog / Math.max(1, suggestionsTotal)) * 100);
  const riskBacklogRate = clampPercent((riskBacklog / Math.max(1, riskTotal)) * 100);
  const avgSavedTargetMinutes = 60;
  const avgSavedRate = clampPercent((timeSavedDailyAvg / Math.max(1, avgSavedTargetMinutes)) * 100);
  const operationsScore = Math.round(
    (suggestionCompletionRate + riskClearanceRate + automationSuccessRate + avgSavedRate) / 4
  );

  function scoreToneClass(value: number) {
    if (value >= 75) return 'dg-status-pill-success';
    if (value >= 45) return 'dg-status-pill-warning';
    return 'dg-status-pill-danger';
  }

  return (
    <div className="ais-impact-dash-grid">
      <Panel className="ais-impact-dash-card">
        <div className="ais-impact-dash-head">
          <h3 className="dg-panel-title">Hours Recovered (7d)</h3>
          <span className={`dg-status-pill ${scoreToneClass(speedIndex)}`}>{speedIndex}%</span>
        </div>
        <p className="ais-impact-dash-value">{hoursSaved}h</p>
        <div className="ais-impact-dash-meta">
          <span>Today {impact?.timeSavedEstimate.today ?? 0}m</span>
          <span>7d {impact?.timeSavedEstimate.last7d ?? 0}m</span>
        </div>
        <div className="ais-impact-dash-meter">
          <span style={{ width: `${speedIndex}%` }} />
        </div>
      </Panel>

      <Panel className="ais-impact-dash-card">
        <div className="ais-impact-dash-head">
          <h3 className="dg-panel-title">Suggestion Acceptance</h3>
          <span className={`dg-status-pill ${scoreToneClass(acceptanceRate)}`}>{acceptanceRate}%</span>
        </div>
        <p className="ais-impact-dash-value">{impact?.suggestionsAccepted.last7d ?? 0}</p>
        <div className="ais-impact-dash-meta">
          <span>Accepted today {impact?.suggestionsAccepted.today ?? 0}</span>
          <span>Window 7d</span>
        </div>
        <div className="ais-impact-dash-meter">
          <span style={{ width: `${Math.max(0, Math.min(100, acceptanceRate))}%` }} />
        </div>
      </Panel>

      <Panel className="ais-impact-dash-card">
        <div className="ais-impact-dash-head">
          <h3 className="dg-panel-title">Risk Resolution</h3>
          <span className={`dg-status-pill ${scoreToneClass(resolutionRate)}`}>{resolutionRate}%</span>
        </div>
        <p className="ais-impact-dash-value">{impact?.riskAlertsResolved.last7d ?? 0}</p>
        <div className="ais-impact-dash-meta">
          <span>Resolved today {impact?.riskAlertsResolved.today ?? 0}</span>
          <span>Window 7d</span>
        </div>
        <div className="ais-impact-dash-meter">
          <span style={{ width: `${Math.max(0, Math.min(100, resolutionRate))}%` }} />
        </div>
      </Panel>

      <Panel className="ais-impact-dash-card">
        <div className="ais-impact-dash-head">
          <h3 className="dg-panel-title">Execution Reliability</h3>
          <span className={`dg-status-pill ${scoreToneClass(reliabilityIndex)}`}>{reliabilityIndex}%</span>
        </div>
        <p className="ais-impact-dash-value">{aiLiftIndex}%</p>
        <div className="ais-impact-dash-meta">
          <span>Health {healthPercent}%</span>
          <span>Runs {automationSuccessRate}%</span>
        </div>
        <div className="ais-impact-dash-meter">
          <span style={{ width: `${Math.max(0, Math.min(100, reliabilityIndex))}%` }} />
        </div>
      </Panel>

      <Panel className="ais-impact-dash-card ais-impact-dash-card--wide ais-impact-dash-card--row2">
        <div className="ais-impact-dash-head">
          <h3 className="dg-panel-title">Impact Funnel (7d)</h3>
          <span className={`dg-status-pill ${scoreToneClass(aiLiftIndex)}`}>{aiLiftIndex}%</span>
        </div>
        <div className="ais-impact-funnel">
          <div className="ais-impact-funnel-row">
            <span>AI Suggestions</span>
            <strong>{suggestionsTotal}</strong>
            <div className="ais-impact-funnel-bar">
              <span style={{ width: `${Math.round((suggestionsTotal / funnelMax) * 100)}%` }} />
            </div>
          </div>
          <div className="ais-impact-funnel-row">
            <span>Accepted</span>
            <strong>{suggestionsAccepted}</strong>
            <div className="ais-impact-funnel-bar">
              <span style={{ width: `${Math.round((suggestionsAccepted / funnelMax) * 100)}%` }} />
            </div>
          </div>
          <div className="ais-impact-funnel-row">
            <span>Risk Alerts</span>
            <strong>{riskTotal}</strong>
            <div className="ais-impact-funnel-bar">
              <span style={{ width: `${Math.round((riskTotal / funnelMax) * 100)}%` }} />
            </div>
          </div>
          <div className="ais-impact-funnel-row">
            <span>Resolved</span>
            <strong>{riskResolved}</strong>
            <div className="ais-impact-funnel-bar">
              <span style={{ width: `${Math.round((riskResolved / funnelMax) * 100)}%` }} />
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="ais-impact-dash-card ais-impact-dash-card--wide ais-impact-dash-card--row2">
        <div className="ais-impact-dash-head">
          <h3 className="dg-panel-title">AI Lift Gauge</h3>
          <span className={`dg-status-pill ${scoreToneClass(aiLiftIndex)}`}>{aiLiftIndex}%</span>
        </div>
        <div className="ais-impact-gauge-shell">
          <div
            className="ais-impact-gauge"
            style={{
              background: `conic-gradient(#4f46e5 0 ${clampPercent(aiLiftIndex)}%, #e4ebf8 ${clampPercent(aiLiftIndex)}% 100%)`,
            }}
            aria-label="AI lift score gauge"
          >
            <div className="ais-impact-gauge-inner">
              <strong>{aiLiftIndex}%</strong>
            </div>
          </div>
          <div className="ais-impact-gauge-legend">
            <div>
              <span>Speed</span>
              <strong>{speedIndex}%</strong>
            </div>
            <div>
              <span>Quality</span>
              <strong>{qualityIndex}%</strong>
            </div>
            <div>
              <span>Reliability</span>
              <strong>{reliabilityIndex}%</strong>
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="ais-impact-dash-card ais-impact-dash-card--wide ais-impact-dash-card--row2 ais-impact-dash-card--tight">
        <div className="ais-impact-dash-head">
          <h3 className="dg-panel-title">Runtime & Health</h3>
          <span className={`dg-status-pill ${healthToneClass}`}>
            {health ? (health.overallOk ? 'Healthy' : 'Degraded') : 'Unknown'}
          </span>
        </div>
        <div className="ais-impact-runtime-stack">
          <div className="ais-impact-runtime-tile">
            <span>Mode</span>
            <strong>{runtime ? runtimeModeLabel(runtime.mode) : 'Unknown'}</strong>
          </div>
          <div className="ais-impact-runtime-tile">
            <span>Primary</span>
            <strong>{runtime?.provider || 'n/a'}</strong>
          </div>
          <div className="ais-impact-runtime-tile">
            <span>Fallback</span>
            <strong>{runtime?.fallbackEnabled ? runtime?.fallbackProvider || 'n/a' : 'Disabled'}</strong>
          </div>
          <div className="ais-impact-runtime-tile">
            <span>Checks</span>
            <strong>{health?.summary.healthy ?? 0}/{health?.summary.total ?? 0}</strong>
          </div>
        </div>
      </Panel>

      <Panel className="ais-impact-dash-card ais-impact-dash-card--wide ais-impact-dash-card--row3 ais-impact-dash-card--tight">
        <div className="ais-impact-dash-head">
          <h3 className="dg-panel-title">AI Lift Mix</h3>
          <span className={`dg-status-pill ${scoreToneClass(aiLiftIndex)}`}>{aiLiftIndex}%</span>
        </div>
        <div className="ais-impact-mix-grid">
          <div className="ais-impact-mix-row">
            <span>Speed</span>
            <strong>{speedIndex}%</strong>
            <div className="ais-impact-dash-meter"><span style={{ width: `${speedIndex}%` }} /></div>
          </div>
          <div className="ais-impact-mix-row">
            <span>Quality</span>
            <strong>{qualityIndex}%</strong>
            <div className="ais-impact-dash-meter"><span style={{ width: `${qualityIndex}%` }} /></div>
          </div>
          <div className="ais-impact-mix-row">
            <span>Reliability</span>
            <strong>{reliabilityIndex}%</strong>
            <div className="ais-impact-dash-meter"><span style={{ width: `${reliabilityIndex}%` }} /></div>
          </div>
        </div>
      </Panel>

      <Panel className="ais-impact-dash-card ais-impact-dash-card--wide ais-impact-dash-card--row3 ais-impact-dash-card--tight">
        <div className="ais-impact-dash-head">
          <h3 className="dg-panel-title">Today vs 7d Daily Avg</h3>
          <span className={`dg-status-pill ${scoreToneClass(Math.round((acceptedVsAvgPercent + resolvedVsAvgPercent + timeSavedVsAvgPercent) / 3))}`}>
            Live
          </span>
        </div>
        <div className="ais-impact-compare">
          <div className="ais-impact-compare-row">
            <span>Accepted</span>
            <strong>{acceptedToday}</strong>
            <div className="ais-impact-dash-meter">
              <span style={{ width: `${acceptedVsAvgPercent}%` }} />
            </div>
            <em>Avg {acceptedDailyAvg}</em>
          </div>
          <div className="ais-impact-compare-row">
            <span>Resolved</span>
            <strong>{resolvedToday}</strong>
            <div className="ais-impact-dash-meter">
              <span style={{ width: `${resolvedVsAvgPercent}%` }} />
            </div>
            <em>Avg {resolvedDailyAvg}</em>
          </div>
          <div className="ais-impact-compare-row">
            <span>Saved (m)</span>
            <strong>{timeSavedTodayMinutes}</strong>
            <div className="ais-impact-dash-meter">
              <span style={{ width: `${timeSavedVsAvgPercent}%` }} />
            </div>
            <em>Avg {timeSavedDailyAvg}</em>
          </div>
        </div>
      </Panel>

      <Panel className="ais-impact-dash-card ais-impact-dash-card--wide ais-impact-dash-card--row3">
        <div className="ais-impact-dash-head">
          <h3 className="dg-panel-title">Coverage & Backlog (7d)</h3>
          <span className={`dg-status-pill ${scoreToneClass(operationsScore)}`}>{operationsScore}%</span>
        </div>
        <div className="ais-impact-mix-grid">
          <div className="ais-impact-mix-row">
            <span>Suggestions Backlog</span>
            <strong>
              {suggestionBacklog}/{suggestionsTotal}
            </strong>
            <div className="ais-impact-dash-meter">
              <span style={{ width: `${suggestionBacklogRate}%` }} />
            </div>
          </div>
          <div className="ais-impact-mix-row">
            <span>Risk Backlog</span>
            <strong>
              {riskBacklog}/{riskTotal}
            </strong>
            <div className="ais-impact-dash-meter">
              <span style={{ width: `${riskBacklogRate}%` }} />
            </div>
          </div>
          <div className="ais-impact-mix-row">
            <span>Run Success</span>
            <strong>{runStatusMix.success}/{runs.length || 0}</strong>
            <div className="ais-impact-dash-meter">
              <span style={{ width: `${automationSuccessRate}%` }} />
            </div>
          </div>
          <div className="ais-impact-mix-row">
            <span>Avg Saved / Day</span>
            <strong>
              {timeSavedDailyAvg}m / {avgSavedTargetMinutes}m
            </strong>
            <div className="ais-impact-dash-meter">
              <span style={{ width: `${avgSavedRate}%` }} />
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="ais-impact-dash-card ais-impact-dash-card--wide ais-impact-dash-card--full">
        <div className="ais-impact-dash-head">
          <h3 className="dg-panel-title">Recent Automation Runs</h3>
          <span className={`dg-status-pill ${scoreToneClass(automationSuccessRate)}`}>{automationSuccessRate}%</span>
        </div>
        <div className="ais-impact-runs">
          <div className="ais-impact-status-mix">
            <span className="is-success" style={{ width: `${successMixPercent}%` }} />
            <span className="is-warning" style={{ width: `${warningMixPercent}%` }} />
            <span className="is-danger" style={{ width: `${dangerMixPercent}%` }} />
            <span className="is-neutral" style={{ width: `${neutralMixPercent}%` }} />
          </div>
          <div className="ais-impact-runs-strip" aria-label="Recent run quality">
            {(runs.slice(0, 16) || []).map((run) => (
              <span
                key={`run-bar-${run.id}`}
                className={`ais-impact-runs-strip-item ${runBarToneClass(run.status)}`}
                title={`${run.workflow_name} · ${run.status}`}
              />
            ))}
          </div>
          {(runs.slice(0, 6) || []).map((run) => (
            <div key={run.id} className="ais-impact-run-row">
              <span className={`dg-status-pill ${automationStatusToneClass(run.status)}`}>{run.status}</span>
              <strong>{run.workflow_name}</strong>
              <span>{formatDateTime(run.updated_at)}</span>
            </div>
          ))}
          {runs.length === 0 ? (
            <div className="ais-impact-run-row">
              <span className="dg-status-pill dg-status-pill-neutral">No runs</span>
              <strong>Automation</strong>
              <span>Not available</span>
            </div>
          ) : null}
          {lastRun ? (
            <div className="ais-impact-last-run">
              <span>Last</span>
              <strong>{lastRun.workflow_name}</strong>
              <span className={`dg-status-pill ${automationStatusToneClass(lastRun.status)}`}>{lastRun.status}</span>
            </div>
          ) : null}
        </div>
      </Panel>

      {loading ? (
        <Panel className="ais-impact-dash-card ais-impact-dash-card--wide">
          <p className="dg-muted">Loading live AI status...</p>
        </Panel>
      ) : null}

      {error ? (
        <Panel className="ais-impact-dash-card ais-impact-dash-card--wide">
          <p style={{ color: 'var(--color-danger)' }}>{error}</p>
        </Panel>
      ) : null}
    </div>
  );
}
