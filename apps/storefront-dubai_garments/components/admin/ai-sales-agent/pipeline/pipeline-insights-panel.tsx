'use client';

import { useState } from 'react';
import { Button, Card, CardText, CardTitle, TextField } from '@/components/ui';
import { runPipelineInsights } from '@/features/admin/ai-sales-agent/api';
import type { PipelineInsightEnvelope } from '@/features/admin/ai-sales-agent/types';
import { AisFieldLabel } from '@/components/admin/ai-sales-agent/reusable';
import PipelineInsightCards from '@/components/admin/ai-sales-agent/pipeline/pipeline-insight-cards';

export default function PipelineInsightsPanel() {
  const [leadId, setLeadId] = useState('');
  const [dealId, setDealId] = useState('');
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<PipelineInsightEnvelope | null>(null);

  async function handleRun() {
    try {
      setError(null);
      setLoading(true);

      const result = await runPipelineInsights({
        leadId: leadId.trim() || undefined,
        dealId: dealId.trim() || undefined,
        dry_run: dryRun,
      });

      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run pipeline insights.');
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pins-scope pins-stack" data-testid="pipeline-insights-panel">
      <div className="qrec-composer pins-composer" data-testid="pipeline-insights-input-card">
        <p className="qrec-kicker pins-kicker">Pipeline Query</p>
        <p className="qrec-subtitle pins-subtitle">
          Query lead/deal context for stall detection, risk scoring, urgency queue, and next move.
        </p>

        <div className="qrec-grid pins-grid">
          <div>
            <AisFieldLabel>Lead ID</AisFieldLabel>
            <TextField
              value={leadId}
              onChange={(event) => setLeadId(event.target.value)}
              placeholder="Optional Lead UUID"
              className="pins-input"
              data-testid="pipeline-insights-lead-id-input"
            />
          </div>

          <div>
            <AisFieldLabel>Deal ID</AisFieldLabel>
            <TextField
              value={dealId}
              onChange={(event) => setDealId(event.target.value)}
              placeholder="Optional Deal UUID"
              className="pins-input"
              data-testid="pipeline-insights-deal-id-input"
            />
          </div>
        </div>

        <div className="qrec-actions pins-actions">
          <label className="dg-flex dg-items-center dg-gap-2 dg-text-sm">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(event) => setDryRun(event.target.checked)}
            />
            Dry run
          </label>

          <Button type="button" onClick={handleRun} disabled={loading}>
            {loading ? 'Scanning pipeline...' : 'Run Pipeline Insights'}
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="pins-card pins-card-error" data-testid="pipeline-insights-error-card">
          <CardTitle>Pipeline Insights Error</CardTitle>
          <CardText>{error}</CardText>
        </Card>
      ) : null}

      {response?.ok ? <PipelineInsightCards response={response} /> : null}
    </div>
  );
}
