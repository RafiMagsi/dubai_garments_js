'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import AdminPageHeader from '@/components/admin/common/page-header';
import AdminShell from '@/components/admin/admin-shell';
import { PageShell, Panel, Toolbar } from '@/components/ui';
import { useAiLogs } from '@/features/admin/ai-logs';
import {
  formatDateTime,
  statusBadgeClass,
  titleCase,
} from '@/features/admin/shared/view-format';

const statusOptions = [
  { label: 'All Statuses', value: '' },
  { label: 'Queued', value: 'queued' },
  { label: 'Running', value: 'running' },
  { label: 'Success', value: 'success' },
  { label: 'Failed', value: 'failed' },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function AdminAiLogsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [workflowInput, setWorkflowInput] = useState('');
  const [providerInput, setProviderInput] = useState('');
  const [statusInput, setStatusInput] = useState('');

  const [search, setSearch] = useState('');
  const [workflowName, setWorkflowName] = useState('');
  const [provider, setProvider] = useState('');
  const [status, setStatus] = useState('');

  const filters = useMemo(
    () => ({
      search: search || undefined,
      workflow_name: workflowName || undefined,
      provider: provider || undefined,
      status: status || undefined,
    }),
    [provider, search, status, workflowName]
  );

  const logsQuery = useAiLogs(filters);
  const logs = logsQuery.data?.items ?? [];

  const failedCount = logs.filter((log) => log.status === 'failed').length;
  const successCount = logs.filter((log) => log.status === 'success').length;
  const fallbackCount = logs.filter((log) => log.fallback_used).length;
  const avgLatency = Math.round(
    logs
      .filter((log) => typeof log.latency_ms === 'number')
      .reduce((sum, log) => sum + Number(log.latency_ms || 0), 0) /
      Math.max(1, logs.filter((log) => typeof log.latency_ms === 'number').length)
  );

  function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchInput.trim());
    setWorkflowName(workflowInput.trim());
    setProvider(providerInput.trim());
    setStatus(statusInput);
  }

  return (
    <AdminShell>
      <PageShell density="compact">
        <Panel>
          <AdminPageHeader
            title="AI Trace Logs"
            subtitle="Inspect AI execution traces, model/provider outcomes, payloads, and fallback behavior."
            actions={
              <Toolbar>
                <Link href="/admin/automations" className="ui-btn ui-btn-secondary ui-btn-md">
                  Automation Runs
                </Link>
                <Link href="/admin/observability" className="ui-btn ui-btn-secondary ui-btn-md">
                  Observability
                </Link>
              </Toolbar>
            }
          />

          <div className="dg-kpi-grid">
            <article className="dg-card dg-kpi-card">
              <p className="dg-kpi-label">Trace Count</p>
              <p className="dg-kpi-value">{logs.length}</p>
              <p className="dg-kpi-meta">Recent AI execution logs</p>
            </article>
            <article className="dg-card dg-kpi-card">
              <p className="dg-kpi-label">Success</p>
              <p className="dg-kpi-value">{successCount}</p>
              <p className="dg-kpi-meta">Completed successfully</p>
            </article>
            <article className="dg-card dg-kpi-card">
              <p className="dg-kpi-label">Failed</p>
              <p className="dg-kpi-value">{failedCount}</p>
              <p className="dg-kpi-meta">Execution errors</p>
            </article>
            <article className="dg-card dg-kpi-card">
              <p className="dg-kpi-label">Fallback / Avg Latency</p>
              <p className="dg-kpi-value">
                {fallbackCount} / {Number.isFinite(avgLatency) ? `${avgLatency}ms` : '-'}
              </p>
              <p className="dg-kpi-meta">Fallback usages across traces</p>
            </article>
          </div>
        </Panel>

        <Panel>
          <form onSubmit={handleApply} className="dg-form-row">
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search workflow/provider/error..."
              className="dg-input dg-col-fill"
            />
            <input
              value={workflowInput}
              onChange={(event) => setWorkflowInput(event.target.value)}
              placeholder="Workflow name"
              className="dg-input dg-select-md"
            />
            <input
              value={providerInput}
              onChange={(event) => setProviderInput(event.target.value)}
              placeholder="Provider (openai/system)"
              className="dg-input dg-select-md"
            />
            <select
              className="dg-select dg-select-md"
              value={statusInput}
              onChange={(event) => setStatusInput(event.target.value)}
            >
              {statusOptions.map((item) => (
                <option key={item.label} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <button type="submit" className="ui-btn ui-btn-primary ui-btn-md">
              Apply
            </button>
          </form>
        </Panel>

        <Panel>
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">AI Logs</h2>
            <span className="dg-badge">{logs.length} Total</span>
          </div>

          {logsQuery.isLoading && <p className="dg-muted-sm">Loading AI logs...</p>}
          {logsQuery.isError && (
            <p className="dg-alert-error">
              {logsQuery.error instanceof Error ? logsQuery.error.message : 'Failed to load AI logs.'}
            </p>
          )}

          {!logsQuery.isLoading && !logsQuery.isError && (
            <div className="ui-table-wrap">
              <table className="ui-table ui-table-density-compact">
                <thead>
                  <tr>
                    <th>Workflow</th>
                    <th>Status</th>
                    <th>Provider</th>
                    <th>Entity</th>
                    <th>Fallback</th>
                    <th>Latency</th>
                    <th>Created</th>
                    <th>Error</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length > 0 ? (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td>{log.workflow_name}</td>
                        <td>
                          <span className={statusBadgeClass(log.status)}>{titleCase(log.status)}</span>
                        </td>
                        <td>{log.provider || '-'}</td>
                        <td>
                          {log.trigger_entity_type || '-'}
                          {log.trigger_entity_id ? `:${log.trigger_entity_id.slice(0, 8)}` : ''}
                        </td>
                        <td>{log.fallback_used ? 'Yes' : 'No'}</td>
                        <td>{typeof log.latency_ms === 'number' ? `${log.latency_ms}ms` : '-'}</td>
                        <td>{formatDateTime(log.created_at)}</td>
                        <td className="max-w-72 truncate">{log.error_message || '-'}</td>
                        <td>
                          <Link
                            href={`/admin/ai-logs/${log.id}`}
                            className="ui-btn ui-btn-secondary ui-btn-md"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9}>No AI logs found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </PageShell>
    </AdminShell>
  );
}
