'use client';

import { Button, CardText, CardTitle, TextField } from '@/components/ui';
import { AisFieldLabel } from '@/components/admin/ai-sales-agent/reusable';
import { FlowShellCard } from '@/components/admin/ai-sales-agent/flow/flow-cards';

type FlowQuerySectionProps = {
  showHeader: boolean;
  completionPercent: number;
  hasFlow: boolean;
  leadId: string;
  dealId: string;
  loading: boolean;
  onLeadIdChange: (value: string) => void;
  onDealIdChange: (value: string) => void;
  onRunFlow: () => void;
};

export function FlowQuerySection({
  showHeader,
  completionPercent,
  hasFlow,
  leadId,
  dealId,
  loading,
  onLeadIdChange,
  onDealIdChange,
  onRunFlow,
}: FlowQuerySectionProps) {
  return (
    <FlowShellCard className={`aflow-shell ${showHeader ? '' : 'aflow-shell-embedded'}`.trim()}>
      {showHeader ? (
        <>
          <div className="aflow-header aflow-shell-topline">
            <CardTitle>Lead-to-Close Agent Flow</CardTitle>
            {hasFlow ? <span className="dg-ai-badge dg-ai-badge-violet">Completion {completionPercent}%</span> : null}
          </div>
          <CardText>Query lead/deal context and map its AI execution journey end-to-end.</CardText>
        </>
      ) : (
        <div className="aflow-header aflow-embedded-head">
          <p className="aflow-kicker">AI Flow Query</p>
          {hasFlow ? <span className="dg-ai-badge dg-ai-badge-violet">Completion {completionPercent}%</span> : null}
        </div>
      )}

      <div className="aflow-query-grid">
        <div>
          <AisFieldLabel>Lead ID</AisFieldLabel>
          <TextField
            value={leadId}
            onChange={(event) => onLeadIdChange(event.target.value)}
            placeholder="Optional lead ID"
            className="dg-mt-1"
          />
        </div>

        <div>
          <AisFieldLabel>Deal ID</AisFieldLabel>
          <TextField
            value={dealId}
            onChange={(event) => onDealIdChange(event.target.value)}
            placeholder="Optional deal ID"
            className="dg-mt-1"
          />
        </div>

        <div className="aflow-query-action">
          <Button type="button" onClick={onRunFlow} disabled={loading}>
            {loading ? 'Loading...' : 'Run Agent Flow'}
          </Button>
          <p className="aflow-query-hint">Enter Lead ID, Deal ID, or both.</p>
        </div>
      </div>
    </FlowShellCard>
  );
}
