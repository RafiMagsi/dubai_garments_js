import { ObservabilityCheckItem } from '@/features/admin/observability';
import { statusBadgeClass, titleCase } from '@/features/admin/shared/view-format';

type ServiceChecksPanelProps = {
  overallOk: boolean;
  generatedAt?: number;
  checks: ObservabilityCheckItem[];
  isRefreshing: boolean;
  onRefresh: () => void;
};

export default function ServiceChecksPanel({
  overallOk,
  generatedAt,
  checks,
  isRefreshing,
  onRefresh,
}: ServiceChecksPanelProps) {
  const updatedAt = generatedAt ? new Date(generatedAt * 1000).toLocaleString() : '-';

  return (
    <article className="dg-card dg-panel">
      <div className="dg-admin-head">
        <div>
          <h2 className="dg-title-sm">Service Health Checks</h2>
          <p className="dg-list-meta">Last update: {updatedAt}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={statusBadgeClass(overallOk ? 'success' : 'failed')}>
            {overallOk ? 'Healthy' : 'Degraded'}
          </span>
          <button type="button" className="ui-btn ui-btn-secondary ui-btn-md" onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? 'Refreshing...' : 'Refresh Checks'}
          </button>
        </div>
      </div>

      <div className="ui-table-wrap mt-3">
        <table className="ui-table ui-table-density-compact">
          <thead>
            <tr>
              <th>Target</th>
              <th>Type</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {checks.map((check) => (
              <tr key={check.key}>
                <td>
                  <p className="dg-list-title">{titleCase(check.key)}</p>
                  <p className="dg-list-meta">{check.url}</p>
                </td>
                <td>{titleCase(check.kind)}</td>
                <td>
                  <span className={statusBadgeClass(check.ok ? 'success' : 'failed')}>
                    {check.ok ? check.status || 200 : check.status || 'Error'}
                  </span>
                </td>
                <td>{check.durationMs}ms</td>
                <td className="max-w-[26rem] truncate">{check.detail || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
