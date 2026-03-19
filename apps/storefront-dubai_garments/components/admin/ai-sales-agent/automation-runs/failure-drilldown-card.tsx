'use client';

import { Card, CardText, CardTitle } from '@/components/ui';
import type { AutomationRunDetailItem } from '@/features/admin/ai-sales-agent/types';

type Props = {
  items: AutomationRunDetailItem[];
};

function remediationHint(item: AutomationRunDetailItem) {
  if (!item.failureMetadata) return null;

  if (item.failureMetadata.toLowerCase().includes('owner')) {
    return 'Check owner assignment and rerun after ownership is fixed.';
  }

  if (item.failureMetadata.toLowerCase().includes('quote')) {
    return 'Validate quote input completeness before rerun.';
  }

  return 'Review workflow input/output summary and retry only if guardrails pass.';
}

export default function FailureDrilldownCard({ items }: Props) {
  const failed = items.filter((item) => item.failureMetadata);

  return (
    <Card className="pins-card arscope-result-card">
      <CardTitle>Failure Drilldown</CardTitle>
      {failed.length === 0 ? (
        <CardText className="pins-muted">No failed automation runs found for current page.</CardText>
      ) : (
        <div className="pins-list">
          {failed.map((item) => (
            <div key={item.id} className="pins-item">
              <div className="pins-item-head">
                <div className="pins-item-title">{item.workflowName}</div>
                <span className="dg-ai-badge dg-ai-badge-amber">Needs Review</span>
              </div>
              <div className="pins-item-text dg-text-rose-700">
                Failure: {item.failureMetadata}
              </div>
              <div className="pins-item-text">
                Hint: {remediationHint(item)}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
