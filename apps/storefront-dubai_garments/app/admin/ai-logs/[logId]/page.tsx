'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/common/page-header';
import AdminShell from '@/components/admin/admin-shell';
import { PageShell, Panel, StatusBadge, Toolbar } from '@/components/ui';
import { useAiLogById } from '@/features/admin/ai-logs';
import { formatDateTime } from '@/features/admin/shared/view-format';

export default function AdminAiLogDetailsPage() {
  const params = useParams<{ logId: string }>();
  const logId = typeof params.logId === 'string' ? params.logId : '';
  const { data, isLoading, isError, error } = useAiLogById(logId);
  const log = data?.item;

  return (
    <AdminShell>
      <PageShell density="compact">
        <Panel>
          <AdminPageHeader
            title={`AI Log #${logId.slice(0, 8)}`}
            subtitle="Execution trace detail with input/output payloads."
            actions={
              <Toolbar>
                <Link href="/admin/ai-logs" className="ui-btn ui-btn-secondary ui-btn-md">
                  Back to AI Logs
                </Link>
              </Toolbar>
            }
          />
        </Panel>

        <Panel>
          {isLoading && <p className="dg-muted-sm">Loading AI log...</p>}
          {isError && (
            <p className="dg-alert-error">
              {error instanceof Error ? error.message : 'Failed to load AI log.'}
            </p>
          )}

          {log ? (
            <div className="dg-record-detail-grid">
              <div className="dg-side-stack">
                <div className="dg-card">
                  <div className="dg-admin-head">
                    <h2 className="dg-title-sm">Trace Summary</h2>
                    <StatusBadge status={log.status}>{log.status}</StatusBadge>
                  </div>
                  <div className="dg-detail-list">
                    <div className="dg-detail-item">
                      <span>Workflow</span>
                      <strong>{log.workflow_name}</strong>
                    </div>
                    <div className="dg-detail-item">
                      <span>Provider</span>
                      <strong>{log.provider || '-'}</strong>
                    </div>
                    <div className="dg-detail-item">
                      <span>Model</span>
                      <strong>{log.model || '-'}</strong>
                    </div>
                    <div className="dg-detail-item">
                      <span>Fallback Used</span>
                      <strong>{log.fallback_used ? 'Yes' : 'No'}</strong>
                    </div>
                    <div className="dg-detail-item">
                      <span>Latency</span>
                      <strong>{typeof log.latency_ms === 'number' ? `${log.latency_ms}ms` : '-'}</strong>
                    </div>
                    <div className="dg-detail-item">
                      <span>Created</span>
                      <strong>{formatDateTime(log.created_at)}</strong>
                    </div>
                    <div className="dg-detail-item">
                      <span>Entity</span>
                      <strong>
                        {log.trigger_entity_type || '-'}
                        {log.trigger_entity_id ? `:${log.trigger_entity_id}` : ''}
                      </strong>
                    </div>
                  </div>
                  {log.error_message ? (
                    <div className="dg-summary-card">
                      <h3 className="dg-title-sm">Error</h3>
                      <p className="dg-muted-sm whitespace-pre-wrap">{log.error_message}</p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="dg-side-stack">
                <div className="dg-card">
                  <h2 className="dg-title-sm">Input Payload</h2>
                  <pre className="dg-code-block">
                    {JSON.stringify(log.input_payload || {}, null, 2)}
                  </pre>
                </div>
                <div className="dg-card">
                  <h2 className="dg-title-sm">Output Payload</h2>
                  <pre className="dg-code-block">
                    {JSON.stringify(log.output_payload || {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ) : null}
        </Panel>
      </PageShell>
    </AdminShell>
  );
}
