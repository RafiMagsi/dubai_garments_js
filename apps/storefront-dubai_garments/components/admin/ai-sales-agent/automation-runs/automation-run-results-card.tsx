'use client';

import { Button, Card, CardTitle } from '@/components/ui';
import type { AutomationRunDetailEnvelope, AutomationRunDetailItem } from '@/features/admin/ai-sales-agent/types';
import { AisTrustBadges } from '../reusable';

type Props = {
  response: AutomationRunDetailEnvelope;
  page: number;
  totalPages: number;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
};

export default function AutomationRunResultsCard({
  response,
  page,
  totalPages,
  loading,
  onPrev,
  onNext,
}: Props) {
  return (
    <Card className="pins-card arscope-result-card">
      <CardTitle>Automation Run Results</CardTitle>
      <AisTrustBadges
        processingMs={response.processingMs}
        fallbackUsed={false}
        provider="workflow_engine"
        source="automation_runs_table"
        className="pins-badges"
      />

      <div className="pins-list">
        {response.items.length === 0 ? (
          <p className="pins-muted">No automation runs found for current filters.</p>
        ) : (
          response.items.map((item: AutomationRunDetailItem) => (
            <div key={item.id} className="pins-item">
              <div className="pins-item-title">
                {item.workflowName} · {item.status.toUpperCase()}
              </div>
              <div className="pins-item-text">Trigger: {item.triggerSource || 'n/a'}</div>
              <div className="pins-item-text">Input: {item.inputSummary}</div>
              <div className="pins-item-text">Output: {item.outputSummary}</div>
              {item.failureMetadata ? (
                <div className="pins-item-text dg-text-rose-700">Failure: {item.failureMetadata}</div>
              ) : null}
              <div className="dg-text-xs dg-text-neutral-500">{item.createdAt}</div>
            </div>
          ))
        )}
      </div>

      <div className="pins-actions arscope-pagination">
        <div className="arscope-pagination-left">
          <Button type="button" variant="secondary" onClick={onPrev} disabled={page <= 1 || loading}>
            Prev
          </Button>
        </div>
        <div className="arscope-pagination-center">
          <span className="arscope-page-chip">
            Page {page} / {totalPages}
          </span>
        </div>
        <div className="arscope-pagination-right">
          <Button type="button" variant="secondary" onClick={onNext} disabled={loading || page >= totalPages}>
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}
