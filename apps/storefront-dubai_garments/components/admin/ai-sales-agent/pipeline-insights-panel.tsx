'use client';

import { useState } from 'react';
import { Button, Card, CardText, CardTitle, TextField } from '@/components/ui';
import { runPipelineInsights } from '@/features/admin/ai-sales-agent/api';
import type {
  PipelineInsightEnvelope,
  PipelineInsightQueueItem,
  PipelineInsightReason,
} from '@/features/admin/ai-sales-agent/types';
import { AisBadge, AisFieldLabel, AisTrustBadges } from './reusable';

export default function PipelineInsightsPanel() {
  const [leadId, setLeadId] = useState('');
  const [dealId, setDealId] = useState('');
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<PipelineInsightEnvelope | null>(null);

  function impactTone(impact: PipelineInsightReason['impact']) {
    if (impact === 'high') return 'red' as const;
    if (impact === 'medium') return 'amber' as const;
    return 'green' as const;
  }

  function urgencyTone(urgency: PipelineInsightQueueItem['urgency']) {
    if (urgency === 'critical') return 'red' as const;
    if (urgency === 'high') return 'amber' as const;
    if (urgency === 'medium') return 'blue' as const;
    return 'slate' as const;
  }

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

      {response?.ok ? (
        <>
          <Card className="pins-card" data-testid="pipeline-insights-summary-card">
            <CardTitle>Insight Summary</CardTitle>
            <CardText>{response.data.summary}</CardText>

            <div className="pins-badges">
              <AisTrustBadges
                processingMs={response.processingMs}
                fallbackUsed={response.fallbackUsed}
                provider={response.provider}
                source={response.source}
                className="pins-badges"
              />
              <AisBadge tone={response.data.riskScore >= 70 ? 'red' : response.data.riskScore >= 45 ? 'amber' : 'green'}>
                Risk Score: {response.data.riskScore}
              </AisBadge>
              <AisBadge tone={response.data.stageAgeDays >= 7 ? 'amber' : 'slate'}>
                Stage Age: {response.data.stageAgeDays}d
              </AisBadge>
              <AisBadge tone={response.data.inactivityDays >= 5 ? 'amber' : 'slate'}>
                Inactivity: {response.data.inactivityDays}d
              </AisBadge>
              <AisBadge tone={response.data.stalled ? 'red' : 'green'}>
                {response.data.stalled ? 'Stalled' : 'Active'}
              </AisBadge>
            </div>
          </Card>

          <Card className="pins-card" data-testid="pipeline-insights-risk-card">
            <CardTitle>Risk Score Reasons</CardTitle>
            <div className="pins-list">
              {response.data.riskReasons.map((item: PipelineInsightReason, index: number) => (
                <article key={`${item.label}-${index}`} className="pins-item">
                  <div className="pins-item-head">
                    <div className="pins-item-title">{item.label}</div>
                    <AisBadge tone={impactTone(item.impact)}>Impact: {item.impact.toUpperCase()}</AisBadge>
                  </div>
                </article>
              ))}
            </div>
          </Card>

          <Card className="pins-card" data-testid="pipeline-insights-queue-card">
            <CardTitle>Urgency Queue</CardTitle>
            <div className="pins-list">
              {response.data.urgencyQueue.map((item: PipelineInsightQueueItem, index: number) => (
                <article key={`${item.title}-${index}`} className="pins-item">
                  <div className="pins-item-head">
                    <div className="pins-item-title">{item.title}</div>
                    <AisBadge tone={urgencyTone(item.urgency)}>Urgency: {item.urgency.toUpperCase()}</AisBadge>
                  </div>
                  <div className="pins-item-text">{item.reason}</div>
                </article>
              ))}
            </div>
          </Card>

          <Card className="pins-card" data-testid="pipeline-insights-next-action-card">
            <CardTitle>Recommended Next Action</CardTitle>
            <div className="pins-next-action">{response.data.nextAction}</div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
