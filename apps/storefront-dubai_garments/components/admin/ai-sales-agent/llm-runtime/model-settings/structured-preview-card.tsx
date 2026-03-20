'use client';

import { Card, CardText, CardTitle } from '@/components/ui';
import { AisBadge } from '@/components/admin/ai-sales-agent/reusable';
import type { AiPromptTestEnvelope } from '@/features/admin/ai-sales-agent/types';

type Props = {
  loading: boolean;
  response: AiPromptTestEnvelope | null;
  error: string | null;
};

export default function StructuredPreviewCard({ loading, response, error }: Props) {
  if (loading) {
    return (
      <Card className="pins-card" data-testid="model-settings-structured-preview-card">
        <CardTitle>Structured Output Preview</CardTitle>
        <CardText className="pins-muted">Running prompt test and validating schema...</CardText>
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        className="pins-card pins-card-error"
        data-testid="model-settings-structured-preview-error-card"
      >
        <CardTitle>Structured Output Preview</CardTitle>
        <CardText>{error}</CardText>
      </Card>
    );
  }

  if (!response) {
    return (
      <Card className="pins-card" data-testid="model-settings-structured-preview-empty-card">
        <CardTitle>Structured Output Preview</CardTitle>
        <CardText className="pins-muted">
          No test run yet. Execute a prompt test to inspect parsed output and schema status.
        </CardText>
      </Card>
    );
  }

  return (
    <Card className="pins-card" data-testid="model-settings-structured-preview-card">
      <CardTitle>Structured Output Preview</CardTitle>
      <div className="pins-badges">
        <AisBadge
          tone={response.schemaValid ? 'green' : 'amber'}
          className="dg-font-semibold"
          data-testid="model-settings-schema-status-badge"
        >
          Schema: {response.schemaValid ? 'Valid' : 'Invalid'}
        </AisBadge>
        <AisBadge tone="slate">Provider: {response.provider}</AisBadge>
        <AisBadge tone="slate">Model: {response.model}</AisBadge>
        <AisBadge tone={response.fallbackUsed ? 'amber' : 'green'}>
          Fallback Used: {response.fallbackUsed ? 'Yes' : 'No'}
        </AisBadge>
        <AisBadge tone="blue">Latency: {response.latencyMs}ms</AisBadge>
      </div>

      {response.parseIssues.length > 0 ? (
        <div className="pins-list" data-testid="model-settings-parse-issues-list">
          {response.parseIssues.map((issue, index) => (
            <div key={`${issue}-${index}`} className="pins-item">
              <div className="pins-item-text dg-text-amber-700">{issue}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div>
        <p className="pins-kicker">Parsed JSON</p>
        <pre className="dg-mt-2 dg-overflow-x-auto dg-rounded-md dg-border dg-border-[var(--color-border)] dg-bg-slate-50 dg-p-3 dg-text-xs dg-leading-5 dg-whitespace-pre-wrap dg-break-words" data-testid="model-settings-parsed-output-block">
          {JSON.stringify(response.parsed, null, 2)}
        </pre>
      </div>

      <details className="dg-mt-2" data-testid="model-settings-raw-output-section">
        <summary className="dg-cursor-pointer dg-text-sm dg-font-semibold">
          Raw Model Output
        </summary>
        <pre className="dg-mt-2 dg-overflow-x-auto dg-rounded-md dg-border dg-border-[var(--color-border)] dg-bg-slate-50 dg-p-3 dg-text-xs dg-leading-5 dg-whitespace-pre-wrap dg-break-words" data-testid="model-settings-raw-output-block">
          {response.rawOutput}
        </pre>
      </details>
    </Card>
  );
}
