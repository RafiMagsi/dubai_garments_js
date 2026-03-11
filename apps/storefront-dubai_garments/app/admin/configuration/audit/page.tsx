'use client';

import Link from 'next/link';
import { useState } from 'react';
import AdminPageHeader from '@/components/admin/common/page-header';
import AdminShell from '@/components/admin/admin-shell';
import ExecutionAuditTable from '@/components/admin/configuration/execution-audit-table';
import ExecutionOutputModal, {
  ExecutionOutputModalState,
} from '@/components/admin/configuration/execution-output-modal';
import {
  ConfigExecutionAuditItem,
  useConfigurationAudit,
} from '@/features/admin/configuration';

export default function AdminConfigurationAuditPage() {
  const auditQuery = useConfigurationAudit(200);
  const auditItems = auditQuery.data?.items ?? [];
  const [outputModal, setOutputModal] = useState<ExecutionOutputModalState>({
    open: false,
    command: '',
    status: '',
    output: '',
    input: '',
    executedAt: '',
  });

  function openOutputModal(item: ConfigExecutionAuditItem) {
    setOutputModal({
      open: true,
      command: item.command_label || item.command_key,
      status: item.status,
      output: item.error_message || item.output_log || '-',
      input:
        Object.keys(item.input_payload || {}).length > 0 ? JSON.stringify(item.input_payload, null, 2) : '-',
      executedAt: item.started_at,
    });
  }

  return (
    <AdminShell>
      <section className="dg-admin-page">
        <AdminPageHeader
          title="Command Execution Audit"
          subtitle="Full command execution history for Configuration scripts and terminal actions."
          actions={
            <Link href="/admin/configuration" className="dg-btn-secondary">
              Back To Configuration
            </Link>
          }
        />

        <article className="dg-card dg-panel">
          {auditQuery.isLoading && <p className="dg-muted-sm">Loading execution audit...</p>}
          {auditQuery.isError && (
            <p className="dg-alert-error">
              {auditQuery.error instanceof Error
                ? auditQuery.error.message
                : 'Failed to load command execution audit records.'}
            </p>
          )}
          {!auditQuery.isLoading && !auditQuery.isError && (
            <ExecutionAuditTable
              items={auditItems}
              emptyMessage="No audit records found."
              onViewOutput={openOutputModal}
            />
          )}
        </article>
      </section>
      <ExecutionOutputModal
        state={outputModal}
        onClose={() => setOutputModal((prev) => ({ ...prev, open: false }))}
      />
    </AdminShell>
  );
}
