'use client';

import { Button, Card, CardTitle } from '@/components/ui';
import type { AutomationRunDetailEnvelope, AutomationRunDetailItem } from '@/features/admin/ai-sales-agent/types';
import { AisTrustBadges } from '@/components/admin/ai-sales-agent/reusable';
import { rerunAutomationRun } from '@/features/admin/ai-sales-agent/api';
import { useState } from 'react';

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
  const [rerunStatus, setRerunStatus] = useState<string | null>(null);
  const [rerunError, setRerunError] = useState<string | null>(null);
  const [rerunningId, setRerunningId] = useState<string | null>(null);

  async function handleRerun(runId: string) {
    try {
      setRerunStatus(null);
      setRerunError(null);
      setRerunningId(runId);

      const result = await rerunAutomationRun({
        runId,
      });

      const guardrailLabel = result.guardrailPassed ? 'Guardrails passed' : 'Guardrails blocked';
      setRerunStatus(`${guardrailLabel}: ${result.outcome}`);
    } catch (err) {
      setRerunError(err instanceof Error ? err.message : 'Failed to rerun.');
    } finally {
      setRerunningId(null);
    }
  }

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
              <div className="pins-item-head">
                <div className="pins-item-title">
                  {item.workflowName}
                </div>
                <span className="dg-badge">Status: {item.status.toUpperCase()}</span>
              </div>
              <div className="pins-item-text">Trigger: {item.triggerSource || 'n/a'}</div>
              <div className="pins-item-text">Input: {item.inputSummary}</div>
              <div className="pins-item-text">Output: {item.outputSummary}</div>
              {item.failureMetadata ? (
                <div className="pins-item-text dg-text-rose-700">Failure: {item.failureMetadata}</div>
              ) : null}
              <div className="dg-text-xs dg-text-neutral-500">{item.createdAt}</div>
              <div className="dg-mt-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleRerun(item.id)}
                  disabled={rerunningId !== null}
                >
                  {rerunningId === item.id ? 'Checking guardrails...' : 'Rerun'}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {rerunStatus ? (
        <div className="dg-mt-4 dg-rounded-xl dg-border dg-border-emerald-200 dg-bg-emerald-50 dg-p-3 dg-text-sm dg-text-emerald-700">
          {rerunStatus}
        </div>
      ) : null}

      {rerunError ? (
        <div className="dg-mt-4 dg-rounded-xl dg-border dg-border-rose-200 dg-bg-rose-50 dg-p-3 dg-text-sm dg-text-rose-700">
          {rerunError}
        </div>
      ) : null}

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
