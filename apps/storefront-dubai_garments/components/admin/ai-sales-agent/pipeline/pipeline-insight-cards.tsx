'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { executePipelineInsightAction } from '@/features/admin/ai-sales-agent/api';
import { AisTrustBadges } from '@/components/admin/ai-sales-agent/reusable';
import type {
  PipelineInsightEnvelope,
  PipelineInsightQueueItem,
  PipelineInsightReason,
} from '@/features/admin/ai-sales-agent/types';

type Props = {
  response: PipelineInsightEnvelope;
  compact?: boolean;
};

export default function PipelineInsightCards({ response, compact = false }: Props) {
  const [executing, setExecuting] = useState<null | string>(null);
  const [executionStatus, setExecutionStatus] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  async function handleAction(action: 'draft_followup' | 'assign_owner' | 'move_stage_suggestion') {
    try {
      setExecutionError(null);
      setExecutionStatus(null);
      setExecuting(action);

      const result = await executePipelineInsightAction({
        action,
        leadId: response.leadId || undefined,
        dealId: response.dealId || undefined,
        payload:
          action === 'move_stage_suggestion'
            ? { suggestedStage: 'qualified' }
            : undefined,
        dry_run: true,
      });

      setExecutionStatus(result.outcome);
    } catch (err) {
      setExecutionError(
        err instanceof Error ? err.message : 'Failed to execute pipeline action.'
      );
    } finally {
      setExecuting(null);
    }
  }

  return (
    <div className="pins-stack">
      <article className="pins-card">
        <div className="pins-item-head">
          <p className="pins-kicker">Pipeline Insight Summary</p>
        </div>
        <p className="pins-item-text">{response.data.summary}</p>
        <AisTrustBadges
          processingMs={response.processingMs}
          fallbackUsed={response.fallbackUsed}
          provider={response.provider}
          model={response.model}
          source={response.source}
          schemaValid={response.schemaValid}
        />

        <div className="pins-badges">
          <span className="dg-badge">Risk Score: {response.data.riskScore}</span>
          <span className="dg-badge">Stage Age: {response.data.stageAgeDays}d</span>
          <span className="dg-badge">Inactivity: {response.data.inactivityDays}d</span>
          <span className="dg-badge">{response.data.stalled ? 'Stalled' : 'Active'}</span>
        </div>
      </article>

      <div className={compact ? 'pins-grid' : 'pins-grid'}>
        <article className="pins-card">
          <div className="pins-item-head">
            <p className="pins-kicker">Risk Score Reasons</p>
          </div>
          <div className="pins-list">
            {response.data.riskReasons.map((item: PipelineInsightReason, index: number) => (
              <div
                key={`${item.label}-${index}`}
                className="pins-item"
              >
                <div className="pins-item-head">
                  <p className="pins-item-title">{item.label}</p>
                </div>
                <div className="pins-item-text">
                  Impact: {item.impact.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="pins-card">
          <div className="pins-item-head">
            <p className="pins-kicker">Urgency Queue</p>
          </div>
          <div className="pins-list">
            {response.data.urgencyQueue.map((item: PipelineInsightQueueItem, index: number) => (
              <div
                key={`${item.title}-${index}`}
                className="pins-item"
              >
                <div className="pins-item-head">
                  <p className="pins-item-title">{item.title}</p>
                </div>
                <div className="pins-item-text">
                  Urgency: {item.urgency.toUpperCase()}
                </div>
                <div className="pins-item-text">
                  {item.reason}
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="pins-card">
        <div className="pins-item-head">
          <p className="pins-kicker">Next-Best Action</p>
        </div>
        <div className="pins-next-action">{response.data.nextAction}</div>

        <div className="pins-actions">
          <Button
            type="button"
            onClick={() => handleAction('draft_followup')}
            disabled={executing !== null}
          >
            {executing === 'draft_followup' ? 'Running...' : 'One-click Follow-up Draft'}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => handleAction('assign_owner')}
            disabled={executing !== null}
          >
            {executing === 'assign_owner' ? 'Running...' : 'Assign Owner'}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => handleAction('move_stage_suggestion')}
            disabled={executing !== null}
          >
            {executing === 'move_stage_suggestion' ? 'Running...' : 'Move Stage Suggestion'}
          </Button>

          {response.leadId ? (
            <Link href={`/admin/leads/${response.leadId}`} className="ui-btn ui-btn-secondary ui-btn-md">
              Open Lead
            </Link>
          ) : null}
        </div>

        {executionStatus ? (
          <div className="dg-rounded-xl dg-border dg-border-emerald-200 dg-bg-emerald-50 dg-p-3 dg-text-sm dg-text-emerald-700">
            {executionStatus}
          </div>
        ) : null}

        {executionError ? (
          <div className="dg-rounded-xl dg-border dg-border-rose-200 dg-bg-rose-50 dg-p-3 dg-text-sm dg-text-rose-700">
            {executionError}
          </div>
        ) : null}
      </article>
    </div>
  );
}
