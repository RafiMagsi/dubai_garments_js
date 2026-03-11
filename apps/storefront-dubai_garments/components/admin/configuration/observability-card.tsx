'use client';

type ObservabilityItem = {
  key: string;
  label: string;
  url: string;
};

type ObservabilityResult = {
  ok: boolean;
  status: number;
  durationMs: number;
  preview: string;
};

type ObservabilityCardProps = {
  items: ObservabilityItem[];
  loadingKey: string | null;
  results: Record<string, ObservabilityResult | undefined>;
  errorMessage: string;
  onCheck: (target: string) => void;
};

export default function ObservabilityCard({
  items,
  loadingKey,
  results,
  errorMessage,
  onCheck,
}: ObservabilityCardProps) {
  return (
    <article className="dg-card dg-panel">
      <div className="dg-admin-head">
        <h2 className="dg-title-sm">Observability</h2>
        <span className="dg-badge">{items.length} endpoints</span>
      </div>
      <p className="dg-muted-sm mb-3">Check runtime metrics and health endpoints directly from admin.</p>
      {errorMessage ? <p className="dg-alert-error">{errorMessage}</p> : null}
      <div className="dg-side-stack">
        {items.map((item) => {
          const result = results[item.key];
          return (
            <div key={item.key} className="dg-card dg-panel">
              <div className="dg-admin-head">
                <div>
                  <p className="dg-title-sm">{item.label}</p>
                  <p className="dg-list-meta">{item.url}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a href={item.url} target="_blank" rel="noreferrer" className="dg-btn-secondary">
                    Open
                  </a>
                  <button
                    type="button"
                    className="dg-btn-primary"
                    onClick={() => onCheck(item.key)}
                    disabled={loadingKey !== null}
                  >
                    {loadingKey === item.key ? 'Checking...' : 'Fetch Preview'}
                  </button>
                </div>
              </div>
              {result ? (
                <div className="mt-2">
                  <p className="dg-list-meta">
                    Status: {result.status} | Duration: {result.durationMs}ms | {result.ok ? 'OK' : 'Failed'}
                  </p>
                  <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
                    {result.preview || '(empty response)'}
                  </pre>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </article>
  );
}
