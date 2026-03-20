'use client';

import { Button, Card, CardText, CardTitle, TextField } from '@/components/ui';
import { AisFieldLabel } from '@/components/admin/ai-sales-agent/reusable';

type Props = {
  workflowName: string;
  status: 'success' | 'failed' | 'pending' | '';
  loading: boolean;
  onWorkflowNameChange: (value: string) => void;
  onStatusChange: (value: 'success' | 'failed' | 'pending' | '') => void;
  onLoadRuns: () => void;
};

export default function AutomationRunQueryCard({
  workflowName,
  status,
  loading,
  onWorkflowNameChange,
  onStatusChange,
  onLoadRuns,
}: Props) {
  return (
    <Card className="pins-composer arscope-card">
      <p className="pins-kicker">Automation Query</p>
      <CardTitle>Automation Run Details</CardTitle>
      <CardText>
        View workflow input/output summaries, failure metadata, and paginated run history.
      </CardText>

      <div className="pins-grid">
        <div>
          <AisFieldLabel>Workflow Name</AisFieldLabel>
          <TextField
            value={workflowName}
            onChange={(event) => onWorkflowNameChange(event.target.value)}
            placeholder="Optional workflow name"
            className="pins-input"
          />
        </div>

        <div>
          <AisFieldLabel>Status</AisFieldLabel>
          <select
            value={status}
            onChange={(event) =>
              onStatusChange(event.target.value as 'success' | 'failed' | 'pending' | '')
            }
            className="dg-input pins-input"
          >
            <option value="">All</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      <div className="pins-actions">
        <Button type="button" onClick={onLoadRuns} disabled={loading}>
          {loading ? 'Loading...' : 'Load Automation Runs'}
        </Button>
      </div>
    </Card>
  );
}
