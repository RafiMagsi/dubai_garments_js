'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import AdminPageHeader from '@/components/admin/common/page-header';
import AdminShell from '@/components/admin/admin-shell';
import { PageShell, Panel, Toolbar } from '@/components/ui';
import { useAutomationRuns, useRetryAutomationRun } from '@/features/admin/automation-runs';
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

export default function AdminAutomationsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [workflowInput, setWorkflowInput] = useState('');
  const [statusInput, setStatusInput] = useState('');
  const [failedOnlyInput, setFailedOnlyInput] = useState(false);

  const [search, setSearch] = useState('');
  const [workflowName, setWorkflowName] = useState('');
  const [status, setStatus] = useState('');
  const [failedOnly, setFailedOnly] = useState(false);

  const filters = useMemo(
    () => ({
      search: search || undefined,
      workflow_name: workflowName || undefined,
      status: status || undefined,
      failed_only: failedOnly || undefined,
    }),
    [failedOnly, search, status, workflowName]
  );

  const runsQuery = useAutomationRuns(filters);
  const retryMutation = useRetryAutomationRun();
  const runs = runsQuery.data?.items ?? [];

  const failedCount = runs.filter((run) => run.status === 'failed').length;
  const successCount = runs.filter((run) => run.status === 'success').length;
  const runningCount = runs.filter((run) => run.status === 'running').length;

  function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchInput.trim());
    setWorkflowName(workflowInput.trim());
    setStatus(statusInput);
    setFailedOnly(failedOnlyInput);
  }

  async function handleRetry(runId: string) {
    await retryMutation.mutateAsync(runId);
  }

  return (
    <AdminShell>
      <PageShell density="compact">
      <Panel>
        <AdminPageHeader
          title="Automation Monitoring"
          subtitle="Track workflow history, inspect failed jobs, and trigger retry actions."
          actions={
            <Toolbar>
              <Link href="/admin/activities" className="ui-btn ui-btn-secondary ui-btn-md">
                Activities
              </Link>
              <Link href="/admin/dashboard" className="ui-btn ui-btn-secondary ui-btn-md">
                Dashboard
              </Link>
            </Toolbar>
          }
        />

        <div className="dg-kpi-grid">
          <article className="dg-card dg-kpi-card">
            <p className="dg-kpi-label">Workflow History</p>
            <p className="dg-kpi-value">{runs.length}</p>
            <p className="dg-kpi-meta">Recent automation runs</p>
          </article>
          <article className="dg-card dg-kpi-card">
            <p className="dg-kpi-label">Failed Jobs</p>
            <p className="dg-kpi-value">{failedCount}</p>
            <p className="dg-kpi-meta">Require investigation or retry</p>
          </article>
          <article className="dg-card dg-kpi-card">
            <p className="dg-kpi-label">Successful Runs</p>
            <p className="dg-kpi-value">{successCount}</p>
            <p className="dg-kpi-meta">Completed without errors</p>
          </article>
          <article className="dg-card dg-kpi-card">
            <p className="dg-kpi-label">Running</p>
            <p className="dg-kpi-value">{runningCount}</p>
            <p className="dg-kpi-meta">Active automation jobs</p>
          </article>
        </div>
      </Panel>

      <Panel>
          <form onSubmit={handleApply} className="dg-form-row">
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search workflow or error message..."
              className="dg-input dg-col-fill"
            />
            <input
              value={workflowInput}
              onChange={(event) => setWorkflowInput(event.target.value)}
              placeholder="Workflow name (optional)"
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
            <label className="dg-checkbox-item">
              <input
                type="checkbox"
                checked={failedOnlyInput}
                onChange={(event) => setFailedOnlyInput(event.target.checked)}
              />
              Failed only
            </label>
            <button type="submit" className="ui-btn ui-btn-primary ui-btn-md">
              Apply
            </button>
          </form>
      </Panel>

      <Panel>
          <div className="dg-admin-head">
            <h2 className="dg-title-sm">Automation Runs</h2>
            <span className="dg-badge">{runs.length} Total</span>
          </div>

          {runsQuery.isLoading && <p className="dg-muted-sm">Loading automation runs...</p>}
          {runsQuery.isError && (
            <p className="dg-alert-error">
              {runsQuery.error instanceof Error ? runsQuery.error.message : 'Failed to load automation runs.'}
            </p>
          )}

          {!runsQuery.isLoading && !runsQuery.isError && (
            <div className="ui-table-wrap">
              <table className="ui-table ui-table-density-compact">
                <thead>
                  <tr>
                    <th>Workflow</th>
                    <th>Status</th>
                    <th>Trigger</th>
                    <th>Entity</th>
                    <th>Started</th>
                    <th>Finished</th>
                    <th>Error</th>
                    <th>Retry</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.length > 0 ? (
                    runs.map((run) => (
                      <tr key={run.id}>
                        <td>{run.workflow_name}</td>
                        <td>
                          <span className={statusBadgeClass(run.status)}>{titleCase(run.status)}</span>
                        </td>
                        <td>{run.trigger_source || '-'}</td>
                        <td>
                          {run.trigger_entity_type || '-'}
                          {run.trigger_entity_id ? `:${run.trigger_entity_id.slice(0, 8)}` : ''}
                        </td>
                        <td>{formatDateTime(run.started_at)}</td>
                        <td>{formatDateTime(run.finished_at)}</td>
                        <td className="max-w-72 truncate">{run.error_message || '-'}</td>
                        <td>
                          <button
                            type="button"
                            className="ui-btn ui-btn-secondary ui-btn-md"
                            disabled={!run.retryable || retryMutation.isPending}
                            onClick={() => handleRetry(run.id)}
                          >
                            {retryMutation.isPending ? 'Retrying...' : run.retryable ? 'Retry' : 'N/A'}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8}>No automation runs found.</td>
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
