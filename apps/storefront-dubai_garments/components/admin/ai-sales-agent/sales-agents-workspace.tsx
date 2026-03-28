'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui';
import AssignmentPolicyPanel from '@/components/admin/ai-sales-agent/assignment-policy-panel';
import AgentWorkloadPanel from '@/components/admin/ai-sales-agent/agent-workload-panel';
import AgentPipelineBoard from '@/components/admin/ai-sales-agent/agent-pipeline-board';
import AssignmentKpiTargetsPanel from '@/components/admin/ai-sales-agent/assignment-kpi-targets-panel';

type SalesAgentsView = 'agents' | 'manager' | 'control';
type SalesAgentsControlPanel = 'policy' | 'workload' | 'kpi';

const VIEW_OPTIONS: Array<{ key: SalesAgentsView; label: string }> = [
  { key: 'agents', label: 'Agents Board' },
  { key: 'manager', label: 'Manager Board' },
  { key: 'control', label: 'Settings' },
];

type ViewDescriptor = {
  subtitle: string;
};

const VIEW_DESCRIPTORS: Record<SalesAgentsView, ViewDescriptor> = {
  agents: {
    subtitle: 'Agent ownership board grouped by Leads, Deals, and Quotes.',
  },
  manager: {
    subtitle: 'Stage operations with queue actions, alerts, and rebalance tools.',
  },
  control: {
    subtitle: 'Assignment policies, workload controls, and KPI targets.',
  },
};

export default function SalesAgentsWorkspace() {
  const [activeView, setActiveView] = useState<SalesAgentsView>('agents');
  const [activeControlPanel, setActiveControlPanel] = useState<SalesAgentsControlPanel>('policy');
  const activeViewDescriptor = useMemo(() => VIEW_DESCRIPTORS[activeView], [activeView]);

  return (
    <div className="sales-agents-workspace sales-agents-workspace--structured" data-testid="sales-agents-workspace">
      <section className="sales-agents-toolbar">
        <div className="sales-agents-toolbar-copy">
          <h3>Sales Agents Console</h3>
          <p>{activeViewDescriptor.subtitle}</p>
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

      <section className="sales-agents-content">
        {activeView === 'agents' && (
          <section className="sales-agents-stage sales-agents-stage--overview">
            <AgentPipelineBoard mode="agents" />
          </section>
        )}

        {activeView === 'manager' && (
          <section className="sales-agents-stage sales-agents-stage--operations">
            <AgentPipelineBoard mode="manager" />
          </section>
        )}

        {activeView === 'control' && (
          <section className="sales-agents-stage sales-agents-stage--settings">
            <div className="sales-agents-control-shell">
              <div className="sales-agents-control-switcher" role="tablist" aria-label="Sales agents settings panels">
                <Button
                  type="button"
                  size="sm"
                  variant={activeControlPanel === 'policy' ? 'primary' : 'secondary'}
                  className={`sales-agents-control-btn${activeControlPanel === 'policy' ? ' is-active' : ''}`}
                  onClick={() => setActiveControlPanel('policy')}
                >
                  Policy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={activeControlPanel === 'workload' ? 'primary' : 'secondary'}
                  className={`sales-agents-control-btn${activeControlPanel === 'workload' ? ' is-active' : ''}`}
                  onClick={() => setActiveControlPanel('workload')}
                >
                  Workload
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={activeControlPanel === 'kpi' ? 'primary' : 'secondary'}
                  className={`sales-agents-control-btn${activeControlPanel === 'kpi' ? ' is-active' : ''}`}
                  onClick={() => setActiveControlPanel('kpi')}
                >
                  KPIs
                </Button>
              </div>

              <div className="sales-agents-settings-panel sales-agents-settings-panel--full">
                {activeControlPanel === 'policy' && (
                  <>
                    <AssignmentPolicyPanel compact />
                  </>
                )}

                {activeControlPanel === 'workload' && (
                  <>
                    <AgentWorkloadPanel compact />
                  </>
                )}

                {activeControlPanel === 'kpi' && (
                  <>
                    <AssignmentKpiTargetsPanel compact />
                  </>
                )}
              </div>
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
