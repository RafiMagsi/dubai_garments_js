'use client';

import { ConfigExecutionAuditItem } from '@/features/admin/configuration';
import {
  formatDate,
  statusBadgeClass,
  titleCase,
} from '@/features/admin/configuration/utils/view-format';

type ExecutionAuditTableProps = {
  items: ConfigExecutionAuditItem[];
  emptyMessage: string;
  onViewOutput: (item: ConfigExecutionAuditItem) => void;
};

export default function ExecutionAuditTable({
  items,
  emptyMessage,
  onViewOutput,
}: ExecutionAuditTableProps) {
  return (
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
          {items.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            items.map((item) => (
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
                    <button type="button" className="dg-btn-secondary" onClick={() => onViewOutput(item)}>
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
  );
}
