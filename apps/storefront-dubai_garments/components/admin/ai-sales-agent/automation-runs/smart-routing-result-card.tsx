'use client';

import { Card, CardTitle } from '@/components/ui';
import type { SmartRoutingSlaEnvelope } from '@/features/admin/ai-sales-agent/types';
import { AisTrustBadges } from '@/components/admin/ai-sales-agent/reusable';

type Props = {
  response: SmartRoutingSlaEnvelope;
};

export default function SmartRoutingResultCard({ response }: Props) {
  return (
    <Card className="pins-card arscope-result-card">
      <CardTitle>Smart Routing + SLA Result</CardTitle>
      <div className="pins-next-action">{response.data.recommendedAction}</div>
      <AisTrustBadges
        processingMs={response.processingMs}
        fallbackUsed={response.fallbackUsed}
        provider={response.provider}
        source={response.source}
        className="pins-badges"
      />

      <div className="pins-grid">
        <div className="pins-item">
          <div className="pins-kicker">Routing</div>
          <div className="pins-item-text">Owner: {response.data.recommendedOwner || 'Unassigned'}</div>
          <div className="pins-item-text">{response.data.routingReason}</div>
        </div>

        <div className="pins-item">
          <div className="pins-kicker">SLA</div>
          <div className="pins-item-text">Bucket: {response.data.slaBucket}</div>
          <div className="pins-item-text">{response.data.slaReason}</div>
        </div>
      </div>
    </Card>
  );
}
