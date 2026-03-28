'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui';
import AssignmentPolicyPanel from '@/components/admin/ai-sales-agent/assignment-policy-panel';
import AgentWorkloadPanel from '@/components/admin/ai-sales-agent/agent-workload-panel';
import AgentPipelineBoard from '@/components/admin/ai-sales-agent/agent-pipeline-board';
import AssignmentKpiTargetsPanel from '@/components/admin/ai-sales-agent/assignment-kpi-targets-panel';

type SalesAgentsView = 'pipeline' | 'capacity' | 'performance';

const VIEW_OPTIONS: Array<{ key: SalesAgentsView; label: string }> = [
  { key: 'pipeline', label: 'Operations Board' },
  { key: 'capacity', label: 'Policy & Capacity' },
  { key: 'performance', label: 'Performance KPIs' },
];

export default function SalesAgentsWorkspace() {
  const [activeView, setActiveView] = useState<SalesAgentsView>('pipeline');
  const activeLabel = useMemo(
    () => VIEW_OPTIONS.find((option) => option.key === activeView)?.label ?? 'Operations Board',
    [activeView]
  );

  return (
    <div className="sales-agents-workspace" data-testid="sales-agents-workspace">
      <section className="sales-agents-toolbar">
        <div className="sales-agents-toolbar-copy">
          <p className="sales-agents-kicker">Sales Agents Console</p>
          <h3>{activeLabel}</h3>
          <p>Clear manager workflow: operate in board view, configure policy in capacity view, track outcomes in KPI view.</p>
        </div>
        <div className="sales-agents-toolbar-actions">
          {VIEW_OPTIONS.map((option) => {
            const isActive = option.key === activeView;
            return (
              <Button
                key={`sales-agents-view-${option.key}`}
                type="button"
                size="sm"
                variant={isActive ? 'primary' : 'secondary'}
                className={`sales-agents-view-btn${isActive ? ' is-active' : ''}`}
                onClick={() => setActiveView(option.key)}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
      </section>

      {activeView === 'pipeline' && (
        <section className="sales-agents-stage">
          <AgentPipelineBoard />
        </section>
      )}

      {activeView === 'capacity' && (
        <section className="sales-agents-stage">
          <div className="sales-agents-top-grid">
            <AssignmentPolicyPanel />
            <AgentWorkloadPanel />
          </div>
        </section>
      )}

      {activeView === 'performance' && (
        <section className="sales-agents-stage">
          <AssignmentKpiTargetsPanel />
        </section>
      )}
    </div>
  );
}
