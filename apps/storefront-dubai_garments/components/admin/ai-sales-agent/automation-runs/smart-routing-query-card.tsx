'use client';

import { Button, Card, CardText, CardTitle, TextField } from '@/components/ui';
import { AisFieldLabel } from '@/components/admin/ai-sales-agent/reusable';

type Props = {
  leadId: string;
  dealId: string;
  loading: boolean;
  onLeadIdChange: (value: string) => void;
  onDealIdChange: (value: string) => void;
  onRunRouting: () => void;
};

export default function SmartRoutingQueryCard({
  leadId,
  dealId,
  loading,
  onLeadIdChange,
  onDealIdChange,
  onRunRouting,
}: Props) {
  return (
    <Card className="pins-composer arscope-card">
      <p className="pins-kicker">Smart Routing Query</p>
      <CardTitle>Smart Routing + SLA</CardTitle>
      <CardText>
        Route opportunities intelligently and assess SLA risk before escalation.
      </CardText>

      <div className="pins-grid">
        <div>
          <AisFieldLabel>Lead ID</AisFieldLabel>
          <TextField
            value={leadId}
            onChange={(event) => onLeadIdChange(event.target.value)}
            placeholder="Optional Lead UUID"
            className="pins-input"
          />
        </div>

        <div>
          <AisFieldLabel>Deal ID</AisFieldLabel>
          <TextField
            value={dealId}
            onChange={(event) => onDealIdChange(event.target.value)}
            placeholder="Optional Deal UUID"
            className="pins-input"
          />
        </div>
      </div>

      <div className="pins-actions">
        <Button type="button" variant="secondary" onClick={onRunRouting} disabled={loading}>
          {loading ? 'Running...' : 'Run Smart Routing + SLA'}
        </Button>
      </div>
    </Card>
  );
}
