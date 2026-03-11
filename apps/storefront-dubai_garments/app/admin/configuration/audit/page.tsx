'use client';

import Link from 'next/link';
import { useState } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import { useConfigurationAudit } from '@/features/admin/configuration';

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function titleCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusBadgeClass(status?: string | null) {
  if (!status) return 'dg-status-pill';
  if (status === 'success') return 'dg-status-pill';
  if (status === 'failed') return 'dg-status-pill dg-status-pill-LOST';
  if (status === 'running') return 'dg-status-pill dg-status-pill-NEW';
  return 'dg-status-pill';
}

export default function AdminConfigurationAuditPage() {
  const auditQuery = useConfigurationAudit(200);
  const auditItems = auditQuery.data?.items ?? [];
  const [outputModal, setOutputModal] = useState<{
    open: boolean;
    command: string;
    status: string;
    output: string;
    input: string;
    executedAt: string;
  }>({
    open: false,
    command: '',
    status: '',
    output: '',
    input: '',
    executedAt: '',
  });

  return (
    <AdminShell>
      <section className="dg-admin-page">
        <div className="dg-admin-page-head">
          <div>
            <h1 className="dg-page-title">Execution Audit</h1>
            <p className="dg-page-subtitle">
              Full command execution history for Configuration scripts and terminal actions.
            </p>
          </div>
          <Link href="/admin/configuration" className="dg-btn-secondary">
            Back To Configuration
          </Link>
        </div>

        <article className="dg-card dg-panel">
          {auditQuery.isLoading && <p className="dg-muted-sm">Loading execution audit...</p>}
          {auditQuery.isError && (
            <p className="dg-alert-error">
              {auditQuery.error instanceof Error
                ? auditQuery.error.message
                : 'Failed to load execution audit records.'}
            </p>
          )}
          {!auditQuery.isLoading && !auditQuery.isError && (
            <div className="dg-table-wrap">
              <table className="dg-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>User</th>
                    <th>Type</th>
                    <th>Command</th>
                    <th>Status</th>
                    <th>Input</th>
                    <th>Output</th>
                  </tr>
                </thead>
                <tbody>
                  {auditItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center">
                        No audit records found.
                      </td>
                    </tr>
                  ) : (
                    auditItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <p className="dg-list-title">{formatDate(item.started_at)}</p>
                          <p className="dg-list-meta">Finished: {formatDate(item.finished_at)}</p>
                        </td>
                        <td>
                          <p className="dg-list-title">{item.user_email || 'Unknown user'}</p>
                          <p className="dg-list-meta">{item.user_id || '-'}</p>
                        </td>
                        <td>{titleCase(item.execution_type || 'unknown')}</td>
                        <td>
                          <p className="dg-list-title">{item.command_label || item.command_key}</p>
                          <p className="dg-list-meta">{item.command_key}</p>
                        </td>
                        <td>
                          <span className={statusBadgeClass(item.status)}>{titleCase(item.status)}</span>
                        </td>
                        <td className="max-w-72">
                          <pre className="whitespace-pre-wrap break-words text-xs text-slate-600">
                            {Object.keys(item.input_payload || {}).length > 0
                              ? JSON.stringify(item.input_payload, null, 2)
                              : '-'}
                          </pre>
                        </td>
                        <td>
                          {item.error_message || item.output_log ? (
                            <button
                              type="button"
                              className="dg-btn-secondary"
                              onClick={() =>
                                setOutputModal({
                                  open: true,
                                  command: item.command_label || item.command_key,
                                  status: item.status,
                                  output: item.error_message || item.output_log || '-',
                                  input:
                                    Object.keys(item.input_payload || {}).length > 0
                                      ? JSON.stringify(item.input_payload, null, 2)
                                      : '-',
                                  executedAt: item.started_at,
                                })
                              }
                            >
                              View Output
                            </button>
                          ) : (
                            <span className="dg-list-meta">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
      {outputModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
          <div className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-600">Execution Output</p>
                <h3 className="text-lg font-bold text-slate-900">{outputModal.command}</h3>
                <p className="mt-1 text-xs text-slate-500">Executed: {formatDate(outputModal.executedAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={statusBadgeClass(outputModal.status)}>
                  {titleCase(outputModal.status || 'unknown')}
                </span>
                <button
                  type="button"
                  className="dg-btn-secondary"
                  onClick={() => setOutputModal((prev) => ({ ...prev, open: false }))}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Input</p>
                <pre className="max-h-[50vh] overflow-auto rounded-xl bg-slate-100 p-3 text-xs text-slate-700">
                  {outputModal.input}
                </pre>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Output</p>
                <pre className="max-h-[50vh] overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
                  {outputModal.output}
                </pre>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
