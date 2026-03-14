import { ObservabilityTargetItem } from '@/features/admin/observability';
import { statusBadgeClass } from '@/features/admin/shared/view-format';

type PreviewResult = {
  ok: boolean;
  status: number;
  durationMs: number;
  preview: string;
};

type EndpointPreviewsPanelProps = {
  targets: ObservabilityTargetItem[];
  activeTarget: string | null;
  results: Record<string, PreviewResult | undefined>;
  onFetch: (target: string) => void;
};

export default function EndpointPreviewsPanel({
  targets,
  activeTarget,
  results,
  onFetch,
}: EndpointPreviewsPanelProps) {
  return (
    <article className="dg-card dg-panel">
      <div className="dg-admin-head">
        <h2 className="dg-title-sm">Endpoint Probes</h2>
        <span className="dg-badge">{targets.length} targets</span>
      </div>
      <p className="dg-muted-sm">Fetch live previews for metrics and health endpoints through observability service.</p>

      <div className="dg-side-stack mt-3">
        {targets.map((target) => {
          const result = results[target.key];
          return (
            <article key={target.key} className="dg-card dg-panel">
              <div className="dg-admin-head">
                <div>
                  <p className="dg-title-sm">{target.label}</p>
                  <p className="dg-list-meta">{target.url}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a href={target.url} target="_blank" rel="noreferrer" className="ui-btn ui-btn-secondary ui-btn-md">
                    Open
                  </a>
                  <button
                    type="button"
                    className="ui-btn ui-btn-primary ui-btn-md"
                    onClick={() => onFetch(target.key)}
                    disabled={Boolean(activeTarget)}
                  >
                    {activeTarget === target.key ? 'Fetching...' : 'Fetch Preview'}
                  </button>
                </div>
              </div>
              {result ? (
                <div className="mt-2">
                  <p className="dg-list-meta">
                    <span className={statusBadgeClass(result.ok ? 'success' : 'failed')}>
                      {result.ok ? 'OK' : 'Failed'}
                    </span>{' '}
                    Status {result.status} in {result.durationMs}ms
                  </p>
                  <pre className="mt-2 max-h-72 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
                    {result.preview || '(empty response)'}
                  </pre>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </article>
  );
}
