'use client';

import { Card, CardTitle } from '@/components/ui';
import type { AutomationRunDetailItem } from '@/features/admin/ai-sales-agent/types';

type Props = {
  items: AutomationRunDetailItem[];
};

export default function AutomationRunTimeline({ items }: Props) {
  return (
    <Card className="pins-card arscope-result-card">
      <CardTitle>Automation Runs Timeline</CardTitle>

      <div className="pins-list">
        {items.length === 0 ? (
          <p className="pins-muted">No timeline items available for this page.</p>
        ) : (
          items.map((item) => (
          <div key={item.id} className="pins-item">
            <div className="pins-item-head">
              <div className="pins-item-title">{item.workflowName}</div>
              <span className="dg-badge">Status: {item.status.toUpperCase()}</span>
            </div>
            <div className="dg-text-xs dg-text-neutral-500">{item.createdAt}</div>
            <div className="pins-item-text">
              Trigger: {item.triggerSource || 'n/a'}
            </div>
          </div>
          ))
        )}
      </div>
    </Card>
  );
}
